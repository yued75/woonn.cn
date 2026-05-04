/**
 * 无感跳转检测脚本
 * 按顺序检测三个备用URL，首个可用即跳转，全部失败则显示友好提示
 */
(function () {
    'use strict';

    // ==================== 配置 ====================
    const TARGET_URLS = [
        'https://cfvpn.yued75.cc.cd',
        'https://cfvpn.yued75.dpdns.org',
        'https://cfvpn.yued75.indevs.in'
    ];

    // 单个URL检测超时时间（毫秒）
    const CHECK_TIMEOUT = 4000;

    // 显示"检测时间较长"提示的阈值（毫秒）
    const LONG_CHECK_THRESHOLD = 5000;

    // ==================== DOM 元素 ====================
    const statusContainer = document.getElementById('statusContainer');
    const fallbackContainer = document.getElementById('fallbackContainer');
    const timeoutNotice = document.getElementById('timeoutNotice');
    const retryBtn = document.getElementById('retryBtn');

    // ==================== 状态变量 ====================
    let isChecking = false;
    let longCheckTimer = null;
    let currentAbortController = null;

    // ==================== 工具函数 ====================
    /**
     * 带超时的fetch检测（no-cors模式）
     * @param {string} url - 要检测的URL
     * @param {number} timeout - 超时时间（毫秒）
     * @returns {Promise<boolean>} 是否可达
     */
    async function checkUrlAvailability(url, timeout) {
        const controller = new AbortController();
        const timeoutId = setTimeout(function () {
            controller.abort();
        }, timeout);

        try {
            await fetch(url, {
                mode: 'no-cors',
                signal: controller.signal,
                // 不发送凭据，仅检测连通性
                credentials: 'omit',
                // 使用HEAD类似的效果，但no-cors下只能用GET
                method: 'GET',
                // 避免缓存干扰检测
                cache: 'no-store'
            });
            clearTimeout(timeoutId);
            // no-cors模式下fetch resolve即表示TCP/TLS连接成功
            return true;
        } catch (error) {
            clearTimeout(timeoutId);
            // AbortError（超时）或其他网络错误均视为不可达
            if (error.name === 'AbortError') {
                console.warn('[跳转检测] 检测超时:', url);
            } else {
                console.warn('[跳转检测] 网络错误:', url, error.message);
            }
            return false;
        }
    }

    /**
     * 执行跳转（使用replace避免留下历史记录）
     * @param {string} url
     */
    function performRedirect(url) {
        // 使用 replace 确保用户无法通过后退按钮回到此页面
        window.location.replace(url);
    }

    /**
     * 显示失败提示
     */
    function showFallback() {
        // 隐藏加载指示器
        if (statusContainer) {
            statusContainer.style.opacity = '0';
            statusContainer.style.transform = 'translateY(-10px)';
            // 动画结束后隐藏，显示失败卡片
            setTimeout(function () {
                statusContainer.style.display = 'none';
                if (fallbackContainer) {
                    fallbackContainer.style.display = 'flex';
                }
            }, 400);
        } else {
            if (fallbackContainer) {
                fallbackContainer.style.display = 'flex';
            }
        }

        // 隐藏超时提示
        if (timeoutNotice) {
            timeoutNotice.style.display = 'none';
        }

        // 更新页面标题
        document.title = '连接失败 - 请重试';

        // 清除超时提示定时器
        if (longCheckTimer) {
            clearTimeout(longCheckTimer);
            longCheckTimer = null;
        }
    }

    /**
     * 隐藏加载指示器，显示失败（无动画版本，用于快速失败）
     */
    function showFallbackImmediate() {
        if (statusContainer) {
            statusContainer.style.display = 'none';
        }
        if (fallbackContainer) {
            fallbackContainer.style.display = 'flex';
        }
        if (timeoutNotice) {
            timeoutNotice.style.display = 'none';
        }
        document.title = '连接失败 - 请重试';
        if (longCheckTimer) {
            clearTimeout(longCheckTimer);
            longCheckTimer = null;
        }
    }

    /**
     * 显示超时提醒
     */
    function showLongCheckNotice() {
        if (timeoutNotice) {
            timeoutNotice.style.display = 'block';
        }
    }

    /**
     * 重置UI到初始检测状态
     */
    function resetUI() {
        // 隐藏失败提示
        if (fallbackContainer) {
            fallbackContainer.style.display = 'none';
        }
        // 隐藏超时提示
        if (timeoutNotice) {
            timeoutNotice.style.display = 'none';
        }
        // 显示加载指示器
        if (statusContainer) {
            statusContainer.style.display = 'flex';
            statusContainer.style.opacity = '1';
            statusContainer.style.transform = 'translateY(0)';
        }
        // 恢复标题
        document.title = '连接中...';
        // 清除定时器
        if (longCheckTimer) {
            clearTimeout(longCheckTimer);
            longCheckTimer = null;
        }
        // 重置重试按钮状态
        if (retryBtn) {
            retryBtn.classList.remove('is-loading');
            retryBtn.disabled = false;
        }
    }

    // ==================== 核心检测逻辑 ====================
    /**
     * 按顺序检测所有URL，首个可用即跳转
     */
    async function tryAllUrls() {
        if (isChecking) {
            return;
        }

        isChecking = true;

        // 设置超时提醒定时器
        longCheckTimer = setTimeout(function () {
            showLongCheckNotice();
        }, LONG_CHECK_THRESHOLD);

        let allFailed = true;

        for (var i = 0; i < TARGET_URLS.length; i++) {
            var url = TARGET_URLS[i];
            console.log('[跳转检测] 正在检测:', url);

            var isAvailable = await checkUrlAvailability(url, CHECK_TIMEOUT);

            if (isAvailable) {
                console.log('[跳转检测] 检测成功，即将跳转:', url);
                allFailed = false;
                // 清除超时提示
                if (longCheckTimer) {
                    clearTimeout(longCheckTimer);
                    longCheckTimer = null;
                }
                if (timeoutNotice) {
                    timeoutNotice.style.display = 'none';
                }
                // 执行跳转
                performRedirect(url);
                // 跳转后不再执行后续代码
                isChecking = false;
                return;
            }

            console.log('[跳转检测] 检测失败，尝试下一个:', url);
        }

        // 所有URL均失败
        isChecking = false;
        if (longCheckTimer) {
            clearTimeout(longCheckTimer);
            longCheckTimer = null;
        }

        if (allFailed) {
            console.warn('[跳转检测] 所有URL均不可达，显示友好提示');
            showFallback();
        }
    }

    // ==================== 事件处理 ====================
    /**
     * 重试按钮点击处理
     */
    function handleRetry() {
        if (isChecking) {
            return;
        }

        // 更新按钮状态
        if (retryBtn) {
            retryBtn.classList.add('is-loading');
            retryBtn.disabled = true;
        }

        // 重置UI
        resetUI();

        // 短暂延迟后开始检测（让用户看到加载状态恢复）
        setTimeout(function () {
            if (retryBtn) {
                retryBtn.classList.remove('is-loading');
                retryBtn.disabled = false;
            }
        }, 600);

        // 开始检测
        tryAllUrls();
    }

    // ==================== 初始化 ====================
    function init() {
        // 绑定重试按钮事件
        if (retryBtn) {
            retryBtn.addEventListener('click', handleRetry);
        }

        // 页面加载后立即开始检测
        // 使用微小的延迟确保DOM完全渲染
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () {
                // 再给一个微小延迟让浏览器完成初始渲染
                setTimeout(tryAllUrls, 150);
            });
        } else {
            setTimeout(tryAllUrls, 150);
        }
    }

    // 启动
    init();

})();
