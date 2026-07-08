import { PointerLockControls } from "three/examples/jsm/Addons.js"; 
import { CameraHelper, CylinderGeometry, Euler, Mesh, MeshBasicMaterial, PerspectiveCamera, Vector2, Vector3 } from "three";
import { Scene } from "three";
export class Player {
    radius =0.5;
    height = 1.75;
    jumpSpeed =10;
    onGround = false;
    maxSpeed=10;
    input = new Vector3();
    velocity = new Vector3()
    #worldVelocity =new Vector3()

    camera = new PerspectiveCamera(70,window.innerWidth/window.innerHeight,0.1,200);
    controls = new PointerLockControls(this.camera,document.body)
    cameraHelper = new CameraHelper(this.camera)
    /**
     * @param {Scene} scene 
     */
    constructor(scene){
        this.camera.position.set(32,16,32);
        scene.add(this.camera);
        scene.add(this.cameraHelper)
        

        document.addEventListener('keydown',this.onKeyDown.bind(this));
        document.addEventListener('keyup',this.onKeyUp.bind(this));

        //Wireframe mesh visualizing the player's bounding cylinder
        this.boundHelper = new Mesh(new CylinderGeometry(this.radius,this.radius,this.height,16),
            new MeshBasicMaterial({wireframe:true}));
        scene.add(this.boundHelper);
    }
    get worldVelocity(){
        this.#worldVelocity.copy(this.velocity);
        this.#worldVelocity.applyEuler(new Euler(0,this.camera.rotation.y,0));
        return this.#worldVelocity;
    }
   /**
    * 
    * @param {Vector3} dv 
    */
    applyWorldDeltaVelocity(dv){
        dv.applyEuler(new Euler(0,-this.camera.rotation.y,0));
        this.velocity.add(dv)
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
            this.position.y += this.velocity.y *dt;

            document.getElementById("player-position").innerHTML=this.toString()

        }
    }
    /**
     * Updates the positions of the player's bounding cylinder helper
     */
    updateBoundsHelper(){
        this.boundHelper.position.copy(this.position);
        this.boundHelper.position.y -= this.height /2;
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
            case "KeyR":
                this.position.set(32,16,32);
                this.velocity.set(0,0,0);
                break;
            case "Space":
                if(this.onGround){
                    this.velocity.y += this.jumpSpeed;
                }
        
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
    toString(){
        let str="";
        str += `X: ${this.position.x.toFixed(3)} `;
        str += `Y: ${this.position.y.toFixed(3)} `;
        str += `Z: ${this.position.z.toFixed(3)} `;
        return str

    }
}