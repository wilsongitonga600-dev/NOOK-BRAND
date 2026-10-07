// NTM Authentication
// Handles login, signup, password reset, and auth navigation.

const authClient = window.supabaseClient;

// --------------------------------------------------
// Elements
// --------------------------------------------------

const loginSection = document.getElementById("login-form");
const signupSection = document.getElementById("signup-form");
const forgotSection = document.getElementById("forgot-form");

const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const forgotPasswordForm = document.getElementById("forgotPasswordForm");

const showSignup = document.getElementById("showSignup");
const showForgot = document.getElementById("showForgot");
const showLogin = document.getElementById("showLogin");
const backToLogin = document.getElementById("backToLogin");

const loginMessage = document.getElementById("loginMessage");
const signupMessage = document.getElementById("signupMessage");
const forgotMessage = document.getElementById("forgotMessage");

// --------------------------------------------------
// Helpers
// --------------------------------------------------

function showSection(section) {
    loginSection.classList.add("hidden");
    signupSection.classList.add("hidden");
    forgotSection.classList.add("hidden");

    section.classList.remove("hidden");

    clearMessages();
}

function clearMessages() {
    loginMessage.textContent = "";
    signupMessage.textContent = "";
    forgotMessage.textContent = "";
}

function getResetPasswordUrl() {
    const path = window.location.pathname;

    const directory = path.substring(
        0,
        path.lastIndexOf("/") + 1
    );

    return `${window.location.origin}${directory}reset-password.html`;
}

// --------------------------------------------------
// Navigation
// --------------------------------------------------

showSignup.addEventListener("click", () => {
    showSection(signupSection);
});

showForgot.addEventListener("click", () => {
    showSection(forgotSection);
});

showLogin.addEventListener("click", () => {
    showSection(loginSection);
});

backToLogin.addEventListener("click", () => {
    showSection(loginSection);
});

// --------------------------------------------------
// Login
// --------------------------------------------------

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    clearMessages();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    if (!email || !password) {
        loginMessage.textContent = "Please enter your email and password.";
        return;
    }

    loginMessage.textContent = "Logging in...";

    const { error } = await authClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        loginMessage.textContent = error.message;
        return;
    }

    window.location.href = "index.html";
});

// --------------------------------------------------
// Sign Up
// --------------------------------------------------

signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    clearMessages();

    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value;
    const confirmPassword =
        document.getElementById("signupConfirmPassword").value;

    if (!email || !password || !confirmPassword) {
        signupMessage.textContent = "Please complete all fields.";
        return;
    }

    if (password !== confirmPassword) {
        signupMessage.textContent = "Passwords do not match.";
        return;
    }

    if (password.length < 6) {
        signupMessage.textContent =
            "Password must be at least 6 characters.";
        return;
    }

    signupMessage.textContent = "Creating your account...";

    const { data, error } = await authClient.auth.signUp({
        email,
        password
    });

    if (error) {
        signupMessage.textContent = error.message;
        return;
    }

    // If email confirmation is enabled in Supabase,
    // the user must confirm their email before logging in.
    if (data.session) {
        window.location.href = "index.html";
        return;
    }

    signupMessage.textContent =
        "Account created. Check your email to confirm your account.";
});

// --------------------------------------------------
// Forgot Password
// --------------------------------------------------

forgotPasswordForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    clearMessages();

    const email = document.getElementById("forgotEmail").value.trim();

    if (!email) {
        forgotMessage.textContent = "Please enter your email.";
        return;
    }

    forgotMessage.textContent = "Sending reset link...";

    const { error } =
        await authClient.auth.resetPasswordForEmail(email, {
            redirectTo: getResetPasswordUrl()
        });

    if (error) {
        forgotMessage.textContent = error.message;
        return;
    }

    forgotMessage.textContent =
        "If an account exists for that email, a password reset link has been sent.";
});

// --------------------------------------------------
// Existing session check
// --------------------------------------------------

async function checkExistingSession() {
    const { data, error } = await authClient.auth.getSession();

    if (error) {
        console.error("Session check failed:", error);
        return;
    }

    if (data.session) {
        window.location.href = "index.html";
    }
}

checkExistingSession();
