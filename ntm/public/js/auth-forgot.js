document.getElementById('forgot-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const btn = document.getElementById('submit-btn');
  const form = document.getElementById('forgot-form');

  document.getElementById('auth-message').innerHTML = '';
  setButtonLoading(btn, 'Sending…');

  try {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: new URL('reset-password.html', window.location.href).href,
    });
    if (error) throw error;
    form.style.display = 'none';
    showSuccess('auth-message', `If an account exists for <strong>${escapeHtml(email)}</strong>, a reset link has been sent.`);
  } catch (err) {
    showError('auth-message', err.message || 'Could not send the reset link.');
    setButtonLoading(btn, null, 'Send Reset Link');
  }
});
