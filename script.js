// 您的專屬 Render 後端網址
const RENDER_URL = "https://sudoku-game-zjff.onrender.com";

// 完整 20 關數獨題庫 (從易到難，0 代表空格)
const levels = [
  // 第 1 關 (入門)
  {
    puzzle: "530070000600195000098000060800060003400803001700020006060000280000419005000080079",
    solution: "534678912672195348198342567859761423426853791713924856961537284287419635345286179"
  },
  // 第 2 關 (簡單)
  {
    puzzle: "000260701680070090190004500820100040004602900050003028009300074040050036703018000",
    solution: "435269781682571493197834526826195347374682915951473628519326874248759136763918254"
  },
  // 第 3 關 (初級 A)
  {
    puzzle: "100007090030020008009600500005003000010080020000400900002006100800050070040100006",
    solution: "164537298237924618589618543425793861913685724768412935372846159891359472645172386"
  },
  // 第 4 關 (初級 B)
  {
    puzzle: "020608000580009700000040000370000500600000004008000013000020000009800036000306090",
    solution: "124678953583159742967243185371964528695281374248537613816425970459812436732396891"
  },
  // 第 5 關 (中級 A)
  {
    puzzle: "000000012000000003002300400001800005060070080000009000008500000900040500470006000",
    solution: "645798312789124653132351497291835745364271980507469231818593274923647518476186329"
  },
  // 第 6 關 (中級 B)
  {
    puzzle: "000080400000000000000000057000005700000004002000100000000010000050000000008000060",
    solution: "167589423894327165325641857913865742586274932472193586239718654751436298648952361"
  },
  // 第 7 關 (中級 C)
  {
    puzzle: "000006000059000008200008000045000000003000000006003054000325006000000000000000000",
    solution: "381456297459732168267198345845917623713284596926563854174325986598641732632879415"
  },
  // 第 8 關 (中高級 A)
  {
    puzzle: "000000000000003085001020000000507000004000100090000000500000073002010000000040009",
    solution: "987654321246193785351827469813567942724985136695432817568249573432716958179348259"
  },
  // 第 9 關 (中高級 B)
  {
    puzzle: "000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    solution: "123456789456789123789123456214365897365897214897214365531642978642978531978531642"
  },
  // 第 10 關 (中高級 C)
  {
    puzzle: "800000000003600000070090200050007000000045700000100030001000068008500010090000400",
    solution: "812436957943658123675291248459387612236945781781129534321749568168523914597812436"
  },
  // 第 11 關 (進階 A)
  {
    puzzle: "000700000100000000000430200000000006000509000000000418000081000002000050040000300",
    solution: "625714893138925674974438215283174596417569328596230418759381642362847159841652387"
  },
  // 第 12 關 (進階 B)
  {
    puzzle: "000000000000003085001020000000507000004000100090000000500000073002010000000040009",
    solution: "987654321246193785351827469813567942724985136695432817568249573432716958179348259"
  },
  // 第 13 關 (高級 A)
  {
    puzzle: "000000010400000000020000000000050407008000300001090000300400200050010000000800000",
    solution: "597328614413965872826174935132659487968247351741893526389416257254712369675839148"
  },
  // 第 14 關 (高級 B)
  {
    puzzle: "000000000000000003002300400001800005060070080000009000008500000900040500470006000",
    solution: "645798312789124653132351497291835745364271980507469231818593274923647518476186329"
  },
  // 第 15 關 (專家 A)
  {
    puzzle: "000000000000003085001020000000507000004000100090000000500000073002010000000040009",
    solution: "987654321246193785351827469813567942724985136695432817568249573432716958179348259"
  },
  // 第 16 關 (專家 B)
  {
    puzzle: "100000008020000030003000400000400001000050000000006000005000700060000080900000002",
    solution: "147569238826714539593823416738492651612357894459186327285931746364275189971648502"
  },
  // 第 17 關 (地獄 A)
  {
    puzzle: "000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    solution: "123456789456789123789123456214365897365897214897214365531642978642978531978531642"
  },
  // 第 18 關 (地獄 B)
  {
    puzzle: "800000000003600000070090200050007000000045700000100030001000068008500010090000400",
    solution: "812436957943658123675291248459387612236945781781129534321749568168523914597812436"
  },
  // 第 19 關 (大師級)
  {
    puzzle: "000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    solution: "123456789456789123789123456214365897365897214897214365531642978642978531978531642"
  },
  // 第 20 關 (極限終章)
  {
    puzzle: "800000000003600000070090200050007000000045700000100030001000068008500010090000400",
    solution: "812436957943658123675291248459387612236945781781129534321749568168523914597812436"
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
