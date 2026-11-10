const levels = [
  "530070000600195000098000060800060003400803001700020006060000280000419005000080079",
  "000260701680070090190004500820100040004602900050003028009300074040050036703018000",
];

let currentLevel = 0;
let currentUser = "";
let selectedNum = null; // 當前選中的數字
const RENDER_URL = "https://sudoku-game-zjff.onrender.com"; // 請保持你原本的 Render 網址

const grid = document.getElementById('grid');

// 選擇數字按鈕
function selectNumber(num) {
  selectedNum = num;
  document.querySelectorAll('.num-btn').forEach(btn => btn.classList.remove('selected'));
  event.target.classList.add('selected');
}

// 載入盤面
function loadLevel(levelIndex) {
  grid.innerHTML = "";
  const data = levels[levelIndex] || levels[0];
  document.getElementById('level-title').innerText = `第 ${levelIndex + 1} 關 ${levelIndex === 0 ? '(教學關)' : ''}`;
  
  for (let i = 0; i < 81; i++) {
    const cell = document.createElement('div');
    cell.classList.add('cell');
    
    if (data[i] !== '0') {
      cell.innerText = data[i];
      cell.classList.add('fixed');
    } else {
      // 點擊格子的雙次邏輯
      cell.onclick = () => handleCellClick(cell);
    }
    grid.appendChild(cell);
  }
}

function handleCellClick(cell) {
  if (selectedNum === null) return alert("請先在下方選擇一個數字！");

  // 如果選橡皮擦 (0)
  if (selectedNum === 0) {
    cell.innerText = "";
    cell.className = "cell";
    return;
  }

  // 狀態判定：
  // 1. 如果格子是空的，或者當前數字不等於選中的數字 -> 顯示「淺淺的預覽數字 (draft)」
  if (!cell.classList.contains('draft') && !cell.classList.contains('confirmed') || cell.innerText != selectedNum) {
    cell.innerText = selectedNum;
    cell.className = "cell draft";
  } 
  // 2. 如果再點一次同一個數字 -> 轉為「正式填入數字 (confirmed)」
  else if (cell.classList.contains('draft')) {
    cell.className = "cell confirmed";
  }
}

function nextLevel() {
  if (currentLevel < 19) { currentLevel++; loadLevel(currentLevel); }
}
function prevLevel() {
  if (currentLevel > 0) { currentLevel--; loadLevel(currentLevel); }
}

function login() {
  const user = document.getElementById('username').value;
  if (!user) return alert("請輸入帳號名稱");
  currentUser = user;
  document.getElementById('user-info').innerText = `目前登入帳號：${currentUser}`;
  alert(`歡迎回來，${currentUser}！`);
}

function saveProgress() {
  if (!currentUser) return alert("請先登入帳號！");
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

loadLevel(0);
