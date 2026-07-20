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

// 元気玉自身の発光を周囲にも反映させるためのポイントライト
const ballGlowLight = new THREE.PointLight(0xffee00, 4, 8, 2);
scene.add(ballGlowLight);

// =====================================================
// フレームレート非依存の基準値
// =====================================================
// 以下の速度・変化量はすべて「1秒あたり」の量として定義し、
// 毎フレーム deltaSeconds を掛けて適用する。
// これにより端末のリフレッシュレート（60fps/120fpsなど）が
// 違っても同じ速さ・同じ動きで進行する。
const FPS_BASE = 60;

// per-frame（60fps基準）の減衰率を、任意のdeltaSecondsに
// 対応する減衰率へ変換するヘルパー
function decayPerSecond(perFrameFactor, deltaSeconds) {
    return Math.pow(perFrameFactor, deltaSeconds * FPS_BASE);
}

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

let lastFrameTime = performance.now();

let isLaunching = false;
let isExplosion = false;
let isShake = false;
let bossFlying = false;
let showStar = false;
let gameClear = false;

// =====================================================
// ラスボス吹っ飛び用
// =====================================================

// 吹っ飛びアニメーションの進み具合（0〜1）
let bossFlyProgress = 0;

// 吹っ飛びの進行速度（1秒あたり）
const BOSS_FLY_SPEED = 0.012 * FPS_BASE;

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

    // アニメーションを毎回リスタートさせるため、
    // 一度アニメーションを外してから再度付け直す
    messageText.style.animation = "none";
    void messageText.offsetWidth; // 強制リフロー
    messageText.style.animation = "";
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
    color: 0xffee00,
    emissive: 0xffee00,
    // 発光を強化（明るく、より眩しい元気玉に）
    emissiveIntensity: 2,
    toneMapped: false
});

const spiritBall = new THREE.Mesh(ballGeometry, ballMaterial);
spiritBall.position.set(0, -1.0, 2);
scene.add(spiritBall);

// =====================================================
// ラスボス画像
// =====================================================

const bossTextureLoader = new THREE.TextureLoader();

// 敵の表示サイズ（高さ基準）。以前よりさらに大きく迫力のある表示に。
const BOSS_HEIGHT = 7.5;

