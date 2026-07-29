import { BoxHelper, Color, Group } from "three";
import { WorldChunk } from "./worldChunk";
import { Player } from "./player";
import { RNG } from "./rng";
import { DataStore } from "./dataStore";
import { SimplexNoise } from "three/examples/jsm/Addons.js";

export class World extends Group {
    
    asyncLoading=true;
    drawDistance = 2;
    chunksSize = {
        width: 16,
        height: 32
    }
    params = {
        seed: 0,
        terrain: {
            scale: 30,
            magnitude: 0.5,
            offset: 5,
            waterOffset : 6
        }, 
        biomes:{
            temperature:{
                scale:100
            },
            humidity:{
                scale:100
            }
        },
        trees:{
            trunk:{
                minHeight:4,
                maxHeight:7
            },
            canopy:{
                minRadius:2,
                maxRadius:4 ,
                density:0.5 // vary between 0.0 and 1.0
            },
            frequency:0.01
        },
        clouds:{
            scale:30,
            density:0.15
        }
        
    };
    dataStore = new DataStore();
    

    lastPlayerChunk = { x: null, z: null };
    chunkQueue = [];
    /**
     * save the world data to local storage
     */
    save(){
        localStorage.setItem('minecraft_params',JSON.stringify(this.params));
        localStorage.setItem('minecraft_data',JSON.stringify(this.dataStore.data));
        document.getElementById('status').innerHTML="GAME SAVED";
        setTimeout(()=> document.getElementById('status').innerHTML='',3000)
    }
    /**
     * load the world data from disk
     */
    load(){
        this.params =JSON.parse(localStorage.getItem('minecraft_params'));
        this.dataStore.data = JSON.parse(localStorage.getItem('minecraft_data'));
        document.getElementById('status').innerHTML="GAME LOADED";
        setTimeout(()=> document.getElementById('status').innerHTML='',3000)
        this.generate()
    }
    constructor(seed = 0) {
        super();
        this.seed = seed;
        this.params.seed = seed;

        document.addEventListener('keydown',(e)=>{
            switch (e.code) {
                case 'KeyF':
                    this.save()
                    break;
                case 'KeyL':
                    this.load()
                    break;
            }
        })
        // On randomise le "style" du terrain une seule fois pour tout le monde,
        // à partir du seed. Important : ça ne doit PAS être fait par chunk,
        // sinon on aurait des ruptures visibles (montagnes hautes d'un côté,
        // plat de l'autre) aux frontières entre chunks.
        this.randomizeTerrainParams(seed);
    }

    /**
     * Dérive les paramètres de génération de terrain (scale, magnitude, offset)
     * à partir du seed, pour que chaque seed donne un style de monde différent
     * (plus ou moins montagneux, plus ou moins vallonné) tout en restant
     * cohérent/continu sur l'ensemble du monde.
     * @param {number} seed 
     */
    randomizeTerrainParams(seed) {
        const rng = new RNG(seed);
        this.params.terrain.scale = 20 + rng.random() * 40;     // ~[20, 60] fréquence du détail
        this.params.terrain.magnitude = 0.4 + rng.random() * 0.4; // ~[0.4, 0.8] amplitude max (zones montagneuses)
        this.params.terrain.offset = 0.15 + rng.random() * 0.15;  // ~[0.15, 0.3] niveau de base
    }

    generate(clearCache=false) {
        if(clearCache){
             this.dataStore.clear();
        }
       
        this.disposeChunks();
        for (let x = -this.drawDistance; x <= this.drawDistance; x++) {
            for (let z = -this.drawDistance; z <= this.drawDistance; z++) {
                this.generateChunk(x, z);
            }
        }
    }

    /**
     * @param {number} x
     * @param {number} z
     */
    generateChunk(x, z) {
        const chunk = new WorldChunk(this.chunksSize, this.params,this.dataStore);
        chunk.position.set(x * this.chunksSize.width, 0, z * this.chunksSize.width);
        chunk.userData = { x, z };
        chunk.generate();
        
        this.add(chunk);

        const helper = new BoxHelper(chunk, new Color(0x00ffff));
        helper.name = "chunkBoundaryHelper";
        helper.userData.linkedChunk = chunk;
        //this.add(helper);
    }

