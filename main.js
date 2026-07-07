import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// ============================================================
// 基本設定
// ============================================================

// ゲームの制限時間です。テスト中だけ短くしたい場合は、ここを 10 などに変えます。
const GAME_SECONDS = 10;

// モンスターの最大HPです。今回は「命中したら倒れる」を見せたいので100にしています。
const MONSTER_MAX_HP = 100;

// 赤緑メガネの赤フィルムが左目なら "left"、右目なら "right" にします。
// 立体感が逆に見えるときはここを "right" に変えてください。
const RED_EYE = "left";

// 自分のGLBモンスターを使う場合は、models フォルダにGLBを入れてください。
// このコードは次の順番でモデルを探します。
// 1. index.html と同じ場所の models/monster_diorama.glb
// 2. ひとつ上の階層の models/monster_diorama.glb
// 今回の元コードに合わせて、ファイル名は monster_diorama.glb を優先しています。
const MONSTER_MODEL_PATHS = [
  "./models/monster_diorama.glb",
  "../models/monster_diorama.glb"
];

// ============================================================
// 画面上の部品を取得
// ============================================================

const timerEl = document.getElementById("timer");
const powerEl = document.getElementById("power");
const hpEl = document.getElementById("hp");
const scopeEl = document.getElementById("scope");
const chargeButton = document.getElementById("chargeButton");
const resultEl = document.getElementById("result");
const resultTitleEl = document.getElementById("resultTitle");
const resultMessageEl = document.getElementById("resultMessage");
const restartButton = document.getElementById("restartButton");

// ============================================================
// three.js の基本セット
// ============================================================

// シーンは3D空間全体です。
// テーマがジャングルなので、黒ではなく深い森の緑にします。
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x06140b);
scene.fog = new THREE.Fog(0x06140b, 10, 34);

// カメラは正面固定です。モンスターを中央に置いたまま狙えるようにします。
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.01,
  1000
);
camera.position.set(0, 1.2, 13);
camera.lookAt(0, 0.6, 0);

// レンダラーは実際に3Dを描く担当です。
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// ============================================================
// 赤緑メガネ用の手動アナグリフ合成
// ============================================================

// StereoCamera は左目用・右目用のカメラを作ってくれます。
const stereo = new THREE.StereoCamera();
stereo.aspect = camera.aspect;
stereo.eyeSep = 0.13;
camera.focus = 12;

// 左目用と右目用の絵を、いったん別々の画面に描きます。
const rtLeft = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
const rtRight = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);

