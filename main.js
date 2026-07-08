import * as THREE from "three";

// =====================================================
// Scene（ゲーム空間）
// =====================================================

const scene = new THREE.Scene();

// 仮背景（後でジャングル画像に変更）
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

// カメラ位置
camera.position.set(0, 1.8, 8);

// カメラが見る方向
camera.lookAt(0, 0, -4);

// =====================================================
// Renderer（描画）
// =====================================================

const renderer = new THREE.WebGLRenderer({
    antialias: true
});

renderer.setSize(window.innerWidth, window.innerHeight);

document.body.appendChild(renderer.domElement);

// =====================================================
// Light（ライト）
// =====================================================

// 全体を明るくするライト
scene.add(new THREE.AmbientLight(0xffffff, 2));

// 太陽みたいなライト
const light = new THREE.DirectionalLight(0xffffff, 2);

light.position.set(5, 8, 5);

scene.add(light);
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

// 元気玉の大きさ
let ballScale = 1;

// ---------- アニメーション ----------

// 元気玉を飛ばす
let isLaunching = false;

// 命中演出
let isImpact = false;

// ラスボスが吹っ飛ぶ
let bossFlying = false;

// GAME CLEAR表示
let gameClear = false;

// ラスボスの飛ぶ距離
let bossTargetX = 0;

// 命中した時間
let impactStartTime = 0;

// 画面揺れ時間
const impactDuration = 300;
// =====================================================
// UI取得
// =====================================================

// index.htmlのtime
const timeText = document.getElementById("time");

// index.htmlのcount
const countText = document.getElementById("count");

// =====================================================
// 元気玉
// =====================================================

// 球体
const ballGeometry = new THREE.SphereGeometry(
    0.15,
    64,
    64
);

// 材質
const ballMaterial = new THREE.MeshStandardMaterial({

    color: 0x44ff44,

    emissive: 0x44ff44,

    emissiveIntensity: 2

});

// 元気玉生成
const spiritBall = new THREE.Mesh(
    ballGeometry,
    ballMaterial
);

// 位置
spiritBall.position.set(
    0,
    -1.0,
    2
);

scene.add(spiritBall);
// =====================================================
// ラスボス（仮）
// =====================================================

const bossGeometry = new THREE.BoxGeometry(
    2,
    3,
    2
);

const bossMaterial = new THREE.MeshStandardMaterial({

    color: 0xaa2222

});

const boss = new THREE.Mesh(
    bossGeometry,
    bossMaterial
);

// 奥に配置
boss.position.set(
    0,
    0,
    -4
);

scene.add(boss);
// =====================================================
// Enterキー（連打処理）
// =====================================================

window.addEventListener("keydown", (event) => {

    // Enterキー以外は何もしない
    if (event.code !== "Enter") return;

    // ゲーム終了後は連打できない
    if (gameFinished) return;

    // 最初のEnterでゲーム開始
    if (!gameStarted) {
        startGame();
    }

    // -----------------------------
    // 連打数を増やす
    // -----------------------------

    clickCount++;

    // 画面表示を更新
    countText.textContent = clickCount;

    // -----------------------------
    // 元気玉を少し大きくする
    // -----------------------------

    ballScale += 0.03;

    spiritBall.scale.set(
        ballScale,
        ballScale,
        ballScale
    );

});

// =====================================================
// タイマー開始
// =====================================================

function startGame() {

    // 二重スタート防止
    gameStarted = true;

    // 残り時間を表示
    timeText.textContent = timeLeft;

    // 1秒ごとに実行
    const timer = setInterval(() => {

        timeLeft--;

        // 画面更新
        timeText.textContent = timeLeft;

        // 時間切れ
        if (timeLeft <= 0) {

            clearInterval(timer);

            gameFinished = true;

            finishGame();

        }

    }, 1000);

}

// =====================================================
// ゲーム終了
// =====================================================

function finishGame() {

    console.log("==========");
    console.log("TIME UP!");
    // 元気玉発射開始
    isLaunching = true;
    console.log("連打数：" + clickCount);
    console.log("==========");

    // 次にここへ
    // ・元気玉発射
    // ・敵に命中
    // ・敵を吹っ飛ばす
    // ・GAME CLEAR
    // を追加していきます。

}
// =====================================================
// 画面サイズ変更
// =====================================================

window.addEventListener("resize", () => {

    camera.aspect = window.innerWidth / window.innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );

});
// =====================================================
// アニメーション
// =====================================================

function animate() {

    // 次のフレームを描画
    requestAnimationFrame(animate);

    // -----------------------------
    // 元気玉
    // -----------------------------

    // ゆっくり回転
    spiritBall.rotation.y += 0.01;

    // -----------------------------
    // 今後追加する処理
    // -----------------------------

    // 元気玉を飛ばす
    if (isLaunching) {

    // 敵へ向かって進む
    spiritBall.position.z -= 0.15;

    // 敵に到達した？
    if (spiritBall.position.z <= boss.position.z + 1) {

    isLaunching = false;

    // 命中演出開始
    isImpact = true;

    // 今の時間を保存
    impactStartTime = performance.now();

}  
        
}
// =====================================================
// 命中演出
// =====================================================

if (isImpact) {

    // 画面を揺らす
    camera.position.x = Math.random() * 0.1 - 0.05;
    camera.position.y = 1.8 + Math.random() * 0.1 - 0.05;

    // 0.3秒経過した？
    if (performance.now() - impactStartTime > impactDuration) {

        // カメラを元に戻す
        camera.position.set(0, 1.8, 8);
        camera.lookAt(0, 0, -4);

        isImpact = false;

        bossFlying = true;

        // 連打数で飛距離決定
        bossTargetX = clickCount * 0.08;

    }

}

    
    // ラスボスを吹っ飛ばす
    if (bossFlying) {

    if (boss.position.x < bossTargetX) {

     boss.position.x += 0.12;
     boss.position.y += 0.05;

     boss.rotation.x += 0.15;
     boss.rotation.y += 0.15;
     boss.rotation.z += 0.15;
    }

}

    // パーティクル

    // -----------------------------
    // 描画
    // -----------------------------

    renderer.render(scene, camera);

}

// ゲーム開始
animate();
