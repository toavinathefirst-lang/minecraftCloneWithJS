import { Group, Mesh } from "three";

export class Tool extends Group{
    animate =  false;
    //startTime of the animation
    animationStart =0;

    //Speed of the tool animation in rad/s
    animationSpeed = 0.025;
    //currently active animation
    animation = undefined;
    //the 3D mesh of the actual tool
    toolMesh = undefined;
    /**
     * 
     * @param {Mesh} mesh 
     */
        setMesh(mesh){
            this.clear();
            this.add(mesh);
            mesh.receiveShadow = true;
            mesh.castShadow = true;

            this.position.set(0.6, -0.3, -0.5);
            this.scale.set(0.5, 0.5, 0.5);
            
            // Rotation pour que la pioche pointe vers l'avant
            this.rotation.z = Math.PI/2;
           
            this.rotation.y = Math.PI +0.2;
        }
}