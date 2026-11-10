const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 暫存記憶體資料庫
const userProgress = {};

app.get('/', (req, res) => {
  res.send('Sudoku Backend Service is Running!');
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
