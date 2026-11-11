const RENDER_URL = "https://sudoku-game-zjff.onrender.com";

function handleLogin() {
  const user = document.getElementById('login-user').value.trim();
  const pass = document.getElementById('login-pass').value.trim();

  if (!user || !pass) return alert("請輸入完整帳號與密碼！");

  // 提示免費伺服器喚醒中
  alert("⏳ 正在連線伺服器中... (若是今天第一次登入，可能需要等待 30 秒喚醒伺服器)");

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
      // 1. 紀錄當前登入者
      localStorage.setItem('currentUser', data.username);
      
      // 2. 將雲端返回的進度預先備份至本地
      if (data.passedLevels) {
        localStorage.setItem(`passedLevels_${data.username}`, JSON.stringify(data.passedLevels));
      }
      if (data.levelTimes) {
        localStorage.setItem(`levelTimes_${data.username}`, JSON.stringify(data.levelTimes));
      }

      updateUserStatusUI();
      document.getElementById('auth-modal').style.display = 'none';
      alert(`🎉 登入成功！歡迎回來，${data.username}`);
    }
  })
  .catch(() => alert("伺服器連線失敗或喚醒逾時，請再試一次！"));
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
      localStorage.setItem('currentUser', data.username);
      updateUserStatusUI();
      document.getElementById('auth-modal').style.display = 'none';
      alert(`🎉 註冊成功並已自動登入！歡迎，${data.username}`);
    }
  })
  .catch(() => alert("伺服器連線失敗"));
}

function handleLogout() {
  if (confirm("確定要登出當前帳號嗎？")) {
    localStorage.removeItem('currentUser');
    updateUserStatusUI();
    alert("已成功登出！");
  }
}

function updateUserStatusUI() {
  const user = localStorage.getItem('currentUser');
  const statusElem = document.getElementById('user-status');
  const openBtn = document.getElementById('auth-open-btn');

  if (statusElem) {
    if (user) {
      statusElem.innerText = `🟢 已登入 (${user})`;
      statusElem.className = 'status-badge online';
      if (openBtn) {
        openBtn.innerText = "切換 / 登出帳號";
        openBtn.onclick = handleLogout; // 已登入狀態點擊為登出
      }
    } else {
      statusElem.innerText = '🔴 未登入 (進度不會儲存)';
      statusElem.className = 'status-badge offline';
      if (openBtn) {
        openBtn.innerText = "登入 / 註冊";
        openBtn.onclick = function() {
          const modal = document.getElementById('auth-modal');
          if (modal) modal.style.display = 'flex';
        };
      }
    }
  }
}

window.onload = function() {
  updateUserStatusUI();

  const closeBtn = document.getElementById('auth-close-btn');
  const modal = document.getElementById('auth-modal');
  const tabLogin = document.getElementById('tab-login-btn');
  const tabReg = document.getElementById('tab-register-btn');
  const loginForm = document.getElementById('login-form');
  const regForm = document.getElementById('register-form');

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
