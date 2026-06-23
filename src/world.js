import * as THREE from "three"

const geometry = new THREE.BoxGeometry();//C'est le squelette. Tu dis : "Je veux la forme d'une boîte (un cube)".
const material = new THREE.MeshLambertMaterial({color:0x00d000}) 
export class World extends THREE.Group{
    /**
     * @type{{
     * id:number,
     * instanceId:number
     * }[][][]}
     */
    data=[];
    thresold =0.5
    constructor(size={
        width:64,height:32,
    }){
        super();
        this.size = size
    }
    generate(){
        this.generateTerrain()
        this.generateMeshes()
    }
    /**
     * Generate the world terrain
     */
    generateTerrain(){
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
                        id:1,
                        instanceId:null
                    });
                }
                slice.push(row); // Correction : On pousse row dans slice
            }
            this.data.push(slice); // Correction : On pousse slice dans data
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
                    const instanceId=mesh.count;

                    if(blockId !==0){
                        matrix.setPosition(x+0.5,y+0.5,z+0.5)
                        mesh.setMatrixAt(instanceId,matrix) // Correction : Utilisation de instanceId
                        this.setBlockInstanceId(x,y,z,instanceId);
                        mesh.count++ // Correction : Une seule incrémentation ici
                    }
                  
                }     
            }
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
}