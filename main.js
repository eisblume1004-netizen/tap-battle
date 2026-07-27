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
let timeLeft = 15;

let gameStarted = false;
let gameFinished = false;
let isCountingDown = false;
let countdown = 3;

// =====================================================
// レベル・結果判定
// =====================================================
let selectedLevel = null;
let selectedElement = null;
let targetCount = 0;
let bossImageReady = false;
let levelCleared = false;
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
// レベル選択
// =====================================================
const levelSelectScreen =
    document.getElementById("levelSelect");

const levelButtons =
    document.querySelectorAll(".levelButton");

function selectLevel(level, target) {

    if (selectedLevel !== null) return;

    selectedLevel = level;
    targetCount = target;

    clickCount = 0;
    countText.textContent = clickCount;

    timeLeft = 15;
    timeText.textContent = timeLeft;

    if (levelSelectScreen) {
        levelSelectScreen.style.display = "none";
    }

    console.log("選択レベル：" + selectedLevel);
    console.log("目標連打数：" + targetCount);

    // 難易度を選んだら、次に属性選択を表示する
    showElementSelect();
}

levelButtons.forEach((button) => {

    button.addEventListener("click", () => {

        const level = button.dataset.level;
        const target = Number(button.dataset.target);

        selectLevel(level, target);
    });
});

// A・B・Cキーでもレベルを選べる
window.addEventListener("keydown", (event) => {

    if (selectedLevel !== null) return;

    if (event.code === "Keyわ") {
        selectLevel("わ", 30);
    } else if (event.code === "Keyく") {
        selectLevel("く", 40);
    } else if (event.code === "Keyなつ") {
        selectLevel("なつ", 50);
    }
});


// =====================================================
// 属性選択（水・雷・風）
// HTMLを変更しなくても、このJavaScriptだけで画面を作る
// =====================================================

const elementSelectScreen = document.createElement("div");
elementSelectScreen.id = "elementSelectScreen";

elementSelectScreen.innerHTML = `
    <div class="elementSelectPanel">
        <div class="elementSelectTitle">ぞくせいをえらんでね！</div>

        <div class="elementButtonRow">
            <button class="elementButton waterButton" data-element="water">
                <span class="elementIcon">💧</span>
                <span class="elementName">みず</span>
            </button>

            <button class="elementButton thunderButton" data-element="thunder">
                <span class="elementIcon">⚡</span>
                <span class="elementName">かみなり</span>
            </button>

            <button class="elementButton windButton" data-element="wind">
                <span class="elementIcon">🌪️</span>
                <span class="elementName">かぜ</span>
            </button>
        </div>
    </div>
`;

document.body.appendChild(elementSelectScreen);

const elementStyle = document.createElement("style");
elementStyle.textContent = `
    #elementSelectScreen {
        position: fixed;
        inset: 0;
        z-index: 1000;
        display: none;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.45);
        font-family: sans-serif;
    }

    .elementSelectPanel {
        width: min(760px, 88vw);
        padding: 28px 30px 32px;
        border: 4px solid rgba(255, 255, 255, 0.9);
        border-radius: 28px;
        background: rgba(20, 24, 40, 0.9);
        box-shadow:
            0 0 28px rgba(255,255,255,0.35),
            inset 0 0 24px rgba(255,255,255,0.08);
        text-align: center;
    }

    .elementSelectTitle {
        margin-bottom: 24px;
        color: white;
        font-size: clamp(28px, 5vw, 48px);
        font-weight: 900;
        letter-spacing: 0.08em;
        text-shadow: 0 3px 8px rgba(0,0,0,0.8);
    }

    .elementButtonRow {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 18px;
    }

    .elementButton {
        min-height: 170px;
        border: 4px solid white;
        border-radius: 24px;
        cursor: pointer;
        color: white;
        font-weight: 900;
        transition:
            transform 0.16s ease,
            filter 0.16s ease,
            box-shadow 0.16s ease;
    }

    .elementButton:hover,
    .elementButton:focus-visible {
        transform: translateY(-8px) scale(1.04);
        filter: brightness(1.18);
    }

    .elementIcon {
        display: block;
        margin-bottom: 8px;
        font-size: clamp(54px, 8vw, 84px);
        line-height: 1;
    }

    .elementName {
        display: block;
        font-size: clamp(26px, 4vw, 40px);
    }

    .waterButton {
        background: linear-gradient(145deg, #0b6fd6, #56d9ff);
        box-shadow: 0 0 24px rgba(65, 197, 255, 0.7);
    }

    .thunderButton {
        color: #342500;
        background: linear-gradient(145deg, #ffb300, #fff66a);
        box-shadow: 0 0 24px rgba(255, 235, 55, 0.75);
    }

    .windButton {
        color: #073d43;
        background: linear-gradient(145deg, #dfffff, #78e9e2);
        box-shadow: 0 0 24px rgba(180, 255, 249, 0.75);
    }

    @media (max-width: 620px) {
        .elementButtonRow {
            grid-template-columns: 1fr;
        }

        .elementButton {
            min-height: 105px;
        }

        .elementIcon {
            display: inline-block;
            margin: 0 12px 0 0;
            vertical-align: middle;
        }

        .elementName {
            display: inline-block;
            vertical-align: middle;
        }
    }
`;

