const express = require('express');
const cors = require('cors');
const app = express();

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 記憶體帳號與進度資料庫 (格式: { username: { password, passedLevels } })
const usersDB = {};

app.get('/', (req, res) => {
  res.status(200).send('Sudoku Backend with Auth is Live!');
});

// 帳號註冊 API
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '帳號與密碼不能為空' });
  
  if (usersDB[username]) {
    return res.status(400).json({ error: '該帳號已被註冊，請換一個帳號名稱' });
  }

  usersDB[username] = {
    password: password,
    passedLevels: new Array(20).fill(false)
  };

  res.json({ message: '註冊成功', username });
});

// 帳號登入 API
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = usersDB[username];

  if (!user) {
    return res.status(404).json({ error: '找不到該帳號，請先註冊' });
  }

  if (user.password !== password) {
    return res.status(401).json({ error: '密碼不正確' });
  }

  res.json({ message: '登入成功', username, passedLevels: user.passedLevels });
});

// 儲存進度 API
app.post('/api/save', (req, res) => {
  const { username, passedLevels } = req.body;
  if (!username || !usersDB[username]) return res.status(400).json({ error: '無效的使用者' });
  
  usersDB[username].passedLevels = passedLevels;
  res.json({ message: '進度儲存成功' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
