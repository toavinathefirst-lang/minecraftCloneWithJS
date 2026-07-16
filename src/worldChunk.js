import * as THREE from "three";
import { SimplexNoise } from "three/examples/jsm/Addons.js";
import { RNG } from "./rng";
import { blocks } from "./block";
import { ressources } from "./block";

const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshLambertMaterial();

/**
 * @typedef {Object} Block
 * @property {number} id
 * @property {number | null} instanceId
 */

/**
 * @typedef {Object} ChunkSize
 * @property {number} width
 * @property {number} height
 */

/**
 * @typedef {Object} TerrainParams
 * @property {number} seed
 * @property {{scale:number, magnitude:number, offset:number}} terrain
 */

export class WorldChunk extends THREE.Group {
    /** @type {Block[][][]} */
    data = [];

    /** @type {boolean} */
    loaded = false;

    /**
     * @param {ChunkSize} size
     * @param {TerrainParams} params
     */
    constructor(size, params) {
        super();
        this.size = size;
        this.params = params;
    }

    /** @returns {void} */
    generate() {
        const rng = new RNG(this.params.seed);
        this.initializeTerrain();
        this.generateRessources(rng);
        this.generateTerrain(rng);
        this.generateMeshes();
        this.loaded = true;
    }

    /**
     * @param {RNG} rng
     * @returns {void}
     */
    generateRessources(rng) {
        const simplex = new SimplexNoise(rng);
        ressources.forEach((ressource) => {
            for (let x = 0; x < this.size.width; x++) {
                for (let y = 0; y < this.size.height; y++) {
                    for (let z = 0; z < this.size.width; z++) {
                        const value = simplex.noise3d(
                            (this.position.x + x) / ressource.scale.x,
                            (this.position.y + y) / ressource.scale.y,
                            (this.position.z + z) / ressource.scale.z
                        );
                        if (value > ressource.scarcity) {
                            this.setBlockId(x, y, z, ressource.id);
                        }
                    }
                }
            }
        });
    }

    /** @returns {void} */
    initializeTerrain() {
        this.data = [];
        for (let x = 0; x < this.size.width; x++) {
            /** @type {Block[][]} */
            const slice = [];
            for (let y = 0; y < this.size.height; y++) {
                /** @type {Block[]} */
                const row = [];
                for (let z = 0; z < this.size.width; z++) {
                    row.push({ id: blocks.empty.id, instanceId: null });
                }
                slice.push(row);
            }
            this.data.push(slice);
        }
    }

    /**
     * @param {RNG} rng
     * @returns {void}
     */
    generateTerrain(rng) {
        const simplex = new SimplexNoise(rng);

        for (let x = 0; x < this.size.width; x++) {
            for (let z = 0; z < this.size.width; z++) {
                const worldX = this.position.x + x;
                const worldZ = this.position.z + z;

                const regionScale = this.params.terrain.scale * 5;
                const region = simplex.noise(worldX / regionScale, worldZ / regionScale);
                const regionFactor = (region + 1) / 2;

                const localMagnitude = THREE.MathUtils.lerp(
                    this.params.terrain.magnitude * 0.15,
                    this.params.terrain.magnitude,
                    regionFactor
                );

                const value = simplex.noise(
                    worldX / this.params.terrain.scale,
                    worldZ / this.params.terrain.scale
                );

                const scaledNoise = this.params.terrain.offset + localMagnitude * value;

                let height = Math.floor(this.size.height * scaledNoise);
                height = Math.max(0, Math.min(height, this.size.height - 1));

                for (let y = 0; y <= height; y++) {
                    if (y === height) {
                        this.setBlockId(x, y, z, blocks.grass.id);
                    } else if (y < height && this.getBlock(x, y, z)?.id === blocks.empty.id) {
                        this.setBlockId(x, y, z, blocks.dirt.id);
                    }
                }

                for (let y = height + 1; y < this.size.height; y++) {
                    this.setBlockId(x, y, z, blocks.empty.id);
                }
            }
        }
    }

    /** @returns {void} */
    generateMeshes() {
        this.disposeInstances();

        const maxCount = this.size.width * this.size.width * this.size.height;

        /** @type {Object.<number, THREE.InstancedMesh>} */
        const meshes = {};

        Object.values(blocks)
            .filter((blockType) => blockType.id !== blocks.empty.id)
            .forEach((blockType) => {
                const mesh = new THREE.InstancedMesh(geometry, blockType.material, maxCount);
                mesh.name = String(blockType.id); // name = string sur Object3D
                mesh.count = 0;
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                meshes[blockType.id] = mesh;
            });

        const matrix = new THREE.Matrix4();

        for (let x = 0; x < this.size.width; x++) {
            for (let y = 0; y < this.size.height; y++) {
                for (let z = 0; z < this.size.width; z++) {
                    const blockId = this.getBlock(x, y, z)?.id;
                    if (!blockId || blockId === blocks.empty.id) continue;

                    const mesh = meshes[blockId];

                    if (!this.isBlockObscured(x, y, z)) {
                        const instanceId = mesh.count;
                        matrix.setPosition(x, y, z);
                        mesh.setMatrixAt(instanceId, matrix);

                        this.setBlockInstanceId(x, y, z, instanceId);
                        mesh.count++;
                    }
                }
            }
        }

        Object.values(meshes).forEach((mesh) => {
            if (mesh.count > 0) this.add(mesh);
        });
    }

