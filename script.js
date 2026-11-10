// 您的專屬 Render 後端網址
const RENDER_URL = "https://sudoku-game-zjff.onrender.com";

// 20 關數據（0代表空格）
const levels = [
  {
    puzzle: "530070000600195000098000060800060003400803001700020006060000280000419005000080079",
    solution: "534678912672195348198342567859761423426853791713924856961537284287419635345286179"
  },
  {
    puzzle: "000260701680070090190004500820100040004602900050003028009300074040050036703018000",
    solution: "435269781682571493197834526826195347374682915951473628519326874248759136763918254"
  }
];

let passedLevels = new Array(20).fill(false);
let currentLevelIndex = 0;
let currentUser = "";
let selectedNum = null;

// 1. 繪製關卡選單
function renderMenu() {
  const menuContainer = document.getElementById('level-menu');
  if (!menuContainer) return;
  menuContainer.innerHTML = "";

  for (let i = 0; i < 20; i++) {
    const card = document.createElement('div');
    const isUnlocked = (i === 0) || passedLevels[i - 1];
    const isPassed = passedLevels[i];

    card.className = `level-card ${isUnlocked ? 'unlocked' : 'locked'}`;

    if (isUnlocked) {
      card.onclick = function() { startLevel(i); };
      card.innerHTML = `
        <strong>第 ${i + 1} 關</strong>
        <span class="badge ${isPassed ? 'passed' : 'failed'}">
          ${isPassed ? '✅ 已通過' : '❌ 未通過'}
        </span>
      `;
    } else {
      card.innerHTML = `
        <strong>第 ${i + 1} 關</strong>
        <span class="badge lock">🔒 鎖定中</span>
      `;
    }
    menuContainer.appendChild(card);
  }
}

// 2. 進入關卡
function startLevel(index) {
  currentLevelIndex = index;
  document.getElementById('menu-view').style.display = 'none';
  document.getElementById('game-view').style.display = 'block';
  loadGrid(index);
}

// 3. 返回目錄
function backToMenu() {
  document.getElementById('game-view').style.display = 'none';
  document.getElementById('menu-view').style.display = 'block';
  renderMenu();
}

// 4. 載入盤面
function loadGrid(index) {
  const grid = document.getElementById('grid');
  grid.innerHTML = "";
  selectedNum = null;
  document.querySelectorAll('.num-btn').forEach(btn => btn.classList.remove('selected'));
  
  const levelObj = levels[index] || levels[0];
  const levelData = levelObj.puzzle;
  document.getElementById('level-title').innerText = `第 ${index + 1} 關 ${index === 0 ? '(教學關)' : ''}`;

  for (let i = 0; i < 81; i++) {
    const cell = document.createElement('div');
    cell.classList.add('cell');

    if (levelData[i] !== '0') {
      cell.innerText = levelData[i];
      cell.classList.add('fixed');
    } else {
      cell.onclick = function() { handleCellClick(cell); };
    }
    grid.appendChild(cell);
  }
}

// 選擇數字
function selectNumber(num, btnElement) {
  selectedNum = num;
  document.querySelectorAll('.num-btn').forEach(btn => btn.classList.remove('selected'));
  if (btnElement) {
    btnElement.classList.add('selected');
  }
}

// 雙點擊草稿->確定邏輯
function handleCellClick(cell) {
  if (selectedNum === null) return alert("請先在下方選擇數字！");

  if (selectedNum === 0) {
    cell.innerText = "";
    cell.className = "cell";
    return;
  }

  if ((!cell.classList.contains('draft') && !cell.classList.contains('confirmed')) || cell.innerText != selectedNum) {
    cell.innerText = selectedNum;
    cell.className = "cell draft";
  } else if (cell.classList.contains('draft')) {
    cell.className = "cell confirmed";
  }
}

// 5. 驗證答案
function checkAnswer() {
  const cells = document.querySelectorAll('.sudoku-grid .cell');
  let currentAnswers = "";
  
  cells.forEach(cell => {
    currentAnswers += cell.innerText || "0";
  });

  const levelObj = levels[currentLevelIndex];
  const correctSolution = levelObj ? levelObj.solution : null;

  if (correctSolution && currentAnswers === correctSolution) {
    passedLevels[currentLevelIndex] = true;
    alert(`🎉 恭喜通過第 ${currentLevelIndex + 1} 關！下一關已成功解鎖！`);
    saveProgress();
    backToMenu();
  } else {
    alert("❌ 答案有誤或尚未填滿，請再檢查一次喔！");
  }
}

// 帳號與雲端進度
function login() {
  const user = document.getElementById('username').value;
  if (!user) return alert("請輸入帳號名稱");
  currentUser = user;
  document.getElementById('user-info').innerText = `目前登入帳號：${currentUser}`;
  
  fetch(`${RENDER_URL}/api/load/${currentUser}`)
    .then(res => res.json())
    .then(data => {
      if (data && data.passedLevels) {
        passedLevels = data.passedLevels;
      }
      renderMenu();
      alert(`歡迎回來 ${currentUser}！進度已同步。`);
    })
    .catch(() => renderMenu());
}

function saveProgress() {
  if (!currentUser) return;
  fetch(`${RENDER_URL}/api/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: currentUser, passedLevels })
  }).catch(err => console.log(err));
}

// 頁面載入完成後自動繪製選單
window.onload = function() {
  renderMenu();
};
