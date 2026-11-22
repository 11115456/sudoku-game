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
  standingPad: null,
  dropThroughPad: null,
  hp: 100,
  maxHp: 100,
  invincibleTimer: 0,
  runCycle: 0,
  flipAngle: 0,
  afterimages: [],
  magnetTimer: 0,
  tripleJumpTimer: 0,
  shieldCharges: 0,
  shieldTimer: 0
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
  player.shieldCharges = 0;
  player.shieldTimer = 0;

  initBackground();

  addPlatformSegment(0, 720, 0);
  addCoinLine(210, GROUND_Y - 18, 4, 28, 'small');
  addSkillOrb(350, GROUND_Y - 26, 'shield'); // 起跑段贈送一顆護盾技能球體驗
  addFloatPad(430, LAYER_1_Y, 150, 0);
  addCoinLine(450, LAYER_1_Y - 18, 4, 30, 'medium');
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

function addCenteredJumpArc(centerX, surfaceY, jumpForce, speed, count = 5, type = 'small') {
  const startCenterY = surfaceY - 26;
  const peakTime = Math.abs(jumpForce / GRAVITY);
  const totalFrames = peakTime * 2;
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

function randomSkillType() {
  const skills = ['magnet', 'heal', 'triple', 'bomb', 'shield'];
  return skills[Math.floor(Math.random() * skills.length)];
}

// 放置障礙物：variant = 3 為「強制二段跳超高巨障」（高度 126~134px，單跳無法越過！）
function addObstacle(themeId, categoryIdx, variant, x, customSurfaceY = GROUND_Y) {
  const specs = {
    forest: [
      { type: 'f_tree', w: [36, 46, 40, 56][variant], h: [44, 78, 60, 130][variant], air: false },
      { type: 'f_mushroom', w: [34, 52, 42, 64][variant], h: [26, 32, 38, 126][variant], air: false },
      { type: 'f_trap', w: [34, 50, 38, 56][variant], h: [24, 28, 34, 128][variant], air: false },
      { type: 'f_bird', w: 38, h: 26, air: true, yOff: [60, 58, 114, 60][variant], speed: [1.1, 1.6, 1.3, 1.5][variant], wave: 5 },
      { type: 'f_vine', w: 26, h: [92, 128, 124, 128][variant], air: true, yOff: [150, 162, 160, 162][variant], sway: variant === 2 },
      { type: 'f_log', w: [32, 36, 44, 52][variant], h: [32, 36, 44, 52][variant], air: false, rollSpeed: [0.9, 2.0, 1.4, 2.4][variant] }
    ],
    suburb: [
      { type: 's_fence', w: [40, 44, 54, 52][variant], h: [40, 74, 56, 132][variant], air: false },
      { type: 's_hydrant', w: [28, 46, 32, 44][variant], h: [34, 42, 64, 128][variant], air: false },
      { type: 's_sign', w: [30, 34, 46, 42][variant], h: [42, 76, 58, 130][variant], air: false },
      { type: 's_kite', w: 40, h: 28, air: true, yOff: [60, 114, 62, 60][variant], speed: [0.9, 1.1, 1.5, 1.3][variant], wave: 7 },
      { type: 's_wire', w: 50, h: 32, air: true, yOff: [64, 60, 112, 64][variant], speed: 0, wave: 0 },
      { type: 's_mower', w: [40, 44, 48, 52][variant], h: [28, 30, 34, 40][variant], air: false, rollSpeed: [1.3, 2.4, 1.8, 2.6][variant] }
    ],
    ancient: [
      { type: 'a_pillar', w: [34, 40, 52, 48][variant], h: [46, 80, 58, 134][variant], air: false },
      { type: 'a_statue', w: [36, 42, 54, 50][variant], h: [42, 70, 50, 130][variant], air: false },
      { type: 'a_spikes', w: [38, 58, 46, 54][variant], h: [24, 28, 36, 126][variant], air: false },
      { type: 'a_arrow', w: 44, h: 20, air: true, yOff: [58, 112, 60, 58][variant], speed: [2.0, 1.8, 3.0, 2.5][variant], wave: 2 },
      { type: 'a_bell', w: 36, h: [88, 124, 120, 124][variant], air: true, yOff: [148, 158, 156, 158][variant], sway: variant === 2 },
      { type: 'a_wheel', w: [38, 48, 42, 54][variant], h: [38, 48, 42, 54][variant], air: false, rollSpeed: [1.1, 0.9, 2.2, 2.5][variant] }
    ],
    mountain: [
      { type: 'm_rock', w: [40, 48, 58, 60][variant], h: [44, 78, 58, 132][variant], air: false },
      { type: 'm_ice', w: [34, 38, 54, 48][variant], h: [38, 70, 44, 130][variant], air: false },
      { type: 'm_post', w: [30, 48, 52, 46][variant], h: [40, 46, 54, 128][variant], air: false },
      { type: 'm_eagle', w: 42, h: 28, air: true, yOff: [60, 114, 62, 60][variant], speed: [1.4, 1.2, 2.1, 1.8][variant], wave: 7 },
      { type: 'm_icicle', w: 30, h: [88, 126, 122, 126][variant], air: true, yOff: [150, 160, 158, 160][variant], sway: false },
      { type: 'm_boulder', w: [34, 46, 38, 52][variant], h: [34, 46, 38, 52][variant], air: false, rollSpeed: [1.4, 1.1, 2.3, 2.6][variant] }
    ],
    volcano: [
      { type: 'v_obsidian', w: [38, 46, 56, 58][variant], h: [44, 78, 58, 134][variant], air: false },
      { type: 'v_geyser', w: [34, 38, 54, 48][variant], h: [42, 72, 46, 130][variant], air: false },
      { type: 'v_totem', w: [32, 48, 36, 44][variant], h: [46, 54, 74, 132][variant], air: false },
      { type: 'v_wheel', w: 38, h: 38, air: true, yOff: [64, 118, 64, 64][variant], speed: [0.7, 0.7, 1.4, 1.1][variant], wave: 4 },
      { type: 'v_meteor', w: 36, h: 36, air: true, yOff: [64, 116, 100, 64][variant], speed: [1.8, 1.6, 2.5, 2.1][variant], drop: variant === 2 ? 0.8 : 0 },
      { type: 'v_lavaball', w: [32, 44, 36, 50][variant], h: [32, 44, 36, 50][variant], air: false, rollSpeed: [1.5, 1.1, 2.6, 2.8][variant] }
    ],
    city: [
      { type: 'c_container', w: [44, 46, 60, 54][variant], h: [42, 76, 48, 132][variant], air: false },
      { type: 'c_tesla', w: [36, 40, 54, 46][variant], h: [44, 74, 50, 130][variant], air: false },
      { type: 'c_barrier', w: [34, 52, 36, 44][variant], h: [36, 40, 70, 128][variant], air: false },
      { type: 'c_drone', w: 42, h: 28, air: true, yOff: [60, 114, 62, 60][variant], speed: [0.9, 0.9, 1.6, 1.4][variant], wave: 5 },
      { type: 'c_missile', w: 48, h: 22, air: true, yOff: [58, 110, 60, 58][variant], speed: [2.5, 2.2, 3.6, 3.0][variant], wave: 2 },
      { type: 'c_bot', w: [38, 48, 40, 48][variant], h: [28, 36, 30, 38][variant], air: false, rollSpeed: [1.4, 1.0, 2.7, 2.9][variant] }
    ],
    dream: [
      { type: 'd_crystal', w: [36, 44, 54, 56][variant], h: [46, 80, 60, 134][variant], air: false },
      { type: 'd_rift', w: [36, 52, 46, 52][variant], h: [32, 40, 64, 128][variant], air: false },
      { type: 'd_chess', w: [32, 38, 42, 46][variant], h: [42, 64, 80, 132][variant], air: false },
      { type: 'd_eye', w: 38, h: 34, air: true, yOff: [62, 116, 64, 62][variant], speed: [1.3, 1.3, 2.0, 1.7][variant], wave: 8 },
      { type: 'd_clock', w: 40, h: 40, air: true, yOff: [64, 118, 64, 64][variant], speed: [1.1, 1.1, 2.3, 1.9][variant], wave: 4 },
      { type: 'd_orb', w: [34, 42, 38, 50][variant], h: [34, 42, 38, 50][variant], air: false, rollSpeed: [1.7, 2.2, 3.2, 3.5][variant] }
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
    phase: Math.random() * Math.PI * 2,
    isDoubleJumpTall: variant === 3 && !s.air
  };
  obstacles.push(obsObj);
  return obsObj;
}

// ==========================================
// 4. 模板庫（含強制二段跳超高巨障 + 高頻技能球）
// ==========================================
function buildTemplate(themeId, themeIdx, tplIndex, startX, speedRatio) {
  const S = (val) => Math.round(val * speedRatio);
  const effSpeed = baseSpeed * speedRatio;

  // 提升技能球在模板內的出現頻率（58%）
  const maybeSpawnSkill = (sx, sy) => {
    if (Math.random() < 0.58) {
      addSkillOrb(sx, sy, randomSkillType());
    }
  };

  switch (tplIndex) {
    // ---------------- 簡單級模板 (0 ~ 6，對應 1~7 號) ----------------
    case 0: { // 單矮障 + 正中央對齊拋物線金幣
      const totalW = S(460);
      addPlatformSegment(startX, totalW, themeIdx);
      const obs = addObstacle(themeId, 0, 0, startX + S(230));
      addCenteredJumpArc(obs.x + obs.w / 2, GROUND_Y, JUMP_FORCE, effSpeed, 5, 'small');
      maybeSpawnSkill(startX + S(390), GROUND_Y - 26);
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
      addSkillOrb(startX + S(430), LAYER_2_Y - 24, randomSkillType());
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
    case 4: { // 雙連矮障快節奏單跳
      const totalW = S(620);
      addPlatformSegment(startX, totalW, themeIdx);
      const obs1 = addObstacle(themeId, 1, 0, startX + S(180));
      addCenteredJumpArc(obs1.x + obs1.w / 2, GROUND_Y, JUMP_FORCE, effSpeed, 4, 'small');
      const obs2 = addObstacle(themeId, 2, 0, startX + S(420));
      addCenteredJumpArc(obs2.x + obs2.w / 2, GROUND_Y, JUMP_FORCE, effSpeed, 4, 'small');
      return totalW;
    }
    case 5: { // 浮板上方躲避地面滾石 + 浮板穿層下跳吃技能球
      const totalW = S(520);
      addPlatformSegment(startX, totalW, themeIdx);
      addFloatPad(startX + S(90), LAYER_1_Y, S(165), themeIdx);
      addCoinLine(startX + S(115), LAYER_1_Y - 16, 3, S(36), 'small');
      addObstacle(themeId, 5, 0, startX + S(330));
      addSkillOrb(startX + S(395), GROUND_Y - 26, randomSkillType());
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
      addSkillOrb(startX + S(548), LAYER_3_Y - 24, randomSkillType());
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
    case 9: { // 【強制二段跳超高巨障】單跳絕對過不去，必須二段跳飛躍！
      const totalW = S(580);
      addPlatformSegment(startX, totalW, themeIdx);
      const obs = addObstacle(themeId, 0, 3, startX + S(275)); // variant 3 超高巨障
      addCenteredJumpArc(obs.x + obs.w / 2, GROUND_Y, JUMP_FORCE * 1.55, effSpeed, 5, 'medium');
      addCoin(obs.x + obs.w / 2, GROUND_Y - 155, 'large');
      maybeSpawnSkill(startX + S(480), GROUND_Y - 26);
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
      addSkillOrb(startX + p1W + S(235), LAYER_1_Y - 38, randomSkillType());
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
      addSkillOrb(startX + p1W + S(232), LAYER_2_Y - 16, randomSkillType());

      addFloatPad(startX + p1W + S(325), LAYER_1_Y - 10, S(95), themeIdx);
      addCoin(startX + p1W + S(372), LAYER_1_Y - 32, 'large');

      addPlatformSegment(startX + p1W + gapW, p2W, themeIdx);
      return p1W + gapW + p2W;
    }
    case 16: { // 【強制二段跳雙巨障連跳】中間穿插速降貼地滑行，極致操作連段！
      const totalW = S(820);
      addPlatformSegment(startX, totalW, themeIdx);
      const obs1 = addObstacle(themeId, 0, 3, startX + S(190)); // 強制二段跳巨障 1
      addCenteredJumpArc(obs1.x + obs1.w / 2, GROUND_Y, JUMP_FORCE * 1.55, effSpeed, 3, 'large');

      const obs2 = addObstacle(themeId, 4, 1, startX + S(385)); // 速降滑行
      addCoinLine(obs2.x - S(20), GROUND_Y - 13, 4, S(24), 'large');

      const obs3 = addObstacle(themeId, 1, 3, startX + S(590)); // 強制二段跳巨障 2
      addCenteredJumpArc(obs3.x + obs3.w / 2, GROUND_Y, JUMP_FORCE * 1.55, effSpeed, 3, 'large');
      return totalW;
    }
    case 17: { // 高速飛彈/隕石＋地面寬陷阱時間差複合陣
      const totalW = S(680);
      addPlatformSegment(startX, totalW, themeIdx);
      const obs = addObstacle(themeId, 2, 1, startX + S(270));
      addObstacle(themeId, 4, 2, startX + S(370));
      addCenteredJumpArc(obs.x + obs.w / 2, GROUND_Y, JUMP_FORCE, effSpeed, 5, 'large');
      maybeSpawnSkill(startX + S(560), GROUND_Y - 26);
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
    default: { // 終極魔王連段（含強制二段跳超高巨障）
      const p1W = S(160);
      const gapW = S(130);
      const p2W = S(580);
      addPlatformSegment(startX, p1W, themeIdx);
      addCenteredJumpArc(startX + p1W + gapW / 2, GROUND_Y, JUMP_FORCE, effSpeed, 4, 'medium');

      const p2Start = startX + p1W + gapW;
      addPlatformSegment(p2Start, p2W, themeIdx);
      addFloatPad(p2Start + S(65), LAYER_1_Y, S(125), themeIdx);
      addObstacle(themeId, 3, 0, p2Start + S(240));
      addObstacle(themeId, 3, 1, p2Start + S(255));
      const bossTall = addObstacle(themeId, 0, 3, p2Start + S(430)); // 強制二段跳終點巨障
      addCenteredJumpArc(bossTall.x + bossTall.w / 2, GROUND_Y, JUMP_FORCE * 1.55, effSpeed, 3, 'large');
      addSkillOrb(p2Start + S(127), LAYER_1_Y - 24, randomSkillType());
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
  } else if (distance < 2500) {
    // 前期也加入 9 號模板，讓玩家早點體驗強制二段跳巨障
    const earlyPool = [0, 1, 2, 3, 4, 5, 6, 9];
    tplIndex = earlyPool[Math.floor(Math.random() * earlyPool.length)];
  } else if (distance < 7500) {
    tplIndex = 7 + Math.floor(Math.random() * 7);
  } else {
    tplIndex = 14 + Math.floor(Math.random() * 6);
  }

  const widthUsed = buildTemplate(themeId, targetThemeIdx, tplIndex, worldCursorX, speedRatio);
  const gap = Math.random() < 0.35 ? Math.round(45 * speedRatio) : Math.round((65 + Math.random() * 35) * speedRatio);

  // 額外提升技能球頻率：42% 機率在模板銜接處生成懸浮技能球
  if (Math.random() < 0.42) {
    const orbY = Math.random() < 0.5 ? GROUND_Y - 28 : LAYER_1_Y - 12;
    addSkillOrb(worldCursorX + widthUsed + Math.round(gap * 0.5), orbY, randomSkillType());
  }

  worldCursorX += widthUsed + gap;
}

// ==========================================
// 5. 玩家動作與技能觸發（含護盾免疫三次傷害）
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

function handleDownPress() {
  if (!isPlaying) return;
  player.downHeld = true;

  if (player.isGrounded) {
    if (player.standingPad !== null) {
      player.dropThroughPad = player.standingPad;
      player.standingPad = null;
      player.isGrounded = false;
      player.y += 4;
      player.vy = 5;
      spawnParticles(player.x + player.w / 2, player.y + player.h, '#38bdf8', 6);
    } else {
      enterSlideState();
    }
  } else {
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
  } else if (skill === 'shield') {
    player.shieldCharges = 3;
    player.shieldTimer = 720; // 12 秒內免疫最多 3 次傷害
    spawnParticles(player.x + 15, player.y + 20, '#38bdf8', 20);
  } else if (skill === 'bomb') {
    screenShake = 14;
    for (const obs of obstacles) {
      if (obs.x < canvas.width + 60) {
        spawnParticles(obs.
