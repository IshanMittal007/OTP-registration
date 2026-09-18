// Switcher & Views
const tabLogin = document.getElementById('tabLogin');
const tabSignup = document.getElementById('tabSignup');
const modeSwitcher = document.getElementById('modeSwitcher');
const screenLogin = document.getElementById('screenLogin');
const screenSignup = document.getElementById('screenSignup');
const screenOtp = document.getElementById('screenOtp');
const screenDashboard = document.getElementById('screenDashboard');
const dashName = document.getElementById('dashName');
const dashEmail = document.getElementById('dashEmail');
const logoutBtn = document.getElementById('logoutBtn');

// Forms & Buttons
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const loginSubmitBtn = document.getElementById('loginSubmitBtn');
const sendOtpBtn = document.getElementById('sendOtpBtn');
const verifyBtn = document.getElementById('verifyBtn');
const resendBtn = document.getElementById('resendBtn');
const targetEmailText = document.getElementById('targetEmailText');
const toast = document.getElementById('toast');

const otpBoxes = Array.from(document.querySelectorAll('.otp-box'));
const keyBtns = document.querySelectorAll('.key-btn');

let registeredEmail = '';

function showToast(msg, type = 'error') {
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3500);
}

function setBtnLoading(btn, isLoading) {
  const spinner = btn.querySelector('.spinner');
  const arrow = btn.querySelector('.btn-arrow');
  const text = btn.querySelector('.btn-text');
  btn.disabled = isLoading;
  if (spinner) spinner.classList.toggle('hidden', !isLoading);
  if (arrow) arrow.classList.toggle('hidden', isLoading);
  if (text) text.classList.toggle('hidden', isLoading);
}

function showDashboard(user) {
  modeSwitcher.classList.add('hidden');
  screenLogin.classList.add('hidden');
  screenSignup.classList.add('hidden');
  screenOtp.classList.add('hidden');
  screenDashboard.classList.remove('hidden');

  dashName.textContent = user.name || 'Verified User';
  dashEmail.textContent = user.email || '';
}

// Mode Switcher Listeners
tabLogin.addEventListener('click', () => {
  tabLogin.classList.add('active');
  tabSignup.classList.remove('active');
  screenLogin.classList.remove('hidden');
  screenSignup.classList.add('hidden');
  screenOtp.classList.add('hidden');
  modeSwitcher.classList.remove('hidden');
});

tabSignup.addEventListener('click', () => {
  tabSignup.classList.add('active');
  tabLogin.classList.remove('active');
  screenSignup.classList.remove('hidden');
  screenLogin.classList.add('hidden');
  screenOtp.classList.add('hidden');
  modeSwitcher.classList.remove('hidden');
});

// 1. Handle Log In
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  setBtnLoading(loginSubmitBtn, true);

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Invalid credentials');

    localStorage.setItem('token', data.token);
    showToast('Logged in successfully!', 'success');

    showDashboard(data.user);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setBtnLoading(loginSubmitBtn, false);
  }
});

// 2. Handle Sign Up / Request OTP
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;

  registeredEmail = email;
  setBtnLoading(sendOtpBtn, true);

  try {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Signup failed');

    showToast('OTP sent to email!', 'success');
    targetEmailText.textContent = registeredEmail;
    screenSignup.classList.add('hidden');
    modeSwitcher.classList.add('hidden');
    screenOtp.classList.remove('hidden');
    otpBoxes[0].focus();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setBtnLoading(sendOtpBtn, false);
  }
});

// 3. Segmented Box Auto-Focus
otpBoxes.forEach((box, idx) => {
  box.addEventListener('input', (e) => {
    if (e.target.value.length === 1 && idx < otpBoxes.length - 1) {
      otpBoxes[idx + 1].focus();
    }
  });

  box.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && !box.value && idx > 0) {
      otpBoxes[idx - 1].focus();
    }
  });
});

// 4. Virtual Keypad
keyBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const activeIdx = otpBoxes.findIndex((b) => !b.value);
    if (btn.classList.contains('backspace')) {
      const lastFilledIdx = [...otpBoxes].reverse().findIndex((b) => b.value);
      if (lastFilledIdx !== -1) {
        const target = otpBoxes[otpBoxes.length - 1 - lastFilledIdx];
        target.value = '';
        target.focus();
      }
    } else if (btn.textContent.trim() && activeIdx !== -1) {
      otpBoxes[activeIdx].value = btn.textContent.trim();
      if (activeIdx < otpBoxes.length - 1) {
        otpBoxes[activeIdx + 1].focus();
      }
    }
  });
});

// 5. Verify OTP
verifyBtn.addEventListener('click', async () => {
  const otp = otpBoxes.map((b) => b.value).join('');
  if (otp.length < 6) {
    showToast('Enter all 6 digits', 'error');
    return;
  }

  setBtnLoading(verifyBtn, true);

  try {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: registeredEmail, otp }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Verification failed');

    showToast('Registration complete! Please log in.', 'success');
    setTimeout(() => {
      otpBoxes.forEach((b) => (b.value = ''));
      tabLogin.click();
    }, 1200);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setBtnLoading(verifyBtn, false);
  }
});

// 6. Resend / Back
resendBtn.addEventListener('click', () => {
  otpBoxes.forEach((b) => (b.value = ''));
  screenOtp.classList.add('hidden');
  tabSignup.click();
});

// Logout
logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('token');
  screenDashboard.classList.add('hidden');
  modeSwitcher.classList.remove('hidden');
  tabLogin.click();
  showToast('Logged out', 'success');
});