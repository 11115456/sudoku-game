// 鍵位配置表（支援 4, 5, 6, 7 軌）
const KEY_CONFIGS = {
  4: { codes: ['KeyD', 'KeyF', 'KeyJ', 'KeyK'], labels: ['D', 'F', 'J', 'K'], spaceIndex: -1 },
  5: { codes: ['KeyD', 'KeyF', 'Space', 'KeyJ', 'KeyK'], labels: ['D', 'F', 'SP', 'J', 'K'], spaceIndex: 2 },
  6: { codes: ['KeyS', 'KeyD', 'KeyF', 'KeyJ', 'KeyK', 'KeyL'], labels: ['S', 'D', 'F', 'J', 'K', 'L'], spaceIndex: -1 },
  7: { codes: ['KeyS', 'KeyD', 'KeyF', 'Space', 'KeyJ', 'KeyK', 'KeyL'], labels: ['S', 'D', 'F', 'SP', 'J', 'K', 'L'], spaceIndex: 3 }
};

let laneCount = 4;
let noteSpeed = 5; // 數字越大下落越快
let audioOffset = 0; // ms

// 遊戲狀態變數
let isPlaying = false;
let isPaused = false;
let audioCtx = null;
let songStartTime = 0;
let pauseStartTime = 0;
let totalPausedTime = 0;
let animFrameId = null;

// 按鍵狀態追蹤（同步鍵盤與多點觸控）
let keyboardStates = [];
let touchStates = [];
let combinedStates = [];

// 譜面與計分
let chartNotes = []; // { time: 秒數, lane: 軌道索引, hit: false, missed: false, el: DOM }
let nextSynthBeat = 0;
let score = 0;
let combo = 0;
let maxCombo = 0;
let stats = { perfect: 0, good: 0, miss: 0 };

const BPM = 128;
const BEAT_SEC = 60 / BPM;
const SONG_DURATION = 42; // 示範曲長度（秒）

// 初始化狀態列與大廳同步
window.onload = function() {
  const user = localStorage.getItem('currentUser');
  const badge = document.getElementById('user-badge');
  if (user && badge) {
    badge.innerText = `🟢 ${user}`;
  }

  document.getElementById('back-lobby-btn').onclick = () => {
    window.location.href = "../index.html";
  };

  // 模式按鈕切換
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      laneCount = parseInt(btn.dataset.keys, 10);
      document.getElementById('key-hint').innerText = `對應按鍵：${KEY_CONFIGS[laneCount].labels.join(' - ')}`;
    };
  });

  // 滑桿設定
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

// 動態建立軌道與底部按鍵 DOM
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

// 程式化生成帶有節奏感的電子樂譜面
function generateDemoChart() {
  chartNotes = [];
  const lanesWrapper = document.getElementById('lanes-wrapper');
  const spaceIdx = KEY_CONFIGS[laneCount].spaceIndex;

  // 從第 4 拍開始進主旋律
  for (let beat = 4; beat * BEAT_SEC < SONG_DURATION - 2; beat += 0.5) {
    const t = beat * BEAT_SEC;
    const isDownBeat = (beat % 1 === 0);

    // 決定落點軌道
    let mainLane = Math.floor(Math.random() * laneCount);
    // 偶爾在重拍加入空白鍵（5K / 7K 特色）
    if (isDownBeat && spaceIdx !== -1 && Math.random() < 0.35) {
      mainLane = spaceIdx;
    }

    createNoteObject(t, mainLane);

    // 後半段高潮加入雙押 (Chord)
    if (beat > 32 && isDownBeat && Math.random() < 0.45) {
      let secondLane = (mainLane + Math.floor(laneCount / 2)) % laneCount;
      if (secondLane !== mainLane) {
        createNoteObject(t, secondLane);
      }
    }
  }
}

function createNoteObject(time, laneIdx) {
  const laneEl = document.getElementById(`lane-${laneIdx}`);
  const noteEl = document.createElement('div');
  const spaceIdx = KEY_CONFIGS[laneCount].spaceIndex;
  noteEl.className = 'note' + (laneIdx === spaceIdx ? ' space-note' : '');
  noteEl.style.top = '-50px';
  laneEl.appendChild(noteEl);

  chartNotes.push({
    time: time,
    lane: laneIdx,
    hit: false,
    missed: false,
    el: noteEl
  });
}

// 開始遊戲
function startGame() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  document.getElementById('menu-screen').style.display = 'none';
  document.getElementById('game-screen').style.display = 'flex';
  document.getElementById('pause-btn').style.display = 'inline-block';
  document.getElementById('pause-btn').innerText = '⏸ 暫停';

  score = 0;
  combo = 0;
  maxCombo = 0;
  stats = { perfect: 0, good: 0, miss: 0 };
  updateHUD('READY', '');

  buildStage();
  generateDemoChart();

  isPlaying = true;
  isPaused = false;
  totalPausedTime = 0;
  nextSynthBeat = 0;
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

