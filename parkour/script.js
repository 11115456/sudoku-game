const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const speedEl = document.getElementById('speed-display');
const themeBadgeEl = document.getElementById('theme-badge');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayDesc = document.getElementById('overlay-desc');
const finalScoreEl = document.getElementById('final-score');
const startBtn = document.getElementById('start-btn');

const btnJump = document.getElementById('btn-jump');
const btnSlide = document.getElementById('btn-slide');

// 三大環境主題設定（每 400 公尺自動切換）
const THEMES = [
  {
    name: '🌲 迷霧森林',
    skyTop: '#064e3b',
    skyBottom: '#14532d',
    bgSilhouette: '#022c22',
    groundFill: '#3f2e21',
    groundTop: '#22c55e',
    groundObsType: 'thorns', // 荊棘叢
    airObsType: 'bird'       // 低空飛鳥
  },
  {
    name: '🌋 熔岩火山',
    skyTop: '#450a0a',
    skyBottom: '#7f1d1d',
    bgSilhouette: '#2a0404',
    groundFill: '#292524',
    groundTop: '#f97316',
    groundObsType: 'lava',   // 噴發火柱
    airObsType: 'meteor'     // 燃燒隕石
  },
  {
    name: '🏙️ 霓虹城市',
    skyTop: '#090d16',
    skyBottom: '#1e1b4b',
    bgSilhouette: '#0f172a',
    groundFill: '#1e293b',
    groundTop: '#38bdf8',
    groundObsType: 'electric', // 高壓電網樁
    airObsType: 'drone'        // 雷射無人機
  }
];

let currentThemeIndex = 0;

// 遊戲狀態變數
let isPlaying = false;
let animationId;
let distance = 0;
let baseSpeed = 6;
let currentSpeed = 6;
let frameCount = 0;

// 物理常數
const GRAVITY = 0.65;
const FAST_FALL_SPEED = 24; // 空中速降速度
const JUMP_FORCE = -12.5;
const DOUBLE_JUMP_FORCE = -11.5;
const GROUND_Y = 340;

// 火柴人玩家物件
const player = {
  x: 110,
  y: GROUND_Y - 58,
  normalW: 34,
  normalH: 58,
  slideW: 56,
  slideH: 26,
  w: 34,
  h: 58,
  vy: 0,
  jumpCount: 0,
  maxJumps: 2,
  isSliding: false,     // 地面滑行狀態
  downHeld: false,      // 是否按住下蹲/速降鍵
  isFastFalling: false, // 是否正在空中高速下落
  isGrounded: true,
  hp: 100,
  maxHp: 100,
  invincibleTimer: 0,
  runCycle: 0,
  flipAngle: 0
};

let platforms = [];
let obstacles = [];
let particles = [];
let bgElements = []; // 背景遠景剪影（樹、火山、大樓）

// 初始化背景裝飾物
function initBackground() {
  bgElements = [];
  for (let i = 0; i < 12; i++) {
    bgElements.push({
      x: i * 95,
      w: 50 + Math.random() * 60,
      h: 80 + Math.random() * 140
    });
  }
}

// 初始化遊戲世界
function initWorld() {
  platforms = [{ x: 0, w: 1200, y: GROUND_Y }];
  obstacles = [];
  particles = [];
  distance = 0;
  currentSpeed = baseSpeed;
  frameCount = 0;
  currentThemeIndex = 0;
  themeBadgeEl.textContent = THEMES[0].name;

  player.y = GROUND_Y - player.normalH;
  player.vy = 0;
  player.jumpCount = 0;
  player.isSliding = false;
  player.downHeld = false;
  player.isFastFalling = false;
  player.w = player.normalW;
  player.h = player.normalH;
  player.hp = player.maxHp;
  player.invincibleTimer = 0;
  player.runCycle = 0;
  player.flipAngle = 0;

  initBackground();
}

// 跳躍動作（支援一段跳與二段跳）
function doJump() {
  if (!isPlaying) return;
  if (player.jumpCount < player.maxJumps) {
    if (player.isSliding) stopSlide();
    player.isFastFalling = false;

    player.vy = player.jumpCount === 0 ? JUMP_FORCE : DOUBLE_JUMP_FORCE;
    player.jumpCount++;
    player.isGrounded = false;
    if (player.jumpCount === 2) player.flipAngle = 0;

    spawnParticles(player.x + player.w / 2, player.y + player.h, player.jumpCount === 2 ? '#38bdf8' : '#ffffff', 8);
  }
}

