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
    skyTop: '#042f2e',
    skyBottom: '#065f46',
    bgFar: '#022c22',
    bgNear: '#064e3b',
    groundFill: '#291d18',
    groundTop: '#22c55e',
    ambientColor: 'rgba(167, 243, 208, 0.45)', // 螢火蟲光點
    groundObsType: 'tree',   // 帶刺古樹樁
    airObsType: 'bird'       // 波浪飛行飛鳥
  },
  {
    name: '🌋 熔岩火山',
    skyTop: '#2a0404',
    skyBottom: '#7f1d1d',
    bgFar: '#1c0202',
    bgNear: '#450a0a',
    groundFill: '#1c1917',
    groundTop: '#f97316',
    ambientColor: 'rgba(251, 146, 60, 0.65)',  // 飄升火星
    groundObsType: 'geyser', // 脈動岩漿噴泉
    airObsType: 'meteor'     // 旋轉燃燒隕石
  },
  {
    name: '🏙️ 霓虹城市',
    skyTop: '#050811',
    skyBottom: '#1e1b4b',
    bgFar: '#090d16',
    bgNear: '#0f172a',
    groundFill: '#0f172a',
    groundTop: '#38bdf8',
    ambientColor: 'rgba(56, 189, 248, 0.4)',   // 霓虹光雨
    groundObsType: 'tesla',  // 高壓電弧柵欄
    airObsType: 'drone'      // 雷射巡邏無人機
  }
];

let currentThemeIndex = 0;

// 遊戲狀態變數
let isPlaying = false;
let animationId;
let distance = 0;
let baseSpeed = 6.2;
let currentSpeed = 6.2;
let frameCount = 0;
let screenShake = 0;

// 物理常數
const GRAVITY = 0.65;
const FAST_FALL_SPEED = 25;
const JUMP_FORCE = -12.6;
const DOUBLE_JUMP_FORCE = -11.6;
const GROUND_Y = 340;

// 火柴人玩家物件
const player = {
  x: 115,
  y: GROUND_Y - 58,
  normalW: 34,
  normalH: 58,
  slideW: 58,
  slideH: 25,
  w: 34,
  h: 58,
  vy: 0,
  jumpCount: 0,
  maxJumps: 2,
  isSliding: false,
  downHeld: false,
  isFastFalling: false,
  isGrounded: true,
  hp: 100,
  maxHp: 100,
  invincibleTimer: 0,
  runCycle: 0,
  flipAngle: 0,
  afterimages: [] // 殘影紀錄
};

let platforms = [];
let obstacles = [];
let particles = [];
let bgElements = [];
let ambientParticles = [];

// 初始化背景遠景剪影（全部延伸至畫布底部）
function initBackground() {
  bgElements = [];
  for (let i = 0; i < 14; i++) {
    bgElements.push({
      x: i * 85,
      w: 65 + Math.random() * 65,
      h: 110 + Math.random() * 140,
      layer: i % 2 // 0: 遠景, 1: 中景
    });
  }

  ambientParticles = [];
  for (let i = 0; i < 28; i++) {
    ambientParticles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: 1.5 + Math.random() * 2.5,
      speedX: -1 - Math.random() * 2,
      speedY: (Math.random() - 0.5) * 1.5,
      phase: Math.random() * Math.PI * 2
    });
  }
}

function initWorld() {
  platforms = [{ x: 0, w: 1200, y: GROUND_Y, themeIndex: 0 }];
  obstacles = [];
  particles = [];
  distance = 0;
  currentSpeed = baseSpeed;
  frameCount = 0;
  screenShake = 0;
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
  player.afterimages = [];

  initBackground();
}

function doJump() {
  if (!isPlaying) return;
  if (player.jumpCount < player.maxJumps) {
    if (player.isSliding) stopSlide();
    player.isFastFalling = false;

    player.vy = player.jumpCount === 0 ? JUMP_FORCE : DOUBLE_JUMP_FORCE;
    player.jumpCount++;
    player.isGrounded = false;
    if (player.jumpCount === 2) player.flipAngle = 0;

    spawnParticles(
      player.x + player.w / 2,
      player.y + player.h,
      player.jumpCount === 2 ? '#38bdf8' : '#ffffff',
      10
    );
  }
}

