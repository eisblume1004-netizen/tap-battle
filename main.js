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
// 爆発パーティクル
// =====================================================

const explosionParticles = [];

const explosionColors = [
    0xff2200,
    0xff6600,
    0xffaa00,
    0xffff00
];

for (let i = 0; i < 60; i++) {

    const size = 0.08 + Math.random() * 0.18;

    const geometry = new THREE.SphereGeometry(
        size,
        12,
        12
    );

    const material = new THREE.MeshBasicMaterial({
        color: explosionColors[
            Math.floor(Math.random() * explosionColors.length)
        ],
        transparent: true,
        opacity: 1
    });

    const particle = new THREE.Mesh(
        geometry,
        material
    );

    particle.visible = false;

    // 四方八方に飛ぶ方向
    particle.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.35,
        (Math.random() - 0.5) * 0.35,
        (Math.random() - 0.5) * 0.35
    );

    scene.add(particle);

    explosionParticles.push(particle);
}
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
// =====================================================
// UI表示関数
// =====================================================

function showMessage(text) {
    messageText.textContent = text;
    messageText.style.display = "block";
}

function hideMessage() {
    messageText.textContent = "";
    messageText.style.display = "none";
}

// =====================================================
// Enterキー処理
// =====================================================

window.addEventListener("keydown", (event) => {

    if (event.code !== "Enter") return;

    // ゲーム終了後は無効
    if (gameFinished) return;

    // まだ始まっていない場合はカウントダウン開始
    if (!gameStarted && !isCountingDown) {
        startCountdown();
        return;
    }

    // カウントダウン中は連打できない
    if (isCountingDown) return;

    // ゲーム開始後だけ連打できる
    if (gameStarted) {
        tapPower();
    }

});

// =====================================================
// カウントダウン開始
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
// 連打処理
// =====================================================

function tapPower() {

    clickCount++;
    countText.textContent = clickCount;

    ballScale += 0.03;

    spiritBall.scale.set(
        ballScale,
        ballScale,
        ballScale
    );

    // 押すほど少し光を強くする
    ballMaterial.emissiveIntensity += 0.02;

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

        // 元気玉発射開始
        isLaunching = true;

    }, 1000);

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
// アニメーション更新
// =====================================================

function animate() {

    requestAnimationFrame(animate);

    // 元気玉を常にゆっくり回転
    updateSpiritBall();
    //元気玉発射
     updateLaunch();
    //爆発エフェクト
    // =====================================================
// 爆発アニメーション
// =====================================================

let explosionStarted = false;
let explosionStartTime = 0;

function updateExplosion() {

    if (!isExplosion) return;


    // =============================================
    // 爆発開始
    // =============================================

    if (!explosionStarted) {

        explosionStarted = true;

        explosionStartTime = performance.now();

        // 元気玉を消す
        spiritBall.visible = false;


        // -----------------------------------------
        // 中心の閃光
        // -----------------------------------------

        explosion.visible = true;

        explosion.position.copy(
            spiritBall.position
        );

        explosion.scale.set(
            0.5,
            0.5,
            0.5
        );

        explosionMaterial.opacity = 1;


        // -----------------------------------------
        // 爆発粒子を配置
        // -----------------------------------------

        for (const particle of explosionParticles) {

            particle.position.copy(
                spiritBall.position
            );

            particle.visible = true;

            particle.material.opacity = 1;

        }

        console.log("ドカーン！！");
    }


    // =============================================
    // 中心の火球
    // =============================================

    explosion.scale.multiplyScalar(1.15);

    explosionMaterial.opacity -= 0.08;


    // =============================================
    // 火花を四方八方へ飛ばす
    // =============================================

    for (const particle of explosionParticles) {

        particle.position.add(
            particle.userData.velocity
        );

        // 少し減速
        particle.userData.velocity.multiplyScalar(
            0.97
        );

        // 粒を少しずつ小さくする
        particle.scale.multiplyScalar(
            0.97
        );

        // 徐々に透明にする
        particle.material.opacity -= 0.018;

    }


    // =============================================
    // 爆発終了
    // =============================================

    if (
        performance.now() - explosionStartTime
        > 1000
    ) {

        isExplosion = false;

        explosionStarted = false;

        explosion.visible = false;


        for (const particle of explosionParticles) {

            particle.visible = false;

        }


        // 次は画面揺れ
        isShake = true;

    }

}
    //画面揺れ
    updateCameraShake();
    //ラスボスバイバイ
    updateBossFly();
    //キラーン演出
    updateStar();
    //GAME CLEAR
    updateGameClear();
    updateConfetti();
    
    renderer.render(scene, camera);

}

