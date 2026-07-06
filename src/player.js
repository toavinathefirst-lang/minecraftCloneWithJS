import { PointerLockControls } from "three/examples/jsm/Addons.js"; 
import { PerspectiveCamera, Vector2, Vector3 } from "three";
import { Scene } from "three";
export class Player {
    maxSpeed=10;
    input = new Vector3();
    velocity = new Vector3()
    camera = new PerspectiveCamera(70,window.innerWidth/window.innerHeight,0.1,200);
    controls = new PointerLockControls(this.camera,document.body)
    /**
     * @param {Scene} scene 
     */
    constructor(scene){
        this.camera.position.set(32,16,32);
        scene.add(this.camera);
        

        document.addEventListener('keydown',this.onKeyDown.bind(this));
        document.addEventListener('keyup',this.onKeyUp.bind(this));
    }
    /**
     * 
     * @param {number} dt 
     */
    applyInputs(dt){
        if(this.controls.isLocked){
            this.velocity.x = this.input.x;
            this.velocity.z = this.input.z;
            this.controls.moveRight(this.velocity.x * dt);
            this.controls.moveForward(this.velocity.z * dt)
        }
    }
    /**
     * @type {Vector3}
     */
    get position(){
        return this.camera.position;
    }
    /**
     * @param {KeyboardEvent} event 
     */
    onKeyDown(event){
        if(!this.controls.isLocked){
            this.controls.lock()
            console.log("controls locked");
            
        }
        switch (event.code) {
            case "KeyW":
                this.input.z = this.maxSpeed;
                break;
            case "KeyA":
                this.input.x = -this.maxSpeed;
                break;
            case "KeyS":
                this.input.z=-this.maxSpeed;
                break;
            case "KeyD":
                this.input.x = this.maxSpeed;
                break;
        
        }
    }
    /**
     * @param {KeyboardEvent} event 
     */
    onKeyUp(event){
        switch (event.code) {
            case "KeyW":
                this.input.z = 0;
                break;
            case "KeyA":
                this.input.x = 0;
                break;
            case "KeyS":
                this.input.z=0;
                break;
            case "KeyD":
                this.input.x = 0;
                break;
        
        }
    }
}