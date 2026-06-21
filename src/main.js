import './style.css'
import * as THREE from "three";

//renderen setup

const renderer = new THREE.WebGLRenderer();
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth,window.innerHeight);
document.body.appendChild(renderer.domElement)

//Camera setup
const camera = new THREE.PerspectiveCamera(75,window.innerWidth)
