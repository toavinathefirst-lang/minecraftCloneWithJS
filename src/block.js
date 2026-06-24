import { TextureLoader } from "three";
import { SRGBColorSpace } from "three";
const textureLoader = new TextureLoader();
/**
 * @param {string} path 
 */
function loadTexture(path){
    const texture=textureLoader.load(path);
    texture.colorSpace = SRGBColorSpace;
    return texture;

}
const textures ={
    dirt:loadTexture("../assets/textures/dirt.png"),
    grass:loadTexture("../assets/textures/grass.png"),
    grassSide:loadTexture("../assets/textures/grass_side.png"),
    stone:loadTexture('../assets/textures/stone.png'),
    coalOre:loadTexture("../assets/textures/coal_ore.png"),
    ironOre:loadTexture("../assets/textures/iron_ore.png")
}
export const blocks = {
    empty: {
        id: 0,
        name: 'empty'
    },
    grass: {
        id: 1,
        name: 'grass',
        color: 0x5a9e32 // Vert pour l'herbe en surface
    },
    dirt: {
        id: 2,
        name: 'dirt',
        color: 0x807020 // Marron pour la terre en dessous
    },
    stone:{
        id:3,
        name:'stone',
        color:0x808080,
        scale:{x:30,y:30,z:30},
        scarcity:0.25
    },
    coalOre:{
        id:4,
        name:"coalOre",
        color:0x202020,
        scale:{x:18,y:15,z:18},
        scarcity:0.66
    },
    ironOre:{
        id:5,
        name:'iron',
        color:0x806060,
        scale:{x:20,y:30,z:40},
        scarcity:0.76
    }
}
export const ressources =[blocks.stone,blocks.coalOre,blocks.ironOre]