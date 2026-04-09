// ========== PAGINATED ML ANOMALY (RBA) TAB ==========
function loadMlRbaPaged(page = 1) {
    showLoading();
    const table = document.getElementById('mlRbaTable');
    const pagDiv = document.getElementById('mlRbaPagination');
    const pageSize = 100;
    // Only show raw data (no Data Source selector)
    fetch(`/auth/analytics/rba/ml/results-json-paged?type=raw&page=${page}&pageSize=${pageSize}`)
        .then(r => r.json())
        .then(data => {
            table.innerHTML = '<tr><th>User</th><th>Failed Count</th><th>Login Freq</th><th>Unique IPs</th><th>Avg RTT</th><th>LogReg Prob</th><th>LogReg Pred</th><th>RF Prob</th><th>RF Pred</th><th>Attack Label</th></tr>';
            data.results.forEach(d => {
                table.innerHTML += `<tr>
                    <td>${d.user_id ?? d.username ?? ''}</td>
                    <td>${d.failed_count ?? ''}</td>
                    <td>${d.login_freq ?? ''}</td>
                    <td>${d.unique_ips ?? ''}</td>
                    <td>${d.avg_rtt !== undefined ? d.avg_rtt.toFixed(2) : ''}</td>
                    <td>${d.logreg_prob !== undefined ? d.logreg_prob.toFixed(3) : ''}</td>
                    <td>${d.logreg_pred !== undefined ? (d.logreg_pred ? 'YES' : 'NO') : ''}</td>
                    <td>${d.rf_prob !== undefined ? d.rf_prob.toFixed(3) : ''}</td>
                    <td>${d.rf_pred !== undefined ? (d.rf_pred ? 'YES' : 'NO') : ''}</td>
                    <td>${d.is_attack_ip !== undefined ? (d.is_attack_ip ? 'YES' : 'NO') : ''}</td>
                </tr>`;
            });
            // Pagination
            const total = data.total || 0;
            const totalPages = Math.ceil(total / pageSize);
            let html = '';
            if (totalPages > 1) {
                for (let i = 1; i <= totalPages; ++i) {
                    if (i === page) {
                        html += `<span style=\"font-weight:bold;\">${i}</span> `;
                    } else {
                        html += `<a href=\"#\" onclick=\"loadMlRbaPaged(${i});return false;\">${i}</a> `;
                    }
                }
            }
            pagDiv.innerHTML = html;
        })
        .catch(() => {
            table.innerHTML = '<tr><td colspan=\"10\" style=\"color:#f55\">Error loading data</td></tr>';
        })
        .finally(hideLoading);
}

// Hook up ML Anomaly (RBA) tab to load first page on tab click
document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('button[onclick="showTab(\'ml-rba\')"]').addEventListener('click', function() {
        loadMlRbaPaged(1);
    });
    // Data Source selector removed; no event handler needed
});
// ================= RESULTS TAB (BAR CHARTS) =================
function loadResultsTab() {
    showLoading();
    // Fetch all relevant results (ML, anomaly, zscore, DP, metrics)
    Promise.all([
        fetch('/auth/analytics/rba/ml/results-json').then(r => r.json()), // ml_results.json
        fetch('/auth/analytics/rba/metrics-comparison').then(r => r.json()), // metrics
        fetch('/auth/analytics/rba/accuracy-comparison').then(r => r.json()), // accuracy
        fetch('/auth/analytics/rba/zscore-anomalies?threshold=2&limit=100').then(r => r.json()), // zscore
        fetch('/auth/analytics/rba/anomalies?threshold=10&limit=100').then(r => r.json()) // anomaly
    ]).then(([ml, metrics, accuracy, zscore, anomaly]) => {
        // Prepare data for bar chart
        const labels = ['LogReg (Raw)', 'RF (Raw)', 'LogReg (DP)', 'RF (DP)', 'Anomaly', 'Z-Score'];
        // Example: use accuracy for each method (or count of anomalies)
        const data = [
            accuracy.accuracy?.Laplace ?? 0,
            accuracy.accuracy?.Gaussian ?? 0,
            (ml.filter(x => x.logreg_pred === 1).length / ml.length * 100) || 0,
            (ml.filter(x => x.rf_pred === 1).length / ml.length * 100) || 0,
            (anomaly.filter(x => x.anomalous).length / anomaly.length * 100) || 0,
            (zscore.filter(x => x.anomalous).length / zscore.length * 100) || 0
        ];
        // Render bar chart
        const ctx = document.getElementById('resultsBarChart').getContext('2d');
        if (window.resultsBarChartInstance) window.resultsBarChartInstance.destroy();
        window.resultsBarChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Detection Rate (%)',
                    data: data,
                    backgroundColor: [
                        '#4cd964', '#36a2eb', '#f9c846', '#f55', '#888', '#a0a'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'Comparison of Detection Methods' }
                },
                scales: {
                    y: { beginAtZero: true, max: 100 }
                }
            }
        });
        hideLoading();
    }).catch(() => {
        hideLoading();
        alert('Error loading results for summary tab.');
    });
}

