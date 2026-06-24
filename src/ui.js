import GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import { World } from "./world";
import { blocks } from "./block";
import { ressources } from "./block";
/**
 * @param {World} world 
 */
export function createUI(world){
    const gui = new GUI();
    gui.add(world.size,"width",8,128,1).name("width") //min 8 max 128, 1 pas a la fois
    gui.add(world.size,"height",8,64,1).name("height")

    const terrainFolder = gui.addFolder('Terrain');
    terrainFolder.add(world.params,"seed",0,1000).name('Seed')
    terrainFolder.add(world.params.terrain,"scale",10,100).name('Scale')
    terrainFolder.add(world.params.terrain,"magnitude",0,1).name('Magnitude')
    terrainFolder.add(world.params.terrain,"offset",0,1).name('Offset')

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