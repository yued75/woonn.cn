// 管理员验证（基于 localStorage）
(function() {
    const stateStr = localStorage.getItem('pcmLoginState');
    if (!stateStr) {
        window.location.href = 'index.html';
        return;
    }
    try {
        const state = JSON.parse(stateStr);
        const SESSION_TIMEOUT = 720 * 60 * 1000; // 12小时
        if (!state.ts || (Date.now() - state.ts) > SESSION_TIMEOUT) {
            localStorage.removeItem('pcmLoginState');
            window.location.href = 'index.html';
            return;
        }
        if (state.type !== 'admin') {
            window.location.href = 'index.html';
            return;
        }
    } catch (e) {
        window.location.href = 'index.html';
        return;
    }
})();

// Supabase service_role 初始化（变量名 sbAdmin）
const SUPABASE_URL = 'https://khertrygeuybdfpurnjd.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoZXJ0cnlnZXV5YmRmcHVybmpkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzI1NTU0NCwiZXhwIjoyMDkyODMxNTQ0fQ.vcuVdS4q_dCs0UGpNI2nu3BmbrJrmL9LJzqyfTzyQTk';
let sbAdmin;
try {
    sbAdmin = window.supabase.createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
} catch (e) {
    console.error('Supabase 初始化失败：', e);
    sbAdmin = null;
}

const PAGE_SIZE = 50;
let currentLogs = [];
let selectedRows = new Set();
let currentPage = 1;
let totalCount = 0;

// 中文映射表
const actionMap = {
    'login': '登录',
    'logout': '登出',
    'login_failed': '登录失败',
    'generate': '一键生成',
    'copy': '复制表格',
    'export': '导出Excel'
};

// DOM 元素
const tbody = document.getElementById('logTableBody');
const refreshBtn = document.getElementById('refreshBtn');
const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
const deleteAllBtn = document.getElementById('deleteAllBtn');
const sourceBtn = document.getElementById('sourceBtn');
const applyFilterBtn = document.getElementById('applyFilterBtn');
const resetFilterBtn = document.getElementById('resetFilterBtn');
const filterUsername = document.getElementById('filterUsername');
const filterAction = document.getElementById('filterAction');
const filterDateStart = document.getElementById('filterDateStart');
const filterDateEnd = document.getElementById('filterDateEnd');
const statsArea = document.getElementById('statsArea');
const messageBox = document.getElementById('messageBox');
const loadingIndicator = document.getElementById('loadingIndicator');
const selectAllCheckbox = document.getElementById('selectAllCheckbox');
const paginationArea = document.getElementById('paginationArea');

function showMessage(msg, isError = false) {
    messageBox.textContent = msg;
    messageBox.className = isError ? 'message error' : 'message success';
    messageBox.style.display = 'block';
    setTimeout(() => { messageBox.style.display = 'none'; }, 4000);
}

function buildQuery() {
    if (!sbAdmin) return null;
    let query = sbAdmin.from('user_actions').select('*', { count: 'exact' });
    const username = filterUsername.value.trim();
    if (username) query = query.ilike('username', `%${username}%`);
    const action = filterAction.value;
    if (action) query = query.eq('action', action);
    const startDate = filterDateStart.value;
    if (startDate) query = query.gte('action_time', `${startDate}T00:00:00+08:00`);
    const endDate = filterDateEnd.value;
    if (endDate) query = query.lte('action_time', `${endDate}T23:59:59+08:00`);
    return query;
}

// 日志从早到晚排列（ascending: true），默认自动加载
async function loadLogs(page = 1) {
    if (!sbAdmin) {
        showMessage('Supabase 未配置或不可用，无法加载日志', true);
        return;
    }
    loadingIndicator.style.display = 'block';
    try {
        currentPage = page;
        const from = (page - 1) * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        let query = buildQuery()
            .order('action_time', { ascending: true })   // 从早到晚
            .range(from, to);
        const { data, error, count } = await query;
        if (error) throw error;
        currentLogs = data || [];
        totalCount = count || 0;
        renderTable();
        updateStats();
        renderPagination();
        selectedRows.clear();
        selectAllCheckbox.checked = false;
    } catch (err) {
        console.error(err);
        showMessage(`加载失败: ${err.message}`, true);
    } finally {
        loadingIndicator.style.display = 'none';
    }
}

function renderTable() {
    if (!currentLogs.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">暂无日志记录</td></tr>';
        return;
    }
    tbody.innerHTML = '';
    currentLogs.forEach(log => {
        const row = tbody.insertRow();
        const chkTd = row.insertCell(0);
        const chk = document.createElement('input');
        chk.type = 'checkbox';
        chk.dataset.id = log.id;
        chk.checked = selectedRows.has(log.id);
        chk.addEventListener('change', (e) => {
            if (e.target.checked) selectedRows.add(log.id);
            else selectedRows.delete(log.id);
            selectAllCheckbox.checked = (selectedRows.size === currentLogs.length && currentLogs.length > 0);
        });
        chkTd.appendChild(chk);
        chkTd.classList.add('checkbox-col');
        row.insertCell(1).textContent = log.id;
        row.insertCell(2).textContent = log.username;
        // 显示中文操作名
        row.insertCell(3).textContent = actionMap[log.action] || log.action;
        row.insertCell(4).textContent = log.details || '—';
        row.insertCell(5).textContent = log.pipe_name || '—';
        row.insertCell(6).textContent = log.pipe_length != null ? log.pipe_length : '—';
        row.insertCell(7).textContent = new Date(log.action_time).toLocaleString('zh-CN');
    });
}

