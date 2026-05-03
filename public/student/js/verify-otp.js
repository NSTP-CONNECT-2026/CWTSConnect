// verify-otp.js — Handles OTP verification and resend

const otpForm = document.getElementById('otpForm');
const alertBox = document.getElementById('alertBox');
const verifyBtn = document.getElementById('verifyBtn');
const resendBtn = document.getElementById('resendBtn');
const resendCooldown = document.getElementById('resendCooldown');

let resendTimer = null;
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Shows an alert message.
 */
function showAlert(message, type) {
  alertBox.textContent = message;
  alertBox.className = `alert alert-${type} visible`;
}

function hideAlert() {
  alertBox.className = 'alert';
  alertBox.textContent = '';
}

function setVerifyLoading(isLoading) {
  verifyBtn.disabled = isLoading;
  verifyBtn.classList.toggle('loading', isLoading);
}

function setResendLoading(isLoading) {
  resendBtn.disabled = isLoading;
  resendBtn.classList.toggle('loading', isLoading);
}

/**
 * Starts a cooldown timer for the resend button to prevent spam.
 */
function startResendCooldown() {
  let seconds = RESEND_COOLDOWN_SECONDS;
  resendBtn.disabled = true;
  resendCooldown.style.display = 'block';

  resendTimer = setInterval(() => {
    seconds--;
    resendCooldown.textContent = `You can resend the code again in ${seconds} seconds.`;

    if (seconds <= 0) {
      clearInterval(resendTimer);
      resendBtn.disabled = false;
      resendCooldown.style.display = 'none';
    }
  }, 1000);
}

// Pre-fill email from URL query parameter (set by signup.js redirect)
window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const emailFromUrl = params.get('email');
  if (emailFromUrl) {
    document.getElementById('email').value = decodeURIComponent(emailFromUrl);
  }

  // Check if redirected after successful login verification
  const verified = params.get('verified');
  if (verified === 'true') {
    showAlert('Email verified successfully. You can now log in.', 'success');
  }
});

// OTP Verification Form Submit
otpForm.addEventListener('submit', async function (event) {
  event.preventDefault();
  hideAlert();

  const email = document.getElementById('email').value.trim();
  const otp = document.getElementById('otp').value.trim();

  if (!email) {
    showAlert('Please enter your institutional email.', 'error');
    return;
  }

  if (!otp) {
    showAlert('Please enter the verification code.', 'error');
    return;
  }

  if (!/^\d{6}$/.test(otp)) {
    showAlert('The verification code must be exactly 6 digits.', 'error');
    return;
  }

  setVerifyLoading(true);

  try {
    const response = await fetch('/api/student/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp })
    });

    const data = await response.json();

    if (data.success) {
      showAlert(data.message, 'success');
      // Redirect to login after success
      setTimeout(() => {
        window.location.href = 'login.html?verified=true';
      }, 1800);
    } else {
      showAlert(data.message || 'Verification failed. Please try again.', 'error');
    }
  } catch (error) {
    showAlert('Unable to connect to the server. Please check your connection and try again.', 'error');
  } finally {
    setVerifyLoading(false);
  }
});

// Resend OTP Button
resendBtn.addEventListener('click', async function () {
  hideAlert();

  const email = document.getElementById('email').value.trim();

  if (!email) {
    showAlert('Please enter your institutional email to resend the code.', 'error');
    return;
  }

  setResendLoading(true);

  try {
    const response = await fetch('/api/student/resend-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    if (data.success) {
      showAlert(data.message, 'success');
      startResendCooldown();
    } else {
      showAlert(data.message || 'Failed to resend OTP. Please try again.', 'error');
    }
  } catch (error) {
    showAlert('Unable to connect to the server. Please check your connection and try again.', 'error');
  } finally {
    setResendLoading(false);
  }
});

// Only allow numeric input in OTP field
document.getElementById('otp').addEventListener('input', function () {
  this.value = this.value.replace(/[^0-9]/g, '');
});
