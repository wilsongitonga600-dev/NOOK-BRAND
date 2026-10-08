document.getElementById('reset-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-new-password').value;
  const btn = document.getElementById('submit-btn');
  const form = document.getElementById('reset-form');

  document.getElementById('auth-message').innerHTML = '';

  if (password !== confirmPassword) {
    showError('auth-message', "Passwords don't match.");
    return;
  }
  if (password.length < 6) {
    showError('auth-message', 'Password must be at least 6 characters.');
    return;
  }

  setButtonLoading(btn, 'Updating…');

  try {
    // Supabase's reset-password email link signs the person into a
    // temporary recovery session automatically when they land here —
    // updateUser() just sets the new password on that session.
    const { error } = await supabaseClient.auth.updateUser({ password });
    if (error) throw error;
    form.style.display = 'none';
    showSuccess('auth-message', 'Password updated. <a href="login.html">Sign in</a> with your new password.');
  } catch (err) {
    showError('auth-message', err.message || 'Could not update your password. The reset link may have expired — request a new one.');
    setButtonLoading(btn, null, 'Update Password');
  }
});

// If the page was opened without a valid recovery session (expired or
// already-used link), explain that instead of showing a form that cannot work.
(async () => {
  const { data } = await supabaseClient.auth.getSession();
  if (!data || !data.session) {
    showError('auth-message', 'This reset link is invalid or has expired. Request a new one.');
    document.getElementById('reset-form').style.display = 'none';
  }
})();
