const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 暫存記憶體資料庫（簡易測試用）
const userProgress = {};

// 驗證伺服器是否正常運作
app.get('/', (req, res) => {
  res.send('Sudoku Backend Service is Running!');
});

// 儲存進度 API
app.post('/api/save', (req, res) => {
  const { username, level } = req.body;
  if (!username) return res.status(400).json({ error: 'Missing username' });
  
  userProgress[username] = level;
  console.log(`Saved progress for ${username}: Level ${level}`);
  res.json({ message: 'Success', username, level });
});

// 讀取進度 API
app.get('/api/load/:username', (req, res) => {
  const username = req.params.username;
  const level = userProgress[username] || 0;
  res.json({ username, level });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
