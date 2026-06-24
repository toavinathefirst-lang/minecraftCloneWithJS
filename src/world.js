import * as THREE from "three"
import { SimplexNoise } from "three/examples/jsm/Addons.js";
import { RNG } from "./rng";
import { blocks } from "./block";
import { ressources } from "./block";
const geometry = new THREE.BoxGeometry();//C'est le squelette. Tu dis : "Je veux la forme d'une boîte (un cube)".
const material = new THREE.MeshLambertMaterial() 
export class World extends THREE.Group{
    /**
     * @type{{
     * id:number,
     * instanceId:number
     * }[][][]}
     */
    data=[];
    params ={
        seed:0,
        terrain:{
            scale:30,
            magnitude:0.5, //taille des colline
            offset:0.2 //nombre aelatoire élévée pour abaisser ou augmenter les colline
        }
    };
    constructor(size={
        width:64,height:32,
    }){
        super();
        this.size = size
    }
    generate(){
        const rng=new RNG(this.params.seed)
        this.initializeTerrain()
        this.generateRessources(rng)
        this.generateTerrain(rng)
        this.generateMeshes()
    }
    //Generating the ressources 
    /**
     * @param {RNG} rng 
     */
    generateRessources(rng){
        const simplex = new SimplexNoise(rng)
        ressources.forEach(ressource=>{
                for (let x = 0; x < this.size.width; x++) {
                for (let y = 0; y < this.size.height; y++) {
                    for (let z = 0; z < this.size.width; z++) {
                        const value =simplex.noise3d(x/ressource.scale.x,
                            y/ressource.scale.y,
                            z/ressource.scale.z);
                        if (value>ressource.scarcity) {
                            this.setBlockId(x,y,z,ressource.id)
                        }      
                    }
                    
                }
            }
        })
       
    }
    /**Initializing  the world terrain
     */
    initializeTerrain(){
        this.data=[];
        for (let x = 0; x<this.size.width ; x++) {
            const slice=[]
            for(let y=0;y<this.size.height;y++){
               /**
                * @type{{
                * id:number,
                * instanceId:number
                * }}
                 */
                const row =[]
                for(let z=0;z<this.size.width;z++){
                    row.push({
                        id:blocks.empty.id,
                        instanceId:null
                    });
                }
                slice.push(row); // Correction : On pousse row dans slice
            }
            this.data.push(slice); // Correction : On pousse slice dans data
        }
    }
    /**
     * Generate the terrain data for the world
     */
    /**
     * Generate the terrain data for the world
     * @param {RNG} rng 
     */
    generateTerrain(rng){
        
        const simplex = new SimplexNoise(rng)
        for (let x = 0; x < this.size.width; x++) {
            for (let z = 0; z < this.size.width; z++) {
                //compute the noise value at this x-z location
                const value=simplex.noise(
                    x/this.params.terrain.scale,
                    z/this.params.terrain.scale);
                //Scale the noise based on the magnitude/offset
                const scaledNoise = this.params.terrain.offset + this.params.terrain.magnitude * value;
                
                // Correction : On utilise Math.floor pour obtenir un nombre entier de blocs
                let height = Math.floor(this.size.height * scaledNoise);
                //Clamping height between 0 and max height
                height = Math.max(0, Math.min(height, this.size.height - 1))

                // On ne boucle que jusqu'à "height" pour remplir la colonne construite
                for (let y = 0; y <= height; y++) {
                    if (y === height) {
                        // Le bloc le plus haut reçoit de l'herbe
                        this.setBlockId(x, y, z, blocks.grass.id)
                    } else if (y<height && this.getBlock(x,y,z).id === blocks.empty.id){
                        // Tous les blocs en dessous reçoivent de la terre
                        this.setBlockId(x, y, z, blocks.dirt.id)
                    }
                }

                // Optionnel mais propre : On s'assure que le reste de la colonne jusqu'au plafond est bien vide
                for (let y = height + 1; y < this.size.height; y++) {
                    this.setBlockId(x, y, z, blocks.empty.id)
                }
            }
        }
    }
    /**
     * Generate the 3D representation of the world from the world data
     */
    generateMeshes(){
        // Nettoyage pour éviter l'accumulation à chaque onChange du lil-gui
        this.children.forEach(child => {
            if (child.dispose) child.dispose();
        });
        this.clear()
        
        const maxCount = this.size.width * this.size.width*this.size.height
        const mesh= new THREE.InstancedMesh(geometry,material,maxCount)//il faut connaitre a lavance le nombre max d instabce
        mesh.count =0;
        const matrix = new THREE.Matrix4()
        for (let x = 0; x < this.size.width; x++) {
            for (let y=0;y<this.size.height;y++){
                for (let z = 0; z < this.size.width ; z++) {
                    const blockId=this.getBlock(x,y,z).id;
                    const blockType=Object.values(blocks).find(x=>x.id === blockId);
                    const instanceId=mesh.count;

                    if(blockId !== blocks.empty.id && !this.isBlockObscured(x,y,z)){
                        matrix.setPosition(x+0.5, y+0.5, z+0.5)
                        mesh.setMatrixAt(instanceId, matrix)
                        mesh.setColorAt(instanceId, new THREE.Color(blockType.color))
                        this.setBlockInstanceId(x, y, z, instanceId);
                        mesh.count++
                    }
                  
                }     
            }
        }
        // AJOUTE CETTE LIGNE ICI :
        if (mesh.count > 0) {
            mesh.instanceColor.needsUpdate = true;
        }
        this.add(mesh);
    }
    /**
     * * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @returns {{id:number,instanceId:number}}
     */
    getBlock(x,y,z){
        if (this.inBounds(x,y,z)) {
            return this.data[x][y][z]
        }else {
            return null;
        }
    }
    /**
     * * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     */
    inBounds(x,y,z){
        if (x>=0 && x<this.size.width &&
            y>=0 && y<this.size.height &&
            z>=0 && z < this.size.width) {
            return true
        } else {
            return false
        }
    }
    /**
     * * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @param {number} id 
     */
    setBlockId(x,y,z,id){
        if(this.inBounds(x,y,z)){
            this.data[x][y][z].id =id;
        }
    }
    /**
     * * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @param {number} instanceId 
     */
    setBlockInstanceId(x,y,z,instanceId){
        if(this.inBounds(x,y,z)){
            this.data[x][y][z].instanceId=instanceId
        }
    }
    /**
     * 
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @returns {boolean}
     */
    isBlockObscured(x,y,z){
        const up =this.getBlock(x,y+1,z)?.id ?? blocks.empty.id;
        const down =this.getBlock(x,y-1,z)?.id ?? blocks.empty.id;
        const left =this.getBlock(x+1,y,z)?.id ?? blocks.empty.id;
        const right =this.getBlock(x-1,y,z)?.id ?? blocks.empty.id;
        const forward =this.getBlock(x,y,z+1)?.id ?? blocks.empty.id;
        const back =this.getBlock(x,y,z-1)?.id ?? blocks.empty.id;
        
        //if any of the block's side is exposed , it is not ovscured
        if(up === blocks.empty.id || 
            down === blocks.empty.id || 
            left === blocks.empty.id || 
            right === blocks.empty.id || 
            forward === blocks.empty.id || 
            back === blocks.empty.id 
        ){
            return false
        }else{
            return true
        }
    }
}