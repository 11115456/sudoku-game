// 您的專屬 Render 後端網址
const RENDER_URL = "https://sudoku-game-zjff.onrender.com";

// 20 關數獨題庫
const levels = [
  {
    puzzle: "530070000600195000098000060800060003400803001700020006060000280000419005000080079",
    solution: "534678912672195348198342567859761423426853791713924856961537284287419635345286179"
  },
  {
    puzzle: "000260701680070090190004500820100040004602900050003028009300074040050036703018000",
    solution: "435269781682571493197834526826195347374682915951473628519326874248759136763918254"
  },
  {
    puzzle: "100007090030020008009600500005003000010080020000400900002006100800050070040100006",
    solution: "164537298237924618589618543425793861913685724768412935372846159891359472645172386"
  },
  {
    puzzle: "020608000580009700000040000370000500600000004008000013000020000009800036000306090",
    solution: "124678953583159742967243185371964528695281374248537613816425970459812436732396891"
  },
  {
    puzzle: "000000012000000003002300400001800005060070080000009000008500000900040500470006000",
    solution: "645798312789124653132351497291835745364271980507469231818593274923647518476186329"
  },
  {
    puzzle: "000080400000000000000000057000005700000004002000100000000010000050000000008000060",
    solution: "167589423894327165325641857913865742586274932472193586239718654751436298648952361"
  },
  {
    puzzle: "000006000059000008200008000045000000003000000006003054000325006000000000000000000",
    solution: "381456297459732168267198345845917623713284596926563854174325986598641732632879415"
  },
  {
    puzzle: "000000000000003085001020000000507000004000100090000000500000073002010000000040009",
    solution: "987654321246193785351827469813567942724985136695432817568249573432716958179348259"
  },
  {
    puzzle: "000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    solution: "123456789456789123789123456214365897365897214897214365531642978642978531978531642"
  },
  {
    puzzle: "800000000003600000070090200050007000000045700000100030001000068008500010090000400",
    solution: "812436957943658123675291248459387612236945781781129534321749568168523914597812436"
  },
  {
    puzzle: "000700000100000000000430200000000006000509000000000418000081000002000050040000300",
    solution: "625714893138925674974438215283174596417569328596230418759381642362847159841652387"
  },
  {
    puzzle: "000000000000003085001020000000507000004000100090000000500000073002010000000040009",
    solution: "987654321246193785351827469813567942724985136695432817568249573432716958179348259"
  },
  {
    puzzle: "000000010400000000020000000000050407008000300001090000300400200050010000000800000",
    solution: "597328614413965872826174935132659487968247351741893526389416257254712369675839148"
  },
  {
    puzzle: "000000000000000003002300400001800005060070080000009000008500000900040500470006000",
    solution: "645798312789124653132351497291835745364271980507469231818593274923647518476186329"
  },
  {
    puzzle: "000000000000003085001020000000507000004000100090000000500000073002010000000040009",
    solution: "987654321246193785351827469813567942724985136695432817568249573432716958179348259"
  },
  {
    puzzle: "100000008020000030003000400000400001000050000000006000005000700060000080900000002",
    solution: "147569238826714539593823416738492651612357894459186327285931746364275189971648502"
  },
  {
    puzzle: "000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    solution: "123456789456789123789123456214365897365897214897214365531642978642978531978531642"
  },
  {
    puzzle: "800000000003600000070090200050007000000045700000100030001000068008500010090000400",
    solution: "812436957943658123675291248459387612236945781781129534321749568168523914597812436"
  },
  {
    puzzle: "000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    solution: "123456789456789123789123456214365897365897214897214365531642978642978531978531642"
  },
  {
    puzzle: "800000000003600000070090200050007000000045700000100030001000068008500010090000400",
    solution: "812436957943658123675291248459387612236945781781129534321749568168523914597812436"
  }
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
      cell.setAttribute('data-r', String(r));
      cell.setAttribute('data-c', String(c));
      
      const blockIndex = Math.floor(r / 3) * 3 + Math.floor(c / 3);
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
    cell.classList.remove('draft', 'confirmed');
    checkCompletedGroups();
    return;
  }

  const currentVal = cell.innerText.trim();
  const targetVal = String(selectedNum);

  if (!cell.classList.contains('draft') && !cell.classList.contains('confirmed') || currentVal !== targetVal) {
    cell.innerText = targetVal;
    cell.classList.remove('confirmed');
    cell.classList.add('draft');
  } else if (cell.classList.contains('draft')) {
    cell.classList.remove('draft');
    cell.classList.add('confirmed');
  }

  checkCompletedGroups();
}

// 超強防錯動態檢查器（防範隱藏字元）
function checkCompletedGroups() {
  const cells = Array.from(document.querySelectorAll('.sudoku-grid .cell'));
  if (cells.length !== 81) return;

  cells.forEach(c => c.classList.remove('completed'));
  const completedSet = new Set();

  // 1. 檢查 9 個橫列
  for (let r = 0; r < 9; r++) {
    const rowCells = cells.filter(c => c.getAttribute('data-r') === String(r));
    if (checkGroupValid(rowCells)) {
      rowCells.forEach(c => completedSet.add(c));
    }
  }

  // 2. 檢查 9 個直列
  for (let c = 0; c < 9; c++) {
    const colCells = cells.filter(cell => cell.getAttribute('data-c') === String(c));
    if (checkGroupValid(colCells)) {
      colCells.forEach(c => completedSet.add(c));
    }
  }

  // 3. 檢查 9 個九宮格
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const blockCells = cells.filter(c => {
        const r = parseInt(c.getAttribute('data-r'), 10);
        const col = parseInt(c.getAttribute('data-c'), 10);
        return Math.floor(r / 3) === br && Math.floor(col / 3) === bc;
      });
      if (checkGroupValid(blockCells)) {
        blockCells.forEach(c => completedSet.add(c));
      }
    }
  }

  completedSet.forEach(c => c.classList.add('completed'));
}

function checkGroupValid(groupCells) {
  // 提取數字只取 1-9 的數字字元
  const nums = groupCells.map(c => {
    const txt = c.innerText.replace(/[^1-9]/g, '');
    return txt;
  });

  // 如果包含空格或不是9個字，代表沒填滿
  if (nums.some(n => n === '')) return false;

  // 使用 Set 檢查是否有重複數字
  const set = new Set(nums);
  return set.size === 9;
}

function checkAnswer() {
  const cells = document.querySelectorAll('.sudoku-grid .cell');
  let currentAnswers = "";
  
  cells.forEach(cell => {
    const txt = cell.innerText.replace(/[^1-9]/g, '');
    currentAnswers += txt || "0";
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