const bossTexture = bossTextureLoader.load(
    "./images/mon1.png",

    (texture) => {

        // 元画像の縦横比を取得
        const imageWidth = texture.image.width;
        const imageHeight = texture.image.height;
        const aspect = imageWidth / imageHeight;

        // 高さを基準にして、横幅を自動計算
        const bossWidth = BOSS_HEIGHT * aspect;

        boss.scale.set(
            bossWidth,
            BOSS_HEIGHT,
            1
        );

        console.log("ボス画像の比率調整完了");
        //ボス登場演出を開始
        startEnemyIntro();
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
// 最初はボスを隠しておく
boss.visible = false;

// =====================================================
// ボス登場演出
// =====================================================

let enemyIntroStarted = false;
let enemyIntroFinished = false;
let enemyIntroProgress = 0;

// 登場にかかる時間
const ENEMY_INTRO_DURATION = 1.2;

// 登場前と登場後の位置・大きさ
const bossIntroStartPosition = new THREE.Vector3();
const bossIntroTargetPosition = new THREE.Vector3();
const bossIntroTargetScale = new THREE.Vector3();
const bossIntroStartScale = new THREE.Vector3(0.01, 0.01, 0.01);


// =====================================================
// ボス登場開始
// =====================================================

function startEnemyIntro() {

    // 二重に始まらないようにする
    if (enemyIntroStarted) return;

    enemyIntroStarted = true;
    enemyIntroProgress = 0;

    // 通常時の位置と大きさを保存
    bossIntroTargetPosition.copy(bossBasePosition);
    bossIntroTargetScale.copy(boss.scale);

    // 画面上から登場させる
    bossIntroStartPosition.set(
        bossBasePosition.x,
        bossBasePosition.y + 5,
        bossBasePosition.z
    );

    boss.position.copy(bossIntroStartPosition);

    // 最初はとても小さくする
    boss.scale.copy(bossIntroStartScale);

    boss.visible = true;

    showMessage("敵があらわれた！");
}


// =====================================================
// ボス登場アニメーション
// =====================================================

function updateEnemyIntro(deltaSeconds) {

    if (!enemyIntroStarted) return;
    if (enemyIntroFinished) return;

    // アニメーションを進める
    enemyIntroProgress +=
        deltaSeconds / ENEMY_INTRO_DURATION;

    const progress = Math.min(
        enemyIntroProgress,
        1
    );

    // 最初は速く、最後はゆっくり
    const easedProgress =
        1 - Math.pow(1 - progress, 3);

    // 上から通常位置へ移動
    boss.position.lerpVectors(
        bossIntroStartPosition,
        bossIntroTargetPosition,
        easedProgress
    );

    // 小さい状態から通常サイズへ
    boss.scale.lerpVectors(
        bossIntroStartScale,
        bossIntroTargetScale,
        easedProgress
    );

    // 登場中に少し揺らす
    boss.material.rotation =
        Math.sin(progress * Math.PI * 4) *
        (1 - progress) *
        0.25;

    // 登場完了
    if (progress >= 1) {

        enemyIntroFinished = true;

        boss.position.copy(bossBasePosition);
        boss.scale.copy(bossIntroTargetScale);
        boss.material.rotation = 0;

        setTimeout(() => {

            showMessage("ENTERでスタート！");

        }, 800);
    }
}
// =====================================================
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
// 星（ひし形スパークル）
// =====================================================

// 4方向にとがったキラキラ星（ひし形っぽいスパークル）の形状を作る
function createSparkleStarShape(outerRadius, innerRadius) {

    const shape = new THREE.Shape();
    const spikes = 4;
    const step = Math.PI / spikes;

    for (let i = 0; i < spikes * 2; i++) {

        const r = (i % 2 === 0) ? outerRadius : innerRadius;
        const angle = i * step;

        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;

        if (i === 0) {
            shape.moveTo(x, y);
        } else {
            shape.lineTo(x, y);
        }
    }

    shape.closePath();
    return shape;
}

const sparkleColors = [
    0xfff176,
    0xffd700,
    0xffb300,
    0xffffff
];

// 星エフェクトは1個ではなく24個のパーティクルで華やかに演出する
const starParticles = [];
const starParticleCount = 24;

for (let i = 0; i < starParticleCount; i++) {

    const size = 0.18 + Math.random() * 0.22;
    const shape = createSparkleStarShape(size, size * 0.38);

    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: size * 0.25,
        bevelEnabled: true,
        bevelThickness: size * 0.08,
        bevelSize: size * 0.05,
        bevelSegments: 1
    });

    const material = new THREE.MeshBasicMaterial({
        color: sparkleColors[
            Math.floor(Math.random() * sparkleColors.length)
        ],
        transparent: true,
        opacity: 1
    });

    const starMesh = new THREE.Mesh(geometry, material);
    starMesh.visible = false;

    starMesh.userData.velocity = new THREE.Vector3();
    starMesh.userData.spin = new THREE.Vector3();

    scene.add(starMesh);
    starParticles.push(starMesh);
}

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

    // ボスの登場演出が終わるまでは操作できない
    if (!enemyIntroFinished) return;
    // 長押し（キーリピート）は無効化。離してもう一度押した時だけカウントする
    if (event.repeat) return;

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

    // 上限なしで、連打するたびに大きくする
    ballScale = 1 + clickCount * 0.08;

    spiritBall.scale.set(
        ballScale,
        ballScale,
        ballScale
    );

    // -------------------------------------------------
    // 元気玉の光
    // -------------------------------------------------

    // 光も連打数に合わせて少しずつ強くする
    ballMaterial.emissiveIntensity =
        2 + clickCount * 0.12;

    updateBallColor();
}
// =====================================================
// 元気玉の色（連打数に応じて 黄→橙→赤→虹色）
// =====================================================
function updateBallColor() {

    const thresholds = [12, 24, 36];
    const colors = [
        0xffee00, // 黄色
        0xff8c00, // オレンジ
        0xff0000  // 赤
    ];

    let color;

    let stage = thresholds.findIndex(limit => clickCount <= limit);

    if (stage === -1) {

        const rainbowColors = [
            0xff0000,
            0xff8800,
            0xffff00,
            0x00ff66,
            0x3388ff,
            0xaa33ff
        ];

        const index =
            Math.floor(performance.now() / 90) % rainbowColors.length;

        color = new THREE.Color(rainbowColors[index]);

    } else {

        color = new THREE.Color(colors[stage]);
    }

    ballMaterial.color.copy(color);
    ballMaterial.emissive.copy(color);

    // 玉の色に合わせて周囲の発光ライトも変化させる
    ballGlowLight.color.copy(color);
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

// 1秒あたりの移動量（60fps基準の値 * 60）
const LAUNCH_SPEED_Y = 0.025 * FPS_BASE;
const LAUNCH_SPEED_Z = 0.18 * FPS_BASE;

function updateLaunch(deltaSeconds) {

    // 発射中でなければ何もしない
    if (!isLaunching) return;

    // 元気玉を敵に向かって飛ばす
    spiritBall.position.y += LAUNCH_SPEED_Y * deltaSeconds;
    spiritBall.position.z -= LAUNCH_SPEED_Z * deltaSeconds;

    ballGlowLight.position.copy(spiritBall.position);

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

const EXPLOSION_SCALE_GROWTH = 1.18;
const EXPLOSION_OPACITY_FADE = 0.08 * FPS_BASE;
const PARTICLE_VELOCITY_DAMP = 0.96;
const PARTICLE_SCALE_SHRINK = 0.97;
const PARTICLE_OPACITY_FADE = 0.018 * FPS_BASE;

function updateExplosion(deltaSeconds) {

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

    explosion.scale.multiplyScalar(
        decayPerSecond(EXPLOSION_SCALE_GROWTH, deltaSeconds)
    );
    explosionMaterial.opacity -= EXPLOSION_OPACITY_FADE * deltaSeconds;

    for (const particle of explosionParticles) {

        particle.position.addScaledVector(
            particle.userData.velocity,
            FPS_BASE * deltaSeconds
        );
        particle.userData.velocity.multiplyScalar(
            decayPerSecond(PARTICLE_VELOCITY_DAMP, deltaSeconds)
        );

        particle.scale.multiplyScalar(
            decayPerSecond(PARTICLE_SCALE_SHRINK, deltaSeconds)
        );
        particle.material.opacity -= PARTICLE_OPACITY_FADE * deltaSeconds;
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

function updateBossFly(deltaSeconds) {

    // 吹っ飛び中でなければ何もしない
    if (!bossFlying) return;

    // アニメーションを進める（フレームレートに依存しない速度で）
    bossFlyProgress += BOSS_FLY_SPEED * deltaSeconds;

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
// 星キラーン（24個のキラキラが飛び散ってフェードアウト）
// =====================================================
let starStarted = false;
let starStartTime = 0;
const starDuration = 900;

const STAR_VELOCITY_DAMP = 0.97;
const STAR_SCALE_GROWTH = 1.01;
const STAR_OPACITY_FADE = 0.012 * FPS_BASE;

function startStarEffect() {

    showStar = true;

    for (const starMesh of starParticles) {

        starMesh.position.copy(boss.position);
        starMesh.scale.set(1, 1, 1);
        starMesh.visible = true;
        starMesh.material.opacity = 1;

        starMesh.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );

        // 24個の星がそれぞれ違う方向へ勢いよく飛び散る
        starMesh.userData.velocity.set(
            (Math.random() - 0.5) * 0.5,
            0.15 + Math.random() * 0.35,
            (Math.random() - 0.5) * 0.5
        );

        starMesh.userData.spin.set(
            (Math.random() - 0.5) * 0.3,
            (Math.random() - 0.5) * 0.3,
            (Math.random() - 0.5) * 0.3
        );
    }

    boss.visible = false;

    console.log("星キラーン開始！");
}

function updateStar(deltaSeconds) {

    if (!showStar) return;

    if (!starStarted) {
        starStarted = true;
        starStartTime = performance.now();
    }

    for (const starMesh of starParticles) {

        starMesh.position.addScaledVector(
            starMesh.userData.velocity,
            FPS_BASE * deltaSeconds
        );
        starMesh.userData.velocity.multiplyScalar(
            decayPerSecond(STAR_VELOCITY_DAMP, deltaSeconds)
        );

        starMesh.rotation.x += starMesh.userData.spin.x * FPS_BASE * deltaSeconds;
        starMesh.rotation.y += starMesh.userData.spin.y * FPS_BASE * deltaSeconds;
        starMesh.rotation.z += starMesh.userData.spin.z * FPS_BASE * deltaSeconds;

        starMesh.scale.multiplyScalar(
            decayPerSecond(STAR_SCALE_GROWTH, deltaSeconds)
        );
        starMesh.material.opacity -= STAR_OPACITY_FADE * deltaSeconds;
    }

    if (performance.now() - starStartTime >= starDuration) {

        showStar = false;
        starStarted = false;

        for (const starMesh of starParticles) {
            starMesh.visible = false;
        }

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

function updateConfetti(deltaSeconds) {

    if (!confettiStarted) return;

    for (const piece of confettiPieces) {

        piece.position.y -= piece.userData.fallSpeed * FPS_BASE * deltaSeconds;

        piece.rotation.x += piece.userData.spinX * FPS_BASE * deltaSeconds;
        piece.rotation.y += piece.userData.spinY * FPS_BASE * deltaSeconds;
        piece.rotation.z += piece.userData.spinZ * FPS_BASE * deltaSeconds;

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
const BALL_SPIN_Y = 0.01 * FPS_BASE;
const BALL_SPIN_X = 0.005 * FPS_BASE;

function updateSpiritBall(deltaSeconds) {

    spiritBall.rotation.y += BALL_SPIN_Y * deltaSeconds;
    spiritBall.rotation.x += BALL_SPIN_X * deltaSeconds;

    // 発光ライトは常に玉の位置に追従させる
    if (!isLaunching) {
        ballGlowLight.position.copy(spiritBall.position);
    }
}

// =====================================================
// ボスの通常アイドルアニメーション
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
// Animate（フレームレート非依存の更新ループ）
// =====================================================
// deltaSecondsは前フレームからの経過秒数。異常に大きい値
// （タブが非アクティブから復帰した直後など）は上限を設けて
// 演出が一気に飛ばないようにする。
const MAX_DELTA_SECONDS = 1 / 15;

function animate() {

    requestAnimationFrame(animate);

    const now = performance.now();
    let deltaSeconds = (now - lastFrameTime) / 1000;
    lastFrameTime = now;

    if (deltaSeconds > MAX_DELTA_SECONDS) {
        deltaSeconds = MAX_DELTA_SECONDS;
    }

    updateSpiritBall(deltaSeconds);
    updateBossIdle();
    updateLaunch(deltaSeconds);

    // ボス登場演出
    updateEnemyIntro(deltaSeconds);

    updateLaunch(deltaSeconds);

    // 爆発
    updateExplosion(deltaSeconds);

    updateCameraShake();
    updateBossFly(deltaSeconds);
    updateStar(deltaSeconds);
    updateGameClear();
    updateConfetti(deltaSeconds);

    renderer.render(scene, camera);
}
// =====================================================
// Start
// =====================================================
animate();