document.head.appendChild(elementStyle);

function showElementSelect() {
    elementSelectScreen.style.display = "flex";
}

function selectElement(elementName) {

    if (selectedElement !== null) return;

    selectedElement = elementName;
    elementSelectScreen.style.display = "none";

    setElementAppearance();

    console.log("選択属性：" + selectedElement);

    if (bossImageReady) {
        startEnemyIntro();
    } else {
        showMessage("よみこみ中...");
    }
}

elementSelectScreen
    .querySelectorAll(".elementButton")
    .forEach((button) => {

        button.addEventListener("click", () => {
            selectElement(button.dataset.element);
        });
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
// 元気玉の属性エフェクト
// 水：水滴が周回
// 雷：稲妻がランダムに発光
// 風：3重リング＋吸い込まれる粒子
// =====================================================

const elementEffectGroup = new THREE.Group();
scene.add(elementEffectGroup);

// ------------------------------
// 水属性：水滴
// ------------------------------
const waterDropGroup = new THREE.Group();
elementEffectGroup.add(waterDropGroup);

const waterDrops = [];

for (let i = 0; i < 12; i++) {

    const dropMaterial = new THREE.MeshBasicMaterial({
        color: 0x72e7ff,
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending,
        toneMapped: false
    });

    const drop = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 16, 16),
        dropMaterial
    );

    drop.scale.set(0.75, 1.55, 0.75);

    waterDropGroup.add(drop);

    waterDrops.push({
        mesh: drop,
        angle: (i / 12) * Math.PI * 2,
        radius: 0.42 + Math.random() * 0.18,
        speed: 1.4 + Math.random() * 0.7,
        yOffset: (Math.random() - 0.5) * 0.35,
        phase: Math.random() * Math.PI * 2
    });
}

// 水の波紋リング
const waterRings = [];

for (let i = 0; i < 2; i++) {

    const ring = new THREE.Mesh(
        new THREE.TorusGeometry(
            0.42 + i * 0.12,
            0.018,
            12,
            64
        ),
        new THREE.MeshBasicMaterial({
            color: 0xaaf5ff,
            transparent: true,
            opacity: 0.58,
            blending: THREE.AdditiveBlending,
            toneMapped: false
        })
    );

    ring.rotation.x = Math.PI / 2;
    waterDropGroup.add(ring);
    waterRings.push(ring);
}


// 水の波：ゆらゆら広がるリング
const waterWaveGroup = new THREE.Group();
waterDropGroup.add(waterWaveGroup);

const waterWaves = [];

for (let i = 0; i < 4; i++) {

    const wave = new THREE.Mesh(
        new THREE.TorusGeometry(
            0.30 + i * 0.10,
            0.018,
            10,
            96
        ),
        new THREE.MeshBasicMaterial({
            color: 0x8eeeff,
            transparent: true,
            opacity: 0.52 - i * 0.08,
            blending: THREE.AdditiveBlending,
            toneMapped: false
        })
    );

    wave.rotation.x = Math.PI / 2;
    wave.rotation.z = i * 0.8;

    waterWaveGroup.add(wave);
    waterWaves.push(wave);
}

// 水しぶき
const waterSplashes = [];

for (let i = 0; i < 18; i++) {

    const splash = new THREE.Mesh(
        new THREE.SphereGeometry(0.022, 10, 10),
        new THREE.MeshBasicMaterial({
            color: 0xc8f8ff,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            toneMapped: false
        })
    );

    waterDropGroup.add(splash);

    waterSplashes.push({
        mesh: splash,
        angle: Math.random() * Math.PI * 2,
        radius: 0.28 + Math.random() * 0.55,
        speed: 1.8 + Math.random() * 2.0,
        height: (Math.random() - 0.5) * 0.55,
        phase: Math.random() * Math.PI * 2
    });
}