function updateStats() {
    const totalPages = Math.ceil(totalCount / PAGE_SIZE);
    statsArea.textContent = `共 ${totalCount} 条记录，第 ${currentPage}/${totalPages || 1} 页`;
}

function renderPagination() {
    const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;
    let html = '';
    html += `<button ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">上一页</button>`;
    html += `<span>${currentPage} / ${totalPages}</span>`;
    html += `<button ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">下一页</button>`;
    paginationArea.innerHTML = html;
    document.querySelectorAll('.pagination button').forEach(btn => {
        btn.addEventListener('click', function() {
            const page = parseInt(this.dataset.page);
            if (page >= 1 && page <= totalPages) loadLogs(page);
        });
    });
}

async function deleteSelected() {
    if (selectedRows.size === 0) {
        showMessage('请至少选择一行', true);
        return;
    }
    if (!sbAdmin) {
        showMessage('Supabase 不可用', true);
        return;
    }
    if (!confirm(`确定要删除选中的 ${selectedRows.size} 条日志吗？`)) return;
    loadingIndicator.style.display = 'block';
    try {
        const ids = Array.from(selectedRows);
        const { error } = await sbAdmin
            .from('user_actions')
            .delete()
            .in('id', ids);
        if (error) throw error;
        showMessage(`成功删除 ${ids.length} 条日志`);
        await loadLogs(currentPage);
    } catch (err) {
        showMessage(`删除失败: ${err.message}`, true);
    } finally {
        loadingIndicator.style.display = 'none';
    }
}

async function deleteAll() {
    if (!sbAdmin) {
        showMessage('Supabase 不可用', true);
        return;
    }
    if (!confirm('⚠️ 此操作将删除所有日志记录，不可恢复！确定要执行吗？')) return;
    if (!confirm('再次确认：你真的要清空整个日志表吗？')) return;
    loadingIndicator.style.display = 'block';
    try {
        const { error } = await sbAdmin
            .from('user_actions')
            .delete()
            .neq('id', 0);
        if (error) throw error;
        showMessage('已清空全部日志');
        await loadLogs(1);
    } catch (err) {
        showMessage(`清空失败: ${err.message}`, true);
    } finally {
        loadingIndicator.style.display = 'none';
    }
}

function toggleSelectAll() {
    if (selectAllCheckbox.checked) {
        currentLogs.forEach(log => selectedRows.add(log.id));
    } else {
        selectedRows.clear();
    }
    renderTable();
}

function resetFilters() {
    filterUsername.value = '';
    filterAction.value = '';
    filterDateStart.value = '';
    filterDateEnd.value = '';
    loadLogs(1);
}

// 事件绑定
refreshBtn.addEventListener('click', () => loadLogs(1));
deleteSelectedBtn.addEventListener('click', deleteSelected);
deleteAllBtn.addEventListener('click', deleteAll);
sourceBtn.addEventListener('click', () => {
    window.open('https://github.com/yued75/woonn.cn/tree/main/pcm', '_blank');
});
applyFilterBtn.addEventListener('click', () => loadLogs(1));
resetFilterBtn.addEventListener('click', resetFilters);
selectAllCheckbox.addEventListener('change', toggleSelectAll);

//默认自动加载日志（不再需要手动点刷新）
loadLogs(1);

// 导出日志功能
(function() {
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            const table = document.getElementById('logTable');
            const rows = table.querySelectorAll('tbody tr');
            if (rows.length === 0 || (rows.length === 1 && rows[0].querySelector('td[colspan]'))) {
                alert('没有可导出的数据');
                return;
            }

            let csvContent = '';
            const headers = [];
            table.querySelectorAll('thead th').forEach((th, idx) => {
                if (idx !== 0 && idx !== 1) {
                    headers.push(th.innerText.trim());
                }
            });
            csvContent += headers.join(',') + '\n';

            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length < 8) return; // 跳过结构异常的行
                const rowData = [];
                cells.forEach((td, idx) => {
                    if (idx !== 0 && idx !== 1) {
                        let val = td.innerText.trim();
                        // 处理字段内逗号，用双引号包裹，并转义内部双引号
                        if (val.includes(',') || val.includes('"')) {
                            val = '"' + val.replace(/"/g, '""') + '"';
                        }
                        rowData.push(val);
                    }
                });
                csvContent += rowData.join(',') + '\n';
            });

            const blob = new Blob(['\uFEFF' + csvContent], {type: 'text/csv;charset=utf-8;'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = '日志导出_' + new Date().toISOString().slice(0,19).replace(/:/g, '-') + '.csv';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }
})();
