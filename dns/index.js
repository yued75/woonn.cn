(function() {
    // ---------- 预设两个核心数组 (cfvpn 与 dns) ----------
    // ① CFVPN 数组 —— 用于设置按钮随机 + '/admin'
    const cfVpnSites = [
        "https://cfvpn.yued75.cc.cd",
        "https://cfvpn.yued75.dpdns.org",
        "https://cfvpn.yued75.indevs.in"
    ];
    
    // ② DNS 节点数组 (三个预设地址，点击「DNS智能节点访问」后 随机选择一个并在其后拼接 ?url=输入框的值)
    const dnsNodeSites = [
        "https://dns.yued75.cc.cd",
        "https://dns.yued75.dpdns.org",
        "https://dns.yued75.indevs.in"
    ];

    // 辅助函数: 安全拼接末尾斜杠处理 并追加路径/参数
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

    // ---------- 右上角「设置按钮」功能：随机 cfvpn 网址 + '/admin' 在新标签打开 ----------
    const settingsBtn = document.getElementById('settingsIconBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const randomCfSite = getRandomItem(cfVpnSites);
            if (!randomCfSite) {
                alert('预设节点为空，请联系管理员');
                return;
            }
            const adminUrl = normalizeAndAppend(randomCfSite, '/admin');
            window.open(adminUrl, '_blank');
            console.log(`[设置] 随机CFVPN后台: ${adminUrl}`);
        });
    }

    // ---------- 「DNS 智能节点访问」按钮：随机从 dnsNodeSites 选一个，后面加 ?url=输入框的值 ----------
    const dnsAccessBtn = document.getElementById('dnsAccessBtn');
    const inputEl = document.getElementById('targetUrl');
    
    if (dnsAccessBtn) {
        dnsAccessBtn.addEventListener('click', () => {
            let rawTarget = inputEl.value.trim();
            if (!rawTarget) {
                alert('请输入被访问的网址！');
                return;
            }
            
            const randomDnsNode = getRandomItem(dnsNodeSites);
            if (!randomDnsNode) {
                alert('预设节点为空，请联系管理员');
                return;
            }
            
            const encodedTarget = encodeURIComponent(rawTarget);
            const fullDnsUrl = normalizeAndAppend(randomDnsNode, `?url=${encodedTarget}`);
            window.open(fullDnsUrl, '_blank');
            console.log(`[DNS访问] 选中节点: ${randomDnsNode} , 完整URL: ${fullDnsUrl}`);
        });
    }

    // 按回车键快速触发 DNS 访问（提升易用性，但不影响核心逻辑）
    if (inputEl) {
        inputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && dnsAccessBtn) {
                dnsAccessBtn.click();
            }
        });
    }
})();
