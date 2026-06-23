import GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import { World } from "./world";
/**
 * @param {World} world 
 */
export function createUI(world){
    const gui = new GUI();
    gui.add(world.size,"width",8,128,1).name("width") //min 8 max 128, 1 pas a la fois
    gui.add(world.size,"height",8,64,1).name("height")
    gui.onChange(()=>{
        world.generate()
    })
}