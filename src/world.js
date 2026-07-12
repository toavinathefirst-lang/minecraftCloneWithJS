import { Group } from "three";
import { WorldChunk } from "./worldChunk";

export class World extends Group {
    chunksSize = {
        width: 64,
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

    constructor(seed = 0) {
        super();
        this.seed = seed;
    }

    generate() {
        this.disposeChunks();
        for (let x = -1; x <= 1; x++) {
            for (let z = -1; z <= 1; z++) {
                const chunk = new WorldChunk(this.chunksSize, this.params);
                // Positionnement correct du chunk dans l'espace 3D
                chunk.position.set(x * this.chunksSize.width, 0, z * this.chunksSize.width);
                chunk.generate();
                
                // CORRECTION : On ajoute le chunk au groupe World (this)
                this.add(chunk); 
            }
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
         * 
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
         * 
         * @param {number} chunkX 
         * @param {number} chunkZ 
         * @returns {WorldChunk | null}
         */

        getChunk(chunkX, chunkZ) {
            return this.children.find((chunk) => (
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
    }
}