const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const coinEl = document.getElementById('coin-display');
const speedEl = document.getElementById('speed-display');
const themeBadgeEl = document.getElementById('theme-badge');
const buffBarEl = document.getElementById('buff-bar');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayDesc = document.getElementById('overlay-desc');
const finalScoreEl = document.getElementById('final-score');
const startBtn = document.getElementById('start-btn');

const btnJump = document.getElementById('btn-jump');
const btnSlide = document.getElementById('btn-slide');

// ==========================================
// 1. 七大關卡視覺與色彩設定（支援平滑 RGB 漸變過渡）
// ==========================================
const THEMES = [
  {
    id: 'forest',
    name: '🌲 迷霧森林',
    skyTop: [4, 47, 46],
    skyBottom: [6, 95, 70],
    bgFar: [2, 44, 34],
    bgNear: [6, 78, 59],
    groundFill: [41, 29, 24],
    groundTop: [34, 197, 94],
    ambient: 'firefly'
  },
  {
    id: 'suburb',
    name: '🏡 寧靜郊區',
    skyTop: [14, 116, 144],
    skyBottom: [56, 189, 248],
    bgFar: [2, 132, 199],
    bgNear: [21, 128, 61],
    groundFill: [68, 64, 60],
    groundTop: [132, 204, 22],
    ambient: 'dandelion'
  },
  {
    id: 'ancient',
    name: '🏯 滄桑古城',
    skyTop: [69, 26, 3],
    skyBottom: [180, 83, 9],
    bgFar: [120, 53, 15],
    bgNear: [68, 64, 60],
    groundFill: [41, 37, 36],
    groundTop: [217, 119, 6],
    ambient: 'leaves'
  },
  {
    id: 'mountain',
    name: '⛰️ 險峻山路',
    skyTop: [30, 58, 138],
    skyBottom: [147, 197, 253],
    bgFar: [51, 65, 85],
    bgNear: [71, 85, 105],
    groundFill: [51, 65, 85],
    groundTop: [226, 232, 240],
    ambient: 'mist'
  },
  {
    id: 'volcano',
    name: '🌋 熔岩火山',
    skyTop: [42, 4, 4],
    skyBottom: [127, 29, 29],
    bgFar: [28, 2, 2],
    bgNear: [69, 10, 10],
    groundFill: [28, 25, 23],
    groundTop: [249, 115, 22],
    ambient: 'ember'
  },
  {
    id: 'city',
    name: '🏙️ 霓虹城市',
    skyTop: [5, 8, 17],
    skyBottom: [30, 27, 75],
    bgFar: [9, 13, 22],
    bgNear: [15, 23, 42],
    groundFill: [15, 23, 42],
    groundTop: [56, 189, 248],
    ambient: 'rain'
  },
  {
    id: 'dream',
    name: '🌌 幻境夢境',
    skyTop: [30, 11, 54],
    skyBottom: [107, 33, 168],
    bgFar: [46, 16, 101],
    bgNear: [88, 28, 135],
    groundFill: [59, 7, 100],
    groundTop: [244, 114, 182],
    ambient: 'star'
  }
];

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function lerpColor(c1, c2, t) {
  return `rgb(${lerp(c1[0], c2[0], t)}, ${lerp(c1[1], c2[1], t)}, ${lerp(c1[2], c2[2], t)})`;
}

// ==========================================
// 2. 遊戲全域狀態與拉近鏡頭參數 (640x360)
// ==========================================
let isPlaying = false;
let animationId;
let distance = 0;
let coins = 0;
let baseSpeed = 5.6;
let currentSpeed = 5.6;
let frameCount = 0;
let screenShake = 0;

let activeThemeIdx = 0;
let prevThemeIdx = 0;
let themeTransition = 1;

const GROUND_Y = 304;
const GRAVITY = 0.62;
const FAST_FALL_SPEED = 23;
const JUMP_FORCE = -11.6;
const DOUBLE_JUMP_FORCE = -10.6;

// 三層疊疊樂浮板標準高度
const LAYER_1_Y = GROUND_Y - 68;   // 236
const LAYER_2_Y = GROUND_Y - 134;  // 170
const LAYER_3_Y = GROUND_Y - 198;  // 106

const player = {
  x: 96,
  y: GROUND_Y - 52,
  normalW: 30,
  normalH: 52,
  slideW: 52,
  slideH: 23,
  w: 30,
  h: 52,
  vy: 0,
  jumpCount: 0,
  isSliding: false,
  downHeld: false,
  isFastFalling: false,
  isGrounded: true,
  standingPad: null,     // 目前腳下踩著哪一塊浮板
  dropThroughPad: null,  // 剛「主動按下」下蹲穿過的浮板
  hp: 100,
  maxHp: 100,
  invincibleTimer: 0,
  runCycle: 0,
  flipAngle: 0,
  afterimages: [],
  magnetTimer: 0,
  tripleJumpTimer: 0
};

let platforms = [];
let floatPads = [];
let obstacles = [];
let collectibles = [];
let particles = [];
let bgClouds = [];
let bgFarItems = [];
let bgNearItems = [];
let groundProps = [];
let ambientParticles = [];
let worldCursorX = 0;

function initBackground() {
  bgClouds = [];
  bgFarItems = [];
  bgNearItems = [];
  groundProps = [];
  ambientParticles = [];

  for (let i = 0; i < 8; i++) {
    bgClouds.push({
      x: i * 110,
      y: 25 + Math.random() * 65,
      w: 50 + Math.random() * 55
    });
  }

  for (let i = 0; i < 16; i++) {
    bgFarItems.push({
      x: i * 55,
      w: 50 + Math.random() * 50,
      h: 100 + Math.random() * 115
    });
    bgNearItems.push({
      x: i * 48,
      w: 42 + Math.random() * 44,
      h: 55 + Math.random() * 80
    });
  }

  for (let i = 0; i < 32; i++) {
    ambientParticles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: 1.5 + Math.random() * 2.5,
      speedX: -1 - Math.random() * 1.8,
      phase: Math.random() * Math.PI * 2
    });
  }
}

function initWorld() {
  platforms = [];
  floatPads = [];
  obstacles = [];
  collectibles = [];
  particles = [];

  distance = 0;
  coins = 0;
  currentSpeed = baseSpeed;
  frameCount = 0;
  screenShake = 0;
  activeThemeIdx = 0;
  prevThemeIdx = 0;
  themeTransition = 1;

  scoreEl.textContent = '0';
  coinEl.textContent = '0';
  themeBadgeEl.textContent = THEMES[0].name;

  player.y = GROUND_Y - player.normalH;
  player.vy = 0;
  player.jumpCount = 0;
  player.isSliding = false;
  player.downHeld = false;
  player.isFastFalling = false;
  player.isGrounded = true;
  player.standingPad = null;
  player.dropThroughPad = null;
  player.w = player.normalW;
  player.h = player.normalH;
  player.hp = player.maxHp;
  player.invincibleTimer = 0;
  player.runCycle = 0;
  player.flipAngle = 0;
  player.afterimages = [];
  player.magnetTimer = 0;
  player.tripleJumpTimer = 0;

  initBackground();

  addPlatformSegment(0, 720, 0);
  addCoinLine(220, GROUND_Y - 18, 5, 28, 'small');
  addFloatPad(420, LAYER_1_Y, 150, 0);
  addCoinLine(440, LAYER_1_Y - 18, 4, 30, 'medium');
  worldCursorX = 720;

  while (worldCursorX < canvas.width + 950) {
    appendNextTemplate();
  }
}

// ==========================================
// 3. 障礙物置中對齊拋物線與物件生成輔助函式
// ==========================================
function addPlatformSegment(x, w, themeIdx) {
  platforms.push({ x, w, y: GROUND_Y, themeIdx });
  for (let px = x + 18; px < x + w - 18; px += 34 + Math.random() * 40) {
    groundProps.push({
      x: px,
      y: GROUND_Y,
      type: Math.floor(Math.random() * 4),
      themeIdx
    });
  }
}

function addFloatPad(x, y, w, themeIdx) {
  floatPads.push({ x, y, w, h: 11, themeIdx });
}

function addCoin(x, y, type = 'small') {
  const value = type === 'large' ? 3 : type === 'medium' ? 2 : 1;
  const radius = type === 'large' ? 10.5 : type === 'medium' ? 8.2 : 6.2;
  collectibles.push({
    kind: 'coin',
    coinType: type,
    value,
    x,
    y,
    r: radius,
    phase: Math.random() * Math.PI * 2
  });
}

