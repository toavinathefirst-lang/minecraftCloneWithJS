import { Group, Mesh } from "three";

export class Tool extends Group{
    animate =  false;
    //Amplitude of the tool animation
    animationAmplitude = 0.8;
    animationDuration = 400;
    //startTime of the animation
    animationStart =0;

    //Speed of the tool animation in rad/s
    animationSpeed = 0.025;
    //currently active animation
    animation = undefined;
    //the 3D mesh of the actual tool
    /**
     * @type Mesh | undefined
     */
    toolMesh = undefined;
    /**
     * 
     * @param {Mesh} mesh 
     */
    setMesh(mesh){
        this.clear();
        this.add(mesh);
        this.toolMesh = mesh;  
        mesh.receiveShadow = true;
        mesh.castShadow = true;

        this.position.set(0.6, -0.3, -0.5);
        this.scale.set(0.5, 0.5, 0.5);
        
        this.rotation.z = Math.PI/2;
        this.rotation.y = Math.PI +0.2;
    }
        get animationTime() {
            return performance.now() - this.animationStart;
        }

        startAnimation(){
            console.log("start tool  animation");
            
            this.animate =  true ;
            this.animationStart = performance.now()
             //stop existing animation
                clearTimeout(this.animation)

                //Set a timer to stop the animation after a specific duration
                this.animation = setTimeout(()=>{
                    this.animate = false;
                    if (this.toolMesh) {
                        this.toolMesh.rotation.y = 0; // retour à l'angle initial
                    }
                },this.animationDuration)
        }
        /**
         * Update the tool animation state
         */
        update(){
            if(this.animate && this.toolMesh ){
                console.log('animating');
                
                this.toolMesh.rotation.y = this.animationAmplitude 
                * Math.sin(this.animationTime * this.animationSpeed )
            }

        }
}