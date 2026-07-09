import * as THREE from "three";

// =====================================================
// Scene（ゲーム空間）
// =====================================================

const scene = new THREE.Scene();

// 仮背景（あとで画像に変更）
scene.background = new THREE.Color(0x87ceeb);

// =====================================================
// Camera（カメラ）
// =====================================================

const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100
);

camera.position.set(0, 1.8, 8);
camera.lookAt(0, 0, -4);

// =====================================================
// Renderer（描画）
// =====================================================

const renderer = new THREE.WebGLRenderer({
    antialias: true
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

document.body.appendChild(renderer.domElement);

// =====================================================
// Light（ライト）
// =====================================================

// 環境光
const ambientLight = new THREE.AmbientLight(
    0xffffff,
    2
);
scene.add(ambientLight);

// 平行光
const directionalLight = new THREE.DirectionalLight(
    0xffffff,
    2
);

directionalLight.position.set(
    5,
    8,
    5
);

scene.add(directionalLight);

// =====================================================
// Game（ゲーム変数）
// =====================================================

// 連打数
let clickCount = 0;

// 残り時間
let timeLeft = 20;

// ゲーム開始
let gameStarted = false;

// ゲーム終了
let gameFinished = false;

// カウントダウン中？
let isCountingDown = false;

// カウントダウン数字
let countdown = 3;

// 元気玉
let ballScale = 1;

// 発射中？
let isLaunching = false;

// 爆発
let isExplosion = false;

// 画面揺れ
let isShake = false;

// ボス吹っ飛び
let bossFlying = false;

// GAME CLEAR
let gameClear = false;

// 星になる
let showStar = false;

// ボス飛距離
let bossTargetX = 0;
let bossTargetY = 0;
let bossTargetZ = 0;

// =====================================================
// UI取得
// =====================================================

const timeText = document.getElementById("time");
const countText = document.getElementById("count");
const messageText = document.getElementById("message");

// =====================================================
// 元気玉
// =====================================================

const ballGeometry = new THREE.SphereGeometry(
    0.15,
    64,
    64
);

const ballMaterial = new THREE.MeshStandardMaterial({

    color:0x44ff44,

    emissive:0x44ff44,

    emissiveIntensity:2

});

const spiritBall = new THREE.Mesh(
    ballGeometry,
    ballMaterial
);

spiritBall.position.set(
    0,
    -1.0,
    2
);

scene.add(spiritBall);

// =====================================================
// 爆発エフェクト（最初は見えない）
// =====================================================

const explosionGeometry = new THREE.SphereGeometry(
    0.5,
    32,
    32
);

const explosionMaterial =
new THREE.MeshBasicMaterial({

    color:0xffffff,

    transparent:true,

    opacity:0

});

const explosion = new THREE.Mesh(
    explosionGeometry,
    explosionMaterial
);

explosion.visible = false;

scene.add(explosion);

// =====================================================
// ラスボス（仮）
// =====================================================

const bossGeometry = new THREE.BoxGeometry(
    2,
    3,
    2
);

const bossMaterial =
new THREE.MeshStandardMaterial({

    color:0xaa2222

});

const boss = new THREE.Mesh(
    bossGeometry,
    bossMaterial
);

boss.position.set(
    0,
    0,
    -4
);

scene.add(boss);

// =====================================================
// 星（最後の演出）
// =====================================================

const starGeometry = new THREE.SphereGeometry(
    0.15,
    16,
    16
);

const starMaterial =
new THREE.MeshBasicMaterial({

    color:0xffff66

});

const star = new THREE.Mesh(
    starGeometry,
    starMaterial
);

star.visible = false;

scene.add(star);
