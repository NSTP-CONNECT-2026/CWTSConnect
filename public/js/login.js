// login.js — Handles shared login form submission for both Students and NSTP Officials

const form = document.getElementById('loginForm');
const alertBox = document.getElementById('alertBox');
const loginBtn = document.getElementById('loginBtn');

function showAlert(message, type) {
  alertBox.textContent = message;
  alertBox.className = `alert alert-${type} visible`;
}

function hideAlert() {
  alertBox.className = 'alert';
  alertBox.textContent = '';
}

function setLoading(isLoading) {
  loginBtn.disabled = isLoading;
  loginBtn.classList.toggle('loading', isLoading);
}

// Show success message if redirected from OTP verification
window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('verified') === 'true') {
    showAlert('Email verified successfully. You can now log in.', 'success');
  }
});

form.addEventListener('submit', async function (event) {
  event.preventDefault();
  hideAlert();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  // Basic frontend validation
  if (!email) {
    showAlert('Please enter your email address.', 'error');
    return;
  }

  if (!password) {
    showAlert('Please enter your password.', 'error');
    return;
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showAlert('Please enter a valid email address.', 'error');
    return;
  }

  setLoading(true);

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Include session cookie
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (data.success) {
      showAlert('Login successful. Redirecting...', 'success');
      setTimeout(() => {
        // Use the redirect path returned by the backend
        window.location.href = data.redirect || '/student/dashboard.html';
      }, 1000);
    } else {
      showAlert(data.message || 'Invalid email or password.', 'error');
    }
  } catch (error) {
    console.error('Login error:', error);
    showAlert('Unable to connect to the server. Please check your connection and try again.', 'error');
  } finally {
    setLoading(false);
  }
});