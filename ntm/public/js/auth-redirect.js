// Sends a user who is already signed in straight to the app.
window.supabaseClient.auth.getSession().then(({ data }) => {
  if (data && data.session) window.location.replace('index.html');
});
