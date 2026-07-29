import { TextureLoader, SRGBColorSpace, MeshLambertMaterial ,NearestFilter, MeshBasicMaterial} from "three";

const textureLoader = new TextureLoader();

/**
 * @param {string} path 
 */
function loadTexture(path) {
    const texture = textureLoader.load(path);
    texture.colorSpace = SRGBColorSpace;
    texture.minFilter = NearestFilter;
    texture.magFilter = NearestFilter
    return texture;
}

const textures = {
    dirt: loadTexture("../assets/textures/dirt.png"),
    grass: loadTexture("../assets/textures/grass.png"),
    grassSide: loadTexture("../assets/textures/grass_side.png"),
    stone: loadTexture('../assets/textures/stone.png'),
    coalOre: loadTexture("../assets/textures/coal_ore.png"),
    ironOre: loadTexture("../assets/textures/iron_ore.png"),
    leaves:loadTexture("../assets/textures/leaves.png"),
    treeSide:loadTexture("../assets/textures/tree_side.png"),
    treeTop:loadTexture("../assets/textures/tree_top.png"),
    sand:loadTexture("../assets/textures/sand.png"),
    snow:loadTexture("../assets/textures/snow.png"),
    snowSide:loadTexture("../assets/textures/snow_side.png"),
    jungleTreeSide:loadTexture("../assets/textures/jungle_tree_side.png"),
    jungleTreeTop:loadTexture("../assets/textures/jungle_tree_top.png"),
    jungleLeaves:loadTexture("../assets/textures/jungle_leaves.png")

    
}

export const blocks = {
    empty: {
        id: 0,
        name: 'empty'
    },
    grass: {
        id: 1,
        name: 'grass',
        color: 0x5a9e32, // Vert pour l'herbe en surface
        material: [
            new MeshLambertMaterial({ map: textures.grassSide }), // right
            new MeshLambertMaterial({ map: textures.grassSide }), // left
            new MeshLambertMaterial({ map: textures.grass }),     // top
            new MeshLambertMaterial({ map: textures.dirt }),      // bottom
            new MeshLambertMaterial({ map: textures.grassSide }), // front
            new MeshLambertMaterial({ map: textures.grassSide })  // back
        ]
    },
    dirt: {
        id: 2,
        name: 'dirt',
        color: 0x807020, // Marron pour la terre en dessous
        material:new MeshLambertMaterial({ map: textures.dirt })
    },
    stone: {
        id: 3,
        name: 'stone',
        color: 0x808080,
        scale: { x: 30, y: 30, z: 30 },
        scarcity: 0.25,
        material:new MeshLambertMaterial({map:textures.stone})
    },
    coalOre: {
        id: 4,
        name: "coalOre",
        color: 0x202020,
        scale: { x: 18, y: 15, z: 18 },
        scarcity: 0.66,
        material:new MeshLambertMaterial({map:textures.coalOre})
    },
    ironOre: {
        id: 5,
        name: 'iron',
        color: 0x806060,
        scale: { x: 20, y: 30, z: 40 },
        scarcity: 0.76,
        material:new MeshLambertMaterial({map:textures.ironOre})
    },
    tree:{
        id:6,
        name:"tree",
        material:[
               new MeshLambertMaterial({ map: textures.treeSide }), // right
            new MeshLambertMaterial({ map: textures.treeSide }), // left
            new MeshLambertMaterial({ map: textures.treeTop }),     // top
            new MeshLambertMaterial({ map: textures.treeTop }),      // bottom
            new MeshLambertMaterial({ map: textures.treeSide }), // front
            new MeshLambertMaterial({ map: textures.treeSide })  // back
        ]
    },
    leaves:{
        id:7,
        name:"leaves",
        material:new MeshLambertMaterial({map:textures.leaves})
    },
    sand:{
        id:8,
        name:"sand",
        material:new MeshLambertMaterial({map:textures.sand})
    },
    cloud:{
        id:9,
        name:"cloud",
        material:new MeshBasicMaterial({
            color:0xf0f0f0,
            wireframe: false,   
            transparent: true,  
            opacity: 0.25,      
           // depthWrite: false   
        })
    },
    snowDirt:{
        id:10,
        name:'snowDirt',
        material:[
               new MeshLambertMaterial({ map: textures.snowSide }), // right
            new MeshLambertMaterial({ map: textures.snowSide }), // left
            new MeshLambertMaterial({ map: textures.snow }),     // top
            new MeshLambertMaterial({ map: textures.dirt }),      // bottom
            new MeshLambertMaterial({ map: textures.snowSide }), // front
            new MeshLambertMaterial({ map: textures.snowSide })  // back
        ]
    },
    snow:{
        id:11,
        name:'snow',
        material:new MeshLambertMaterial({map:textures.snow})
    },
     jungleTree:{
        id:12,
        name:"tree",
        material:[
               new MeshLambertMaterial({ map: textures.jungleTreeSide }), // right
            new MeshLambertMaterial({ map: textures.jungleTreeSide }), // left
            new MeshLambertMaterial({ map: textures.jungleTreeTop }),     // top
            new MeshLambertMaterial({ map: textures.jungleTreeTop }),      // bottom
            new MeshLambertMaterial({ map: textures.jungleTreeSide }), // front
            new MeshLambertMaterial({ map: textures.jungleTreeSide})  // back
        ]
    },
    jungleLeaves:{
        id:13,
        name:"leaves",
        material:new MeshLambertMaterial({map:textures.jungleLeaves})
    },

}

export const ressources = [blocks.stone, blocks.coalOre, blocks.ironOre];