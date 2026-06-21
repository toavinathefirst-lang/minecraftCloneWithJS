import './style.css'
import * as THREE from "three";

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
document.body.appendChild(renderer.domElement) //Le projecteur génère une sorte de toile invisible (un élément HTML appelé <canvas>). Cette ligne l'ajoute physiquement dans ta page web pour que tu puisses voir l'image.

//Camera setup
const camera = new THREE.PerspectiveCamera(75,window.innerWidth / window.innerHeight) //Tu crées une caméra avec une perspective humaine (les objets au loin paraissent plus petits). Le 75 est le champ de vision (comme un zoom ou un grand angle). Le calcul d'après sert juste à ce que l'image ne soit pas déformée/étirée.


camera.position.set(2,2,2) //: Par défaut, tout le monde est créé au point de départ $(0,0,0)$. Si la caméra et le cube sont au même endroit, tu ne verras rien ! Donc ici, on recule et on monte la caméra à la position $X=2, Y=2, Z=2$ pour regarder le centre de plus haut et de côté.


//Scene Setup
const scene = new THREE.Scene() //C'est ton studio de tournage vide. C'est l'espace 3D où tu vas tout jeter dedans.

const geometry = new THREE.BoxGeometry();//C'est le squelette. Tu dis : "Je veux la forme d'une boîte (un cube)".
const material = new THREE.MeshBasicMaterial({color:0x00d000}) //C'est la peinture qu'on va mettre dessus. 0x00d000 est un code couleur (Hexadécimal) pour du vert. "Basic" signifie qu'il ne réagit pas aux lumières, il est juste coloré uniformément.
const cube = new THREE.Mesh(geometry,material) //Tu associes le squelette (la forme) et la peinture. Ton cube est enfin créé !
camera.lookAt(cube.position) //Tu tournes physiquement la caméra pour qu'elle pointe directement vers le centre du cube.
scene.add(cube) //Très important ! Tu déposes le cube dans ton studio (la scène). Si tu oublies cette ligne, le cube existe dans la mémoire de l'ordinateur, mais il n'est pas dans le décor.

//Render Loop
function animate(){
  requestAnimationFrame(animate) //C'est une fonction spéciale du navigateur. Elle dit : "Dès que l'écran est prêt à afficher une nouvelle image, relance la fonction animate". C'est ce qui crée la boucle infinie.
  cube.rotation.x += 0.01
  cube.rotation.y += 0.01
   //À chaque image, on tourne un tout petit peu le cube sur son axe X et son axe Y. C'est ça qui crée le mouvement de rotation !
  renderer.render(scene,camera); //C'est le bouton "Déclencher la photo". À chaque image, le projecteur regarde la scene à travers les yeux de la camera et dessine le résultat sur ton écran.
}

animate();