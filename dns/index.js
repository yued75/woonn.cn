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

    // ---------- 右上角「设置按钮」功能 ----------
    const settingsBtn = document.getElementById('settingsIconBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
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
})();
