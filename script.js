// 您的專屬 Render 後端網址
const RENDER_URL = "https://sudoku-game-zjff.onrender.com";

// 完整 20 關數獨題庫
const levels = [
  {
    puzzle: "530070000600195000098000060800060003400803001700020006060000280000419005000080079",
    solution: "534678912672195348198342567859761423426853791713924856961537284287419635345286179"
  },
  {
    puzzle: "000260701680070090190004500820100040004602900050003028009300074040050036703018000",
    solution: "435269781682571493197834526826195347374682915951473628519326874248759136763918254"
  }
  // 其餘 18 關保持原樣即可...
];

let passedLevels = new Array(20).fill(false);
let currentLevelIndex = 0;
let currentUser = "";
let selectedNum = null;

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

function startLevel(index) {
  currentLevelIndex = index;
  document.getElementById('menu-view').style.display = 'none';
  document.getElementById('game-view').style.display = 'block';
  loadGrid(index);
}

function backToMenu() {
  document.getElementById('game-view').style.display = 'none';
  document.getElementById('menu-view').style.display = 'block';
  renderMenu();
}

// 載入盤面 + 繪製 3x3 九宮格交替底色
function loadGrid(index) {
  const grid = document.getElementById('grid');
  grid.innerHTML = "";
  selectedNum = null;
  document.querySelectorAll('.num-btn').forEach(btn => btn.classList.remove('selected'));
  
  const levelObj = levels[index] || levels[0];
  const levelData = levelObj.puzzle;
  document.getElementById('level-title').innerText = `第 ${index + 1} 關 ${index === 0 ? '(教學關)' : ''}`;

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const i = r * 9 + c;
      const cell = document.createElement('div');
      cell.classList.add('cell');
      cell.dataset.row = r;
      cell.dataset.col = c;
      
      // 計算九宮格區域 (0~8)
      const blockIndex = Math.floor(r / 3) * 3 + Math.floor(c / 3);
      // 左上角(0)、正中(4)等區域為深色，相鄰為淺色（棋盤式交替）
      if (blockIndex % 2 === 0) {
        cell.classList.add('block-dark');
      } else {
        cell.classList.add('block-light');
      }

      if (levelData[i] !== '0') {
        cell.innerText = levelData[i];
        cell.classList.add('fixed');
      } else {
        cell.onclick = function() { handleCellClick(cell); };
      }
      grid.appendChild(cell);
    }
  }
  checkCompletedGroups();
}

function selectNumber(num, btnElement) {
  selectedNum = num;
  document.querySelectorAll('.num-btn').forEach(btn => btn.classList.remove('selected'));
  if (btnElement) {
    btnElement.classList.add('selected');
  }
}

function handleCellClick(cell) {
  if (selectedNum === null) return alert("請先在下方選擇數字！");

  if (selectedNum === 0) {
    cell.innerText = "";
    cell.className = cell.className.replace('draft', '').replace('confirmed', '').trim();
    checkCompletedGroups();
    return;
  }

  if ((!cell.classList.contains('draft') && !cell.classList.contains('confirmed')) || cell.innerText != selectedNum) {
    cell.innerText = selectedNum;
    cell.classList.remove('confirmed');
    cell.classList.add('draft');
  } else if (cell.classList.contains('draft')) {
    cell.classList.remove('draft');
    cell.classList.add('confirmed');
  }

  // 每次填入數字後，動態檢查並更新「綠色完成數字」
  checkCompletedGroups();
}

// 動態檢查：若行、列或九宮格內 1~9 填滿且完全正確，數字變綠色！
function checkCompletedGroups() {
  const cells = Array.from(document.querySelectorAll('.sudoku-grid .cell'));
  if (cells.length !== 81) return;

  // 先清除所有變綠標記
  cells.forEach(c => c.classList.remove('completed'));

  const completedCellSet = new Set();

  // 1. 檢查每行 (Row)
  for (let r = 0; r < 9; r++) {
    const rowCells = cells.filter(c => parseInt(c.dataset.row) === r);
    const nums = rowCells.map(c => c.innerText);
    if (isValidSet(nums)) {
      rowCells.forEach(c => completedCellSet.add(c));
    }
  }

  // 2. 檢查每列 (Column)
  for (let c = 0; c < 9; c++) {
    const colCells = cells.filter(c => parseInt(c.dataset.col) === c);
    const nums = colCells.map(c => c.innerText);
    if (isValidSet(nums)) {
      colCells.forEach(c => completedCellSet.add(c));
    }
  }

  // 3. 檢查 9 個九宮格 (Block)
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const blockCells = cells.filter(c => {
        const r = parseInt(c.dataset.row);
        const col = parseInt(c.dataset.col);
        return Math.floor(r / 3) === br && Math.floor(col / 3) === bc;
      });
      const nums = blockCells.map(c => c.innerText);
      if (isValidSet(nums)) {
        blockCells.forEach(c => completedCellSet.add(c));
      }
    }
  }

  // 將所有屬於完成區域的格子加上 completed 變綠樣式
  completedCellSet.forEach(c => c.classList.add('completed'));
}

// 驗證是否剛好包含 1~9 的不重複數字
function isValidSet(arr) {
  if (arr.includes('') || arr.includes('0')) return false;
  const set = new Set(arr);
  return set.size === 9;
}

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

window.onload = function() {
  renderMenu();
};
