import { BoxHelper, Color, Group } from "three";
import { WorldChunk } from "./worldChunk";
import { Player } from "./player";


export class World extends Group {
    drawDistance= 1;
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

    // AJOUT : mémorise le dernier chunk connu du joueur, pour éviter
    // de refaire tous les calculs de visibilité à chaque frame
    lastPlayerChunk = { x: null, z: null };

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
                chunk.position.set(x * this.chunksSize.width  , 0, z *this.chunksSize.width );
                chunk.userData={x,z};
                chunk.generate();
                
               
                this.add(chunk); 

                const helper = new BoxHelper(chunk,new Color(0x00ffff));
                helper.name = "chunkBoundaryHelper";
                // AJOUT : on garde une référence au chunk lié, pour pouvoir
                // supprimer le helper en même temps que son chunk plus tard
                helper.userData.linkedChunk = chunk;
                this.add(helper);
            }
        }
    }
    /**
     * Updates the visible portions of the world based on the 
     * current player position
     * 
     * @param {Player} player 
     */
    update(player){
        //1-Find visible chunks based on player's current position 
        /**
         * 
         * @param {Player} player 
         * @returns {{x:number,z:number}[]}
         */
        const getVisibleChunks = (player) => {
                const visibleChunks = [];
                const coords = this.worldToChunkCoords(
                    player.position.x,
                    player.position.y,
                    player.position.z
                );

                const chunkX = coords.chunk.x; // ou coords.chunk.chunkX selon ton objet !
                const chunkZ = coords.chunk.z; 

                // 2. Vérifie si ce sont bien des nombres
               
                for(let x = chunkX - this.drawDistance; x <= chunkX + this.drawDistance; x++){
                    for(let z = chunkZ - this.drawDistance; z <= chunkZ + this.drawDistance; z++){
                        visibleChunks.push({x, z});
                    }
                }
                return visibleChunks;
}

        // AJOUT : coordonnées du chunk actuel du joueur, calculées une seule fois ici
        const currentChunkCoords = this.worldToChunkCoords(
            player.position.x,
            player.position.y,
            player.position.z
        ).chunk;

        // AJOUT : si le joueur est toujours dans le même chunk qu'à la frame précédente,
        // on ne recalcule rien du tout -> évite de refaire tout ce travail 60 fois par seconde
        if (
            currentChunkCoords.x === this.lastPlayerChunk.x &&
            currentChunkCoords.z === this.lastPlayerChunk.z
        ) {
            return;
        }

        // AJOUT : on met à jour le dernier chunk connu du joueur
        this.lastPlayerChunk = currentChunkCoords;

        const visibleChunks = getVisibleChunks(player);
        // CORRECTION : on passe l'objet directement au lieu de le concaténer en string,
        // sinon la console affiche juste "[object Object]" illisible
        console.log("VISIBLE:", visibleChunks);
        
        //2-Compare with the current set of chunks
        /**
         * Returns an array containing the coordinates of the chunks that 
         * are not yet loaded and need to be added to the scene 
         * @param {{x:number,z:number}[]} visibleChunks 
         * @returns {{x:number,z:number}[]}
         */
        const getChunksToAdd = (visibleChunks) => {
            // 1. On extrait proprement toutes les coordonnées x,z des chunks existants
            // CORRECTION : on ne garde que les vrais WorldChunk, pas les BoxHelper
            // (qui n'ont pas de vraies coordonnées de chunk dans leur userData)
            const existingCoords = this.children
                .filter((obj) => obj instanceof WorldChunk)
                .map((obj) => obj.userData);

            // 2. On filtre les chunks visibles pour ne garder que ceux qui ne sont PAS dans le monde
            return visibleChunks.filter((visibleChunk) => {
                const chunkExists = existingCoords.some(
                    (existing) => existing.x === visibleChunk.x && existing.z === visibleChunk.z
                );
                return !chunkExists; // Si le chunk n'existe pas, on l'ajoute à la liste
            });
}
        const chunksToadd =getChunksToAdd(visibleChunks);
        
        console.log("Chunks to Add:", chunksToadd);
        
        //3-Remove chunks that are no longer visible 
        /**
     * Removes current loaded chunks that are no longer visible to the player
     * @param {{x:number,z:number}[]} visibleChunks
     * @returns {WorldChunk[]}
     */
    const removeUnusedChunks = (visibleChunks) => {
        /** @type {WorldChunk[]} */
        // CORRECTION CRITIQUE : on ajoute "chunk instanceof WorldChunk" pour ignorer
        // les BoxHelper, sinon ils sont considérés à tort comme "à supprimer"
        // (leur userData n'a pas de x/z) et ça plante sur chunk.disposeInstances()
        const chunksToRemove= this.children.filter((chunk) => {
            if (!(chunk instanceof WorldChunk)) return false;

            const { x, z } = chunk.userData;

            
            const chunkExists = visibleChunks.find((visibleChunk) => {
                return visibleChunk.x === x && visibleChunk.z === z;
            });

            // Si le chunk existant n'est PAS dans la liste des chunks visibles, il est à supprimer
            return !chunkExists;
        });
        for (const chunk of chunksToRemove) {
            chunk.disposeInstances();
            this.remove(chunk);

            // AJOUT : on retire aussi le BoxHelper associé à ce chunk,
            // sinon son contour cyan reste flottant dans le vide pour toujours
            const linkedHelper = this.children.find(
                (child) => child.name === "chunkBoundaryHelper" && child.userData.linkedChunk === chunk
            );
            if (linkedHelper) {
                this.remove(linkedHelper);
            }

            console.log(`Removing chunk at :${chunk.userData.x} Z: ${chunk.userData.z}`);
            
        }
        // CORRECTION : on retourne enfin la liste, sinon la variable
        // extérieure "chunksToRemove" restait "undefined"
        return chunksToRemove;
    }
        const chunksToRemove = removeUnusedChunks(visibleChunks);
        console.log("Chunks to REMOVE:", chunksToRemove);
        // CORRECTION : suppression du deuxième appel en double, qui refaisait
        // tout le travail (et le dispose) une seconde fois pour rien
        
        //4-Add new chunks that just came into view

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
            // CORRECTION CRITIQUE : "instanceof WorldChunk" empêche de récupérer
            // par erreur un BoxHelper (position toujours à 0,0,0) à la place
            // du vrai chunk -> c'était la cause du bug de collision au spawn
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
        this.clear()
    }
}