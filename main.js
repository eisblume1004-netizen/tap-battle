import * as THREE from "three";

// =====================================================
// Scene
// =====================================================

const scene = new THREE.Scene();

// =====================================================
// 背景画像
// =====================================================

const backgroundLoader = new THREE.TextureLoader();

backgroundLoader.load(
    "./images/background1.png",

    (texture) => {

        scene.background = texture;

        console.log("背景画像の読み込み成功！");
    },

    undefined,

    (error) => {

        console.error(
            "背景画像の読み込み失敗",
            error
        );
    }
);
// =====================================================
// Camera
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
// Renderer
// =====================================================
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// =====================================================
// Light
// =====================================================
scene.add(new THREE.AmbientLight(0xffffff, 2));

const light = new THREE.DirectionalLight(0xffffff, 2);
light.position.set(5, 8, 5);
scene.add(light);

// =====================================================
// Game変数
// =====================================================
let clickCount = 0;
let timeLeft = 20;

let gameStarted = false;
let gameFinished = false;
let isCountingDown = false;
let countdown = 3;

let ballScale = 1;

let isLaunching = false;
let isExplosion = false;
let isShake = false;
let bossFlying = false;
let showStar = false;
let gameClear = false;

let bossTargetX = 0;
let bossTargetY = 0;
let bossTargetZ = 0;

// =====================================================
// ラスボス吹っ飛び用
// =====================================================

// 吹っ飛びアニメーションの進み具合
let bossFlyProgress = 0;

// 吹っ飛ぶ前の位置
const bossFlyStartPosition = new THREE.Vector3();

// 吹っ飛んだあとの目標位置
const bossFlyTargetPosition = new THREE.Vector3();

// 吹っ飛ぶ前の大きさ
let bossStartScale = 1;
// =====================================================
// UI
// =====================================================
const timeText = document.getElementById("time");
const countText = document.getElementById("count");
const messageText = document.getElementById("message");

function showMessage(text) {
    messageText.textContent = text;
    messageText.style.display = "block";
}

function hideMessage() {
    messageText.textContent = "";
    messageText.style.display = "none";
}

// =====================================================
// 元気玉
// =====================================================
const ballGeometry = new THREE.SphereGeometry(0.15, 64, 64);

const ballMaterial = new THREE.MeshStandardMaterial({
    color: 0x44ff44,
    emissive: 0x44ff44,
    emissiveIntensity: 2
});

const spiritBall = new THREE.Mesh(ballGeometry, ballMaterial);
spiritBall.position.set(0, -1.0, 2);
scene.add(spiritBall);

// =====================================================
// ラスボス画像
// =====================================================

const bossTextureLoader = new THREE.TextureLoader();

const bossTexture = bossTextureLoader.load(
    "./images/mon1.png",

    (texture) => {

        // 元画像の縦横比を取得
        const imageWidth = texture.image.width;
        const imageHeight = texture.image.height;
        const aspect = imageWidth / imageHeight;

        // 高さを基準にして、横幅を自動計算
        const bossHeight = 4.6;
        const bossWidth = bossHeight * aspect;

        boss.scale.set(
            bossWidth,
            bossHeight,
            1
        );

        console.log("ボス画像の比率調整完了");
    }
);

const bossMaterial = new THREE.SpriteMaterial({
    map: bossTexture,
    transparent: true
});

const boss = new THREE.Sprite(bossMaterial);

// 足元を基準にする
boss.center.set(0.5, 0);

// 地面付近に配置
boss.position.set(
    0,
    -1.55,
    -2.5
);
// ボスが通常時に浮く基準位置
const bossBasePosition = boss.position.clone();
scene.add(boss);

/// =====================================================
// 爆発の中心光
// =====================================================
const explosionGeometry = new THREE.SphereGeometry(0.7, 32, 32);

const explosionMaterial = new THREE.MeshBasicMaterial({
    color: 0xffaa00,
    transparent: true,
    opacity: 0
});

const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
explosion.visible = false;
scene.add(explosion);

// =====================================================
// 爆発パーティクル
// =====================================================
const explosionParticles = [];

const explosionColors = [
    0xff2200,
    0xff6600,
    0xffaa00,
    0xffff00
];

for (let i = 0; i < 80; i++) {

    const size = 0.08 + Math.random() * 0.18;

    const geometry = new THREE.SphereGeometry(size, 12, 12);

    const material = new THREE.MeshBasicMaterial({
        color: explosionColors[
            Math.floor(Math.random() * explosionColors.length)
        ],
        transparent: true,
        opacity: 1
    });

    const particle = new THREE.Mesh(geometry, material);

    particle.visible = false;

    particle.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.45,
        (Math.random() - 0.5) * 0.45,
        (Math.random() - 0.5) * 0.45
    );

    scene.add(particle);
    explosionParticles.push(particle);
}

