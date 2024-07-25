import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js';
import TWEEN from '@tweenjs/tween.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x444444);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);

// Add VR and AR buttons
const sessionInit = { requiredFeatures: ['hand-tracking'] };
document.body.appendChild(VRButton.createButton(renderer, sessionInit));
document.body.appendChild(ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] }));

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.update();

// Lighting
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 10, 7.5);
scene.add(light);

// Model loading
const loader = new GLTFLoader();
let house, man, door;
let modelsLoaded = 0;

function onModelLoaded() {
    modelsLoaded++;
    if (modelsLoaded === 2) {
        animate();
    }
}

loader.load('old_house.glb', function (gltf) {
    house = gltf.scene;
    house.traverse(function (child) {
        if (child.name === 'Door') {
            door = child;
        }
    });
    scene.add(house);
    onModelLoaded();
});

loader.load('walkcoat1.glb', function (gltf) {
    man = gltf.scene;
    man.position.set(0, 0, -5);
    man.scale.set(90, 90, 90);
    scene.add(man);
    onModelLoaded();
});

// Movement
const manSpeed = 0.1;
const houseBox = new THREE.Box3();
const manBox = new THREE.Box3();

function moveMan(direction) {
    const previousPosition = man.position.clone();
    switch (direction) {
        case 'forward':
            man.position.z += manSpeed;
            break;
        case 'backward':
            man.position.z -= manSpeed;
            break;
        case 'left':
            man.position.x -= manSpeed;
            break;
        case 'right':
            man.position.x += manSpeed;
            break;
    }
    checkCollision(previousPosition);
    updateCameraPosition();
}

function checkCollision(previousPosition) {
    houseBox.setFromObject(house);
    manBox.setFromObject(man);
    if (houseBox.intersectsBox(manBox)) {
        man.position.copy(previousPosition);
    }
}

function updateCameraPosition() {
    const offset = new THREE.Vector3(0, 1.6, 5);
    camera.position.copy(man.position).add(offset);
    camera.lookAt(man.position);
}

// Keyboard controls
document.addEventListener('keydown', function (event) {
    if (!man) return;
    switch (event.key) {
        case 'w':
            moveMan('forward');
            break;
        case 's':
            moveMan('backward');
            break;
        case 'a':
            moveMan('left');
            break;
        case 'd':
            moveMan('right');
            break;
    }
});

// Door animation
function openDoor() {
    if (!door) return;
    const openDoorTween = new TWEEN.Tween(door.rotation)
        .to({ y: Math.PI / 2 }, 1000)
        .start();
}

function checkProximity() {
    if (!man || !door) return;
    const distance = man.position.distanceTo(door.position);
    if (distance < 2) {
        openDoor();
    }
}

// VR Controllers and Hands
let controller1, controller2;
let controllerGrip1, controllerGrip2;
let hand1, hand2;

controller1 = renderer.xr.getController(0);
scene.add(controller1);

controller2 = renderer.xr.getController(1);
scene.add(controller2);

const controllerModelFactory = new XRControllerModelFactory();
const handModelFactory = new XRHandModelFactory();

controllerGrip1 = renderer.xr.getControllerGrip(0);
controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
scene.add(controllerGrip1);

hand1 = renderer.xr.getHand(0);
hand1.add(handModelFactory.createHandModel(hand1));
scene.add(hand1);

controllerGrip2 = renderer.xr.getControllerGrip(1);
controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
scene.add(controllerGrip2);

hand2 = renderer.xr.getHand(1);
hand2.add(handModelFactory.createHandModel(hand2));
scene.add(hand2);

const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1)
]);

const line = new THREE.Line(geometry);
line.name = 'line';
line.scale.z = 5;

controller1.add(line.clone());
controller2.add(line.clone());

// Handle window resize
window.addEventListener('resize', onWindowResize);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Animation loop
function animate() {
    renderer.setAnimationLoop(() => {
        checkProximity();
        TWEEN.update();
        controls.update();
        renderer.render(scene, camera);
    });
}

renderer.render(scene, camera);
