(function() {
    // ---------- 预设两个核心数组 (cfvpn 与 dns) ----------
    const cfVpnSites = [
        "https://cfvpn.yued75.cc.cd",
        "https://cfvpn.yued75.dpdns.org",
        "https://cfvpn.yued75.indevs.in"
    ];
    
    const dnsNodeSites = [
        "https://dns.yued75.cc.cd",
        "https://dns.yued75.dpdns.org",
        "https://dns.yued75.indevs.in"
    ];

    // 辅助函数: 安全拼接（处理末尾斜杠）
    function normalizeAndAppend(baseUrl, suffixPath) {
        let cleanBase = baseUrl.replace(/\/+$/, '');
        if (suffixPath.startsWith('/') || suffixPath.startsWith('?')) {
            return cleanBase + suffixPath;
        } else {
            return cleanBase + '/' + suffixPath;
        }
    }

    // 随机获取数组元素
    function getRandomItem(arr) {
        if (!arr.length) return null;
        return arr[Math.floor(Math.random() * arr.length)];
    }

    // ========= 悬浮提示 Toast 函数 =========
    const toastEl = document.getElementById('toastMessage');
    function showToast(message, duration = 3000) {
        if (!toastEl) return;
        toastEl.textContent = message;
        toastEl.classList.add('show');
        setTimeout(() => {
            toastEl.classList.remove('show');
        }, duration);
    }

    // ========= 网址有效性校验（与后端 Worker 逻辑一致） =========
    function isValidUrl(str) {
        let target = str.trim();
        if (target === '') return false;
        // 补全协议
        if (!target.startsWith('http://') && !target.startsWith('https://')) {
            target = 'https://' + target;
        }
        try {
            const url = new URL(target);
            const host = url.hostname;
            // 允许 localhost，或者主机名包含点号且不是纯数字（如 1、123）
            if (host === 'localhost') return true;
            if (host.includes('.')) {
                // 检查是否为纯数字（去掉点后全是数字）
                const withoutDots = host.replace(/\./g, '');
                if (/^\d+$/.test(withoutDots)) return false;
                return true;
            }
            return false;
        } catch (e) {
            return false;
        }
    }

    // 获取补全协议后的完整目标 URL（用于编码）
    function getFullTarget(raw) {
        let target = raw.trim();
        if (!target.startsWith('http://') && !target.startsWith('https://')) {
            target = 'https://' + target;
        }
        return target;
    }

    // ---------- // [NEW] 登录相关 API 配置 ----------
    const API_BASE_URLS = [
        'https://domainapi.yued75.cc.cd/api',
        'https://domainapi.yued75.dpdns.org/api',
        'https://domainapi.yued75.indevs.in/api'
    ];
    const STORAGE_KEY = 'domain_master_password';
    const TERMS_SESSION_KEY = 'proxygo_terms_accepted';

    let currentPassword = sessionStorage.getItem(STORAGE_KEY) || '';

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
                        'Content-Type': 'application/json',
                        ...(currentPassword ? { 'x-auth-password': currentPassword } : {}),
                        ...extraHeaders
                    }
                };
                if (body && method !== 'GET') fetchOpts.body = JSON.stringify(body);
                const res = await fetch(url, fetchOpts);
                return res;
            } catch (e) {
                lastError = e;
                continue;
            }
        }
        throw new Error('所有备用地址均无法访问');
    }

    async function login(password) {
        try {
            const res = await fetchWithFallback('/auth', { method: 'POST', body: { password } });
            if (res.ok) {
                const data = await res.json();
                return data.success === true;
            } else {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || '密码错误');
            }
        } catch (err) {
            throw new Error(err.message || '网络或服务器错误');
        }
    }
    // ---------- // [NEW] END ----------

    // ---------- 右上角「设置按钮」功能 ----------
    const settingsBtn = document.getElementById('settingsIconBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // // [NEW] 增加登录和声明检查
            const isLoggedIn = !!sessionStorage.getItem(STORAGE_KEY);
            const isTermsAccepted = sessionStorage.getItem(TERMS_SESSION_KEY) === 'true';
            if (!isLoggedIn) {
                showToast('请先登录', 2000);
                showLoginUI();
                return;
            }
            if (!isTermsAccepted) {
                showToast('请先阅读并同意使用声明', 2000);
                showTermsUI();
                return;
            }
            // // [NEW] END
            const randomCfSite = getRandomItem(cfVpnSites);
            if (!randomCfSite) {
                showToast('预设节点为空，请联系管理员');
                return;
            }
            const adminUrl = normalizeAndAppend(randomCfSite, '/admin');
            window.open(adminUrl, '_blank');
            console.log(`[设置] 随机CFVPN后台: ${adminUrl}`);
        });
    }

    // ---------- 「DNS 智能节点访问」按钮 ----------
    const dnsAccessBtn = document.getElementById('dnsAccessBtn');
    const inputEl = document.getElementById('targetUrl');
    
    if (dnsAccessBtn && inputEl) {
        dnsAccessBtn.addEventListener('click', () => {
            // // [NEW] 增加登录和声明检查
            const isLoggedIn = !!sessionStorage.getItem(STORAGE_KEY);
            const isTermsAccepted = sessionStorage.getItem(TERMS_SESSION_KEY) === 'true';
            if (!isLoggedIn) {
                showToast('请先登录', 2000);
                showLoginUI();
                return;
            }
            if (!isTermsAccepted) {
                showToast('请先阅读并同意使用声明', 2000);
                showTermsUI();
                return;
            }
            // // [NEW] END
            const rawTarget = inputEl.value.trim();
            if (!rawTarget) {
                showToast('请输入目标网址');
                return;
            }
            if (!isValidUrl(rawTarget)) {
                showToast('请输入有效的网址，例如 example.com 或 https://google.com');
                return;
            }
            
            const randomDnsNode = getRandomItem(dnsNodeSites);
            if (!randomDnsNode) {
                showToast('预设节点为空，请联系管理员');
                return;
            }
            
            // 使用补全协议后的完整网址进行编码
            const fullTarget = getFullTarget(rawTarget);
            const encodedTarget = encodeURIComponent(fullTarget);
            const fullDnsUrl = normalizeAndAppend(randomDnsNode, `?url=${encodedTarget}`);
            window.open(fullDnsUrl, '_blank');
            console.log(`[DNS访问] 选中节点: ${randomDnsNode} , 完整URL: ${fullDnsUrl}`);
        });
    }

    // 按回车键快速触发 DNS 访问
    if (inputEl && dnsAccessBtn) {
        inputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                dnsAccessBtn.click();
            }
        });
    }

    // ---------- // [NEW] 登录/声明 UI 控制 ----------
    const loginModal = document.getElementById('loginModal');
    const termsModal = document.getElementById('termsModal');
    const loginPasswordInput = document.getElementById('loginPassword');
    const loginBtn = document.getElementById('loginBtn');
    const loginErrorSpan = document.getElementById('loginError');
    const logoutBtn = document.getElementById('logoutBtn');
    const acceptTermsBtn = document.getElementById('acceptTermsBtn');

    function showMainUI() {
        if (loginModal) loginModal.style.display = 'none';
        if (termsModal) termsModal.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'flex';
    }

    function showLoginUI() {
        if (loginModal) loginModal.style.display = 'flex';
        if (termsModal) termsModal.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (loginPasswordInput) loginPasswordInput.value = '';
        if (loginErrorSpan) loginErrorSpan.innerText = '';
    }

    function showTermsUI() {
        if (loginModal) loginModal.style.display = 'none';
        if (termsModal) termsModal.style.display = 'flex';
        if (logoutBtn) logoutBtn.style.display = 'none';
    }

    function logout() {
        sessionStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(TERMS_SESSION_KEY);
        currentPassword = '';
        showTermsUI(); // 退出后重新弹出声明
        showToast('已退出登录');
    }

    function onTermsAccepted() {
        sessionStorage.setItem(TERMS_SESSION_KEY, 'true');
        if (sessionStorage.getItem(STORAGE_KEY)) {
            showMainUI();
        } else {
            showLoginUI();
        }
        showToast('感谢您的理解与配合，祝您使用愉快');
    }

    async function onLogin() {
        const pwd = loginPasswordInput.value.trim();
        if (!pwd) {
            loginErrorSpan.innerText = '请输入密码';
            return;
        }
        loginErrorSpan.innerText = '';
        loginBtn.disabled = true;
        loginBtn.innerText = '登录中...';
        try {
            const success = await login(pwd);
            if (success) {
                sessionStorage.setItem(STORAGE_KEY, pwd);
                currentPassword = pwd;
                // [FIX] 登录成功后直接标记声明已同意，不再重复弹出声明
                sessionStorage.setItem(TERMS_SESSION_KEY, 'true');
                showMainUI();
                // 可选：显示登录成功提示
                showToast('登录成功');
            } else {
                loginErrorSpan.innerText = '密码错误';
            }
        } catch (err) {
            loginErrorSpan.innerText = err.message;
        } finally {
            loginBtn.disabled = false;
            loginBtn.innerText = '登录';
        }
    }

    // 绑定事件
    if (acceptTermsBtn) acceptTermsBtn.addEventListener('click', onTermsAccepted);
    if (loginBtn) loginBtn.addEventListener('click', onLogin);
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    if (loginPasswordInput) {
        loginPasswordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') onLogin();
        });
    }

    // 页面初始化：未登录时先显示声明，已登录且已同意则直接主界面
    const isLoggedIn = !!sessionStorage.getItem(STORAGE_KEY);
    const isTermsAccepted = sessionStorage.getItem(TERMS_SESSION_KEY) === 'true';
    if (!isLoggedIn) {
        showTermsUI(); // 先声明
    } else {
        if (isTermsAccepted) {
            showMainUI();
        } else {
            showTermsUI();
        }
    }
    // ---------- // [NEW] END ----------
})();
