import './style/style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import { World } from './world';

const renderer = new THREE.WebGLRenderer();
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x80a0e0);
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight);
camera.position.set(-32, 16, -32);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(16, 0, 16);
controls.update();

const scene = new THREE.Scene();

const world = new World(32);
world.generate();
scene.add(world);

function setupLight() {
  const light1 = new THREE.DirectionalLight();
  light1.position.set(1, 1, 1);
  scene.add(light1);

  const light2 = new THREE.DirectionalLight();
  light2.position.set(-1, 1, -0.5);
  scene.add(light2);

  const ambient = new THREE.AmbientLight();
  ambient.intensity = 0.1;
  scene.add(ambient);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

setupLight();
animate();