function addCoinLine(startX, y, count, spacing, type = 'small') {
  for (let i = 0; i < count; i++) {
    addCoin(startX + i * spacing, y, type);
  }
}

/**
 * 修正重點 1：以「目標中心點 centerX」為拋物線最高點對稱展開！
 * 確保金幣弧線永遠正對障礙物中心（或深淵坑洞正中央），不會隨速度加快而往右跑偏。
 */
function addCenteredJumpArc(centerX, surfaceY, jumpForce, speed, count = 5, type = 'small') {
  const startCenterY = surfaceY - 26;
  const peakTime = Math.abs(jumpForce / GRAVITY); // 到達最高點所需的幀數
  const totalFrames = peakTime * 2;
  // 起跳 X 座標 = 最高點中心 X - 水平飛到最高點的距離
  const takeoffX = centerX - speed * peakTime;

  for (let i = 0; i < count; i++) {
    const ratio = count === 1 ? 0.5 : 0.16 + (i / (count - 1)) * 0.68;
    const t = totalFrames * ratio;
    const cx = takeoffX + speed * t;
    const cy = startCenterY + jumpForce * t + 0.5 * GRAVITY * t * t;
    const coinTier = (i === Math.floor(count / 2) && count >= 5) ? 'medium' : type;
    addCoin(cx, cy, coinTier);
  }
}

function addSkillOrb(x, y, skill) {
  collectibles.push({
    kind: 'skill',
    skill,
    x,
    y,
    r: 13.5,
    phase: Math.random() * Math.PI * 2
  });
}

// 放置障礙物，並回傳障礙物物件（方便取得精確寬度來對齊金幣）
function addObstacle(themeId, categoryIdx, variant, x, customSurfaceY = GROUND_Y) {
  const specs = {
    forest: [
      { type: 'f_tree', w: [36, 46, 40][variant], h: [44, 78, 60][variant], air: false },
      { type: 'f_mushroom', w: [34, 52, 42][variant], h: [26, 32, 38][variant], air: false },
      { type: 'f_trap', w: [34, 50, 38][variant], h: [24, 28, 34][variant], air: false },
      { type: 'f_bird', w: 38, h: 26, air: true, yOff: [60, 58, 114][variant], speed: [1.1, 1.6, 1.3][variant], wave: 5 },
      { type: 'f_vine', w: 26, h: [92, 128, 124][variant], air: true, yOff: [150, 162, 160][variant], sway: variant === 2 },
      { type: 'f_log', w: [32, 36, 44][variant], h: [32, 36, 44][variant], air: false, rollSpeed: [0.9, 2.0, 1.4][variant] }
    ],
    suburb: [
      { type: 's_fence', w: [40, 44, 54][variant], h: [40, 74, 56][variant], air: false },
      { type: 's_hydrant', w: [28, 46, 32][variant], h: [34, 42, 64][variant], air: false },
      { type: 's_sign', w: [30, 34, 46][variant], h: [42, 76, 58][variant], air: false },
      { type: 's_kite', w: 40, h: 28, air: true, yOff: [60, 114, 62][variant], speed: [0.9, 1.1, 1.5][variant], wave: 7 },
      { type: 's_wire', w: 50, h: 32, air: true, yOff: [64, 60, 112][variant], speed: 0, wave: 0 },
      { type: 's_mower', w: [40, 44, 48][variant], h: [28, 30, 34][variant], air: false, rollSpeed: [1.3, 2.4, 1.8][variant] }
    ],
    ancient: [
      { type: 'a_pillar', w: [34, 40, 52][variant], h: [46, 80, 58][variant], air: false },
      { type: 'a_statue', w: [36, 42, 54][variant], h: [42, 70, 50][variant], air: false },
      { type: 'a_spikes', w: [38, 58, 46][variant], h: [24, 28, 36][variant], air: false },
      { type: 'a_arrow', w: 44, h: 20, air: true, yOff: [58, 112, 60][variant], speed: [2.0, 1.8, 3.0][variant], wave: 2 },
      { type: 'a_bell', w: 36, h: [88, 124, 120][variant], air: true, yOff: [148, 158, 156][variant], sway: variant === 2 },
      { type: 'a_wheel', w: [38, 48, 42][variant], h: [38, 48, 42][variant], air: false, rollSpeed: [1.1, 0.9, 2.2][variant] }
    ],
    mountain: [
      { type: 'm_rock', w: [40, 48, 58][variant], h: [44, 78, 58][variant], air: false },
      { type: 'm_ice', w: [34, 38, 54][variant], h: [38, 70, 44][variant], air: false },
      { type: 'm_post', w: [30, 48, 52][variant], h: [40, 46, 54][variant], air: false },
      { type: 'm_eagle', w: 42, h: 28, air: true, yOff: [60, 114, 62][variant], speed: [1.4, 1.2, 2.1][variant], wave: 7 },
      { type: 'm_icicle', w: 30, h: [88, 126, 122][variant], air: true, yOff: [150, 160, 158][variant], sway: false },
      { type: 'm_boulder', w: [34, 46, 38][variant], h: [34, 46, 38][variant], air: false, rollSpeed: [1.4, 1.1, 2.3][variant] }
    ],
    volcano: [
      { type: 'v_obsidian', w: [38, 46, 56][variant], h: [44, 78, 58][variant], air: false },
      { type: 'v_geyser', w: [34, 38, 54][variant], h: [42, 72, 46][variant], air: false },
      { type: 'v_totem', w: [32, 48, 36][variant], h: [46, 54, 74][variant], air: false },
      { type: 'v_wheel', w: 38, h: 38, air: true, yOff: [64, 118, 64][variant], speed: [0.7, 0.7, 1.4][variant], wave: 4 },
      { type: 'v_meteor', w: 36, h: 36, air: true, yOff: [64, 116, 100][variant], speed: [1.8, 1.6, 2.5][variant], drop: variant === 2 ? 0.8 : 0 },
      { type: 'v_lavaball', w: [32, 44, 36][variant], h: [32, 44, 36][variant], air: false, rollSpeed: [1.5, 1.1, 2.6][variant] }
    ],
    city: [
      { type: 'c_container', w: [44, 46, 60][variant], h: [42, 76, 48][variant], air: false },
      { type: 'c_tesla', w: [36, 40, 54][variant], h: [44, 74, 50][variant], air: false },
      { type: 'c_barrier', w: [34, 52, 36][variant], h: [36, 40, 70][variant], air: false },
      { type: 'c_drone', w: 42, h: 28, air: true, yOff: [60, 114, 62][variant], speed: [0.9, 0.9, 1.6][variant], wave: 5 },
      { type: 'c_missile', w: 48, h: 22, air: true, yOff: [58, 110, 60][variant], speed: [2.5, 2.2, 3.6][variant], wave: 2 },
      { type: 'c_bot', w: [38, 48, 40][variant], h: [28, 36, 30][variant], air: false, rollSpeed: [1.4, 1.0, 2.7][variant] }
    ],
    dream: [
      { type: 'd_crystal', w: [36, 44, 54][variant], h: [46, 80, 60][variant], air: false },
      { type: 'd_rift', w: [36, 52, 46][variant], h: [32, 40, 64][variant], air: false },
      { type: 'd_chess', w: [32, 38, 42][variant], h: [42, 64, 80][variant], air: false },
      { type: 'd_eye', w: 38, h: 34, air: true, yOff: [62, 116, 64][variant], speed: [1.3, 1.3, 2.0][variant], wave: 8 },
      { type: 'd_clock', w: 40, h: 40, air: true, yOff: [64, 118, 64][variant], speed: [1.1, 1.1, 2.3][variant], wave: 4 },
      { type: 'd_orb', w: [34, 42, 38][variant], h: [34, 42, 38][variant], air: false, rollSpeed: [1.7, 2.2, 3.2][variant] }
    ]
  };

  const themeSpecs = specs[themeId] || specs.forest;
  const s = themeSpecs[categoryIdx % themeSpecs.length];
  const baseY = s.air ? customSurfaceY - s.yOff : customSurfaceY - s.h;

  const obsObj = {
    visual: s.type,
    x,
    baseY,
    y: baseY,
    w: s.w,
    h: s.h,
    air: !!s.air,
    speedBonus: (s.speed || 0) + (s.rollSpeed || 0),
    waveAmp: s.wave || 0,
    vyDrop: s.drop || 0,
    sway: !!s.sway,
    damage: 22,
    phase: Math.random() * Math.PI * 2
  };
  obstacles.push(obsObj);
  return obsObj;
}