// 按下「下蹲 / 速降」鍵
function handleDownPress() {
  if (!isPlaying) return;
  player.downHeld = true;

  if (player.isGrounded) {
    // 在地面：進入貼地滑行
    enterSlideState();
  } else {
    // 在空中：立刻高速垂直下落（忍者必須死式速降）
    if (!player.isFastFalling) {
      player.isFastFalling = true;
      player.vy = Math.max(player.vy, FAST_FALL_SPEED);
      spawnParticles(player.x + player.w / 2, player.y, '#38bdf8', 10);
    }
  }
}

// 放開「下蹲 / 速降」鍵
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
    player.h = player.slideH;
    player.h = player.normalH;
  }
}

function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 6 - 2,
      vy: (Math.random() - 0.5) * 6,
      life: 18 + Math.random() * 10,
      color
    });
  }
}

// 生成地形與對應主題的障礙物
function generateWorld() {
  const theme = THEMES[currentThemeIndex];
  const lastPlat = platforms[platforms.length - 1];

  if (lastPlat.x + lastPlat.w < canvas.width + 300) {
    const gapWidth = Math.min(180, 90 + Math.random() * (currentSpeed * 6));
    const platWidth = 380 + Math.random() * 450;
    const newX = lastPlat.x + lastPlat.w + gapWidth;

    platforms.push({
      x: newX,
      w: platWidth,
      y: GROUND_Y,
      themeIndex: currentThemeIndex
    });

    const safeStart = newX + 95;
    const safeEnd = newX + platWidth - 95;

    if (safeEnd - safeStart > 100) {
      const obsX = safeStart + Math.random() * (safeEnd - safeStart - 60);
      const isGroundObs = Math.random() < 0.55;

      if (isGroundObs) {
        obstacles.push({
          category: 'ground',
          visual: theme.groundObsType,
          x: obsX,
          y: GROUND_Y - 38,
          w: 36,
          h: 38,
          damage: 25
        });
      } else {
        obstacles.push({
          category: 'air',
          visual: theme.airObsType,
          x: obsX,
          y: GROUND_Y - 78, // 站立必撞，滑行可過
          w: 48,
          h: 42,
          damage: 25
        });
      }
    }
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

// 更新遊戲邏輯
function update() {
  frameCount++;

  // 速度逐步加快
  currentSpeed = Math.min(baseSpeed * 2.4, baseSpeed + frameCount * 0.0018);
  distance += currentSpeed * 0.08;

  scoreEl.textContent = Math.floor(distance);
  speedEl.textContent = (currentSpeed / baseSpeed).toFixed(1);

  // 每 400 公尺切換一個主題（森林 -> 火山 -> 城市 -> 循環）
  const newThemeIndex = Math.floor(distance / 400) % THEMES.length;
  if (newThemeIndex !== currentThemeIndex) {
    currentThemeIndex = newThemeIndex;
    themeBadgeEl.textContent = THEMES[currentThemeIndex].name;
  }

  // 更新背景視差滾動
  for (const bg of bgElements) {
    bg.x -= currentSpeed * 0.25;
    if (bg.x + bg.w < 0) {
      bg.x = canvas.width + Math.random() * 40;
      bg.h = 80 + Math.random() * 140;
    }
  }

  // 垂直速度與重力
  if (player.isFastFalling) {
    player.vy = FAST_FALL_SPEED;
    if (frameCount % 2 === 0) {
      spawnParticles(player.x + player.w / 2, player.y, 'rgba(56, 189, 248, 0.7)', 1);
    }
  } else {
    player.vy += GRAVITY;
  }

  player.y += player.vy;
  const wasGrounded = player.isGrounded;
  player.isGrounded = false;

  // 地板碰撞檢測
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
      player.jumpCount = 0;

      // 如果是從空中速降落地，產生震地粒子並無縫切換成貼地滑行
      if (player.isFastFalling || (!wasGrounded && player.downHeld)) {
        player.isFastFalling = false;
        spawnParticles(player.x + player.w / 2, p.y, '#fb923c', 10);
        if (player.downHeld) {
          enterSlideState();
        }
      }
    }

    if (p.x + p.w < -100) {
      platforms.splice(i, 1);
    }
  }

  // 更新火柴人肢體動畫週期
  if (player.isGrounded && !player.isSliding) {
    player.runCycle += currentSpeed * 0.045;
  } else if (player.jumpCount === 2 && !player.isFastFalling) {
    player.flipAngle += 0.28; // 二段跳前空翻旋轉
  }

  // 滑行時的地面摩擦火花
  if (player.isGrounded && player.isSliding && frameCount % 4 === 0) {
    spawnParticles(player.x + 10, player.y + player.h, '#94a3b8', 1);
  }

  // 掉落坑洞判定
  if (player.y > canvas.height + 20) {
    gameOver('掉進深淵坑洞了！');
    return;
  }

  if (player.invincibleTimer > 0) {
    player.invincibleTimer--;
  }

  // 障礙物更新與碰撞
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obs = obstacles[i];
    obs.x -= currentSpeed;

    if (player.invincibleTimer === 0 && checkCollision(player, obs)) {
      player.hp = Math.max(0, player.hp - obs.damage);
      player.invincibleTimer = 55;
      spawnParticles(player.x + player.w / 2, player.y + player.h / 2, '#ef4444', 15);

      if (player.hp <= 0) {
        gameOver('體力耗盡倒下了！');
        return;
      }
    }

    if (obs.x + obs.w < -100) {
      obstacles.splice(i, 1);
    }
  }

  // 粒子更新
  for (let i = particles.length - 1; i >= 0; i--) {
    const pt = particles[i];
    pt.x += pt.vx;
    pt.y += pt.vy;
    pt.life--;
    if (pt.life <= 0) particles.splice(i, 1);
  }

  generateWorld();
}

