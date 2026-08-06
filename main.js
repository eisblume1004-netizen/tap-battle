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
    "./images/background2.png",

    (texture) => {

        scene.background = texture;

        debugLog("ASSET", "背景画像の読み込み成功");
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
// Debug
// =====================================================
const DEBUG_MODE = true;

function debugLog(tag, data = "") {
    if (!DEBUG_MODE) return;
    console.log(`[${tag}]`, data);
}

window.addEventListener("error", (event) => {
    console.error("[RUNTIME ERROR]", {
        message: event.message,
        file: event.filename,
        line: event.lineno,
        column: event.colno,
        error: event.error
    });
});

window.addEventListener("unhandledrejection", (event) => {
    console.error("[PROMISE ERROR]", event.reason);
});

// =====================================================
// Game変数
// =====================================================
let clickCount = 0;
let timeLeft = 15;

let gameStarted = false;
let gameFinished = false;
let isCountingDown = false;
let countdown = 3;

// =====================================================
// レベル・結果判定
// =====================================================
let selectedLevel = null;
let targetCount = 0;
let bossImageReady = false;
let levelCleared = false;

// 結果ランク: fail / clear / great1 / great2
let resultRank = "fail";

let failureResultStarted = false;
let failureSequenceActive = false;
// 元気玉跳ね返し
let isBallReflected = false;
let reflectedBallTime = 0;

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
const remainingText = document.getElementById("remaining");
function updateRemainingCount() {

    if (!remainingText) return;

    const remaining =
        Math.max(targetCount - clickCount, 0);

    if (remaining > 0) {

        remainingText.classList.remove(
            "remainingCleared"
        );

        const numberElement =
            document.getElementById("remainingCount");

        if (numberElement) {
            numberElement.textContent = remaining;
        } else {
            remainingText.innerHTML = `
                クリアまで あと
                <span id="remainingCount">${remaining}</span>
                かい
            `;
        }

    } else {

        remainingText.classList.add(
            "remainingCleared"
        );

        remainingText.textContent =
            "クリアラインたっせい！";
    }
}
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
// オープニング・運営用難易度設定
// =====================================================
const levelSelectScreen =
    document.getElementById("levelSelect");

let openingTitle = null;
let openingSubtitle = null;
let openingCountdown = null;
let openingSelectionLocked = false;

function setupOpeningScreen() {

    if (!levelSelectScreen) {
        debugLog("OPENING", "levelSelect が見つからないため通常表示で進行");
        return;
    }

    levelSelectScreen.innerHTML = `
        <div id="levelSelectPanel" class="openingPanel">
            <div id="openingEmbers" aria-hidden="true"></div>

            <div id="openingTitleWrap">
                <div class="openingFlame" aria-hidden="true">🔥</div>
                <h1 id="openingTitle">ひのぼうけん</h1>
            </div>

            <div id="openingBurst" aria-hidden="true"></div>
            <div id="openingCountdown" aria-live="polite"></div>
            <div class="staffHint">
                運営：1・2・3キー
            </div>
        </div>
    `;

    openingTitle =
        document.getElementById("openingTitle");

    openingCountdown =
        document.getElementById("openingCountdown");

    const emberContainer =
        document.getElementById("openingEmbers");

    if (emberContainer) {
        for (let i = 0; i < 34; i++) {
            const ember = document.createElement("span");
            ember.className = "openingEmber";
            ember.style.setProperty("--x", `${Math.random() * 100}%`);
            ember.style.setProperty("--delay", `${Math.random() * 3}s`);
            ember.style.setProperty("--duration", `${2.8 + Math.random() * 2.8}s`);
            ember.style.setProperty("--size", `${3 + Math.random() * 7}px`);
            emberContainer.appendChild(ember);
        }
    }

    const infoPanel = document.getElementById("info");
    if (infoPanel) infoPanel.style.display = "none";
    if (remainingText) remainingText.style.display = "none";

    debugLog("OPENING", "タイトル画面を初期化");
}

setupOpeningScreen();

function wait(milliseconds) {
    return new Promise((resolve) => {
        window.setTimeout(resolve, milliseconds);
    });
}

async function selectLevel(level, target) {

    if (openingSelectionLocked || selectedLevel !== null) {
        return;
    }

    openingSelectionLocked = true;
    selectedLevel = level;
    targetCount = target;

    clickCount = 0;
    countText.textContent = clickCount;

    timeLeft = 15;
    timeText.textContent = timeLeft;

    // 難易度は運営側だけで設定し、ゲーム画面の表示はまだ出さない
    updateRemainingCount();

    debugLog("LEVEL SELECT", {
        level: selectedLevel,
        targetCount
    });

    if (levelSelectScreen) {
        levelSelectScreen.classList.add("openingSelected");
    }
    }

    // タイトルが強く光り、「はじまるよ！」を見せる時間
    await wait(1200);

    if (levelSelectScreen) {
        levelSelectScreen.classList.add("countdownMode");
    }

    startCountdown();
}

