
// 鍵位配置表（支援 4, 5, 6, 7 軌）
const KEY_CONFIGS = {
  4: { codes: ['KeyD', 'KeyF', 'KeyJ', 'KeyK'], labels: ['D', 'F', 'J', 'K'], spaceIndex: -1 },
  5: { codes: ['KeyD', 'KeyF', 'Space', 'KeyJ', 'KeyK'], labels: ['D', 'F', 'SP', 'J', 'K'], spaceIndex: 2 },
  6: { codes: ['KeyS', 'KeyD', 'KeyF', 'KeyJ', 'KeyK', 'KeyL'], labels: ['S', 'D', 'F', 'J', 'K', 'L'], spaceIndex: -1 },
  7: { codes: ['KeyS', 'KeyD', 'KeyF', 'Space', 'KeyJ', 'KeyK', 'KeyL'], labels: ['S', 'D', 'F', 'SP', 'J', 'K', 'L'], spaceIndex: 3 }
};

// 曲庫定義（難度 Lv.1 ~ Lv.10，含專屬合成器音階與編曲風格）
const SONGS = [
  {
    id: 'neon_breeze',
    title: 'Neon Breeze (入門教學)',
    artist: 'System Synth',
    bpm: 105,
    level: 1,
    duration: 36,
    scale: [261.63, 293.66, 329.63, 392.00, 440.00, 523.25], // C大調五聲
    wave: 'sine',
    desc: '基礎單點與長條練習，適合熟悉鍵位'
  },
  {
    id: 'cyber_pulse',
    title: 'Cyber Pulse (標準電音)',
    artist: 'CyberCore',
    bpm: 128,
    level: 3,
    duration: 42,
    scale: [261.63, 311.13, 392.00, 466.16, 523.25, 622.25, 783.99], // C小調五聲
    wave: 'triangle',
    desc: '經典節奏脈衝，包含基礎雙押與長條'
  },
  {
    id: 'quantum_drift',
    title: 'Quantum Drift (量子漂移)',
    artist: 'Astral Wave',
    bpm: 145,
    level: 5,
    duration: 45,
    scale: [293.66, 349.23, 392.00, 440.00, 523.25, 587.33, 698.46], // D小調
    wave: 'sawtooth',
    desc: '八分音符連打與一手長條、一手單點切換'
  },
  {
    id: 'overdrive_protocol',
    title: 'Overdrive Protocol (超頻協定)',
    artist: 'Vortex_99',
    bpm: 165,
    level: 7,
    duration: 48,
    scale: [220.00, 261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 659.25], // A小調
    wave: 'square',
    desc: '高速階梯音型、雙押切換與複合長條'
  },
  {
    id: 'singularity_core',
    title: 'Singularity Core (奇點核心)',
    artist: 'OMEGA-X',
    bpm: 185,
    level: 9,
    duration: 50,
    scale: [246.94, 277.18, 329.63, 369.99, 415.30, 493.88, 554.37, 659.25], // B小調
    wave: 'sawtooth',
    desc: '16分音符交互連打、高密度多押與雙手長條鎖定'
  },
  {
    id: 'eternal_apocalypse',
    title: 'ETERNAL APOCALYPSE [BOSS]',
    artist: 'FINAL SYSTEM',
    bpm: 205,
    level: 10,
    duration: 54,
    scale: [220.00, 233.08, 277.18, 293.66, 329.63, 349.23, 415.30, 440.00, 554.37], // 弗里吉亞調式 (魔王曲感)
    wave: 'sawtooth',
    desc: '極限多指技巧：三押和弦、雙長條夾單點、高速樓梯全開'
  }
];

let selectedSongIndex = 1; // 預設選中 Lv.3
let laneCount = 4;
let noteSpeed = 5;
let audioOffset = 0;

let isPlaying = false;
let isPaused = false;
let audioCtx = null;
let songStartTime = 0;
let pauseStartTime = 0;
let totalPausedTime = 0;
let animFrameId = null;

let keyboardStates = [];
let touchStates = [];
let combinedStates = [];

// 譜面音符陣列
// { time: 開始秒數, duration: 持續秒數(0為單點), lane: 軌道, hit: false, holding: false, completed: false, missed: false, lastTickTime: 0, el: DOM }
let chartNotes = [];
let nextSynthStep = 0;
let score = 0;
let combo = 0;
let maxCombo = 0;
let stats = { perfect: 0, good: 0, miss: 0 };

window.onload = function() {
  const user = localStorage.getItem('currentUser');
  const badge = document.getElementById('user-badge');
  if (user && badge) {
    badge.innerText = `🟢 ${user}`;
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
    };
  });

  const speedSlider = document.getElementById('speed-slider');
  speedSlider.oninput = () => {
    noteSpeed = parseInt(speedSlider.value, 10);
    document.getElementById('speed-val').innerText = noteSpeed;
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
  };
  document.getElementById('pause-btn').onclick = togglePause;
};

