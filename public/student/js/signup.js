// signup.js — Handles student sign up form submission

const form = document.getElementById('signupForm');
const alertBox = document.getElementById('alertBox');
const submitBtn = document.getElementById('submitBtn');

/**
 * Shows an alert message.
 * @param {string} message
 * @param {'error'|'success'} type
 */
function showAlert(message, type) {
  alertBox.textContent = message;
  alertBox.className = `alert alert-${type} visible`;
}

function hideAlert() {
  alertBox.className = 'alert';
  alertBox.textContent = '';
}

function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  submitBtn.classList.toggle('loading', isLoading);
}

/**
 * Basic frontend validation before sending to the server.
 * The server re-validates everything — this is just for quick feedback.
 */
function validateForm(email, password, confirmPassword) {
  if (!email.trim()) return 'Please enter your institutional email.';
  if (!password) return 'Please enter a password.';
  if (!confirmPassword) return 'Please confirm your password.';
  if (password !== confirmPassword) return 'Passwords do not match.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  return null; // No error
}

form.addEventListener('submit', async function (event) {
  event.preventDefault();
  hideAlert();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  // Frontend validation
  const validationError = validateForm(email, password, confirmPassword);
  if (validationError) {
    showAlert(validationError, 'error');
    return;
  }

  setLoading(true);

  try {
    const response = await fetch('/api/student/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, confirmPassword })
    });

    const data = await response.json();

    if (data.success) {
      showAlert(data.message, 'success');
      // Redirect to OTP verification page after a short delay
      // Pass the email via URL query parameter for pre-filling the form
      setTimeout(() => {
        window.location.href = `verify-otp.html?email=${encodeURIComponent(email)}`;
      }, 1500);
    } else {
      showAlert(data.message || 'Sign up failed. Please try again.', 'error');
    }
  } catch (error) {
    showAlert('Unable to connect to the server. Please check your connection and try again.', 'error');
  } finally {
    setLoading(false);
  }
});

// Password visibility toggles
document.querySelectorAll('.password-toggle-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const targetId = btn.getAttribute('data-target');
    const input = document.getElementById(targetId);
    if (!input) return;
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    const eyeIcon = btn.querySelector('.eye-icon');
    const eyeOffIcon = btn.querySelector('.eye-off-icon');
    if (eyeIcon && eyeOffIcon) {
      eyeIcon.style.display = isPassword ? 'none' : 'block';
      eyeOffIcon.style.display = isPassword ? 'block' : 'none';
    }
    btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
  });
});
