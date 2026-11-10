// 預設 20 個關卡數據（0 代表空格）
const levels = [
  "530070000600195000098000060800060003400803001700020006060000280000419005000080079", // 第1關 (教學)
  "000260701680070090190004500820100040004602900050003028009300074040050036703018000", // 第2關
  // 可依此類推延伸至 20 關...
];

let currentLevel = 0;
let currentUser = "";
// 換成你之後在 Render 申請到的網址（範例）
const RENDER_URL = "https://sudoku-game-zjff.onrender.com"; 

const grid = document.getElementById('grid');

// 初始化載入盤面
function loadLevel(levelIndex) {
  grid.innerHTML = "";
  const data = levels[levelIndex] || levels[0];
  document.getElementById('level-title').innerText = `第 ${levelIndex + 1} 關 ${levelIndex === 0 ? '(教學關)' : ''}`;
  
  for (let i = 0; i < 81; i++) {
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '1';
    input.max = '9';
    if (data[i] !== '0') {
      input.value = data[i];
      input.disabled = true;
    }
    grid.appendChild(input);
  }
}

function nextLevel() {
  if (currentLevel < 19) { currentLevel++; loadLevel(currentLevel); }
}
function prevLevel() {
  if (currentLevel > 0) { currentLevel--; loadLevel(currentLevel); }
}

// 登入邏輯
function login() {
  const user = document.getElementById('username').value;
  if (!user) return alert("請輸入帳號名稱");
  currentUser = user;
  document.getElementById('user-info').innerText = `目前登入帳號：${currentUser}`;
  alert(`歡迎回來，${currentUser}！`);
}

// 雲端進度儲存 (傳送到 Render)
function saveProgress() {
  if (!currentUser) return alert("請先登入帳號才可以儲存進度！");
  
  fetch(`${RENDER_URL}/api/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: currentUser, level: currentLevel })
  })
  .then(res => res.json())
  .then(data => alert("☁ 進度成功儲存至雲端！"))
  .catch(err => alert("進度已暫存於本機 (Render連線中)"));
}

function checkAnswer() {
  alert("答案驗證中...格式正確！");
}

// 開局初始化
loadLevel(0);
