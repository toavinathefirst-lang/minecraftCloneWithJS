//c est mon code 
import * as THREE from "three";
import { SimplexNoise } from "three/examples/jsm/Addons.js";
import { RNG } from "./rng";
import { blocks } from "./block";
import { ressources } from "./block";
import { DataStore } from "./dataStore";

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
 * @property {{scale:number, magnitude:number, offset:number,waterOffset:number}} terrain
 * @property {{
 *     scale: number,
 *           variation: {
  *              amplitude: number,
   *             scale: number
    *        },
     *       tundraToTemperate: number,
      *      temperateToJungle: number,
       *     jungleToDesert: number
 *  }} biomes
 * @property {{
 *   trunk: {minHeight:number, maxHeight:number},
 *   canopy: {minRadius:number, maxRadius:number, density:number},
 *   frequency: number
 * }} trees
 * @property {{
 *      scale:number,density:number
 * }}clouds
 */
export class WorldChunk extends THREE.Group {
    /** @type {Block[][][]} */
    data = [];

    /** @type {boolean} */
    loaded = false;

    /** @type {DataStore} */
    dataStore = new DataStore();

    /**
     * @param {ChunkSize} size
     * @param {TerrainParams} params
     * @param {DataStore} datastore - Store partagé entre chunks servant à
     *   persister les modifications du joueur (ajout/suppression de blocs)
     *   afin qu'elles survivent au déchargement/rechargement d'un chunk.
     */
    constructor(size, params, datastore) {
        super();
        this.size = size;
        this.params = params;
        this.dataStore = datastore;
    }
    /**
     * get the biome at the local chunk coordinates (x,z)
     * @param {SimplexNoise} simplex
     * @param {number} x 
     * @param {number} z  
     */
   getBiome(simplex, x, z) {
            // Bruit principal, ramené entre 0 et 1
            let noise = 0.5 * simplex.noise(
                (this.position.x + x) / this.params.biomes.scale,
                (this.position.z + z) / this.params.biomes.scale
            ) + 0.5;

            // Bruit de variation, superposé au bruit principal pour casser
            // les frontières trop nettes entre les biomes
            noise += this.params.biomes.variation.amplitude * simplex.noise(
                (this.position.x + x) / this.params.biomes.variation.scale,
                (this.position.z + z) / this.params.biomes.variation.scale
            );

            if (noise < this.params.biomes.tundraToTemperate) {
                return 'tundra';
            } else if (noise < this.params.biomes.temperateToJungle) {
                return 'temperate';
            } else if (noise < this.params.biomes.jungleToDesert) {
                return 'jungle';
            } else {
                return 'desert';
            }
        }
    /**
     * Populate the world with trees
     * @param {RNG} rng 
     */
    
    generateTrees(rng){
        /**
         * @param {number} x,
         * @param {number} z  
         * @param {RNG} rng 
         */
        const generateTreeTrunk = (x, z, rng) => {
            const minH = this.params.trees.trunk.minHeight; 
            const maxH =this.params.trees.trunk.maxHeight;
            const h =Math.round(minH + (maxH -minH)*rng.random())
            
            for(let y =0;y<this.size.height;y++){
                const block = this.getBlock(x,y,z);
                if (block?.id === blocks.grass.id){
                    const treeTop = y + h; // hauteur finale du tronc, calculée UNE fois
                    for (let treeY = y + 1; treeY <= treeTop && treeY < this.size.height; treeY++){
                        
                        this.setBlockId(x, treeY, z, blocks.tree.id);
                    }
                    //generate canopy centered on the the top of three 
                    generateTreeCanopy(x,y+h,z,rng);
                    break; 
                }
            }
        }
    
        /**
         * @param {number}x
         * @param {number}y
         * @param {number}z
         * 
         * @param {RNG} rng 
         */
        const generateTreeCanopy = (centerX,centerY,centerZ,rng) => {
            const minR = this.params.trees.canopy.minRadius;
            const maxR = this.params.trees.canopy.maxRadius;
            const r =Math.round(minR + (maxR - minR) * rng.random());
            for (let x = -r; x <= r; x++) {
                for (let y = -Math.min(r, 2); y <= r; y++) {
                    for(let z=-r;z<=r;z++){
                        const n = rng.random()
                        //Make sure the blocks is within the canopy radius 
                        if(Math.sqrt(x*x +y*y +z*z) >r) continue;
                        //Don't overwrite an existing block
                        const block = this.getBlock(centerX+x,centerY+y,centerZ+z);
                        if(block && block.id !== blocks.empty.id) continue
                        if(n<this.params.trees.canopy.density){
                            this.setBlockId(centerX+x,centerY+y,centerZ+z,blocks.leaves.id);
                        }
                    }                
                }               
            }
        }
        let offset = this.params.trees.canopy.maxRadius;
        for (let x=offset;x<this.size.width - offset;x++){
            for(let z=0 ; z< this.size.width - offset ;z++){
                if (rng.random() < this.params.trees.frequency){
                    generateTreeTrunk(x,z,rng);
                }
            }
        }
    }