function handleDownPress() {
  if (!isPlaying) return;
  player.downHeld = true;

  if (player.isGrounded) {
    enterSlideState();
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

function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 7 - 2,
      vy: (Math.random() - 0.5) * 7,
      life: 16 + Math.random() * 12,
      maxLife: 28,
      color
    });
  }
}

// 生成地形與主題專屬動態障礙物
function generateWorld() {
  const theme = THEMES[currentThemeIndex];
  const lastPlat = platforms[platforms.length - 1];

  if (lastPlat.x + lastPlat.w < canvas.width + 300) {
    const gapWidth = Math.min(185, 95 + Math.random() * (currentSpeed * 6));
    const platWidth = 400 + Math.random() * 460;
    const newX = lastPlat.x + lastPlat.w + gapWidth;

    platforms.push({
      x: newX,
      w: platWidth,
      y: GROUND_Y,
      themeIndex: currentThemeIndex
    });

    const safeStart = newX + 100;
    const safeEnd = newX + platWidth - 100;

    if (safeEnd - safeStart > 110) {
      const obsX = safeStart + Math.random() * (safeEnd - safeStart - 60);
      const isGroundObs = Math.random() < 0.52;

      if (isGroundObs) {
        obstacles.push({
          category: 'ground',
          visual: theme.groundObsType,
          x: obsX,
          y: GROUND_Y - 42,
          w: 42,
          h: 42,
          damage: 25,
          phase: Math.random() * Math.PI * 2
        });
      } else {
        // 空中障礙物（帶波浪飛行弧度）
        obstacles.push({
          category: 'air',
          visual: theme.airObsType,
          x: obsX,
          baseY: GROUND_Y - 82, // 基準高度：站立必撞，滑行可過
          y: GROUND_Y - 82,
          w: 50,
          h: 40,
          damage: 25,
          phase: Math.random() * Math.PI * 2
        });
      }
    }
  }
}

function checkCollision(a, b) {
  const pad = 6;
  return (
    a.x + pad < b.x + b.w - pad &&
    a.x + a.w - pad > b.x + pad &&
    a.y + pad < b.y + b.h - pad &&
    a.y + a.h - pad > b.y + pad
  );
}

