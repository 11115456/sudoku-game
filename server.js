const express = require('express');
const cors = require('cors');
const app = express();

// 綁定 Render 指定的 PORT (若沒有則預設 3000)
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 暫存記憶體資料庫
const userProgress = {};

// 健康檢查 Endpoint (讓 Render 能成功掃描到 Port)
app.get('/', (req, res) => {
  res.status(200).send('Sudoku Backend is Live!');
});

// 儲存通關進度
app.post('/api/save', (req, res) => {
  const { username, passedLevels } = req.body;
  if (!username) return res.status(400).json({ error: 'Missing username' });
  
  userProgress[username] = passedLevels;
  res.json({ message: 'Success', username, passedLevels });
});

// 讀取通關進度
app.get('/api/load/:username', (req, res) => {
  const username = req.params.username;
  const passedLevels = userProgress[username] || new Array(20).fill(false);
  res.json({ username, passedLevels });
});

// 必須傾聽 0.0.0.0 以供外部通訊
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is successfully running on port ${PORT}`);
});