// あわ
const waterBubbles = [];

for (let i = 0; i < 12; i++) {

    const bubble = new THREE.Mesh(
        new THREE.SphereGeometry(0.028 + Math.random() * 0.025, 12, 12),
        new THREE.MeshBasicMaterial({
            color: 0xe8fdff,
            transparent: true,
            opacity: 0.48,
            blending: THREE.AdditiveBlending,
            toneMapped: false
        })
    );

    waterDropGroup.add(bubble);

    waterBubbles.push({
        mesh: bubble,
        x: (Math.random() - 0.5) * 1.2,
        y: -0.55 + Math.random() * 1.0,
        z: (Math.random() - 0.5) * 0.6,
        speed: 0.15 + Math.random() * 0.25,
        phase: Math.random() * Math.PI * 2
    });
}

// ------------------------------
// 雷属性：稲妻
// ------------------------------
const thunderGroup = new THREE.Group();
elementEffectGroup.add(thunderGroup);

const thunderBolts = [];

function createLightningBolt() {

    const points = [];
    const segmentCount = 6;

    for (let i = 0; i <= segmentCount; i++) {

        const progress = i / segmentCount;

        points.push(
            new THREE.Vector3(
                (Math.random() - 0.5) * 0.18,
                progress * 0.75 - 0.375,
                (Math.random() - 0.5) * 0.12
            )
        );
    }

    const geometry =
        new THREE.BufferGeometry().setFromPoints(points);

    const material =
        new THREE.LineBasicMaterial({
            color: 0xffff7a,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending,
            toneMapped: false
        });

    const bolt = new THREE.Line(
        geometry,
        material
    );

    thunderGroup.add(bolt);

    thunderBolts.push({
        line: bolt,
        angle: Math.random() * Math.PI * 2,
        radius: 0.35 + Math.random() * 0.28,
        phase: Math.random() * Math.PI * 2
    });
}

for (let i = 0; i < 9; i++) {
    createLightningBolt();
}


// 太い放電
const thunderArcGroup = new THREE.Group();
thunderGroup.add(thunderArcGroup);

const thunderArcs = [];

function createThunderArc(index) {

    const points = [];
    const segments = 7;

    for (let i = 0; i <= segments; i++) {

        const p = i / segments;

        points.push(
            new THREE.Vector3(
                (Math.random() - 0.5) * 0.22,
                p * 1.15 - 0.575,
                (Math.random() - 0.5) * 0.18
            )
        );
    }

    const curve = new THREE.CatmullRomCurve3(points);

    const geometry = new THREE.TubeGeometry(
        curve,
        28,
        0.018 + Math.random() * 0.012,
        8,
        false
    );

    const material = new THREE.MeshBasicMaterial({
        color: index % 2 === 0 ? 0xffff66 : 0xffffff,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        toneMapped: false
    });

    const arc = new THREE.Mesh(geometry, material);

    thunderArcGroup.add(arc);

    thunderArcs.push({
        mesh: arc,
        angle: Math.random() * Math.PI * 2,
        radius: 0.44 + Math.random() * 0.40,
        phase: Math.random() * Math.PI * 2,
        speed: 2.2 + Math.random() * 2.0
    });
}

for (let i = 0; i < 12; i++) {
    createThunderArc(i);
}

// 雷の外周リング
const thunderRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.53, 0.025, 10, 72),
    new THREE.MeshBasicMaterial({
        color: 0xffff99,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        toneMapped: false
    })
);

thunderRing.rotation.x = Math.PI / 2;
thunderGroup.add(thunderRing);

// ------------------------------
// 風属性：高速3重リング＋渦粒子
// ------------------------------
const windGroup = new THREE.Group();
elementEffectGroup.add(windGroup);

const windRings = [];

for (let i = 0; i < 3; i++) {

    const ring = new THREE.Mesh(
        new THREE.TorusGeometry(
            0.38 + i * 0.11,
            0.022 + i * 0.004,
            14,
            96
        ),
        new THREE.MeshBasicMaterial({
            color:
                i === 0
                    ? 0xe8fff0
                    : 0xb8f5c8,
            transparent: true,
            opacity: 0.72 - i * 0.1,
            blending: THREE.AdditiveBlending,
            toneMapped: false
        })
    );

    if (i === 0) {
        ring.rotation.set(
            Math.PI / 2,
            0,
            0.25
        );
    } else if (i === 1) {
        ring.rotation.set(
            0.65,
            Math.PI / 2,
            -0.35
        );
    } else {
        ring.rotation.set(
            -0.75,
            0.55,
            Math.PI / 2
        );
    }

    windGroup.add(ring);
    windRings.push(ring);
}

