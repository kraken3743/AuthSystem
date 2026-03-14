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

function showGreenLoadingBar(percent) {
    let bar = document.getElementById('greenLoadingBar');
    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'greenLoadingBar';
        bar.style.position = 'fixed';
        bar.style.top = '0';
        bar.style.left = '0';
        bar.style.width = '100%';
        bar.style.height = '8px';
        bar.style.background = '#222';
        bar.style.zIndex = '9999';
        bar.innerHTML = '<div id="greenBarInner" style="height:100%;width:0;background:#4cd964;transition:width 0.2s"></div>';
        document.body.appendChild(bar);
    }
    document.getElementById('greenBarInner').style.width = percent + '%';
    bar.style.display = percent < 100 ? 'block' : 'none';
}
function hideGreenLoadingBar() {
    let bar = document.getElementById('greenLoadingBar');
    if (bar) bar.style.display = 'none';
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
    const limit = 100; // You can make this user-configurable if desired

    if (getDataset() === "rba") {
        return fetch(`/auth/analytics/rba/failed-logins?limit=${limit}`)
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
    } else {
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
}

/* ================= ANOMALIES ================= */
function loadAnomalies() {
    const eps = epsilon.value;
    const th = threshold.value;
    const method = getPrivacyMethod();
    const delta = parseFloat(getDelta());
    const limit = 100;

    if (getDataset() === "rba") {
        return fetch(`/auth/analytics/rba/anomalies?threshold=${th}&limit=${limit}`)
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
    } else {
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
}

function loadZScoreAnomalies() {
    const th = parseFloat(document.getElementById("zscoreThreshold").value);
    zscoreTable.innerHTML = "<tr><th>User</th><th>Count</th><th>Z-Score Anomaly</th></tr>";
    showLoading();
    const limit = 100;
    if (getDataset() === "rba") {
        fetch(`/auth/analytics/rba/zscore-anomalies?threshold=${th}&limit=${limit}`)
            .then(r => r.json())
            .then(data => {
                if (!data || data.length === 0) {
                    zscoreTable.innerHTML += `<tr><td colspan='3' style='text-align:center;color:#aaa'>No data available</td></tr>`;
                    hideLoading();
                    return;
                }
                data.forEach(d => {
                    zscoreTable.innerHTML += `
                        <tr>
                            <td>${d.username}</td>
                            <td>${d.count}</td>
                            <td>${d.anomalous ? "YES" : "NO"}</td>
                        </tr>`;
                });
                hideLoading();
            })
            .catch(() => {
                zscoreTable.innerHTML += `<tr><td colspan='3' style='text-align:center;color:#f55'>Error loading data</td></tr>`;
                hideLoading();
            });
    } else {
        fetch(`/auth/analytics/zscore-anomalies?dataset=${getDataset()}&threshold=${th}`)
            .then(r => r.json())
            .then(data => {
                if (!data || data.length === 0) {
                    zscoreTable.innerHTML += `<tr><td colspan='3' style='text-align:center;color:#aaa'>No data available</td></tr>`;
                    hideLoading();
                    return;
                }
                data.forEach(d => {
                    zscoreTable.innerHTML += `
                        <tr>
                            <td>${d.username}</td>
                            <td>${d.count}</td>
                            <td>${d.anomalous ? "YES" : "NO"}</td>
                        </tr>`;
                });
                hideLoading();
            })
            .catch(() => {
                zscoreTable.innerHTML += `<tr><td colspan='3' style='text-align:center;color:#f55'>Error loading data</td></tr>`;
                hideLoading();
            });
    }
}

/* ================= TIME WINDOW ================= */
function loadTimeWindow() {
    const eps = epsilon.value;
    const method = getPrivacyMethod();
    const delta = parseFloat(getDelta());
    const limit = 100;

    if (getDataset() === "rba") {
        return fetch(`/auth/analytics/rba/time-window?limit=${limit}`)
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
                                    text: "Username",
                                    color: "#fff"
                                },
                                ticks: {
                                    color: "#fff"
                                }
                            },
                            y: {
                                title: {
                                    display: true,
                                    text: method === "laplace" ? "Login Count (Laplace, Last 30 Minutes)" : "Login Count (Gaussian, Last 30 Minutes)",
                                    color: "#fff"
                                },
                                ticks: {
                                    color: "#fff"
                                }
                            }
                        }
                    }
                });
            });
    } else {
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
                                    text: "Username",
                                    color: "#fff"
                                },
                                ticks: {
                                    color: "#fff"
                                }
                            },
                            y: {
                                title: {
                                    display: true,
                                    text: method === "laplace" ? "Login Count (Laplace, Last 30 Minutes)" : "Login Count (Gaussian, Last 30 Minutes)",
                                    color: "#fff"
                                },
                                ticks: {
                                    color: "#fff"
                                }
                            }
                        }
                    }
                });
            });
    }
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
window.addEventListener('DOMContentLoaded', function() {
    // If RBA tab is present, set up loading bar and chart
    if (document.getElementById('rba-accuracy')) {
        document.getElementById('rba-accuracy').style.display = 'none';
    }
});

// Patch reloadAll to show loading bar for RBA dataset
function reloadAll() {
    showLoading();
    if (getDataset() === 'rba') {
        showGreenLoadingBar(0);
        Promise.all([
            loadAuditLogs(),
            loadAnomalies(),
            loadTimeWindow(),
            loadUsers()
        ]).then(() => {
            showGreenLoadingBar(100);
            setTimeout(hideGreenLoadingBar, 800);
        }).finally(hideLoading);
    } else {
        Promise.all([
            loadAuditLogs(),
            loadAnomalies(),
            loadTimeWindow(),
            loadUsers()
        ]).finally(hideLoading);
    }
}