// ==========================================
// 4. 零錯位模板庫（金幣 100% 置中對齊障礙物與深淵坑洞）
// ==========================================
function buildTemplate(themeId, themeIdx, tplIndex, startX, speedRatio) {
  const S = (val) => Math.round(val * speedRatio);
  const effSpeed = baseSpeed * speedRatio;

  const maybeSpawnSkill = (sx, sy) => {
    if (Math.random() < 0.24) {
      const skills = ['magnet', 'heal', 'triple', 'bomb'];
      addSkillOrb(sx, sy, skills[Math.floor(Math.random() * skills.length)]);
    }
  };

  switch (tplIndex) {
    // ---------------- 簡單級模板 (0 ~ 6，對應 1~7 號) ----------------
    case 0: { // 單矮障 + 正中央對齊拋物線金幣
      const totalW = S(460);
      addPlatformSegment(startX, totalW, themeIdx);
      const obs = addObstacle(themeId, 0, 0, startX + S(230));
      addCenteredJumpArc(obs.x + obs.w / 2, GROUND_Y, JUMP_FORCE, effSpeed, 5, 'small');
      return totalW;
    }
    case 1: { // 高空低飛障礙 + 貼地滑行正下方整齊金幣列
      const totalW = S(460);
      addPlatformSegment(startX, totalW, themeIdx);
      const obs = addObstacle(themeId, 3, 0, startX + S(230));
      const coinSpacing = S(24);
      const coinCount = 5;
      const startCoinX = (obs.x + obs.w / 2) - ((coinCount - 1) * coinSpacing) / 2;
      addCoinLine(startCoinX, GROUND_Y - 13, coinCount, coinSpacing, 'medium');
      return totalW;
    }
    case 2: { // 雙層疊疊樂浮板（1層 -> 2層階梯跳躍）
      const totalW = S(540);
      addPlatformSegment(startX, totalW, themeIdx);
      addFloatPad(startX + S(100), LAYER_1_Y, S(150), themeIdx);
      addCoinLine(startX + S(120), LAYER_1_Y - 16, 4, S(32), 'small');
      addFloatPad(startX + S(280), LAYER_2_Y, S(160), themeIdx);
      addCoinLine(startX + S(300), LAYER_2_Y - 16, 4, S(34), 'medium');
      addCoin(startX + S(430), LAYER_2_Y - 22, 'large');
      return totalW;
    }
    case 3: { // 動態寬度深淵坑洞 + 正中央對齊跨坑拋物線金幣
      const p1W = S(180);
      const gapW = S(120);
      const p2W = S(220);
      addPlatformSegment(startX, p1W, themeIdx);
      const gapCenterX = startX + p1W + gapW / 2;
      addCenteredJumpArc(gapCenterX, GROUND_Y, JUMP_FORCE, effSpeed, 5, 'small');
      addPlatformSegment(startX + p1W + gapW, p2W, themeIdx);
      maybeSpawnSkill(startX + p1W + gapW + S(110), GROUND_Y - 26);
      return p1W + gapW + p2W;
    }
    case 4: { // 雙連矮障快節奏單跳（兩組弧線分別正對兩個障礙物中心）
      const totalW = S(620);
      addPlatformSegment(startX, totalW, themeIdx);
      const obs1 = addObstacle(themeId, 1, 0, startX + S(180));
      addCenteredJumpArc(obs1.x + obs1.w / 2, GROUND_Y, JUMP_FORCE, effSpeed, 4, 'small');
      const obs2 = addObstacle(themeId, 2, 0, startX + S(420));
      addCenteredJumpArc(obs2.x + obs2.w / 2, GROUND_Y, JUMP_FORCE, effSpeed, 4, 'small');
      return totalW;
    }
    case 5: { // 浮板上方躲避地面滾石 + 浮板穿層下跳吃大金幣
      const totalW = S(520);
      addPlatformSegment(startX, totalW, themeIdx);
      addFloatPad(startX + S(90), LAYER_1_Y, S(165), themeIdx);
      addCoinLine(startX + S(115), LAYER_1_Y - 16, 3, S(36), 'small');
      addObstacle(themeId, 5, 0, startX + S(330));
      addCoin(startX + S(390), GROUND_Y - 20, 'large');
      return totalW;
    }
    case 6: { // 上下分流選擇：走浮板吃中金幣，或走地面滑行過障礙
      const totalW = S(500);
      addPlatformSegment(startX, totalW, themeIdx);
      addFloatPad(startX + S(140), LAYER_1_Y, S(200), themeIdx);
      addCoinLine(startX + S(165), LAYER_1_Y - 16, 4, S(38), 'medium');
      const obs = addObstacle(themeId, 3, 0, startX + S(220));
      addCoinLine(obs.x - S(15), GROUND_Y - 13, 3, S(28), 'small');
      return totalW;
    }

    // ---------------- 中等級模板 (7 ~ 13，對應 8~14 號) ----------------
    case 7: { // 三層疊疊樂浮板雲梯（1層 -> 2層 -> 3層直衝雲霄）
      const totalW = S(660);
      addPlatformSegment(startX, totalW, themeIdx);
      addFloatPad(startX + S(80), LAYER_1_Y, S(135), themeIdx);
      addCoinLine(startX + S(98), LAYER_1_Y - 16, 3, S(34), 'small');

      addFloatPad(startX + S(245), LAYER_2_Y, S(135), themeIdx);
      addCoinLine(startX + S(263), LAYER_2_Y - 16, 3, S(34), 'medium');

      addFloatPad(startX + S(410), LAYER_3_Y, S(155), themeIdx);
      addCoinLine(startX + S(428), LAYER_3_Y - 16, 3, S(36), 'large');
      maybeSpawnSkill(startX + S(550), LAYER_3_Y - 22);
      return totalW;
    }
    case 8: { // 雙層並排空襲陣（強制滑行）+ 滑行後立刻起跳接浮板
      const totalW = S(600);
      addPlatformSegment(startX, totalW, themeIdx);
      const airX = startX + S(190);
      addObstacle(themeId, 3, 0, airX);
      addObstacle(themeId, 3, 1, airX + 15);
      addObstacle(themeId, 3, 0, airX + S(45));
      addCoinLine(airX - S(10), GROUND_Y - 13, 5, S(25), 'medium');

      addFloatPad(startX + S(380), LAYER_1_Y, S(145), themeIdx);
      addCoin(startX + S(452), LAYER_1_Y - 20, 'large');
      return totalW;
    }
    case 9: { // 高聳巨障（強制二段跳）+ 正中央對齊高空拋物線金幣弧線
      const totalW = S(560);
      addPlatformSegment(startX, totalW, themeIdx);
      const obs = addObstacle(themeId, 0, 1, startX + S(260));
      addCenteredJumpArc(obs.x + obs.w / 2, GROUND_Y, JUMP_FORCE * 1.38, effSpeed, 5, 'medium');
      addCoin(obs.x + obs.w / 2, GROUND_Y - 126, 'large');
      return totalW;
    }
    case 10: { // 浮板＋浮板障礙（逼迫在浮板上再按一下下蹲穿層掉回地面）
      const totalW = S(640);
      addPlatformSegment(startX, totalW, themeIdx);
      addFloatPad(startX + S(100), LAYER_1_Y, S(350), themeIdx);
      addCoinLine(startX + S(125), LAYER_1_Y - 16, 3, S(32), 'small');
      addObstacle(themeId, 1, 0, startX + S(300), LAYER_1_Y);
      addCoinLine(startX + S(295), GROUND_Y - 16, 4, S(34), 'large');
      return totalW;
    }
    case 11: { // 寬深淵坑洞 + 雙浮板接力跨海跳
      const p1W = S(160);
      const gapTotal = S(320);
      const p2W = S(190);
      addPlatformSegment(startX, p1W, themeIdx);
      addFloatPad(startX + p1W + S(45), LAYER_1_Y + 15, S(100), themeIdx);
      addCoin(startX + p1W + S(95), LAYER_1_Y - 6, 'medium');
      addFloatPad(startX + p1W + S(185), LAYER_1_Y - 15, S(100), themeIdx);
      addCoin(startX + p1W + S(235), LAYER_1_Y - 36, 'large');
      addPlatformSegment(startX + p1W + gapTotal, p2W, themeIdx);
      return p1W + gapTotal + p2W;
    }
    case 12: { // 矮障起跳 -> 空中速降接貼地滑行
      const totalW = S(620);
      addPlatformSegment(startX, totalW, themeIdx);
      const obs1 = addObstacle(themeId, 2, 0, startX + S(170));
      addCenteredJumpArc(obs1.x + obs1.w / 2, GROUND_Y, JUMP_FORCE, effSpeed, 3, 'medium');
      const obs2 = addObstacle(themeId, 4, 1, startX + S(370));
      addCoinLine(obs2.x - S(20), GROUND_Y - 13, 4, S(24), 'medium');
      return totalW;
    }
    case 13: { // 疊疊樂雙層浮板 + 地面尖刺封鎖
      const totalW = S(640);
      addPlatformSegment(startX, totalW, themeIdx);
      addObstacle(themeId, 2, 1, startX + S(200));
      addObstacle(themeId, 2, 1, startX + S(295));
      addObstacle(themeId, 2, 1, startX + S(390));

      addFloatPad(startX + S(125), LAYER_1_Y, S(135), themeIdx);
      addFloatPad(startX + S(300), LAYER_2_Y, S(155), themeIdx);
      addCoinLine(startX + S(318), LAYER_2_Y - 16, 4, S(34), 'large');
      maybeSpawnSkill(startX + S(540), GROUND_Y - 26);
      return totalW;
    }

    // ---------------- 最難級模板 (14 ~ 19，對應 15~20 號 & 夢境全模板) ----------------
    case 14: { // 三層疊疊樂極限穿層挑戰
      const totalW = S(740);
      addPlatformSegment(startX, totalW, themeIdx);
      addFloatPad(startX + S(90), LAYER_1_Y, S(125), themeIdx);
      addFloatPad(startX + S(235), LAYER_2_Y, S(135), themeIdx);
      addFloatPad(startX + S(390), LAYER_3_Y, S(165), themeIdx);

      addCoinLine(startX + S(410), LAYER_3_Y - 16, 3, S(36), 'large');
      addObstacle(themeId, 3, 0, startX + S(500));
      addObstacle(themeId, 3, 1, startX + S(515));
      addCoinLine(startX + S(490), GROUND_Y - 13, 4, S(25), 'large');
      return totalW;
    }
    case 15: { // 無底深淵三連浮板極限跳躍
      const p1W = S(150);
      const gapW = S(450);
      const p2W = S(170);
      addPlatformSegment(startX, p1W, themeIdx);

      addFloatPad(startX + p1W + S(45), LAYER_1_Y + 10, S(95), themeIdx);
      addCoin(startX + p1W + S(92), LAYER_1_Y - 12, 'large');

      addFloatPad(startX + p1W + S(185), LAYER_2_Y + 10, S(95), themeIdx);
      addCoin(startX + p1W + S(232), LAYER_2_Y - 12, 'large');

      addFloatPad(startX + p1W + S(325), LAYER_1_Y - 10, S(95), themeIdx);
      addCoin(startX + p1W + S(372), LAYER_1_Y - 32, 'large');

      addPlatformSegment(startX + p1W + gapW, p2W, themeIdx);
      maybeSpawnSkill(startX + p1W + gapW + S(85), GROUND_Y - 26);
      return p1W + gapW + p2W;
    }
    case 16: { // 高障二段跳 -> 空中速降滑行 -> 立刻起跳翻越雙連高障
      const totalW = S(780);
      addPlatformSegment(startX, totalW, themeIdx);
      const obs1 = addObstacle(themeId, 0, 1, startX + S(180));
      addCenteredJumpArc(obs1.x + obs1.w / 2, GROUND_Y, JUMP_FORCE * 1.38, effSpeed, 3, 'large');

      const obs2 = addObstacle(themeId, 4, 1, startX + S(365));
      addCoinLine(obs2.x - S(20), GROUND_Y - 13, 4, S(24), 'large');

      const obs3 = addObstacle(themeId, 1, 1, startX + S(560));
      addCenteredJumpArc(obs3.x + obs3.w / 2, GROUND_Y, JUMP_FORCE * 1.38, effSpeed, 3, 'large');
      return totalW;
    }
    case 17: { // 高速飛彈/隕石＋地面寬陷阱時間差複合陣
      const totalW = S(680);
      addPlatformSegment(startX, totalW, themeIdx);
      const obs = addObstacle(themeId, 2, 1, startX + S(270));
      addObstacle(themeId, 4, 2, startX + S(370));
      addCenteredJumpArc(obs.x + obs.w / 2, GROUND_Y, JUMP_FORCE, effSpeed, 5, 'large');
      return totalW;
    }
    case 18: { // 雙層浮板＋浮板障礙交錯
      const totalW = S(740);
      addPlatformSegment(startX, totalW, themeIdx);
      addFloatPad(startX + S(100), LAYER_1_Y, S(250), themeIdx);
      addFloatPad(startX + S(270), LAYER_2_Y, S(270), themeIdx);

      addObstacle(themeId, 2, 0, startX + S(245), LAYER_1_Y);
      addObstacle(themeId, 2, 0, startX + S(445), LAYER_2_Y);

      addCoinLine(startX + S(290), LAYER_2_Y - 16, 3, S(36), 'large');
      addCoinLine(startX + S(475), GROUND_Y - 16, 4, S(32), 'large');
      return totalW;
    }
    case 19:
    default: { // 終極魔王連段
      const p1W = S(160);
      const gapW = S(130);
      const p2W = S(550);
      addPlatformSegment(startX, p1W, themeIdx);
      addCenteredJumpArc(startX + p1W + gapW / 2, GROUND_Y, JUMP_FORCE, effSpeed, 4, 'medium');

      const p2Start = startX + p1W + gapW;
      addPlatformSegment(p2Start, p2W, themeIdx);
      addFloatPad(p2Start + S(65), LAYER_1_Y, S(125), themeIdx);
      addObstacle(themeId, 3, 0, p2Start + S(240));
      addObstacle(themeId, 3, 1, p2Start + S(255));
      addObstacle(themeId, 5, 2, p2Start + S(425));
      addCoin(p2Start + S(127), LAYER_1_Y - 22, 'large');
      maybeSpawnSkill(p2Start + S(335), GROUND_Y - 26);
      return p1W + gapW + p2W;
    }
  }
}