    /**
     * Updates the visible portions of the world based on the 
     * current player position
     * 
     * @param {Player} player 
     */
    update(player) {
        this.updateVisibleChunks(player);
        this.processChunkQueue();
    }

    /**
     * @param {Player} player 
     */
    updateVisibleChunks(player) {
        const currentChunkCoords = this.worldToChunkCoords(
            player.position.x,
            player.position.y,
            player.position.z
        ).chunk;

        if (
            currentChunkCoords.x === this.lastPlayerChunk.x &&
            currentChunkCoords.z === this.lastPlayerChunk.z
        ) {
            return;
        }

        this.lastPlayerChunk = currentChunkCoords;

        /**
         * @returns {{x:number,z:number}[]}
         */
        const getVisibleChunks = () => {
            const visibleChunks = [];
            const chunkX = currentChunkCoords.x;
            const chunkZ = currentChunkCoords.z;

            for (let x = chunkX - this.drawDistance; x <= chunkX + this.drawDistance; x++) {
                for (let z = chunkZ - this.drawDistance; z <= chunkZ + this.drawDistance; z++) {
                    visibleChunks.push({ x, z });
                }
            }
            return visibleChunks;
        }

        const visibleChunks = getVisibleChunks();

        /**
         * Returns an array containing the coordinates of the chunks that 
         * are not yet loaded and need to be added to the scene 
         * @param {{x:number,z:number}[]} visibleChunks 
         * @returns {{x:number,z:number}[]}
         */
        const getChunksToAdd = (visibleChunks) => {
            const existingCoords = this.children
                .filter((obj) => obj instanceof WorldChunk)
                .map((obj) => obj.userData);

            return visibleChunks.filter((visibleChunk) => {
                const chunkExists = existingCoords.some(
                    (existing) => existing.x === visibleChunk.x && existing.z === visibleChunk.z
                );
                const alreadyQueued = this.chunkQueue.some(
                    (queued) => queued.x === visibleChunk.x && queued.z === visibleChunk.z
                );
                return !chunkExists && !alreadyQueued;
            });
        }

        const chunksToAdd = getChunksToAdd(visibleChunks);

        /**
         * Removes current loaded chunks that are no longer visible to the player
         * @param {{x:number,z:number}[]} visibleChunks
         * @returns {WorldChunk[]}
         */
        const removeUnusedChunks = (visibleChunks) => {
            /** @type {WorldChunk[]} */
            const chunksToRemove = this.children.filter((chunk) => {
                if (!(chunk instanceof WorldChunk)) return false;

                const { x, z } = chunk.userData;

                const chunkExists = visibleChunks.find((visibleChunk) => {
                    return visibleChunk.x === x && visibleChunk.z === z;
                });

                return !chunkExists;
            });

            for (const chunk of chunksToRemove) {
                chunk.disposeInstances();
                this.remove(chunk);

                // const linkedHelper = this.children.find(
                //     (child) => child.name === "chunkBoundaryHelper" && child.userData.linkedChunk === chunk
                // );
                // if (linkedHelper) {
                //     this.remove(linkedHelper);
                // }
            }

            return chunksToRemove;
        }

        removeUnusedChunks(visibleChunks);

        this.chunkQueue.push(...chunksToAdd);
    }

    processChunkQueue() {
        const frameBudgetMs = 5; // budget de temps alloué par frame pour la génération
        const start = performance.now();

        while (this.chunkQueue.length > 0 && (performance.now() - start) < frameBudgetMs) {
            const next = this.chunkQueue.shift();
            this.generateChunk(next.x, next.z);
        }
    }

