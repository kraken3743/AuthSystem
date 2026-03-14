let timeChartInstance = null;

/* ================= TAB HANDLER ================= */
function showTab(id) {
    document.querySelectorAll(".tab").forEach(t => t.style.display = "none");
    document.getElementById(id).style.display = "block";
}
showTab("logs");

/* ================= LOADING ================= */
function showLoading() {
    document.getElementById("loading").style.display = "block";
}
function hideLoading() {
    document.getElementById("loading").style.display = "none";
}

/* ================= HELPERS ================= */
function getDataset() {
    return document.getElementById("datasetSelect").value;
}

function getPrivacyMethod() {
    return document.getElementById("privacyMethod").value;
}

function getDelta() {
    return document.getElementById("delta").value;
}

// Show/hide delta selector based on privacy method
const privacyMethodSelect = document.getElementById("privacyMethod");
privacyMethodSelect.addEventListener("change", function() {
    const show = privacyMethodSelect.value === "gaussian";
    document.getElementById("deltaLabel").style.display = show ? "inline-block" : "none";
    document.getElementById("delta").style.display = show ? "inline-block" : "none";
});

function addLaplaceNoise(v, eps) {
    const u = Math.random() - 0.5;
    return Math.max(
        0,
        Math.round(v - (1 / eps) * Math.sign(u) * Math.log(1 - 2 * Math.abs(u)))
    );
}

function addGaussianNoise(v, eps, delta) {
    // Standard deviation for Gaussian mechanism
    const sensitivity = 1.0;
    const sigma = Math.sqrt(2 * Math.log(1.25 / delta)) * sensitivity / eps;
    return Math.round(v + (randomNormal() * sigma));
}

// Box-Muller transform for normal distribution
function randomNormal() {
    let u = 0, v = 0;
    while(u === 0) u = Math.random();
    while(v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/* ================= AUDIT LOGS ================= */
function loadAuditLogs() {
    const eps = epsilon.value;
    const method = getPrivacyMethod();
    const delta = parseFloat(getDelta());

    return fetch(`/auth/analytics/failed-logins?dataset=${getDataset()}`)
        .then(r => r.json())
        .then(data => {
            logTable.innerHTML = "<tr><th>User</th><th>Noisy Count</th></tr>";
            data.forEach(d => {
                let noisy;
                if (method === "laplace") {
                    noisy = addLaplaceNoise(d.count, eps);
                } else {
                    noisy = addGaussianNoise(d.count, eps, delta);
                }
                logTable.innerHTML += `
                    <tr>
                        <td>${d.username}</td>
                        <td>${noisy}</td>
                    </tr>`;
            });
        });
}

/* ================= ANOMALIES ================= */
function loadAnomalies() {
    const eps = epsilon.value;
    const th = threshold.value;
    const method = getPrivacyMethod();
    const delta = parseFloat(getDelta());

    return fetch(`/auth/analytics/anomalies?dataset=${getDataset()}&threshold=${th}`)
        .then(r => r.json())
        .then(data => {
            anomalyTable.innerHTML =
                "<tr><th>User</th><th>Noisy Count</th><th>Anomaly</th></tr>";

            data.forEach(d => {
                let noisy;
                if (method === "laplace") {
                    noisy = addLaplaceNoise(d.count, eps);
                } else {
                    noisy = addGaussianNoise(d.count, eps, delta);
                }
                anomalyTable.innerHTML += `
                    <tr>
                        <td>${d.username}</td>
                        <td>${noisy}</td>
                        <td>${noisy >= th ? "YES" : "NO"}</td>
                    </tr>`;
            });
        });
}

function loadZScoreAnomalies() {
    const th = parseFloat(document.getElementById("zscoreThreshold").value);
    return fetch(`/auth/analytics/zscore-anomalies?dataset=${getDataset()}&threshold=${th}`)
        .then(r => r.json())
        .then(data => {
            zscoreTable.innerHTML =
                "<tr><th>User</th><th>Count</th><th>Z-Score Anomaly</th></tr>";
            data.forEach(d => {
                zscoreTable.innerHTML += `
                    <tr>
                        <td>${d.username}</td>
                        <td>${d.count}</td>
                        <td>${d.anomalous ? "YES" : "NO"}</td>
                    </tr>`;
            });
        });
}

/* ================= TIME WINDOW ================= */
function loadTimeWindow() {
    const eps = epsilon.value;
    const method = getPrivacyMethod();
    const delta = parseFloat(getDelta());

    return fetch(`/auth/analytics/time-window?dataset=${getDataset()}`)
        .then(r => r.json())
        .then(data => {
            if (timeChartInstance) timeChartInstance.destroy();

            let noisyData;
            let label;
            if (method === "laplace") {
                noisyData = data.map(d => addLaplaceNoise(d.count, eps));
                label = "Noisy Events (Laplace, Last 30 min)";
            } else {
                noisyData = data.map(d => addGaussianNoise(d.count, eps, delta));
                label = "Noisy Events (Gaussian, Last 30 min)";
            }

            timeChartInstance = new Chart(timeChart, {
                type: "bar",
                data: {
                    labels: data.map(d => d.username),
                    datasets: [{
                        label: label,
                        data: noisyData,
                        backgroundColor: method === "laplace" ? "#ff9f40" : "#4e79ff"
                    }]
                },
                options: {
                    animation: false,
                    responsive: true,
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: "Username"
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: method === "laplace" ? "Login Count (Laplace, Last 30 Minutes)" : "Login Count (Gaussian, Last 30 Minutes)"
                            }
                        }
                    }
                }
            });
        });
}

/* ================= USER CRUD ================= */
function loadUsers() {
    return fetch("/auth/admin/users")
        .then(r => r.json())
        .then(users => {
            userTable.innerHTML =
                "<tr><th>User</th><th>Role</th><th>Action</th></tr>";

            users.forEach(u => {
                userTable.innerHTML += `
                    <tr>
                        <td>${u.username}</td>
                        <td>
                            <select onchange="changeRole('${u.username}', this.value)">
                                <option ${u.role === "USER" ? "selected" : ""}>USER</option>
                                <option ${u.role === "ADMIN" ? "selected" : ""}>ADMIN</option>
                            </select>
                        </td>
                        <td>
                            ${u.username === "admin"
                                ? "<span class='muted'>(cannot be edited)</span>"
                                : `<button onclick="deleteUser('${u.username}')">Delete</button>`}
                        </td>
                    </tr>`;
            });
        });
}

function changeRole(u, r) {
    fetch(`/auth/admin/change-role?username=${u}&role=${r}`, { method: "POST" })
        .then(loadUsers);
}

function deleteUser(u) {
    if (!confirm(`Delete ${u}?`)) return;
    fetch(`/auth/admin/delete-user?username=${u}`, { method: "DELETE" })
        .then(loadUsers);
}

/* ================= MASTER LOAD ================= */
function reloadAll() {
    showLoading();
    Promise.all([
        loadAuditLogs(),
        loadAnomalies(),
        loadTimeWindow(),
        loadUsers()
    ]).finally(hideLoading);
}