// =====================================================
// 元気玉の通常アニメーション
// =====================================================

function updateSpiritBall() {

    spiritBall.rotation.y += 0.01;
    spiritBall.rotation.x += 0.005;

}

// =====================================================
// ④ 元気玉発射アニメーション
// =====================================================

function updateLaunch() {

    // 発射中でなければ何もしない
    if (!isLaunching) return;

    // -------------------------------------------------
    // 元気玉をラスボスの方向へ移動
    // -------------------------------------------------

    // 少しずつ上へ
    spiritBall.position.y += 0.025;

    // 奥にいるラスボスへ進む
    spiritBall.position.z -= 0.18;

    // -------------------------------------------------
    // ラスボスへの命中判定
    // -------------------------------------------------

    if (spiritBall.position.z <= boss.position.z + 1) {

        // 発射終了
        isLaunching = false;

        // 元気玉をラスボスの近くに固定
        spiritBall.position.z = boss.position.z + 1;

        console.log("元気玉が命中！");

        // ⑤で爆発処理を開始する
        isExplosion = true;

    }

}
// =====================================================
// ⑤ 爆発エフェクト
// =====================================================

// 爆発の進行度
let explosionScale = 0.1;

// 爆発の透明度
let explosionOpacity = 1;


// =====================================================
// 爆発アニメーション更新
// =====================================================

function updateExplosion() {

    // 爆発中でなければ何もしない
    if (!isExplosion) return;


    // -------------------------------------------------
    // 爆発開始時の準備
    // -------------------------------------------------

    if (!explosion.visible) {

        // 爆発を表示
        explosion.visible = true;

        // 元気玉が命中した位置に爆発を移動
        explosion.position.copy(spiritBall.position);

        // 爆発サイズを初期化
        explosionScale = 0.1;

        explosion.scale.set(
            explosionScale,
            explosionScale,
            explosionScale
        );

        // 透明度を初期化
        explosionOpacity = 1;
        explosionMaterial.opacity = explosionOpacity;

        // 命中した元気玉を非表示
        spiritBall.visible = false;

        console.log("爆発開始！");
    }


    // -------------------------------------------------
    // 爆発を大きくする
    // -------------------------------------------------

    explosionScale += 0.18;

    explosion.scale.set(
        explosionScale,
        explosionScale,
        explosionScale
    );


    // -------------------------------------------------
    // 爆発を少しずつ透明にする
    // -------------------------------------------------

    explosionOpacity -= 0.025;

    explosionMaterial.opacity = Math.max(
        explosionOpacity,
        0
    );


    // -------------------------------------------------
    // 爆発終了判定
    // -------------------------------------------------

    if (explosionOpacity <= 0) {

        // 爆発終了
        isExplosion = false;

        // 爆発を非表示
        explosion.visible = false;

        console.log("爆発終了！");

        // ⑥で画面揺れを開始する
        isShake = true;
    }

}
// =====================================================
// ⑥ 画面揺れエフェクト
// =====================================================

// 画面揺れを開始した時間
let shakeStartTime = 0;

// 画面を揺らす時間（ミリ秒）
const shakeDuration = 500;

// 揺れの強さ
const shakePower = 0.12;

// 画面揺れが始まったかどうか
let shakeStarted = false;


// =====================================================
// 画面揺れアニメーション更新
// =====================================================

