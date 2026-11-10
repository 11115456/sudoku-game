const RENDER_URL = "https://sudoku-game-zjff.onrender.com";

function handleLogin() {
  const user = document.getElementById('login-user').value.trim();
  const pass = document.getElementById('login-pass').value.trim();

  if (!user || !pass) return alert("請輸入完整帳號與密碼！");

  fetch(`${RENDER_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: user, password: pass })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      alert(`登入失敗：${data.error}`);
    } else {
      localStorage.setItem('currentUser', user);
      updateUserStatusUI();
      document.getElementById('auth-modal').style.display = 'none';
      alert(`🎉 登入成功！歡迎回來，${user}`);
    }
  })
  .catch(() => alert("伺服器連線失敗"));
}

function handleRegister() {
  const user = document.getElementById('reg-user').value.trim();
  const pass1 = document.getElementById('reg-pass1').value.trim();
  const pass2 = document.getElementById('reg-pass2').value.trim();

  if (!user || !pass1 || !pass2) return alert("請填寫所有欄位！");
  if (pass1 !== pass2) return alert("兩次輸入的密碼不一致，請重新檢查！");

  fetch(`${RENDER_URL}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: user, password: pass1 })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      alert(`註冊失敗：${data.error}`);
    } else {
      localStorage.setItem('currentUser', user);
      updateUserStatusUI();
      document.getElementById('auth-modal').style.display = 'none';
      alert(`🎉 註冊成功並已自動登入！歡迎，${user}`);
    }
  })
  .catch(() => alert("伺服器連線失敗"));
}

function updateUserStatusUI() {
  const user = localStorage.getItem('currentUser');
  const statusElem = document.getElementById('user-status');
  if (statusElem) {
    if (user) {
      statusElem.innerText = `🟢 已登入 (${user})`;
      statusElem.className = 'status-badge online';
    } else {
      statusElem.innerText = '🔴 未登入 (進度不會儲存)';
      statusElem.className = 'status-badge offline';
    }
  }
}

window.onload = function() {
  updateUserStatusUI();

  const openBtn = document.getElementById('auth-open-btn');
  const closeBtn = document.getElementById('auth-close-btn');
  const modal = document.getElementById('auth-modal');
  const tabLogin = document.getElementById('tab-login-btn');
  const tabReg = document.getElementById('tab-register-btn');
  const loginForm = document.getElementById('login-form');
  const regForm = document.getElementById('register-form');

  if (openBtn && modal) {
    openBtn.onclick = function() { modal.style.display = 'flex'; };
  }
  if (closeBtn && modal) {
    closeBtn.onclick = function() { modal.style.display = 'none'; };
  }
  if (tabLogin && tabReg) {
    tabLogin.onclick = function() {
      loginForm.style.display = 'flex';
      regForm.style.display = 'none';
      tabLogin.classList.add('active');
      tabReg.classList.remove('active');
    };
    tabReg.onclick = function() {
      loginForm.style.display = 'none';
      regForm.style.display = 'flex';
      tabReg.classList.add('active');
      tabLogin.classList.remove('active');
    };
  }
};
