const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const speedEl = document.getElementById('speed-display');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayDesc = document.getElementById('overlay-desc');
const finalScoreEl = document.getElementById('final-score');
const startBtn = document.getElementById('start-btn');

const btnJump = document.getElementById('btn-jump');
const btnSlide = document.getElementById('btn-slide');

// 遊戲狀態變數
let isPlaying = false;
let animationId;
let distance = 0;
let baseSpeed = 6;
let currentSpeed = 6;
let frameCount = 0;

// 物理常數
const GRAVITY = 0.65;
const JUMP_FORCE = -12.5;
const DOUBLE_JUMP_FORCE = -11.5;
const GROUND_Y = 340;

// 玩家物件（薑餅人風格方塊角色）
const player = {
  x: 110,
  y: GROUND_Y - 56,
  normalW: 36,
  normalH: 56,
  slideW: 54,
  slideH: 28,
  w: 36,
  h: 56,
  vy: 0,
  jumpCount: 0,
  maxJumps: 2,
  isSliding: false,
  isGrounded: true,
  hp: 100,
  maxHp: 100,
  invincibleTimer: 0 // 受傷後的無敵幀
};

// 地形（地板與深淵坑洞）與障礙物陣列
let platforms = [];
let obstacles = [];
let particles = [];

// 初始化地形
function initWorld() {
  platforms = [
    { x: 0, w: 1200, y: GROUND_Y }
  ];
  obstacles = [];
  particles = [];
  distance = 0;
  currentSpeed = baseSpeed;
  frameCount = 0;

  player.y = GROUND_Y - player.normalH;
  player.vy = 0;
  player.jumpCount = 0;
  player.isSliding = false;
  player.w = player.normalW;
  player.h = player.normalH;
  player.hp = player.maxHp;
  player.invincibleTimer = 0;
}

// 跳躍動作（支援一段跳與二段跳）
function doJump() {
  if (!isPlaying) return;
  if (player.jumpCount < player.maxJumps) {
    // 若正在下蹲，起跳時自動解除下蹲
    if (player.isSliding) stopSlide();

    player.vy = player.jumpCount === 0 ? JUMP_FORCE : DOUBLE_JUMP_FORCE;
    player.jumpCount++;
    player.isGrounded = false;

    // 產生跳躍粒子特效
    spawnParticles(player.x + player.w / 2, player.y + player.h, player.jumpCount === 2 ? '#38bdf8' : '#fb923c', 8);
  }
}

// 開始下蹲滑行
function startSlide() {
  if (!isPlaying) return;
  if (!player.isSliding) {
    player.isSliding = true;
    // 若在地面上，調整 Y 座標讓腳底貼齊地面
    if (player.isGrounded) {
      player.y += (player.normalH - player.slideH);
    }
    player.w = player.slideW;
    player.h = player.slideH;
  }
}

// 結束下蹲滑行
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

// 粒子特效
function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 6 - 2,
      vy: (Math.random() - 0.5) * 6,
      life: 20 + Math.random() * 10,
      color
    });
  }
}

// 動態生成地板（含坑洞）與障礙物
function generateWorld() {
  const lastPlat = platforms[platforms.length - 1];
  if (lastPlat.x + lastPlat.w < canvas.width + 300) {
    // 隨速度增加，坑洞寬度稍微變寬但確保二段跳一定能過
    const gapWidth = Math.min(180, 90 + Math.random() * (currentSpeed * 6));
    const platWidth = 380 + Math.random() * 450;
    const newX = lastPlat.x + lastPlat.w + gapWidth;

    platforms.push({
      x: newX,
      w: platWidth,
      y: GROUND_Y
    });

    // 在新生成的安全地板上隨機放置障礙物（避開起跳點與落點邊緣）
    const safeStart = newX + 90;
    const safeEnd = newX + platWidth - 90;

    if (safeEnd - safeStart > 100) {
      const obsX = safeStart + Math.random() * (safeEnd - safeStart - 60);
      const type = Math.random();

      if (type < 0.55) {
        // 類型 1：地面尖刺（需要跳躍閃避）
        obstacles.push({
          type: 'spike',
          x: obsX,
          y: GROUND_Y - 36,
          w: 32,
          h: 36,
          damage: 25
        });
      } else {
        // 類型 2：高空飛行障礙物（高度剛好卡住站立，必須下蹲滑行通過！）
        obstacles.push({
          type: 'drone',
          x: obsX,
          y: GROUND_Y - 78, // 離地 34px，站立(56px)會撞到，下蹲(28px)可完美滑過
          w: 48,
          h: 44,
          damage: 25
        });
      }
    }
  }
}

