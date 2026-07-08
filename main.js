import * as THREE from "three";

// ----------------------
// Scene
// ----------------------

const scene = new THREE.Scene();

// 背景画像
const loader = new THREE.TextureLoader();

loader.load("./images/background.png", (texture)=>{
    scene.background = texture;
});

// ----------------------
// Camera
// ----------------------

const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth/window.innerHeight,
    0.1,
    100
);

camera.position.set(0,1.5,8);

// ----------------------
// Renderer
// ----------------------

const renderer = new THREE.WebGLRenderer({
    antialias:true
});

renderer.setSize(window.innerWidth,window.innerHeight);

document.body.appendChild(renderer.domElement);

// ----------------------
// Light
// ----------------------

scene.add(new THREE.AmbientLight(0xffffff,2));

const light = new THREE.DirectionalLight(0xffffff,2);

light.position.set(5,8,5);

scene.add(light);

// ----------------------
// 元気玉
// ----------------------

const ballGeometry = new THREE.SphereGeometry(0.8,64,64);

const ballMaterial = new THREE.MeshStandardMaterial({

    color:0x44ff44,

    emissive:0x44ff44,

    emissiveIntensity:2

});

const spiritBall = new THREE.Mesh(ballGeometry,ballMaterial);

spiritBall.position.set(0,1.5,2);

scene.add(spiritBall);

// ----------------------
// ラスボス（仮）
// ----------------------

const bossGeometry = new THREE.BoxGeometry(2,3,2);

const bossMaterial = new THREE.MeshStandardMaterial({

    color:0xaa2222

});

const boss = new THREE.Mesh(bossGeometry,bossMaterial);

boss.position.set(0,1.5,-8);

scene.add(boss);

// ----------------------
// Enterキー
// ----------------------

let scale = 1;

window.addEventListener("keydown",(event)=>{

    if(event.code==="Enter"){

        scale += 0.03;

        spiritBall.scale.set(scale,scale,scale);

    }

});

// ----------------------
// Resize
// ----------------------

window.addEventListener("resize",()=>{

    camera.aspect=window.innerWidth/window.innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth,window.innerHeight);

});

// ----------------------
// Animate
// ----------------------

function animate(){

    requestAnimationFrame(animate);

    spiritBall.rotation.y += 0.01;

    renderer.render(scene,camera);

}

animate();
