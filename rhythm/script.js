const RENDER_URL = "https://sudoku-game-zjff.onrender.com";

// 鍵位配置表（支援 4, 5, 6, 7 軌）
const KEY_CONFIGS = {
  4: { codes: ['KeyD', 'KeyF', 'KeyJ', 'KeyK'], labels: ['D', 'F', 'J', 'K'], spaceIndex: -1 },
  5: { codes: ['KeyD', 'KeyF', 'Space', 'KeyJ', 'KeyK'], labels: ['D', 'F', 'SP', 'J', 'K'], spaceIndex: 2 },
  6: { codes: ['KeyS', 'KeyD', 'KeyF', 'KeyJ', 'KeyK', 'KeyL'], labels: ['S', 'D', 'F', 'J', 'K', 'L'], spaceIndex: -1 },
  7: { codes: ['KeyS', 'KeyD', 'KeyF', 'Space', 'KeyJ', 'KeyK', 'KeyL'], labels: ['S', 'D', 'F', 'SP', 'J', 'K', 'L'], spaceIndex: 3 }
};

// 曲庫定義（難度 Lv.1 ~ Lv.10）
const SONGS = [
  {
    id: 'neon_breeze',
    title: 'Neon Breeze (入門教學)',
    bpm: 105,
    level: 1,
    duration: 36,
    scale: [261.63, 293.66, 329.63, 392.00, 440.00, 523.25],
    wave: 'sine',
    desc: '基礎單點與長條練習，適合熟悉鍵位'
  },
  {
    id: 'cyber_pulse',
    title: 'Cyber Pulse (標準電音)',
    bpm: 128,
    level: 3,
    duration: 42,
    scale: [261.63, 311.13, 392.00, 466.16, 523.25, 622.25, 783.99],
    wave: 'triangle',
    desc: '經典節奏脈衝，包含基礎雙押與長條'
  },
  {
    id: 'quantum_drift',
    title: 'Quantum Drift (量子漂移)',
    bpm: 145,
    level: 5,
    duration: 45,
    scale: [293.66, 349.23, 392.00, 440.00, 523.25, 587.33, 698.46],
    wave: 'sawtooth',
    desc: '八分音符連打與一手長條、一手單點切換'
  },
  {
    id: 'overdrive_protocol',
    title: 'Overdrive Protocol (超頻協定)',
    bpm: 165,
    level: 7,
    duration: 48,
    scale: [220.00, 261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 659.25],
    wave: 'square',
    desc: '高速階梯音型、雙押切換與複合長條'
  },
  {
    id: 'singularity_core',
    title: 'Singularity Core (奇點核心)',
    bpm: 185,
    level: 9,
    duration: 50,
    scale: [246.94, 277.18, 329.63, 369.99, 415.30, 493.88, 554.37, 659.25],
    wave: 'sawtooth',
    desc: '16分音符交互連打、高密度多押與雙手長條鎖定'
  },
  {
    id: 'eternal_apocalypse',
    title: 'ETERNAL APOCALYPSE [BOSS]',
    bpm: 205,
    level: 10,
    duration: 54,
    scale: [220.00, 233.08, 277.18, 293.66, 329.63, 349.23, 415.30, 440.00, 554.37],
    wave: 'sawtooth',
    desc: '極限多指技巧：三押和弦、雙長條夾單點、高速樓梯全開'
  }
];

const HIT_EARLY_WINDOW = 0.16;  // 提前按下容錯 160ms
const HIT_LATE_WINDOW  = 0.15;  // 過線延遲容錯 150ms（與過線淡出時間完全一致，絕無真空期）
const PERFECT_WINDOW   = 0.06;  // ±60ms 為 PERFECT

let selectedSongIndex = 1; // 預設選中 Lv.3
let laneCount = 4;
let noteSpeed = 8;       // 範圍 1 ~ 15
let stageWidthPct = 100; // 範圍 40% ~ 100%
let audioOffset = 0;

let currentUser = "";
let rhythmScores = {};