    /**
     * Cast explicite : this.children est Object3D[] par défaut. Sans ce
     * cast, TS ne connaît pas les membres spécifiques à InstancedMesh
     * (setMatrixAt, getMatrixAt, instanceMatrix, count...) → affichés `any`.
     * @param {number} blockId
     * @returns {THREE.InstancedMesh | undefined}
     */
    getMeshForBlockId(blockId) {
        return /** @type {THREE.InstancedMesh | undefined} */ (
            this.children.find((child) => child.name === String(blockId))
        );
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {Block | null}
     */
    getBlock(x, y, z) {
        return this.inBounds(x, y, z) ? this.data[x][y][z] : null;
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {boolean}
     */
    inBounds(x, y, z) {
        return (
            x >= 0 && x < this.size.width &&
            y >= 0 && y < this.size.height &&
            z >= 0 && z < this.size.width
        );
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {number} id
     * @returns {void}
     */
    setBlockId(x, y, z, id) {
        if (this.inBounds(x, y, z)) this.data[x][y][z].id = id;
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {number | null} instanceId
     * @returns {void}
     */
    setBlockInstanceId(x, y, z, instanceId) {
        if (this.inBounds(x, y, z)) this.data[x][y][z].instanceId = instanceId;
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {boolean}
     */
    isBlockObscured(x, y, z) {
        const up = this.getBlock(x, y + 1, z)?.id ?? blocks.empty.id;
        const down = this.getBlock(x, y - 1, z)?.id ?? blocks.empty.id;
        const left = this.getBlock(x + 1, y, z)?.id ?? blocks.empty.id;
        const right = this.getBlock(x - 1, y, z)?.id ?? blocks.empty.id;
        const forward = this.getBlock(x, y, z + 1)?.id ?? blocks.empty.id;
        const back = this.getBlock(x, y, z - 1)?.id ?? blocks.empty.id;

        return !(
            up === blocks.empty.id || down === blocks.empty.id ||
            left === blocks.empty.id || right === blocks.empty.id ||
            forward === blocks.empty.id || back === blocks.empty.id
        );
    }

    /** @returns {void} */
    disposeInstances() {
        this.traverse((obj) => {
            if (obj.dispose) obj.dispose();
        });
        this.clear();
    }
    /**
     * 
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @param {number} blockId 
     */
    addBlock(x,y,z,blockId){
        if(this.getBlock(x,y,z).id === blocks.empty.id){
            this.setBlockId(x,y,z,blockId);
            this.addBLockInstance(x,y,z);
        }
    }

    /**
     * NOTE : c'est cette méthode (singulier) que World#removeBlock() doit
     * appeler — le nom doit matcher, avant tu avais `removeBlocks` (pluriel)
     * défini mais `removeBlock` (singulier) appelé depuis world.js → crash.
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {void}
     */
    removeBlock(x, y, z) {
        const block = this.getBlock(x, y, z);
        if (!block || block.id === blocks.empty.id) return;

        this.deleteBlockInstance(x, y, z);
        this.setBlockId(x, y, z, blocks.empty.id);
    }
    /**
     * @param {number} x 
     * @param {number} y
     * @param {number} z  
     */
    addBLockInstance(x,y,z){
        const block = this.getBlock(x, y, z);
        if (!block || block.id === blocks.empty.id || block.instanceId !== null) return;

        const mesh = this.getMeshForBlockId(block.id);
        if (!mesh) return;

        const instanceId = mesh.count;
        this.setBlockInstanceId(x, y, z, instanceId);

        const matrix = new THREE.Matrix4();
        matrix.setPosition(x, y, z);
        mesh.setMatrixAt(instanceId, matrix);
        mesh.instanceMatrix.needsUpdate = true;
        mesh.count++;
    }

    /**
     * "Swap and pop" : déplace la dernière instance du mesh à l'emplacement
     * du bloc supprimé pour ne jamais laisser de trou dans les instances.
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {void}
     */
    deleteBlockInstance(x, y, z) {
        const block = this.getBlock(x, y, z);
        if (!block || block.instanceId === null) return;

        const mesh = this.getMeshForBlockId(block.id);
        if (!mesh) return;

        const instanceId = block.instanceId;

        const lastMatrix = new THREE.Matrix4();
        mesh.getMatrixAt(mesh.count - 1, lastMatrix);

        // setFromMatrixPosition() extrait la position ; applyMatrix4()
        // transforme un vecteur — ce n'était pas le bon outil ici.
        const lastBlockPos = new THREE.Vector3().setFromMatrixPosition(lastMatrix);

        this.setBlockInstanceId(lastBlockPos.x, lastBlockPos.y, lastBlockPos.z, instanceId);
        mesh.setMatrixAt(instanceId, lastMatrix);

        mesh.count--;
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere(); // computeBoundingHelper() n'existe pas

        this.setBlockInstanceId(x, y, z, null);
    }
}