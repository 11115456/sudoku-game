const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'users.json');

app.use(cors());
app.use(express.json());

// 1. 初始化讀取檔案資料庫 (若不存在則自動創建)
let usersDB = {};
if (fs.existsSync(DB_FILE)) {
  try {
    const rawData = fs.readFileSync(DB_FILE, 'utf8');
    usersDB = JSON.parse(rawData);
    console.log('成功載入本地用戶資料庫 users.json');
  } catch (err) {
    console.error('讀取資料庫失敗，初始化空資料庫', err);
    usersDB = {};
  }
}

// 輔助函式：將資料寫入檔案
function saveDBToFile() {
  fs.writeFile(DB_FILE, JSON.stringify(usersDB, null, 2), (err) => {
    if (err) console.error('寫入資料庫檔案失敗:', err);
  });
}

app.get('/', (req, res) => {
  res.status(200).send('Sudoku Backend with Persistent Local DB is Live!');
});

// 2. 帳號註冊 API
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '帳號與密碼不能為空' });
  
  if (usersDB[username]) {
    return res.status(400).json({ error: '該帳號已被註冊，請換一個帳號名稱' });
  }

  usersDB[username] = {
    password: password,
    passedLevels: new Array(20).fill(false),
    levelTimes: new Array(20).fill(null)
  };

  saveDBToFile(); // 立即存檔到 users.json
  res.json({ message: '註冊成功', username });
});

// 3. 帳號登入 API
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = usersDB[username];

  if (!user) {
    return res.status(404).json({ error: '找不到該帳號，請先註冊' });
  }

  if (user.password !== password) {
    return res.status(401).json({ error: '密碼不正確' });
  }

  res.json({ 
    message: '登入成功', 
    username, 
    passedLevels: user.passedLevels,
    levelTimes: user.levelTimes || new Array(20).fill(null)
  });
});

// 4. 儲存進度 API
app.post('/api/save', (req, res) => {
  const { username, passedLevels, levelTimes } = req.body;
  if (!username || !usersDB[username]) return res.status(400).json({ error: '無效的使用者' });
  
  usersDB[username].passedLevels = passedLevels;
  if (levelTimes) {
    usersDB[username].levelTimes = levelTimes;
  }

  saveDBToFile(); // 立即存檔到 users.json
  res.json({ message: '進度與時間儲存成功' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
