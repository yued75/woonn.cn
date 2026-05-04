// domain.js - 域名管理系统（统一错误处理、友好提示）
(function () {
    // ========== 配置 ==========
    const API_BASE_URLS = [
        'https://domainapi.yued75.cc.cd/api',
        'https://domainapi.yued75.dpdns.org/api',
        'https://domainapi.yued75.indevs.in/api'
    ];

    const STORAGE_KEY = 'domain_master_password';
    let currentPassword = sessionStorage.getItem(STORAGE_KEY) || '';

    // ========== 工具函数 ==========
    // 统一的 Toast 提示
    function showToast(msg, duration = 3000) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(() => toast.classList.remove('show'), duration);
    }

    // HTML 转义
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // 到期状态
    function getExpiryStatus(dateStr) {
        if (!dateStr) return { class: '', text: '' };
        const exp = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diff = Math.ceil((exp - today) / 86400000);
        if (diff < 0) return { class: 'expiry-danger', text: '已过期' };
        if (diff <= 30) return { class: 'expiry-warning', text: `${diff}天后到期` };
        return { class: '', text: '' };
    }

    // ========== 核心：带容灾的 fetch（改进错误处理） ==========
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
                if (body && method !== 'GET' && method !== 'DELETE') {
                    fetchOpts.body = JSON.stringify(body);
                }
                const res = await fetch(url, fetchOpts);
                // 只要成功建立连接就返回响应（让上层判断业务状态）
                return res;
            } catch (e) {
                lastError = e;
                // 网络错误，尝试下一个地址
                continue;
            }
        }
        throw new Error('所有备用地址均无法访问，请检查网络连接');
    }

    // 统一处理响应，提取错误信息
    async function handleResponse(res, successMsg, errorPrefix) {
        if (res.ok || res.status === 201 || res.status === 204) {
            if (successMsg) showToast(successMsg);
            return res;
        }
        let errorMsg = `${errorPrefix || '操作失败'}`;
        try {
            const errData = await res.json();
            if (errData.error) {
                errorMsg = errData.error;
            }
        } catch (e) {
            // 无法解析 JSON，使用状态码提示
            if (res.status === 401) errorMsg = '密码错误，请重新登录';
            else if (res.status === 403) errorMsg = '权限不足，请检查密码';
            else if (res.status === 404) errorMsg = '资源不存在';
            else if (res.status === 500) errorMsg = '服务器内部错误，请稍后重试';
            else errorMsg = `请求失败 (${res.status})`;
        }
        showToast(errorMsg);
        throw new Error(errorMsg);
    }

    // ========== 登录页面逻辑 ==========
    if (window.location.pathname.endsWith('login.html') || window.location.pathname === '/login.html') {
        const passwordInput = document.getElementById('passwordInput');
        const loginBtn = document.getElementById('loginBtn');
        const loginError = document.getElementById('loginError');

        async function handleLogin() {
            const pwd = passwordInput.value.trim();
            if (!pwd) {
                loginError.textContent = '请输入密码';
                return;
            }
            try {
                const res = await fetchWithFallback('/auth', {
                    method: 'POST',
                    body: { password: pwd },
                    headers: {}
                });
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
                    loginError.textContent = err.error || '服务器连接失败，请检查地址';
                }
            } catch (err) {
                loginError.textContent = '所有备用地址均无法访问，请检查网络';
            }
        }

        loginBtn.addEventListener('click', handleLogin);
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleLogin();
        });
        return;
    }

    // ========== 管理页面逻辑 ==========
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
    const changePasswordBtn = document.getElementById('changePasswordBtn');

    const modalOverlay = document.getElementById('modalOverlay');
    const modalTitle = document.getElementById('modalTitle');
    const domainForm = document.getElementById('domainForm');
    const editId = document.getElementById('editId');
    const providerInp = document.getElementById('provider');
    const providerUrlInp = document.getElementById('providerUrl');
    const providerAccountInp = document.getElementById('providerAccount');
    const providerPasswordInp = document.getElementById('providerPassword');
    const domainInp = document.getElementById('domain');
    const applyDateInp = document.getElementById('applyDate');
    const expireDateInp = document.getElementById('expireDate');
    const renewRuleInp = document.getElementById('renewRule');
    const purposeInp = document.getElementById('purpose');
    const remarkInp = document.getElementById('remark');
    const cancelBtn = document.getElementById('cancelBtn');
    const modalClose = document.getElementById('modalClose');

    const confirmOverlay = document.getElementById('confirmOverlay');
    const deleteDomainName = document.getElementById('deleteDomainName');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const confirmCancelBtn = document.getElementById('confirmCancelBtn');
    const confirmClose = document.getElementById('confirmClose');

    const passwordModalOverlay = document.getElementById('passwordModalOverlay');
    const oldPasswordInp = document.getElementById('oldPassword');
    const newPasswordInp = document.getElementById('newPassword');
    const passwordSubmitBtn = document.getElementById('passwordSubmitBtn');
    const passwordCancelBtn = document.getElementById('passwordCancelBtn');
    const passwordModalClose = document.getElementById('passwordModalClose');

    let domains = [];
    let deleteId = null;

    // 加载域名列表
    async function loadDomains() {
        try {
            tableBody.innerHTML = '<tr><td colspan="11" class="loading-text">加载中...</td></tr>';
            const res = await fetchWithFallback('/domains');
            if (res.ok) {
                domains = await res.json();
            } else {
                const err = await res.json().catch(() => ({}));
                showToast(err.error || '加载域名失败');
                domains = [];
            }
        } catch (e) {
            showToast('加载失败：' + e.message);
            domains = [];
        }
        renderTable(searchInput.value);
    }

    // 渲染表格
    function renderTable(filter) {
        const kw = (filter || '').trim().toLowerCase();
        const filtered = domains.filter(d =>
            !kw || [d.provider, d.domain, d.purpose, d.remark, d.provider_account].some(f =>
                (f || '').toLowerCase().includes(kw)
            )
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
                        <span class="masked-password" data-password="${escapeHtml(item.provider_password || '')}">${item.provider_password ? '******' : '-'}</span>
                        ${item.provider_password ? '<button class="password-toggle" data-action="toggle">查看</button>' : ''}
                    </td>
                    <td><strong>${escapeHtml(item.domain)}</strong></td>
                    <td>${item.apply_date || '-'}</td>
                    <td><span class="${status.class}">${item.expire_date || '-'}</span>${status.text ? ` <small>(${status.text})</small>` : ''}</td>
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
        const cell = btn.parentNode;
        const span = cell.querySelector('.masked-password');
        const pwd = span.dataset.password;
        if (span.textContent === '******') {
            span.textContent = pwd;
            btn.textContent = '隐藏';
        } else {
            span.textContent = '******';
            btn.textContent = '查看';
        }
    }

    // 搜索
    searchInput.addEventListener('input', () => {
        renderTable(searchInput.value);
        clearSearch.style.display = searchInput.value ? 'flex' : 'none';
    });
    clearSearch.addEventListener('click', () => {
        searchInput.value = '';
        renderTable('');
        clearSearch.style.display = 'none';
        searchInput.focus();
    });

    // 添加/编辑域名模态框
    addBtn.addEventListener('click', () => {
        modalTitle.textContent = '添加域名';
        domainForm.reset();
        editId.value = '';
        applyDateInp.value = new Date().toISOString().split('T')[0];
        modalOverlay.classList.add('active');
    });

    function editDomain(id) {
        const item = domains.find(d => d.id === id);
        if (!item) return;
        modalTitle.textContent = '编辑域名';
        editId.value = item.id;
        providerInp.value = item.provider || '';
        providerUrlInp.value = item.provider_url || '';
        providerAccountInp.value = item.provider_account || '';
        providerPasswordInp.value = item.provider_password || '';
        domainInp.value = item.domain || '';
        applyDateInp.value = item.apply_date || '';
        expireDateInp.value = item.expire_date || '';
        renewRuleInp.value = item.renew_rule || '';
        purposeInp.value = item.purpose || '';
        remarkInp.value = item.remark || '';
        modalOverlay.classList.add('active');
    }

    function closeModal() {
        modalOverlay.classList.remove('active');
        domainForm.reset();
        editId.value = '';
    }
    cancelBtn.addEventListener('click', closeModal);
    modalClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });

    // 提交添加/编辑
    domainForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const provider = providerInp.value.trim();
        const domain = domainInp.value.trim();
        const expireDate = expireDateInp.value;
        if (!provider || !domain || !expireDate) {
            showToast('服务商、域名和到期时间不能为空');
            return;
        }
        const data = {
            provider,
            providerUrl: providerUrlInp.value.trim(),
            providerAccount: providerAccountInp.value.trim(),
            providerPassword: providerPasswordInp.value.trim(),
            domain,
            applyDate: applyDateInp.value,
            expireDate,
            renewRule: renewRuleInp.value.trim(),
            purpose: purposeInp.value.trim(),
            remark: remarkInp.value.trim()
        };
        try {
            let res;
            if (editId.value) {
                res = await fetchWithFallback(`/domains/${editId.value}`, { method: 'PUT', body: data });
                await handleResponse(res, '域名更新成功', '更新失败');
            } else {
                data.id = crypto.randomUUID();
                res = await fetchWithFallback('/domains', { method: 'POST', body: data });
                await handleResponse(res, '域名添加成功', '添加失败');
            }
            closeModal();
            loadDomains();
        } catch (err) {
            // 错误已在 handleResponse 中提示，无需重复
        }
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
            const res = await fetchWithFallback(`/domains/${deleteId}`, { method: 'DELETE' });
            await handleResponse(res, '域名已删除', '删除失败');
            closeConfirm();
            loadDomains();
        } catch (err) { }
    });

    // 修改密码
    changePasswordBtn.addEventListener('click', () => {
        oldPasswordInp.value = '';
        newPasswordInp.value = '';
        passwordModalOverlay.classList.add('active');
    });

    function closePasswordModal() { passwordModalOverlay.classList.remove('active'); }
    passwordCancelBtn.addEventListener('click', closePasswordModal);
    passwordModalClose.addEventListener('click', closePasswordModal);
    passwordModalOverlay.addEventListener('click', e => { if (e.target === passwordModalOverlay) closePasswordModal(); });

    passwordSubmitBtn.addEventListener('click', async () => {
        const oldPwd = oldPasswordInp.value;
        const newPwd = newPasswordInp.value;
        if (!oldPwd || !newPwd) {
            showToast('旧密码和新密码不能为空');
            return;
        }
        try {
            const res = await fetchWithFallback('/password', {
                method: 'PUT',
                body: { oldPassword: oldPwd, newPassword: newPwd }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    sessionStorage.setItem(STORAGE_KEY, newPwd);
                    currentPassword = newPwd;
                    showToast('密码修改成功');
                    closePasswordModal();
                } else {
                    showToast(data.error || '修改失败');
                }
            } else {
                const err = await res.json().catch(() => ({}));
                showToast(err.error || '修改密码失败');
            }
        } catch (err) {
            showToast('修改密码失败：' + err.message);
        }
    });

    // 键盘 Esc
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (confirmOverlay.classList.contains('active')) closeConfirm();
            else if (passwordModalOverlay.classList.contains('active')) closePasswordModal();
            else if (modalOverlay.classList.contains('active')) closeModal();
        }
    });

    // 启动
    loadDomains();
})();
