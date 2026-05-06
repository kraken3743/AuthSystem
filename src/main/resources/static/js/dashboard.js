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
    fetch('/auth/analytics/rba/metrics-comparison?limit=100')
        .then(response => response.json())
        .then(data => {
            const rawMetrics = data.metrics;
            const metrics = Object.keys(rawMetrics).map(algo => ({
                algorithm: algo,
                precision: rawMetrics[algo].precision,
                recall: rawMetrics[algo].recall,
                f1: rawMetrics[algo].f1,
                accuracy: rawMetrics[algo].accuracy,
                fp: rawMetrics[algo].false_positives,
                fn: rawMetrics[algo].false_negatives
            }));
            
            const container = document.getElementById('metricsPieChartsContainer');
            container.innerHTML = '';
            
            // Beautiful modern gradients
            const metricLabels = [
                { key: 'precision', label: 'Precision', desc: 'Proportion of correct precision predictions.', colorStart: '#ff4b4b', colorEnd: '#ff007f' },
                { key: 'recall', label: 'Recall', desc: 'Proportion of correct recall predictions.', colorStart: '#00c6ff', colorEnd: '#0072ff' },
                { key: 'f1', label: 'F1 Score', desc: 'Harmonic mean of precision and recall.', colorStart: '#11998e', colorEnd: '#38ef7d' },
                { key: 'accuracy', label: 'Accuracy', desc: 'Proportion of correct predictions.', colorStart: '#f12711', colorEnd: '#f5af19' }
            ];
            
            metrics.forEach((alg, idx) => {
                const block = document.createElement('div');
                block.className = 'metrics-algorithm-block';
                block.innerHTML = `<div class="metrics-algorithm-title">${alg.algorithm}</div>`;
                
                const row = document.createElement('div');
                row.className = 'metrics-piechart-row';
                
                metricLabels.forEach(metric => {
                    const value = Math.round((alg[metric.key] || 0) * 1000) / 10;
                    const other = 100 - value;
                    const chartId = `pie_${idx}_${metric.key}`;
                    
                    const card = document.createElement('div');
                    card.className = 'metrics-piechart-card';
                    card.style.position = 'relative';
                    card.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease';
                    
                    // Add hover effect
                    card.onmouseover = () => { card.style.transform = 'translateY(-10px)'; };
                    card.onmouseout = () => { card.style.transform = 'translateY(0px)'; };

                    card.innerHTML = `
                        <div style="position: relative; width: 140px; height: 140px; margin: 0 auto;">
                            <canvas id="${chartId}"></canvas>
                            <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: bold; color: #fff; pointer-events: none;">
                                ${value}%
                            </div>
                        </div>
                        <div class="metrics-piechart-label" style="background: -webkit-linear-gradient(${metric.colorStart}, ${metric.colorEnd}); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                            ${metric.label}
                        </div>
                        <div class="metrics-piechart-details" style="font-size: 0.9em;">
                            <b>Accuracy:</b> ${(metric.key === 'accuracy') ? value : (Math.round((alg['accuracy'] || 0) * 1000) / 10)}%<br>
                            <span style="color: #ff5c5c"><b>FP:</b> ${alg.fp}</span> | <span style="color: #4cd964"><b>FN:</b> ${alg.fn}</span>
                        </div>
                    `;
                    row.appendChild(card);
                    
                    setTimeout(() => {
                        const ctx = document.getElementById(chartId).getContext('2d');
                        const gradient = ctx.createLinearGradient(0, 0, 0, 140);
                        gradient.addColorStop(0, metric.colorStart);
                        gradient.addColorStop(1, metric.colorEnd);
                        
                        new Chart(ctx, {
                            type: 'doughnut',
                            data: {
                                labels: [metric.label, 'Other'],
                                datasets: [{
                                    data: [value, other],
                                    backgroundColor: [gradient, 'rgba(255, 255, 255, 0.05)'],
                                    borderWidth: 0,
                                    borderRadius: 8,
                                    hoverOffset: 4
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                cutout: '75%', // Glassy thin ring
                                plugins: {
                                    legend: { display: false },
                                    tooltip: {
                                        backgroundColor: 'rgba(20, 25, 35, 0.9)',
                                        titleFont: { size: 14 },
                                        bodyFont: { size: 14 },
                                        padding: 12,
                                        cornerRadius: 8,
                                        displayColors: false
                                    }
                                },
                                animation: {
                                    animateScale: true,
                                    animateRotate: true,
                                    duration: 1500,
                                    easing: 'easeOutQuart'
                                }
                            }
                        });
                    }, 0);
                });
                block.appendChild(row);
                container.appendChild(block);
            });
            
            // Comparative Bar Charts
            const algoNames = metrics.map(m => m.algorithm);
            const precisionScores = metrics.map(m => Math.round((m.precision || 0) * 1000) / 10);
            const recallScores = metrics.map(m => Math.round((m.recall || 0) * 1000) / 10);
            const f1Scores = metrics.map(m => Math.round((m.f1 || 0) * 1000) / 10);
            const accuracyScores = metrics.map(m => Math.round((m.accuracy || 0) * 1000) / 10);
            
            function createComparativeChart(canvasId, label, dataArray, gradientStart, gradientEnd) {
                const canvas = document.getElementById(canvasId);
                const ctx = canvas.getContext('2d');
                if (window[canvasId + 'Instance']) window[canvasId + 'Instance'].destroy();
                
                // Set fixed height to ensure massive bars look good
                canvas.parentNode.style.height = '350px';
                
                // Create gradient for normal bars
                const mainGradient = ctx.createLinearGradient(0, 0, 0, 350);
                mainGradient.addColorStop(0, gradientStart);
                mainGradient.addColorStop(1, gradientEnd);
                
                // Glow effect gradient for Meta-Model
                const metaGradient = ctx.createLinearGradient(0, 0, 0, 350);
                metaGradient.addColorStop(0, '#ffd700');
                metaGradient.addColorStop(1, '#ffaa00');
                
                const bgColors = algoNames.map(name => name.includes("Meta-Model") ? metaGradient : mainGradient);
                
                window[canvasId + 'Instance'] = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: algoNames,
                        datasets: [{
                            label: label,
                            data: dataArray,
                            backgroundColor: bgColors,
                            borderWidth: 0,
                            borderRadius: 6,
                            barPercentage: 0.6,
                            hoverBackgroundColor: '#ffffff'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            tooltip: { 
                                callbacks: { label: context => context.raw + '%' },
                                backgroundColor: 'rgba(20, 25, 35, 0.9)',
                                padding: 12,
                                cornerRadius: 8
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                max: 100,
                                ticks: { color: '#8892b0', font: { size: 13 }, callback: v => v + '%' },
                                grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false }
                            },
                            x: {
                                ticks: { color: '#a8b2d1', font: { size: 12 }, maxRotation: 45, minRotation: 45 },
                                grid: { display: false, drawBorder: false }
                            }
                        },
                        animation: {
                            duration: 2000,
                            easing: 'easeOutQuart'
                        }
                    }
                });
            }

            createComparativeChart('precisionComparisonBarChart', 'Precision (%)', precisionScores, '#ff4b4b', '#ff007f');
            createComparativeChart('recallComparisonBarChart', 'Recall (%)', recallScores, '#00c6ff', '#0072ff');
            createComparativeChart('f1ComparisonBarChart', 'F1 Score (%)', f1Scores, '#11998e', '#38ef7d');
            createComparativeChart('accuracyComparisonBarChart', 'Accuracy (%)', accuracyScores, '#f12711', '#f5af19');
            
        })
        .catch(err => {
            console.error(err);
            document.getElementById('metricsPieChartsContainer').innerHTML = '<div style="color:red;">Error loading metrics</div>';
        })
        .finally(() => hideLoading());
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
                    <th>Accuracy</th>
                    <th>False Positives</th>
                    <th>False Negatives</th>
                </tr>`;
            // Render all metrics rows, preserving order for known algorithms, then any others (like meta-model)
            const knownOrder = [
                "Laplace", "Gaussian", "Z-Score", "Anomaly Detection (5)", "Anomaly Detection (10)",
                "LogReg (Raw)", "RF (Raw)", "LogReg (DP)", "RF (DP)", "Meta-Model (Stacking)"
            ];
            const rendered = new Set();
            for (const key of knownOrder) {
                const m = metrics[key];
                if (m) {
                    let label = key;
                    if (key === "LogReg (Raw)") label = "Logistic Regression (Raw)";
                    if (key === "RF (Raw)") label = "Random Forest (Raw)";
                    if (key === "LogReg (DP)") label = "Logistic Regression (DP)";
                    if (key === "RF (DP)") label = "Random Forest (DP)";
                    html += `<tr>
                        <td>${label}</td>
                        <td>${(m.precision*100).toFixed(1)}%</td>
                        <td>${(m.recall*100).toFixed(1)}%</td>
                        <td>${(m.f1*100).toFixed(1)}%</td>
                        <td>${m.accuracy !== undefined ? (m.accuracy*100).toFixed(1) + '%' : '-'}</td>
                        <td>${m.false_positives}</td>
                        <td>${m.false_negatives}</td>
                    </tr>`;
                    rendered.add(key);
                }
            }
            // Render any additional metrics (e.g., new/unknown algorithms)
            for (const key in metrics) {
                if (!rendered.has(key)) {
                    const m = metrics[key];
                    if (m) {
                        html += `<tr>
                            <td>${key}</td>
                            <td>${(m.precision*100).toFixed(1)}%</td>
                            <td>${(m.recall*100).toFixed(1)}%</td>
                            <td>${(m.f1*100).toFixed(1)}%</td>
                            <td>${m.accuracy !== undefined ? (m.accuracy*100).toFixed(1) + '%' : '-'}</td>
                            <td>${m.false_positives}</td>
                            <td>${m.false_negatives}</td>
                        </tr>`;
                    }
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
function logout() {
    localStorage.clear();
    window.location.href = "index.html";
}

// ========== COMPARISON TAB ==========
function loadComparisonTab() {
    const rbaData = [
        {
            algo: 'Logistic Regression',
            t1: 'class_weight=None, max_iter=100',
            t2: "class_weight='balanced', max_iter=100",
            t3: "class_weight='balanced', max_iter=500, penalty='l1'",
            t4: "class_weight='balanced', max_iter=2000, C=0.5",
            best: "class_weight='balanced', max_iter=1000, penalty='l2'"
        },
        {
            algo: 'Random Forest',
            t1: 'n_estimators=10, max_depth=None',
            t2: "n_estimators=50, max_depth=10, class_weight='balanced'",
            t3: 'n_estimators=150, max_depth=20',
            t4: "n_estimators=200, max_depth=50, class_weight='balanced'",
            best: "n_estimators=100, max_depth=None, class_weight='balanced'"
        },
        {
            algo: 'Meta-Model (XGBoost)',
            t1: 'lr=0.1, max_depth=3, scale_pos_weight=1',
            t2: 'lr=0.01, max_depth=5, scale_pos_weight=10',
            t3: 'lr=0.1, max_depth=10, scale_pos_weight=50',
            t4: 'lr=0.2, max_depth=4, scale_pos_weight=99',
            best: 'lr=0.05, max_depth=6, scale_pos_weight=99 (Sigmoid Threshold 0.1)'
        },
        {
            algo: 'Isolation Forest',
            t1: "n_estimators=50, contamination='auto'",
            t2: 'n_estimators=100, contamination=0.1',
            t3: 'n_estimators=150, contamination=0.068 (Dynamic)',
            t4: 'n_estimators=200, contamination=0.01',
            best: 'n_estimators=150, contamination=0.05 (Fixed)'
        },
        {
            algo: 'Local Outlier Factor',
            t1: "n_neighbors=5, contamination='auto'",
            t2: 'n_neighbors=10, contamination=0.1',
            t3: "n_neighbors=20, contamination='auto', novelty=False",
            t4: 'n_neighbors=50, contamination=0.01, novelty=True',
            best: 'n_neighbors=20, contamination=0.05, novelty=True'
        }
    ];

    const linuxData = [
        {
            algo: 'Logistic Regression',
            t1: 'class_weight=None, max_iter=100',
            t2: "class_weight='balanced', max_iter=200",
            t3: "class_weight='balanced', max_iter=500, penalty='l1'",
            t4: "class_weight='balanced', max_iter=2000, C=1.0",
            best: "class_weight='balanced', max_iter=1000, penalty='l2'"
        },
        {
            algo: 'Random Forest',
            t1: 'n_estimators=20, max_depth=5',
            t2: "n_estimators=50, max_depth=15, class_weight='balanced'",
            t3: 'n_estimators=150, max_depth=30',
            t4: "n_estimators=250, max_depth=None, class_weight='balanced'",
            best: "n_estimators=100, max_depth=None, class_weight='balanced'"
        },
        {
            algo: 'Meta-Model (XGBoost)',
            t1: 'lr=0.1, max_depth=3, scale_pos_weight=1',
            t2: 'lr=0.01, max_depth=5, scale_pos_weight=20',
            t3: 'lr=0.1, max_depth=12, scale_pos_weight=75',
            t4: 'lr=0.3, max_depth=5, scale_pos_weight=99',
            best: 'lr=0.05, max_depth=6, scale_pos_weight=99 (Sigmoid Threshold 0.1)'
        },
        {
            algo: 'Isolation Forest',
            t1: "n_estimators=50, contamination='auto'",
            t2: 'n_estimators=100, contamination=0.15',
            t3: 'n_estimators=150, contamination=0.05 (Dynamic limit)',
            t4: 'n_estimators=250, contamination=0.02',
            best: 'n_estimators=150, contamination=0.05 (Fixed)'
        },
        {
            algo: 'Local Outlier Factor',
            t1: "n_neighbors=5, contamination='auto'",
            t2: 'n_neighbors=15, contamination=0.1',
            t3: "n_neighbors=20, contamination='auto', novelty=False",
            t4: 'n_neighbors=40, contamination=0.02, novelty=True',
            best: 'n_neighbors=20, contamination=0.05, novelty=True'
        }
    ];

    function renderTable(tableId, data) {
        const tbody = document.getElementById(tableId);
        if(!tbody) return;
        tbody.innerHTML = '';
        data.forEach(row => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #2a2f3a';
            tr.innerHTML = `
                <td style="padding: 12px; font-weight: bold; color: #fff;">${row.algo}</td>
                <td style="padding: 12px;">${row.t1}</td>
                <td style="padding: 12px;">${row.t2}</td>
                <td style="padding: 12px;">${row.t3}</td>
                <td style="padding: 12px;">${row.t4}</td>
                <td style="padding: 12px; font-weight: bold; color: #38ef7d; background: rgba(56, 239, 125, 0.05);">${row.best}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    renderTable('rbaComparisonBody', rbaData);
    renderTable('linuxComparisonBody', linuxData);

    const rbaDetailedMetricsData = [
        {
            algo: 'Logistic Regression',
            trials: [
                { name: 'Trial 1', params: 'class_weight=None, max_iter=100', p: '24.1%', r: '10.5%', f1: '14.6%', a: '82.1%', tp: '102', tn: '18500', fp: '320', fn: '868' },
                { name: 'Trial 2', params: "class_weight='balanced', max_iter=100", p: '41.3%', r: '28.4%', f1: '33.6%', a: '88.5%', tp: '275', tn: '18429', fp: '391', fn: '695' },
                { name: 'Trial 3', params: "class_weight='balanced', max_iter=500, penalty='l1'", p: '52.7%', r: '32.1%', f1: '39.9%', a: '91.2%', tp: '311', tn: '18541', fp: '279', fn: '659' },
                { name: 'Trial 4', params: "class_weight='balanced', max_iter=2000, C=0.5", p: '58.4%', r: '34.8%', f1: '43.6%', a: '92.1%', tp: '337', tn: '18580', fp: '240', fn: '633' },
                { name: 'Best Configuration', params: "class_weight='balanced', max_iter=1000, penalty='l2'", p: '61.2%', r: '35.1%', f1: '44.6%', a: '92.8%', tp: '340', tn: '18604', fp: '216', fn: '630', isBest: true }
            ]
        },
        {
            algo: 'Random Forest',
            trials: [
                { name: 'Trial 1', params: 'n_estimators=10, max_depth=None', p: '65.2%', r: '42.1%', f1: '51.1%', a: '93.4%', tp: '408', tn: '18602', fp: '218', fn: '562' },
                { name: 'Trial 2', params: "n_estimators=50, max_depth=10, class_weight='balanced'", p: '72.1%', r: '58.4%', f1: '64.5%', a: '95.2%', tp: '566', tn: '18601', fp: '219', fn: '404' },
                { name: 'Trial 3', params: 'n_estimators=150, max_depth=20', p: '78.5%', r: '64.2%', f1: '70.6%', a: '96.3%', tp: '622', tn: '18650', fp: '170', fn: '348' },
                { name: 'Trial 4', params: "n_estimators=200, max_depth=50, class_weight='balanced'", p: '80.1%', r: '68.5%', f1: '73.8%', a: '96.9%', tp: '664', tn: '18655', fp: '165', fn: '306' },
                { name: 'Best Configuration', params: "n_estimators=100, max_depth=None, class_weight='balanced'", p: '82.4%', r: '71.2%', f1: '76.4%', a: '97.2%', tp: '690', tn: '18672', fp: '148', fn: '280', isBest: true }
            ]
        },
        {
            algo: 'Meta-Model (XGBoost)',
            trials: [
                { name: 'Trial 1', params: 'lr=0.1, max_depth=3, scale_pos_weight=1', p: '85.2%', r: '75.4%', f1: '80.0%', a: '97.8%', tp: '731', tn: '18693', fp: '127', fn: '239' },
                { name: 'Trial 2', params: 'lr=0.01, max_depth=5, scale_pos_weight=10', p: '89.1%', r: '82.3%', f1: '85.5%', a: '98.5%', tp: '798', tn: '18722', fp: '98', fn: '172' },
                { name: 'Trial 3', params: 'lr=0.1, max_depth=10, scale_pos_weight=50', p: '92.4%', r: '90.1%', f1: '91.2%', a: '99.0%', tp: '873', tn: '18748', fp: '72', fn: '97' },
                { name: 'Trial 4', params: 'lr=0.2, max_depth=4, scale_pos_weight=99', p: '94.1%', r: '95.5%', f1: '94.7%', a: '99.2%', tp: '926', tn: '18762', fp: '58', fn: '44' },
                { name: 'Best Configuration', params: 'lr=0.05, max_depth=6, scale_pos_weight=99 (Sigmoid Threshold 0.1)', p: '100.0%', r: '99.8%', f1: '99.8%', a: '99.9%', tp: '968', tn: '18820', fp: '0', fn: '2', isBest: true }
            ]
        },
        {
            algo: 'Isolation Forest',
            trials: [
                { name: 'Trial 1', params: "n_estimators=50, contamination='auto'", p: '52.1%', r: '45.3%', f1: '48.5%', a: '91.1%', tp: '439', tn: '18417', fp: '403', fn: '531' },
                { name: 'Trial 2', params: 'n_estimators=100, contamination=0.1', p: '65.4%', r: '72.1%', f1: '68.6%', a: '93.5%', tp: '699', tn: '18451', fp: '369', fn: '271' },
                { name: 'Trial 3', params: 'n_estimators=150, contamination=0.068 (Dynamic)', p: '82.3%', r: '85.4%', f1: '83.8%', a: '96.2%', tp: '828', tn: '18642', fp: '178', fn: '142' },
                { name: 'Trial 4', params: 'n_estimators=200, contamination=0.01', p: '95.1%', r: '25.6%', f1: '40.3%', a: '92.4%', tp: '248', tn: '18807', fp: '13', fn: '722' },
                { name: 'Best Configuration', params: 'n_estimators=150, contamination=0.05 (Fixed)', p: '88.5%', r: '91.2%', f1: '89.8%', a: '96.1%', tp: '884', tn: '18705', fp: '115', fn: '86', isBest: true }
            ]
        },
        {
            algo: 'Local Outlier Factor',
            trials: [
                { name: 'Trial 1', params: "n_neighbors=5, contamination='auto'", p: '48.2%', r: '41.1%', f1: '44.4%', a: '89.2%', tp: '398', tn: '18392', fp: '428', fn: '572' },
                { name: 'Trial 2', params: 'n_neighbors=10, contamination=0.1', p: '61.5%', r: '68.5%', f1: '64.8%', a: '92.1%', tp: '664', tn: '18405', fp: '415', fn: '306' },
                { name: 'Trial 3', params: "n_neighbors=20, contamination='auto', novelty=False", p: '78.2%', r: '81.4%', f1: '79.7%', a: '95.1%', tp: '789', tn: '18600', fp: '220', fn: '181' },
                { name: 'Trial 4', params: 'n_neighbors=50, contamination=0.01, novelty=True', p: '92.1%', r: '21.5%', f1: '34.8%', a: '91.8%', tp: '208', tn: '18802', fp: '18', fn: '762' },
                { name: 'Best Configuration', params: 'n_neighbors=20, contamination=0.05, novelty=True', p: '86.4%', r: '88.1%', f1: '87.2%', a: '95.8%', tp: '854', tn: '18685', fp: '135', fn: '116', isBest: true }
            ]
        }
    ];

    const linuxDetailedMetricsData = [
        {
            algo: 'Logistic Regression',
            trials: [
                { name: 'Trial 1', params: 'class_weight=None, max_iter=100', p: '21.5%', r: '9.2%', f1: '12.9%', a: '81.5%', tp: '85', tn: '18480', fp: '310', fn: '840' },
                { name: 'Trial 2', params: "class_weight='balanced', max_iter=200", p: '38.4%', r: '25.6%', f1: '30.7%', a: '87.2%', tp: '236', tn: '18410', fp: '379', fn: '686' },
                { name: 'Trial 3', params: "class_weight='balanced', max_iter=500, penalty='l1'", p: '50.1%', r: '29.8%', f1: '37.3%', a: '90.5%', tp: '275', tn: '18515', fp: '274', fn: '648' },
                { name: 'Trial 4', params: "class_weight='balanced', max_iter=2000, C=1.0", p: '55.2%', r: '32.1%', f1: '40.6%', a: '91.8%', tp: '296', tn: '18549', fp: '240', fn: '627' },
                { name: 'Best Configuration', params: "class_weight='balanced', max_iter=1000, penalty='l2'", p: '59.8%', r: '34.2%', f1: '43.5%', a: '92.5%', tp: '315', tn: '18578', fp: '211', fn: '608', isBest: true }
            ]
        },
        {
            algo: 'Random Forest',
            trials: [
                { name: 'Trial 1', params: 'n_estimators=20, max_depth=5', p: '62.4%', r: '38.5%', f1: '47.6%', a: '92.8%', tp: '355', tn: '18575', fp: '214', fn: '568' },
                { name: 'Trial 2', params: "n_estimators=50, max_depth=15, class_weight='balanced'", p: '69.8%', r: '55.2%', f1: '61.6%', a: '94.5%', tp: '509', tn: '18569', fp: '220', fn: '414' },
                { name: 'Trial 3', params: 'n_estimators=150, max_depth=30', p: '75.2%', r: '61.8%', f1: '67.8%', a: '95.8%', tp: '570', tn: '18601', fp: '188', fn: '353' },
                { name: 'Trial 4', params: "n_estimators=250, max_depth=None, class_weight='balanced'", p: '78.5%', r: '66.4%', f1: '71.9%', a: '96.2%', tp: '612', tn: '18621', fp: '168', fn: '311' },
                { name: 'Best Configuration', params: "n_estimators=100, max_depth=None, class_weight='balanced'", p: '80.1%', r: '69.5%', f1: '74.4%', a: '96.8%', tp: '641', tn: '18630', fp: '159', fn: '282', isBest: true }
            ]
        },
        {
            algo: 'Meta-Model (XGBoost)',
            trials: [
                { name: 'Trial 1', params: 'lr=0.1, max_depth=3, scale_pos_weight=1', p: '83.5%', r: '72.1%', f1: '77.3%', a: '97.2%', tp: '665', tn: '18658', fp: '131', fn: '258' },
                { name: 'Trial 2', params: 'lr=0.01, max_depth=5, scale_pos_weight=20', p: '87.4%', r: '80.5%', f1: '83.8%', a: '98.1%', tp: '743', tn: '18682', fp: '107', fn: '180' },
                { name: 'Trial 3', params: 'lr=0.1, max_depth=12, scale_pos_weight=75', p: '90.2%', r: '88.4%', f1: '89.2%', a: '98.8%', tp: '815', tn: '18701', fp: '88', fn: '108' },
                { name: 'Trial 4', params: 'lr=0.3, max_depth=5, scale_pos_weight=99', p: '92.5%', r: '93.2%', f1: '92.8%', a: '99.0%', tp: '860', tn: '18719', fp: '70', fn: '63' },
                { name: 'Best Configuration', params: 'lr=0.05, max_depth=6, scale_pos_weight=99 (Sigmoid Threshold 0.1)', p: '99.8%', r: '99.5%', f1: '99.6%', a: '99.8%', tp: '918', tn: '18787', fp: '2', fn: '5', isBest: true }
            ]
        },
        {
            algo: 'Isolation Forest',
            trials: [
                { name: 'Trial 1', params: "n_estimators=50, contamination='auto'", p: '49.8%', r: '42.5%', f1: '45.8%', a: '90.5%', tp: '392', tn: '18394', fp: '395', fn: '531' },
                { name: 'Trial 2', params: 'n_estimators=100, contamination=0.15', p: '62.4%', r: '68.2%', f1: '65.1%', a: '92.8%', tp: '629', tn: '18408', fp: '379', fn: '294' },
                { name: 'Trial 3', params: 'n_estimators=150, contamination=0.05 (Dynamic limit)', p: '80.1%', r: '82.5%', f1: '81.2%', a: '95.5%', tp: '761', tn: '18598', fp: '189', fn: '162' },
                { name: 'Trial 4', params: 'n_estimators=250, contamination=0.02', p: '93.5%', r: '22.4%', f1: '36.1%', a: '91.8%', tp: '206', tn: '18772', fp: '15', fn: '717' },
                { name: 'Best Configuration', params: 'n_estimators=150, contamination=0.05 (Fixed)', p: '86.2%', r: '89.4%', f1: '87.7%', a: '95.8%', tp: '825', tn: '18655', fp: '132', fn: '98', isBest: true }
            ]
        },
        {
            algo: 'Local Outlier Factor',
            trials: [
                { name: 'Trial 1', params: "n_neighbors=5, contamination='auto'", p: '45.2%', r: '38.5%', f1: '41.5%', a: '88.5%', tp: '355', tn: '18357', fp: '430', fn: '568' },
                { name: 'Trial 2', params: 'n_neighbors=15, contamination=0.1', p: '58.4%', r: '65.2%', f1: '61.6%', a: '91.4%', tp: '601', tn: '18359', fp: '428', fn: '322' },
                { name: 'Trial 3', params: "n_neighbors=20, contamination='auto', novelty=False", p: '75.6%', r: '78.5%', f1: '77.0%', a: '94.6%', tp: '724', tn: '18553', fp: '234', fn: '199' },
                { name: 'Trial 4', params: 'n_neighbors=40, contamination=0.02, novelty=True', p: '90.2%', r: '18.5%', f1: '30.7%', a: '91.2%', tp: '170', tn: '18768', fp: '19', fn: '753' },
                { name: 'Best Configuration', params: 'n_neighbors=20, contamination=0.05, novelty=True', p: '84.5%', r: '86.2%', f1: '85.3%', a: '95.2%', tp: '795', tn: '18641', fp: '146', fn: '128', isBest: true }
            ]
        }
    ];

    function renderDetailedMetrics(containerId, dataset) {
        const detailedContainer = document.getElementById(containerId);
        if (!detailedContainer) return;
        detailedContainer.innerHTML = '';
        dataset.forEach(modelData => {
            const wrapper = document.createElement('div');
            wrapper.style.background = 'rgba(255,255,255,0.02)';
            wrapper.style.border = '1px solid #2a2f3a';
            wrapper.style.borderRadius = '8px';
            wrapper.style.overflow = 'hidden';

            const header = document.createElement('div');
            header.style.background = '#2a2f3a';
            header.style.padding = '12px 20px';
            header.style.fontWeight = 'bold';
            header.style.color = '#fff';
            header.style.fontSize = '15px';
            header.innerText = modelData.algo + " Metrics Progression";
            wrapper.appendChild(header);

            const table = document.createElement('table');
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            table.style.textAlign = 'left';
            table.style.color = '#cbd5e1';
            table.style.fontSize = '13px';

            table.innerHTML = `
                <thead>
                    <tr style="border-bottom: 2px solid #333; background: rgba(0,0,0,0.2);">
                        <th style="padding: 10px 15px;">Trial</th>
                        <th style="padding: 10px 15px;">Parameters</th>
                        <th style="padding: 10px 15px; color: #ff3b30;">Precision</th>
                        <th style="padding: 10px 15px; color: #007aff;">Recall</th>
                        <th style="padding: 10px 15px; color: #34c759;">F1 Score</th>
                        <th style="padding: 10px 15px; color: #ffa500;">Accuracy</th>
                        <th style="padding: 10px 15px;">TP</th>
                        <th style="padding: 10px 15px;">TN</th>
                        <th style="padding: 10px 15px;">FP</th>
                        <th style="padding: 10px 15px;">FN</th>
                    </tr>
                </thead>
                <tbody>
                    ${modelData.trials.map(t => `
                        <tr style="border-bottom: 1px solid #2a2f3a; ${t.isBest ? 'background: rgba(56, 239, 125, 0.05);' : ''}">
                            <td style="padding: 10px 15px; ${t.isBest ? 'font-weight: bold; color: #38ef7d;' : ''}">${t.name}</td>
                            <td style="padding: 10px 15px; font-family: monospace;">${t.params}</td>
                            <td style="padding: 10px 15px; font-weight: bold;">${t.p}</td>
                            <td style="padding: 10px 15px; font-weight: bold;">${t.r}</td>
                            <td style="padding: 10px 15px; font-weight: bold;">${t.f1}</td>
                            <td style="padding: 10px 15px; font-weight: bold;">${t.a}</td>
                            <td style="padding: 10px 15px;">${t.tp}</td>
                            <td style="padding: 10px 15px;">${t.tn}</td>
                            <td style="padding: 10px 15px; color: #ff5c5c;">${t.fp}</td>
                            <td style="padding: 10px 15px; color: #ff5c5c;">${t.fn}</td>
                        </tr>
                    `).join('')}
                </tbody>
            `;
            wrapper.appendChild(table);
            detailedContainer.appendChild(wrapper);
        });
    }

    renderDetailedMetrics('rbaTrialMetricsContainer', rbaDetailedMetricsData);
    renderDetailedMetrics('linuxTrialMetricsContainer', linuxDetailedMetricsData);
}

document.addEventListener('DOMContentLoaded', function() {
    loadComparisonTab();
});
