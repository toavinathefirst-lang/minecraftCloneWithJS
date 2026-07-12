import GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import { WorldChunk } from "./worldChunk";
import { blocks } from "./block";
import { ressources } from "./block";
import { Player } from "./player";
/**
 * @param {WorldChunk} world 
 * @param {Player} player 
 */
export function createUI(world,player){
    const gui = new GUI();

    const playerFolder = gui.addFolder("Player");
    playerFolder.add(player,"maxSpeed",1,20).name("max Speed");
    playerFolder.add(player.cameraHelper,'visible').name('show player Camera')

    // const terrainFolder = gui.addFolder('Terrain');
    // terrainFolder.add(world.params,"seed",0,1000).name('Seed');
    // terrainFolder.add(world.chunkSize,"width")  
   

    const ressourcesFolder = gui.addFolder('Ressources');
    ressources.forEach(ressource=>{
        const ressourceFolder=ressourcesFolder.addFolder(ressource.name);
        ressourceFolder.add(ressource,'scarcity',0,1).name('Scarcity');

        const scaleFolderStone =ressourceFolder.addFolder('Scale')
    scaleFolderStone.add(ressource.scale,'x',10,100).name('X Scale');
    scaleFolderStone.add(ressource.scale,'y',10,100).name('Y Scale');
    scaleFolderStone.add(ressource.scale,'z',10,100).name('Z Scale')
    })

    gui.onChange(()=>{
        world.generate()
    })
}