// =====================================================
// 星
// =====================================================
const starGeometry = new THREE.SphereGeometry(0.2, 16, 16);

const starMaterial = new THREE.MeshBasicMaterial({
    color: 0xffff66
});

const star = new THREE.Mesh(starGeometry, starMaterial);
star.visible = false;
scene.add(star);

// =====================================================
// 紙吹雪
// =====================================================
const confettiPieces = [];
let confettiStarted = false;
const confettiCount = 80;

function createConfetti() {

    for (let i = 0; i < confettiCount; i++) {

        const geometry = new THREE.BoxGeometry(0.08, 0.08, 0.02);

        const material = new THREE.MeshBasicMaterial({
            color: new THREE.Color(
                Math.random(),
                Math.random(),
                Math.random()
            )
        });

        const piece = new THREE.Mesh(geometry, material);

        piece.position.set(
            (Math.random() - 0.5) * 8,
            5 + Math.random() * 4,
            -2 + Math.random() * 4
        );

        piece.userData = {
            fallSpeed: 0.02 + Math.random() * 0.04,
            spinX: Math.random() * 0.08,
            spinY: Math.random() * 0.08,
            spinZ: Math.random() * 0.08
        };

        piece.visible = false;
        scene.add(piece);
        confettiPieces.push(piece);
    }
}

createConfetti();

// =====================================================
// Enter処理
// =====================================================
window.addEventListener("keydown", (event) => {

    if (event.code !== "Enter") return;
    if (gameFinished) return;

    if (!gameStarted && !isCountingDown) {
        startCountdown();
        return;
    }

    if (isCountingDown) return;

    if (gameStarted) {
        tapPower();
    }
});

// =====================================================
// カウントダウン
// =====================================================
function startCountdown() {

    isCountingDown = true;
    countdown = 3;

    showMessage("READY");

    setTimeout(() => {

        showMessage(countdown);

        const countdownTimer = setInterval(() => {

            countdown--;

            if (countdown > 0) {
                showMessage(countdown);
            } else {
                clearInterval(countdownTimer);

                showMessage("START!!");

                setTimeout(() => {
                    hideMessage();
                    startGame();
                }, 700);
            }

        }, 1000);

    }, 800);
}

// =====================================================
// ゲーム開始
// =====================================================
function startGame() {

    gameStarted = true;
    isCountingDown = false;

    timeLeft = 20;
    timeText.textContent = timeLeft;

    const timer = setInterval(() => {

        timeLeft--;
        timeText.textContent = timeLeft;

        if (timeLeft <= 0) {
            clearInterval(timer);
            finishGame();
        }

    }, 1000);
}

// =====================================================
// 連打
// 小さい子でも少ない連打で変化を感じられる設定
// =====================================================

function tapPower() {

    // 連打数を増やす
    clickCount++;

    // 画面の連打数を更新
    countText.textContent = clickCount;

    // -------------------------------------------------
    // 元気玉の大きさ
    // -------------------------------------------------
    // 1回につき0.08ずつ大きくする
    // 最大4.2倍まで
    ballScale = Math.min(
        1 + clickCount * 0.08,
        4.2
    );

    spiritBall.scale.set(
        ballScale,
        ballScale,
        ballScale
    );

    // -------------------------------------------------
    // 元気玉の光
    // -------------------------------------------------
    // 少ない連打でも光が強くなる
    ballMaterial.emissiveIntensity = Math.min(
        2 + clickCount * 0.08,
        6
    );
}
// =====================================================
// TIME UP
// =====================================================
function finishGame() {

    gameFinished = true;
    gameStarted = false;

    showMessage("TIME UP!!");

    setTimeout(() => {
        hideMessage();
        isLaunching = true;
    }, 1000);
}
// =====================================================
// 元気玉発射
// =====================================================

function updateLaunch() {

    // 発射中でなければ何もしない
    if (!isLaunching) return;

    // 元気玉を敵に向かって飛ばす
    spiritBall.position.y += 0.025;
    spiritBall.position.z -= 0.18;

    // 敵に命中したか確認
    if (spiritBall.position.z <= boss.position.z + 1) {

        // 発射終了
        isLaunching = false;

        // 元気玉の位置を敵の手前に固定
        spiritBall.position.z = boss.position.z + 1;

        console.log("元気玉が命中！");

        // 爆発開始
        isExplosion = true;
    }
}
// =====================================================
// 爆発
// =====================================================
let explosionStarted = false;
let explosionStartTime = 0;

