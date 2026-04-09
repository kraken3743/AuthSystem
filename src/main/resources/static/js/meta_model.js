// ========== META-MODEL (STACKING) TAB ==========

let metaModelCurrentPage = 0;
let metaModelPageSize = 10;

function loadMetaModelTab(page = 0) {
    metaModelCurrentPage = page;
    showLoading();
    fetch(`/auth/analytics/meta-model/results?page=${page}&size=${metaModelPageSize}`)
        .then(r => r.json())
        .then(data => {
            const table = document.getElementById('metaModelTable');
            table.innerHTML = '<tr><th>User</th><th>Failed Count</th><th>Login Freq</th><th>Unique IPs</th><th>Avg RTT</th><th>Meta Prob</th><th>Meta Pred</th><th>True Label</th></tr>';
            (data.content || []).forEach(d => {
                table.innerHTML += `<tr>
                    <td>${d.userId ?? ''}</td>
                    <td>${d.failedCount ?? ''}</td>
                    <td>${d.loginFreq ?? ''}</td>
                    <td>${d.uniqueIps ?? ''}</td>
                    <td>${d.avgRtt !== undefined ? Number(d.avgRtt).toFixed(2) : ''}</td>
                    <td>${d.metaProb !== undefined ? Number(d.metaProb).toFixed(3) : ''}</td>
                    <td>${d.metaPred !== undefined ? (d.metaPred ? 'YES' : 'NO') : ''}</td>
                    <td>${d.isAttackIp !== undefined ? (d.isAttackIp ? 'YES' : 'NO') : ''}</td>
                </tr>`;
            });
            renderMetaModelPagination(data.pageNumber, data.totalPages);
        })
        .catch(() => {
            document.getElementById('metaModelTable').innerHTML = '<tr><td colspan="8" style="color:#f55">Error loading meta-model results</td></tr>';
            document.getElementById('metaModelPagination').innerHTML = '';
        })
        .finally(hideLoading);
}

function renderMetaModelPagination(current, total) {
    const pagDiv = document.getElementById('metaModelPagination');
    if (!pagDiv) return;
    let html = '';
    if (total > 1) {
        html += `<span style="margin-right:10px;">`;
        if (current > 0) {
            html += `<a href="#" onclick="loadMetaModelTab(${current - 1});return false;">Prev</a> `;
        } else {
            html += `<span style="color:#aaa;">Prev</span> `;
        }
        for (let i = 0; i < total; i++) {
            if (i === current) {
                html += `<span style="font-weight:bold;color:#fff;margin:0 4px;">${i + 1}</span>`;
            } else {
                html += `<a href="#" onclick="loadMetaModelTab(${i});return false;" style="margin:0 4px;">${i + 1}</a>`;
            }
        }
        if (current < total - 1) {
            html += `<a href="#" onclick="loadMetaModelTab(${current + 1});return false;">Next</a>`;
        } else {
            html += `<span style="color:#aaa;">Next</span>`;
        }
        html += `</span>`;
    }
    pagDiv.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', function() {
    const metaBtn = document.querySelector('button[onclick="showTab(\'meta-model\')"]');
    if (metaBtn) {
        metaBtn.addEventListener('click', () => loadMetaModelTab(0));
    }
});