const windParticles = [];

for (let i = 0; i < 34; i++) {

    const particle = new THREE.Mesh(
        new THREE.SphereGeometry(0.025, 10, 10),
        new THREE.MeshBasicMaterial({
            color: 0xe8fff0,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            toneMapped: false
        })
    );

    windGroup.add(particle);

    windParticles.push({
        mesh: particle,
        angle: Math.random() * Math.PI * 2,
        radius: 0.45 + Math.random() * 0.9,
        speed: 2.2 + Math.random() * 2.4,
        height: (Math.random() - 0.5) * 0.85,
        phase: Math.random() * Math.PI * 2
    });
}

// 属性ごとの色・表示を切り替える
function setElementAppearance() {

    waterDropGroup.visible =
        selectedElement === "water";

    thunderGroup.visible =
        selectedElement === "thunder";

    windGroup.visible =
        selectedElement === "wind";

    updateBallColor();
}

// 最初は全部隠す
waterDropGroup.visible = false;
thunderGroup.visible = false;
windGroup.visible = false;

function updateElementEffects(deltaSeconds) {

    if (selectedElement === null) {
        elementEffectGroup.visible = false;
        return;
    }

    elementEffectGroup.visible =
        spiritBall.visible;

    elementEffectGroup.position.copy(
        spiritBall.position
    );

    // 元気玉と一緒に少しずつ大きくする
    const effectScale =
        Math.max(1, ballScale * 0.64);

    elementEffectGroup.scale.setScalar(
        effectScale
    );

    const time =
        performance.now() * 0.001;

    // --------------------------
    // 水
    // --------------------------
    if (selectedElement === "water") {

        waterDrops.forEach((dropData) => {

            dropData.angle +=
                dropData.speed *
                deltaSeconds;

            const radius =
                dropData.radius +
                Math.sin(
                    time * 2.5 +
                    dropData.phase
                ) *
                0.055;

            dropData.mesh.position.set(
                Math.cos(dropData.angle) *
                    radius,
                dropData.yOffset +
                    Math.sin(
                        time * 3 +
                        dropData.phase
                    ) *
                    0.13,
                Math.sin(dropData.angle) *
                    radius
            );

            dropData.mesh.rotation.z =
                -dropData.angle;
        });

        waterRings[0].rotation.z +=
            1.6 *
            deltaSeconds;

        waterRings[1].rotation.z -=
            1.05 *
            deltaSeconds;

        waterRings.forEach((ring, index) => {

            const pulse =
                1 +
                Math.sin(
                    time * 3.5 +
                    index
                ) *
                0.08;

            ring.scale.setScalar(pulse);
        });

        waterWaves.forEach((wave, index) => {

            const cycle =
                (
                    time * 0.75 +
                    index * 0.25
                ) % 1;

            const waveScale =
                0.65 +
                cycle * 1.15;

            wave.scale.setScalar(waveScale);

            wave.material.opacity =
                (1 - cycle) * 0.55;

            wave.rotation.z +=
                (index % 2 === 0 ? 0.7 : -0.6) *
                deltaSeconds;
        });

        waterSplashes.forEach((splashData) => {

            splashData.angle +=
                splashData.speed *
                deltaSeconds;

            const r =
                splashData.radius +
                Math.sin(
                    time * 4 +
                    splashData.phase
                ) *
                0.10;

            splashData.mesh.position.set(
                Math.cos(splashData.angle) * r,
                splashData.height +
                    Math.sin(
                        time * 5 +
                        splashData.phase
                    ) *
                    0.16,
                Math.sin(splashData.angle) * r
            );

            splashData.mesh.scale.setScalar(
                0.7 +
                Math.sin(
                    time * 7 +
                    splashData.phase
                ) *
                0.25
            );
        });

        waterBubbles.forEach((bubbleData) => {

            bubbleData.y +=
                bubbleData.speed *
                deltaSeconds;

            if (bubbleData.y > 0.85) {
                bubbleData.y = -0.75;
                bubbleData.x =
                    (Math.random() - 0.5) * 1.2;
                bubbleData.z =
                    (Math.random() - 0.5) * 0.6;
            }

            bubbleData.mesh.position.set(
                bubbleData.x +
                    Math.sin(
                        time * 2 +
                        bubbleData.phase
                    ) *
                    0.08,
                bubbleData.y,
                bubbleData.z
            );
        });
    }

    // --------------------------
    // 雷
    // --------------------------
    if (selectedElement === "thunder") {

        thunderRing.rotation.z +=
            4.5 *
            deltaSeconds;

        thunderBolts.forEach(
            (boltData, index) => {

                const angle =
                    boltData.angle +
                    time *
                    (
                        index % 2 === 0
                            ? 2.8
                            : -2.4
                    );

                boltData.line.position.set(
                    Math.cos(angle) *
                        boltData.radius,
                    Math.sin(
                        time * 6 +
                        boltData.phase
                    ) *
                        0.34,
                    Math.sin(angle) *
                        boltData.radius
                );

                boltData.line.rotation.z =
                    -angle +
                    Math.PI / 2;

                const flash =
                    Math.sin(
                        time * 28 +
                        boltData.phase
                    );

                boltData.line.visible =
                    flash > -0.55 ||
                    Math.random() > 0.72;

                boltData.line.material.opacity =
                    0.7 +
                    Math.random() * 0.3;
            }
        );

        thunderArcs.forEach((arcData, index) => {

            const angle =
                arcData.angle +
                time *
                (
                    index % 2 === 0
                        ? arcData.speed
                        : -arcData.speed
                );

            arcData.mesh.position.set(
                Math.cos(angle) *
                    arcData.radius,
                Math.sin(
                    time * 7 +
                    arcData.phase
                ) *
                    0.30,
                Math.sin(angle) *
                    arcData.radius
            );

            arcData.mesh.rotation.z =
                -angle +
                Math.PI / 2;

            const blink =
                Math.sin(
                    time * 32 +
                    arcData.phase
                );

            arcData.mesh.visible =
                blink > -0.45 ||
                Math.random() > 0.62;

            arcData.mesh.material.opacity =
                0.75 +
                Math.random() * 0.25;

            const arcScale =
                0.85 +
                Math.random() * 0.45;

            arcData.mesh.scale.setScalar(
                arcScale
            );
        });

        const thunderPulse =
            1 +
            Math.sin(time * 30) *
            0.075;

        spiritBall.scale.multiplyScalar(
            thunderPulse
        );

        ballGlowLight.intensity =
            8 +
            Math.random() * 12;
    }

    // --------------------------
    // 風
    // --------------------------
    if (selectedElement === "wind") {

        windRings[0].rotation.z +=
            5.6 *
            deltaSeconds;

        windRings[1].rotation.x -=
            4.7 *
            deltaSeconds;

        windRings[1].rotation.y +=
            3.3 *
            deltaSeconds;

        windRings[2].rotation.y -=
            5.2 *
            deltaSeconds;

        windRings[2].rotation.z +=
            3.9 *
            deltaSeconds;

        windParticles.forEach(
            (particleData) => {

                particleData.angle +=
                    particleData.speed *
                    deltaSeconds;

                // 外側から中心へ吸い込まれ、
                // 中心に着いたら再び外側へ戻る
                particleData.radius -=
                    0.36 *
                    deltaSeconds;

                if (
                    particleData.radius <
                    0.16
                ) {
                    particleData.radius =
                        0.75 +
                        Math.random() *
                        0.65;

                    particleData.height =
                        (Math.random() -
                            0.5) *
                        0.9;
                }

                const spiralRadius =
                    particleData.radius;

                particleData.mesh.position.set(
                    Math.cos(
                        particleData.angle
                    ) *
                        spiralRadius,
                    particleData.height *
                        (
                            particleData.radius /
                            1.35
                        ) +
                        Math.sin(
                            time * 5 +
                            particleData.phase
                        ) *
                        0.07,
                    Math.sin(
                        particleData.angle
                    ) *
                        spiralRadius
                );

                const particleScale =
                    THREE.MathUtils.clamp(
                        particleData.radius,
                        0.25,
                        1
                    );

                particleData.mesh.scale.setScalar(
                    particleScale
                );
            }
        );
    }
}

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

        console.log("ボス画像の比率調整完了");

        // ボス画像の読み込み完了
        bossImageReady = true;

        // レベル選択済みなら登場演出を始める
        if (
            selectedLevel !== null &&
            selectedElement !== null
        ) {
            startEnemyIntro();
        }
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
// ボスが操る火の玉
// images/hi.png を3〜6個ランダムに表示
// =====================================================