function updateExplosion() {

    if (!isExplosion) return;

    if (!explosionStarted) {

        explosionStarted = true;
        explosionStartTime = performance.now();

        spiritBall.visible = false;

        explosion.visible = true;
        explosion.position.copy(spiritBall.position);
        explosion.scale.set(0.8, 0.8, 0.8);
        explosionMaterial.opacity = 1;

        for (const particle of explosionParticles) {

            particle.position.copy(spiritBall.position);
            particle.visible = true;
            particle.material.opacity = 1;
            particle.scale.set(1, 1, 1);

            particle.userData.velocity.set(
                (Math.random() - 0.5) * 0.55,
                (Math.random() - 0.5) * 0.55,
                (Math.random() - 0.5) * 0.55
            );
        }

        console.log("ドカーン！！");

        isShake = true;
    }

    explosion.scale.multiplyScalar(1.18);
    explosionMaterial.opacity -= 0.08;

    for (const particle of explosionParticles) {

        particle.position.add(particle.userData.velocity);
        particle.userData.velocity.multiplyScalar(0.96);

        particle.scale.multiplyScalar(0.97);
        particle.material.opacity -= 0.018;
    }

    if (performance.now() - explosionStartTime > 1000) {

        isExplosion = false;
        explosionStarted = false;
        explosion.visible = false;

        for (const particle of explosionParticles) {
            particle.visible = false;
        }

        startBossFly();
    }
}

// =====================================================
// 画面揺れ
// =====================================================
let shakeStartTime = 0;
let shakeStarted = false;
const shakeDuration = 600;
const shakePower = 0.18;

function updateCameraShake() {

    if (!isShake) return;

    if (!shakeStarted) {
        shakeStarted = true;
        shakeStartTime = performance.now();
    }

    camera.position.x = (Math.random() - 0.5) * shakePower;
    camera.position.y = 1.8 + (Math.random() - 0.5) * shakePower;

    if (performance.now() - shakeStartTime >= shakeDuration) {

        isShake = false;
        shakeStarted = false;

        camera.position.set(0, 1.8, 8);
        camera.lookAt(0, 0, -4);
    }
}

// =====================================================
// ラスボス吹っ飛び開始
// 元気玉の大きさに応じて飛距離を細かく変える
// =====================================================

function startBossFly() {

    // 二重実行を防止
    if (bossFlying) return;

    bossFlying = true;

    // 吹っ飛びアニメーションを最初に戻す
    bossFlyProgress = 0;

    // 現在の位置を保存
    bossFlyStartPosition.copy(boss.position);

    // 現在の大きさを保存
    bossStartScale = boss.scale.x;

    // -------------------------------------------------
    // 元気玉の大きさによる飛距離
    // -------------------------------------------------

    let flyDistance;

    if (ballScale < 1.4) {

        // 0〜4回程度
        flyDistance = 4;

    } else if (ballScale < 1.8) {

        // 5〜9回程度
        flyDistance = 6;

    } else if (ballScale < 2.2) {

        // 10〜14回程度
        flyDistance = 8;

    } else if (ballScale < 2.6) {

        // 15〜19回程度
        flyDistance = 10;

    } else if (ballScale < 3.0) {

        // 20〜24回程度
        flyDistance = 12;

    } else if (ballScale < 3.4) {

        // 25〜29回程度
        flyDistance = 14;

    } else if (ballScale < 3.8) {

        // 30〜34回程度
        flyDistance = 16;

    } else if (ballScale < 4.2) {

        // 35〜39回程度
        flyDistance = 18;

    } else {

        // 40回以上
        flyDistance = 20;
    }

    // -------------------------------------------------
    // 飛んでいく目標位置
    // -------------------------------------------------

    bossFlyTargetPosition.set(

        // 右方向
        boss.position.x + flyDistance * 0.55,

        // 上方向
        boss.position.y + flyDistance * 0.38,

        // 奥方向
        boss.position.z - flyDistance
    );

    console.log("ラスボス吹っ飛び開始！");
    console.log("連打数：" + clickCount);
    console.log("元気玉サイズ：" + ballScale);
    console.log("飛距離：" + flyDistance);
}

// =====================================================
// ラスボス吹っ飛び
// くるくる回転しながら、斜め上・奥へ飛ぶ
// =====================================================