    getBlock(x, y, z) {
        const chunkCoords = this.worldToChunkCoords(x, y, z);
        const chunk = this.getChunk(chunkCoords.chunk.x, chunkCoords.chunk.z);

        if (chunk && chunk.loaded) {
            return chunk.getBlock(
                chunkCoords.block.x,
                chunkCoords.block.y,
                chunkCoords.block.z
            );
        } else {
            return null;
        }
    }

    /**
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @returns {{
     *  chunk:{x:number,z:number},
     *  block:{x:number,y:number,z:number}
     * }}
     */
    worldToChunkCoords(x, y, z) {
        const chunkX = Math.floor(x / this.chunksSize.width);
        const chunkZ = Math.floor(z / this.chunksSize.width);

        const blockX = x - chunkX * this.chunksSize.width;
        const blockY = y;
        const blockZ = z - chunkZ * this.chunksSize.width;

        return {
            chunk: { x: chunkX, z: chunkZ },
            block: { x: blockX, y: blockY, z: blockZ }
        };
    }

    /**
     * @param {number} chunkX 
     * @param {number} chunkZ 
     * @returns {WorldChunk | null}
     */
    getChunk(chunkX, chunkZ) {
        return this.children.find((chunk) => (
            chunk instanceof WorldChunk &&
            chunk.position.x === chunkX * this.chunksSize.width &&
            chunk.position.z === chunkZ * this.chunksSize.width
        ));
    }

    disposeChunks() {
        this.traverse((chunk) => {
            if (chunk.disposeInstances) {
                chunk.disposeInstances();
            }
        });
        this.clear();
        this.chunkQueue = [];
    }
    /**
     * @param {number} x
     * @param {number} blockId  
     * @param {number} y
     * @param {number} z  
     */
    addBlock(x,y,z,blockId){
         const coords = this.worldToChunkCoords(x,y,z);
        const chunk = this.getChunk(coords.chunk.x,coords.chunk.z);
        if(chunk){
            chunk.addBlock(
                coords.block.x,
                coords.block.y,
                coords.block.z,
                blockId
            );
            //hide the adjacent block neighbor if they are hidden
            this.hideBlock(x-1,y,z)
            this.hideBlock(x+1,y,z)
            this.hideBlock(x,y-1,z)
            this.hideBlock(x,y+1,z)
            this.hideBlock(x,y,z-1)
            this.hideBlock(x,y,z+1)            
        }
    }

    /**
     * remove the block at (x,y,z) and sets it to empty
     * @param {number} x
     * @param {number} y 
     * @param {number} z  
     */
    removeBlock(x,y,z){
        const coords = this.worldToChunkCoords(x,y,z);
        const chunk = this.getChunk(coords.chunk.x,coords.chunk.z);
        if(chunk){
            
            
            chunk.removeBlock(
                coords.block.x,
                coords.block.y,
                coords.block.z
            );
            //Reveal adjacent blocks if they are hiddden
            this.revealBlock(x-1,y,z)
            this.revealBlock(x+1,y,z)
            this.revealBlock(x,y-1,z)
            this.revealBlock(x,y+1,z)
            this.revealBlock(x,y,z-1)
            this.revealBlock(x,y,z+1)
            
        }
    }
    /**
     * Reveal the block at (x,y,z) by adding a new mesh instances
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     */
    revealBlock(x,y,z){
        const coords = this.worldToChunkCoords(x,y,z);
        const chunk = this.getChunk(coords.chunk.x,coords.chunk.z);
        if(chunk){
            chunk.addBLockInstance(
                coords.block.x,
                coords.block.y,
                coords.block.z
            );
        }
    }
     /**
     * Hide the block at (x,y,z) by removing athe mesh instances
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     */
    hideBlock(x,y,z){
        const coords = this.worldToChunkCoords(x,y,z);
        const chunk = this.getChunk(coords.chunk.x,coords.chunk.z);
        if(chunk && chunk.isBlockObscured(
            coords.block.x,
            coords.block.y,
            coords.block.z)){
                chunk.deleteBlockInstance(
                    coords.block.x,
                    coords.block.y,
                    coords.block.z
                );
        }
    }
}