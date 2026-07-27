import { blocks } from "./block";
import { Player } from "./player";
import { BoxGeometry, Mesh, MeshBasicMaterial, Group, Vector3, SphereGeometry } from "three";

const collisionMaterial = new MeshBasicMaterial({
    color: 0xff0000,
    transparent: true,
    opacity: 0.2
});
const collisionGeometry = new BoxGeometry(1.001, 1.001, 1.001);

const contactMaterial = new MeshBasicMaterial({
    wireframe: true,
    color: 0x00ff00
});

const contactGeometry = new SphereGeometry(0.05, 6, 6);

export class Physics {
    simulationRate = 200;
    timeStep = 1 / this.simulationRate;
    accumulator = 0;
    gravity = 32;
    terminalVelocity = -50; // CORRECTION : Vitesse max de chute pour éviter de transpercer le sol

    /**
     * @param {Scene} scene 
     */
    constructor(scene){
        this.helpers = new Group();
        scene.add(this.helpers);
    }

    /**
     * Move the physics simulation forward in time by 'dt'
     * @param {number} dt 
     * @param {Player} player
     * @param {import("./world").World} world  
     */
    update(dt, player, world) {
        this.accumulator += dt;

        while (this.accumulator >= this.timeStep) {
            // Application de la gravité
            player.velocity.y -= this.gravity * this.timeStep;
            
            // CORRECTION : Limitation de la vitesse de chute libre
            if (player.velocity.y < this.terminalVelocity) {
                player.velocity.y = this.terminalVelocity;
            }

            player.applyInputs(this.timeStep);
            player.updateBoundsHelper();
            
            this.detectCollisions(player, world);
            
            this.accumulator -= this.timeStep;
        }
    }

    /**
     * @param {Player} player 
     * @param {import("./world").World} world 
     */
    detectCollisions(player, world) {
        player.onGround = false;
        this.helpers.clear();

        const candidates = this.broadPhase(player, world);
        const collisions = this.narrowPhase(candidates, player);

        if (collisions.length > 0) {
            this.resolveCollisions(collisions, player);
        }
    }

    /**
     * @param {Player} player 
     * @param {import("./world").World} world 
     * @returns {[]}
     */
    broadPhase(player, world) {
        const candidates = [];
        
        const extents = {
            x: {
                min: Math.floor(player.position.x - player.radius),
                max: Math.ceil(player.position.x + player.radius)
            },
            y: {
                min: Math.floor(player.position.y - player.height),
                max: Math.ceil(player.position.y)
            },
            z: {
                min: Math.floor(player.position.z - player.radius),
                max: Math.ceil(player.position.z + player.radius)
            }
        };

        for (let x = extents.x.min; x <= extents.x.max; x++) {
            for (let y = extents.y.min; y <= extents.y.max; y++) {
                for (let z = extents.z.min; z <= extents.z.max; z++) {
                    const block = world.getBlock(x, y, z);
                    if (block && block.id !== blocks.empty.id) {
                        const blockPos = { x, y, z };
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
        return candidates;
    }

    /**
     * @param {[]} candidates 
     * @param {Player} player 
     * @returns {[]}
     */
    narrowPhase(candidates, player) {
        const collisions = [];
        
        for (const block of candidates) {
            const p = player.position;
            const closestPoint = {
                x: Math.max(block.x - 0.5, Math.min(p.x, block.x + 0.5)),
                y: Math.max(block.y - 0.5, Math.min(p.y - (player.height / 2), block.y + 0.5)),
                z: Math.max(block.z - 0.5, Math.min(p.z, block.z + 0.5)),
            };

            const dx = closestPoint.x - player.position.x;
            const dy = closestPoint.y - (player.position.y - (player.height / 2));
            const dz = closestPoint.z - player.position.z;

            if (this.pointInPlayerBoundingCylinder(closestPoint, player)) {
                const overlapY = (player.height / 2) - Math.abs(dy);
                const overlapXZ = player.radius - Math.sqrt(dx * dx + dz * dz);

                let normal, overlap;

                if (overlapY < overlapXZ) {
                    normal = new Vector3(0, -Math.sign(dy), 0);
                    overlap = overlapY;
                    
                    // Si la normale pointe vers le haut, le joueur est sur le sol
                    if (normal.y > 0) {
                        player.onGround = true;
                    }
                } else {
                    const dist = Math.sqrt(dx * dx + dz * dz);
                    normal = dist > 0.0001
                        ? new Vector3(-dx, 0, -dz).normalize()
                        : new Vector3(1, 0, 0);
                    overlap = overlapXZ;
                }

                collisions.push({
                    block,
                    contactPoint: closestPoint,
                    normal,
                    overlap
                });
                this.addContatPointHelper(closestPoint);
            }
        }       
        
        return collisions;
    }

    /**
     * @param {object} collisions 
     * @param {Player} player
     */
    resolveCollisions(collisions, player) {
        collisions.sort((a, b) => a.overlap - b.overlap);
        
        for (const collision of collisions) {
            // 1) Ajustement de la position du joueur pour résoudre l'interpénétration
            let deltaPosition = collision.normal.clone().multiplyScalar(collision.overlap);
            player.position.add(deltaPosition);
            
            // 2) Annulation de la vitesse le long de la normale de collision
            let magnitude = player.worldVelocity.dot(collision.normal);
            let velocityAdjustment = collision.normal.clone().multiplyScalar(magnitude);

            player.applyWorldDeltaVelocity(velocityAdjustment.negate());
        }
    }

    /**
     * @param {import("three").Object3D} block 
     */
    addCollisionHelper(block){
        const blockMesh = new Mesh(collisionGeometry, collisionMaterial);
        blockMesh.position.copy(block);
        this.helpers.add(blockMesh);
    }

    /**
     * @param {{x:number,y:number,z:number}} p 
     */
    addContatPointHelper(p){
        const contactMesh = new Mesh(contactGeometry, contactMaterial);
        contactMesh.position.copy(p);
        this.helpers.add(contactMesh);
    }

    /**
     * @param {{x:number,y:number,z:number}} p
     * @param {Player} player
     * @returns {boolean}  
     */
    pointInPlayerBoundingCylinder(p, player){
        const dx = p.x - player.position.x;
        const dy = p.y - (player.position.y - (player.height / 2));
        const dz = p.z - player.position.z;

        const r_sq = dx * dx + dz * dz;
        return (Math.abs(dy) < player.height / 2) && (r_sq < player.radius * player.radius);
    }
}