function update() {
  frameCount++;
  if (screenShake > 0) screenShake--;

  // 速度逐步加快
  currentSpeed = Math.min(baseSpeed * 2.45, baseSpeed + frameCount * 0.0018);
  distance += currentSpeed * 0.08;

  scoreEl.textContent = Math.floor(distance);
  speedEl.textContent = (currentSpeed / baseSpeed).toFixed(1);

  // 每 400 公尺切換主題
  const newThemeIndex = Math.floor(distance / 400) % THEMES.length;
  if (newThemeIndex !== currentThemeIndex) {
    currentThemeIndex = newThemeIndex;
    themeBadgeEl.textContent = THEMES[currentThemeIndex].name;
  }

  // 更新背景視差滾動
  for (const bg of bgElements) {
    const parallax = bg.layer === 0 ? 0.18 : 0.35;
    bg.x -= currentSpeed * parallax;
    if (bg.x + bg.w < -30) {
      bg.x = canvas.width + 20 + Math.random() * 40;
      bg.h = 110 + Math.random() * 140;
    }
  }

  // 更新環境微粒
  for (const ap of ambientParticles) {
    ap.x += ap.speedX - currentSpeed * 0.2;
    if (currentThemeIndex === 1) {
      ap.y -= 1.2; // 火山火星往上飄
    } else if (currentThemeIndex === 2) {
      ap.y += 4.5; // 城市光雨往下落
    } else {
      ap.y += Math.sin(frameCount * 0.05 + ap.phase) * 0.6; // 森林螢火蟲漂浮
    }

    if (ap.x < 0) ap.x = canvas.width;
    if (ap.y < 0) ap.y = canvas.height;
    if (ap.y > canvas.height) ap.y = 0;
  }

  // 紀錄高速殘影（二段跳、滑行或速降時觸發）
  if (frameCount % 3 === 0 && (player.isSliding || player.isFastFalling || player.jumpCount === 2 || currentSpeed > baseSpeed * 1.5)) {
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

  // 垂直速度與重力
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

      if (player.isFastFalling || (!wasGrounded && player.downHeld)) {
        player.isFastFalling = false;
        screenShake = 5; // 速降落地微震感
        spawnParticles(player.x + player.w / 2, p.y, '#fb923c', 12);
        if (player.downHeld) {
          enterSlideState();
        }
      }
    }

    if (p.x + p.w < -120) {
      platforms.splice(i, 1);
    }
  }

  // 火柴人跑步頻率
  if (player.isGrounded && !player.isSliding) {
    player.runCycle += currentSpeed * 0.052;
  } else if (player.jumpCount === 2 && !player.isFastFalling) {
    player.flipAngle += 0.32;
  }

  // 滑行摩擦火花
  if (player.isGrounded && player.isSliding && frameCount % 3 === 0) {
    spawnParticles(player.x + 8, player.y + player.h, '#38bdf8', 1);
  }

  // 掉落坑洞判定
  if (player.y > canvas.height + 20) {
    gameOver('掉進深淵坑洞了！');
    return;
  }

  if (player.invincibleTimer > 0) {
    player.invincibleTimer--;
  }

  // 障礙物更新（含空中波浪弧度飛行）
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obs = obstacles[i];
    obs.x -= currentSpeed;

    if (obs.category === 'air') {
      // 飛鳥/無人機在空中帶弧度上下波浪飛行（幅度 14px，依然保持下蹲可安全通過）
      const waveSpeed = obs.visual === 'bird' ? 0.1 : 0.08;
      const waveAmp = obs.visual === 'bird' ? 14 : 9;
      obs.y = obs.baseY + Math.sin(frameCount * waveSpeed + obs.phase) * waveAmp;
      // 飛鳥額外稍微加快一點水平俯衝速度
      if (obs.visual === 'bird' || obs.visual === 'meteor') {
        obs.x -= 1.4;
      }
    }

    if (player.invincibleTimer === 0 && checkCollision(player, obs)) {
      player.hp = Math.max(0, player.hp - obs.damage);
      player.invincibleTimer = 55;
      screenShake = 10;
      spawnParticles(player.x + player.w / 2, player.y + player.h / 2, '#ef4444', 18);

      if (player.hp <= 0) {
        gameOver('體力耗盡倒下了！');
        return;
      }
    }

    if (obs.x + obs.w < -120) {
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

// 繪製單一火柴人骨架（可複用於本體與殘影）
function renderStickmanPose(state, colorMain, colorSub, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = colorMain;
  ctx.fillStyle = colorMain;
  ctx.lineWidth = 4.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const cx = state.x + (state.isSliding ? player.slideW : player.normalW) / 2;
  const cy = state.y + (state.isSliding ? player.slideH : player.normalH) / 2;

  if (state.isSliding) {
    // --- 極限貼地滑行姿態 ---
    const groundY = state.y + player.slideH;
    // 頭部低伏靠後
    ctx.beginPath();
    ctx.arc(state.x + 14, groundY - 13, 7.5, 0, Math.PI * 2);
    ctx.fill();

    // 後仰軀幹 + 筆直向前鏟出的雙腿
    ctx.beginPath();
    ctx.moveTo(state.x + 18, groundY - 10);
    ctx.lineTo(state.x + 34, groundY - 4);
    ctx.lineTo(state.x + 56, groundY - 4);
    // 彎曲支撐腿
    ctx.moveTo(state.x + 34, groundY - 4);
    ctx.lineTo(state.x + 41, groundY - 12);
    ctx.lineTo(state.x + 48, groundY - 5);
    // 向後張開平衡的手臂
    ctx.moveTo(state.x + 22, groundY - 9);
    ctx.lineTo(state.x + 6, groundY - 5);
    ctx.stroke();

  } else {
    // 二段跳前空翻旋轉
    if (state.jumpCount === 2 && !state.isGrounded && !player.isFastFalling) {
      ctx.translate(cx, cy);
      ctx.rotate(state.flipAngle);
      ctx.translate(-cx, -cy);
    }

    // 跑步時的身體上下起伏微動
    const bob = state.isGrounded ? Math.abs(Math.sin(state.runCycle)) * 3.5 : 0;

    // 身體大幅前傾（營造高速衝刺感！）
    const headX = cx + 11;
    const headY = state.y + 11 + bob;
    const shoulderX = cx + 7;
    const shoulderY = state.y + 21 + bob;
    const hipX = cx - 4;
    const hipY = state.y + 39 + bob;

    // 1. 頭部（無頭帶，乾淨俐落）
    ctx.beginPath();
    ctx.arc(headX, headY, 7.8, 0, Math.PI * 2);
    ctx.fill();

    // 2. 前傾軀幹
    ctx.beginPath();
    ctx.moveTo(shoulderX, shoulderY);
    ctx.lineTo(hipX, hipY);
    ctx.stroke();

    // 計算四肢衝刺角度
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
      // 騰空躍起大跨步
      legAngle1 = 0.85;
      legAngle2 = -0.65;
      armAngle1 = -0.95;
      armAngle2 = 0.85;
    }

    // 3. 雙腿（大腿 + 小腿）
    const thighLen = 11.5;
    const calfLen = 10.5;
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

    // 4. 雙臂（忍者式向後甩臂衝刺）
    const upperArmLen = 9.5;
    const foreArmLen = 9.5;
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
  // 先畫殘影
  for (const img of player.afterimages) {
    renderStickmanPose(img, '#38bdf8', '#0284c7', img.alpha);
  }

  // 再畫本體（受傷閃爍）
  if (player.invincibleTimer > 0 && Math.floor(player.invincibleTimer / 4) % 2 === 1) {
    return;
  }
  renderStickmanPose(player, '#ffffff', '#94a3b8', 1);
}

// 繪製高動態主題障礙物
function drawObstacle(obs) {
  ctx.save();
  switch (obs.visual) {
    case 'tree': // 🌲 森林：帶刺古樹樁（樹根 + 樹皮紋理 + 斷裂枝枒 + 警告紅刺）
      // 樹幹主體
      ctx.fillStyle = '#5c3a21';
      ctx.beginPath();
      ctx.moveTo(obs.x + 4, obs.y + obs.h);
      ctx.lineTo(obs.x + 10, obs.y + 6);
      ctx.lineTo(obs.x + obs.w - 10, obs.y + 6);
      ctx.lineTo(obs.x + obs.w - 4, obs.y + obs.h);
      ctx.closePath();
      ctx.fill();

      // 樹皮暗紋
      ctx.strokeStyle = '#3e2412';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(obs.x + 16, obs.y + 12);
      ctx.lineTo(obs.x + 15, obs.y + obs.h - 4);
      ctx.moveTo(obs.x + 25, obs.y + 16);
      ctx.lineTo(obs.x + 27, obs.y + obs.h - 6);
      ctx.stroke();

      // 側邊斷枝與綠葉叢
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(obs.x + 8, obs.y + 16, 8, 0, Math.PI * 2);
      ctx.arc(obs.x + obs.w - 8, obs.y + 20, 7, 0, Math.PI * 2);
      ctx.fill();

      // 頂部危險紅刺
      ctx.fillStyle = '#ef4444';
      for (let i = 0; i < 3; i++) {
        const sx = obs.x + 11 + i * 10;
        ctx.beginPath();
        ctx.moveTo(sx - 4, obs.y + 8);
        ctx.lineTo(sx, obs.y - 3);
        ctx.lineTo(sx + 4, obs.y + 8);
        ctx.fill();
      }
      break;

    case 'bird': // 🌲 森林：波浪俯衝猛禽飛鳥（雙關節拍翅動畫 + 速度風切線）
      const bx = obs.x + obs.w / 2;
      const by = obs.y + obs.h / 2 + 2;
      const flap = Math.sin(frameCount * 0.42 + obs.phase); // 快速拍翅

      // 尾羽
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.moveTo(bx + 14, by);
      ctx.lineTo(bx + 28, by - 6);
      ctx.lineTo(bx + 25, by + 5);
      ctx.fill();

      // 流線鳥身
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.ellipse(bx, by, 18, 9, -0.1, 0, Math.PI * 2);
      ctx.fill();

      // 銳利鳥喙與兇狠眼睛
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(bx - 16, by - 3);
      ctx.lineTo(bx - 27, by + 2);
      ctx.lineTo(bx - 15, by + 4);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(bx - 10, by - 2, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // 雙段式動態拍動翅膀
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bx - 2, by - 2);
      const midWingY = by - 14 * flap;
      const tipWingY = by - 24 * flap;
      ctx.lineTo(bx + 4, midWingY);
      ctx.lineTo(bx + 14, tipWingY);
      ctx.stroke();
      break;

    case 'geyser': // 🌋 火山：脈動噴發岩漿噴泉
      const pulse = Math.sin(frameCount * 0.35 + obs.phase) * 6;
      // 火山底座岩石
      ctx.fillStyle = '#44403c';
      ctx.beginPath();
      ctx.moveTo(obs.x, obs.y + obs.h);
      ctx.lineTo(obs.x + 8, obs.y + 24);
      ctx.lineTo(obs.x + obs.w - 8, obs.y + 24);
      ctx.lineTo(obs.x + obs.w, obs.y + obs.h);
      ctx.fill();

      // 噴發岩漿火柱
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(obs.x + 8, obs.y + 26);
      ctx.lineTo(obs.x + 12, obs.y + pulse);
      ctx.lineTo(obs.x + obs.w / 2, obs.y - 6 - pulse);
      ctx.lineTo(obs.x + obs.w - 12, obs.y + pulse);
      ctx.lineTo(obs.x + obs.w - 8, obs.y + 26);
      ctx.fill();

      // 內部白熱核心
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.moveTo(obs.x + 14, obs.y + 26);
      ctx.lineTo(obs.x + obs.w / 2, obs.y + 6 - pulse * 0.5);
      ctx.lineTo(obs.x + obs.w - 14, obs.y + 26);
      ctx.fill();
      break;

    case 'meteor': // 🌋 火山：高速旋轉燃燒隕石
      const mx = obs.x + 20;
      const my = obs.y + obs.h / 2;

      // 火焰尾焰
      ctx.fillStyle = 'rgba(249, 115, 22, 0.75)';
      ctx.beginPath();
      ctx.moveTo(mx, my - 15);
      ctx.lineTo(mx + 44 + Math.sin(frameCount * 0.6) * 8, my);
      ctx.lineTo(mx, my + 15);
      ctx.fill();

      // 旋轉隕石本體
      ctx.translate(mx, my);
      ctx.rotate(frameCount * 0.15);
      ctx.fillStyle = '#7c2d12';
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      // 熔岩裂縫
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-10, -5);
      ctx.lineTo(2, 3);
      ctx.lineTo(11, -6);
      ctx.moveTo(-4, 11);
      ctx.lineTo(4, -9);
      ctx.stroke();
      break;

    case 'tesla': // 🏙️ 城市：雙柱高壓電漿柵欄
      ctx.fillStyle = '#475569';
      ctx.fillRect(obs.x + 4, obs.y + 6, 8, obs.h - 6);
      ctx.fillRect(obs.x + obs.w - 12, obs.y + 6, 8, obs.h - 6);

      // 頂端發光球
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(obs.x + 8, obs.y + 6, 5, 0, Math.PI * 2);
      ctx.arc(obs.x + obs.w - 8, obs.y + 6, 5, 0, Math.PI * 2);
      ctx.fill();

      // 隨機跳動的高壓閃電弧
      ctx.strokeStyle = '#e0f2fe';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(obs.x + 8, obs.y + 12);
      ctx.lineTo(obs.x + obs.w / 2, obs.y + 12 + (Math.random() - 0.5) * 14);
      ctx.lineTo(obs.x + obs.w - 8, obs.y + 12);
      ctx.stroke();
      break;

    case 'drone': // 🏙️ 城市：雷射巡邏無人機
    default:
      const dx = obs.x + obs.w / 2;
      const dy = obs.y + obs.h / 2;

      // 頂部高速旋轉螺旋槳
      const propW = Math.abs(Math.sin(frameCount * 0.8)) * 22 + 4;
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(dx - propW, dy - 14);
      ctx.lineTo(dx + propW, dy - 14);
      ctx.stroke();

      // 機身
      ctx.fillStyle = '#312e81';
      ctx.strokeStyle = '#818cf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(obs.x + 4, dy - 9, obs.w - 8, 18, 9);
      ctx.fill();
      ctx.stroke();

      // 紅色掃描雷射眼
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(obs.x + 14, dy, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
  }
  ctx.restore();
}

function draw() {
  const theme = THEMES[currentThemeIndex];

  ctx.save();
  // 震動特效
  if (screenShake > 0) {
    const sx = (Math.random() - 0.5) * screenShake;
    const sy = (Math.random() - 0.5) * screenShake;
    ctx.translate(sx, sy);
  }

  // 1. 主題天空漸層
  const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bgGrad.addColorStop(0, theme.skyTop);
  bgGrad.addColorStop(1, theme.skyBottom);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. 繪製遠景剪影（全部延伸至 canvas.height 底部，避免坑洞處穿幫！）
  for (const bg of bgElements) {
    ctx.fillStyle = bg.layer === 0 ? theme.bgFar : theme.bgNear;
    const topY = GROUND_Y - bg.h;

    if (currentThemeIndex === 0) {
      // 森林：多層次針葉林與下方深林基底（延伸至畫布最底端）
      ctx.fillRect(bg.x, GROUND_Y - 20, bg.w, canvas.height - (GROUND_Y - 20));
      ctx.beginPath();
      ctx.moveTo(bg.x - 10, GROUND_Y);
      ctx.lineTo(bg.x + bg.w / 2, topY);
      ctx.lineTo(bg.x + bg.w + 10, GROUND_Y);
      ctx.fill();
    } else if (currentThemeIndex === 1) {
      // 火山：完整延伸至畫布底部的巨大火山山脈
      ctx.beginPath();
      ctx.moveTo(bg.x - 40, canvas.height);
      ctx.lineTo(bg.x + bg.w * 0.35, topY + 25);
      ctx.lineTo(bg.x + bg.w * 0.65, topY + 25);
      ctx.lineTo(bg.x + bg.w + 40, canvas.height);
      ctx.fill();
    } else {
      // 城市：完整延伸至畫布底部的摩天大樓群
      ctx.fillRect(bg.x, topY, bg.w, canvas.height - topY);
      // 大樓亮燈窗戶點綴
      if (bg.layer === 1) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
        for (let wy = topY + 14; wy < GROUND_Y - 10; wy += 22) {
          ctx.fillRect(bg.x + 10, wy, 8, 10);
          ctx.fillRect(bg.x + bg.w - 18, wy, 8, 10);
        }
      }
    }
  }

  // 3. 繪製環境氛圍微粒（螢火蟲 / 火星 / 光雨）
  ctx.fillStyle = theme.ambientColor;
  for (const ap of ambientParticles) {
    if (currentThemeIndex === 2) {
      ctx.fillRect(ap.x, ap.y, 1.5, 12); // 雨絲
    } else {
      ctx.beginPath();
      ctx.arc(ap.x, ap.y, ap.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 4. 繪製地板
  for (const p of platforms) {
    const pTheme = THEMES[p.themeIndex ?? currentThemeIndex];
    ctx.fillStyle = pTheme.groundFill;
    ctx.fillRect(p.x, p.y, p.w, canvas.height - p.y);
    ctx.fillStyle = pTheme.groundTop;
    ctx.fillRect(p.x, p.y, p.w, 6);
  }

  // 5. 繪製障礙物
  for (const obs of obstacles) {
    drawObstacle(obs);
  }

  // 6. 繪製火柴人玩家
  drawStickman();

  // 7. 繪製玩家頭頂血條
  const barW = 48;
  const barH = 7;
  const barX = player.x + (player.w - barW) / 2;
  const barY = player.y - 16;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

  const hpRatio = player.hp / player.maxHp;
  ctx.fillStyle = hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.25 ? '#eab308' : '#ef4444';
  ctx.fillRect(barX, barY, barW * hpRatio, barH);

  // 8. 繪製粒子
  for (const pt of particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x, pt.y, 4.5, 4.5);
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