function updateBossFly() {

    // 吹っ飛び中でなければ何もしない
    if (!bossFlying) return;

    // アニメーションを進める
    bossFlyProgress += 0.012;

    // 0〜1の範囲に収める
    const progress = Math.min(
        bossFlyProgress,
        1
    );

    // 最初は速く、最後はゆっくりになる動き
    const easedProgress =
        1 - Math.pow(1 - progress, 3);

    // -------------------------------------------------
    // 開始位置から目標位置へ移動
    // -------------------------------------------------

    boss.position.lerpVectors(
        bossFlyStartPosition,
        bossFlyTargetPosition,
        easedProgress
    );

    // -------------------------------------------------
    // 少し弧を描いて上へ飛ばす
    // -------------------------------------------------

    const arcHeight =
        Math.sin(progress * Math.PI) * 2;

    boss.position.y += arcHeight;

    // -------------------------------------------------
    // くるくる回転
    // -------------------------------------------------
     // モンスター画像を上下反転しながら回す
       boss.material.rotation = progress * Math.PI * 8;
    // -------------------------------------------------
    // 奥へ行くほど小さくする
    // -------------------------------------------------

    const newScale = THREE.MathUtils.lerp(
        bossStartScale,
        0.08,
        easedProgress
    );

    boss.scale.set(
        newScale,
        newScale,
        newScale
    );

    // -------------------------------------------------
    // 吹っ飛び終了
    // -------------------------------------------------

    if (progress >= 1) {

        bossFlying = false;

        // 星キラーン演出へ
        startStarEffect();

        console.log("ラスボス吹っ飛び終了！");
    }
}
// =====================================================
// 星キラーン
// =====================================================
let starStarted = false;
let starStartTime = 0;
const starDuration = 900;

function startStarEffect() {

    showStar = true;

    star.position.copy(boss.position);
    star.scale.set(1, 1, 1);
    star.visible = true;

    boss.visible = false;

    console.log("星キラーン開始！");
}

function updateStar() {

    if (!showStar) return;

    if (!starStarted) {
        starStarted = true;
        starStartTime = performance.now();
    }

    star.rotation.x += 0.18;
    star.rotation.y += 0.22;
    star.rotation.z += 0.25;

    star.scale.x += 0.02;
    star.scale.y += 0.02;
    star.scale.z += 0.02;

    if (performance.now() - starStartTime >= starDuration) {

        showStar = false;
        star.visible = false;
        starStarted = false;

        showGameClear();
    }
}

// =====================================================
// GAME CLEAR
// =====================================================
let gameClearStarted = false;

function showGameClear() {

    if (gameClearStarted) return;

    gameClearStarted = true;
    gameClear = true;

    showMessage("GAME CLEAR!!");
    startConfetti();

    console.log("GAME CLEAR!!");
}

function updateGameClear() {

    if (!gameClear) return;

    const pulse = 1 + Math.sin(performance.now() * 0.006) * 0.08;

    messageText.style.transform =
        `translate(-50%, -50%) scale(${pulse})`;
}

// =====================================================
// 紙吹雪
// =====================================================
function startConfetti() {

    if (confettiStarted) return;

    confettiStarted = true;

    for (const piece of confettiPieces) {
        piece.visible = true;
    }
}

function updateConfetti() {

    if (!confettiStarted) return;

    for (const piece of confettiPieces) {

        piece.position.y -= piece.userData.fallSpeed;

        piece.rotation.x += piece.userData.spinX;
        piece.rotation.y += piece.userData.spinY;
        piece.rotation.z += piece.userData.spinZ;

        if (piece.position.y < -3) {

            piece.position.y = 5 + Math.random() * 3;
            piece.position.x = (Math.random() - 0.5) * 8;
            piece.position.z = -2 + Math.random() * 4;
        }
    }
}

// =====================================================
// 通常アニメーション
// =====================================================
function updateSpiritBall() {

    spiritBall.rotation.y += 0.01;
    spiritBall.rotation.x += 0.005;
}

// =====================================================
// ボスの通常飛行アニメーション
// 上下にふわふわしながら、少し左右に動く
// =====================================================

function updateBossIdle() {

    // 吹っ飛び中や消えた後は動かさない
    if (
        bossFlying ||
        isExplosion ||
        showStar ||
        gameClear ||
        !boss.visible
    ) {
        return;
    }

    // 経過時間
    const time = performance.now() * 0.001;

    // 上下にふわふわ
    boss.position.y =
        bossBasePosition.y +
        Math.sin(time * 2.2) * 0.35;

    // 少し左右にも揺れる
    boss.position.x =
        bossBasePosition.x +
        Math.sin(time * 1.3) * 0.18;

    // 左右に少し傾ける
    boss.material.rotation =
    Math.sin(time * 2.2) * 0.08;
}
// =====================================================
// Resize
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
// Animate
// =====================================================
function animate() {

    requestAnimationFrame(animate);

    updateSpiritBall();
    updateBossIdle();
    updateLaunch();

    // 爆発
    updateExplosion();

    updateCameraShake();
    updateBossFly();
    updateStar();
    updateGameClear();
    updateConfetti();

    renderer.render(scene, camera);
}
// =====================================================
// Start
// =====================================================
animate();