// Hook up tab load
document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('button[onclick="showTab(\'results\')"]').addEventListener('click', loadResultsTab);
});
function getMlDpParams() {
    return {
        method: document.getElementById('mlDpMethod').value,
        epsilon: document.getElementById('mlDpEps').value,
        delta: document.getElementById('mlDpDelta').value
    };
}

function loadMlRbaLogisticDp() {
    showLoading();
    const { method, epsilon, delta } = getMlDpParams();
    fetch(`/auth/analytics/rba/ml/logistic-dp?method=${method}&epsilon=${epsilon}&delta=${delta}`)
        .then(r => r.json())
        .then(data => {
            const table = document.getElementById('mlRbaTable');
            table.innerHTML = '<tr><th>User</th><th>Noisy Failed Count</th><th>Prob(Attack)</th><th>Predicted Attack</th></tr>';
            data.forEach(d => {
                table.innerHTML += `<tr><td>${d.username}</td><td>${d.failed_count_noisy.toFixed(2)}</td><td>${d.prob_attack.toFixed(3)}</td><td>${d.predicted_attack ? 'YES' : 'NO'}</td></tr>`;
            });
        })
        .catch(() => {
            document.getElementById('mlRbaTable').innerHTML = '<tr><td colspan="4" style="color:#f55">Error loading data</td></tr>';
        })
        .finally(hideLoading);
}

function loadMlRbaRandomForestDp() {
    showLoading();
    const { method, epsilon, delta } = getMlDpParams();
    fetch(`/auth/analytics/rba/ml/randomforest-dp?method=${method}&epsilon=${epsilon}&delta=${delta}`)
        .then(r => r.json())
        .then(data => {
            const table = document.getElementById('mlRbaTable');
            table.innerHTML = '<tr><th>User</th><th>Noisy Failed Count</th><th>Predicted Attack</th></tr>';
            data.forEach(d => {
                table.innerHTML += `<tr><td>${d.username}</td><td>${d.failed_count_noisy.toFixed(2)}</td><td>${d.predicted_attack ? 'YES' : 'NO'}</td></tr>`;
            });
        })
        .catch(() => {
            document.getElementById('mlRbaTable').innerHTML = '<tr><td colspan="3" style="color:#f55">Error loading data</td></tr>';
        })
        .finally(hideLoading);
}
// ========== ML ANOMALY (RBA) TAB ==========
function loadMlRbaLogistic() {
    showLoading();
    fetch('/auth/analytics/rba/ml/logistic')
        .then(r => r.json())
        .then(data => {
            const table = document.getElementById('mlRbaTable');
            table.innerHTML = '<tr><th>User</th><th>Failed Count</th><th>Prob(Attack)</th><th>Predicted Attack</th></tr>';
            data.forEach(d => {
                table.innerHTML += `<tr><td>${d.username}</td><td>${d.failed_count}</td><td>${d.prob_attack.toFixed(3)}</td><td>${d.predicted_attack ? 'YES' : 'NO'}</td></tr>`;
            });
        })
        .catch(() => {
            document.getElementById('mlRbaTable').innerHTML = '<tr><td colspan="4" style="color:#f55">Error loading data</td></tr>';
        })
        .finally(hideLoading);
}