function updateCameraShake() {

    // 揺れ中でなければ何もしない
    if (!isShake) return;


    // -------------------------------------------------
    // 揺れ開始時の準備
    // -------------------------------------------------

    if (!shakeStarted) {

        shakeStarted = true;

        // 揺れ開始時刻を記録
        shakeStartTime = performance.now();

        console.log("画面揺れ開始！");
    }


    // -------------------------------------------------
    // カメラをランダムに動かす
    // -------------------------------------------------

    camera.position.x =
        (Math.random() - 0.5) * shakePower;

    camera.position.y =
        1.8 + (Math.random() - 0.5) * shakePower;


    // -------------------------------------------------
    // 揺れ終了判定
    // -------------------------------------------------

    if (
        performance.now() - shakeStartTime
        >= shakeDuration
    ) {

        // 画面揺れ終了
        isShake = false;

        // 次回用にリセット
        shakeStarted = false;

        // カメラを元の位置へ戻す
        camera.position.set(
            0,
            1.8,
            8
        );

        // カメラの向きも戻す
        camera.lookAt(
            0,
            0,
            -4
        );

        console.log("画面揺れ終了！");

        // ラスボス吹っ飛び開始
        startBossFly();
    }

}


// =====================================================
// ラスボス吹っ飛び準備
// =====================================================

function startBossFly() {

    // 吹っ飛び状態にする
    bossFlying = true;


    // -------------------------------------------------
    // 連打数によって横方向の飛距離を変更
    // -------------------------------------------------

    // 最低でも右方向へ4飛ぶ
    // 連打数が多いほどさらに遠くへ飛ぶ
    bossTargetX = 4 + clickCount * 0.04;


    // -------------------------------------------------
    // 上方向の目標
    // -------------------------------------------------

    bossTargetY = 7;


    // -------------------------------------------------
    // 奥方向の目標
    // -------------------------------------------------

    bossTargetZ = -25;


    console.log("ラスボス吹っ飛び開始！");
}
// =====================================================
// ⑦ ラスボス吹っ飛び
// くるくる回転しながら、斜め上＋奥へ飛ぶ
// =====================================================

function updateBossFly() {

    // 吹っ飛び中でなければ何もしない
    if (!bossFlying) return;

    // -------------------------------------------------
    // 斜め上・奥へ移動
    // -------------------------------------------------

    boss.position.x += 0.14;
    boss.position.y += 0.08;
    boss.position.z -= 0.22;

    // -------------------------------------------------
    // ばいきんまん風にくるくる回転
    // -------------------------------------------------

    boss.rotation.x += 0.22;
    boss.rotation.y += 0.18;
    boss.rotation.z += 0.25;

    // -------------------------------------------------
    // 奥へ飛んでいるように少しずつ小さくする
    // -------------------------------------------------

    boss.scale.x *= 0.985;
    boss.scale.y *= 0.985;
    boss.scale.z *= 0.985;

    // -------------------------------------------------
    // 目標位置まで飛んだら終了
    // -------------------------------------------------

    if (
        boss.position.x >= bossTargetX ||
        boss.position.y >= bossTargetY ||
        boss.position.z <= bossTargetZ
    ) {

        bossFlying = false;

        // 星演出を開始
        startStarEffect();

        console.log("ラスボス吹っ飛び終了！");
    }

}

// =====================================================
// 星キラーン演出の準備
// =====================================================

function startStarEffect() {

    showStar = true;

    // ボスが消えた位置に星を出す
    star.position.copy(boss.position);

    // 星は少し大きめに表示
    star.scale.set(
        1,
        1,
        1
    );

    star.visible = true;

    // ボスは見えなくする
    boss.visible = false;

    console.log("星キラーン開始！");
}
// =====================================================
// ⑧ 星キラーン演出
// =====================================================

// 星演出の開始時間
let starStartTime = 0;

// 星演出が始まったかどうか
let starStarted = false;

// 星演出の時間
const starDuration = 900;


// =====================================================
// 星キラーン更新
// =====================================================