function appendNextTemplate() {
  const targetThemeIdx = distance >= 15000
    ? 6
    : Math.floor(distance / 1000) % 6;

  const themeId = THEMES[targetThemeIdx].id;
  const speedRatio = currentSpeed / baseSpeed;

  let tplIndex;
  if (distance >= 15000) {
    tplIndex = 10 + Math.floor(Math.random() * 10);
  } else if (distance < 3000) {
    tplIndex = Math.floor(Math.random() * 7);
  } else if (distance < 8000) {
    tplIndex = 7 + Math.floor(Math.random() * 7);
  } else {
    tplIndex = 14 + Math.floor(Math.random() * 6);
  }

  const widthUsed = buildTemplate(themeId, targetThemeIdx, tplIndex, worldCursorX, speedRatio);
  // 模板銜接處保留充足緩衝，避免剛跳過深淵落地立刻撞上第一個障礙物
  const gap = Math.random() < 0.35 ? S_buffer(speedRatio) : Math.round((65 + Math.random() * 35) * speedRatio);
  worldCursorX += widthUsed + gap;
}

function S_buffer(speedRatio) {
  return Math.round(45 * speedRatio);
}

// ==========================================
// 5. 玩家動作與嚴格的「重新按下才穿過浮板」邏輯
// ==========================================
function doJump() {
  if (!isPlaying) return;
  const maxAllowedJumps = player.tripleJumpTimer > 0 ? 3 : 2;

  if (player.jumpCount < maxAllowedJumps) {
    if (player.isSliding) stopSlide();
    player.isFastFalling = false;
    player.standingPad = null;

    player.vy = player.jumpCount === 0 ? JUMP_FORCE : DOUBLE_JUMP_FORCE;
    player.jumpCount++;
    player.isGrounded = false;
    if (player.jumpCount >= 2) player.flipAngle = 0;

    const pColor = player.jumpCount === 3 ? '#c084fc' : player.jumpCount === 2 ? '#38bdf8' : '#ffffff';
    spawnParticles(player.x + player.w / 2, player.y + player.h, pColor, 10);
  }
}

