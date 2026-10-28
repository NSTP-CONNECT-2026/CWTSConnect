// forgot-password.js — Handles multi-step password recovery with email OTP verification and eye password toggle

document.addEventListener('DOMContentLoaded', () => {
  // Elements - Step 1: Request OTP
  const requestOtpForm = document.getElementById('requestOtpForm');
  const requestEmailInput = document.getElementById('requestEmail');
  const sendOtpBtn = document.getElementById('sendOtpBtn');

  // Elements - Step 2: Reset Password
  const resetPasswordForm = document.getElementById('resetPasswordForm');
  const sentEmailDisplay = document.getElementById('sentEmailDisplay');
  const changeEmailBtn = document.getElementById('changeEmailBtn');
  const otpCodeInput = document.getElementById('otpCode');
  const newPasswordInput = document.getElementById('newPassword');
  const confirmNewPasswordInput = document.getElementById('confirmNewPassword');
  const resetSubmitBtn = document.getElementById('resetSubmitBtn');
  const resendOtpBtn = document.getElementById('resendOtpBtn');
  const resendCooldownText = document.getElementById('resendCooldownText');

  // Elements - Step 3: Success Screen
  const resetSuccessScreen = document.getElementById('resetSuccessScreen');
  const formHeading = document.getElementById('formHeading');
  const brandSubtitle = document.getElementById('brandSubtitle');

  // Shared UI Elements
  const alertBox = document.getElementById('alertBox');

  // State
  let currentEmail = '';
  let resendTimer = null;
  const COOLDOWN_SECONDS = 60;

  // Initialize Password Toggle Buttons
  setupPasswordToggles();

  // Pre-fill email from query parameter if available
  const urlParams = new URLSearchParams(window.location.search);
  const emailParam = urlParams.get('email');
  if (emailParam && requestEmailInput) {
    requestEmailInput.value = decodeURIComponent(emailParam).trim();
  }

  /**
   * Alert Helper
   */
  function showAlert(message, type = 'error') {
    if (!alertBox) return;
    alertBox.textContent = message;
    alertBox.className = `alert alert-${type} visible`;
  }

  function hideAlert() {
    if (!alertBox) return;
    alertBox.className = 'alert';
    alertBox.textContent = '';
  }

  function setBtnLoading(button, isLoading) {
    if (!button) return;
    button.disabled = isLoading;
    button.classList.toggle('loading', isLoading);
  }

  /**
   * Eye Toggle Functionality
   */
  function setupPasswordToggles() {
    const toggleBtns = document.querySelectorAll('.password-toggle-btn');
    toggleBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        const input = document.getElementById(targetId);
        if (!input) return;

        const eyeIcon = btn.querySelector('.eye-icon');
        const eyeOffIcon = btn.querySelector('.eye-off-icon');

        if (input.type === 'password') {
          input.type = 'text';
          btn.setAttribute('aria-label', 'Hide password');
          if (eyeIcon) eyeIcon.style.display = 'none';
          if (eyeOffIcon) eyeOffIcon.style.display = 'block';
        } else {
          input.type = 'password';
          btn.setAttribute('aria-label', 'Show password');
          if (eyeIcon) eyeIcon.style.display = 'block';
          if (eyeOffIcon) eyeOffIcon.style.display = 'none';
        }
      });
    });
  }

  /**
   * Starts resend cooldown countdown
   */
  function startResendCooldown() {
    if (!resendOtpBtn || !resendCooldownText) return;
    let secondsLeft = COOLDOWN_SECONDS;
    resendOtpBtn.disabled = true;
    resendCooldownText.style.display = 'block';
    resendCooldownText.textContent = `You can request another code in ${secondsLeft}s.`;

    if (resendTimer) clearInterval(resendTimer);

    resendTimer = setInterval(() => {
      secondsLeft--;
      if (secondsLeft > 0) {
        resendCooldownText.textContent = `You can request another code in ${secondsLeft}s.`;
      } else {
        clearInterval(resendTimer);
        resendOtpBtn.disabled = false;
        resendCooldownText.style.display = 'none';
      }
    }, 1000);
  }

  /**
   * STEP 1: Request OTP Form Submission
   */
  if (requestOtpForm) {
    requestOtpForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert();

      const email = requestEmailInput ? requestEmailInput.value.trim() : '';

      if (!email) {
        showAlert('Please enter your registered email address.', 'error');
        if (requestEmailInput) requestEmailInput.focus();
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showAlert('Please enter a valid email address format.', 'error');
        if (requestEmailInput) requestEmailInput.focus();
        return;
      }

      setBtnLoading(sendOtpBtn, true);

      try {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });

        const data = await res.json();

        if (res.ok && data.success) {
          currentEmail = email;
          if (sentEmailDisplay) sentEmailDisplay.textContent = email;

          // Transition to Step 2
          requestOtpForm.style.display = 'none';
          resetPasswordForm.style.display = 'block';
          if (formHeading) formHeading.textContent = 'Set New Password';
          if (brandSubtitle) brandSubtitle.textContent = 'Verify your code and enter your new password';

          if (otpCodeInput) {
            otpCodeInput.value = '';
            otpCodeInput.focus();
          }

          showAlert(data.message || 'Verification code sent! Please check your email.', 'success');
          startResendCooldown();
        } else {
          showAlert(data.message || 'Unable to find an account with that email address.', 'error');
        }
      } catch (err) {
        console.error('Request OTP network error:', err);
        showAlert('Unable to connect to the server. Please check your internet connection.', 'error');
      } finally {
        setBtnLoading(sendOtpBtn, false);
      }
    });
  }

  /**
   * Change Email button: switch back to Step 1
   */
  if (changeEmailBtn) {
    changeEmailBtn.addEventListener('click', () => {
      hideAlert();
      resetPasswordForm.style.display = 'none';
      requestOtpForm.style.display = 'block';
      if (formHeading) formHeading.textContent = 'Reset Password';
      if (brandSubtitle) brandSubtitle.textContent = 'Reset your account password with email verification';
      if (requestEmailInput) {
        requestEmailInput.value = currentEmail;
        requestEmailInput.focus();
      }
    });
  }

  /**
   * Resend OTP Button Handler
   */
  if (resendOtpBtn) {
    resendOtpBtn.addEventListener('click', async () => {
      if (!currentEmail) return;
      hideAlert();
      setBtnLoading(resendOtpBtn, true);

      try {
        const res = await fetch('/api/auth/resend-reset-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: currentEmail })
        });

        const data = await res.json();

        if (res.ok && data.success) {
          showAlert(data.message || 'A new verification code has been sent.', 'success');
          startResendCooldown();
        } else {
          showAlert(data.message || 'Failed to resend code. Please try again.', 'error');
        }
      } catch (err) {
        console.error('Resend OTP error:', err);
        showAlert('Network error while resending code.', 'error');
      } finally {
        setBtnLoading(resendOtpBtn, false);
      }
    });
  }

  /**
   * STEP 2: Verify OTP & Reset Password Form Submission
   */
  if (resetPasswordForm) {
    resetPasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert();

      const otp = otpCodeInput ? otpCodeInput.value.trim() : '';
      const newPassword = newPasswordInput ? newPasswordInput.value : '';
      const confirmPassword = confirmNewPasswordInput ? confirmNewPasswordInput.value : '';

      if (!otp) {
        showAlert('Please enter the 6-digit verification code.', 'error');
        if (otpCodeInput) otpCodeInput.focus();
        return;
      }

      if (!/^\d{6}$/.test(otp)) {
        showAlert('The verification code must be exactly 6 numeric digits.', 'error');
        if (otpCodeInput) otpCodeInput.focus();
        return;
      }

      if (!newPassword) {
        showAlert('Please enter your new password.', 'error');
        if (newPasswordInput) newPasswordInput.focus();
        return;
      }

      if (newPassword.length < 8) {
        showAlert('Your new password must be at least 8 characters long.', 'error');
        if (newPasswordInput) newPasswordInput.focus();
        return;
      }

      if (newPassword !== confirmPassword) {
        showAlert('Passwords do not match. Please re-enter your confirmation password.', 'error');
        if (confirmNewPasswordInput) confirmNewPasswordInput.focus();
        return;
      }

      setBtnLoading(resetSubmitBtn, true);

      try {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: currentEmail,
            otp,
            newPassword,
            confirmPassword
          })
        });

        const data = await res.json();

        if (res.ok && data.success) {
          // Transition to Step 3: Success Screen
          hideAlert();
          resetPasswordForm.style.display = 'none';
          if (formHeading) formHeading.style.display = 'none';
          if (brandSubtitle) brandSubtitle.style.display = 'none';
          if (resetSuccessScreen) resetSuccessScreen.style.display = 'block';
        } else {
          showAlert(data.message || 'Unable to reset password. Please check your verification code.', 'error');
        }
      } catch (err) {
        console.error('Reset password network error:', err);
        showAlert('Unable to connect to the server. Please check your connection and try again.', 'error');
      } finally {
        setBtnLoading(resetSubmitBtn, false);
      }
    });
  }

});
