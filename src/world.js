import * as THREE from "three"

const geometry = new THREE.BoxGeometry();//C'est le squelette. Tu dis : "Je veux la forme d'une boîte (un cube)".
const material = new THREE.MeshLambertMaterial({color:0x00d000}) //C'est la peinture qu'on va mettre dessus. 0x00d000 est un code couleur (Hexadécimal) pour du vert. "Basic" signifie qu'il ne réagit pas aux lumières, il est juste coloré uniformément.
export class World extends THREE.Group{
    constructor(size=32){
        super();
        this.size = size
    }
    generate(){
        for (let X = 0; X < this.size; X++) {
            for (let Z = 0; Z < this.size ; Z++) {
                const block = new THREE.Mesh(geometry,material)
                block.position.set(X,0,Z)  
                this.add(block)             
            }         
        }
    }
}