import * as THREE from "three";
import { SimplexNoise } from "three/examples/jsm/Addons.js";
import { RNG } from "./rng";
import { blocks } from "./block";
import { ressources } from "./block";

const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshLambertMaterial(); 

export class WorldChunk extends THREE.Group {
    data = [];
    loaded = false; // <-- ajoute cette ligne
    
    constructor(size, params) {
        super();
        this.size = size;
        this.params = params;
    }

    generate() {
        const start = performance.now()
        const rng = new RNG(this.params.seed);
        this.initializeTerrain();
        this.generateRessources(rng);
        this.generateTerrain(rng);
        this.generateMeshes();
        this.loaded = true;
    }

    generateRessources(rng) {
        const simplex = new SimplexNoise(rng);
        ressources.forEach(ressource => {
            for (let x = 0; x < this.size.width; x++) {
                for (let y = 0; y < this.size.height; y++) {
                    for (let z = 0; z < this.size.width; z++) {
                        const value = simplex.noise3d(
                           (this.position.x + x)/ ressource.scale.x,
                           (this.position.y + y)/ ressource.scale.y,
                           (this.position.z + z)/ ressource.scale.z,
                            
                        );
                        if (value > ressource.scarcity) {
                            this.setBlockId(x, y, z, ressource.id);
                        }      
                    }
                }
            }
        });
    }

    initializeTerrain() {
        this.data = [];
        for (let x = 0; x < this.size.width; x++) {
            const slice = [];
            for (let y = 0; y < this.size.height; y++) {
                const row = [];
                for (let z = 0; z < this.size.width; z++) {
                    row.push({
                        id: blocks.empty.id,
                        instanceId: null
                    });
                }
                slice.push(row);
            }
            this.data.push(slice);
        }
    }

    generateTerrain(rng) {
        const simplex = new SimplexNoise(rng);
        for (let x = 0; x < this.size.width; x++) {
            for (let z = 0; z < this.size.width; z++) {
                const value = simplex.noise(
                    this.position.x +x / this.params.terrain.scale,
                    this.position.z +z / this.params.terrain.scale
                );
                const scaledNoise = this.params.terrain.offset + this.params.terrain.magnitude * value;
                
                let height = Math.floor(this.size.height * scaledNoise);
                height = Math.max(0, Math.min(height, this.size.height - 1));

                for (let y = 0; y <= height; y++) {
                    if (y === height) {
                        this.setBlockId(x, y, z, blocks.grass.id);
                    } 
                    // CORRECTION : Ajout de ?.id pour éviter le crash si getBlock renvoie null
                    else if (y < height && this.getBlock(x, y, z)?.id === blocks.empty.id) {
                        this.setBlockId(x, y, z, blocks.dirt.id);
                    }
                }

                for (let y = height + 1; y < this.size.height; y++) {
                    this.setBlockId(x, y, z, blocks.empty.id);
                }
            }
        }
    }

    generateMeshes() {
        this.children.forEach(child => {
            if (child.dispose) child.dispose();
        });
        this.clear();

        const maxCount = this.size.width * this.size.width * this.size.height;
        const meshes = {};

        Object.values(blocks)
            .filter(blockType => blockType.id !== blocks.empty.id)
            .forEach(blockType => {
                const mesh = new THREE.InstancedMesh(geometry, blockType.material, maxCount);
                mesh.name = blockType.name;
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
                        // CORRECTION LOGIQUE : L'instanceId est défini proprement ici
                        const instanceId = mesh.count; 
                        matrix.setPosition(x, y, z);
                        mesh.setMatrixAt(instanceId, matrix);
                        
                        this.setBlockInstanceId(x, y, z, instanceId);
                        mesh.count++;
                    }
                }     
            }
        }
        
        Object.values(meshes).forEach(mesh => {
            if (mesh.count > 0) {
                this.add(mesh);
            }
        });
    }

    getBlock(x, y, z) {
        if (this.inBounds(x, y, z)) {
            return this.data[x][y][z];
        } else {
            return null;
        }
    }

    inBounds(x, y, z) {
        return x >= 0 && x < this.size.width &&
               y >= 0 && y < this.size.height &&
               z >= 0 && z < this.size.width;
    }

    setBlockId(x, y, z, id) {
        if (this.inBounds(x, y, z)) {
            this.data[x][y][z].id = id;
        }
    }

    setBlockInstanceId(x, y, z, instanceId) {
        if (this.inBounds(x, y, z)) {
            this.data[x][y][z].instanceId = instanceId;
        }
    }

    isBlockObscured(x, y, z) {
        const up = this.getBlock(x, y + 1, z)?.id ?? blocks.empty.id;
        const down = this.getBlock(x, y - 1, z)?.id ?? blocks.empty.id;
        const left = this.getBlock(x + 1, y, z)?.id ?? blocks.empty.id;
        const right = this.getBlock(x - 1, y, z)?.id ?? blocks.empty.id;
        const forward = this.getBlock(x, y, z + 1)?.id ?? blocks.empty.id;
        const back = this.getBlock(x, y, z - 1)?.id ?? blocks.empty.id;
        
        if (up === blocks.empty.id || 
            down === blocks.empty.id || 
            left === blocks.empty.id || 
            right === blocks.empty.id || 
            forward === blocks.empty.id || 
            back === blocks.empty.id 
        ) {
            return false;
        } else {
            return true;
        }
    }

    disposeInstances() {
        this.traverse((obj) => {
            if (obj.dispose) obj.dispose();
        });
        this.clear();
    }
}