import './style/style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { WorldChunk } from './worldChunk';
import { createUI } from './ui';
import { Player } from './player';
import { Physics } from './physics';
import { World } from './world';

const stats = new Stats()
document.body.append(stats.dom);
const renderer = new THREE.WebGLRenderer();
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x80a0e0);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const orbitCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight);
orbitCamera.position.set(-32, 16, -32);

const controls = new OrbitControls(orbitCamera, renderer.domElement);
controls.target.set(16, 0, 16);
controls.update();

const scene = new THREE.Scene();
const world = new World();
scene.fog=new THREE.Fog(0x80a0e0,50,100)
world.generate();
scene.add(world);
const player = new Player(scene);
const physics = new Physics(scene);
const sun = new THREE.DirectionalLight();
function setupLight() {
  
  sun.position.set(50, 50, 50);
  sun.castShadow=true;

  sun.shadow.camera.left=-50;
  sun.shadow.camera.right=50;
  sun.shadow.camera.bottom=-50;
  sun.shadow.camera.top=50;
  sun.shadow.camera.near=0.1;
  sun.shadow.camera.far=100;

  sun.shadow.bias=-0.0005;
  sun.shadow.mapSize = new THREE.Vector2(512,512)
  scene.add(sun);
  scene.add(sun.targer)

  const shadowHelper = new THREE.CameraHelper(sun.shadow.camera);
  scene.add(shadowHelper)

  const ambient = new THREE.AmbientLight();
  ambient.intensity = 0.1;
  scene.add(ambient);
}
/**
 * 
 * @param {MouseEvent} event 
 */
function onMouseDown(event){
  if(player.controls.isLocked && player.selectedCoords){
    console.log(`removing the block at ${JSON.stringify(player.selectedCoords)}`);
    
    world.removeBlock(
      player.selectedCoords.x,
      player.selectedCoords.y,
      player.selectedCoords.z
    )
  }
}
document.addEventListener('mousedown',onMouseDown);

let previousTime = performance.now();
function animate() {
  let currentTime = performance.now();
  let dt = (currentTime - previousTime) / 1000;
  dt = Math.min(dt, 0.1);

  requestAnimationFrame(animate);

  player.update(world);
  physics.update(dt,player,world);
  world.update(player);

  sun.position.copy(player.position);
  sun.position.sub(new THREE.Vector3(-50,-50,-50));
  sun.target.position.copy(player.position);

  renderer.render(scene, player.controls.isLocked ? player.camera : orbitCamera);
  stats.update();

  previousTime = currentTime;
}
window.addEventListener('resize',()=>{
  orbitCamera.aspect = window.innerWidth / window.innerHeight;
  orbitCamera.updateProjectionMatrix();

  player.camera.aspect = window.innerWidth / window.innerHeight;
  player.camera.updateProjectionMatrix()

  renderer.setSize(window.innerWidth,window.innerHeight)
})

setupLight();
createUI(world,player)
animate();