let isPlaying = false;
let isPaused = false;
let audioCtx = null;
let songStartTime = 0;
let pauseStartTime = 0;
let totalPausedTime = 0;
let animFrameId = null;

// 獨立多點觸控追蹤器（每根手指按下即鎖定該軌道直到抬起，絕不因微滑漂移吃音）
const activeTouches = new Map();
let keyboardStates = [];
let lanePressedStates = [];

let chartNotes = [];
let nextSynthStep = 0;
let score = 0;
let combo = 0;
let maxCombo = 0;
let stats = { perfect: 0, good: 0, miss: 0 };

window.onload = function() {
  currentUser = localStorage.getItem('currentUser') || "";
  const badge = document.getElementById('user-badge');
  if (currentUser && badge) {
    badge.innerText = `🟢 ${currentUser}`;
    loadRhythmScores();
  } else {
    const savedLocal = localStorage.getItem('rhythmScores_guest');
    if (savedLocal) rhythmScores = JSON.parse(savedLocal);
    renderSongList();
  }

  const savedSpeed = localStorage.getItem('rhythm_pref_speed');
  const savedWidth = localStorage.getItem('rhythm_pref_width');
  if (savedSpeed) {
    noteSpeed = parseFloat(savedSpeed);
    document.getElementById('speed-slider').value = noteSpeed;
    document.getElementById('speed-val').innerText = noteSpeed;
  }
  if (savedWidth) {
    stageWidthPct = parseInt(savedWidth, 10);
    document.getElementById('width-slider').value = stageWidthPct;
    document.getElementById('width-val').innerText = stageWidthPct;
  }

  document.getElementById('back-lobby-btn').onclick = () => {
    window.location.href = "../index.html";
  };

  renderSongList();

  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      laneCount = parseInt(btn.dataset.keys, 10);
      document.getElementById('key-hint').innerText = `對應按鍵：${KEY_CONFIGS[laneCount].labels.join(' - ')}`;
      renderSongList();
    };
  });

  const speedSlider = document.getElementById('speed-slider');
  speedSlider.oninput = () => {
    noteSpeed = parseFloat(speedSlider.value);
    document.getElementById('speed-val').innerText = noteSpeed;
    localStorage.setItem('rhythm_pref_speed', noteSpeed);
  };

  const widthSlider = document.getElementById('width-slider');
  widthSlider.oninput = () => {
    stageWidthPct = parseInt(widthSlider.value, 10);
    document.getElementById('width-val').innerText = stageWidthPct;
    localStorage.setItem('rhythm_pref_width', stageWidthPct);
  };

  const offsetSlider = document.getElementById('offset-slider');
  offsetSlider.oninput = () => {
    audioOffset = parseInt(offsetSlider.value, 10);
    document.getElementById('offset-val').innerText = audioOffset;
  };

  document.getElementById('start-btn').onclick = startGame;
  document.getElementById('retry-btn').onclick = () => {
    document.getElementById('result-modal').style.display = 'none';
    startGame();
  };
  document.getElementById('to-menu-btn').onclick = () => {
    document.getElementById('result-modal').style.display = 'none';
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('pause-btn').style.display = 'none';
    document.getElementById('menu-screen').style.display = 'flex';
    renderSongList();
  };
  document.getElementById('pause-btn').onclick = togglePause;
};