function updateStar() {

    if (!showStar) return;

    // -------------------------------------------------
    // 星演出開始時の準備
    // -------------------------------------------------

    if (!starStarted) {

        starStarted = true;
        starStartTime = performance.now();

        console.log("星キラーン表示！");
    }

    // -------------------------------------------------
    // 星をキラッと回転・拡大
    // -------------------------------------------------

    star.rotation.x += 0.18;
    star.rotation.y += 0.22;
    star.rotation.z += 0.25;

    star.scale.x += 0.02;
    star.scale.y += 0.02;
    star.scale.z += 0.02;

    // -------------------------------------------------
    // 一定時間後に終了
    // -------------------------------------------------

    if (
        performance.now() - starStartTime
        >= starDuration
    ) {

        showStar = false;
        star.visible = false;
        starStarted = false;

        console.log("星キラーン終了！");

        // GAME CLEARへ
        showGameClear();

    }

}
// =====================================================
// ⑨ GAME CLEAR表示
// =====================================================

// GAME CLEARが表示されたか
let gameClearStarted = false;


// =====================================================
// GAME CLEAR開始
// =====================================================

function showGameClear() {

    // 二重実行を防止
    if (gameClearStarted) return;

    gameClearStarted = true;
    gameClear = true;

    // 画面中央に表示
    showMessage("GAME CLEAR!!");

    console.log("GAME CLEAR!!");

    // ⑩で紙吹雪を開始する
    startConfetti();

}


// =====================================================
// GAME CLEAR更新
// =====================================================

function updateGameClear() {

    // GAME CLEAR状態でなければ何もしない
    if (!gameClear) return;

    // 少しだけ文字を大きくしたり小さくしたりする
    const pulse =
        1 + Math.sin(performance.now() * 0.006) * 0.08;

    messageText.style.transform =
        `translate(-50%, -50%) scale(${pulse})`;

}
// =====================================================
// ⑩ 紙吹雪エフェクト
// =====================================================

const confettiPieces = [];
let confettiStarted = false;

// 紙吹雪の数
const confettiCount = 80;


// =====================================================
// 紙吹雪を作る
// =====================================================

function createConfetti() {

    for (let i = 0; i < confettiCount; i++) {

        const geometry = new THREE.BoxGeometry(
            0.08,
            0.08,
            0.02
        );

        const material = new THREE.MeshBasicMaterial({
            color: new THREE.Color(
                Math.random(),
                Math.random(),
                Math.random()
            )
        });

        const piece = new THREE.Mesh(
            geometry,
            material
        );

        piece.position.set(
            (Math.random() - 0.5) * 8,
            5 + Math.random() * 4,
            -2 + Math.random() * 4
        );

        piece.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );

        piece.userData = {
            fallSpeed: 0.02 + Math.random() * 0.04,
            spinSpeedX: Math.random() * 0.08,
            spinSpeedY: Math.random() * 0.08,
            spinSpeedZ: Math.random() * 0.08
        };

        piece.visible = false;

        scene.add(piece);
        confettiPieces.push(piece);
    }

}

createConfetti();


// =====================================================
// 紙吹雪開始
// =====================================================

function startConfetti() {

    if (confettiStarted) return;

    confettiStarted = true;

    for (const piece of confettiPieces) {
        piece.visible = true;
    }

    console.log("紙吹雪開始！");
}


// =====================================================
// 紙吹雪更新
// =====================================================

function updateConfetti() {

    if (!confettiStarted) return;

    for (const piece of confettiPieces) {

        piece.position.y -= piece.userData.fallSpeed;

        piece.rotation.x += piece.userData.spinSpeedX;
        piece.rotation.y += piece.userData.spinSpeedY;
        piece.rotation.z += piece.userData.spinSpeedZ;

        if (piece.position.y < -3) {

            piece.position.y = 5 + Math.random() * 3;
            piece.position.x = (Math.random() - 0.5) * 8;
            piece.position.z = -2 + Math.random() * 4;

        }

    }

}

animate();