// 左右の絵を赤チャンネル・緑チャンネルに合成するための専用シーンです。
const composeScene = new THREE.Scene();
const composeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const composeMaterial = new THREE.ShaderMaterial({
  uniforms: {
    tRedEye: { value: null },
    tGreenEye: { value: null }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    uniform sampler2D tRedEye;
    uniform sampler2D tGreenEye;
    void main() {
      vec3 redEyeColor = texture2D(tRedEye, vUv).rgb;
      vec3 greenEyeColor = texture2D(tGreenEye, vUv).rgb;

      // 色そのものではなく明るさを使うと、赤緑メガネで形が見やすくなります。
      float redLum = dot(redEyeColor, vec3(0.299, 0.587, 0.114));
      float greenLum = dot(greenEyeColor, vec3(0.299, 0.587, 0.114));
      gl_FragColor = vec4(redLum, greenLum, 0.0, 1.0);
    }
  `
});
composeScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), composeMaterial));

// ============================================================
// ライト
// ============================================================

scene.add(new THREE.AmbientLight(0xffffff, 1.35));

const keyLight = new THREE.PointLight(0xffffff, 2.5);
keyLight.position.set(5, 7, 6);
scene.add(keyLight);

const greenLight = new THREE.PointLight(0x54ff67, 2.8);
greenLight.position.set(-5, 3, 7);
scene.add(greenLight);

const redLight = new THREE.PointLight(0xff3030, 2.2);
redLight.position.set(5, 2, 5);
scene.add(redLight);

// ============================================================
// ジャングル背景
// ============================================================

// 背景の森をまとめて動かせるように、ひとつのグループに入れます。
const jungle = new THREE.Group();
scene.add(jungle);

// 地面です。モンスターの足元に暗い草地を置きます。
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(36, 34),
  new THREE.MeshStandardMaterial({
    color: 0x123016,
    emissive: 0x031006,
    emissiveIntensity: 0.4,
    roughness: 0.95
  })
);
ground.rotation.x = -Math.PI / 2;
ground.position.set(0, -2.15, -4);
jungle.add(ground);

// 遠景の木を作る関数です。
// 円柱を幹、丸い球を葉のかたまりとして使っています。
function createJungleTree(x, z, scale) {
  const tree = new THREE.Group();

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12 * scale, 0.22 * scale, 3.4 * scale, 10),
    new THREE.MeshStandardMaterial({
      color: 0x3a2414,
      emissive: 0x120805,
      emissiveIntensity: 0.35,
      roughness: 0.9
    })
  );
  trunk.position.y = -0.65 * scale;
  tree.add(trunk);

  const leafMaterial = new THREE.MeshStandardMaterial({
    color: 0x1d6b2a,
    emissive: 0x063815,
    emissiveIntensity: 0.65,
    roughness: 0.8
  });

  for (let i = 0; i < 5; i++) {
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.78 * scale, 18, 12), leafMaterial);
    canopy.scale.set(1.15, 0.72, 0.85);
    canopy.position.set(
      Math.sin(i * 1.8) * 0.44 * scale,
      (0.95 + i * 0.18) * scale,
      Math.cos(i * 1.3) * 0.26 * scale
    );
    tree.add(canopy);
  }

  tree.position.set(x, -1.25, z);
  return tree;
}

// 左右と奥に木を配置して、中央のモンスターを囲むような森にします。
const treePositions = [
  [-8.5, -7.5, 1.35],
  [-5.8, -10.5, 1.75],
  [-3.2, -13.0, 1.45],
  [3.2, -12.0, 1.55],
  [6.2, -9.2, 1.65],
  [8.4, -7.2, 1.3],
  [-9.8, -2.2, 1.0],
  [9.7, -2.6, 1.05]
];

treePositions.forEach(([x, z, scale]) => {
  jungle.add(createJungleTree(x, z, scale));
});

// 手前に大きな葉っぱを置くと、かなりジャングルらしくなります。
// Planeを葉っぱ型に見せるため、細長くして少し回転させています。
const frontLeafMaterial = new THREE.MeshStandardMaterial({
  color: 0x2f8f34,
  emissive: 0x063e12,
  emissiveIntensity: 0.6,
  side: THREE.DoubleSide,
  roughness: 0.7
});

for (let i = 0; i < 16; i++) {
  const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 1.85), frontLeafMaterial);
  const side = i % 2 === 0 ? -1 : 1;
  leaf.position.set(
    side * THREE.MathUtils.randFloat(5.2, 9.5),
    THREE.MathUtils.randFloat(-1.2, 2.8),
    THREE.MathUtils.randFloat(-1.5, 2.8)
  );
  leaf.rotation.set(
    THREE.MathUtils.randFloat(-0.4, 0.5),
    side * THREE.MathUtils.randFloat(0.7, 1.25),
    side * THREE.MathUtils.randFloat(0.25, 0.9)
  );
  leaf.scale.setScalar(THREE.MathUtils.randFloat(0.8, 1.7));
  jungle.add(leaf);
}

// 光る虫のような粒です。
// 宇宙の星ではなく、ジャングルの奥で小さく光る点として見せます。
const fireflyGeometry = new THREE.BufferGeometry();
const fireflyPositions = [];
for (let i = 0; i < 120; i++) {
  fireflyPositions.push(
    THREE.MathUtils.randFloatSpread(18),
    THREE.MathUtils.randFloat(-0.6, 5.8),
    THREE.MathUtils.randFloat(-12, 1)
  );
}
fireflyGeometry.setAttribute("position", new THREE.Float32BufferAttribute(fireflyPositions, 3));
const fireflies = new THREE.Points(
  fireflyGeometry,
  new THREE.PointsMaterial({
    color: 0xdfff65,
    size: 0.055,
    transparent: true,
    opacity: 0.8
  })
);
jungle.add(fireflies);

// ============================================================
// モンスター
// ============================================================

let monster;
let monsterHP = MONSTER_MAX_HP;
let monsterRadius = 1.8;
let monsterDefeated = false;
let monsterInitialScale = new THREE.Vector3(1, 1, 1);

// 赤緑メガネ表示では青い色が暗く見えやすいので、
// モンスターは「明るい黄緑寄りの不透明素材」にします。
// ここを変えるとGLBモンスター全体の見え方をまとめて調整できます。
function createMonsterMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0xf2ffe8,
    emissive: 0x7dff55,
    emissiveIntensity: 0.85,
    metalness: 0.05,
    roughness: 0.35,
    transparent: false,
    opacity: 1,
    side: THREE.DoubleSide
  });
}

// GLBがないときでもゲームが動くように、コードだけでモンスターを作ります。
function createFallbackMonster() {
  const group = new THREE.Group();
  group.name = "FallbackMonster";

  const bodyMaterial = createMonsterMaterial();

  const hornMaterial = new THREE.MeshStandardMaterial({
    color: 0xfff06a,
    emissive: 0x3c2a00,
    emissiveIntensity: 0.6,
    roughness: 0.18
  });

  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: 0xff2525,
    emissive: 0xff1414,
    emissiveIntensity: 2.5
  });

  // 体
  const body = new THREE.Mesh(new THREE.SphereGeometry(1.35, 42, 32), bodyMaterial);
  body.scale.set(1.25, 1.35, 0.9);
  body.position.y = 0.25;
  group.add(body);

  // お腹
  const belly = new THREE.Mesh(
    new THREE.SphereGeometry(0.72, 32, 20),
    new THREE.MeshStandardMaterial({
      color: 0x6fffd0,
      emissive: 0x063d2c,
      emissiveIntensity: 0.6,
      roughness: 0.35
    })
  );
  belly.scale.set(1.0, 0.82, 0.28);
  belly.position.set(0, -0.05, 1.02);
  group.add(belly);

  // 目
  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.16, 18, 12), eyeMaterial);
  leftEye.position.set(-0.45, 0.72, 1.05);
  group.add(leftEye);

  const rightEye = leftEye.clone();
  rightEye.position.x = 0.45;
  group.add(rightEye);

  // 角
  const hornGeometry = new THREE.ConeGeometry(0.22, 0.85, 18);
  const leftHorn = new THREE.Mesh(hornGeometry, hornMaterial);
  leftHorn.position.set(-0.55, 1.62, 0.05);
  leftHorn.rotation.z = 0.35;
  group.add(leftHorn);

  const rightHorn = leftHorn.clone();
  rightHorn.position.x = 0.55;
  rightHorn.rotation.z = -0.35;
  group.add(rightHorn);

  // 腕
  const armGeometry = new THREE.CapsuleGeometry(0.18, 1.0, 8, 16);
  const leftArm = new THREE.Mesh(armGeometry, bodyMaterial);
  leftArm.position.set(-1.65, 0.08, 0.05);
  leftArm.rotation.z = 0.75;
  group.add(leftArm);

  const rightArm = leftArm.clone();
  rightArm.position.x = 1.65;
  rightArm.rotation.z = -0.75;
  group.add(rightArm);

  // 足
  const footGeometry = new THREE.SphereGeometry(0.35, 24, 14);
  const leftFoot = new THREE.Mesh(footGeometry, bodyMaterial);
  leftFoot.scale.set(1.25, 0.55, 0.9);
  leftFoot.position.set(-0.55, -1.25, 0.32);
  group.add(leftFoot);

  const rightFoot = leftFoot.clone();
  rightFoot.position.x = 0.55;
  group.add(rightFoot);

  // 白いワイヤーを足すと、赤緑表示でも輪郭がわかりやすくなります。
  group.traverse((child) => {
    if (!child.isMesh) return;

    const wire = new THREE.LineSegments(
      new THREE.WireframeGeometry(child.geometry),
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.22
      })
    );
    child.add(wire);
  });

  return group;
}

// GLBモデルを読み込めたら使い、読み込めなければ自作モンスターを出します。
function loadMonster() {
  const loader = new GLTFLoader();

  // models フォルダの場所が環境によって違っても動きやすいように、
  // 複数の候補パスを順番に試します。
  function tryLoadModel(pathIndex) {
    const modelPath = MONSTER_MODEL_PATHS[pathIndex];

    // 候補を全部試しても読み込めなかったら、コードで作ったモンスターを表示します。
    if (!modelPath) {
      monster = createFallbackMonster();
      monster.position.set(0, 0, 0);
      monsterInitialScale.copy(monster.scale);
      scene.add(monster);
      return;
    }

    loader.load(
      modelPath,
      (gltf) => {
        const loadedModel = gltf.scene;
        loadedModel.scale.set(2.8, 2.8, 2.8);

        // 赤緑表示で見やすいように、不透明で明るい素材へ置き換えます。
        // 元のGLB素材が暗かったり半透明でも、ゲーム中ははっきり見えます。
        loadedModel.traverse((child) => {
          if (!child.isMesh) return;
          child.material = createMonsterMaterial();
        });

        // モデルの中心を親グループの原点に合わせます。
        // GLBの原点が足元や端にあっても、親グループを中央固定で扱えます。
        const box = new THREE.Box3().setFromObject(loadedModel);
        const center = box.getCenter(new THREE.Vector3());
        loadedModel.position.sub(center);

        monster = new THREE.Group();
        monster.add(loadedModel);
        monster.position.set(0, 0, 0);
        monsterInitialScale.copy(monster.scale);
        scene.add(monster);

        const finalBox = new THREE.Box3().setFromObject(monster);
        monsterRadius = finalBox.getSize(new THREE.Vector3()).length() * 0.22;
      },
      undefined,
      () => {
        tryLoadModel(pathIndex + 1);
      }
    );
  }

  tryLoadModel(0);
}

loadMonster();

// ============================================================
// 元気玉
// ============================================================

const spiritBall = new THREE.Group();
scene.add(spiritBall);

// 中心の明るい球です。
const ballCore = new THREE.Mesh(
  new THREE.SphereGeometry(1, 48, 32),
  new THREE.MeshStandardMaterial({
    color: 0xf4ff66,
    emissive: 0xb4ff20,
    emissiveIntensity: 1.7,
    transparent: true,
    opacity: 0.82,
    roughness: 0.08
  })
);
spiritBall.add(ballCore);

// 外側のぼんやりした光です。
const ballGlow = new THREE.Mesh(
  new THREE.SphereGeometry(1.18, 48, 32),
  new THREE.MeshBasicMaterial({
    color: 0x3cff73,
    transparent: true,
    opacity: 0.2,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
);
spiritBall.add(ballGlow);

// 元気玉自体もライトとして光らせます。
const ballLight = new THREE.PointLight(0xaaff55, 0, 12);
spiritBall.add(ballLight);

// 元気玉はモンスターの手前、少し下に置きます。
spiritBall.position.set(0, -1.65, 4.0);
spiritBall.scale.setScalar(0.001);

// ============================================================
// ゲーム状態
// ============================================================

let started = false;
let finished = false;
let launchStarted = false;
let startTime = 0;
let chargeCount = 0;
let power = 0;
let launchProgress = 0;
let scopeX = window.innerWidth / 2;
let scopeY = window.innerHeight / 2;

// ============================================================
// 座標変換と当たり判定
// ============================================================

// 3D空間の座標を、画面上のピクセル座標に変換します。
function worldToScreen(vector3, cam) {
  const v = vector3.clone().project(cam);
  return {
    x: (v.x * 0.5 + 0.5) * window.innerWidth,
    y: (-v.y * 0.5 + 0.5) * window.innerHeight
  };
}

// スコープの中心がモンスターに重なっているか調べます。
function isScopeOnMonster() {
  if (!monster) return false;

  const monsterCenter = new THREE.Vector3();
  monster.getWorldPosition(monsterCenter);
  monsterCenter.y += 0.35;

  const centerScreen = worldToScreen(monsterCenter, camera);
  const edgeScreen = worldToScreen(
    monsterCenter.clone().add(new THREE.Vector3(monsterRadius, 0, 0)),
    camera
  );

  const hitRadiusPx = Math.max(42, Math.hypot(edgeScreen.x - centerScreen.x, edgeScreen.y - centerScreen.y));
  const distPx = Math.hypot(scopeX - centerScreen.x, scopeY - centerScreen.y);

  return distPx <= hitRadiusPx;
}

// ============================================================
// 入力
// ============================================================

// スコープは画面中央に固定します。
// マウスや指の位置ではなく、常に画面の真ん中で狙います。
function updateFixedScopePosition() {
  scopeX = window.innerWidth / 2;
  scopeY = window.innerHeight / 2;
  scopeEl.style.left = `${scopeX}px`;
  scopeEl.style.top = `${scopeY}px`;
}

updateFixedScopePosition();

// ボタンを押すたびに元気玉が大きくなります。
function chargeSpiritBall() {
  if (finished || launchStarted) return;

  // 最初に押した瞬間から60秒タイマーを開始します。
  if (!started) {
    started = true;
    startTime = performance.now();
  }

  chargeCount += 1;

  // 連打数をそのまま大きさにすると暴れすぎるので、
  // 上限に近づくほどゆるやかに増える計算にしています。
  power = Math.min(100, Math.floor(100 * (1 - Math.exp(-chargeCount / 70))));

  // 押した瞬間に光を強くして、連打している感触を出します。
  ballCore.material.emissiveIntensity = 1.9 + power * 0.04;
  ballGlow.material.opacity = 0.18 + power * 0.006;
  ballLight.intensity = power * 0.08;

  updateHud();
}

chargeButton.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  chargeSpiritBall();
});

// ============================================================
// タイマー・発射・結果
// ============================================================

function getRemainingSeconds() {
  if (!started) return GAME_SECONDS;
  const elapsed = (performance.now() - startTime) / 1000;
  return Math.max(0, GAME_SECONDS - elapsed);
}

function startLaunch() {
  if (launchStarted || finished) return;

  launchStarted = true;
  chargeButton.disabled = true;
  chargeButton.textContent = "発射！";
  launchProgress = 0;
}

function finishBattle(didHit) {
  if (finished) return;

  finished = true;

  if (didHit) {
    // 命中したらHPを削ります。
    // しっかり連打していれば、ほぼ一撃で倒せます。
    const damage = Math.max(60, power + Math.floor(chargeCount / 3));
    monsterHP = Math.max(0, monsterHP - damage);
  }

  if (didHit && monsterHP <= 0) {
    monsterDefeated = true;
    resultTitleEl.textContent = "GAME CLEAR";
    resultMessageEl.textContent = `命中！POWER ${power} の元気玉でモンスターを倒した！`;
  } else if (didHit) {
    resultTitleEl.textContent = "HIT";
    resultMessageEl.textContent = `当たったけど倒しきれない！残りHP ${monsterHP}`;
  } else {
    resultTitleEl.textContent = "MISS";
    resultMessageEl.textContent = "スコープが外れていた！もう一回ねらおう。";
  }

  chargeButton.disabled = true;
  resultEl.classList.add("visible");
  updateHud();
}

function resetGame() {
  started = false;
  finished = false;
  launchStarted = false;
  monsterDefeated = false;
  startTime = 0;
  chargeCount = 0;
  power = 0;
  launchProgress = 0;
  monsterHP = MONSTER_MAX_HP;

  spiritBall.position.set(0, -1.65, 4.0);
  spiritBall.scale.setScalar(0.001);
  spiritBall.visible = true;

  if (monster) {
    monster.position.set(0, 0, 0);
    monster.rotation.set(0, 0, 0);
    monster.scale.copy(monsterInitialScale);
  }

  chargeButton.disabled = false;
  chargeButton.textContent = "連打して元気玉をためる";
  resultEl.classList.remove("visible");
  updateHud();
}

restartButton.addEventListener("click", resetGame);

function updateHud() {
  timerEl.textContent = getRemainingSeconds().toFixed(1);
  powerEl.textContent = String(power);
  hpEl.textContent = String(monsterHP);
}

// ============================================================
// アニメーション
// ============================================================

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const t = now * 0.001;

  // モンスターは中央固定。
  // 位置を左右へ動かさず、呼吸と回転だけで生きている感じを出します。
  if (monster) {
    if (monsterDefeated) {
      monster.rotation.z = THREE.MathUtils.lerp(monster.rotation.z, -Math.PI / 2, 0.05);
      monster.position.y = THREE.MathUtils.lerp(monster.position.y, -1.1, 0.05);
    } else {
      monster.position.x = 0;
      monster.position.y = Math.sin(t * 2) * 0.04;
      monster.rotation.y = Math.sin(t * 0.7) * 0.22;
    }
  }

  // ジャングルの葉っぱが少し揺れているように見せます。
  jungle.rotation.y = Math.sin(t * 0.25) * 0.012;
  fireflies.position.y = Math.sin(t * 1.5) * 0.08;

  // スコープがモンスターに乗っている時だけ光らせます。
  scopeEl.classList.toggle("hit-ready", isScopeOnMonster() && !finished);

  // 連打量に応じて元気玉をふくらませます。
  if (!launchStarted) {
    const targetScale = THREE.MathUtils.lerp(0.18, 2.25, power / 100);
    const pulse = 1 + Math.sin(t * 8) * 0.035;
    spiritBall.scale.setScalar(THREE.MathUtils.lerp(spiritBall.scale.x, targetScale * pulse, 0.18));
    spiritBall.rotation.y += 0.015 + power * 0.0008;
    spiritBall.rotation.x += 0.009;
  }

  // 制限時間が終わったら自動で元気玉が飛んでいきます。
  if (started && !launchStarted && getRemainingSeconds() <= 0) {
    startLaunch();
  }

  // 発射中は、元気玉をモンスター方向へ飛ばします。
  if (launchStarted && !finished) {
    launchProgress = Math.min(1, launchProgress + 0.018);

    const start = new THREE.Vector3(0, -1.65, 4.0);
    const end = new THREE.Vector3(0, 0.45, 0.2);
    spiritBall.position.lerpVectors(start, end, launchProgress);
    spiritBall.scale.setScalar(THREE.MathUtils.lerp(2.0 + power / 55, 0.75, launchProgress));

    if (launchProgress >= 1) {
      finishBattle(isScopeOnMonster());
    }
  }

  updateHud();
  renderAnaglyph();
}

// 左右の視点で描いたあと、赤緑画面として合成します。
function renderAnaglyph() {
  camera.updateMatrixWorld();
  stereo.update(camera);

  renderer.setRenderTarget(rtLeft);
  renderer.render(scene, stereo.cameraL);

  renderer.setRenderTarget(rtRight);
  renderer.render(scene, stereo.cameraR);

  if (RED_EYE === "left") {
    composeMaterial.uniforms.tRedEye.value = rtLeft.texture;
    composeMaterial.uniforms.tGreenEye.value = rtRight.texture;
  } else {
    composeMaterial.uniforms.tRedEye.value = rtRight.texture;
    composeMaterial.uniforms.tGreenEye.value = rtLeft.texture;
  }

  renderer.setRenderTarget(null);
  renderer.render(composeScene, composeCamera);
}

animate();

// ============================================================
// リサイズ対応
// ============================================================

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  rtLeft.setSize(window.innerWidth, window.innerHeight);
  rtRight.setSize(window.innerWidth, window.innerHeight);

  stereo.aspect = camera.aspect;
  updateFixedScopePosition();
});