const fireTextureLoader = new THREE.TextureLoader();

const fireTexture = fireTextureLoader.load(
    "./images/hi.png",
    () => {
        console.log("火の玉画像の読み込み成功！");
    },
    undefined,
    (error) => {
        console.error("火の玉画像の読み込み失敗", error);
    }
);

const fireBalls = [];

// ページを開くたびに3〜6個からランダムで決まる
const FIRE_COUNT = THREE.MathUtils.randInt(3, 6);

// 1個だけ手前へ飛び出す演出用
let fireAttackIndex = -1;
let fireAttackProgress = 0;
let nextFireAttackTime =
    performance.now() + 2000 + Math.random() * 2000;

// ボス敗北後の飛び散り演出用
let fireBallsDefeated = false;

for (let i = 0; i < FIRE_COUNT; i++) {

    const fireMaterial = new THREE.SpriteMaterial({
        map: fireTexture,
        transparent: true,
        depthWrite: false,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        toneMapped: false
    });

    const fire = new THREE.Sprite(fireMaterial);

    // 外側に重ねる薄い炎。二重表示にして派手さと発光感を出す
    const auraMaterial = new THREE.SpriteMaterial({
        map: fireTexture,
        transparent: true,
        depthWrite: false,
        opacity: 0.38,
        blending: THREE.AdditiveBlending,
        toneMapped: false
    });

    const aura = new THREE.Sprite(auraMaterial);

    // 以前の約2倍。画面上でしっかり存在感が出る大きさ
    const baseScale =
        2.6 + Math.random() * 1.2;

    fire.scale.set(
        baseScale,
        baseScale,
        1
    );

    aura.scale.set(
        baseScale * 1.7,
        baseScale * 1.7,
        1
    );

    fire.visible = false;
    aura.visible = false;

    scene.add(aura);
    scene.add(fire);

    fireBalls.push({
        sprite: fire,
        aura: aura,

        // 初期角度
        angle:
            Math.random() *
            Math.PI *
            2,

        // 周回速度
        speed:
            0.45 +
            Math.random() *
            0.4,

        // ボスからの距離
        radius:
            4.2 +
            Math.random() *
            3.8,

        // ボスを基準にした高さ
        height:
            1.4 +
            Math.random() *
            4.8,

        // 上下運動のタイミングをずらす
        floatOffset:
            Math.random() *
            Math.PI *
            2,

        baseScale: baseScale,

        // 敗北時の飛ぶ方向
        defeatVelocity:
            new THREE.Vector3()
    });
}

