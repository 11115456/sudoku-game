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
    ambientColor: 'rgba(167, 243, 208, 0.45)'
  },
  {
    name: '🌋 熔岩火山',
    skyTop: '#2a0404',
    skyBottom: '#7f1d1d',
    bgFar: '#1c0202',
    bgNear: '#450a0a',
    groundFill: '#1c1917',
    groundTop: '#f97316',
    ambientColor: 'rgba(251, 146, 60, 0.65)'
  },
  {
    name: '🏙️ 霓虹城市',
    skyTop: '#050811',
    skyBottom: '#1e1b4b',
    bgFar: '#090d16',
    bgNear: '#0f172a',
    groundFill: '#0f172a',
    groundTop: '#38bdf8',
    ambientColor: 'rgba(56, 189, 248, 0.4)'
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
const JUMP_FORCE = -12.8;
const DOUBLE_JUMP_FORCE = -11.8;
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
  afterimages: []
};

let platforms = [];
let obstacles = [];
let particles = [];
let bgElements = [];
let ambientParticles = [];

function initBackground() {
  bgElements = [];
  for (let i = 0; i < 14; i++) {
    bgElements.push({
      x: i * 85,
      w: 65 + Math.random() * 65,
      h: 110 + Math.random() * 140,
      layer: i % 2
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

// 根據當前關卡主題生成多樣化障礙陣型
function spawnThemeObstacle(xPos, themeIdx) {
  const roll = Math.random();

  if (themeIdx === 0) {
    // ================= 🌲 迷霧森林 =================
    if (roll < 0.35) {
      // 1. 高低不一的真實大樹（矮樹 52px 一段跳，高樹 96px 必須二段跳！）
      const isTall = Math.random() < 0.5;
      const treeH = isTall ? 92 + Math.random() * 10 : 52 + Math.random() * 12;
      const treeW = isTall ? 54 : 44;
      obstacles.push({
        visual: 'real_tree',
        x: xPos,
        y: GROUND_Y - treeH,
        w: treeW,
        h: treeH,
        isTall,
        damage: 25,
        phase: Math.random() * Math.PI * 2
      });
    } else if (roll < 0.65) {
      // 2. 並排高空飛鳥陣（強制玩家必須下蹲滑行通過！）
      // 上下兩排封死跳躍空間，只留貼地 34px 滑行通道
      const count = 3;
      for (let i = 0; i < count; i++) {
        // 下排飛鳥（離地 36px，站立必撞、滑行安全）
        obstacles.push({
          visual: 'bird',
          x: xPos + i * 44,
          baseY: GROUND_Y - 72,
          y: GROUND_Y - 72,
          w: 44,
          h: 34,
          speedBonus: 1.6,
          waveAmp: 6,
          damage: 25,
          phase: i * 0.7
        });
        // 上排飛鳥（封死二段跳空間）
        obstacles.push({
          visual: 'bird',
          x: xPos + i * 44 + 20,
          baseY: GROUND_Y - 135,
          y: GROUND_Y - 135,
          w: 44,
          h: 34,
          speedBonus: 1.6,
          waveAmp: 6,
          damage: 25,
          phase: i * 0.7 + 1.5
        });
      }
    } else if (roll < 0.85) {
      // 3. 森林捕獸夾 / 毒蘑菇叢（小型地面障礙）
      obstacles.push({
        visual: 'mushroom_trap',
        x: xPos,
        y: GROUND_Y - 34,
        w: 46,
        h: 34,
        damage: 20,
        phase: Math.random() * Math.PI * 2
      });
    } else {
      // 4. 懸吊擺盪毒藤蔓（從上方垂掛下來，需要滑行鑽過）
      obstacles.push({
        visual: 'vine',
        x: xPos,
        y: GROUND_Y - 175,
        w: 32,
        h: 138, // 底部離地 37px，剛好讓滑行(25px)鑽過
        damage: 25,
        phase: Math.random() * Math.PI * 2
      });
    }

  } else if (themeIdx === 1) {
    // ================= 🌋 熔岩火山 =================
    if (roll < 0.35) {
      // 1. 高低錯落黑曜石結晶峰（有高有低）
      const isTall = Math.random() < 0.5;
      const h = isTall ? 88 : 48;
      obstacles.push({
        visual: 'obsidian',
        x: xPos,
        y: GROUND_Y - h,
        w: 48,
        h: h,
        isTall,
        damage: 25,
        phase: 0
      });
    } else if (roll < 0.65) {
      // 2. 高空並排旋轉火輪陣（強制下蹲滑行）
      for (let i = 0; i < 2; i++) {
        obstacles.push({
          visual: 'fire_wheel',
          x: xPos + i * 56,
          baseY: GROUND_Y - 78,
          y: GROUND_Y - 78,
          w: 44,
          h: 44,
          speedBonus: 0.5,
          waveAmp: 4,
          damage: 25,
          phase: i * 1.2
        });
        obstacles.push({
          visual: 'fire_wheel',
          x: xPos + i * 56 + 25,
          baseY: GROUND_Y - 140,
          y: GROUND_Y - 140,
          w: 44,
          h: 44,
          speedBonus: 0.5,
          waveAmp: 4,
          damage: 25,
          phase: i * 1.2 + 1
        });
      }
    } else if (roll < 0.85) {
      // 3. 脈動噴發岩漿柱
      obstacles.push({
        visual: 'geyser',
        x: xPos,
        y: GROUND_Y - 54,
        w: 42,
        h: 54,
        damage: 25,
        phase: Math.random() * Math.PI * 2
      });
    } else {
      // 4. 斜向墜落燃燒隕石
      obstacles.push({
        visual: 'meteor',
        x: xPos + 80,
        baseY: GROUND_Y - 110,
        y: GROUND_Y - 110,
        w: 42,
        h: 42,
        speedBonus: 2.8,
        vyDrop: 1.1, // 邊飛邊往下斜墜
        waveAmp: 0,
        damage: 30,
        phase: 0
      });
    }

  } else {
    // ================= 🏙️ 霓虹城市 =================
    if (roll < 0.35) {
      // 1. 高低全息街頭路障 / 雙層貨櫃（有高有低）
      const isTall = Math.random() < 0.5;
      const h = isTall ? 86 : 46;
      obstacles.push({
        visual: 'container',
        x: xPos,
        y: GROUND_Y - h,
        w: 52,
        h: h,
        isTall,
        damage: 25,
        phase: 0
      });
    } else if (roll < 0.65) {
      // 2. 雙層無人機雷射封鎖線（強制下蹲滑行）
      for (let i = 0; i < 2; i++) {
        obstacles.push({
          visual: 'drone',
          x: xPos + i * 58,
          baseY: GROUND_Y - 76,
          y: GROUND_Y - 76,
          w: 48,
          h: 36,
          speedBonus: 0.8,
          waveAmp: 5,
          damage: 25,
          phase: i
        });
        obstacles.push({
          visual: 'drone',
          x: xPos + i * 58,
          baseY: GROUND_Y - 138,
          y: GROUND_Y - 138,
          w: 48,
          h: 36,
          speedBonus: 0.8,
          waveAmp: 5,
          damage: 25,
          phase: i + 1.5
        });
      }
    } else if (roll < 0.85) {
      // 3. 高壓電弧柵欄
      obstacles.push({
        visual: 'tesla',
        x: xPos,
        y: GROUND_Y - 52,
        w: 44,
        h: 52,
        damage: 25,
        phase: 0
      });
    } else {
      // 4. 高速追蹤磁浮飛彈（貼中高空高速衝刺）
      obstacles.push({
        visual: 'missile',
        x: xPos + 60,
        baseY: GROUND_Y - 68,
        y: GROUND_Y - 68,
        w: 56,
        h: 26,
        speedBonus: 3.6,
        waveAmp: 2,
        damage: 30,
        phase: 0
      });
    }
  }
}

// 生成地形與障礙物
function generateWorld() {
  const lastPlat = platforms[platforms.length - 1];

  if (lastPlat.x + lastPlat.w < canvas.width + 320) {
    const gapWidth = Math.min(185, 95 + Math.random() * (currentSpeed * 6));
    const platWidth = 480 + Math.random() * 520;
    const newX = lastPlat.x + lastPlat.w + gapWidth;

    platforms.push({
      x: newX,
      w: platWidth,
      y: GROUND_Y,
      themeIndex: currentThemeIndex
    });

    // 若地板夠長，最多可放 2 組有安全間距的障礙物，讓節奏更緊湊豐富
    const safeStart = newX + 110;
    const safeEnd = newX + platWidth - 130;

    if (safeEnd - safeStart > 340) {
      const firstX = safeStart + Math.random() * 60;
      const secondX = firstX + 240 + Math.random() * 70;
      spawnThemeObstacle(firstX, currentThemeIndex);
      if (secondX < safeEnd) {
        spawnThemeObstacle(secondX, currentThemeIndex);
      }
    } else if (safeEnd - safeStart > 100) {
      const obsX = safeStart + Math.random() * (safeEnd - safeStart - 60);
      spawnThemeObstacle(obsX, currentThemeIndex);
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

  currentSpeed = Math.min(baseSpeed * 2.45, baseSpeed + frameCount * 0.0018);
  distance += currentSpeed * 0.08;

  scoreEl.textContent = Math.floor(distance);
  speedEl.textContent = (currentSpeed / baseSpeed).toFixed(1);

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
      ap.y -= 1.2;
    } else if (currentThemeIndex === 2) {
      ap.y += 4.5;
    } else {
      ap.y += Math.sin(frameCount * 0.05 + ap.phase) * 0.6;
    }

    if (ap.x < 0) ap.x = canvas.width;
    if (ap.y < 0) ap.y = canvas.height;
    if (ap.y > canvas.height) ap.y = 0;
  }

  // 紀錄高速殘影
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
        screenShake = 5;
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

  // 火柴人跑步動畫週期
  if (player.isGrounded && !player.isSliding) {
    player.runCycle += currentSpeed * 0.052;
  } else if (player.jumpCount === 2 && !player.isFastFalling) {
    player.flipAngle += 0.32;
  }

  if (player.isGrounded && player.isSliding && frameCount % 3 === 0) {
    spawnParticles(player.x + 8, player.y + player.h, '#38bdf8', 1);
  }

  if (player.y > canvas.height + 20) {
    gameOver('掉進深淵坑洞了！');
    return;
  }

  if (player.invincibleTimer > 0) {
    player.invincibleTimer--;
  }

  // 障礙物移動與動態軌跡更新
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obs = obstacles[i];
    obs.x -= currentSpeed + (obs.speedBonus || 0);

    // 空中波浪飛行軌跡
    if (obs.baseY !== undefined) {
      if (obs.vyDrop) {
        obs.baseY = Math.min(GROUND_Y - obs.h, obs.baseY + obs.vyDrop);
      }
      const amp = obs.waveAmp ?? 0;
      obs.y = obs.baseY + Math.sin(frameCount * 0.1 + obs.phase) * amp;
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

    if (obs.x + obs.w < -160) {
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

// 繪製單一火柴人骨架
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
    const groundY = state.y + player.slideH;
    ctx.beginPath();
    ctx.arc(state.x + 14, groundY - 13, 7.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(state.x + 18, groundY - 10);
    ctx.lineTo(state.x + 34, groundY - 4);
    ctx.lineTo(state.x + 56, groundY - 4);
    ctx.moveTo(state.x + 34, groundY - 4);
    ctx.lineTo(state.x + 41, groundY - 12);
    ctx.lineTo(state.x + 48, groundY - 5);
    ctx.moveTo(state.x + 22, groundY - 9);
    ctx.lineTo(state.x + 6, groundY - 5);
    ctx.stroke();

  } else {
    if (state.jumpCount === 2 && !state.isGrounded && !player.isFastFalling) {
      ctx.translate(cx, cy);
      ctx.rotate(state.flipAngle);
      ctx.translate(-cx, -cy);
    }

    const bob = state.isGrounded ? Math.abs(Math.sin(state.runCycle)) * 3.5 : 0;

    const headX = cx + 11;
    const headY = state.y + 11 + bob;
    const shoulderX = cx + 7;
    const shoulderY = state.y + 21 + bob;
    const hipX = cx - 4;
    const hipY = state.y + 39 + bob;

    ctx.beginPath();
    ctx.arc(headX, headY, 7.8, 0, Math.PI * 2);
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
  for (const img of player.afterimages) {
    renderStickmanPose(img, '#38bdf8', '#0284c7', img.alpha);
  }

  if (player.invincibleTimer > 0 && Math.floor(player.invincibleTimer / 4) % 2 === 1) {
    return;
  }
  renderStickmanPose(player, '#ffffff', '#94a3b8', 1);
}

// 繪製所有細緻主題障礙物
function drawObstacle(obs) {
  ctx.save();
  const cx = obs.x + obs.w / 2;
  const cy = obs.y + obs.h / 2;

  switch (obs.visual) {
    // ================= 🌲 森林障礙物 =================
    case 'real_tree': {
      // 真實大樹：抓地樹根 + 粗壯樹幹 + 樹皮紋理 + 多層茂密立體樹冠
      const trunkW = obs.w * 0.38;
      const trunkX = cx - trunkW / 2;
      const crownRadius = obs.w * 0.56;
      const crownY = obs.y + crownRadius * 0.85;

      // 1. 抓地樹根與樹幹
      ctx.fillStyle = '#5c3a21';
      ctx.beginPath();
      ctx.moveTo(cx - trunkW * 0.85, obs.y + obs.h);
      ctx.quadraticCurveTo(trunkX, obs.y + obs.h - 10, trunkX, crownY);
      ctx.lineTo(trunkX + trunkW, crownY);
      ctx.quadraticCurveTo(trunkX + trunkW, obs.y + obs.h - 10, cx + trunkW * 0.85, obs.y + obs.h);
      ctx.closePath();
      ctx.fill();

      // 樹幹垂直紋理
      ctx.strokeStyle = '#3b2210';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 2, crownY + 8);
      ctx.lineTo(cx - 3, obs.y + obs.h - 3);
      ctx.moveTo(cx + 4, crownY + 12);
      ctx.lineTo(cx + 5, obs.y + obs.h - 4);
      ctx.stroke();

      // 2. 多層次立體茂密樹冠（深綠底層 -> 翠綠中層 -> 亮綠高光）
      ctx.fillStyle = '#14532d';
      ctx.beginPath();
      ctx.arc(cx - crownRadius * 0.45, crownY + 5, crownRadius * 0.65, 0, Math.PI * 2);
      ctx.arc(cx + crownRadius * 0.45, crownY + 5, crownRadius * 0.65, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.arc(cx, crownY - 4, crownRadius * 0.82, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.arc(cx - crownRadius * 0.22, crownY - 10, crownRadius * 0.42, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'mushroom_trap': {
      // 毒蘑菇與荊棘叢
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(cx, obs.y + obs.h, 22, Math.PI, 0);
      ctx.fill();

      // 兩朵紅底白點毒蘑菇
      [cx - 10, cx + 10].forEach((mx, idx) => {
        const mh = idx === 0 ? 22 : 17;
        ctx.fillStyle = '#fef3c7';
        ctx.fillRect(mx - 3, obs.y + obs.h - mh, 6, mh);
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(mx, obs.y + obs.h - mh, 10, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(mx - 3, obs.y + obs.h - mh - 4, 2, 0, Math.PI * 2);
        ctx.arc(mx + 4, obs.y + obs.h - mh - 3, 1.8, 0, Math.PI * 2);
        ctx.fill();
      });
      break;
    }

    case 'vine': {
      // 懸吊擺盪毒藤蔓
      const sway = Math.sin(frameCount * 0.08 + obs.phase) * 8;
      ctx.strokeStyle = '#16a34a';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(cx, 0); // 從畫面最頂端垂下
      ctx.quadraticCurveTo(cx + sway, obs.y + obs.h * 0.5, cx - sway * 0.5, obs.y + obs.h - 10);
      ctx.stroke();

      // 末端帶刺毒花球
      const tipX = cx - sway * 0.5;
      const tipY = obs.y + obs.h - 10;
      ctx.fillStyle = '#9333ea';
      ctx.beginPath();
      ctx.arc(tipX, tipY, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(tipX, tipY, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'bird': {
      // 雙關節拍翅猛禽飛鳥
      const flap = Math.sin(frameCount * 0.45 + obs.phase);
      // 尾羽
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.moveTo(cx + 12, cy);
      ctx.lineTo(cx + 24, cy - 5);
      ctx.lineTo(cx + 22, cy + 4);
      ctx.fill();

      // 鳥身
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 16, 8, -0.1, 0, Math.PI * 2);
      ctx.fill();

      // 鳥喙與眼睛
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(cx - 14, cy - 2);
      ctx.lineTo(cx - 24, cy + 2);
      ctx.lineTo(cx - 13, cy + 4);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx - 8, cy - 2, 2.2, 0, Math.PI * 2);
      ctx.fill();

      // 拍動翅膀
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 3.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - 2, cy - 2);
      ctx.lineTo(cx + 4, cy - 13 * flap);
      ctx.lineTo(cx + 13, cy - 22 * flap);
      ctx.stroke();
      break;
    }

    // ================= 🌋 火山障礙物 =================
    case 'obsidian': {
      // 高低錯落黑曜石結晶尖峰
      ctx.fillStyle = '#1c1917';
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(obs.x, obs.y + obs.h);
      ctx.lineTo(obs.x + obs.w * 0.3, obs.y + obs.h * 0.35);
      ctx.lineTo(cx, obs.y);
      ctx.lineTo(obs.x + obs.w * 0.72, obs.y + obs.h * 0.4);
      ctx.lineTo(obs.x + obs.w, obs.y + obs.h);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 內部高熱熔岩脈絡
      ctx.strokeStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(cx, obs.y + 8);
      ctx.lineTo(cx - 5, obs.y + obs.h * 0.6);
      ctx.lineTo(cx + 4, obs.y + obs.h - 4);
      ctx.stroke();
      break;
    }

    case 'geyser': {
      // 噴發岩漿柱
      const pulse = Math.sin(frameCount * 0.38 + obs.phase) * 7;
      ctx.fillStyle = '#44403c';
      ctx.beginPath();
      ctx.moveTo(obs.x, obs.y + obs.h);
      ctx.lineTo(obs.x + 8, obs.y + obs.h - 16);
      ctx.lineTo(obs.x + obs.w - 8, obs.y + obs.h - 16);
      ctx.lineTo(obs.x + obs.w, obs.y + obs.h);
      ctx.fill();

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(obs.x + 8, obs.y + obs.h - 14);
      ctx.lineTo(obs.x + 12, obs.y + pulse);
      ctx.lineTo(cx, obs.y - 6 - pulse);
      ctx.lineTo(obs.x + obs.w - 12, obs.y + pulse);
      ctx.lineTo(obs.x + obs.w - 8, obs.y + obs.h - 14);
      ctx.fill();

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.moveTo(obs.x + 14, obs.y + obs.h - 14);
      ctx.lineTo(cx, obs.y + 8 - pulse * 0.5);
      ctx.lineTo(obs.x + obs.w - 14, obs.y + obs.h - 14);
      ctx.fill();
      break;
    }

    case 'fire_wheel': {
      // 半空旋轉烈焰齒輪
      ctx.translate(cx, cy);
      ctx.rotate(-frameCount * 0.2);
      ctx.fillStyle = '#ea580c';
      for (let i = 0; i < 6; i++) {
        ctx.rotate(Math.PI / 3);
        ctx.beginPath();
        ctx.moveTo(-5, -14);
        ctx.lineTo(0, -23);
        ctx.lineTo(5, -14);
        ctx.fill();
      }
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'meteor': {
      // 斜向墜落燃燒隕石
      ctx.fillStyle = 'rgba(249, 115, 22, 0.75)';
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy - 12);
      ctx.lineTo(cx + 42, cy - 32);
      ctx.lineTo(cx + 12, cy + 12);
      ctx.fill();

      ctx.translate(cx, cy);
      ctx.rotate(frameCount * 0.18);
      ctx.fillStyle = '#7c2d12';
      ctx.beginPath();
      ctx.arc(0, 0, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-10, -5);
      ctx.lineTo(3, 4);
      ctx.lineTo(11, -6);
      ctx.stroke();
      break;
    }

    // ================= 🏙️ 城市障礙物 =================
    case 'container': {
      // 高低工業貨櫃 / 全息警戒路障
      ctx.fillStyle = obs.isTall ? '#1e3a8a' : '#b45309';
      ctx.strokeStyle = obs.isTall ? '#38bdf8' : '#facc15';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(obs.x, obs.y, obs.w, obs.h, 6);
      ctx.fill();
      ctx.stroke();

      // 黃黑斜紋警戒帶
      ctx.fillStyle = obs.isTall ? '#38bdf8' : '#facc15';
      ctx.fillRect(obs.x + 4, obs.y + 8, obs.w - 8, 8);
      if (obs.isTall) {
        ctx.fillRect(obs.x + 4, obs.y + obs.h / 2, obs.w - 8, 8);
      }
      break;
    }

    case 'tesla': {
      // 雙柱高壓電弧柵欄
      ctx.fillStyle = '#475569';
      ctx.fillRect(obs.x + 4, obs.y + 6, 8, obs.h - 6);
      ctx.fillRect(obs.x + obs.w - 12, obs.y + 6, 8, obs.h - 6);

      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(obs.x + 8, obs.y + 6, 5, 0, Math.PI * 2);
      ctx.arc(obs.x + obs.w - 8, obs.y + 6, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#e0f2fe';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(obs.x + 8, obs.y + 14);
      ctx.lineTo(cx, obs.y + 14 + (Math.random() - 0.5) * 16);
      ctx.lineTo(obs.x + obs.w - 8, obs.y + 14);
      ctx.stroke();
      break;
    }

    case 'missile': {
      // 高速磁浮飛彈
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.roundRect(obs.x + 12, obs.y + 4, obs.w - 18, obs.h - 8, 6);
      ctx.fill();

      // 紅色彈頭
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(obs.x + 14, obs.y + 4);
      ctx.lineTo(obs.x, cy);
      ctx.lineTo(obs.x + 14, obs.y + obs.h - 4);
      ctx.fill();

      // 尾端藍色離子推進焰
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(obs.x + obs.w - 6, obs.y + 6);
      ctx.lineTo(obs.x + obs.w + 18 + Math.random() * 10, cy);
      ctx.lineTo(obs.x + obs.w - 6, obs.y + obs.h - 6);
      ctx.fill();
      break;
    }

    case 'drone':
    default: {
      // 雷射巡邏無人機
      const propW = Math.abs(Math.sin(frameCount * 0.8)) * 22 + 4;
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx - propW, cy - 13);
      ctx.lineTo(cx + propW, cy - 13);
      ctx.stroke();

      ctx.fillStyle = '#312e81';
      ctx.strokeStyle = '#818cf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(obs.x + 4, cy - 8, obs.w - 8, 16, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(obs.x + 14, cy, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

function draw() {
  const theme = THEMES[currentThemeIndex];

  ctx.save();
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

  // 2. 遠景剪影（全部延伸至畫布最底端，坑洞處不穿幫）
  for (const bg of bgElements) {
    ctx.fillStyle = bg.layer === 0 ? theme.bgFar : theme.bgNear;
    const topY = GROUND_Y - bg.h;

    if (currentThemeIndex === 0) {
      ctx.fillRect(bg.x, GROUND_Y - 20, bg.w, canvas.height - (GROUND_Y - 20));
      ctx.beginPath();
      ctx.moveTo(bg.x - 10, GROUND_Y);
      ctx.lineTo(bg.x + bg.w / 2, topY);
      ctx.lineTo(bg.x + bg.w + 10, GROUND_Y);
      ctx.fill();
    } else if (currentThemeIndex === 1) {
      ctx.beginPath();
      ctx.moveTo(bg.x - 40, canvas.height);
      ctx.lineTo(bg.x + bg.w * 0.35, topY + 25);
      ctx.lineTo(bg.x + bg.w * 0.65, topY + 25);
      ctx.lineTo(bg.x + bg.w + 40, canvas.height);
      ctx.fill();
    } else {
      ctx.fillRect(bg.x, topY, bg.w, canvas.height - topY);
      if (bg.layer === 1) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
        for (let wy = topY + 14; wy < GROUND_Y - 10; wy += 22) {
          ctx.fillRect(bg.x + 10, wy, 8, 10);
          ctx.fillRect(bg.x + bg.w - 18, wy, 8, 10);
        }
      }
    }
  }

  // 3. 環境氛圍微粒
  ctx.fillStyle = theme.ambientColor;
  for (const ap of ambientParticles) {
    if (currentThemeIndex === 2) {
      ctx.fillRect(ap.x, ap.y, 1.5, 12);
    } else {
      ctx.beginPath();
      ctx.arc(ap.x, ap.y, ap.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 4. 地板
  for (const p of platforms) {
    const pTheme = THEMES[p.themeIndex ?? currentThemeIndex];
    ctx.fillStyle = pTheme.groundFill;
    ctx.fillRect(p.x, p.y, p.w, canvas.height - p.y);
    ctx.fillStyle = pTheme.groundTop;
    ctx.fillRect(p.x, p.y, p.w, 6);
  }

  // 5. 障礙物
  for (const obs of obstacles) {
    drawObstacle(obs);
  }

  // 6. 火柴人玩家
  drawStickman();

  // 7. 玩家頭頂血條
  const barW = 48;
  const barH = 7;
  const barX = player.x + (player.w - barW) / 2;
  const barY = player.y - 16;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

  const hpRatio = player.hp / player.maxHp;
  ctx.fillStyle = hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.25 ? '#eab308' : '#ef4444';
  ctx.fillRect(barX, barY, barW * hpRatio, barH);

  // 8. 粒子特效
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