// 繪製火柴人角色（含手腳跑步、跳躍、二段跳空翻、滑行姿勢）
function drawStickman() {
  if (player.invincibleTimer > 0 && Math.floor(player.invincibleTimer / 4) % 2 === 1) {
    return; // 受傷閃爍
  }

  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const cx = player.x + player.w / 2;
  const cy = player.y + player.h / 2;

  if (player.isSliding) {
    // --- 貼地滑行姿勢 ---
    const groundY = player.y + player.h;
    // 頭（靠後低姿態）
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(player.x + 14, groundY - 14, 8, 0, Math.PI * 2);
    ctx.fill();
    // 紅色頭帶
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(player.x + 8, groundY - 16);
    ctx.lineTo(player.x - 6, groundY - 22 + Math.sin(frameCount * 0.5) * 3);
    ctx.stroke();

    // 身體向後傾斜 + 向前鏟出的雙腿
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    // 軀幹
    ctx.moveTo(player.x + 18, groundY - 10);
    ctx.lineTo(player.x + 34, groundY - 5);
    // 前伸腿
    ctx.lineTo(player.x + 54, groundY - 4);
    // 彎曲後腿
    ctx.moveTo(player.x + 34, groundY - 5);
    ctx.lineTo(player.x + 42, groundY - 13);
    ctx.lineTo(player.x + 48, groundY - 6);
    // 向後張開的手臂
    ctx.moveTo(player.x + 22, groundY - 9);
    ctx.lineTo(player.x + 8, groundY - 4);
    ctx.stroke();

  } else {
    // 若在空中二段跳前空翻，旋轉畫布
    if (player.jumpCount === 2 && !player.isGrounded && !player.isFastFalling) {
      ctx.translate(cx, cy);
      ctx.rotate(player.flipAngle);
      ctx.translate(-cx, -cy);
    }

    const headX = cx + 3;
    const headY = player.y + 10;
    const shoulderX = cx + 1;
    const shoulderY = player.y + 20;
    const hipX = cx - 2;
    const hipY = player.y + 38;

    // 1. 頭部
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(headX, headY, 8, 0, Math.PI * 2);
    ctx.fill();

    // 2. 飄動的紅色忍者頭帶
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(headX - 6, headY - 2);
    ctx.lineTo(headX - 20, headY - 5 + Math.sin(frameCount * 0.4) * 4);
    ctx.moveTo(headX - 6, headY);
    ctx.lineTo(headX - 18, headY + 2 + Math.cos(frameCount * 0.4) * 4);
    ctx.stroke();

    // 3. 軀幹（微向前傾）
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(shoulderX, shoulderY);
    ctx.lineTo(hipX, hipY);
    ctx.stroke();

    // 計算四肢擺動角度
    let legAngle1, legAngle2, armAngle1, armAngle2;
    if (player.isGrounded) {
      // 跑步擺動
      legAngle1 = Math.sin(player.runCycle) * 0.85;
      legAngle2 = Math.sin(player.runCycle + Math.PI) * 0.85;
      armAngle1 = Math.sin(player.runCycle + Math.PI) * 0.9;
      armAngle2 = Math.sin(player.runCycle) * 0.9;
    } else if (player.isFastFalling) {
      // 空中速降俯衝姿勢
      legAngle1 = -0.4;
      legAngle2 = -0.2;
      armAngle1 = -1.1;
      armAngle2 = -0.9;
    } else {
      // 跳躍騰空姿勢
      legAngle1 = 0.65;
      legAngle2 = -0.55;
      armAngle1 = -0.8;
      armAngle2 = 0.7;
    }

    // 4. 繪製雙腿（大腿 + 小腿關節）
    const thighLen = 11;
    const calfLen = 10;
    [legAngle1, legAngle2].forEach((angle, idx) => {
      ctx.strokeStyle = idx === 0 ? '#ffffff' : '#cbd5e1'; // 後腿稍微暗一點增加立體感
      const kneeX = hipX + Math.sin(angle) * thighLen;
      const kneeY = hipY + Math.cos(angle) * thighLen;
      // 膝蓋向後彎曲
      const calfAngle = angle - (player.isGrounded ? Math.max(0, -Math.sin(player.runCycle + idx * Math.PI)) * 0.8 : 0.6);
      const footX = kneeX + Math.sin(calfAngle) * calfLen;
      const footY = kneeY + Math.cos(calfAngle) * calfLen;

      ctx.beginPath();
      ctx.moveTo(hipX, hipY);
      ctx.lineTo(kneeX, kneeY);
      ctx.lineTo(footX, footY);
      ctx.stroke();
    });

    // 5. 繪製雙手（上臂 + 前臂關節）
    const upperArmLen = 9;
    const foreArmLen = 9;
    [armAngle1, armAngle2].forEach((angle, idx) => {
      ctx.strokeStyle = idx === 0 ? '#ffffff' : '#cbd5e1';
      const elbowX = shoulderX + Math.sin(angle) * upperArmLen;
      const elbowY = shoulderY + Math.cos(angle) * upperArmLen;
      // 手肘向前彎曲
      const foreAngle = angle + 0.7;
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

// 繪製各主題專屬障礙物外觀
function drawObstacle(obs) {
  switch (obs.visual) {
    case 'thorns': // 🌲 森林：帶刺荊棘叢
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(obs.x + obs.w / 2, obs.y + obs.h - 10, 16, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#ef4444'; // 紅刺尖端
      for (let i = 0; i < 3; i++) {
        const sx = obs.x + 6 + i * 12;
        ctx.beginPath();
        ctx.moveTo(sx - 4, obs.y + 18);
        ctx.lineTo(sx, obs.y);
        ctx.lineTo(sx + 4, obs.y + 18);
        ctx.fill();
      }
      break;

    case 'bird': // 🌲 森林：低空飛鳥
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.ellipse(obs.x + obs.w / 2, obs.y + obs.h / 2 + 4, 20, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      // 翅膀拍動
      const wingY = Math.sin(frameCount * 0.35) * 10;
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(obs.x + 22, obs.y + 20);
      ctx.lineTo(obs.x + 30, obs.y + 8 + wingY);
      ctx.stroke();
      // 尖喙
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(obs.x + 6, obs.y + 22);
      ctx.lineTo(obs.x - 4, obs.y + 26);
      ctx.lineTo(obs.x + 6, obs.y + 29);
      ctx.fill();
      break;

    case 'lava': // 🌋 火山：噴發火柱
      const flicker = Math.sin(frameCount * 0.5) * 5;
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(obs.x, obs.y + obs.h);
      ctx.lineTo(obs.x + obs.w * 0.25, obs.y + 6 + flicker);
      ctx.lineTo(obs.x + obs.w * 0.5, obs.y - 4 - flicker);
      ctx.lineTo(obs.x + obs.w * 0.75, obs.y + 8 + flicker);
      ctx.lineTo(obs.x + obs.w, obs.y + obs.h);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(obs.x + 8, obs.y + 18, obs.w - 16, obs.h - 18);
      break;

    case 'meteor': // 🌋 火山：燃燒隕石
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.arc(obs.x + 20, obs.y + obs.h / 2, 18, 0, Math.PI * 2);
      ctx.fill();
      // 火焰拖尾
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(obs.x + 26, obs.y + 8);
      ctx.lineTo(obs.x + 54, obs.y + 21);
      ctx.lineTo(obs.x + 26, obs.y + 34);
      ctx.fill();
      break;

    case 'electric': // 🏙️ 城市：高壓電網樁
      ctx.fillStyle = '#64748b';
      ctx.fillRect(obs.x + 12, obs.y + 6, 12, obs.h - 6);
      // 電弧閃光
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(obs.x + 4, obs.y + 10);
      ctx.lineTo(obs.x + 18, obs.y + 2);
      ctx.lineTo(obs.x + 32, obs.y + 12);
      ctx.stroke();
      break;

    case 'drone': // 🏙️ 城市：雷射無人機
    default:
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.roundRect(obs.x, obs.y + 6, obs.w, obs.h - 12, 8);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(obs.x + 8, obs.y + 18, obs.w - 16, 8);
      break;
  }
}

// 繪製主畫面
function draw() {
  const theme = THEMES[currentThemeIndex];

  // 1. 主題天空漸層
  const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bgGrad.addColorStop(0, theme.skyTop);
  bgGrad.addColorStop(1, theme.skyBottom);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. 繪製主題遠景剪影
  ctx.fillStyle = theme.bgSilhouette;
  for (const bg of bgElements) {
    if (currentThemeIndex === 0) {
      // 森林：三角形松樹剪影
      ctx.beginPath();
      ctx.moveTo(bg.x, GROUND_Y);
      ctx.lineTo(bg.x + bg.w / 2, GROUND_Y - bg.h);
      ctx.lineTo(bg.x + bg.w, GROUND_Y);
      ctx.fill();
    } else if (currentThemeIndex === 1) {
      // 火山：平頂火山口剪影
      ctx.beginPath();
      ctx.moveTo(bg.x - 20, GROUND_Y);
      ctx.lineTo(bg.x + bg.w * 0.35, GROUND_Y - bg.h * 0.8);
      ctx.lineTo(bg.x + bg.w * 0.65, GROUND_Y - bg.h * 0.8);
      ctx.lineTo(bg.x + bg.w + 20, GROUND_Y);
      ctx.fill();
    } else {
      // 城市：摩天大樓剪影
      ctx.fillRect(bg.x, GROUND_Y - bg.h, bg.w, bg.h);
    }
  }

  // 3. 繪製地板
  for (const p of platforms) {
    const pTheme = THEMES[p.themeIndex ?? currentThemeIndex];
    ctx.fillStyle = pTheme.groundFill;
    ctx.fillRect(p.x, p.y, p.w, canvas.height - p.y);
    ctx.fillStyle = pTheme.groundTop;
    ctx.fillRect(p.x, p.y, p.w, 6);
  }

  // 4. 繪製障礙物
  for (const obs of obstacles) {
    drawObstacle(obs);
  }

  // 5. 繪製火柴人玩家
  drawStickman();

  // 6. 繪製玩家頭頂血條
  const barW = 48;
  const barH = 7;
  const barX = player.x + (player.w - barW) / 2;
  const barY = player.y - 16;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

  const hpRatio = player.hp / player.maxHp;
  ctx.fillStyle = hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.25 ? '#eab308' : '#ef4444';
  ctx.fillRect(barX, barY, barW * hpRatio, barH);

  // 7. 繪製粒子
  for (const pt of particles) {
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x, pt.y, 4, 4);
  }
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
  finalScoreEl.textContent = `本次奔跑距離：${Math.floor(distance)} 公尺（抵達：${THEMES[currentThemeIndex].name}）`;
  finalScoreEl.style.display = 'block';
  startBtn.textContent = '再跑一次';
  overlay.style.display = 'flex';
}

startBtn.addEventListener('click', startGame);

// 電腦鍵盤控制
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

// 手機/iPad 觸控按鈕控制
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
