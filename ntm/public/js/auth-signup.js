document.getElementById('signup-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  const btn = document.getElementById('submit-btn');
  const form = document.getElementById('signup-form');

  document.getElementById('auth-message').innerHTML = '';

  if (password !== confirmPassword) {
    showError('auth-message', "Passwords don't match.");
    return;
  }
  if (password.length < 6) {
    showError('auth-message', 'Password must be at least 6 characters.');
    return;
  }

  setButtonLoading(btn, 'Creating account…');

  try {
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) throw error;

    if (data.session) {
      // Email confirmation is off in the Supabase project settings —
      // the account is already signed in.
      window.location.href = '/index.html';
    } else {
      // Default Supabase behavior: confirmation email sent, no
      // session yet. Nothing to redirect to until they confirm.
      form.style.display = 'none';
      showSuccess('auth-message', `Account created. Check <strong>${escapeHtml(email)}</strong> for a confirmation link before signing in.`);
    }
  } catch (err) {
    showError('auth-message', err.message || 'Could not create account.');
    setButtonLoading(btn, null, 'Create Account');
  }
});