function loadRhythmScores() {
  const localCache = localStorage.getItem(`rhythmScores_${currentUser}`);
  if (localCache) rhythmScores = JSON.parse(localCache);
  renderSongList();

  fetch(`${RENDER_URL}/api/user-data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: currentUser })
  })
  .then(res => res.json())
  .then(data => {
    if (data.rhythmScores) {
      rhythmScores = Object.assign({}, rhythmScores, data.rhythmScores);
      localStorage.setItem(`rhythmScores_${currentUser}`, JSON.stringify(rhythmScores));
      renderSongList();
    }
  })
  .catch(() => {});
}

function saveRhythmScores() {
  if (!currentUser) {
    localStorage.setItem('rhythmScores_guest', JSON.stringify(rhythmScores));
    return;
  }
  localStorage.setItem(`rhythmScores_${currentUser}`, JSON.stringify(rhythmScores));

  fetch(`${RENDER_URL}/api/user-data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: currentUser })
  })
  .then(res => res.json())
  .then(userData => {
    return fetch(`${RENDER_URL}/api/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: currentUser,
        passedLevels: userData.passedLevels,
        levelTimes: userData.levelTimes,
        rhythmScores: rhythmScores
      })
    });
  })
  .catch(() => {});
}

function renderSongList() {
  const listEl = document.getElementById('song-list');
  listEl.innerHTML = '';

  SONGS.forEach((song, idx) => {
    const card = document.createElement('div');
    card.className = 'song-card' + (idx === selectedSongIndex ? ' active' : '');

    let lvClass = 'lv-easy';
    if (song.level >= 9) lvClass = 'lv-boss';
    else if (song.level >= 6) lvClass = 'lv-hard';
    else if (song.level >= 3) lvClass = 'lv-mid';

    const recordKey = `${song.id}_${laneCount}K`;
    const bestScore = rhythmScores[recordKey];
    const bestStr = bestScore ? ` • 🏆 ${laneCount}K 最高: ${bestScore}` : '';

    card.innerHTML = `
      <div class="song-card-left">
        <div class="song-name">${song.title}</div>
        <div class="song-meta">BPM ${song.bpm}${bestStr}<br>${song.desc}</div>
      </div>
      <div class="lv-badge ${lvClass}">Lv.${song.level}</div>
    `;

    card.onclick = () => {
      selectedSongIndex = idx;
      renderSongList();
    };

    listEl.appendChild(card);
  });
}

function buildStage() {
  const stageContainer = document.getElementById('stage-container');
  const lanesWrapper = document.getElementById('lanes-wrapper');

  stageContainer.style.width = `${stageWidthPct}%`;
  lanesWrapper.innerHTML = '';

  activeTouches.clear();
  keyboardStates = new Array(laneCount).fill(false);
  lanePressedStates = new Array(laneCount).fill(false);

  const spaceIdx = KEY_CONFIGS[laneCount].spaceIndex;
  const labels = KEY_CONFIGS[laneCount].labels;

  for (let i = 0; i < laneCount; i++) {
    const lane = document.createElement('div');
    lane.className = 'lane' + (i === spaceIdx ? ' space-lane' : '');
    lane.id = `lane-${i}`;

    const watermark = document.createElement('div');
    watermark.className = 'lane-key-watermark';
    watermark.innerText = labels[i];
    lane.appendChild(watermark);

    lanesWrapper.appendChild(lane);
  }
}

function generateChartForSong(song) {
  chartNotes = [];
  const beatSec = 60 / song.bpm;
  const stepSec = beatSec / 4;
  const totalSteps = Math.floor((song.duration - 2) / stepSec);
  const lv = song.level;

  let laneBusyUntil = new Array(laneCount).fill(0);
  let lastMainLane = 0;
  let stairDir = 1;

  for (let step = 16; step < totalSteps; step++) {
    const t = step * stepSec;
    const isQuarter = (step % 4 === 0);
    const isEighth = (step % 2 === 0);

    let spawnProbability = 0;
    if (lv <= 2) {
      if (!isQuarter) continue;
      spawnProbability = 0.75;
    } else if (lv <= 4) {
      if (!isEighth) continue;
      spawnProbability = isQuarter ? 0.9 : 0.45;
    } else if (lv <= 7) {
      if (isEighth) spawnProbability = 0.85;
      else spawnProbability = 0.35;
    } else {
      spawnProbability = isEighth ? 0.95 : 0.72;
    }

    if (Math.random() > spawnProbability) continue;

    let freeLanes = [];
    for (let l = 0; l < laneCount; l++) {
      // 確保同軌音符至少保留 160ms 以上間隔，避免重疊無法辨識
      if (t >= laneBusyUntil[l] + 0.16) freeLanes.push(l);
    }
    if (freeLanes.length === 0) continue;

    let mainLane;
    if (lv >= 6 && Math.random() < 0.55) {
      let candidate = lastMainLane + stairDir;
      if (candidate >= laneCount || candidate < 0) {
        stairDir *= -1;
        candidate = lastMainLane + stairDir;
      }
      mainLane = freeLanes.includes(candidate) ? candidate : freeLanes[Math.floor(Math.random() * freeLanes.length)];
    } else {
      mainLane = freeLanes[Math.floor(Math.random() * freeLanes.length)];
    }
    lastMainLane = mainLane;

    let holdDuration = 0;
    if (isQuarter && Math.random() < (lv >= 7 ? 0.28 : 0.22)) {
      const holdBeats = (lv >= 6 && Math.random() < 0.5) ? 1 : 2;
      const dur = holdBeats * beatSec;
      if (t + dur <= song.duration - 1.5) {
        holdDuration = dur;
      }
    }

    createNoteObject(t, holdDuration, mainLane);
    laneBusyUntil[mainLane] = t + holdDuration;
    freeLanes = freeLanes.filter(l => l !== mainLane);

    let chordChance = 0;
    if (lv >= 3 && lv <= 5 && isQuarter) chordChance = 0.3;
    else if (lv >= 6 && lv <= 8 && isEighth) chordChance = 0.45;
    else if (lv >= 9 && isEighth) chordChance = 0.65;

    if (freeLanes.length > 0 && Math.random() < chordChance) {
      const secondLane = freeLanes[Math.floor(Math.random() * freeLanes.length)];
      let secondHold = 0;
      if (lv >= 8 && isQuarter && Math.random() < 0.25 && t + beatSec < song.duration - 1.5) {
        secondHold = beatSec;
      }
      createNoteObject(t, secondHold, secondLane);
      laneBusyUntil[secondLane] = t + secondHold;
      freeLanes = freeLanes.filter(l => l !== secondLane);

      if (lv >= 8 && laneCount >= 5 && isQuarter && freeLanes.length > 0 && Math.random() < (lv === 10 ? 0.45 : 0.2)) {
        const thirdLane = freeLanes[Math.floor(Math.random() * freeLanes.length)];
        createNoteObject(t, 0, thirdLane);
        laneBusyUntil[thirdLane] = t;
      }
    }
  }
}

function createNoteObject(time, duration, laneIdx) {
  const laneEl = document.getElementById(`lane-${laneIdx}`);
  const spaceIdx = KEY_CONFIGS[laneCount].spaceIndex;
  const noteEl = document.createElement('div');

  if (duration > 0) {
    noteEl.className = 'hold-note' + (laneIdx === spaceIdx ? ' space-note' : '');
  } else {
    noteEl.className = 'note' + (laneIdx === spaceIdx ? ' space-note' : '');
  }

  noteEl.style.transform = 'translate3d(0, -300px, 0)';
  laneEl.appendChild(noteEl);

  chartNotes.push({
    time: time,
    duration: duration,
    lane: laneIdx,
    hit: false,
    holding: false,
    releaseStartTime: 0,
    completed: false,
    missed: false,
    lastTickTime: time,
    el: noteEl
  });
}

function startGame() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const song = SONGS[selectedSongIndex];

  document.getElementById('menu-screen').style.display = 'none';
  document.getElementById('game-screen').style.display = 'flex';
  document.getElementById('pause-btn').style.display = 'inline-block';
  document.getElementById('pause-btn').innerText = '⏸ 暫停';
  document.getElementById('hud-song-title').innerText = `${song.title} [${laneCount}K • Lv.${song.level} • 流速 ${noteSpeed}]`;

  score = 0;
  combo = 0;
  maxCombo = 0;
  stats = { perfect: 0, good: 0, miss: 0 };
  updateHUD('READY', '');

  buildStage();
  generateChartForSong(song);

  isPlaying = true;
  isPaused = false;
  totalPausedTime = 0;
  nextSynthStep = 0;
  songStartTime = audioCtx.currentTime;

  cancelAnimationFrame(animFrameId);
  gameLoop();
}

function togglePause() {
  if (!isPlaying) return;
  if (!isPaused) {
    isPaused = true;
    pauseStartTime = audioCtx.currentTime;
    activeTouches.clear();
    updateLaneVisuals();
    document.getElementById('pause-btn').innerText = '▶ 繼續';
  } else {
    isPaused = false;
    totalPausedTime += (audioCtx.currentTime - pauseStartTime);
    document.getElementById('pause-btn').innerText = '⏸ 暫停';
    gameLoop();
  }
}

function playSongSynth(song, stepIndex, time) {
  const stepSec = (60 / song.bpm) / 2;

  if (stepIndex % 2 === 0) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.12);
    gain.gain.setValueAtTime(0.42, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(time);
    osc.stop(time + 0.14);
  }

  if (stepIndex % 2 === 1 && song.level >= 3) {
    const hatOsc = audioCtx.createOscillator();
    const hatGain = audioCtx.createGain();
    hatOsc.type = 'square';
    hatOsc.frequency.setValueAtTime(3200, time);
    hatGain.gain.setValueAtTime(0.04, time);
    hatGain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
    hatOsc.connect(hatGain);
    hatGain.connect(audioCtx.destination);
    hatOsc.start(time);
    hatOsc.stop(time + 0.04);
  }

  const scale = song.scale;
  const patternOffset = (song.level >= 7) ? (stepIndex * 5 + Math.floor(stepIndex / 4)) : (stepIndex * 3);
  const freq = scale[patternOffset % scale.length];

  const synth = audioCtx.createOscillator();
  const sGain = audioCtx.createGain();
  synth.type = song.wave;
  synth.frequency.setValueAtTime(freq, time);
  sGain.gain.setValueAtTime(0.11, time);
  sGain.gain.exponentialRampToValueAtTime(0.001, time + stepSec * 0.95);
  synth.connect(sGain);
  sGain.connect(audioCtx.destination);
  synth.start(time);
  synth.stop(time + stepSec * 0.95);
}

function playHitSound(isHoldTick = false) {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(isHoldTick ? 1100 : 880, now);
  osc.frequency.exponentialRampToValueAtTime(isHoldTick ? 1400 : 1200, now + 0.035);
  gain.gain.setValueAtTime(isHoldTick ? 0.07 : 0.14, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.045);
}

function pulseHitLine() {
  const hitLine = document.getElementById('hit-line');
  if (!hitLine) return;
  hitLine.classList.add('pulse');
  clearTimeout(hitLine._pulseTimer);
  hitLine._pulseTimer = setTimeout(() => {
    hitLine.classList.remove('pulse');
  }, 60);
}

// 從按鍵（音符當下位置）炸開判定光效：PERFECT 為黃色光，GOOD 為綠色光
function spawnNoteBurst(laneIdx, yPos, isGood = false) {
  const laneEl = document.getElementById(`lane-${laneIdx}`);
  if (!laneEl) return;
  const burst = document.createElement('div');
  burst.className = 'note-burst ' + (isGood ? 'good' : 'perfect');
  burst.style.top = `${yPos}px`;
  laneEl.appendChild(burst);
  setTimeout(() => burst.remove(), 250);
}

function gameLoop() {
  if (!isPlaying || isPaused) return;

  const song = SONGS[selectedSongIndex];
  const currentSongTime = (audioCtx.currentTime - songStartTime - totalPausedTime) - (audioOffset / 1000);
  const stageHeight = document.getElementById('lanes-wrapper').clientHeight;

  const fallDuration = Math.max(0.26, 2.2 - (noteSpeed - 1) * 0.137);
  const pixelsPerSec = stageHeight / fallDuration;
  const eighthSec = (60 / song.bpm) / 2;

  while (nextSynthStep * eighthSec < currentSongTime + 0.2 && nextSynthStep * eighthSec < song.duration) {
    playSongSynth(song, nextSynthStep, songStartTime + totalPausedTime + nextSynthStep * eighthSec);
    nextSynthStep++;
  }

  for (let i = 0; i < chartNotes.length; i++) {
    const n = chartNotes[i];
    if (n.completed || n.missed) continue;

    if (n.duration === 0) {
      if (n.hit) continue;
      const timeDiff = n.time - currentSongTime;
      const yPos = stageHeight - (timeDiff * pixelsPerSec);
      n.el.style.transform = `translate3d(0, ${yPos}px, 0)`;

      // 碰到判定線之後繼續往下掉，透明度線性遞減直到完全透明才判 Miss
      if (timeDiff < 0) {
        if (timeDiff < -HIT_LATE_WINDOW) {
          n.missed = true;
          n.el.remove();
          combo = 0;
          stats.miss++;
          updateHUD('MISS', 'judge-miss');
        } else {
          const opacity = Math.max(0, 1 + (timeDiff / HIT_LATE_WINDOW));
          n.el.style.opacity = opacity.toFixed(3);
        }
      }
    } else {
      const endTime = n.time + n.duration;

      if (!n.holding) {
        const headDiff = n.time - currentSongTime;
        const headY = stageHeight - (headDiff * pixelsPerSec);
        const holdHeight = n.duration * pixelsPerSec;

        n.el.style.transform = `translate3d(0, ${headY - holdHeight}px, 0)`;
        n.el.style.height = `${holdHeight}px`;

        if (headDiff < 0) {
          if (headDiff < -HIT_LATE_WINDOW) {
            n.missed = true;
            n.el.remove();
            combo = 0;
            stats.miss++;
            updateHUD('MISS', 'judge-miss');
          } else {
            const opacity = Math.max(0, 1 + (headDiff / HIT_LATE_WINDOW));
            n.el.style.opacity = opacity.toFixed(3);
          }
        }
      } else {
        const remainingTime = endTime - currentSongTime;

        if (remainingTime <= 0.1) {
          n.completed = true;
          n.el.remove();
          combo++;
          if (combo > maxCombo) maxCombo = combo;
          stats.perfect++;
          score += 1200 + combo * 10;
          updateHUD('PERFECT', 'judge-perfect');
          pulseHitLine();
          spawnNoteBurst(n.lane, stageHeight, false);
          continue;
        }

        if (!lanePressedStates[n.lane]) {
          if (n.releaseStartTime === 0) {
            n.releaseStartTime = currentSongTime;
          } else if (currentSongTime - n.releaseStartTime > 0.12) {
            n.missed = true;
            n.el.remove();
            combo = 0;
            stats.miss++;
            updateHUD('MISS', 'judge-miss');
            continue;
          }
        } else {
          n.releaseStartTime = 0;
        }

        const currentHeight = Math.max(0, remainingTime * pixelsPerSec);
        n.el.style.transform = `translate3d(0, ${stageHeight - currentHeight}px, 0)`;
        n.el.style.height = `${currentHeight}px`;

        if (currentSongTime - n.lastTickTime >= eighthSec) {
          n.lastTickTime = currentSongTime;
          score += 200;
          document.getElementById('score').innerText = String(score).padStart(6, '0');
        }
      }
    }
  }

  if (currentSongTime >= song.duration) {
    endGame();
    return;
  }

  animFrameId = requestAnimationFrame(gameLoop);
}

// ==========================================
// 零吃音判定引擎：在所有候選音符中精準鎖定時間最近的一顆
// ==========================================
function triggerLaneHit(laneIdx) {
  if (!isPlaying || isPaused) return;
  playHitSound(false);
  pulseHitLine();

  const currentSongTime = (audioCtx.currentTime - songStartTime - totalPausedTime) - (audioOffset / 1000);
  const stageHeight = document.getElementById('lanes-wrapper').clientHeight;
  const fallDuration = Math.max(0.26, 2.2 - (noteSpeed - 1) * 0.137);
  const pixelsPerSec = stageHeight / fallDuration;

  // 篩選出該軌道「所有落在有效時間窗口 [-HIT_LATE_WINDOW, +HIT_EARLY_WINDOW] 內」的音符
  // 徹底解決被前一顆剛過線的音符卡死 FIFO 隊列的吃音問題！
  let bestCandidate = null;
  let bestAbsDiff = Infinity;

  for (let i = 0; i < chartNotes.length; i++) {
    const n = chartNotes[i];
    if (n.lane !== laneIdx || n.hit || n.holding || n.completed || n.missed) continue;

    const diff = n.time - currentSongTime; // 正值 = 提早按，負值 = 過線後按
    if (diff >= -HIT_LATE_WINDOW && diff <= HIT_EARLY_WINDOW) {
      const absDiff = Math.abs(diff);
      if (absDiff < bestAbsDiff) {
        bestAbsDiff = absDiff;
        bestCandidate = n;
      }
    }
  }

  if (!bestCandidate) return;

  const hitY = stageHeight - ((bestCandidate.time - currentSongTime) * pixelsPerSec);

  if (bestCandidate.duration === 0) {
    bestCandidate.hit = true;
    bestCandidate.completed = true;
    bestCandidate.el.remove();
    combo++;
    if (combo > maxCombo) maxCombo = combo;

    if (bestAbsDiff <= PERFECT_WINDOW) {
      stats.perfect++;
      score += 1000 + combo * 10;
      updateHUD('PERFECT', 'judge-perfect');
      spawnNoteBurst(laneIdx, hitY, false); // 黃色光
    } else {
      stats.good++;
      score += 500 + combo * 5;
      updateHUD('GOOD', 'judge-good');
      spawnNoteBurst(laneIdx, hitY, true);  // 綠色光
    }
  } else {
    bestCandidate.hit = true;
    bestCandidate.holding = true;
    bestCandidate.releaseStartTime = 0;
    bestCandidate.lastTickTime = currentSongTime;
    bestCandidate.el.style.opacity = '1';
    bestCandidate.el.classList.add('holding');
    combo++;
    if (combo > maxCombo) maxCombo = combo;

    if (bestAbsDiff <= PERFECT_WINDOW + 0.01) {
      stats.perfect++;
      score += 800;
      updateHUD('HOLD!', 'judge-perfect');
      spawnNoteBurst(laneIdx, hitY, false); // 黃色光
    } else {
      stats.good++;
      score += 400;
      updateHUD('HOLD!', 'judge-good');
      spawnNoteBurst(laneIdx, hitY, true);  // 綠色光
    }
  }
}

function updateHUD(judgeStr, cssClass) {
  document.getElementById('score').innerText = String(score).padStart(6, '0');
  document.getElementById('combo-num').innerText = combo;
  const judgeEl = document.getElementById('judge-text');
  judgeEl.innerText = judgeStr;
  judgeEl.className = `judge-text ${cssClass}`;
}

function endGame() {
  isPlaying = false;
  activeTouches.clear();
  const song = SONGS[selectedSongIndex];
  const recordKey = `${song.id}_${laneCount}K`;
  const oldBest = rhythmScores[recordKey] || 0;
  let noticeText = `歷史最高 (${laneCount}K)：${oldBest}`;

  if (score > oldBest) {
    rhythmScores[recordKey] = score;
    saveRhythmScores();
    noticeText = `🎉 刷新最高紀錄！ (原紀錄：${oldBest})`;
  }

  document.getElementById('res-song').innerText = song.title;
  document.getElementById('res-mode').innerText = `${laneCount}K`;
  document.getElementById('res-lv').innerText = `Lv.${song.level}`;
  document.getElementById('res-score').innerText = score;
  document.getElementById('res-best-notice').innerText = noticeText;
  document.getElementById('res-max-combo').innerText = maxCombo;
  document.getElementById('res-perfect').innerText = stats.perfect;
  document.getElementById('res-good').innerText = stats.good;
  document.getElementById('res-miss').innerText = stats.miss;
  document.getElementById('result-modal').style.display = 'flex';
}

// ==========================================
// 雙端輸入同步（手指按下即鎖定軌道並直接觸發判定，零狀態競態吃音）
// ==========================================
function updateLaneVisuals() {
  const nextStates = new Array(laneCount).fill(false);

  for (let i = 0; i < laneCount; i++) {
    if (keyboardStates[i]) nextStates[i] = true;
  }
  for (const laneIdx of activeTouches.values()) {
    if (laneIdx >= 0 && laneIdx < laneCount) {
      nextStates[laneIdx] = true;
    }
  }

  lanePressedStates = nextStates;

  for (let i = 0; i < laneCount; i++) {
    const laneEl = document.getElementById(`lane-${i}`);
    if (laneEl) {
      laneEl.classList.toggle('active', lanePressedStates[i]);
    }
  }
}

window.addEventListener('keydown', (e) => {
  if (!isPlaying || isPaused || e.repeat) return;
  const codes = KEY_CONFIGS[laneCount].codes;
  const idx = codes.indexOf(e.code);
  if (idx !== -1) {
    e.preventDefault();
    keyboardStates[idx] = true;
    updateLaneVisuals();
    triggerLaneHit(idx);
  }
});

window.addEventListener('keyup', (e) => {
  const codes = KEY_CONFIGS[laneCount].codes;
  const idx = codes.indexOf(e.code);
  if (idx !== -1) {
    keyboardStates[idx] = false;
    updateLaneVisuals();
  }
});

function getLaneFromClientX(clientX) {
  const stage = document.getElementById('stage-container');
  const rect = stage.getBoundingClientRect();
  if (clientX < rect.left || clientX > rect.right) return -1;
  const laneWidth = rect.width / laneCount;
  const laneIdx = Math.floor((clientX - rect.left) / laneWidth);
  return (laneIdx >= 0 && laneIdx < laneCount) ? laneIdx : -1;
}

// 1. 手指按下：鎖定落下的軌道，並直接觸發該軌道判定
window.addEventListener('touchstart', (e) => {
  if (!isPlaying || isPaused) return;
  const touchZoneTop = window.innerHeight * 0.5;
  let handled = false;

  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    if (t.clientY >= touchZoneTop) {
      const laneIdx = getLaneFromClientX(t.clientX);
      if (laneIdx !== -1) {
        activeTouches.set(t.identifier, laneIdx);
        handled = true;
        triggerLaneHit(laneIdx); // 每根新手指落下直接觸發一次判定，絕不被布林值吞音
      }
    }
  }

  if (handled) {
    e.preventDefault();
    updateLaneVisuals();
  }
}, { passive: false });

// 2. 手指移動：保持原本落下的軌道鎖定（不因手指高速連打微滑而飄到別軌）
window.addEventListener('touchmove', (e) => {
  if (!isPlaying || isPaused) return;
  let changed = false;

  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    if (activeTouches.has(t.identifier) && t.clientY < window.innerHeight * 0.35) {
      activeTouches.delete(t.identifier);
      changed = true;
    }
  }

  if (changed) {
    e.preventDefault();
    updateLaneVisuals();
  }
}, { passive: false });

// 3. 手指抬起：解除該手指鎖定
function handleTouchRelease(e) {
  let changed = false;
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    if (activeTouches.has(t.identifier)) {
      activeTouches.delete(t.identifier);
      changed = true;
    }
  }
  if (changed && isPlaying && !isPaused) {
    e.preventDefault();
    updateLaneVisuals();
  }
}

window.addEventListener('touchend', handleTouchRelease, { passive: false });
window.addEventListener('touchcancel', handleTouchRelease, { passive: false });
