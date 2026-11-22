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
// 1. 七大關卡視覺與色彩設定（含高對比障礙物亮邊色）
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
    obsRim: 'rgba(134, 239, 172, 0.72)',
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
    obsRim: 'rgba(254, 240, 138, 0.78)',
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
    obsRim: 'rgba(253, 224, 71, 0.88)',
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
    obsRim: 'rgba(125, 211, 252, 0.85)',
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
    obsRim: 'rgba(253, 186, 116, 0.88)',
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
    obsRim: 'rgba(56, 189, 248, 0.9)',
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
    obsRim: 'rgba(249, 168, 212, 0.88)',
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
// 2. 遊戲全域狀態與鏡頭空間參數 (640x360)
// ==========================================
let isPlaying = false;
let animationId;
let distance = 0;
let coins = 0;
let baseSpeed = 5.6;
let currentSpeed = 5.6;
let frameCount = 0;
let screenShake = 0;
let lastJumpFrame = -1;

let activeThemeIdx = 0;
let prevThemeIdx = 0;
let themeTransition = 1;

// 地面與三層浮板整體下移 12px，留出頂部乾淨視野避免撞進 UI 膠囊
const GROUND_Y = 316;
const GRAVITY = 0.62;
const FAST_FALL_SPEED = 23;
const JUMP_FORCE = -11.6;
const DOUBLE_JUMP_FORCE = -10.6;

// 三層疊疊樂浮板標準高度
const LAYER_1_Y = GROUND_Y - 66;   // 250
const LAYER_2_Y = GROUND_Y - 130;  // 186
const LAYER_3_Y = GROUND_Y - 192;  // 124

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
let floatingTexts = [];
let bgClouds = [];
let bgFarItems = [];
let bgNearItems = [];
let groundProps = [];
let ambientParticles = [];
let worldCursorX = 0;

function spawnFloatingText(x, y, text, color = '#ffffff') {
  floatingTexts.push({
    x,
    y,
    text,
    color,
    vy: -1.4,
    life: 44,
    maxLife: 44
  });
}

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
  floatingTexts = [];

  distance = 0;
  coins = 0;
  currentSpeed = baseSpeed;
  frameCount = 0;
  screenShake = 0;
  lastJumpFrame = -1;
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

  addPlatformSegment(0, 720, 0, false);
  addCoinLine(210, GROUND_Y - 18, 4, 28, 'small');
  addSkillOrb(350, GROUND_Y - 26, 'shield');
  addFloatPad(430, LAYER_1_Y, 150, 0);
  addCoinLine(450, LAYER_1_Y - 18, 4, 30, 'medium');
  worldCursorX = 720;

  while (worldCursorX < canvas.width + 950) {
    appendNextTemplate();
  }
}