// 只有當玩家「新按一下」下蹲按鈕時才會觸發此函式（不會因為一直按著而連續觸發）
function handleDownPress() {
  if (!isPlaying) return;
  player.downHeld = true;

  if (player.isGrounded) {
    // 情況 A：已經站在空中浮板上，玩家「新按一下」下蹲 -> 主動穿過這塊浮板往下掉！
    if (player.standingPad !== null) {
      player.dropThroughPad = player.standingPad;
      player.standingPad = null;
      player.isGrounded = false;
      player.y += 4;
      player.vy = 5;
      spawnParticles(player.x + player.w / 2, player.y + player.h, '#38bdf8', 6);
    } else {
      // 情況 B：在主地面上 -> 進入貼地滑行
      enterSlideState();
    }
  } else {
    // 情況 C：在半空中按下蹲 -> 啟動速降（遇見空中浮板會穩穩停在浮板上！）
    if (!player.isFastFalling) {
      player.isFastFalling = true;
      player.vy = Math.max(player.vy, FAST_FALL_SPEED);
      spawnParticles(player.x + player.w / 2, player.y, '#38bdf8', 12);
    }
  }
}

function handleDownRelease() {
  player.downHeld = false;
  player.isFastFalling = false;
  stopSlide();
}

function enterSlideState() {
  if (!player.isSliding) {
    player.isSliding = true;
    player.y += (player.normalH - player.slideH);
    player.w = player.slideW;
    player.h = player.slideH;
  }
}

function stopSlide() {
  if (player.isSliding) {
    player.isSliding = false;
    if (player.isGrounded) {
      player.y -= (player.normalH - player.slideH);
    }
    player.w = player.normalW;
    player.h = player.normalH;
  }
}

function triggerSkill(skill) {
  if (skill === 'magnet') {
    player.magnetTimer = 480;
    spawnParticles(player.x + 15, player.y + 20, '#facc15', 16);
  } else if (skill === 'heal') {
    player.hp = Math.min(player.maxHp, player.hp + 30);
    spawnParticles(player.x + 15, player.y + 20, '#4ade80', 18);
  } else if (skill === 'triple') {
    player.tripleJumpTimer = 600;
    spawnParticles(player.x + 15, player.y + 20, '#c084fc', 18);
  } else if (skill === 'bomb') {
    screenShake = 14;
    for (const obs of obstacles) {
      if (obs.x < canvas.width + 60) {
        spawnParticles(obs.x + obs.w / 2, obs.y + obs.h / 2, '#fb923c', 14);
      }
    }
    obstacles = obstacles.filter(obs => obs.x >= canvas.width + 60);
  }
}

function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 7 - 2,
      vy: (Math.random() - 0.5) * 7,
      life: 16 + Math.random() * 10,
      maxLife: 26,
      color
    });
  }
}

function checkCollision(a, b) {
  const pad = 5;
  return (
    a.x + pad < b.x + b.w - pad &&
    a.x + a.w - pad > b.x + pad &&
    a.y + pad < b.y + b.h - pad &&
    a.y + a.h - pad > b.y + pad
  );
}

// ==========================================
// 6. 遊戲主更新迴圈
// ==========================================
function update() {
  frameCount++;
  if (screenShake > 0) screenShake--;

  currentSpeed = Math.min(baseSpeed * 2.35, baseSpeed + frameCount * 0.0014);
  distance += currentSpeed * 0.085;

  scoreEl.textContent = Math.floor(distance);
  speedEl.textContent = (currentSpeed / baseSpeed).toFixed(1);

  const newThemeIdx = distance >= 15000
    ? 6
    : Math.floor(distance / 1000) % 6;

  if (newThemeIdx !== activeThemeIdx) {
    prevThemeIdx = activeThemeIdx;
    activeThemeIdx = newThemeIdx;
    themeTransition = 0;
    themeBadgeEl.textContent = THEMES[activeThemeIdx].name;
  }
  if (themeTransition < 1) {
    themeTransition = Math.min(1, themeTransition + 0.008);
  }

  if (player.magnetTimer > 0) player.magnetTimer--;
  if (player.tripleJumpTimer > 0) player.tripleJumpTimer--;

  if (frameCount % 6 === 0) {
    let html = '';
    if (player.magnetTimer > 0) {
      html += `<div class="buff-pill magnet">🧲 磁鐵 ${(player.magnetTimer / 60).toFixed(1)}s</div>`;
    }
    if (player.tripleJumpTimer > 0) {
      html += `<div class="buff-pill triple">🪽 三段跳 ${(player.tripleJumpTimer / 60).toFixed(1)}s</div>`;
    }
    buffBarEl.innerHTML = html;
  }

  for (const cl of bgClouds) {
    cl.x -= currentSpeed * 0.08;
    if (cl.x + cl.w < -40) cl.x = canvas.width + 40;
  }
  for (const bg of bgFarItems) {
    bg.x -= currentSpeed * 0.16;
    if (bg.x + bg.w < -30) bg.x = canvas.width + 20;
  }
  for (const bg of bgNearItems) {
    bg.x -= currentSpeed * 0.34;
    if (bg.x + bg.w < -30) bg.x = canvas.width + 20;
  }
  for (const gp of groundProps) {
    gp.x -= currentSpeed;
  }
  groundProps = groundProps.filter(gp => gp.x > -40);

  const curAmbient = THEMES[activeThemeIdx].ambient;
  for (const ap of ambientParticles) {
    ap.x += ap.speedX - currentSpeed * 0.18;
    if (curAmbient === 'ember') ap.y -= 1.3;
    else if (curAmbient === 'rain') ap.y += 4.8;
    else ap.y += Math.sin(frameCount * 0.05 + ap.phase) * 0.6;

    if (ap.x < 0) ap.x = canvas.width;
    if (ap.y < 0) ap.y = canvas.height;
    if (ap.y > canvas.height) ap.y = 0;
  }

  if (frameCount % 3 === 0 && (player.isSliding || player.isFastFalling || player.jumpCount >= 2 || player.tripleJumpTimer > 0)) {
    player.afterimages.push({
      x: player.x,
      y: player.y,
      isSliding: player.isSliding,
      runCycle: player.runCycle,
      flipAngle: player.flipAngle,
      jumpCount: player.jumpCount,
      isGrounded: player.isGrounded,
      alpha: 0.35
    });
  }
  for (let i = player.afterimages.length - 1; i >= 0; i--) {
    player.afterimages[i].x -= currentSpeed * 0.6;
    player.afterimages[i].alpha -= 0.045;
    if (player.afterimages[i].alpha <= 0) player.afterimages.splice(i, 1);
  }

  // 垂直物理
  if (player.isFastFalling) {
    player.vy = FAST_FALL_SPEED;
    if (frameCount % 2 === 0) {
      spawnParticles(player.x + player.w / 2, player.y, 'rgba(56, 189, 248, 0.8)', 1);
    }
  } else {
    player.vy += GRAVITY;
  }

  player.y += player.vy;
  const wasGrounded = player.isGrounded;
  player.isGrounded = false;
  player.standingPad = null;

  // 1. 主地面平台碰撞檢測
  for (let i = platforms.length - 1; i >= 0; i--) {
    const p = platforms[i];
    p.x -= currentSpeed;

    const playerBottom = player.y + player.h;
    const prevBottom = playerBottom - player.vy;

    if (
      player.x + player.w - 6 > p.x &&
      player.x + 6 < p.x + p.w &&
      prevBottom <= p.y + 10 &&
      playerBottom >= p.y
    ) {
      player.y = p.y - player.h;
      player.vy = 0;
      player.isGrounded = true;
      player.standingPad = null;
      player.dropThroughPad = null;
      player.jumpCount = 0;

      if (player.isFastFalling || (!wasGrounded && player.downHeld)) {
        player.isFastFalling = false;
        screenShake = 4;
        spawnParticles(player.x + player.w / 2, p.y, '#fb923c', 10);
        if (player.downHeld) enterSlideState();
      }
    }

    if (p.x + p.w < -120) platforms.splice(i, 1);
  }

  // 2. 空中浮板碰撞檢測（修正重點 2）：
  // 哪怕玩家在空中一直按著下蹲速降，踩到浮板時也只會穩穩停在浮板上（不改寫高度穿板）！
  // 只有等玩家鬆開下蹲鍵並「重新按一下」下蹲，才會將 fp 設為 dropThroughPad 並往下掉！
  for (let i = floatPads.length - 1; i >= 0; i--) {
    const fp = floatPads[i];
    fp.x -= currentSpeed;

    const playerBottom = player.y + player.h;
    const prevBottom = playerBottom - player.vy;

    if (
      fp !== player.dropThroughPad &&
      player.vy >= 0 &&
      player.x + player.w - 6 > fp.x &&
      player.x + 6 < fp.x + fp.w &&
      prevBottom <= fp.y + 12 &&
      playerBottom >= fp.y
    ) {
      player.y = fp.y - player.h;
      player.vy = 0;
      player.isGrounded = true;
      player.standingPad = fp;
      player.jumpCount = 0;

      if (player.isFastFalling) {
        player.isFastFalling = false;
        screenShake = 3;
        spawnParticles(player.x + player.w / 2, fp.y, '#38bdf8', 8);
      }
    }

    if (fp.x + fp.w < -120) floatPads.splice(i, 1);
  }

  if (player.dropThroughPad && player.y > player.dropThroughPad.y + 15) {
    player.dropThroughPad = null;
  }

  if (player.isGrounded && !player.isSliding) {
    player.runCycle += currentSpeed * 0.055;
  } else if (player.jumpCount >= 2 && !player.isFastFalling) {
    player.flipAngle += 0.34;
  }

  if (player.isGrounded && player.isSliding && frameCount % 3 === 0) {
    spawnParticles(player.x + 8, player.y + player.h, '#38bdf8', 1);
  }

  if (player.y > canvas.height + 20) {
    gameOver('掉進深淵坑洞了！');
    return;
  }

  if (player.invincibleTimer > 0) player.invincibleTimer--;

  // 3. 障礙物更新與碰撞
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obs = obstacles[i];
    obs.x -= currentSpeed + (obs.speedBonus || 0);

    if (obs.air && obs.baseY !== undefined) {
      if (obs.vyDrop) {
        obs.baseY = Math.min(GROUND_Y - obs.h, obs.baseY + obs.vyDrop);
      }
      obs.y = obs.baseY + Math.sin(frameCount * 0.1 + obs.phase) * (obs.waveAmp || 0);
    }

    if (player.invincibleTimer === 0 && checkCollision(player, obs)) {
      player.hp = Math.max(0, player.hp - obs.damage);
      player.invincibleTimer = 50;
      screenShake = 9;
      spawnParticles(player.x + player.w / 2, player.y + player.h / 2, '#ef4444', 16);

      if (player.hp <= 0) {
        gameOver('體力耗盡倒下了！');
        return;
      }
    }

    if (obs.x + obs.w < -150) obstacles.splice(i, 1);
  }

  // 4. 金幣與技能球更新
  const pCenterX = player.x + player.w / 2;
  const pCenterY = player.y + player.h / 2;

  for (let i = collectibles.length - 1; i >= 0; i--) {
    const item = collectibles[i];
    item.x -= currentSpeed;

    if (item.kind === 'coin' && player.magnetTimer > 0 && item.x < canvas.width && item.x > -40) {
      const dx = pCenterX - item.x;
      const dy = pCenterY - item.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 280 && dist > 1) {
        item.x += (dx / dist) * 11;
        item.y += (dy / dist) * 11;
      }
    }

    const dist = Math.hypot(pCenterX - item.x, pCenterY - item.y);
    if (dist < item.r + 22) {
      if (item.kind === 'coin') {
        coins += item.value;
        coinEl.textContent = coins;
        spawnParticles(item.x, item.y, '#facc15', 6);
      } else if (item.kind === 'skill') {
        triggerSkill(item.skill);
      }
      collectibles.splice(i, 1);
      continue;
    }

    if (item.x < -60) collectibles.splice(i, 1);
  }

  // 5. 粒子更新
  for (let i = particles.length - 1; i >= 0; i--) {
    const pt = particles[i];
    pt.x += pt.vx;
    pt.y += pt.vy;
    pt.life--;
    if (pt.life <= 0) particles.splice(i, 1);
  }

  worldCursorX -= currentSpeed;
  while (worldCursorX < canvas.width + 750) {
    appendNextTemplate();
  }
}

