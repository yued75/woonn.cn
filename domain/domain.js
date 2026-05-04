// domain.js - 域名管理系统（最终版）
(function() {
    // ========== 配置 ==========
    const API_BASE_URLS = [
        'https://domainapi.yued75.cc.cd/api',
        'https://domainapi.yued75.dpdns.org/api',
        'https://domainapi.yued75.indevs.in/api'
    ];
    const STORAGE_KEY = 'domain_master_password';
    const DRAFT_KEY = 'domain_form_draft';
    let currentPassword = sessionStorage.getItem(STORAGE_KEY) || '';

    // ========== 工具函数 ==========
    function showToast(msg, duration = 3000) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(() => toast.classList.remove('show'), duration);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // 到期状态与标签
    function getExpiryStatus(dateStr) {
        if (!dateStr || dateStr === '2999-12-30') {
            return { tagClass: 'permanent', text: '永久有效' };
        }
        const exp = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffMs = exp - today;
        const diffDays = Math.ceil(diffMs / 86400000);

        if (diffDays < 0) {
            return { tagClass: 'danger', text: `已过期${Math.abs(diffDays)}天` };
        } else if (diffDays <= 30) {
            return { tagClass: 'warning', text: `${diffDays}天后到期` };
        } else {
            return { tagClass: 'safe', text: `${diffDays}天后到期` };
        }
    }

    // ========== API 请求 (多地址容灾) ==========
    async function fetchWithFallback(path, options = {}) {
        const { method = 'GET', body, headers: extraHeaders } = options;
        let lastError;
        const urlPath = path.startsWith('/') ? path : `/${path}`;
        for (const baseUrl of API_BASE_URLS) {
            try {
                const url = `${baseUrl}${urlPath}`;
                const fetchOpts = {
                    method,
                    headers: {
                        ...(method !== 'DELETE' ? { 'Content-Type': 'application/json' } : {}),
                        ...(currentPassword ? { 'x-auth-password': currentPassword } : {}),
                        ...extraHeaders
                    }
                };
                if (body && method !== 'GET' && method !== 'DELETE') fetchOpts.body = JSON.stringify(body);
                const res = await fetch(url, fetchOpts);
                return res;
            } catch (e) {
                lastError = e;
                continue;
            }
        }
        throw new Error('所有备用地址均无法访问');
    }

    async function handleResponse(res, successMsg, errorPrefix) {
        if (res.ok || res.status === 201 || res.status === 204) {
            if (successMsg) showToast(successMsg);
            return res;
        }
        let errMsg = errorPrefix || '操作失败';
        try {
            const data = await res.json();
            if (data.error) errMsg = data.error;
        } catch {
            if (res.status === 401) errMsg = '密码错误';
            else if (res.status === 403) errMsg = '权限不足';
            else if (res.status === 500) errMsg = '服务器内部错误';
        }
        showToast(errMsg);
        throw new Error(errMsg);
    }

    // ========== 草稿管理 ==========
    function saveDraft(formData) {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
    }
    function loadDraft() {
        const raw = sessionStorage.getItem(DRAFT_KEY);
        if (!raw) return null;
        try { return JSON.parse(raw); } catch { return null; }
    }
    function clearDraft() {
        sessionStorage.removeItem(DRAFT_KEY);
    }

    function collectFormData() {
        return {
            provider: document.getElementById('provider').value.trim(),
            providerUrl: document.getElementById('providerUrl').value.trim(),
            providerAccount: document.getElementById('providerAccount').value.trim(),
            providerPassword: document.getElementById('providerPassword').value.trim(),
            domain: document.getElementById('domain').value.trim(),
            applyDate: document.getElementById('applyDate').value,
            expireDate: document.getElementById('expireDate').value,
            renewRule: document.getElementById('renewRule').value.trim(),
            purpose: document.getElementById('purpose').value.trim(),
            remark: document.getElementById('remark').value.trim()
        };
    }

    function restoreDraftToForm(draft) {
        document.getElementById('provider').value = draft.provider || '';
        document.getElementById('providerUrl').value = draft.providerUrl || '';
        document.getElementById('providerAccount').value = draft.providerAccount || '';
        document.getElementById('providerPassword').value = draft.providerPassword || '';
        document.getElementById('domain').value = draft.domain || '';
        document.getElementById('applyDate').value = draft.applyDate || '';
        document.getElementById('expireDate').value = draft.expireDate || '';
        document.getElementById('renewRule').value = draft.renewRule || '';
        document.getElementById('purpose').value = draft.purpose || '';
        document.getElementById('remark').value = draft.remark || '';
    }

    // ========== 登录页逻辑 ==========
    if (window.location.pathname.endsWith('login.html') || window.location.pathname === '/login.html') {
        // 如果已登录直接跳转管理页
        if (sessionStorage.getItem(STORAGE_KEY)) {
            window.location.href = 'index.html';
            return;
        }
        const passwordInput = document.getElementById('passwordInput');
        const loginBtn = document.getElementById('loginBtn');
        const loginError = document.getElementById('loginError');

        async function handleLogin() {
            const pwd = passwordInput.value.trim();
            if (!pwd) { loginError.textContent = '请输入密码'; return; }
            try {
                const res = await fetchWithFallback('/auth', { method:'POST', body:{ password: pwd }, headers:{} });
                if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        sessionStorage.setItem(STORAGE_KEY, pwd);
                        window.location.href = 'index.html';
                    } else {
                        loginError.textContent = data.error || '密码错误';
                    }
                } else {
                    const err = await res.json().catch(() => ({}));
                    loginError.textContent = err.error || '服务器错误';
                }
            } catch (e) {
                loginError.textContent = '无法连接服务器';
            }
        }
        loginBtn.addEventListener('click', handleLogin);
        passwordInput.addEventListener('keypress', e => { if (e.key === 'Enter') handleLogin(); });
        return;
    }

    // ========== 管理页逻辑 ==========
    // 未登录则跳转
    if (!currentPassword) {
        window.location.href = 'login.html';
        return;
    }

    // DOM 元素
    const tableBody = document.getElementById('tableBody');
    const emptyState = document.getElementById('emptyState');
    const domainCount = document.getElementById('domainCount');
    const searchInput = document.getElementById('searchInput');
    const clearSearch = document.getElementById('clearSearch');
    const addBtn = document.getElementById('addBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const changePasswordBtn = document.getElementById('changePasswordBtn');

    const modalOverlay = document.getElementById('modalOverlay');
    const editId = document.getElementById('editId');
    const domainForm = document.getElementById('domainForm');
    const clearFormBtn = document.getElementById('clearFormBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const modalClose = document.getElementById('modalClose');

    const confirmOverlay = document.getElementById('confirmOverlay');
    const deleteDomainName = document.getElementById('deleteDomainName');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const confirmCancelBtn = document.getElementById('confirmCancelBtn');
    const confirmClose = document.getElementById('confirmClose');

    const passwordModalOverlay = document.getElementById('passwordModalOverlay');
    const passwordSubmitBtn = document.getElementById('passwordSubmitBtn');
    const passwordCancelBtn = document.getElementById('passwordCancelBtn');
    const passwordModalClose = document.getElementById('passwordModalClose');

    let domains = [];
    let deleteId = null;

    // 退出功能
    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem(STORAGE_KEY);
        window.location.href = 'login.html';
    });

    // 加载域名
    async function loadDomains() {
        try {
            tableBody.innerHTML = '<tr><td colspan="11" class="loading-text">加载中...</td></tr>';
            const res = await fetchWithFallback('/domains');
            if (res.ok) domains = await res.json();
            else { showToast('加载失败'); domains = []; }
        } catch (e) { showToast('加载失败'); domains = []; }
        renderTable(searchInput.value);
    }

    function renderTable(filter) {
        const kw = (filter || '').trim().toLowerCase();
        const filtered = domains.filter(d =>
            !kw || [d.provider, d.domain, d.purpose, d.remark, d.provider_account].some(f => (f||'').toLowerCase().includes(kw))
        );
        domainCount.textContent = `共 ${domains.length} 个域名`;

        if (filtered.length === 0) {
            tableBody.innerHTML = '';
            emptyState.style.display = 'flex';
        } else {
            emptyState.style.display = 'none';
            tableBody.innerHTML = filtered.map(item => {
                const status = getExpiryStatus(item.expire_date);
                return `<tr>
                    <td>${escapeHtml(item.provider)}</td>
                    <td>${item.provider_url ? `<a href="${escapeHtml(item.provider_url)}" target="_blank" class="provider-url">${escapeHtml(item.provider_url)}</a>` : '-'}</td>
                    <td>${escapeHtml(item.provider_account) || '-'}</td>
                    <td class="password-cell">
                        <span class="masked-password" data-password="${escapeHtml(item.provider_password||'')}">${item.provider_password ? '******' : '-'}</span>
                        ${item.provider_password ? '<button class="password-toggle">查看</button>' : ''}
                    </td>
                    <td><strong>${escapeHtml(item.domain)}</strong></td>
                    <td>${item.apply_date || '-'}</td>
                    <td>
                        ${item.expire_date || '-'}
                        <span class="expiry-tag ${status.tagClass}">${status.text}</span>
                    </td>
                    <td>${escapeHtml(item.renew_rule) || '-'}</td>
                    <td>${escapeHtml(item.purpose) || '-'}</td>
                    <td>${escapeHtml(item.remark) || '-'}</td>
                    <td>
                        <div class="actions">
                            <button class="icon-btn edit" data-id="${item.id}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                            <button class="icon-btn delete" data-id="${item.id}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>
                        </div>
                    </td>
                </tr>`;
            }).join('');
        }

        document.querySelectorAll('.icon-btn.edit').forEach(b => b.addEventListener('click', () => editDomain(b.dataset.id)));
        document.querySelectorAll('.icon-btn.delete').forEach(b => b.addEventListener('click', () => confirmDelete(b.dataset.id)));
        document.querySelectorAll('.password-toggle').forEach(b => b.addEventListener('click', togglePassword));
    }

    function togglePassword(e) {
        const btn = e.target;
        const span = btn.parentElement.querySelector('.masked-password');
        const pw = span.dataset.password;
        if (span.textContent === '******') { span.textContent = pw; btn.textContent = '隐藏'; }
        else { span.textContent = '******'; btn.textContent = '查看'; }
    }

    // 搜索
    searchInput.addEventListener('input', () => {
        renderTable(searchInput.value);
        clearSearch.style.display = searchInput.value ? 'flex' : 'none';
    });
    clearSearch.addEventListener('click', () => {
        searchInput.value = ''; renderTable(''); clearSearch.style.display = 'none'; searchInput.focus();
    });

    // 添加按钮（草稿恢复）
    addBtn.addEventListener('click', () => {
        document.getElementById('modalTitle').textContent = '添加域名';
        domainForm.reset();
        editId.value = '';
        document.getElementById('applyDate').value = new Date().toISOString().split('T')[0];
        const draft = loadDraft();
        if (draft) {
            restoreDraftToForm(draft);
            showToast('已恢复上次未保存的内容');
        }
        modalOverlay.classList.add('active');
    });

    // 编辑域名
    function editDomain(id) {
        const item = domains.find(d => d.id === id);
        if (!item) return;
        document.getElementById('modalTitle').textContent = '编辑域名';
        editId.value = item.id;
        document.getElementById('provider').value = item.provider || '';
        document.getElementById('providerUrl').value = item.provider_url || '';
        document.getElementById('providerAccount').value = item.provider_account || '';
        document.getElementById('providerPassword').value = item.provider_password || '';
        document.getElementById('domain').value = item.domain || '';
        document.getElementById('applyDate').value = item.apply_date || '';
        document.getElementById('expireDate').value = (item.expire_date === '2999-12-30') ? '' : (item.expire_date || '');
        document.getElementById('renewRule').value = item.renew_rule || '';
        document.getElementById('purpose').value = item.purpose || '';
        document.getElementById('remark').value = item.remark || '';
        modalOverlay.classList.add('active');
    }

    function closeModal(clearDraftFlag = false) {
        modalOverlay.classList.remove('active');
        domainForm.reset();
        editId.value = '';
        if (clearDraftFlag) clearDraft();
    }

    cancelBtn.addEventListener('click', () => closeModal(false));
    modalClose.addEventListener('click', () => closeModal(false));
    modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(false); });

    // 清空按钮
    clearFormBtn.addEventListener('click', () => {
        domainForm.reset();
        document.getElementById('applyDate').value = new Date().toISOString().split('T')[0];
        editId.value = '';
        document.getElementById('modalTitle').textContent = '添加域名';
		clearDraft();  // 清空表单同时清除草稿
    });

    // 表单提交（保存成功才清除草稿）
    domainForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const provider = document.getElementById('provider').value.trim();
        const domain = document.getElementById('domain').value.trim();
        if (!provider || !domain) { showToast('服务商和域名不能为空'); return; }
        let expireDate = document.getElementById('expireDate').value;
        if (!expireDate) expireDate = '2999-12-30';

        const data = {
            provider,
            providerUrl: document.getElementById('providerUrl').value.trim(),
            providerAccount: document.getElementById('providerAccount').value.trim(),
            providerPassword: document.getElementById('providerPassword').value.trim(),
            domain,
            applyDate: document.getElementById('applyDate').value,
            expireDate,
            renewRule: document.getElementById('renewRule').value.trim(),
            purpose: document.getElementById('purpose').value.trim(),
            remark: document.getElementById('remark').value.trim()
        };

        try {
            let res;
            if (editId.value) {
                res = await fetchWithFallback(`/domains/${editId.value}`, { method:'PUT', body: data });
                await handleResponse(res, '域名更新成功');
            } else {
                data.id = crypto.randomUUID();
                res = await fetchWithFallback('/domains', { method:'POST', body: data });
                await handleResponse(res, '域名添加成功');
            }
            closeModal(true); // 只有成功才清草稿
            loadDomains();
        } catch (err) {}
    });

    // 删除确认
    function confirmDelete(id) {
        const item = domains.find(d => d.id === id);
        if (!item) return;
        deleteId = id;
        deleteDomainName.textContent = item.domain;
        confirmOverlay.classList.add('active');
    }
    function closeConfirm() { confirmOverlay.classList.remove('active'); deleteId = null; }
    confirmCancelBtn.addEventListener('click', closeConfirm);
    confirmClose.addEventListener('click', closeConfirm);
    confirmOverlay.addEventListener('click', e => { if (e.target === confirmOverlay) closeConfirm(); });
    confirmDeleteBtn.addEventListener('click', async () => {
        if (!deleteId) return;
        try {
            const res = await fetchWithFallback(`/domains/${deleteId}`, { method:'DELETE' });
            await handleResponse(res, '域名已删除');
            closeConfirm();
            loadDomains();
        } catch {}
    });

    // 修改密码
    changePasswordBtn.addEventListener('click', () => {
        document.getElementById('oldPassword').value = '';
        document.getElementById('newPassword').value = '';
        passwordModalOverlay.classList.add('active');
    });
    function closePasswordModal() { passwordModalOverlay.classList.remove('active'); }
    passwordCancelBtn.addEventListener('click', closePasswordModal);
    passwordModalClose.addEventListener('click', closePasswordModal);
    passwordModalOverlay.addEventListener('click', e => { if (e.target === passwordModalOverlay) closePasswordModal(); });
    passwordSubmitBtn.addEventListener('click', async () => {
        const oldPwd = document.getElementById('oldPassword').value;
        const newPwd = document.getElementById('newPassword').value;
        if (!oldPwd || !newPwd) { showToast('新旧密码不能为空'); return; }
        try {
            const res = await fetchWithFallback('/password', { method:'PUT', body:{ oldPassword: oldPwd, newPassword: newPwd } });
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    sessionStorage.setItem(STORAGE_KEY, newPwd);
                    currentPassword = newPwd;
                    showToast('密码修改成功');
                    closePasswordModal();
                } else showToast(data.error || '修改失败');
            } else {
                const err = await res.json().catch(()=>({}));
                showToast(err.error || '修改失败');
            }
        } catch { showToast('修改密码失败'); }
    });

    // 键盘 Esc
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            if (confirmOverlay.classList.contains('active')) closeConfirm();
            else if (passwordModalOverlay.classList.contains('active')) closePasswordModal();
            else if (modalOverlay.classList.contains('active')) closeModal(false);
        }
    });

    // 自动保存草稿（仅添加模式）
    const formInputs = document.querySelectorAll('#domainForm input, #domainForm textarea');
    formInputs.forEach(el => {
        el.addEventListener('input', () => {
            if (editId.value === '') saveDraft(collectFormData());
        });
    });

    // 启动
    loadDomains();
})();
