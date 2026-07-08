import * as THREE from "three";

// =====================================================
// Scene（ゲーム空間）
// =====================================================

const scene = new THREE.Scene();

// 仮背景（あとでジャングル画像へ変更）
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

// カメラが見る位置
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

scene.add(new THREE.AmbientLight(0xffffff, 2));

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

// ゲーム状態
let gameStarted = false;
let gameFinished = false;

// 元気玉
let ballScale = 1;
let isLaunching = false;

// 命中演出
let isImpact = false;
let impactStartTime = 0;
const impactDuration = 300;

// ラスボス
let bossFlying = false;

// 飛ぶ目標位置
let bossTargetX = 0;
let bossTargetY = 0;
let bossTargetZ = 0;

// =====================================================
// UI取得
// =====================================================

const timeText = document.getElementById("time");
const countText = document.getElementById("count");

// =====================================================
// 元気玉
// =====================================================

const ballGeometry = new THREE.SphereGeometry(
    0.15,
    64,
    64
);

const ballMaterial = new THREE.MeshStandardMaterial({
    color: 0x44ff44,
    emissive: 0x44ff44,
    emissiveIntensity: 2
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

// 少し奥に配置
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

    // Enterキー以外は無視
    if (event.code !== "Enter") return;

    // ゲーム終了後は連打できない
    if (gameFinished) return;

    // 最初のEnterでゲーム開始
    if (!gameStarted) {
        startGame();
    }

    // -----------------------------
    // 連打数
    // -----------------------------

    clickCount++;

    // UI更新
    countText.textContent = clickCount;

    // -----------------------------
    // 元気玉を大きくする
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

    gameStarted = true;

    timeText.textContent = timeLeft;

    const timer = setInterval(() => {

        timeLeft--;

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
    console.log("連打数：" + clickCount);
    console.log("==========");

    // 元気玉発射開始
    isLaunching = true;

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

    requestAnimationFrame(animate);

    // -------------------------------------------------
    // 元気玉（回転）
    // -------------------------------------------------

    spiritBall.rotation.y += 0.01;

    // -------------------------------------------------
    // 元気玉発射
    // -------------------------------------------------

    if (isLaunching) {

        // 敵へ向かって飛ぶ
        spiritBall.position.z -= 0.18;

        // 敵に当たった？
        if (spiritBall.position.z <= boss.position.z + 1) {

            isLaunching = false;

            // 命中演出開始
            isImpact = true;

            impactStartTime = performance.now();

        }

    }

    // -------------------------------------------------
    // 命中演出（画面を揺らす）
    // -------------------------------------------------

    if (isImpact) {

        // カメラをブルブル揺らす
        camera.position.x = Math.random() * 0.12 - 0.06;
        camera.position.y = 1.8 + Math.random() * 0.12 - 0.06;

        // 0.3秒経過した？
        if (performance.now() - impactStartTime > impactDuration) {

            // カメラを元に戻す
            camera.position.set(0, 1.8, 8);
            camera.lookAt(0, 0, -4);

            isImpact = false;

            // ラスボス吹っ飛び開始
            bossFlying = true;

            // 飛ぶゴール
            bossTargetX = clickCount * 0.08;
            bossTargetY = 8;
            bossTargetZ = -20;

        }

    }

    // -------------------------------------------------
    // ラスボス吹っ飛び
    // （ばいきんまん風）
    // -------------------------------------------------

    if (bossFlying) {

        // 斜め上へ
        if (boss.position.x < bossTargetX) {
            boss.position.x += 0.12;
        }

        if (boss.position.y < bossTargetY) {
            boss.position.y += 0.08;
        }

        if (boss.position.z > bossTargetZ) {
            boss.position.z -= 0.20;
        }

        // くるくる回転
        boss.rotation.x += 0.20;
        boss.rotation.y += 0.20;
        boss.rotation.z += 0.20;

        // ゴールしたら終了
        if (
            boss.position.x >= bossTargetX &&
            boss.position.y >= bossTargetY &&
            boss.position.z <= bossTargetZ
        ) {

            bossFlying = false;

            console.log("GAME CLEAR!");

        }

    }

    // -------------------------------------------------
    // 描画
    // -------------------------------------------------

    renderer.render(scene, camera);

}

// ゲーム開始
animate();