// =====================================================
// ボス登場演出
// =====================================================

let enemyIntroStarted = false;
let enemyIntroFinished = false;
let enemyIntroProgress = 0;
let enemyBecameVisible = false;

// 「敵があらわれた！」を見せる時間
const ENEMY_INTRO_DELAY = 0.3;

// 敵が登場するアニメーション時間
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

    // 選択した属性の元気玉とエフェクトを反映
    setElementAppearance();

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

    // 最初はまだ表示しない
    boss.visible = false;

    showMessage("敵があらわれた！");
}


// =====================================================
// ボス登場アニメーション
// =====================================================
function updateEnemyIntro(deltaSeconds) {

    if (!enemyIntroStarted) return;
    if (enemyIntroFinished) return;

    enemyIntroProgress += deltaSeconds;

    // 最初は「敵があらわれた！」だけ表示
    if (enemyIntroProgress < ENEMY_INTRO_DELAY) {
        return;
    }

    // 敵が見え始める瞬間に文字を消す
    if (!enemyBecameVisible) {
        enemyBecameVisible = true;
        boss.visible = true;
        hideMessage();
    }

    const animationTime =
        enemyIntroProgress - ENEMY_INTRO_DELAY;

    const progress = Math.min(
        animationTime / ENEMY_INTRO_DURATION,
        1
    );

    const easedProgress =
        1 - Math.pow(1 - progress, 3);

    boss.position.lerpVectors(
        bossIntroStartPosition,
        bossIntroTargetPosition,
        easedProgress
    );

    boss.scale.lerpVectors(
        bossIntroStartScale,
        bossIntroTargetScale,
        easedProgress
    );

    boss.material.rotation =
        Math.sin(progress * Math.PI * 4) *
        (1 - progress) *
        0.25;

    if (progress >= 1) {

        enemyIntroFinished = true;

        boss.position.copy(bossBasePosition);
        boss.scale.copy(bossIntroTargetScale);
        boss.material.rotation = 0;

        setTimeout(() => {
            showMessage("スタート！");
        }, 500);
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

    // 属性選択とボス登場が終わるまでは操作できない
    if (selectedElement === null) return;
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

    // 属性未選択時だけ従来の黄色
    if (selectedElement === null) {

        const defaultColor =
            new THREE.Color(0xffee00);

        ballMaterial.color.copy(
            defaultColor
        );

        ballMaterial.emissive.copy(
            defaultColor
        );

        ballGlowLight.color.copy(
            defaultColor
        );

        return;
    }

    // 連打数に合わせて、同じ属性の中で明るさを上げる
    let stage = 0;

    if (clickCount >= 36) {
        stage = 3;
    } else if (clickCount >= 24) {
        stage = 2;
    } else if (clickCount >= 12) {
        stage = 1;
    }

    const elementColors = {

        water: [
            0x239dff,
            0x35c8ff,
            0x72e7ff,
            0xd6fbff
        ],

        thunder: [
            0xffc400,
            0xffe600,
            0xffff73,
            0xffffff
        ],

        wind: [
            0x9ee7b8,
            0xb8f5c8,
            0xdfffe8,
            0xffffff
        ]
    };

    const color =
        new THREE.Color(
            elementColors[
                selectedElement
            ][stage]
        );

    ballMaterial.color.copy(color);
    ballMaterial.emissive.copy(color);

    // 連打が増えるほど属性球自体も強く発光
    ballMaterial.emissiveIntensity =
        2.4 +
        clickCount *
        0.13;

    ballGlowLight.color.copy(color);
}

// =====================================================
// TIME UP
// =====================================================
function finishGame() {

    gameFinished = true;
    gameStarted = false;

    // 目標回数を達成したか保存
    levelCleared =
        clickCount >= targetCount;

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

        console.log("元気玉が命中！");

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

        showMessage(
            "GAME OVER\nあと"+
            (targetCount-clickCount)+
            "回だった..."
        );
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

        // ボスの敗北に合わせて火の玉を飛び散らせる
        startFireBallDefeat();

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

    showMessage("ひのぼうけん\nクリア!!");
    startConfetti();

    console.log("ひのぼうけんクリア！");
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
// ボスが操る火の玉の更新
// =====================================================

function updateFireBalls(deltaSeconds) {

    // ボス敗北後は飛び散り専用の動きに切り替える
    if (fireBallsDefeated) {
        updateDefeatedFireBalls(deltaSeconds);
        return;
    }

    // 登場前・敗北演出中・消滅後は表示しない
    if (
        !boss.visible ||
        !enemyIntroFinished ||
        isExplosion ||
        bossFlying ||
        showStar ||
        gameClear
    ) {

        for (const fireBall of fireBalls) {
            fireBall.sprite.visible = false;
            fireBall.aura.visible = false;
        }

        return;
    }

    const currentTime =
        performance.now();

    const time =
        currentTime * 0.001;

    // 2〜4秒ごとにランダムな1個を手前へ飛び出させる
    if (
        fireAttackIndex === -1 &&
        currentTime >= nextFireAttackTime
    ) {

        fireAttackIndex =
            Math.floor(
                Math.random() *
                fireBalls.length
            );

        fireAttackProgress = 0;
    }

    fireBalls.forEach(
        (fireBall, index) => {

            const fire =
                fireBall.sprite;

            const aura =
                fireBall.aura;

            fire.visible = true;
            aura.visible = true;

            fireBall.angle +=
                fireBall.speed *
                deltaSeconds;

            // 少しだけ軌道を伸び縮みさせる
            const breathingRadius =
                fireBall.radius +
                Math.sin(
                    time * 1.8 +
                    fireBall.floatOffset
                ) *
                0.24;

            let x =
                boss.position.x +
                Math.cos(
                    fireBall.angle
                ) *
                breathingRadius;

            let y =
                boss.position.y +
                fireBall.height +
                Math.sin(
                    time * 2.8 +
                    fireBall.floatOffset
                ) *
                0.38;

            let z =
                boss.position.z +
                Math.sin(
                    fireBall.angle
                ) *
                2.2;

            // 選ばれた1個だけ、カメラ側へ飛び出して戻る
            if (index === fireAttackIndex) {

                fireAttackProgress +=
                    deltaSeconds * 1.15;

                const progress =
                    Math.min(
                        fireAttackProgress,
                        1
                    );

                // 0 → 1 → 0 の動き
                const attackAmount =
                    Math.sin(
                        progress *
                        Math.PI
                    );

                z +=
                    attackAmount *
                    4.8;

                y +=
                    attackAmount *
                    0.6;

                const attackScale =
                    fireBall.baseScale +
                    attackAmount *
                    2.8;

                fire.scale.set(
                    attackScale,
                    attackScale,
                    1
                );

                aura.scale.set(
                    attackScale * 1.9,
                    attackScale * 1.9,
                    1
                );

                aura.material.opacity =
                    0.38 + attackAmount * 0.32;

                if (progress >= 1) {

                    fireAttackIndex = -1;
                    fireAttackProgress = 0;

                    nextFireAttackTime =
                        performance.now() +
                        2000 +
                        Math.random() *
                        2000;
                }

            } else {

                // 普段も少し脈打たせる
                const pulseScale =
                    fireBall.baseScale +
                    Math.sin(
                        time * 4.8 +
                        fireBall.floatOffset
                    ) *
                    0.32;

                fire.scale.set(
                    pulseScale,
                    pulseScale,
                    1
                );

                const auraPulse =
                    pulseScale *
                    (
                        1.42 +
                        Math.sin(
                            time * 3.2 +
                            fireBall.floatOffset
                        ) *
                        0.08
                    );

                aura.scale.set(
                    auraPulse,
                    auraPulse,
                    1
                );

                aura.material.opacity =
                    0.30 +
                    (
                        Math.sin(
                            time * 4 +
                            fireBall.floatOffset
                        ) +
                        1
                    ) *
                    0.08;
            }

            // 奥にある火の玉は少し小さく、手前は大きくして遠近感を出す
            const depthScale =
                THREE.MathUtils.clamp(
                    1.15 - (z - boss.position.z) * 0.08,
                    0.72,
                    1.45
                );

            fire.scale.multiplyScalar(depthScale);
            aura.scale.multiplyScalar(depthScale);

            fire.position.set(
                x,
                y,
                z
            );

            aura.position.set(
                x,
                y,
                z - 0.03
            );

            // 炎そのものが左右に揺れているように見せる
            fire.material.rotation =
                Math.sin(
                    time * 3.2 +
                    fireBall.floatOffset
                ) *
                0.18;

            // 外側の炎は逆方向へ少し大きく揺らす
            aura.material.rotation =
                -Math.sin(
                    time * 2.6 +
                    fireBall.floatOffset
                ) *
                0.24;
        }
    );
}


// =====================================================
// ボス敗北時：火の玉が制御を失って飛び散る
// =====================================================

function startFireBallDefeat() {

    if (fireBallsDefeated) return;

    fireBallsDefeated = true;

    fireAttackIndex = -1;
    fireAttackProgress = 0;

    for (const fireBall of fireBalls) {

        const fire =
            fireBall.sprite;

        const aura =
            fireBall.aura;

        fire.visible = true;
        aura.visible = true;

        fire.material.opacity = 1;
        aura.material.opacity = 0.5;

        // それぞれ違う方向へ勢いよく飛び散る
        fireBall.defeatVelocity.set(
            (Math.random() - 0.5) * 5,
            2 + Math.random() * 4,
            1 + Math.random() * 4
        );
    }
}


function updateDefeatedFireBalls(
    deltaSeconds
) {

    for (const fireBall of fireBalls) {

        const fire =
            fireBall.sprite;

        const aura =
            fireBall.aura;

        if (!fire.visible) continue;

        fire.position.addScaledVector(
            fireBall.defeatVelocity,
            deltaSeconds
        );

        aura.position.copy(fire.position);

        // 重力のように少しずつ下へ落とす
        fireBall.defeatVelocity.y -=
            2.5 *
            deltaSeconds;

        fire.material.rotation +=
            4.5 *
            deltaSeconds;

        aura.material.rotation -=
            3.5 *
            deltaSeconds;

        const shrink =
            Math.pow(
                0.95,
                deltaSeconds *
                FPS_BASE
            );

        fire.scale.multiplyScalar(shrink);
        aura.scale.multiplyScalar(shrink);

        fire.material.opacity -=
            1.4 *
            deltaSeconds;

        aura.material.opacity -=
            0.9 *
            deltaSeconds;

        if (
            fire.material.opacity <= 0 ||
            fire.scale.x <= 0.05
        ) {

            fire.visible = false;
            aura.visible = false;
        }
    }
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
    updateElementEffects(deltaSeconds);

    // ボス登場演出
    updateEnemyIntro(deltaSeconds);

    // 登場後のみ通常のふわふわ動作
    if (enemyIntroFinished) {
        updateBossIdle();
    }

    // ボスの位置更新後に火の玉を追従させる
    updateFireBalls(deltaSeconds);

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
