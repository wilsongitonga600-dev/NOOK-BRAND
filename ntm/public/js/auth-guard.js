// Protects the main app. Anyone without a signed-in session is sent
// to the login page before the app is shown.
(function () {
  document.documentElement.style.visibility = 'hidden';
  window.supabaseClient.auth.getSession().then(({ data }) => {
    if (!data || !data.session) {
      window.location.replace('/login.html');
      return;
    }
    document.documentElement.style.visibility = '';
  }).catch(() => {
    window.location.replace('/login.html');
  });
})();