// ==========================================
// 3. 獎勵防重疊保護與物件生成輔助函式
// ==========================================
function addPlatformSegment(x, w, themeIdx, hasAbyssRight = false) {
  platforms.push({ x, w, y: GROUND_Y, themeIdx, hasAbyssRight });
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

// 自動避開同座標的障礙物，防止金幣或技能球「長在尖刺陷阱裡面」
function resolveSafeCollectibleY(x, y, r) {
  let safeY = y;
  for (let attempt = 0; attempt < 3; attempt++) {
    let hit = false;
    for (const obs of obstacles) {
      if (
        x + r + 14 > obs.x &&
        x - r - 14 < obs.x + obs.w &&
        safeY + r + 14 > obs.y &&
        safeY - r - 14 < obs.y + obs.h
      ) {
        safeY = obs.y - r - 24;
        hit = true;
      }
    }
    if (!hit) break;
  }
  return Math.max(46, safeY);
}

function addCoin(x, y, type = 'small') {
  const value = type === 'large' ? 3 : type === 'medium' ? 2 : 1;
  const radius = type === 'large' ? 10.5 : type === 'medium' ? 8.2 : 6.2;
  const safeY = resolveSafeCollectibleY(x, y, radius);
  collectibles.push({
    kind: 'coin',
    coinType: type,
    value,
    x,
    y: safeY,
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
  const r = 13.5;
  const safeY = resolveSafeCollectibleY(x, y, r);
  collectibles.push({
    kind: 'skill',
    skill,
    x,
    y: safeY,
    r,
    phase: Math.random() * Math.PI * 2
  });
}

function randomSkillType() {
  const skills = ['magnet', 'heal', 'triple', 'bomb', 'shield'];
  return skills[Math.floor(Math.random() * skills.length)];
}

// variant = 3 為「強制二段跳超高巨障」（高度 126~134px，單跳無法越過）
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
// 4. 模板庫（先放障礙物再放獎勵，徹底消除重疊）
// ==========================================
function buildTemplate(themeId, themeIdx, tplIndex, startX, speedRatio) {
  const S = (val) => Math.round(val * speedRatio);
  const effSpeed = baseSpeed * speedRatio;

  const maybeSpawnSkill = (sx, sy) => {
    if (Math.random() < 0.58) {
      addSkillOrb(sx, sy, randomSkillType());
    }
  };

  switch (tplIndex) {
    case 0: {
      const totalW = S(460);
      addPlatformSegment(startX, totalW, themeIdx, false);
      const obs = addObstacle(themeId, 0, 0, startX + S(230));
      addCenteredJumpArc(obs.x + obs.w / 2, GROUND_Y, JUMP_FORCE, effSpeed, 5, 'small');
      maybeSpawnSkill(startX + S(390), GROUND_Y - 26);
      return totalW;
    }
    case 1: {
      const totalW = S(460);
      addPlatformSegment(startX, totalW, themeIdx, false);
      const obs = addObstacle(themeId, 3, 0, startX + S(230));
      const coinSpacing = S(24);
      const coinCount = 5;
      const startCoinX = (obs.x + obs.w / 2) - ((coinCount - 1) * coinSpacing) / 2;
      addCoinLine(startCoinX, GROUND_Y - 13, coinCount, coinSpacing, 'medium');
      return totalW;
    }
    case 2: {
      const totalW = S(540);
      addPlatformSegment(startX, totalW, themeIdx, false);
      addFloatPad(startX + S(100), LAYER_1_Y, S(150), themeIdx);
      addCoinLine(startX + S(120), LAYER_1_Y - 16, 4, S(32), 'small');
      addFloatPad(startX + S(280), LAYER_2_Y, S(160), themeIdx);
      addCoinLine(startX + S(300), LAYER_2_Y - 16, 4, S(34), 'medium');
      addSkillOrb(startX + S(430), LAYER_2_Y - 24, randomSkillType());
      return totalW;
    }
    case 3: {
      const p1W = S(180);
      const gapW = S(120);
      const p2W = S(220);
      addPlatformSegment(startX, p1W, themeIdx, true); // 標記右側有深淵斷崖
      const gapCenterX = startX + p1W + gapW / 2;
      addCenteredJumpArc(gapCenterX, GROUND_Y, JUMP_FORCE, effSpeed, 5, 'small');
      addPlatformSegment(startX + p1W + gapW, p2W, themeIdx, false);
      maybeSpawnSkill(startX + p1W + gapW + S(110), GROUND_Y - 26);
      return p1W + gapW + p2W;
    }
    case 4: {
      const totalW = S(620);
      addPlatformSegment(startX, totalW, themeIdx, false);
      const obs1 = addObstacle(themeId, 1, 0, startX + S(180));
      addCenteredJumpArc(obs1.x + obs1.w / 2, GROUND_Y, JUMP_FORCE, effSpeed, 4, 'small');
      const obs2 = addObstacle(themeId, 2, 0, startX + S(420));
      addCenteredJumpArc(obs2.x + obs2.w / 2, GROUND_Y, JUMP_FORCE, effSpeed, 4, 'small');
      return totalW;
    }
    case 5: {
      const totalW = S(520);
      addPlatformSegment(startX, totalW, themeIdx, false);
      addFloatPad(startX + S(90), LAYER_1_Y, S(165), themeIdx);
      addCoinLine(startX + S(115), LAYER_1_Y - 16, 3, S(36), 'small');
      addObstacle(themeId, 5, 0, startX + S(330));
      addSkillOrb(startX + S(420), GROUND_Y - 26, randomSkillType());
      return totalW;
    }
    case 6: {
      const totalW = S(500);
      addPlatformSegment(startX, totalW, themeIdx, false);
      addFloatPad(startX + S(140), LAYER_1_Y, S(200), themeIdx);
      addCoinLine(startX + S(165), LAYER_1_Y - 16, 4, S(38), 'medium');
      const obs = addObstacle(themeId, 3, 0, startX + S(220));
      addCoinLine(obs.x - S(15), GROUND_Y - 13, 3, S(28), 'small');
      return totalW;
    }
    case 7: {
      const totalW = S(660);
      addPlatformSegment(startX, totalW, themeIdx, false);
      addFloatPad(startX + S(80), LAYER_1_Y, S(135), themeIdx);
      addCoinLine(startX + S(98), LAYER_1_Y - 16, 3, S(34), 'small');

      addFloatPad(startX + S(245), LAYER_2_Y, S(135), themeIdx);
      addCoinLine(startX + S(263), LAYER_2_Y - 16, 3, S(34), 'medium');

      addFloatPad(startX + S(410), LAYER_3_Y, S(155), themeIdx);
      addCoinLine(startX + S(428), LAYER_3_Y - 16, 3, S(36), 'large');
      addSkillOrb(startX + S(548), LAYER_3_Y - 24, randomSkillType());
      return totalW;
    }
    case 8: {
      const totalW = S(600);
      addPlatformSegment(startX, totalW, themeIdx, false);
      const airX = startX + S(190);
      addObstacle(themeId, 3, 0, airX);
      addObstacle(themeId, 3, 1, airX + 15);
      addObstacle(themeId, 3, 0, airX + S(45));
      addCoinLine(airX - S(10), GROUND_Y - 13, 5, S(25), 'medium');

      addFloatPad(startX + S(380), LAYER_1_Y, S(145), themeIdx);
      addCoin(startX + S(452), LAYER_1_Y - 20, 'large');
      return totalW;
    }
    case 9: {
      const totalW = S(580);
      addPlatformSegment(startX, totalW, themeIdx, false);
      const obs = addObstacle(themeId, 0, 3, startX + S(275));
      addCenteredJumpArc(obs.x + obs.w / 2, GROUND_Y, JUMP_FORCE * 1.55, effSpeed, 5, 'medium');
      addCoin(obs.x + obs.w / 2, GROUND_Y - 155, 'large');
      maybeSpawnSkill(startX + S(480), GROUND_Y - 26);
      return totalW;
    }
    case 10: {
      const totalW = S(640);
      addPlatformSegment(startX, totalW, themeIdx, false);
      addFloatPad(startX + S(100), LAYER_1_Y, S(350), themeIdx);
      addObstacle(themeId, 1, 0, startX + S(300), LAYER_1_Y);
      addCoinLine(startX + S(125), LAYER_1_Y - 16, 3, S(32), 'small');
      addCoinLine(startX + S(295), GROUND_Y - 16, 4, S(34), 'large');
      return totalW;
    }
    case 11: {
      const p1W = S(160);
      const gapTotal = S(320);
      const p2W = S(190);
      addPlatformSegment(startX, p1W, themeIdx, true);
      addFloatPad(startX + p1W + S(45), LAYER_1_Y + 15, S(100), themeIdx);
      addCoin(startX + p1W + S(95), LAYER_1_Y - 6, 'medium');
      addFloatPad(startX + p1W + S(185), LAYER_1_Y - 15, S(100), themeIdx);
      addSkillOrb(startX + p1W + S(235), LAYER_1_Y - 38, randomSkillType());
      addPlatformSegment(startX + p1W + gapTotal, p2W, themeIdx, false);
      return p1W + gapTotal + p2W;
    }
    case 12: {
      const totalW = S(620);
      addPlatformSegment(startX, totalW, themeIdx, false);
      const obs1 = addObstacle(themeId, 2, 0, startX + S(170));
      addCenteredJumpArc(obs1.x + obs1.w / 2, GROUND_Y, JUMP_FORCE, effSpeed, 3, 'medium');
      const obs2 = addObstacle(themeId, 4, 1, startX + S(370));
      addCoinLine(obs2.x - S(20), GROUND_Y - 13, 4, S(24), 'medium');
      return totalW;
    }
    case 13: {
      const totalW = S(640);
      addPlatformSegment(startX, totalW, themeIdx, false);
      addObstacle(themeId, 2, 1, startX + S(200));
      addObstacle(themeId, 2, 1, startX + S(295));
      addObstacle(themeId, 2, 1, startX + S(390));

      addFloatPad(startX + S(125), LAYER_1_Y, S(135), themeIdx);
      addFloatPad(startX + S(300), LAYER_2_Y, S(155), themeIdx);
      addCoinLine(startX + S(318), LAYER_2_Y - 16, 4, S(34), 'large');
      maybeSpawnSkill(startX + S(540), GROUND_Y - 26);
      return totalW;
    }
    case 14: {
      const totalW = S(740);
      addPlatformSegment(startX, totalW, themeIdx, false);
      addFloatPad(startX + S(90), LAYER_1_Y, S(125), themeIdx);
      addFloatPad(startX + S(235), LAYER_2_Y, S(135), themeIdx);
      addFloatPad(startX + S(390), LAYER_3_Y, S(165), themeIdx);

      addObstacle(themeId, 3, 0, startX + S(500));
      addObstacle(themeId, 3, 1, startX + S(515));
      addCoinLine(startX + S(410), LAYER_3_Y - 16, 3, S(36), 'large');
      addCoinLine(startX + S(490), GROUND_Y - 13, 4, S(25), 'large');
      return totalW;
    }
    case 15: {
      const p1W = S(150);
      const gapW = S(450);
      const p2W = S(170);
      addPlatformSegment(startX, p1W, themeIdx, true);

      addFloatPad(startX + p1W + S(45), LAYER_1_Y + 10, S(95), themeIdx);
      addCoin(startX + p1W + S(92), LAYER_1_Y - 12, 'large');

      addFloatPad(startX + p1W + S(185), LAYER_2_Y + 10, S(95), themeIdx);
      addSkillOrb(startX + p1W + S(232), LAYER_2_Y - 16, randomSkillType());

      addFloatPad(startX + p1W + S(325), LAYER_1_Y - 10, S(95), themeIdx);
      addCoin(startX + p1W + S(372), LAYER_1_Y - 32, 'large');

      addPlatformSegment(startX + p1W + gapW, p2W, themeIdx, false);
      return p1W + gapW + p2W;
    }
    case 16: {
      const totalW = S(820);
      addPlatformSegment(startX, totalW, themeIdx, false);
      const obs1 = addObstacle(themeId, 0, 3, startX + S(190));
      addCenteredJumpArc(obs1.x + obs1.w / 2, GROUND_Y, JUMP_FORCE * 1.55, effSpeed, 3, 'large');

      const obs2 = addObstacle(themeId, 4, 1, startX + S(385));
      addCoinLine(obs2.x - S(20), GROUND_Y - 13, 4, S(24), 'large');

      const obs3 = addObstacle(themeId, 1, 3, startX + S(590));
      addCenteredJumpArc(obs3.x + obs3.w / 2, GROUND_Y, JUMP_FORCE * 1.55, effSpeed, 3, 'large');
      return totalW;
    }
    case 17: {
      const totalW = S(680);
      addPlatformSegment(startX, totalW, themeIdx, false);
      const obs = addObstacle(themeId, 2, 1, startX + S(270));
      addObstacle(themeId, 4, 2, startX + S(370));
      addCenteredJumpArc(obs.x + obs.w / 2, GROUND_Y, JUMP_FORCE, effSpeed, 5, 'large');
      maybeSpawnSkill(startX + S(560), GROUND_Y - 26);
      return totalW;
    }
    case 18: {
      const totalW = S(740);
      addPlatformSegment(startX, totalW, themeIdx, false);
      addFloatPad(startX + S(100), LAYER_1_Y, S(250), themeIdx);
      addFloatPad(startX + S(270), LAYER_2_Y, S(270), themeIdx);

      addObstacle(themeId, 2, 0, startX + S(245), LAYER_1_Y);
      addObstacle(themeId, 2, 0, startX + S(445), LAYER_2_Y);

      addCoinLine(startX + S(290), LAYER_2_Y - 16, 3, S(36), 'large');
      addCoinLine(startX + S(475), GROUND_Y - 16, 4, S(32), 'large');
      return totalW;
    }
    case 19:
    default: {
      const p1W = S(160);
      const gapW = S(130);
      const p2W = S(580);
      addPlatformSegment(startX, p1W, themeIdx, true);
      addCenteredJumpArc(startX + p1W + gapW / 2, GROUND_Y, JUMP_FORCE, effSpeed, 4, 'medium');

      const p2Start = startX + p1W + gapW;
      addPlatformSegment(p2Start, p2W, themeIdx, false);
      addFloatPad(p2Start + S(65), LAYER_1_Y, S(125), themeIdx);
      addObstacle(themeId, 3, 0, p2Start + S(240));
      addObstacle(themeId, 3, 1, p2Start + S(255));
      const bossTall = addObstacle(themeId, 0, 3, p2Start + S(430));
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
    const earlyPool = [0, 1, 2, 3, 4, 5, 6, 9];
    tplIndex = earlyPool[Math.floor(Math.random() * earlyPool.length)];
  } else if (distance < 7500) {
    tplIndex = 7 + Math.floor(Math.random() * 7);
  } else {
    tplIndex = 14 + Math.floor(Math.random() * 6);
  }

  const widthUsed = buildTemplate(themeId, targetThemeIdx, tplIndex, worldCursorX, speedRatio);
  const gap = Math.random() < 0.35 ? Math.round(45 * speedRatio) : Math.round((65 + Math.random() * 35) * speedRatio);

  if (Math.random() < 0.42) {
    const orbY = Math.random() < 0.5 ? GROUND_Y - 28 : LAYER_1_Y - 12;
    addSkillOrb(worldCursorX + widthUsed + Math.round(gap * 0.5), orbY, randomSkillType());
  }

  worldCursorX += widthUsed + gap;
}

// ==========================================
// 5. 玩家動作與技能觸發（含同幀防連扣跳躍次數與護盾震碎障礙）
// ==========================================
function doJump() {
  if (!isPlaying) return;
  if (frameCount === lastJumpFrame) return;

  const maxAllowedJumps = player.tripleJumpTimer > 0 ? 3 : 2;

  if (player.jumpCount < maxAllowedJumps) {
    lastJumpFrame = frameCount;
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
  const px = player.x + player.w / 2;
  const py = player.y - 12;

  if (skill === 'magnet') {
    player.magnetTimer = 480;
    spawnParticles(px, py + 24, '#facc15', 16);
    spawnFloatingText(px, py, '🧲 磁鐵啟動!', '#facc15');
  } else if (skill === 'heal') {
    player.hp = Math.min(player.maxHp, player.hp + 30);
    spawnParticles(px, py + 24, '#4ade80', 18);
    spawnFloatingText(px, py, '💖 體力 +30', '#4ade80');
  } else if (skill === 'triple') {
    player.tripleJumpTimer = 600;
    spawnParticles(px, py + 24, '#c084fc', 18);
    spawnFloatingText(px, py, '🪽 三段跳啟動!', '#e879f9');
  } else if (skill === 'shield') {
    player.shieldCharges = 3;
    player.shieldTimer = 720;
    spawnParticles(px, py + 24, '#38bdf8', 20);
    spawnFloatingText(px, py, '🛡️ 三層護盾!', '#38bdf8');
  } else if (skill === 'bomb') {
    screenShake = 14;
    for (const obs of obstacles) {
      if (obs.x < canvas.width + 60) {
        spawnParticles(obs.x + obs.w / 2, obs.y + obs.h / 2, '#fb923c', 14);
      }
    }
    obstacles = obstacles.filter(obs => obs.x >= canvas.width + 60);
    spawnFloatingText(px, py, '💣 全屏清障!', '#fb923c');
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
  if (player.shieldTimer > 0) {
    player.shieldTimer--;
    if (player.shieldTimer <= 0) player.shieldCharges = 0;
  }

  if (frameCount % 6 === 0) {
    let html = '';
    if (player.shieldCharges > 0 && player.shieldTimer > 0) {
      html += `<div class="buff-pill shield">🛡️ 護盾 ${player.shieldCharges}次 (${(player.shieldTimer / 60).toFixed(1)}s)</div>`;
    }
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

  if (player.isFastFalling) {
    player.vy = FAST_FALL_SPEED;
    if (frameCount % 2 === 0) {
      spawnParticles(player.x + player.w / 2, player.y, 'rgba(56, 189, 248, 0.8)', 1);
    }
  } else {
    player.vy += GRAVITY;
  }

  player.y += player.vy;

  // 頂部柔和天花板緩衝，防止衝進 UI 狀態列
  if (player.y < 36) {
    player.y = 36;
    if (player.vy < 0) player.vy = 0;
  }

  const wasGrounded = player.isGrounded;
  player.isGrounded = false;
  player.standingPad = null;

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

  // 障礙物更新與碰撞（護盾格擋時直接震碎該障礙物！）
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
      if (player.shieldCharges > 0 && player.shieldTimer > 0) {
        player.shieldCharges--;
        if (player.shieldCharges <= 0) {
          player.shieldTimer = 0;
        }
        player.invincibleTimer = 36;
        screenShake = 8;
        spawnParticles(obs.x + obs.w / 2, obs.y + obs.h / 2, '#38bdf8', 24);
        spawnFloatingText(player.x + player.w / 2, player.y - 16, '🛡️ 格擋震碎!', '#38bdf8');
        obstacles.splice(i, 1); // 直接震碎消失！
        continue;
      } else {
        player.hp = Math.max(0, player.hp - obs.damage);
        player.invincibleTimer = 50;
        screenShake = 9;
        spawnParticles(player.x + player.w / 2, player.y + player.h / 2, '#ef4444', 16);
        spawnFloatingText(player.x + player.w / 2, player.y - 16, `-${obs.damage}`, '#f87171');

        if (player.hp <= 0) {
          gameOver('體力耗盡倒下了！');
          return;
        }
      }
    }

    if (obs.x + obs.w < -150) obstacles.splice(i, 1);
  }

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
        if (item.value >= 2) {
          spawnFloatingText(item.x, item.y - 8, `+${item.value}`, '#fde047');
        }
      } else if (item.kind === 'skill') {
        triggerSkill(item.skill);
      }
      collectibles.splice(i, 1);
      continue;
    }

    if (item.x < -60) collectibles.splice(i, 1);
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const pt = particles[i];
    pt.x += pt.vx;
    pt.y += pt.vy;
    pt.life--;
    if (pt.life <= 0) particles.splice(i, 1);
  }

  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ft.y += ft.vy;
    ft.life--;
    if (ft.life <= 0) floatingTexts.splice(i, 1);
  }

  worldCursorX -= currentSpeed;
  while (worldCursorX < canvas.width + 750) {
    appendNextTemplate();
  }
}

// ==========================================
// 7. 渲染系統（含高對比發光邊框與深淵斷崖警示）
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
  const pCenterX = player.x + player.w / 2;
  const pCenterY = player.y + player.h / 2;

  if (player.magnetTimer > 0) {
    ctx.save();
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pCenterX, pCenterY, 34 + Math.sin(frameCount * 0.2) * 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  for (const img of player.afterimages) {
    const trailColor = player.tripleJumpTimer > 0 ? '#c084fc' : '#38bdf8';
    renderStickmanPose(img, trailColor, '#0284c7', img.alpha);
  }

  if (!(player.invincibleTimer > 0 && Math.floor(player.invincibleTimer / 4) % 2 === 1)) {
    renderStickmanPose(player, '#ffffff', '#94a3b8', 1);
  }

  if (player.shieldCharges > 0 && player.shieldTimer > 0) {
    ctx.save();
    const shieldR = 32;
    ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(pCenterX, pCenterY, shieldR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    for (let c = 0; c < player.shieldCharges; c++) {
      const ang = frameCount * 0.08 + (c * Math.PI * 2) / player.shieldCharges;
      const orbX = pCenterX + Math.cos(ang) * shieldR;
      const orbY = pCenterY + Math.sin(ang) * shieldR;
      ctx.fillStyle = '#e0f2fe';
      ctx.beginPath();
      ctx.arc(orbX, orbY, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawObstacle(obs) {
  ctx.save();
  const cx = obs.x + obs.w / 2;
  const cy = obs.y + obs.h / 2;
  const t = obs.visual;
  const rimColor = THEMES[activeThemeIdx].obsRim;

  // 高對比外發光輪廓，避免古城/火山障礙物融進背景色
  ctx.shadowColor = rimColor;
  ctx.shadowBlur = 7;

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
    ctx.fillStyle = t === 'f_trap' ? '#64748b' : '#f59e0b';
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
    ctx.strokeStyle = t === 'f_vine' ? '#22c55e' : t === 'a_bell' ? '#fbbf24' : '#bae6fd';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx + sway, obs.y + obs.h - 12);
    ctx.stroke();

    ctx.fillStyle = t === 'f_vine' ? '#a855f7' : t === 'a_bell' ? '#f59e0b' : '#38bdf8';
    ctx.beginPath();
    ctx.arc(cx + sway, obs.y + obs.h - 10, 11, 0, Math.PI * 2);
    ctx.fill();

  } else if (t === 'f_log' || t === 'a_wheel' || t === 'm_boulder' || t === 'v_lavaball' || t === 'd_orb') {
    ctx.translate(cx, cy);
    ctx.rotate(-frameCount * 0.16);
    const r = obs.w / 2;
    ctx.fillStyle = t === 'f_log' ? '#92400e' : t === 'a_wheel' ? '#d6d3d1' : t === 'm_boulder' ? '#64748b' : t === 'v_lavaball' ? '#ea580c' : '#c084fc';
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
    if (obs.isDoubleJumpTall) {
      ctx.fillRect(obs.x, obs.y + obs.h * 0.45, obs.w, 7);
    }
    ctx.fillRect(obs.x + 5, obs.y, 7, obs.h);
    ctx.fillRect(obs.x + obs.w - 12, obs.y, 7, obs.h);

  } else if (t === 's_hydrant' || t === 's_sign' || t === 'a_pillar' || t === 'a_statue' || t === 'v_totem' || t === 'd_chess') {
    ctx.fillStyle = t === 's_hydrant' ? '#ef4444' : t === 's_sign' ? '#3b82f6' : t === 'a_pillar' ? '#e7e5e4' : t === 'a_statue' ? '#eab308' : t === 'v_totem' ? '#57534e' : '#e879f9';
    ctx.beginPath();
    ctx.roundRect(obs.x + 4, obs.y, obs.w - 8, obs.h, 5);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
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
    ctx.fillStyle = t === 'a_arrow' ? '#fbbf24' : '#e2e8f0';
    ctx.fillRect(obs.x + 10, cy - 4, obs.w - 14, 8);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(obs.x + 10, cy - 7);
    ctx.lineTo(obs.x, cy);
    ctx.lineTo(obs.x + 10, cy + 7);
    ctx.fill();

  } else if (t === 'm_rock' || t === 'm_ice' || t === 'v_obsidian' || t === 'd_crystal' || t === 'd_rift') {
    ctx.fillStyle = t === 'm_rock' ? '#64748b' : t === 'm_ice' ? '#7dd3fc' : t === 'v_obsidian' ? '#292524' : t === 'd_crystal' ? '#e879f9' : '#6b21a8';
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
    if (obs.isDoubleJumpTall) {
      ctx.fillRect(obs.x + 4, obs.y + obs.h * 0.5, obs.w - 8, 6);
    }

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
        bomb: '#fb923c',
        shield: '#38bdf8'
      };
      const skillIcons = {
        magnet: '🧲',
        heal: '💖',
        triple: '🪽',
        bomb: '💣',
        shield: '🛡️'
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

  let upcomingAbyss = false;
  for (const p of platforms) {
    const pTheme = THEMES[p.themeIdx ?? activeThemeIdx];
    ctx.fillStyle = `rgb(${pTheme.groundFill.join(',')})`;
    ctx.fillRect(p.x, p.y, p.w, canvas.height - p.y);
    ctx.fillStyle = `rgb(${pTheme.groundTop.join(',')})`;
    ctx.fillRect(p.x, p.y, p.w, 6);

    // 若右側緊接深淵，在斷崖邊緣畫上亮黃紅警戒條
    if (p.hasAbyssRight) {
      const edgeX = p.x + p.w;
      ctx.fillStyle = '#facc15';
      ctx.fillRect(edgeX - 10, p.y, 10, 6);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(edgeX - 5, p.y - 14, 3, 14);
      if (edgeX > player.x && edgeX < canvas.width + 180) {
        upcomingAbyss = true;
      }
    }
  }

  // 右側螢幕邊緣「⚠️ 斷崖」預警標記
  if (upcomingAbyss && Math.floor(frameCount / 6) % 2 === 0) {
    ctx.save();
    ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
    ctx.beginPath();
    ctx.roundRect(canvas.width - 78, GROUND_Y - 42, 70, 24, 6);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚠️ 斷崖', canvas.width - 43, GROUND_Y - 30);
    ctx.restore();
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

  // 血量條
  const barW = 44;
  const barH = 6;
  const barX = player.x + (player.w - barW) / 2;
  const barY = player.y - 14;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

  const hpRatio = player.hp / player.maxHp;
  ctx.fillStyle = hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.25 ? '#eab308' : '#ef4444';
  ctx.fillRect(barX, barY, barW * hpRatio, barH);

  // 粒子渲染
  for (const pt of particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x, pt.y, 4, 4);
    ctx.restore();
  }

  // 浮動戰鬥與得分文字
  for (const ft of floatingTexts) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, (ft.life / ft.maxLife) * 1.4);
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(2, 6, 23, 0.85)';
    ctx.lineWidth = 3;
    ctx.strokeText(ft.text, ft.x, ft.y);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
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
  if (document.activeElement) {
    document.activeElement.blur();
  }
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

let lastJumpPressTime = 0;
function triggerJumpInput(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  const now = performance.now();
  if (now - lastJumpPressTime < 45) return;
  lastJumpPressTime = now;
  btnJump.classList.add('active');
  btnJump.blur();
  doJump();
}

btnJump.addEventListener('pointerdown', triggerJumpInput);
btnJump.addEventListener('touchstart', triggerJumpInput, { passive: false });
btnJump.addEventListener('pointerup', () => btnJump.classList.remove('active'));
btnJump.addEventListener('touchend', () => btnJump.classList.remove('active'));
btnJump.addEventListener('pointerleave', () => btnJump.classList.remove('active'));

let lastSlidePressTime = 0;
function triggerSlideInput(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  const now = performance.now();
  if (now - lastSlidePressTime < 45) return;
  lastSlidePressTime = now;
  btnSlide.classList.add('active');
  btnSlide.blur();
  handleDownPress();
}

function releaseSlideInput() {
  btnSlide.classList.remove('active');
  handleDownRelease();
}

btnSlide.addEventListener('pointerdown', triggerSlideInput);
btnSlide.addEventListener('touchstart', triggerSlideInput, { passive: false });
btnSlide.addEventListener('pointerup', releaseSlideInput);
btnSlide.addEventListener('touchend', releaseSlideInput);
btnSlide.addEventListener('pointerleave', releaseSlideInput);

initWorld();
draw();