// ==========================================
// 7. 渲染系統
// ==========================================
function renderStickmanPose(state, colorMain, colorSub, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = colorMain;
  ctx.fillStyle = colorMain;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const cx = state.x + (state.isSliding ? player.slideW : player.normalW) / 2;
  const cy = state.y + (state.isSliding ? player.slideH : player.normalH) / 2;

  if (state.isSliding) {
    const groundY = state.y + player.slideH;
    ctx.beginPath();
    ctx.arc(state.x + 13, groundY - 12, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(state.x + 17, groundY - 9);
    ctx.lineTo(state.x + 31, groundY - 4);
    ctx.lineTo(state.x + 50, groundY - 4);
    ctx.moveTo(state.x + 31, groundY - 4);
    ctx.lineTo(state.x + 38, groundY - 11);
    ctx.lineTo(state.x + 44, groundY - 5);
    ctx.moveTo(state.x + 20, groundY - 8);
    ctx.lineTo(state.x + 6, groundY - 4);
    ctx.stroke();
  } else {
    if (state.jumpCount >= 2 && !state.isGrounded && !player.isFastFalling) {
      ctx.translate(cx, cy);
      ctx.rotate(state.flipAngle);
      ctx.translate(-cx, -cy);
    }

    const bob = state.isGrounded ? Math.abs(Math.sin(state.runCycle)) * 3 : 0;
    const headX = cx + 10;
    const headY = state.y + 10 + bob;
    const shoulderX = cx + 6;
    const shoulderY = state.y + 19 + bob;
    const hipX = cx - 4;
    const hipY = state.y + 35 + bob;

    ctx.beginPath();
    ctx.arc(headX, headY, 7.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(shoulderX, shoulderY);
    ctx.lineTo(hipX, hipY);
    ctx.stroke();

    let legAngle1, legAngle2, armAngle1, armAngle2;
    if (state.isGrounded) {
      legAngle1 = Math.sin(state.runCycle) * 0.95 + 0.15;
      legAngle2 = Math.sin(state.runCycle + Math.PI) * 0.95 + 0.15;
      armAngle1 = Math.sin(state.runCycle + Math.PI) * 1.05 - 0.1;
      armAngle2 = Math.sin(state.runCycle) * 1.05 - 0.1;
    } else if (player.isFastFalling) {
      legAngle1 = -0.3;
      legAngle2 = -0.1;
      armAngle1 = -1.2;
      armAngle2 = -1.0;
    } else {
      legAngle1 = 0.85;
      legAngle2 = -0.65;
      armAngle1 = -0.95;
      armAngle2 = 0.85;
    }

    const thighLen = 10.5;
    const calfLen = 9.5;
    [legAngle1, legAngle2].forEach((angle, idx) => {
      ctx.strokeStyle = idx === 0 ? colorMain : colorSub;
      const kneeX = hipX + Math.sin(angle) * thighLen;
      const kneeY = hipY + Math.cos(angle) * thighLen;
      const calfBend = state.isGrounded ? Math.max(0, -Math.sin(state.runCycle + idx * Math.PI)) * 0.95 : 0.7;
      const calfAngle = angle - calfBend;
      const footX = kneeX + Math.sin(calfAngle) * calfLen;
      const footY = kneeY + Math.cos(calfAngle) * calfLen;

      ctx.beginPath();
      ctx.moveTo(hipX, hipY);
      ctx.lineTo(kneeX, kneeY);
      ctx.lineTo(footX, footY);
      ctx.stroke();
    });

    const upperArmLen = 8.5;
    const foreArmLen = 8.5;
    [armAngle1, armAngle2].forEach((angle, idx) => {
      ctx.strokeStyle = idx === 0 ? colorMain : colorSub;
      const elbowX = shoulderX + Math.sin(angle) * upperArmLen;
      const elbowY = shoulderY + Math.cos(angle) * upperArmLen;
      const foreAngle = angle + 0.65;
      const handX = elbowX + Math.sin(foreAngle) * foreArmLen;
      const handY = elbowY + Math.cos(foreAngle) * foreArmLen;

      ctx.beginPath();
      ctx.moveTo(shoulderX, shoulderY);
      ctx.lineTo(elbowX, elbowY);
      ctx.lineTo(handX, handY);
      ctx.stroke();
    });
  }
  ctx.restore();
}

function drawStickman() {
  if (player.magnetTimer > 0) {
    ctx.save();
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x + player.w / 2, player.y + player.h / 2, 34 + Math.sin(frameCount * 0.2) * 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  for (const img of player.afterimages) {
    const trailColor = player.tripleJumpTimer > 0 ? '#c084fc' : '#38bdf8';
    renderStickmanPose(img, trailColor, '#0284c7', img.alpha);
  }

  if (player.invincibleTimer > 0 && Math.floor(player.invincibleTimer / 4) % 2 === 1) {
    return;
  }
  renderStickmanPose(player, '#ffffff', '#94a3b8', 1);
}

function drawObstacle(obs) {
  ctx.save();
  const cx = obs.x + obs.w / 2;
  const cy = obs.y + obs.h / 2;
  const t = obs.visual;

  if (t === 'f_tree') {
    const trunkW = obs.w * 0.36;
    const crownR = obs.w * 0.54;
    const crownY = obs.y + crownR * 0.85;
    ctx.fillStyle = '#5c3a21';
    ctx.beginPath();
    ctx.moveTo(cx - trunkW * 0.8, obs.y + obs.h);
    ctx.lineTo(cx - trunkW / 2, crownY);
    ctx.lineTo(cx + trunkW / 2, crownY);
    ctx.lineTo(cx + trunkW * 0.8, obs.y + obs.h);
    ctx.fill();

    ctx.fillStyle = '#14532d';
    ctx.beginPath();
    ctx.arc(cx - crownR * 0.45, crownY + 4, crownR * 0.62, 0, Math.PI * 2);
    ctx.arc(cx + crownR * 0.45, crownY + 4, crownR * 0.62, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.arc(cx, crownY - 4, crownR * 0.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.arc(cx - crownR * 0.2, crownY - 9, crownR * 0.38, 0, Math.PI * 2);
    ctx.fill();

  } else if (t === 'f_mushroom') {
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(cx - 5, obs.y + 10, 10, obs.h - 10);
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(cx, obs.y + 14, obs.w * 0.48, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx - 6, obs.y + 6, 2.5, 0, Math.PI * 2);
    ctx.arc(cx + 6, obs.y + 8, 2.5, 0, Math.PI * 2);
    ctx.fill();

  } else if (t === 'f_trap' || t === 'a_spikes') {
    ctx.fillStyle = t === 'f_trap' ? '#475569' : '#d97706';
    const teeth = 4;
    const step = obs.w / teeth;
    for (let i = 0; i < teeth; i++) {
      ctx.beginPath();
      ctx.moveTo(obs.x + i * step, obs.y + obs.h);
      ctx.lineTo(obs.x + (i + 0.5) * step, obs.y);
      ctx.lineTo(obs.x + (i + 1) * step, obs.y + obs.h);
      ctx.fill();
    }

  } else if (t === 'f_bird' || t === 'm_eagle') {
    const flap = Math.sin(frameCount * 0.45 + obs.phase);
    ctx.fillStyle = t === 'f_bird' ? '#f59e0b' : '#e2e8f0';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 15, 7.5, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(cx - 13, cy - 2);
    ctx.lineTo(cx - 22, cy + 2);
    ctx.lineTo(cx - 12, cy + 4);
    ctx.fill();
    ctx.strokeStyle = t === 'f_bird' ? '#fef08a' : '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 2, cy - 2);
    ctx.lineTo(cx + 4, cy - 12 * flap);
    ctx.lineTo(cx + 12, cy - 20 * flap);
    ctx.stroke();

  } else if (t === 'f_vine' || t === 'a_bell' || t === 'm_icicle') {
    const sway = obs.sway ? Math.sin(frameCount * 0.08 + obs.phase) * 9 : 0;
    ctx.strokeStyle = t === 'f_vine' ? '#16a34a' : t === 'a_bell' ? '#78350f' : '#bae6fd';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx + sway, obs.y + obs.h - 12);
    ctx.stroke();

    ctx.fillStyle = t === 'f_vine' ? '#9333ea' : t === 'a_bell' ? '#b45309' : '#38bdf8';
    ctx.beginPath();
    ctx.arc(cx + sway, obs.y + obs.h - 10, 11, 0, Math.PI * 2);
    ctx.fill();

  } else if (t === 'f_log' || t === 'a_wheel' || t === 'm_boulder' || t === 'v_lavaball' || t === 'd_orb') {
    ctx.translate(cx, cy);
    ctx.rotate(-frameCount * 0.16);
    const r = obs.w / 2;
    ctx.fillStyle = t === 'f_log' ? '#78350f' : t === 'a_wheel' ? '#a8a29e' : t === 'm_boulder' ? '#64748b' : t === 'v_lavaball' ? '#ea580c' : '#c084fc';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = t === 'v_lavaball' ? '#fef08a' : '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-r * 0.6, 0);
    ctx.lineTo(r * 0.6, 0);
    ctx.moveTo(0, -r * 0.6);
    ctx.lineTo(0, r * 0.6);
    ctx.stroke();

  } else if (t === 's_fence' || t === 'm_post' || t === 'c_barrier') {
    ctx.fillStyle = t === 's_fence' ? '#f8fafc' : t === 'm_post' ? '#92400e' : '#f59e0b';
    ctx.fillRect(obs.x, obs.y + 10, obs.w, 7);
    ctx.fillRect(obs.x, obs.y + obs.h - 16, obs.w, 7);
    ctx.fillRect(obs.x + 5, obs.y, 7, obs.h);
    ctx.fillRect(obs.x + obs.w - 12, obs.y, 7, obs.h);

  } else if (t === 's_hydrant' || t === 's_sign' || t === 'a_pillar' || t === 'a_statue' || t === 'v_totem' || t === 'd_chess') {
    ctx.fillStyle = t === 's_hydrant' ? '#ef4444' : t === 's_sign' ? '#3b82f6' : t === 'a_pillar' ? '#d6d3d1' : t === 'a_statue' ? '#ca8a04' : t === 'v_totem' ? '#44403c' : '#e879f9';
    ctx.beginPath();
    ctx.roundRect(obs.x + 4, obs.y, obs.w - 8, obs.h, 5);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(obs.x + 8, obs.y + 8, obs.w - 16, 6);

  } else if (t === 's_kite' || t === 's_wire' || t === 'c_drone' || t === 'd_eye') {
    ctx.fillStyle = t === 's_kite' ? '#ec4899' : t === 's_wire' ? '#94a3b8' : t === 'c_drone' ? '#312e81' : '#7e22ce';
    ctx.beginPath();
    ctx.roundRect(obs.x + 2, obs.y + 4, obs.w - 4, obs.h - 8, 8);
    ctx.fill();
    ctx.fillStyle = t === 'd_eye' ? '#facc15' : '#38bdf8';
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();

  } else if (t === 's_mower' || t === 'c_bot') {
    ctx.fillStyle = t === 's_mower' ? '#16a34a' : '#0284c7';
    ctx.beginPath();
    ctx.roundRect(obs.x, obs.y + 4, obs.w, obs.h - 8, 6);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(obs.x + 10, obs.y + obs.h - 4, 5, 0, Math.PI * 2);
    ctx.arc(obs.x + obs.w - 10, obs.y + obs.h - 4, 5, 0, Math.PI * 2);
    ctx.fill();

  } else if (t === 'a_arrow' || t === 'c_missile') {
    ctx.fillStyle = t === 'a_arrow' ? '#f59e0b' : '#e2e8f0';
    ctx.fillRect(obs.x + 10, cy - 4, obs.w - 14, 8);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(obs.x + 10, cy - 7);
    ctx.lineTo(obs.x, cy);
    ctx.lineTo(obs.x + 10, cy + 7);
    ctx.fill();

  } else if (t === 'm_rock' || t === 'm_ice' || t === 'v_obsidian' || t === 'd_crystal' || t === 'd_rift') {
    ctx.fillStyle = t === 'm_rock' ? '#64748b' : t === 'm_ice' ? '#7dd3fc' : t === 'v_obsidian' ? '#1c1917' : t === 'd_crystal' ? '#e879f9' : '#4c1d95';
    ctx.beginPath();
    ctx.moveTo(obs.x, obs.y + obs.h);
    ctx.lineTo(cx, obs.y);
    ctx.lineTo(obs.x + obs.w, obs.y + obs.h);
    ctx.fill();

  } else if (t === 'v_geyser') {
    const pulse = Math.sin(frameCount * 0.4 + obs.phase) * 6;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(obs.x + 4, obs.y + obs.h);
    ctx.lineTo(cx, obs.y - pulse);
    ctx.lineTo(obs.x + obs.w - 4, obs.y + obs.h);
    ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.moveTo(obs.x + 11, obs.y + obs.h);
    ctx.lineTo(cx, obs.y + 10 - pulse * 0.5);
    ctx.lineTo(obs.x + obs.w - 11, obs.y + obs.h);
    ctx.fill();

  } else if (t === 'v_wheel' || t === 'd_clock') {
    ctx.translate(cx, cy);
    ctx.rotate(-frameCount * 0.2);
    ctx.fillStyle = t === 'v_wheel' ? '#f97316' : '#f472b6';
    for (let i = 0; i < 6; i++) {
      ctx.rotate(Math.PI / 3);
      ctx.fillRect(-3, -obs.w / 2, 6, obs.w);
    }
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();

  } else if (t === 'v_meteor') {
    ctx.fillStyle = 'rgba(249, 115, 22, 0.7)';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 12);
    ctx.lineTo(cx + 38, cy - 26);
    ctx.lineTo(cx + 10, cy + 12);
    ctx.fill();
    ctx.fillStyle = '#7c2d12';
    ctx.beginPath();
    ctx.arc(cx, cy, 15, 0, Math.PI * 2);
    ctx.fill();

  } else if (t === 'c_container') {
    ctx.fillStyle = '#1e3a8a';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(obs.x, obs.y, obs.w, obs.h, 5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(obs.x + 4, obs.y + 8, obs.w - 8, 6);

  } else if (t === 'c_tesla') {
    ctx.fillStyle = '#475569';
    ctx.fillRect(obs.x + 4, obs.y + 4, 7, obs.h - 4);
    ctx.fillRect(obs.x + obs.w - 11, obs.y + 4, 7, obs.h - 4);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(obs.x + 8, obs.y + 12);
    ctx.lineTo(cx, obs.y + 12 + (Math.random() - 0.5) * 14);
    ctx.lineTo(obs.x + obs.w - 8, obs.y + 12);
    ctx.stroke();
  }

  ctx.restore();
}

function drawCollectibles() {
  for (const item of collectibles) {
    ctx.save();
    const bob = Math.sin(frameCount * 0.12 + item.phase) * 2.5;
    const x = item.x;
    const y = item.y + bob;

    if (item.kind === 'coin') {
      const colors = {
        small: ['#d97706', '#f59e0b'],
        medium: ['#94a3b8', '#f1f5f9'],
        large: ['#eab308', '#fef08a']
      };
      const [outer, inner] = colors[item.coinType];
      ctx.fillStyle = outer;
      ctx.beginPath();
      ctx.arc(x, y, item.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = inner;
      ctx.beginPath();
      ctx.arc(x, y, item.r * 0.68, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = outer;
      ctx.font = `bold ${Math.round(item.r * 1.1)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.value, x, y + 0.5);

    } else if (item.kind === 'skill') {
      const skillColors = {
        magnet: '#facc15',
        heal: '#4ade80',
        triple: '#c084fc',
        bomb: '#fb923c'
      };
      const skillIcons = {
        magnet: '🧲',
        heal: '💖',
        triple: '🪽',
        bomb: '💣'
      };
      const c = skillColors[item.skill];
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = c;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x, y, item.r + Math.sin(frameCount * 0.2) * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.font = '15px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(skillIcons[item.skill], x, y + 1);
    }
    ctx.restore();
  }
}

function draw() {
  const prevT = THEMES[prevThemeIdx];
  const currT = THEMES[activeThemeIdx];
  const t = themeTransition;

  ctx.save();
  if (screenShake > 0) {
    ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
  }

  const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bgGrad.addColorStop(0, lerpColor(prevT.skyTop, currT.skyTop, t));
  bgGrad.addColorStop(1, lerpColor(prevT.skyBottom, currT.skyBottom, t));
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  for (const cl of bgClouds) {
    ctx.beginPath();
    ctx.roundRect(cl.x, cl.y, cl.w, 16, 8);
    ctx.fill();
  }

  ctx.fillStyle = lerpColor(prevT.bgFar, currT.bgFar, t);
  for (const bg of bgFarItems) {
    const topY = GROUND_Y - bg.h;
    ctx.beginPath();
    ctx.moveTo(bg.x - 25, canvas.height);
    ctx.lineTo(bg.x + bg.w * 0.3, topY + 15);
    ctx.lineTo(bg.x + bg.w * 0.7, topY);
    ctx.lineTo(bg.x + bg.w + 25, canvas.height);
    ctx.fill();
  }

  ctx.fillStyle = lerpColor(prevT.bgNear, currT.bgNear, t);
  for (const bg of bgNearItems) {
    const topY = GROUND_Y - bg.h;
    if (currT.id === 'city' || currT.id === 'ancient') {
      ctx.fillRect(bg.x, topY, bg.w, canvas.height - topY);
    } else {
      ctx.beginPath();
      ctx.moveTo(bg.x - 15, canvas.height);
      ctx.lineTo(bg.x + bg.w / 2, topY);
      ctx.lineTo(bg.x + bg.w + 15, canvas.height);
      ctx.fill();
    }
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
  for (const ap of ambientParticles) {
    if (currT.ambient === 'rain') {
      ctx.fillRect(ap.x, ap.y, 1.5, 10);
    } else {
      ctx.beginPath();
      ctx.arc(ap.x, ap.y, ap.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (const p of platforms) {
    const pTheme = THEMES[p.themeIdx ?? activeThemeIdx];
    ctx.fillStyle = `rgb(${pTheme.groundFill.join(',')})`;
    ctx.fillRect(p.x, p.y, p.w, canvas.height - p.y);
    ctx.fillStyle = `rgb(${pTheme.groundTop.join(',')})`;
    ctx.fillRect(p.x, p.y, p.w, 6);
  }

  for (const gp of groundProps) {
    const pTheme = THEMES[gp.themeIdx ?? activeThemeIdx];
    ctx.fillStyle = `rgb(${pTheme.groundTop.join(',')})`;
    if (gp.type === 0) {
      ctx.fillRect(gp.x, gp.y - 6, 3, 6);
      ctx.fillRect(gp.x + 5, gp.y - 10, 3, 10);
      ctx.fillRect(gp.x + 10, gp.y - 5, 3, 5);
    } else if (gp.type === 1) {
      ctx.beginPath();
      ctx.arc(gp.x, gp.y, 6, Math.PI, 0);
      ctx.fill();
    } else if (gp.type === 2) {
      ctx.fillRect(gp.x, gp.y - 14, 2, 14);
      ctx.beginPath();
      ctx.arc(gp.x + 1, gp.y - 15, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (const fp of floatPads) {
    const fTheme = THEMES[fp.themeIdx ?? activeThemeIdx];
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.beginPath();
    ctx.roundRect(fp.x, fp.y, fp.w, fp.h, 5);
    ctx.fill();

    ctx.fillStyle = `rgb(${fTheme.groundTop.join(',')})`;
    ctx.fillRect(fp.x + 2, fp.y, fp.w - 4, 4);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    for (let dx = fp.x + 12; dx < fp.x + fp.w - 12; dx += 18) {
      ctx.fillRect(dx, fp.y + 7, 8, 2);
    }
  }

  for (const obs of obstacles) drawObstacle(obs);
  drawCollectibles();
  drawStickman();

  const barW = 44;
  const barH = 6;
  const barX = player.x + (player.w - barW) / 2;
  const barY = player.y - 14;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

  const hpRatio = player.hp / player.maxHp;
  ctx.fillStyle = hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.25 ? '#eab308' : '#ef4444';
  ctx.fillRect(barX, barY, barW * hpRatio, barH);

  for (const pt of particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x, pt.y, 4, 4);
    ctx.restore();
  }

  ctx.restore();
}

function gameLoop() {
  if (!isPlaying) return;
  update();
  draw();
  animationId = requestAnimationFrame(gameLoop);
}

function startGame() {
  initWorld();
  isPlaying = true;
  overlay.style.display = 'none';
  finalScoreEl.style.display = 'none';
  gameLoop();
}

function gameOver(reason) {
  isPlaying = false;
  cancelAnimationFrame(animationId);
  overlayTitle.textContent = '💥 挑戰結束';
  overlayDesc.textContent = reason;
  finalScoreEl.textContent = `奔跑距離：${Math.floor(distance)} m ｜ 獲得金幣：${coins} 枚（抵達：${THEMES[activeThemeIdx].name}）`;
  finalScoreEl.style.display = 'block';
  startBtn.textContent = '再跑一次';
  overlay.style.display = 'flex';
}

startBtn.addEventListener('click', startGame);

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
    e.preventDefault();
    if (!e.repeat) doJump();
  } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
    e.preventDefault();
    if (!e.repeat) handleDownPress();
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowDown' || e.code === 'KeyS') {
    handleDownRelease();
  }
});

btnJump.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  btnJump.classList.add('active');
  doJump();
});
btnJump.addEventListener('pointerup', () => btnJump.classList.remove('active'));
btnJump.addEventListener('pointerleave', () => btnJump.classList.remove('active'));

btnSlide.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  btnSlide.classList.add('active');
  handleDownPress();
});
btnSlide.addEventListener('pointerup', () => {
  btnSlide.classList.remove('active');
  handleDownRelease();
});
btnSlide.addEventListener('pointerleave', () => {
  btnSlide.classList.remove('active');
  handleDownRelease();
});

initWorld();
draw();