// 運営が数字キーでひっそり難易度を設定する
window.addEventListener("keydown", (event) => {

    if (selectedLevel !== null) return;

    if (
        event.code === "Digit1" ||
        event.code === "Numpad1"
    ) {
        selectLevel("わ", 15);

    } else if (
        event.code === "Digit2" ||
        event.code === "Numpad2"
    ) {
        selectLevel("く", 25);

    } else if (
        event.code === "Digit3" ||
        event.code === "Numpad3"
    ) {
        selectLevel("なつ", 35);
    }
});


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

// 敵の表示サイズ（高さ基準）。
const BOSS_HEIGHT = 7.5;

const bossTexture = bossTextureLoader.load(
    "./images/mon2.png",

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

        debugLog("ASSET", "敵画像の比率調整完了");

        // ボス画像の読み込み完了
        bossImageReady = true;

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
// ゲーム画面準備
// =====================================================
function prepareGameScene() {

    if (!bossImageReady) {
        debugLog("SCENE", "敵画像の読み込み待ち");
    }

    boss.position.copy(bossBasePosition);
    boss.material.rotation = 0;
    boss.visible = true;

    spiritBall.visible = true;

    debugLog("SCENE", "ゲーム画面を表示");
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
const confettiCount = 360;

function createConfetti() {

    for (let i = 0; i < confettiCount; i++) {

        const width = 0.08 + Math.random() * 0.14;
        const height = 0.12 + Math.random() * 0.24;
        const geometry = new THREE.BoxGeometry(width, height, 0.025);

        const material = new THREE.MeshBasicMaterial({
            color: new THREE.Color(
                Math.random(),
                Math.random(),
                Math.random()
            )
        });

        const piece = new THREE.Mesh(geometry, material);

        piece.position.set(
            (Math.random() - 0.5) * 18,
            6 + Math.random() * 12,
            -5 + Math.random() * 9
        );

        piece.userData = {
            fallSpeed: 0.05 + Math.random() * 0.09,
            swaySpeed: 1.5 + Math.random() * 3,
            swayAmount: 0.4 + Math.random() * 1.2,
            startX: piece.position.x,
            phase: Math.random() * Math.PI * 2,
            spinX: 0.08 + Math.random() * 0.18,
            spinY: 0.08 + Math.random() * 0.18,
            spinZ: 0.08 + Math.random() * 0.18
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

    // 長押し無効
    if (event.repeat) return;

    if (gameFinished) return;

    // ゲーム中だけ連打を受け付ける
    if (gameStarted) {
        tapPower();
    }
});
// =====================================================
// スタート音
// =====================================================

const startSE = new Audio("./models/start.mp3");
startSE.preload = "auto";
startSE.volume = 1.0;
// =====================================================
// カウントダウン
// =====================================================
function setCountdownDisplay(text) {

    if (openingCountdown && levelSelectScreen) {
        openingCountdown.textContent = text;
        openingCountdown.classList.remove("countdownPop");
        void openingCountdown.offsetWidth;
        openingCountdown.classList.add("countdownPop");
        return;
    }

    showMessage(text);
}

function startCountdown() {

    if (isCountingDown || gameStarted) return;

    isCountingDown = true;
    countdown = 3;

    prepareGameScene();

    startSE.pause();
    startSE.currentTime = 0;

    const playPromise = startSE.play();

    if (playPromise !== undefined) {
        playPromise.catch((error) => {
            debugLog("AUDIO ERROR", error);
        });
    }

    debugLog("COUNTDOWN", "開始");

    if (openingCountdown) openingCountdown.textContent = "";
    setCountdownDisplay("3");

    setTimeout(() => {
        if (!isCountingDown) return;
        countdown = 2;
        setCountdownDisplay("2");
    }, 1000);

    setTimeout(() => {
        if (!isCountingDown) return;
        countdown = 1;
        setCountdownDisplay("1");
    }, 2000);

    setTimeout(() => {
        if (!isCountingDown) return;

        setCountdownDisplay("スタート！！");

        if (levelSelectScreen) {
            levelSelectScreen.classList.add("startBlast");
        }

        startGame();

        debugLog("COUNTDOWN", "START");
    }, 3100);

    // 「スタート！！」を少し見せてからオープニングを消す
    setTimeout(() => {

        if (levelSelectScreen) {
            levelSelectScreen.classList.remove("startBlast");
            levelSelectScreen.classList.add("openingFinished");

            setTimeout(() => {
                levelSelectScreen.style.display = "none";
            }, 350);
        }

        hideMessage();

    }, 3850);
}

// =====================================================
// ゲーム開始
// =====================================================
function startGame() {

    gameStarted = true;
    debugLog("GAME", "開始");
    isCountingDown = false;

    const infoPanel = document.getElementById("info");
    if (infoPanel) infoPanel.style.display = "flex";
    if (remainingText) {
        remainingText.style.display = "block";
        updateRemainingCount();
    }

    timeLeft = 15;
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
    updateRemainingCount();

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

    // 属性機能は使わず、連打数で黄→橙→赤へ変化させる。
    let colorHex = 0xffee00;

    if (clickCount >= 40) {
        colorHex = 0xff3b00;
    } else if (clickCount >= 25) {
        colorHex = 0xff7a00;
    } else if (clickCount >= 10) {
        colorHex = 0xffc400;
    }

    const color = new THREE.Color(colorHex);
    ballMaterial.color.copy(color);
    ballMaterial.emissive.copy(color);
    ballGlowLight.color.copy(color);
}

// =====================================================
// TIME UP
// =====================================================
function calculateResultRank() {
    if (clickCount < targetCount) {
        resultRank = "fail";
    } else if (clickCount >= targetCount + 20) {
        resultRank = "great2";
    } else if (clickCount >= targetCount + 10) {
        resultRank = "great1";
    } else {
        resultRank = "clear";
    }

    console.log("[RESULT RANK]", {
        selectedLevel,
        clickCount,
        targetCount,
        resultRank
    });
}

function finishGame() {

    gameFinished = true;
    gameStarted = false;

    calculateResultRank();
    levelCleared = resultRank !== "fail";

    showMessage("TIME UP!!");

    setTimeout(() => {

        hideMessage();

        // 成功でも失敗でも元気玉を発射
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

    if (!isLaunching) return;

    spiritBall.position.y +=
        LAUNCH_SPEED_Y * deltaSeconds;

    spiritBall.position.z -=
        LAUNCH_SPEED_Z * deltaSeconds;

    ballGlowLight.position.copy(
        spiritBall.position
    );

    if (
        spiritBall.position.z <=
        boss.position.z + 1
    ) {

        isLaunching = false;

        spiritBall.position.z =
            boss.position.z + 1;

        debugLog("HIT", "元気玉が命中");

        if (levelCleared) {

            // 成功：爆発して敵を吹き飛ばす
            isExplosion = true;

        } else {

            // 失敗：敵は倒れず、威力不足の演出へ
            startFailureResult();
        }
    }
}

// =====================================================
// ゲーム失敗演出
// =====================================================
function startFailureResult() {

    if (failureResultStarted) return;

    failureResultStarted = true;
    failureSequenceActive = true;

    showMessage("はじき返された！");

    // 元気玉をそのまま表示
    spiritBall.visible = true;

    // 跳ね返し開始
    isBallReflected = true;
    reflectedBallTime = 0;

    // 少し敵を震わせる
    let shake = 0;

    const shakeTimer = setInterval(() => {

        shake++;

        boss.material.rotation =
            (shake % 2 === 0 ? 0.18 : -0.18);

        if (shake > 8) {

            clearInterval(shakeTimer);

            boss.material.rotation = 0;
        }

    }, 50);

}

function updateReflectedBall(deltaSeconds){

    if(!isBallReflected) return;

    reflectedBallTime += deltaSeconds;

    // プレイヤー側へ飛ぶ
    spiritBall.position.z +=
        10 * deltaSeconds;

    // 少し下へ落ちる
    spiritBall.position.y -=
        3 * deltaSeconds;

    // クルクル回転
    spiritBall.rotation.x +=
        12 * deltaSeconds;

    spiritBall.rotation.z +=
        8 * deltaSeconds;

    ballGlowLight.position.copy(
        spiritBall.position
    );

    // 少しずつ小さくなる
    spiritBall.scale.multiplyScalar(
        Math.pow(0.97,deltaSeconds*60)
    );

    if(reflectedBallTime>=1.0){

        isBallReflected=false;

        spiritBall.visible=false;

        document.body.style.background=
            "rgba(0,0,0,0.85)";

        remainingText.style.display = "none";

        const remaining = Math.max(targetCount - clickCount, 0);

        messageText.innerHTML = `
            <div class="resultScreen">
                <div class="failureTitle">GAME OVER</div>
                <div class="resultCount">${clickCount}かい</div>
                <div class="resultSubText">おせたよ！</div>
                <div class="remainingResult">あと${remaining}かいだった！</div>
            </div>
        `;
        messageText.style.display = "block";

        hideStatusPanel();
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
        explosionMaterial.opacity = 1;

        let explosionStartScale = 0.9;
        let activeExplosionCount = 42;
        let particleScale = 1;
        let particlePower = 0.58;

        if (resultRank === "great1") {
            explosionStartScale = 1.35;
            activeExplosionCount = 64;
            particleScale = 1.3;
            particlePower = 0.8;
        } else if (resultRank === "great2") {
            explosionStartScale = 1.95;
            activeExplosionCount = explosionParticles.length;
            particleScale = 1.65;
            particlePower = 1.05;
        }

        explosion.scale.set(
            explosionStartScale,
            explosionStartScale,
            explosionStartScale
        );

        explosionParticles.forEach((particle, index) => {
            particle.position.copy(spiritBall.position);
            particle.visible = index < activeExplosionCount;

            if (!particle.visible) return;

            particle.material.opacity = 1;
            particle.scale.set(particleScale, particleScale, particleScale);
            particle.userData.velocity.set(
                (Math.random() - 0.5) * particlePower,
                (Math.random() - 0.5) * particlePower,
                (Math.random() - 0.5) * particlePower
            );
        });

        debugLog("EXPLOSION", resultRank);

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

        debugLog("ENEMY FLY", "終了");
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

    let activeStarCount = 10;
    let starScale = 1;
    let starPower = 0.45;

    if (resultRank === "great1") {
        activeStarCount = 18;
        starScale = 1.35;
        starPower = 0.68;
    } else if (resultRank === "great2") {
        activeStarCount = starParticles.length;
        starScale = 1.75;
        starPower = 0.95;
    }

    starParticles.forEach((starMesh, index) => {
        starMesh.visible = index < activeStarCount;
        if (!starMesh.visible) return;

        starMesh.position.copy(boss.position);
        starMesh.scale.set(starScale, starScale, starScale);
        starMesh.material.opacity = 1;

        starMesh.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );

        starMesh.userData.velocity.set(
            (Math.random() - 0.5) * starPower,
            0.15 + Math.random() * starPower,
            (Math.random() - 0.5) * starPower
        );

        starMesh.userData.spin.set(
            (Math.random() - 0.5) * 0.3,
            (Math.random() - 0.5) * 0.3,
            (Math.random() - 0.5) * 0.3
        );
    });

    boss.visible = false;
    console.log("[STAR EFFECT]", { resultRank, activeStarCount });
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

function hideStatusPanel() {
    // よく使われる候補IDを順番に探す。
    const statusCandidates = [
    "info",
    "status",
    "statusPanel",
    "gameStatus",
    "hud",
    "infoPanel"
];
    for (const id of statusCandidates) {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = "none";
            return;
        }
    }

    // 専用IDが無ければ、時間・連打数の共通親要素を隠す。
    const timeParent = timeText?.parentElement;
    const countParent = countText?.parentElement;

    if (timeParent && timeParent === countParent) {
        timeParent.style.display = "none";
        return;
    }

    if (timeParent) timeParent.style.visibility = "hidden";
    if (countParent) countParent.style.visibility = "hidden";
}

function showGameClear() {

    if (gameClearStarted) return;

    gameClearStarted = true;
    gameClear = true;

    hideStatusPanel();
    remainingText.style.display = "none";

    let resultLabel = "";
    let resultClass = "";

    if (resultRank === "great1") {
        resultLabel = `<div class="great1Label">すごい！！</div>`;
        resultClass = "great1Result";
    } else if (resultRank === "great2") {
        resultLabel = `<div class="great2Label">とてもすごい！！</div>`;
        resultClass = "great2Result";
    }

    messageText.innerHTML = `
        <div class="resultScreen">
            ${resultLabel}
            <div class="resultTitle">ゲームクリア！</div>
            <div class="resultCount ${resultClass}">${clickCount}かい</div>
            <div class="resultSubText">おせたよ！</div>
        </div>
    `;

    messageText.style.display = "block";
    startConfetti();

    console.log("[GAME CLEAR]", {
        level: selectedLevel,
        count: clickCount,
        target: targetCount,
        rank: resultRank
    });
}

function updateGameClear() {
    if (!gameClear) return;

    // 結果画面全体は動かさない。個別要素だけCSSで動かす。
    messageText.style.transform = "translate(-50%, -50%)";
}

// =====================================================
// 紙吹雪
// =====================================================
function startConfetti() {

    if (confettiStarted) return;

    confettiStarted = true;

    let activeConfettiCount = 140;

    if (resultRank === "great1") {
        activeConfettiCount = 250;
    } else if (resultRank === "great2") {
        activeConfettiCount = confettiPieces.length;
    }

    confettiPieces.forEach((piece, index) => {
        piece.visible = index < activeConfettiCount;
        if (!piece.visible) return;

        piece.position.set(
            (Math.random() - 0.5) * 18,
            5 + Math.random() * 14,
            -5 + Math.random() * 9
        );

        piece.userData.startX = piece.position.x;
        piece.material.opacity = 0.82 + Math.random() * 0.18;
    });

    console.log("[CONFETTI START]", {
        rank: resultRank,
        count: activeConfettiCount
    });
}

function updateConfetti(deltaSeconds) {

    if (!confettiStarted) return;

    const time = performance.now() * 0.001;

    for (const piece of confettiPieces) {
        if (!piece.visible) continue;

        piece.position.y -=
            piece.userData.fallSpeed *
            FPS_BASE *
            deltaSeconds;

        piece.position.x =
            piece.userData.startX +
            Math.sin(
                time * piece.userData.swaySpeed +
                piece.userData.phase
            ) *
            piece.userData.swayAmount;

        piece.rotation.x +=
            piece.userData.spinX * FPS_BASE * deltaSeconds;
        piece.rotation.y +=
            piece.userData.spinY * FPS_BASE * deltaSeconds;
        piece.rotation.z +=
            piece.userData.spinZ * FPS_BASE * deltaSeconds;

        if (piece.position.y < -5) {
            piece.position.y = 7 + Math.random() * 12;
            piece.userData.startX = (Math.random() - 0.5) * 18;
            piece.position.x = piece.userData.startX;
            piece.position.z = -5 + Math.random() * 9;
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
        failureSequenceActive ||
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
    

    // 表示中の敵をふわふわ動かす
    if (boss.visible) {
        updateBossIdle();
    }

    updateLaunch(deltaSeconds);
    updateReflectedBall(deltaSeconds);
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