function runRbaAccuracyComparison() {
    showGreenLoadingBar(0);
    fetch('/auth/analytics/rba/accuracy-comparison?limit=100')
        .then(r => r.json())
        .then(result => {
            showGreenLoadingBar(80);
            const accuracy = result.accuracy;
            // Prepare data for grouped bar chart: Anomaly Detection vs. RBA Ground Truth
            const labels = [
                'Laplace', 'Gaussian', 'Z-Score', 'No Algorithm'
            ];
            const anomalyAcc = [
                accuracy['Laplace'],
                accuracy['Gaussian'],
                accuracy['Z-Score'],
                accuracy['No Algorithm']
            ];
            // RBA ground truth: percent of attack and benign
            const gt = result.groundTruth;
            const total = gt.attack + gt.benign;
            const rbaAttackPct = Math.round(100 * gt.attack / total);
            // For each label, show RBA attack rate as a reference bar
            const rbaRef = Array(labels.length).fill(rbaAttackPct);
            showRbaAccuracyChartGrouped(labels, anomalyAcc, rbaRef);
            // Show a mini description below the chart
            showRbaAccuracyDescription(rbaAttackPct);
            showGreenLoadingBar(100);
            setTimeout(hideGreenLoadingBar, 800);
        });
}

function showRbaAccuracyChartGrouped(labels, anomalyAcc, rbaRef) {
    let ctx = document.getElementById('rbaAccuracyChart').getContext('2d');
    if (window.rbaAccuracyChartInstance) window.rbaAccuracyChartInstance.destroy();
    window.rbaAccuracyChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Project Anomaly Detection Accuracy (%)',
                    data: anomalyAcc,
                    backgroundColor: '#ff9f40'
                },
                {
                    label: 'RBA Dataset Attack Rate (%)',
                    data: rbaRef,
                    backgroundColor: '#4e79ff'
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { labels: { color: '#fff' } }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: { display: true, text: 'Percent (%)', color: '#fff' },
                    ticks: { color: '#fff' }
                },
                x: {
                    title: { display: true, text: 'Algorithm/Threshold', color: '#fff' },
                    ticks: { color: '#fff' }
                }
            }
        }
    });
}

function showRbaAccuracyDescription(rbaAttackPct) {
    let desc = document.getElementById('rbaAccuracyDesc');
    if (!desc) {
        desc = document.createElement('div');
        desc.id = 'rbaAccuracyDesc';
        desc.style.color = '#fff';
        desc.style.marginTop = '20px';
        desc.style.fontSize = '1.1em';
        document.getElementById('rba-accuracy').appendChild(desc);
    }
    desc.innerHTML =
        `<b>Comparison Description:</b> This chart compares the accuracy of anomaly detection algorithms implemented in this project (orange bars) against the ground truth attack rate from the RBA dataset (blue bars).<br>
        <ul style='margin:8px 0 0 20px;'>
        <li><b>Anomaly Detection Accuracy</b>: Percentage of correct anomaly/benign predictions by the algorithms in this project for each method.</li>
        <li><b>RBA Dataset Attack Rate</b>: Percentage of actual attacks in the RBA dataset (ground truth, for reference).</li>
        </ul>
        <b>Interpretation:</b> Higher orange bars indicate better detection accuracy by the implemented algorithms. The blue bar shows the baseline attack rate in the dataset for context. The 'No Algorithm' bar shows the accuracy if no anomaly detection is performed (always predicting benign).`;
}

function compareRbaAccuracy(groundTruth, laplace, gaussian, zscore) {
    // Map username to anomaly for each algorithm
    const getAnomalyMap = arr => Object.fromEntries(arr.map(x => [x.username, !!x.anomalous]));
    const lapMap = getAnomalyMap(laplace);
    const gauMap = getAnomalyMap(gaussian);
    const zMap = getAnomalyMap(zscore);
    // For ground truth, assume order matches and is boolean
    let total = groundTruth.length;
    let lapCorrect = 0, gauCorrect = 0, zCorrect = 0;
    for (let i = 0; i < total; ++i) {
        // For demo, use username from laplace (should be improved for real matching)
        let user = laplace[i]?.username;
        let truth = !!groundTruth[i];
        if (lapMap[user] === truth) lapCorrect++;
        if (gauMap[user] === truth) gauCorrect++;
        if (zMap[user] === truth) zCorrect++;
    }
    // Show bar chart
    showRbaAccuracyChart([
        { label: 'Laplace', value: Math.round(100 * lapCorrect / total) },
        { label: 'Gaussian', value: Math.round(100 * gauCorrect / total) },
        { label: 'Z-Score', value: Math.round(100 * zCorrect / total) }
    ]);
}

function showRbaAccuracyChart(data) {
    let ctx = document.getElementById('rbaAccuracyChart').getContext('2d');
    if (window.rbaAccuracyChartInstance) window.rbaAccuracyChartInstance.destroy();
    window.rbaAccuracyChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.label),
            datasets: [{
                label: 'Accuracy (%)',
                data: data.map(d => d.value),
                backgroundColor: ['#ff9f40', '#4e79ff', '#4cd964']
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: { display: true, text: 'Accuracy (%)', color: '#fff' },
                    ticks: { color: '#fff' }
                },
                x: {
                    title: { display: true, text: 'Algorithm', color: '#fff' },
                    ticks: { color: '#fff' }
                }
            }
        }
    });
}