function loadMlRbaRandomForest() {
    showLoading();
    fetch('/auth/analytics/rba/ml/randomforest')
        .then(r => r.json())
        .then(data => {
            const table = document.getElementById('mlRbaTable');
            table.innerHTML = '<tr><th>User</th><th>Failed Count</th><th>Predicted Attack</th></tr>';
            data.forEach(d => {
                table.innerHTML += `<tr><td>${d.username}</td><td>${d.failed_count}</td><td>${d.predicted_attack ? 'YES' : 'NO'}</td></tr>`;
            });
        })
        .catch(() => {
            document.getElementById('mlRbaTable').innerHTML = '<tr><td colspan="3" style="color:#f55">Error loading data</td></tr>';
        })
        .finally(hideLoading);
}
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
    // Use a much smaller noise scale for large datasets
    const u = Math.random() - 0.5;
    // Sensitivity is 1, but scale down noise for large counts
    const scale = Math.max(1, Math.min(10, v / 1000)); // scale noise to be reasonable
    let noisy = Math.round(v + (scale / eps) * Math.sign(u) * Math.log(1 - 2 * Math.abs(u)));
    // Cap to a reasonable max (e.g., 200000)
    return Math.max(0, Math.min(noisy, 200000));
}

function addGaussianNoise(v, eps, delta) {
    // Standard deviation for Gaussian mechanism
    const sensitivity = 1.0;
    // Scale down noise for large counts
    const scale = Math.max(1, Math.min(10, v / 1000));
    const sigma = Math.sqrt(2 * Math.log(1.25 / delta)) * sensitivity / eps * scale;
    let noisy = Math.round(v + (randomNormal() * sigma));
    // Cap to a reasonable max (e.g., 200000)
    return Math.max(0, Math.min(noisy, 200000));
}

