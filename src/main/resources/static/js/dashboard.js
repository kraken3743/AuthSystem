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

function addLaplaceNoise(v, eps) {
    const u = Math.random() - 0.5;
    return Math.max(
        0,
        Math.round(v - (1 / eps) * Math.sign(u) * Math.log(1 - 2 * Math.abs(u)))
    );
}

/* ================= AUDIT LOGS ================= */
function loadAuditLogs() {
    const eps = epsilon.value;

    return fetch(`/auth/analytics/failed-logins?dataset=${getDataset()}`)
        .then(r => r.json())
        .then(data => {
            logTable.innerHTML = "<tr><th>User</th><th>Noisy Count</th></tr>";
            data.forEach(d => {
                logTable.innerHTML += `
                    <tr>
                        <td>${d.username}</td>
                        <td>${addLaplaceNoise(d.count, eps)}</td>
                    </tr>`;
            });
        });
}

/* ================= ANOMALIES ================= */
function loadAnomalies() {
    const eps = epsilon.value;
    const th = threshold.value;

    return fetch(`/auth/analytics/anomalies?dataset=${getDataset()}&threshold=${th}`)
        .then(r => r.json())
        .then(data => {
            anomalyTable.innerHTML =
                "<tr><th>User</th><th>Noisy Count</th><th>Anomaly</th></tr>";

            data.forEach(d => {
                const noisy = addLaplaceNoise(d.count, eps);
                anomalyTable.innerHTML += `
                    <tr>
                        <td>${d.username}</td>
                        <td>${noisy}</td>
                        <td>${noisy >= th ? "YES" : "NO"}</td>
                    </tr>`;
            });
        });
}

/* ================= TIME WINDOW ================= */
function loadTimeWindow() {
    const eps = epsilon.value;

    return fetch(`/auth/analytics/time-window?dataset=${getDataset()}`)
        .then(r => r.json())
        .then(data => {
            if (timeChartInstance) timeChartInstance.destroy();

            timeChartInstance = new Chart(timeChart, {
                type: "bar",
                data: {
                    labels: data.map(d => d.username),
                    datasets: [{
                        label: "Noisy Events (Last 30 min)",
                        data: data.map(d => addLaplaceNoise(d.count, eps)),
                        backgroundColor: "#ff9f40"
                    }]
                },
                options: {
                    animation: false,
                    responsive: true
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
