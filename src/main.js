import './style/style.css'
import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import { World } from './world';
//renderen setup
/*

Pour comprendre la 3D sur un écran, imagine que tu es le réalisateur d'un film de cinéma. Pour faire ton film, tu as besoin de 4 éléments essentiels :

Un studio (le décor où tout se passe).

Des acteurs ou des objets (le cube).

Une caméra pour film la scène.

Un projecteur pour afficher le résultat sur l'écran du cinéma.
 */
const renderer = new THREE.WebGLRenderer(); //Tu crées ton projecteur.
renderer.setPixelRatio(window.devicePixelRatio); //Permet d'éviter que le rendu soit flou sur les écrans de haute qualité (comme les écrans Retina ou les téléphones récents).
renderer.setSize(window.innerWidth,window.innerHeight); //Tu dis au projecteur de prendre toute la largeur (innerWidth) et toute la hauteur (innerHeight) de la fenêtre du navigateur.
renderer.setClearColor(0x80a0e0)
document.body.appendChild(renderer.domElement) //Le projecteur génère une sorte de toile invisible (un élément HTML appelé <canvas>). Cette ligne l'ajoute physiquement dans ta page web pour que tu puisses voir l'image.

//Camera setup
const camera = new THREE.PerspectiveCamera(75,window.innerWidth / window.innerHeight) //Tu crées une caméra avec une perspective humaine (les objets au loin paraissent plus petits). Le 75 est le champ de vision (comme un zoom ou un grand angle). Le calcul d'après sert juste à ce que l'image ne soit pas déformée/étirée.


camera.position.set(-32,16,-32) //: Par défaut, tout le monde est créé au point de départ $(0,0,0)$. Si la caméra et le cube sont au même endroit, tu ne verras rien ! Donc ici, on recule et on monte la caméra à la position $X=2, Y=2, Z=2$ pour regarder le centre de plus haut et de côté.

const controls = new OrbitControls(camera,renderer.domElement)
controls.target.set(16,0,16);
controls.update()
//Scene Setup
const scene = new THREE.Scene() //C'est ton studio de tournage vide. C'est l'espace 3D où tu vas tout jeter dedans.
const world = new World(32)
world.generate()
scene.add(world)

// camera.lookAt(0,0,0) //Tu tournes physiquement la caméra pour qu'elle pointe directement vers le centre du cube.
//set up light
function setupLight(){
  const light1 =  new THREE.DirectionalLight()
  light1.position.set(1,1,1)
  scene.add(light1)
  const light2 =  new THREE.DirectionalLight()
  light2.position.set(-1,1,-0.5)
  scene.add(light2)
  const ambient = new THREE.AmbientLight()
  ambient.intensity=0.1
  scene.add(ambient)
}


//Render Loop
function animate(){
  requestAnimationFrame(animate) //C'est une fonction spéciale du navigateur. Elle dit : "Dès que l'écran est prêt à afficher une nouvelle image, relance la fonction animate". C'est ce qui crée la boucle infinie.
  // cube.rotation.x += 0.01
  // cube.rotation.y += 0.01
   //À chaque image, on tourne un tout petit peu le cube sur son axe X et son axe Y. C'est ça qui crée le mouvement de rotation !
  renderer.render(scene,camera); //C'est le bouton "Déclencher la photo". À chaque image, le projecteur regarde la scene à travers les yeux de la camera et dessine le résultat sur ton écran.
}

// window.addEventListener('resize',()=>{
//   camera.aspect = window.innerwidth / window.innerHeight;
//   camera.updateProjectionMatrix();
//   renderer.setSize(window.innerWidth,window.innerHeight)

// })
setupLight()

animate();
