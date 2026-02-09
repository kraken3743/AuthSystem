// Toggle state
let isLogin = true;

// ---------------- TOGGLE LOGIN / REGISTER ----------------
function toggleMode() {
    isLogin = !isLogin;

    document.getElementById("loginBox").style.display = isLogin ? "block" : "none";
    document.getElementById("registerBox").style.display = isLogin ? "none" : "block";

    document.querySelector(".switch").innerText =
        isLogin ? "Switch to Register" : "Switch to Login";

    // Clear old messages
    document.getElementById("message").innerText = "";
}

// ---------------- REGISTER ----------------
function register() {
    const username = document.getElementById("regUser").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const password = document.getElementById("regPass").value.trim();

    if (!username || !email || !password) {
        message.innerText = "All fields are required";
        return;
    }

    fetch(`/auth/register?username=${username}&email=${email}&password=${password}`, {
        method: "POST"
    })
    .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
    })
    .then(() => {
        message.innerText = `Registration successful for ${username}`;

        // Clear fields
        regUser.value = "";
        regEmail.value = "";
        regPass.value = "";
    })
    .catch(() => {
        message.innerText = "Registration failed (username may already exist)";
    });
}

// ---------------- LOGIN ----------------
function login() {
    const username = document.getElementById("loginUser").value.trim();
    const password = document.getElementById("loginPass").value.trim();

    if (!username || !password) {
        alert("Enter username and password");
        return;
    }

    fetch(`/auth/login?username=${username}&password=${password}`, {
        method: "POST"
    })
    .then(res => {
        if (!res.ok) throw new Error();
        return res.text();
    })
    .then(raw => {
        // Normalize backend response safely
        const role = raw
            .replace(/[^A-Z]/g, "")   // keep only letters
            .toUpperCase();

        console.log("LOGIN ROLE:", role); // helpful for debugging

        // Store role
        localStorage.setItem("role", role);

        if (role === "ADMIN") {
            window.location.href = "dashboard.html";
        } 
        else if (role === "USER") {
            window.location.href = "user.html";
        } 
        else {
            alert("Invalid credentials");
        }
    })
    .catch(() => {
        alert("Invalid credentials");
    });
}