// 渲染曲目選單
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

    card.innerHTML = `
      <div class="song-card-left">
        <div class="song-name">${song.title}</div>
        <div class="song-meta">BPM ${song.bpm} • ${song.desc}</div>
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
  const lanesWrapper = document.getElementById('lanes-wrapper');
  const keysWrapper = document.getElementById('keys-wrapper');
  lanesWrapper.innerHTML = '';
  keysWrapper.innerHTML = '';

  keyboardStates = new Array(laneCount).fill(false);
  touchStates = new Array(laneCount).fill(false);
  combinedStates = new Array(laneCount).fill(false);

  const spaceIdx = KEY_CONFIGS[laneCount].spaceIndex;
  const labels = KEY_CONFIGS[laneCount].labels;

  for (let i = 0; i < laneCount; i++) {
    const lane = document.createElement('div');
    lane.className = 'lane' + (i === spaceIdx ? ' space-lane' : '');
    lane.id = `lane-${i}`;
    lanesWrapper.appendChild(lane);

    const keyPad = document.createElement('div');
    keyPad.className = 'key-pad' + (i === spaceIdx ? ' space-key' : '');
    keyPad.id = `key-${i}`;
    keyPad.innerText = labels[i];
    keysWrapper.appendChild(keyPad);
  }
}

// ==========================================
// 智慧難度譜面生成器（支援長條、多押、樓梯、複合技巧）
// ==========================================
function generateChartForSong(song) {
  chartNotes = [];
  const beatSec = 60 / song.bpm;
  const stepSec = beatSec / 4; // 以 16 分音符為最小單位排譜
  const totalSteps = Math.floor((song.duration - 2) / stepSec);
  const lv = song.level;

  // 記錄每條軌道被長條佔用的結束時間（避免音符重疊）
  let laneBusyUntil = new Array(laneCount).fill(0);
  let lastMainLane = 0;
  let stairDir = 1; // 樓梯方向

  for (let step = 16; step < totalSteps; step++) {
    const t = step * stepSec;
    const isQuarter = (step % 4 === 0); // 四分音符重拍
    const isEighth = (step % 2 === 0);  // 八分音符

    // 根據難度決定該拍是否出音符
    let spawnProbability = 0;
    if (lv <= 2) {
      if (!isQuarter) continue;
      spawnProbability = 0.75;
    } else if (lv <= 4) {
      if (!isEighth) continue;
      spawnProbability = isQuarter ? 0.9 : 0.45;
    } else if (lv <= 7) {
      if (isEighth) spawnProbability = 0.85;
      else spawnProbability = 0.35; // 偶爾出現16分音符
    } else {
      // Lv.8 ~ Lv.10 高密度 16 分音符連打與樓梯
      spawnProbability = isEighth ? 0.95 : 0.72;
    }

    if (Math.random() > spawnProbability) continue;

    // 找出目前空閒的軌道
    let freeLanes = [];
    for (let l = 0; l < laneCount; l++) {
      if (t >= laneBusyUntil[l] + 0.08) freeLanes.push(l);
    }
    if (freeLanes.length === 0) continue;

    // 決定主軌道（高難度加入樓梯移動模式）
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

    // 決定是否為「長條音符 (Hold Note)」
    let isHold = false;
    let holdDuration = 0;
    if (isQuarter && Math.random() < (lv >= 7 ? 0.28 : 0.22)) {
      isHold = true;
      const holdBeats = (lv >= 6 && Math.random() < 0.5) ? 1 : 2; // 1拍或2拍長條
      holdDuration = holdBeats * beatSec;
      if (t + holdDuration > song.duration - 1.5) {
        isHold = false;
        holdDuration = 0;
      }
    }

    createNoteObject(t, holdDuration, mainLane);
    laneBusyUntil[mainLane] = t + holdDuration;

    // 移除已使用的軌道，準備判斷「多押 (Chords)」
    freeLanes = freeLanes.filter(l => l !== mainLane);

    // 雙押判斷（Lv.3 以上在重拍出現，Lv.8 以上高頻率雙押）
    let chordChance = 0;
    if (lv >= 3 && lv <= 5 && isQuarter) chordChance = 0.3;
    else if (lv >= 6 && lv <= 8 && isEighth) chordChance = 0.45;
    else if (lv >= 9 && isEighth) chordChance = 0.65;

    if (freeLanes.length > 0 && Math.random() < chordChance) {
      const secondLane = freeLanes[Math.floor(Math.random() * freeLanes.length)];
      // 高難度允許「一手按長條、另一手同時點單點」的複合技巧
      let secondHold = 0;
      if (lv >= 8 && isQuarter && Math.random() < 0.25 && t + beatSec < song.duration - 1.5) {
        secondHold = beatSec;
      }
      createNoteObject(t, secondHold, secondLane);
      laneBusyUntil[secondLane] = t + secondHold;
      freeLanes = freeLanes.filter(l => l !== secondLane);

      // 三押判斷（僅限 Lv.8 ~ Lv.10 魔王級多指挑戰，且軌道數 >= 5）
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

  noteEl.style.top = '-200px';
  laneEl.appendChild(noteEl);

  chartNotes.push({
    time: time,
    duration: duration,
    lane: laneIdx,
    hit: false,
    holding: false,
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
  document.getElementById('hud-song-title').innerText = `${song.title} [Lv.${song.level}]`;

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
    document.getElementById('pause-btn').innerText = '▶ 繼續';
  } else {
    isPaused = false;
    totalPausedTime += (audioCtx.currentTime - pauseStartTime);
    document.getElementById('pause-btn').innerText = '⏸ 暫停';
    gameLoop();
  }
}

// 動態電子音樂合成器（根據所選曲目切換 BPM、鼓組與主旋律音色）
function playSongSynth(song, stepIndex, time) {
  const stepSec = (60 / song.bpm) / 2; // 八分音符步進

  // 1. Kick 大鼓（每兩步一拍）
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

  // 2. Hi-Hat 鈸聲（反拍增加節奏動感）
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

  // 3. 主旋律電子音色
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

// 主渲染與判定迴圈
function gameLoop() {
  if (!isPlaying || isPaused) return;

  const song = SONGS[selectedSongIndex];
  const currentSongTime = (audioCtx.currentTime - songStartTime - totalPausedTime) - (audioOffset / 1000);
  const stageHeight = document.getElementById('lanes-wrapper').clientHeight;
  const pixelsPerSec = stageHeight / (2.2 - noteSpeed * 0.16);
  const eighthSec = (60 / song.bpm) / 2;

  // 排程播放背景音樂
  while (nextSynthStep * eighthSec < currentSongTime + 0.2 && nextSynthStep * eighthSec < song.duration) {
    playSongSynth(song, nextSynthStep, songStartTime + totalPausedTime + nextSynthStep * eighthSec);
    nextSynthStep++;
  }

  // 更新所有音符位置與長條持續判定
  for (let i = 0; i < chartNotes.length; i++) {
    const n = chartNotes[i];
    if (n.completed || n.missed) continue;

    // --- 情況 A：單點音符 (Tap Note) ---
    if (n.duration === 0) {
      if (n.hit) continue;
      const timeDiff = n.time - currentSongTime;
      const yPos = stageHeight - (timeDiff * pixelsPerSec);
      n.el.style.top = `${yPos}px`;

      if (timeDiff < -0.16) {
        n.missed = true;
        n.el.remove();
        combo = 0;
        stats.miss++;
        updateHUD('MISS', 'judge-miss');
      }
    }
    // --- 情況 B：長條音符 (Hold Note) ---
    else {
      const endTime = n.time + n.duration;

      if (!n.holding) {
        // 尚未按住頭部
        const headDiff = n.time - currentSongTime;
        const headY = stageHeight - (headDiff * pixelsPerSec);
        const holdHeight = n.duration * pixelsPerSec;

        n.el.style.top = `${headY - holdHeight}px`;
        n.el.style.height = `${holdHeight}px`;

        // 超過頭部判定窗 160ms 未按，整條判 Miss
        if (headDiff < -0.16) {
          n.missed = true;
          n.el.remove();
          combo = 0;
          stats.miss++;
          updateHUD('MISS', 'judge-miss');
        }
      } else {
        // 正在按住長條中！
        const remainingTime = endTime - currentSongTime;

        // 1. 檢查玩家是否已經按完長條（允許提前 100ms 放開）
        if (remainingTime <= 0.08) {
          n.completed = true;
          n.el.remove();
          combo++;
          if (combo > maxCombo) maxCombo = combo;
          stats.perfect++;
          score += 1200 + combo * 10;
          updateHUD('PERFECT', 'judge-perfect');
          continue;
        }

        // 2. 檢查玩家是否中途放開按鍵
        if (!combinedStates[n.lane]) {
          n.missed = true;
          n.el.remove();
          combo = 0;
          stats.miss++;
          updateHUD('MISS', 'judge-miss');
          continue;
        }

        // 3. 持續按住中：尾部縮短貼齊判定線 + 定期加分跳連擊
        const currentHeight = Math.max(0, remainingTime * pixelsPerSec);
        n.el.style.top = `${stageHeight - currentHeight}px`;
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

// 觸發某軌道的按下瞬間判定
function triggerLaneHit(laneIdx) {
  if (!isPlaying || isPaused) return;
  playHitSound(false);

  const currentSongTime = (audioCtx.currentTime - songStartTime - totalPausedTime) - (audioOffset / 1000);

  let targetNote = null;
  let minAbsDiff = 999;

  for (let i = 0; i < chartNotes.length; i++) {
    const n = chartNotes[i];
    if (n.lane === laneIdx && !n.hit && !n.holding && !n.completed && !n.missed) {
      const absDiff = Math.abs(n.time - currentSongTime);
      if (absDiff < minAbsDiff) {
        minAbsDiff = absDiff;
        targetNote = n;
      }
    }
  }

  if (targetNote && minAbsDiff <= 0.15) {
    // 單點音符直接完成
    if (targetNote.duration === 0) {
      targetNote.hit = true;
      targetNote.completed = true;
      targetNote.el.remove();
      combo++;
      if (combo > maxCombo) maxCombo = combo;

      if (minAbsDiff <= 0.075) {
        stats.perfect++;
        score += 1000 + combo * 10;
        updateHUD('PERFECT', 'judge-perfect');
      } else {
        stats.good++;
        score += 500 + combo * 5;
        updateHUD('GOOD', 'judge-good');
      }
    }
    // 長條音符進入「按住鎖定 (holding)」狀態
    else {
      targetNote.hit = true;
      targetNote.holding = true;
      targetNote.lastTickTime = currentSongTime;
      targetNote.el.classList.add('holding');
      combo++;
      if (combo > maxCombo) maxCombo = combo;

      if (minAbsDiff <= 0.085) {
        stats.perfect++;
        score += 800;
        updateHUD('HOLD!', 'judge-perfect');
      } else {
        stats.good++;
        score += 400;
        updateHUD('HOLD!', 'judge-good');
      }
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
  const song = SONGS[selectedSongIndex];
  document.getElementById('res-song').innerText = song.title;
  document.getElementById('res-mode').innerText = `${laneCount}K`;
  document.getElementById('res-lv').innerText = `Lv.${song.level}`;
  document.getElementById('res-score').innerText = score;
  document.getElementById('res-max-combo').innerText = maxCombo;
  document.getElementById('res-perfect').innerText = stats.perfect;
  document.getElementById('res-good').innerText = stats.good;
  document.getElementById('res-miss').innerText = stats.miss;
  document.getElementById('result-modal').style.display = 'flex';
}

// 雙端輸入同步引擎（PC 鍵盤 + 手機多點觸控）
function syncAllInputs() {
  for (let i = 0; i < laneCount; i++) {
    const isNowPressed = keyboardStates[i] || touchStates[i];
    const wasPressed = combinedStates[i];

    if (isNowPressed && !wasPressed) {
      triggerLaneHit(i);
    }

    combinedStates[i] = isNowPressed;

    const laneEl = document.getElementById(`lane-${i}`);
    const keyEl = document.getElementById(`key-${i}`);
    if (laneEl && keyEl) {
      laneEl.classList.toggle('active', isNowPressed);
      keyEl.classList.toggle('active', isNowPressed);
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
    syncAllInputs();
  }
});

window.addEventListener('keyup', (e) => {
  const codes = KEY_CONFIGS[laneCount].codes;
  const idx = codes.indexOf(e.code);
  if (idx !== -1) {
    keyboardStates[idx] = false;
    syncAllInputs();
  }
});

function handleTouchUpdate(e) {
  if (!isPlaying || isPaused) return;
  e.preventDefault();

  const stage = document.getElementById('stage-container');
  const rect = stage.getBoundingClientRect();
  const laneWidth = rect.width / laneCount;

  const newTouchStates = new Array(laneCount).fill(false);

  for (let i = 0; i < e.touches.length; i++) {
    const touch = e.touches[i];
    if (touch.clientX >= rect.left && touch.clientX <= rect.right) {
      const relX = touch.clientX - rect.left;
      const laneIdx = Math.floor(relX / laneWidth);
      if (laneIdx >= 0 && laneIdx < laneCount) {
        newTouchStates[laneIdx] = true;
      }
    }
  }

  touchStates = newTouchStates;
  syncAllInputs();
}

const stageContainer = document.getElementById('stage-container');
stageContainer.addEventListener('touchstart', handleTouchUpdate, { passive: false });
stageContainer.addEventListener('touchmove', handleTouchUpdate, { passive: false });
stageContainer.addEventListener('touchend', handleTouchUpdate, { passive: false });
stageContainer.addEventListener('touchcancel', handleTouchUpdate, { passive: false });
