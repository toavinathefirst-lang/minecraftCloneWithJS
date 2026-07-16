import { BoxHelper, Color, Group } from "three";
import { WorldChunk } from "./worldChunk";
import { Player } from "./player";
import { RNG } from "./rng";

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
            offset: 0.2
        }
    }

    lastPlayerChunk = { x: null, z: null };
    chunkQueue = [];

    constructor(seed = 0) {
        super();
        this.seed = seed;
        this.params.seed = seed;

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

    generate() {
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
        const chunk = new WorldChunk(this.chunksSize, this.params);
        chunk.position.set(x * this.chunksSize.width, 0, z * this.chunksSize.width);
        chunk.userData = { x, z };
        chunk.generate();
        
        this.add(chunk);

        const helper = new BoxHelper(chunk, new Color(0x00ffff));
        helper.name = "chunkBoundaryHelper";
        helper.userData.linkedChunk = chunk;
        this.add(helper);
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

                const linkedHelper = this.children.find(
                    (child) => child.name === "chunkBoundaryHelper" && child.userData.linkedChunk === chunk
                );
                if (linkedHelper) {
                    this.remove(linkedHelper);
                }
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
            )
        }
    }
}