// 內建 Web Audio 電子合成器（發出鼓點與旋律音，無需外部 MP3）
function playSynthBeat(beatIndex, time) {
  // 1. Kick 大鼓（每拍）
  if (beatIndex % 2 === 0) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.12);
    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(time);
    osc.stop(time + 0.15);
  }

  // 2. 科技感電子旋律（五聲音階循環）
  const scale = [261.63, 311.13, 392.00, 466.16, 523.25, 622.25, 783.99];
  const freq = scale[(beatIndex * 3) % scale.length];
  const synth = audioCtx.createOscillator();
  const sGain = audioCtx.createGain();
  synth.type = 'triangle';
  synth.frequency.setValueAtTime(freq, time);
  sGain.gain.setValueAtTime(0.12, time);
  sGain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
  synth.connect(sGain);
  sGain.connect(audioCtx.destination);
  synth.start(time);
  synth.stop(time + 0.22);
}

// 打擊音效回饋
function playHitSound() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.exponentialRampToValueAtTime(1200, now + 0.04);
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.05);
}

// 主渲染迴圈
function gameLoop() {
  if (!isPlaying || isPaused) return;

  const currentSongTime = (audioCtx.currentTime - songStartTime - totalPausedTime) - (audioOffset / 1000);
  const stageHeight = document.getElementById('lanes-wrapper').clientHeight;
  const pixelsPerSec = stageHeight / (2.2 - noteSpeed * 0.16); // 速度轉換

  // 排程播放背景電子節拍
  while (nextSynthBeat * (BEAT_SEC / 2) < currentSongTime + 0.2 && nextSynthBeat * (BEAT_SEC / 2) < SONG_DURATION) {
    playSynthBeat(nextSynthBeat, songStartTime + totalPausedTime + nextSynthBeat * (BEAT_SEC / 2));
    nextSynthBeat++;
  }

  // 更新所有音符位置與漏接 (Miss) 判定
  for (let i = 0; i < chartNotes.length; i++) {
    const n = chartNotes[i];
    if (n.hit || n.missed) continue;

    const timeDiff = n.time - currentSongTime;
    const yPos = stageHeight - (timeDiff * pixelsPerSec);
    n.el.style.top = `${yPos}px`;

    // 超過判定線 160ms 未按視為 Miss
    if (timeDiff < -0.16) {
      n.missed = true;
      n.el.remove();
      combo = 0;
      stats.miss++;
      updateHUD('MISS', 'judge-miss');
    }
  }

  // 曲目結束檢查
  if (currentSongTime >= SONG_DURATION) {
    endGame();
    return;
  }

  animFrameId = requestAnimationFrame(gameLoop);
}

// 觸發某軌道的打擊判定
function triggerLaneHit(laneIdx) {
  if (!isPlaying || isPaused) return;
  playHitSound();

  const currentSongTime = (audioCtx.currentTime - songStartTime - totalPausedTime) - (audioOffset / 1000);

  // 尋找該軌道最接近判定線且尚未判定的音符
  let targetNote = null;
  let minAbsDiff = 999;

  for (let i = 0; i < chartNotes.length; i++) {
    const n = chartNotes[i];
    if (n.lane === laneIdx && !n.hit && !n.missed) {
      const absDiff = Math.abs(n.time - currentSongTime);
      if (absDiff < minAbsDiff) {
        minAbsDiff = absDiff;
        targetNote = n;
      }
    }
  }

  // 判定時間窗：Perfect (±75ms), Good (±150ms)
  if (targetNote && minAbsDiff <= 0.15) {
    targetNote.hit = true;
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
  document.getElementById('res-mode').innerText = `${laneCount}K`;
  document.getElementById('res-score').innerText = score;
  document.getElementById('res-max-combo').innerText = maxCombo;
  document.getElementById('res-perfect').innerText = stats.perfect;
  document.getElementById('res-good').innerText = stats.good;
  document.getElementById('res-miss').innerText = stats.miss;
  document.getElementById('result-modal').style.display = 'flex';
}

// ==========================================
// 雙端輸入同步引擎（PC 鍵盤 + 手機多點觸控）
// ==========================================
function syncAllInputs() {
  for (let i = 0; i < laneCount; i++) {
    const isNowPressed = keyboardStates[i] || touchStates[i];
    const wasPressed = combinedStates[i];

    // 偵測「剛按下 (Rising Edge)」的瞬間觸發判定
    if (isNowPressed && !wasPressed) {
      triggerLaneHit(i);
    }

    combinedStates[i] = isNowPressed;

    // 同步軌道光束與按鍵發光視覺
    const laneEl = document.getElementById(`lane-${i}`);
    const keyEl = document.getElementById(`key-${i}`);
    if (laneEl && keyEl) {
      laneEl.classList.toggle('active', isNowPressed);
      keyEl.classList.toggle('active', isNowPressed);
    }
  }
}

// 1. 電腦鍵盤監聽 (S D F Space J K L)
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

// 2. 手機多點觸控監聽（支援同時多指按壓與滑動換軌）
function handleTouchUpdate(e) {
  if (!isPlaying || isPaused) return;
  e.preventDefault();

  const stage = document.getElementById('stage-container');
  const rect = stage.getBoundingClientRect();
  const laneWidth = rect.width / laneCount;

  const newTouchStates = new Array(laneCount).fill(false);

  for (let i = 0; i < e.touches.length; i++) {
    const touch = e.touches[i];
    // 只要手指在舞台 X 範圍內即感應對應軌道（手感最順暢）
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
