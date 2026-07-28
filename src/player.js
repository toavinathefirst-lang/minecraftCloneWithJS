import { PointerLockControls } from "three/examples/jsm/Addons.js"; 
import { BoxGeometry, CameraHelper, CylinderGeometry, Euler, Matrix4, Mesh, MeshBasicMaterial, PerspectiveCamera, Raycaster, Vector2, Vector3 } from "three";
import { Scene } from "three";
import { World } from "./world";
import { blocks } from "./block";
import { Tool } from "./tool";

const CENTER_SCREEN = new Vector2();
export class Player {
    radius = 0.5;
    height = 1.75;
    jumpSpeed = 10;
    onGround = false;
    maxSpeed = 10;
    input = new Vector3();
    velocity = new Vector3();
    #worldVelocity = new Vector3();

    camera = new PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200);
    controls = new PointerLockControls(this.camera, document.body);
    cameraHelper = new CameraHelper(this.camera);

    raycaster = new Raycaster(new Vector3(),undefined,0,3);
    selectedCoords =null;
    activeBlockId=blocks.empty.id;
    tool = new Tool()
    /**
     * @param {Scene} scene 
     */
    constructor(scene){
        this.camera.position.set(32, 16, 32);
        this.camera.layers.enable(1)
        scene.add(this.camera);
        //scene.add(this.cameraHelper);

        this.camera.add(this.tool)

        document.addEventListener('keydown', this.onKeyDown.bind(this));
        document.addEventListener('keyup', this.onKeyUp.bind(this));

        // Wireframe mesh visualizing the player's bounding cylinder
        this.boundHelper = new Mesh(
            new CylinderGeometry(this.radius, this.radius, this.height, 16),
            new MeshBasicMaterial({ wireframe: true })
        );
       // scene.add(this.boundHelper);

       const selectionMaterial = new MeshBasicMaterial({
            transparent:true,
            opacity:0.3,
            color:0xffffaa,
       })

       const selectionGeometry = new BoxGeometry(1.01,1.01,1.01);
       this.selectionHelper =new Mesh(selectionGeometry,selectionMaterial);
       scene.add(this.selectionHelper)
    }

    get worldVelocity(){
        this.#worldVelocity.copy(this.velocity);
        this.#worldVelocity.applyEuler(new Euler(0, this.camera.rotation.y, 0));
        return this.#worldVelocity;
    }

    /**
     * @param {Vector3} dv 
     */
    applyWorldDeltaVelocity(dv){
        dv.applyEuler(new Euler(0, -this.camera.rotation.y, 0));
        this.velocity.add(dv);
    }

    /**
     * @param {number} dt 
     */
    applyInputs(dt){
        // CORRECTION : Si le pointeur est locké, on applique les entrées clavier
        if (this.controls.isLocked) {
            this.velocity.x = this.input.x;
            this.velocity.z = this.input.z;
        } else {
            // Si non locké (pause / inventaire), on coupe les mouvements horizontaux
            this.velocity.x = 0;
            this.velocity.z = 0;
        }

        // On applique les déplacements horizontaux via PointerLockControls
        this.controls.moveRight(this.velocity.x * dt);
        this.controls.moveForward(this.velocity.z * dt);

        // CORRECTION CRITIQUE : La position Y doit toujours s'incrémenter, locké ou non !
        this.position.y += this.velocity.y * dt;

        // Mise à jour de l'UI uniquement en jeu actif
        const uiElement = document.getElementById("player-position");
        if (uiElement && this.controls.isLocked) {
            uiElement.innerHTML = this.toString();
        }
    }

    /**
     * Updates the positions of the player's bounding cylinder helper
     */
    updateBoundsHelper(){
        this.boundHelper.position.copy(this.position);
        this.boundHelper.position.y -= this.height / 2;
    }

    /**
     * @type {Vector3}
     */
    get position(){
        return this.camera.position;
    }
    /**
     * 
     * @param {World} world 
     */
    update(world){
        this.updateRayCaster(world);
        this.tool.update()
    }
    /**
     * 
     * @param {World} world 
     */
    updateRayCaster(world){
        this.raycaster.setFromCamera(CENTER_SCREEN,this.camera);
        const intersections = this.raycaster.intersectObject(world,true);

        if(intersections.length){
            const intersection = intersections[0];
           

            // Vérifie que c'est bien une InstancedMesh avec un instanceId valide
            if (intersection.object.isInstancedMesh && intersection.instanceId !== undefined) {
                const blockMatrix = new Matrix4();
                intersection.object.getMatrixAt(intersection.instanceId, blockMatrix);

                // IMPORTANT : getMatrixAt() renvoie la position LOCALE au chunk.
            // Il faut la combiner avec matrixWorld (position du chunk dans
            // le monde) pour obtenir la vraie position du bloc.
                intersection.object.updateMatrixWorld();
                blockMatrix.premultiply(intersection.object.matrixWorld);

               
                this.selectedCoords = new Vector3().setFromMatrixPosition(blockMatrix);
                if(this.activeBlockId >blocks.empty.id){
                    this.selectedCoords.add(intersection.normal)
                }
                this.selectionHelper.position.copy(this.selectedCoords);
                this.selectionHelper.visible = true;

                //console.log(this.selectedCoords);
                
            } else {
                // touché quelque chose qui n'est pas un bloc instancié
                this.selectedCoords = null;
                this.selectionHelper.visible = false;
            }
            
        }else{
            this.selectedCoords=null;
            this.selectionHelper.visible = false;
        }
    }

    /**
     * @param {KeyboardEvent} event 
     */
    onKeyDown(event){
        

        if (!this.controls.isLocked) {
            this.controls.lock();
            console.log("controls locked");
        }
        // 1. Gestion dynamique des chiffres (Digit0 -> Digit9)
        if (/^Digit[0-9]$/.test(event.code)) {
            document.getElementById(`toolbar-${this.activeBlockId}`).classList.remove('selected');
            this.activeBlockId = Number(event.key);
            document.getElementById(`toolbar-${this.activeBlockId}`).classList.add('selected');
            console.log(`activeBlock is ${event.key}`);

            this.tool.visible = (this.activeBlockId ===0);
        }
        switch (event.code) {
            

            case "KeyW": // Touche Z sur AZERTY
                this.input.z = this.maxSpeed;
                break;
            case "KeyA": // Touche Q sur AZERTY
                this.input.x = -this.maxSpeed;
                break;
            case "KeyS": // Touche S
                this.input.z = -this.maxSpeed;
                break;
            case "KeyD": // Touche D
                this.input.x = this.maxSpeed;
                break;
            case "KeyR":
                this.position.set(32, 16, 32);
                this.velocity.set(0, 0, 0);
                break;
            case "Space":
                if (this.onGround) {
                    this.velocity.y = this.jumpSpeed; // Remplacement de += par = pour un saut plus constant
                }
                break;
        }
    }

    /**
     * @param {KeyboardEvent} event 
     */
    onKeyUp(event){
        switch (event.code) {
            case "KeyW":
            case "KeyS":
                this.input.z = 0;
                break;
            case "KeyA":
            case "KeyD":
                this.input.x = 0;
                break;
        }
    }

    toString(){
        return `X: ${this.position.x.toFixed(3)} Y: ${this.position.y.toFixed(3)} Z: ${this.position.z.toFixed(3)}`;
    }
}