    /**
     * Génère entièrement le chunk : terrain de base, ressources, relief,
     * puis applique les modifications du joueur précédemment sauvegardées,
     * et enfin construit les meshes instanciés.
     * @returns {void}
     */
    generate() {
        const rng = new RNG(this.params.seed);
        this.initializeTerrain();
        this.generateRessources(rng);
        this.generateTerrain(rng);
        this.generateTrees(rng);
        this.generateClouds(rng);
        this.loadPlayerChanges();
        this.generateMeshes();
        this.loaded = true;
    }
    /**
     * 
     * @param {RNG} rng 
     */
    generateClouds(rng){
        const simplex = new SimplexNoise(rng);
        for (let x = 0; x < this.size.width; x++) {
            for(let z=0;z<this.size.width;z++){
                const value = simplex.noise(
                    (this.position.x + x) / this.params.clouds.scale,
                    (this.position.z + z) /this.params.clouds.scale
                ) +1 *0.5;
                if (value < this.params.clouds.density){
                    this.setBlockId(x,this.size.height -1,z,blocks.cloud.id)
                }
            }
            
        }
    }

    /**
     * Place les blocs de ressources (minerais, etc.) dans le chunk en
     * utilisant un bruit de Simplex 3D propre à chaque type de ressource.
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

    /**
     * Réinitialise le tableau `data` du chunk avec des blocs vides
     * (dimensions width x height x width).
     * @returns {void}
     */
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
     * Génère le relief (hauteur du terrain) à partir d'un bruit de Simplex 2D,
     * avec une variation régionale (magnitude locale) pour éviter un relief
     * uniforme sur toute la carte.
     * @param {RNG} rng
     * @returns {void}
     */
    /**
     * Génère le relief (hauteur du terrain) à partir d'un bruit de Simplex 2D,
     * avec une variation régionale (magnitude locale) pour éviter un relief
     * uniforme sur toute la carte.
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
                    const biome = this.getBiome(simplex,x,z);
                    let groundBlockType=blocks.dirt.id;
                    if (y === height) {
                        // Remplace l'herbe par du sable si le bloc est sous le niveau de l'eau
                        if (height <= this.params.terrain.waterOffset) {
                            this.setBlockId(x, y, z, blocks.sand.id);
                        } else {
                            if(biome==='desert'){
                                groundBlockType = blocks.sand.id
                            }else if(biome =='temperate' || biome=="jungle"){
                                groundBlockType = blocks.grass.id
                            }else if (biome=='tundra'){
                                const snowCapThreshold = this.size.height * 0.7; // à ajuster
                                groundBlockType = (height > snowCapThreshold)
                                    ? blocks.snow.id
                                    : blocks.snowDirt.id;
                            }
                            this.setBlockId(x,y,z,groundBlockType)
                            
                        }
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
    generateWater(){
        const material =new  THREE.MeshLambertMaterial({
            color:0x9090e0,
            transparent:true,
            opacity:0.5,
            side:THREE.DoubleSide
        })

        const waterMesh = new THREE.Mesh(new THREE.PlaneGeometry(), material);
        waterMesh.rotateX(-Math.PI/2.0);
        waterMesh.position.set(
            this.size.width / 2 ,
            this.params.terrain.waterOffset + 0.4,
            this.size.width / 2
        );
        waterMesh.scale.set(this.size.width,this.size.width,1);
        waterMesh.layers.set(1);

        this.add(waterMesh)
    }

    /**
     * Construit un InstancedMesh par type de bloc et n'ajoute une instance
     * que pour les blocs visibles (non entièrement entourés par d'autres blocs).
     * @returns {void}
     */
    generateMeshes() {
        this.clear();
        
        this.disposeInstances();
        this.generateWater()

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
     * Retrouve l'InstancedMesh correspondant à un type de bloc donné parmi
     * les enfants du chunk.
     *
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
     * Renvoie le bloc situé aux coordonnées locales (x, y, z) du chunk,
     * ou `null` si les coordonnées sont hors limites.
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {Block | null}
     */
    getBlock(x, y, z) {
        return this.inBounds(x, y, z) ? this.data[x][y][z] : null;
    }

    /**
     * Vérifie que les coordonnées locales (x, y, z) sont bien à l'intérieur
     * des dimensions du chunk.
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
     * Modifie l'id du bloc aux coordonnées locales (x, y, z), sans toucher
     * au dataStore (utilisé pour la génération procédurale du terrain).
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
     * Associe un instanceId de mesh à un bloc donné (ou le retire si `null`).
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
     * Détermine si un bloc est totalement entouré par des blocs non-vides
     * (donc invisible, inutile de créer une instance de mesh pour lui).
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

    /**
     * Applique au chunk fraîchement généré toutes les modifications du
     * joueur (ajout/suppression de blocs) précédemment enregistrées dans le
     * dataStore pour ce chunk, afin que la persistance survive au
     * déchargement/rechargement.
 
     * sauvegardés.
     * @returns {void}
     */
    loadPlayerChanges() {
        for (let x = 0; x < this.size.width; x++) {
            for (let y = 0; y < this.size.height; y++) {
                for (let z = 0; z < this.size.width; z++) {
                    if (this.dataStore.contains(this.position.x, this.position.z, x, y, z)) {
                        const blockId = this.dataStore.get(
                            this.position.x,
                            this.position.z,
                            x, y, z
                        );
                        this.setBlockId(x, y, z, blockId);
                    }
                }
            }
        }
    }

    /**
     * Détruit et vide tous les meshes/instances du chunk (à appeler avant
     * une régénération ou lors du déchargement du chunk).
     * @returns {void}
     */
    disposeInstances() {
        this.traverse((obj) => {
            if (obj.dispose) obj.dispose();
        });
        this.clear();
    }

    /**
     * Ajoute un bloc du joueur à la position locale (x, y, z) si cet
     * emplacement est vide, met à jour le mesh et persiste le changement
     * dans le dataStore.
    
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {number} blockId
     * @returns {void}
     */
    addBlock(x, y, z, blockId) {
        if (this.getBlock(x, y, z).id === blocks.empty.id) {
            this.setBlockId(x, y, z, blockId);
            this.addBLockInstance(x, y, z);
            this.dataStore.set(this.position.x, this.position.z, x, y, z, blockId);
        }
    }

    /**
     * Supprime le bloc à la position locale (x, y, z) : retire son
     * instance de mesh, le remet à `empty`, et persiste le changement
     * dans le dataStore.
   
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
        this.dataStore.set(this.position.x, this.position.z, x, y, z, blocks.empty.id);
    }

    /**
     * Crée une nouvelle instance de mesh pour un bloc déjà présent dans
     * `data` mais qui n'en a pas encore (par exemple un bloc qui vient
     * d'être révélé car son voisin a été retiré).
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {void}
     */
    addBLockInstance(x, y, z) {
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
     * Retire l'instance de mesh du bloc à (x, y, z).
     *
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
        mesh.computeBoundingSphere(); 

        this.setBlockInstanceId(x, y, z, null);
    }
}