// Box-Muller transform for normal distribution
function randomNormal() {
    let u = 0, v = 0;
    while(u === 0) u = Math.random();
    while(v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/* ================= AUDIT LOGS ================= */
let rbaCurrentPage = 1;
let rbaPageSize = 100;
let rbaTotalPages = 1;

// ========== PAGINATION GENERIC FOR RBA TABS ==========
function renderRbaPaginationGeneric(tab, loadFn, totalKey = 'user-count') {
    fetch(`/auth/analytics/rba/${totalKey}`)
        .then(r => r.json())
        .then(total => {
            let pageSize = rbaPageSize;
            let currentPage = rbaCurrentPage;
            let totalPages = Math.ceil(total / pageSize);
            let html = '';
            let start = Math.max(1, currentPage - 4);
            let end = Math.min(totalPages, start + 9);
            if (end - start < 9) start = Math.max(1, end - 9);
            if (currentPage > 1) {
                html += `<a href="#" onclick="${loadFn}(${currentPage-1})">Prev</a> `;
            }
            for (let i = start; i <= end; ++i) {
                if (i === currentPage) {
                    html += `<span style="font-weight:bold;">${i}</span> `;
                } else {
                    html += `<a href="#" onclick="${loadFn}(${i})">${i}</a> `;
                }
            }
            if (currentPage < totalPages) {
                html += `<a href="#" onclick="${loadFn}(${currentPage+1})">Next</a>`;
            }
            let pagDiv = document.getElementById(tab + 'RbaPagination');
            if (!pagDiv) {
                pagDiv = document.createElement('div');
                pagDiv.id = tab + 'RbaPagination';
                pagDiv.style.margin = '10px 0';
                document.getElementById(tab + 'Table').parentElement.appendChild(pagDiv);
            }
            pagDiv.innerHTML = html;
            pagDiv.style.display = 'block';
        });
}

// AUDIT LOGS PAGINATION
function loadRbaFailedLoginsPage(page = 1) {
    rbaCurrentPage = page;
    const eps = epsilon.value;
    const method = getPrivacyMethod();
    const delta = parseFloat(getDelta());
    showLoading();
    fetch(`/auth/analytics/rba/failed-logins?limit=${rbaPageSize}&offset=${(page-1)*rbaPageSize}`)
        .then(r => r.json())
        .then(data => {
            if (page === 1) {
                data = data.filter(d => d.count < 50000);
            }
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
            renderRbaPaginationGeneric('log', 'loadRbaFailedLoginsPage');
        })
        .catch(() => {
            logTable.innerHTML = "<tr><td colspan='2' style='color:#f55'>Error loading data</td></tr>";
        })
        .finally(hideLoading);
}

// ANOMALY DETECTION PAGINATION
function loadRbaAnomaliesPage(page = 1) {
    rbaCurrentPage = page;
    const eps = epsilon.value;
    let th = threshold.value;
    const method = getPrivacyMethod();
    const delta = parseFloat(getDelta());
    showLoading();
    // Enforce minimum threshold of 10
    th = Math.max(10, th);
    fetch(`/auth/analytics/rba/anomalies?threshold=${th}&limit=${rbaPageSize}&offset=${(page-1)*rbaPageSize}`)
        .then(r => r.json())
        .then(data => {
            anomalyTable.innerHTML = "<tr><th>User</th><th>Noisy Count</th><th>Anomaly</th></tr>";
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
            renderRbaPaginationGeneric('anomaly', 'loadRbaAnomaliesPage');
        })
        .catch(() => {
            anomalyTable.innerHTML = "<tr><td colspan='3' style='color:#f55'>Error loading data</td></tr>";
        })
        .finally(hideLoading);
}

function loadAnomalies() {
    const eps = epsilon.value;
    let th = threshold.value;
    const method = getPrivacyMethod();
    const delta = parseFloat(getDelta());
    const limit = 100;
    // Enforce minimum threshold of 10
    th = Math.max(10, th);
    if (getDataset() === "rba") {
        loadRbaAnomaliesPage(rbaCurrentPage);
        return Promise.resolve();
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

// Z-SCORE ANOMALY PAGINATION
function loadRbaZScorePage(page = 1) {
    rbaCurrentPage = page;
    const th = parseFloat(document.getElementById("zscoreThreshold").value);
    showLoading();
    fetch(`/auth/analytics/rba/zscore-anomalies?threshold=${th}&limit=${rbaPageSize}&offset=${(page-1)*rbaPageSize}`)
        .then(r => r.json())
        .then(data => {
            zscoreTable.innerHTML = "<tr><th>User</th><th>Count</th><th>Z-Score Anomaly</th></tr>";
            data.forEach(d => {
                zscoreTable.innerHTML += `
                    <tr>
                        <td>${d.username}</td>
                        <td>${d.count}</td>
                        <td>${d.anomalous ? "YES" : "NO"}</td>
                    </tr>`;
            });
            renderRbaPaginationGeneric('zscore', 'loadRbaZScorePage');
        })
        .catch(() => {
            zscoreTable.innerHTML = "<tr><td colspan='3' style='color:#f55'>Error loading data</td></tr>";
        })
        .finally(hideLoading);
}

function loadAuditLogs() {
    const limit = 100;
    if (getDataset() === "rba") {
        loadRbaFailedLoginsPage(rbaCurrentPage);
        return Promise.resolve();
    }
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
function loadZScoreAnomalies() {
    const th = parseFloat(document.getElementById("zscoreThreshold").value);
    zscoreTable.innerHTML = "<tr><th>User</th><th>Count</th><th>Z-Score Anomaly</th></tr>";
    showLoading();
    const limit = 100;
    if (getDataset() === "rba") {
        loadRbaZScorePage(rbaCurrentPage);
        return Promise.resolve();
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
                let actionHtml = '';
                if (u.username === "admin") {
                    actionHtml = "<span class='muted'>(cannot be edited)</span>";
                } else if (u.suspended) {
                    actionHtml = `<button style='color:green' onclick="activateUser('${u.username}')">Activate</button>`;
                } else {
                    actionHtml = `<button style='color:red' onclick="suspendUser('${u.username}')">Suspend</button>`;
                }
                userTable.innerHTML += `
                    <tr${u.suspended ? " style='background:#ffdddd'" : ""}>
                        <td>${u.username}</td>
                        <td>
                            <select onchange="changeRole('${u.username}', this.value)" ${u.suspended ? 'disabled' : ''}>
                                <option ${u.role === "USER" ? "selected" : ""}>USER</option>
                                <option ${u.role === "ADMIN" ? "selected" : ""}>ADMIN</option>
                            </select>
                        </td>
                        <td>${actionHtml}</td>
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

function suspendUser(username) {
    if (!confirm(`Suspend ${username}? This will block all activity until reactivated.`)) return;
    fetch(`/auth/admin/suspend-user?username=${username}`, { method: "POST" })
        .then(loadUsers);
}

function activateUser(username) {
    fetch(`/auth/admin/activate-user?username=${username}`, { method: "POST" })
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
                'Laplace', 'Gaussian', 'Z-Score', 'Anomaly Detection (5)', 'Anomaly Detection (10)'
            ];
            const anomalyAcc = [
                accuracy['Laplace'],
                accuracy['Gaussian'],
                accuracy['Z-Score'],
                accuracy['Anomaly Detection (5)'],
                accuracy['Anomaly Detection (10)']
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

function runRbaMetricsComparison() {
    showLoading();
    fetch('/auth/analytics/rba/metrics-comparison?limit=100')
        .then(r => r.json())
        .then(result => {
            const metrics = result.metrics;
            let html = `<table style="width:100%;color:#fff;background:#222;border-radius:8px;">
                <tr style="background:#333;font-weight:bold;">
                    <th>Algorithm</th>
                    <th>Precision</th>
                    <th>Recall</th>
                    <th>F1 Score</th>
                    <th>False Positives</th>
                    <th>False Negatives</th>
                </tr>`;
            // Existing algorithms first
            for (const algo of ["Laplace", "Gaussian", "Z-Score", "Anomaly Detection (5)", "Anomaly Detection (10)"]) {
                const m = metrics[algo];
                if (m) {
                    html += `<tr>
                        <td>${algo}</td>
                        <td>${(m.precision*100).toFixed(1)}%</td>
                        <td>${(m.recall*100).toFixed(1)}%</td>
                        <td>${(m.f1*100).toFixed(1)}%</td>
                        <td>${m.false_positives}</td>
                        <td>${m.false_negatives}</td>
                    </tr>`;
                }
            }
            // Add ML metrics (LogReg, RF, DP) below
            const mlAlgos = [
                { key: "LogReg (Raw)", label: "Logistic Regression (Raw)" },
                { key: "RF (Raw)", label: "Random Forest (Raw)" },
                { key: "LogReg (DP)", label: "Logistic Regression (DP)" },
                { key: "RF (DP)", label: "Random Forest (DP)" }
            ];
            for (const {key, label} of mlAlgos) {
                const m = metrics[key];
                if (m) {
                    html += `<tr>
                        <td>${label}</td>
                        <td>${(m.precision*100).toFixed(1)}%</td>
                        <td>${(m.recall*100).toFixed(1)}%</td>
                        <td>${(m.f1*100).toFixed(1)}%</td>
                        <td>${m.false_positives}</td>
                        <td>${m.false_negatives}</td>
                    </tr>`;
                }
            }
            html += '</table>';
            document.getElementById('rbaMetricsTable').innerHTML = html;
        })
        .catch(() => {
            document.getElementById('rbaMetricsTable').innerHTML = '<span style="color:#f55">Error loading metrics</span>';
        })
        .finally(hideLoading);
}