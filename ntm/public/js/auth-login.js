document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const btn = document.getElementById('submit-btn');

  document.getElementById('auth-message').innerHTML = '';
  setButtonLoading(btn, 'Signing in…');

  try {
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    window.location.href = 'index.html';
  } catch (err) {
    showError('auth-message', err.message || 'Could not sign in. Check your email and password.');
    setButtonLoading(btn, null, 'Sign In');
  }
});
