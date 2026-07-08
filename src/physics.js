
import { blocks } from "./block";
import { Player } from "./player";
import { World } from "./world";
import { BoxGeometry, Mesh, MeshBasicMaterial, Object3D, Scene ,Group, Vector3, SphereGeometry} from "three";

const collisionMaterial = new MeshBasicMaterial({
    color:0xff0000,
    transparent:true,
    opacity:0.2
});
const collisionGeometry = new BoxGeometry(1.001,1.001,1.001);

const contactMaterial = new MeshBasicMaterial({
    wireframe:true,
    color:0x00ff00
});

const contactGeometry = new SphereGeometry(0.05,6,6);

export class Physics{
    simulationRate= 200;
    timeStep = 1 / this.simulationRate;
    accumulator=0;
    gravity = 32;
    /**
     * 
     * @param {Scene} scene 
     */
    constructor(scene){
        this.helpers =new Group();
        scene.add(this.helpers);
    }
    /**
     * Move the physics simulation forward in time by 'dt'
     * @param {number} dt 
     * @param {Player} player
     * @param {World} world  
     */
    update(dt, player, world) {
        this.accumulator +=dt;

        while(this.accumulator >=this.timeStep){
           
            player.velocity.y -= this.gravity*this.timeStep;
            player.applyInputs(this.timeStep);
            player.updateBoundsHelper()
            this.detectCollisions(player,world);
            this.accumulator -= this.timeStep;
        }
       
    }
    /**
     * 
     * @param {Player} player 
     * @param {World} world 
     */
    detectCollisions(player,world){
         player.onGround=false
        // 1. On vide le groupe des cubes rouges à chaque frame
        this.helpers.clear();
        const candidates = this.broadPhase(player,world);
        const collisions = this.narrowPhase(candidates,player)

        if(collisions.length >0){
            this.resolveCollisions(collisions,player)
        }
    }
    /*
        Le code de detection de collision est divisé en 3 phase 
            broadphase (phase de filtrage large)
            narrowphase 
            resolveCollisions

            Lors du broadphase, nous réduisons la liste des blocs à vérifier pour détecter les collisions 
            en trouvant l ensemble des blocs les plus prches du joueurs.

            Lors de la narrow phase , nous prenons les blocs candidats  de phase large et vérifions si l un d entre eux
            entre en collision avec le cylindre englobant du joueur.Si c'est le cas ,nous calculons
                1-le point de collision,2-l overlap(le chevauchement entre le bloc et joueurs)et 3-normal de collision

            Lors de la resolveCollisions(Resolution Finale) nous prenons toutes les collisions trouvés lors de la phase 
            broadphase et les traitons un par un .Pour chaque collision ,nous adjustons la position du joueur afin qu il ne soit plus en collsion avec le bloc
            et nous annulons sa vitesse dans la direction de la normale de la collision 
    
    */
    /**
     * 
     * @param {Player} player 
     * @param {World} world 
     * @returns {[]}
     */
    broadPhase(player,world){
        const candidates = [];
        //TODO:Find candidate blocks
        //Get the extents of player 
        const extents = {
            x:{
                min:Math.floor(player.position.x - player.radius),
                max:Math.ceil(player.position.x + player.radius)
            },
            y:{
                min:Math.floor(player.position.y - player.height),
                max:Math.ceil(player.position.y )
            },
            z:{
                min:Math.floor(player.position.z - player.radius),
                max:Math.ceil(player.position.z + player.radius)
            }
        }
        //Loop through all blocks within the player's extents
        //If they 'r not empty , then they are a possible collision candidate 
        for (let x= extents.x.min;x<=extents.x.max ; x++){
            for(let y=extents.y.min;y<=extents.y.max;y++){
                for(let z=extents.z.min;z<=extents.z.max;z++){
                    const block = world.getBlock(x,y,z);
                    if(block && block.id !== blocks.empty.id){
                        const blockPos = {x,y,z};
                        // 🟢 Création explicite sans utiliser le spread operator (...)
                        candidates.push({
                            id: block.id,
                            instanceId: block.instanceId,
                            x: x,
                            y: y,
                            z: z
                        });
                        this.addCollisionHelper(blockPos);
                    }
                }
            }
        }

        console.log(`Broadphase Candidates : ${candidates.length}`)
        return candidates;
    }
    /**
     * @param {[]} candidates 
     * @param {Player} player 
     * @returns {[]}
     */
    narrowPhase(candidates,player){
        const collisions = [];
        // TODO: Implémenter la logique de détection fine ici
        for(const block of candidates){
            //1 get point on block closest to the player
            const p= player.position;
            const closestPoint = {
                x:Math.max(block.x - 0.5,Math.min(p.x ,block.x +0.5)),
                y:Math.max(block.y - 0.5,Math.min(p.y - (player.height/2),block.y +0.5)),
                z:Math.max(block.z - 0.5,Math.min(p.z ,block.z +0.5)),

            }
            //2 Determine if point is inside player's bounding cylinder
            //Get Distance along each axis between closest point and the center 
            //of the player's bounding cylinder
            const dx= closestPoint.x - player.position.x;
            const dy = closestPoint.y -(player.position.y -(player.height/2));
            const dz =closestPoint.z - player.position.z;

            if(this.pointInPlayerBoundingCylinder(closestPoint,player)){
                 //3 if true , Compute the following:
            //    -Contact Point
            //    -Overlap
            //    -Collision Normal

            //Compute the overlap between the point and player's bounding
            //Cylinder along the y axis and in the xz-plane 
                const overlapY = (player.height/2)  - Math.abs(dy);
                const overlapXZ = player.radius - Math.sqrt(dx*dx + dz*dz)
            //Comupte the normal of the collision (pointing away from the contact point)
            //and the overlap between the point     nd the player's bounding cylinder 

                let normal,overlap;

                if(overlapY < overlapXZ){
                    normal =new Vector3(0,-Math.sign(dy),0);
                    overlap = overlapY
                    player.onGround=true;
                } 
                else {
                    const dist = Math.sqrt(dx * dx + dz * dz);
                    normal = dist > 0.0001
                        ? new Vector3(-dx, 0, -dz).normalize()
                        : new Vector3(1, 0, 0); // fallback arbitraire
                    overlap = overlapXZ;
                }
            collisions.push({
                block,
                contactPoint:closestPoint,
                normal,
                overlap
            })
            this.addContatPointHelper(closestPoint)
        }
            
    }       
    return collisions; // Renvoie un tableau vide pour éviter le crash
}
    /**
     * 
     * @param {object} collisions 
     * @param {Player} player 
     */
    resolveCollisions(collisions,player){
        //Resolve the collisions in order of the smallest overlap to the largest 
        collisions.sort((a, b) => a.overlap - b.overlap);
        for (const collision    of collisions) {
            //TODO:Resove the collision
            //1) Adjust player position so the block and player are no longer overlapping 
            let deltaPosition = collision.normal.clone();
            deltaPosition.multiplyScalar(collision.overlap);
            player.position.add(deltaPosition)
            //2)Negate player's velocity along the collision normal
            //Get the magnitude of the player's velocity along the collision normal
            let magnitude = player.worldVelocity.dot(collision.normal);
            //Remove the part of the velocity from the player's velocity
            let velocityAdjustement=collision.normal.clone().multiplyScalar(magnitude);

            //Apply the velocity to the player
            player.applyWorldDeltaVelocity(velocityAdjustement.negate())
        }
    }
    /**
     * visualize the block the player is colliding with
     * @param {Object3D} block 
     */
    addCollisionHelper(block){
        const blockMesh = new Mesh(collisionGeometry,collisionMaterial);
        blockMesh.position.copy(block);
        this.helpers.add(blockMesh);
    }
    /**
     * Visualize the contact at the point'p'
     * @param {{x:number,y:number,z:number}} p 
     */
    addContatPointHelper(p){
        const contactMesh =new Mesh(contactGeometry,contactMaterial);
        contactMesh.position.copy(p);
        this.helpers.add(contactMesh);
    }
    /**
     * Returns true if the point 'p' is inside the player's bounding cylinder 
     * @param {{x:number,y:number,z:number}} p
     * @param {Player} player
     * @returns {boolean}  
     */
    pointInPlayerBoundingCylinder(p,player){
       const dx= p.x -player.position.x;
       const dy = p.y - (player.position.y -(player.height/2));
       const dz = p.z -player.position.z;

       const r_sq =dx *dx + dz *dz;

       //Check if contact point is inside the player's bounding 
       return (Math.abs(dy) < player.height/2) && (r_sq<player.radius*player.radius);
    }
}