const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// 已填入你的 JSONBin ID 與 Master Key
const JSONBIN_BIN_ID = '6af4347dac6210605a7f2e50';
const JSONBIN_API_KEY = '$2a$10$EDJdyaKNLhQi7cpnhgunx.L.muDKhQi37PGuqxON2TBVOXUMecziK';

app.use(cors());
app.use(express.json());

// 輔助函式：從雲端 JSONBin 讀取完整資料庫
async function loadDBFromCloud() {
  try {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, {
      headers: { 'X-Master-Key': JSONBIN_API_KEY }
    });
    const data = await res.json();
    console.log('✅ 成功從雲端載入 users.json');
    return data.record || {};
  } catch (err) {
    console.error('❌ 從雲端讀取資料庫失敗:', err);
    return {};
  }
}

// 輔助函式：寫入新資料到雲端 JSONBin
async function saveDBToCloud(dbData) {
  try {
    await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': JSONBIN_API_KEY
      },
      body: JSON.stringify(dbData)
    });
    console.log('💾 資料已成功寫入雲端 JSONBin');
  } catch (err) {
    console.error('❌ 寫入雲端資料庫失敗:', err);
  }
}

// 保活與測試 API
app.get('/', async (req, res) => {
  const usersDB = await loadDBFromCloud();
  res.status(200).send(`Sudoku Backend (Cloud DB) is Live! 當前註冊人數: ${Object.keys(usersDB).length}`);
});

// 2. 帳號註冊 API
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '帳號與密碼不能為空' });
  
  const userKey = String(username).trim();
  const usersDB = await loadDBFromCloud();

  if (usersDB[userKey]) {
    return res.status(400).json({ error: '該帳號已被註冊，請換一個帳號名稱' });
  }

  usersDB[userKey] = {
    password: String(password),
    passedLevels: new Array(20).fill(false),
    levelTimes: new Array(20).fill(null)
  };

  await saveDBToCloud(usersDB); // 存回雲端
  res.json({ message: '註冊成功', username: userKey });
});

// 3. 帳號登入 API
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const userKey = String(username).trim();
  const usersDB = await loadDBFromCloud();
  const user = usersDB[userKey];

  if (!user) {
    return res.status(404).json({ error: '找不到該帳號，請先註冊' });
  }

  if (user.password !== String(password)) {
    return res.status(401).json({ error: '密碼不正確' });
  }

  res.json({ 
    message: '登入成功', 
    username: userKey, 
    passedLevels: user.passedLevels || new Array(20).fill(false),
    levelTimes: user.levelTimes || new Array(20).fill(null)
  });
});

// 4. 儲存進度 API
app.post('/api/save', async (req, res) => {
  const { username, passedLevels, levelTimes } = req.body;
  const userKey = String(username).trim();
  const usersDB = await loadDBFromCloud();

  if (!userKey || !usersDB[userKey]) return res.status(400).json({ error: '無效的使用者' });
  
  usersDB[userKey].passedLevels = passedLevels;
  if (levelTimes) {
    usersDB[userKey].levelTimes = levelTimes;
  }

  await saveDBToCloud(usersDB); // 存回雲端
  res.json({ message: '進度與時間儲存成功' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