// 矩形碰撞偵測（內縮 4px 讓判定更友善不吃虧）
function checkCollision(a, b) {
  const pad = 4;
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

  // 速度隨時間平滑加快（最高加速至 2.4 倍）
  currentSpeed = Math.min(baseSpeed * 2.4, baseSpeed + frameCount * 0.0018);
  distance += currentSpeed * 0.08;

  scoreEl.textContent = Math.floor(distance);
  speedEl.textContent = (currentSpeed / baseSpeed).toFixed(1);

  // 玩家重力與垂直移動
  player.vy += GRAVITY;
  player.y += player.vy;
  player.isGrounded = false;

  // 地板碰撞檢測
  for (let i = platforms.length - 1; i >= 0; i--) {
    const p = platforms[i];
    p.x -= currentSpeed;

    // 判斷玩家腳底是否踩在該段地板上
    const playerBottom = player.y + player.h;
    const prevBottom = playerBottom - player.vy;

    if (
      player.x + player.w - 6 > p.x &&
      player.x + 6 < p.x + p.w &&
      prevBottom <= p.y + 8 &&
      playerBottom >= p.y
    ) {
      player.y = p.y - player.h;
      player.vy = 0;
      player.isGrounded = true;
      player.jumpCount = 0; // 落地重置二段跳次數
    }

    if (p.x + p.w < -100) {
      platforms.splice(i, 1);
    }
  }

  // 掉落坑洞判定（直接死亡）
  if (player.y > canvas.height + 20) {
    gameOver('掉進深淵坑洞了！');
    return;
  }

  // 無敵時間倒數
  if (player.invincibleTimer > 0) {
    player.invincibleTimer--;
  }

  // 障礙物更新與碰撞扣血
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obs = obstacles[i];
    obs.x -= currentSpeed;

    if (player.invincibleTimer === 0 && checkCollision(player, obs)) {
      player.hp = Math.max(0, player.hp - obs.damage);
      player.invincibleTimer = 55; // 約 0.9 秒無敵閃爍
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

// 繪製畫面
function draw() {
  // 1. 背景漸層
  const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bgGrad.addColorStop(0, '#0f172a');
  bgGrad.addColorStop(1, '#1e293b');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 背景裝飾網格線（營造速度感）
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
  ctx.lineWidth = 1;
  const gridOffset = (distance * 15) % 60;
  for (let x = -gridOffset; x < canvas.width; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  // 2. 繪製地板
  for (const p of platforms) {
    // 泥土層
    ctx.fillStyle = '#334155';
    ctx.fillRect(p.x, p.y, p.w, canvas.height - p.y);
    // 表面霓虹草皮/跑道線
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(p.x, p.y, p.w, 6);
  }

  // 3. 繪製障礙物
  for (const obs of obstacles) {
    if (obs.type === 'spike') {
      // 紅色尖刺三角形
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(obs.x, obs.y + obs.h);
      ctx.lineTo(obs.x + obs.w / 2, obs.y);
      ctx.lineTo(obs.x + obs.w, obs.y + obs.h);
      ctx.closePath();
      ctx.fill();
    } else if (obs.type === 'drone') {
      // 高空飛行無人機障礙
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.roundRect(obs.x, obs.y, obs.w, obs.h, 8);
      ctx.fill();
      // 警告發光核心
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(obs.x + 8, obs.y + 16, obs.w - 16, 10);
    }
  }

  // 4. 繪製玩家（受傷無敵時閃爍）
  if (player.invincibleTimer === 0 || Math.floor(player.invincibleTimer / 4) % 2 === 0) {
    ctx.fillStyle = player.isSliding ? '#38bdf8' : '#fb923c';
    ctx.beginPath();
    ctx.roundRect(player.x, player.y, player.w, player.h, 8);
    ctx.fill();

    // 玩家眼睛（朝向右方）
    ctx.fillStyle = '#ffffff';
    const eyeX = player.x + player.w - 12;
    const eyeY = player.y + 10;
    ctx.fillRect(eyeX, eyeY, 6, 6);
  }

  // 5. 繪製玩家頭頂血條
  const barW = 48;
  const barH = 7;
  const barX = player.x + (player.w - barW) / 2;
  const barY = player.y - 16;

  // 血條底框
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

  // 血量顏色（綠 -> 黃 -> 紅）
  const hpRatio = player.hp / player.maxHp;
  ctx.fillStyle = hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.25 ? '#eab308' : '#ef4444';
  ctx.fillRect(barX, barY, barW * hpRatio, barH);

  // 6. 繪製粒子
  for (const pt of particles) {
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x, pt.y, 4, 4);
  }
}

// 主迴圈
function gameLoop() {
  if (!isPlaying) return;
  update();
  draw();
  animationId = requestAnimationFrame(gameLoop);
}

// 開始遊戲
function startGame() {
  initWorld();
  isPlaying = true;
  overlay.style.display = 'none';
  finalScoreEl.style.display = 'none';
  gameLoop();
}

// 遊戲結束
function gameOver(reason) {
  isPlaying = false;
  cancelAnimationFrame(animationId);
  overlayTitle.textContent = '💥 挑戰結束';
  overlayDesc.textContent = reason;
  finalScoreEl.textContent = `本次奔跑距離：${Math.floor(distance)} 公尺`;
  finalScoreEl.style.display = 'block';
  startBtn.textContent = '再跑一次';
  overlay.style.display = 'flex';
}

// 事件監聽：開始按鈕
startBtn.addEventListener('click', startGame);

// 事件監聽：電腦鍵盤
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
    e.preventDefault();
    if (!e.repeat) doJump();
  } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
    e.preventDefault();
    startSlide();
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowDown' || e.code === 'KeyS') {
    stopSlide();
  }
});

// 事件監聽：手機/iPad 觸控按鈕
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
  startSlide();
});
btnSlide.addEventListener('pointerup', () => {
  btnSlide.classList.remove('active');
  stopSlide();
});
btnSlide.addEventListener('pointerleave', () => {
  btnSlide.classList.remove('active');
  stopSlide();
});

// 初始靜態畫面渲染
initWorld();
draw();
