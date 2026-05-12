// ==================== 全局变量 ====================
let currentRow = null;
let zeroRowDistance = 0;
let lastDataRowDistance = 0;
let currentUserInfo = null;
let currentUsername = null;
// 会话超时时间（12小时）
const SESSION_TIMEOUT = 720 * 60 * 1000;
let isRestoring = false;       // 恢复数据标志，防止保存/联动
let saveTimeout;               // 防抖定时器

// Supabase 初始化及日志记录辅助函数
const SUPABASE_URL = 'https://khertrygeuybdfpurnjd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoZXJ0cnlnZXV5YmRmcHVybmpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNTU1NDQsImV4cCI6MjA5MjgzMTU0NH0.t480oRiCKjIQ6fAEj-tfSy3QW6M6DZJlsEym66xw4Yg';
let sb;
try {
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (e) {
    console.error('Supabase 初始化失败：', e);
    sb = null;
}

/**
 * 记录用户操作日志
 * @param {string} action 操作类型：'login_failed','login','logout','generate','copy','export'
 * @param {object} options 可选字段：username, details, pipeName, pipeLength
 */
async function logUserAction(action, options = {}) {
    if (!sb) return;
    const username = options.username || currentUsername || 'unknown';
    const { details = '', pipeName = '', pipeLength = null } = options;
    try {
        const { error } = await sb.from('user_actions').insert({
            username: username,
            action: action,
            details: details,
            pipe_name: pipeName,
            pipe_length: pipeLength,
            action_time: new Date().toISOString()
        });
        if (error) console.error('日志记录失败：', error);
    } catch (e) {
        console.error('日志记录异常：', e);
    }
}

// ==================== 文件保存与XLSX轻量实现 ====================
!function (t, e) { "object" == typeof exports && "undefined" != typeof module ? module.exports = e() : "function" == typeof define && define.amd ? define(e) : (t = "undefined" != typeof globalThis ? globalThis : t || self).saveAs = e() }(this, function () { "use strict"; function n(e, n, r) { if (!n) throw new Error("文件名不能为空"); r = r || {}; var o = e instanceof Blob; if ("string" == typeof e && /^data:/.test(e)) { var i = atob(e.split(",")[1]), a = new Uint8Array(i.length); for (var s = 0; s < i.length; s++)a[s] = i.charCodeAt(s); e = new Blob([a], { type: e.split(":")[1].split(";")[0] }) } return (o ? Promise.resolve(e) : fetch(e).then(function (t) { if (!t.ok) throw new Error(t.status); return t.blob() })).then(function (t) { var l = document.createElement("a"); l.href = URL.createObjectURL(t); l.download = n; l.style.display = "none"; document.body.appendChild(l); l.click(); setTimeout(function () { document.body.removeChild(l); URL.revokeObjectURL(l.href) }, 100) })["catch"](function (e) { console.error(e) }) } return n });

window.XLSX = {
    utils: {
        decode_cell: ref => { var c = 0, r = 0, i = 0; for (; i < ref.length; i++) { var ch = ref.charCodeAt(i); if (ch >= 65 && ch <= 90) c = c * 26 + ch - 65 + 1; else break } r = parseInt(ref.slice(i)) - 1; return { c: c - 1, r: r } },
        encode_cell: cell => { var col = cell.c, row = cell.r + 1, s = ""; while (col >= 0) { s = String.fromCharCode(65 + col % 26) + s; col = Math.floor(col / 26) - 1 } return s + row },
        decode_range: ref => { var p = ref.split(":"); return { s: XLSX.utils.decode_cell(p[0]), e: XLSX.utils.decode_cell(p[1]) } },
        encode_range: r => XLSX.utils.encode_cell(r.s) + ":" + XLSX.utils.encode_cell(r.e),
        table_to_sheet: (table) => { var s = {}, r = { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } }; var tr = table.querySelectorAll("tr"); for (var R = 0; R < tr.length; R++) { var td = tr[R].querySelectorAll("td,th"); for (var C = 0; C < td.length; C++) { var v = ""; var inp = td[C].querySelector("input,textarea"); if (inp) v = inp.value || ""; else v = td[C].textContent || ""; v = v.replace(/\r?\n/g, ""); var cr = XLSX.utils.encode_cell({ r: R, c: C }); s[cr] = { v: v, t: "s" }; if (r.s.r > R) r.s.r = R; if (r.s.c > C) r.s.c = C; if (r.e.r < R) r.e.r = R; if (r.e.c < C) r.e.c = C } } s["!ref"] = XLSX.utils.encode_range(r); return s },
        book_new: () => ({ SheetNames: [], Sheets: {} }),
        book_append_sheet: (b, s, n) => { b.SheetNames.push(n); b.Sheets[n] = s }
    },
    writeFile: (wb, fn) => { var sn = wb.SheetNames[0], s = wb.Sheets[sn], r = XLSX.utils.decode_range(s["!ref"]); var c = ""; for (var R = r.s.r; R <= r.e.r; R++) { var row = []; for (var C = r.s.c; C <= r.e.c; C++) { var cr = XLSX.utils.encode_cell({ r: R, c: C }); var v = s[cr] ? s[cr].v : ""; row.push(v) } c += row.join("\t") + "\r\n" } var blob = new Blob([c], { type: "application/vnd.ms-excel;charset=utf-8" }); saveAs(blob, fn || "检测数据.xlsx") }
};

// ==================== 格式化北京时间 ====================
function formatBeijingTime(ms) {
    const date = new Date(ms);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// ==================== 获取北京时间（多源回退） ====================
async function getBeijingTime() {
    try { const ts = await fetchOwnServerTimeViaHead(); if (ts !== null) return { timestamp: ts, source: 'server' }; } catch (e) { }
    try { const ts = await fetchSuning(); if (ts !== null) return { timestamp: ts, source: 'suning' }; } catch (e) { }
    try { const ts = await fetchTimeapiIO(); if (ts !== null) return { timestamp: ts, source: 'timeapi' }; } catch (e) { }
    return { timestamp: Date.now(), source: 'local' };
}

async function fetchOwnServerTimeViaHead() {
    const res = await fetch(location.href + '?t=' + Date.now(), { method: 'HEAD', cache: 'no-store' });
    if (!res.ok) return null;
    const dateHeader = res.headers.get('Date');
    if (!dateHeader) return null;
    return new Date(dateHeader).getTime();
}

async function fetchSuning() {
    const res = await fetch('http://quan.suning.com/getSysTime.do');
    if (!res.ok) return null;
    const data = await res.json();
    return data.sysTime2 ? new Date(data.sysTime2).getTime() : null;
}

async function fetchTimeapiIO() {
    const res = await fetch('https://timeapi.io/api/timezone/zone?timeZone=UTC');
    if (!res.ok) return null;
    const data = await res.json();
    return data.currentLocalTime ? new Date(data.currentLocalTime).getTime() + 8 * 60 * 60 * 1000 : null;
}

// ==================== 登录验证模块（统一使用 UTC 时间比较） ====================
async function checkUserAuth(username) {
    try {
        const [resp, timeResult] = await Promise.all([
            fetch('https://woonn.cn/pcm/auth-config.json'),
            getBeijingTime()
        ]);
        if (!resp.ok) {
            logUserAction('login_failed', { details: '网络请求失败', username });
            return { status: 'error', msg: '网络请求失败' };
        }
        const authData = await resp.json();
        if (!authData[username]) {
            logUserAction('login_failed', { details: '未给该用户授权', username });
            return { status: 'error', msg: '未给该用户授权，请核对' };
        }
        const userInfo = authData[username];
        if (!userInfo.enabled) {
            logUserAction('login_failed', { details: '该用户已被禁用', username });
            return { status: 'error', msg: '该用户已被禁用' };
        }

        const { timestamp: beijingTimestamp, source } = timeResult;
        const beijingTimeStr = formatBeijingTime(beijingTimestamp);
        if (beijingTimestamp > new Date(userInfo.expire).getTime()) {
            logUserAction('login_failed', { details: '授权已过期（有效期至：' + userInfo.expire + '）', username });
            return { status: 'error', msg: '该用户授权已过期（有效期至：' + userInfo.expire + '）' };
        }
        currentUserInfo = userInfo;
        currentUsername = username;
        saveLoginState(username, userInfo);
        logUserAction('login', { details: '来源：' + source });
        return { status: 'success', source, timeStr: beijingTimeStr };
    } catch (error) {
        logUserAction('login_failed', { details: '系统网络服务异常', username });
        return { status: 'error', msg: '系统网络服务异常，请联系管理员' };
    }
}

// ==================== 本地存储与状态恢复 ====================
function saveLoginState(username, userInfo) {
    const state = {
        username: username,
        expire: userInfo.expire,
        type: userInfo.type || 'user',
        expireTimeUTC: new Date(userInfo.expire).getTime() - (8 * 60 * 60 * 1000),
        ts: Date.now()
    };
    localStorage.setItem('pcmLoginState', JSON.stringify(state));
}

function clearLoginState() {
    localStorage.removeItem('pcmLoginState');
    currentUserInfo = null;
    currentUsername = null;
}

function loadLoginState() {
    const stateStr = localStorage.getItem('pcmLoginState');
    if (!stateStr) return null;
    try {
        const state = JSON.parse(stateStr);
        if (state.ts && (Date.now() - state.ts) <= SESSION_TIMEOUT) {
            return { username: state.username, type: state.type, expire: state.expire };
        } else {
            localStorage.removeItem('pcmLoginState');
            return null;
        }
    } catch (e) {
        localStorage.removeItem('pcmLoginState');
        return null;
    }
}

function bindLoginEvent() {
    const loginBtn = document.getElementById('loginBtn');
    const loginUsername = document.getElementById('loginUsername');
    const loginTip = document.getElementById('loginTip');
    loginBtn.onclick = async function () {
        const username = loginUsername.value.trim();
        if (!username) {
            loginTip.textContent = '请输入身份识别凭证';
            loginTip.style.display = 'block';
            setTimeout(() => loginTip.style.display = 'none', 2000);
            return;
        }
        loginBtn.disabled = true;
        loginBtn.textContent = '验证中请稍等...';
        loginTip.textContent = '';
        const result = await checkUserAuth(username);
        loginBtn.disabled = false;
        loginBtn.textContent = '验证并进入系统';
        if (result.status === 'success') {
            sessionStorage.setItem('pageOpened', '1');
            document.getElementById('loginPage').style.display = 'none';
            document.getElementById('systemMain').style.display = 'flex';
            updateUserInfoDisplay();
            initSystemEvents();
            const sourceMap = { 'server': '服务器时间', 'suning': '苏宁服务器时间', 'timeapi': 'TimeAPI.io时间', 'local': '本地时间' };
            showTip(`${sourceMap[result.source] || '未知'}：${result.timeStr}`, false);
        } else {
            loginTip.textContent = result.msg;
            loginTip.style.display = 'block';
            setTimeout(() => loginTip.style.display = 'none', 8000);
        }
    };
    loginUsername.onkeydown = e => { if (e.key === 'Enter') loginBtn.click(); };
}

function updateUserInfoDisplay() {
    const displayUsername = document.getElementById('displayUsername');
    const displayExpire = document.getElementById('displayExpire');
    const adminLink = document.getElementById('adminLink');
    if (currentUserInfo) {
        displayUsername.textContent = '用户：' + (currentUsername || '');
        displayExpire.textContent = '到期：' + (currentUserInfo.expire || '');
        if (currentUserInfo.type === 'admin') {
            adminLink.style.display = 'inline';
        } else {
            adminLink.style.display = 'none';
        }
    } else {
        displayUsername.textContent = '';
        displayExpire.textContent = '';
        adminLink.style.display = 'none';
    }
}

function bindLogoutEvent() {
    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
        logoutLink.onclick = async function () {
            logUserAction('logout');
            clearLoginState();
            // 清除保存的数据和标记
            localStorage.removeItem('pcmSavedData');
            sessionStorage.removeItem('pageOpened');
            
            // 清空表格 DOM
            const tbody = document.querySelector('#dataTable tbody');
            if (tbody) tbody.innerHTML = '';
            // 重置统计提示
            const tip = document.querySelector('.preview-tip');
            if (tip) tip.innerHTML = '使用说明：序号不可编辑，其余均可编辑。更改电流列数据会导致后续电流同步更改。右键可插入/删除行。';

            // 清空左侧所有输入框和文本域
            document.querySelectorAll('#systemMain .input-area input, #systemMain .input-area textarea').forEach(el => {
                el.value = '';
            });

            // 切换界面
            document.getElementById('loginPage').style.display = 'flex';
            document.getElementById('systemMain').style.display = 'none';
            document.getElementById('loginUsername').value = '';
            document.getElementById('loginTip').style.display = 'none';
        };
    }
}

// ==================== 系统事件绑定 ====================
function initSystemEvents() {
    document.getElementById("generateBtn").onclick = generateBaseData;
    document.getElementById("copyToExcelBtn").onclick = copyToExcel;
    document.getElementById("exportExcelBtn").onclick = exportToExcel;
    bindContextMenu();
    document.getElementById("insertBefore").onclick = () => { insertRow(currentRow, "before"); document.getElementById("contextMenu").style.display = "none"; };
    document.getElementById("insertAfter").onclick = () => { insertRow(currentRow, "after"); document.getElementById("contextMenu").style.display = "none"; };
    document.getElementById("deleteRow").onclick = deleteCurrentRow;

    bindTableEvents();

    document.querySelectorAll('.input-area input, .input-area textarea').forEach(el => {
        el.addEventListener('input', debounceSaveAndStats);
    });
}

// ==================== 禁用右键和F12 ====================
function preventDevTools() {
    document.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        return false;
    });

    document.addEventListener('keydown', function (e) {
        if (e.keyCode === 123) {
            e.preventDefault();
            return false;
        }
        if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
            e.preventDefault();
            return false;
        }
        if (e.ctrlKey && e.shiftKey && e.keyCode === 74) {
            e.preventDefault();
            return false;
        }
        if (e.ctrlKey && e.keyCode === 85) {
            e.preventDefault();
            return false;
        }
        if (e.ctrlKey && e.keyCode === 83) {
            e.preventDefault();
            return false;
        }
    });
}

// ==================== 辅助函数 ====================
function getFileNameTime() {
    const d = new Date();
    return d.getFullYear().toString() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0") + String(d.getHours()).padStart(2, "0") + String(d.getMinutes()).padStart(2, "0");
}

function getExportFileName() {
    const ps = document.getElementById("pipeStart").value.trim();
    const pe = document.getElementById("pipeEnd").value.trim();
    return (ps && pe) ? `${ps}至${pe}检测数据.xls` : `检测数据_${getFileNameTime()}.xls`;
}

function parseSpecialPoints() {
    const input = document.getElementById("specialPoints").value.trim();
    if (!input) return [];
    const points = [];
    input.split(/[ ,，]+/).forEach(item => {
        const [dStr, label] = item.split(/[:：]/);
        const d = parseInt(dStr);
        if (!isNaN(d) && d > 0) points.push({ d, l: label || "" });
    });
    return points.sort((a, b) => a.d - b.d);
}

function enforceNonZeroLastDecimal(value) {
    let fixed = parseFloat(value).toFixed(2);
    if (fixed.charAt(fixed.length - 1) === '0') {
        fixed = fixed.slice(0, -1) + '1';
    }
    return fixed;
}

function generateBurialValue(min, max) {
    let val, fixed;
    do {
        val = min + Math.random() * (max - min);
        fixed = val.toFixed(2);
    } while (fixed.charAt(fixed.length - 1) === '0');
    return fixed;
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ==================== 核心：生成表格数据 ====================
function generateBaseData() {
    const outCur = parseInt(document.getElementById("outputCurrent").value) || 300;
    const totalDist = parseInt(document.getElementById("totalDistance").value);
    let maxVal = parseInt(document.getElementById("data1Max").value) || null;
    let minVal = parseInt(document.getElementById("data1Min").value) || null;
    const burialMax = parseFloat(document.getElementById("burialMax").value) || null;
    const burialMin = parseFloat(document.getElementById("burialMin").value) || null;
    const pipeStart = document.getElementById("pipeStart").value.trim();
    const pipeEnd = document.getElementById("pipeEnd").value.trim();
    const terrain = document.getElementById("defaultTerrain").value.trim() || "绿化带";

    const errs = [];
    if (!totalDist || totalDist <= 0) errs.push("不填管段长度我怎么帮你生成？");
    if (maxVal !== null && minVal !== null && maxVal < minVal) errs.push("最大电流还比最小电流小？");
    if (maxVal !== null && maxVal > outCur) errs.push("最大电流比输出电流还大？");
    if (minVal !== null && minVal < 0) errs.push("最小电流都小于0了，你还测个毛");
    if (burialMax !== null && burialMin !== null && burialMax < burialMin) errs.push("最大埋深比最小埋深还大？");
    if (burialMin !== null && burialMin <= 0) errs.push("你怎么测出最小埋深小于0的？");
    if (errs.length) { showTip(errs.join("<br/>"), true); return; }

    if (maxVal === null) maxVal = Math.round(outCur * (0.8 + Math.random() * 0.1));
    if (minVal === null) minVal = getRandomInt(15, 30);
    if (maxVal < minVal) { minVal = Math.round(maxVal * 0.2); showTip(`最小电流异常，已自动修正最小值: ${minVal}`, false); }

    let bMax = burialMax, bMin = burialMin;
    if (bMax === null && bMin === null) { bMax = 0.8; bMin = 0.6; }
    else if (bMax !== null && bMin === null) bMin = parseFloat((bMax * 0.8).toFixed(2));
    else if (bMax === null && bMin !== null) bMax = parseFloat((bMin * 1.2).toFixed(2));

    const specials = parseSpecialPoints();
    let distSet = new Set([0, totalDist]);
    for (let d = 20; d < totalDist; d += 20) distSet.add(d);
    specials.forEach(sp => distSet.add(sp.d));
    const distances = Array.from(distSet).sort((a, b) => a - b);
    const valid20Distances = distances.filter(d => d > 0 && d < totalDist && d % 20 === 0);

    let data1Map = {};
    let prevEffective = maxVal;

    valid20Distances.forEach((d, idx) => {
        let newVal;
        if (idx === 0) {
            newVal = maxVal;
        } else {
            const remaining = valid20Distances.length - idx;
            const step = (prevEffective - minVal) / remaining;
            newVal = prevEffective - step;
            newVal += newVal * (Math.random() * 0.04 - 0.02);
            if (idx === valid20Distances.length - 1) newVal = minVal;
            else newVal = Math.max(newVal, minVal);
        }
        newVal = Math.round(newVal);
        data1Map[d] = newVal;
        prevEffective = newVal;
    });

    let depthValues = [];
    const validCount = valid20Distances.length;
    if (validCount > 0) {
        const maxIndex = Math.floor(Math.random() * validCount);
        let minIndex = Math.floor(Math.random() * validCount);
        while (minIndex === maxIndex && validCount > 1) {
            minIndex = Math.floor(Math.random() * validCount);
        }
        for (let i = 0; i < validCount; i++) {
            if (i === maxIndex) {
                depthValues.push(enforceNonZeroLastDecimal(bMax));
            } else if (i === minIndex) {
                depthValues.push(enforceNonZeroLastDecimal(bMin));
            } else {
                depthValues.push(generateBurialValue(bMin, bMax));
            }
        }
    }

    const tbody = document.querySelector("#dataTable tbody");
    tbody.innerHTML = "";
    distances.forEach((d, idx) => {
        const tr = document.createElement("tr");
        const is0 = d === 0, isLast = d === totalDist;
        const isValid20 = d > 0 && d < totalDist && d % 20 === 0;
        const sp = specials.find(x => x.d === d);
        let desc = sp ? sp.l : "";
        if (is0) desc = `检测起点-${pipeStart || desc}`;
        if (isLast) desc = `检测终点-${pipeEnd || desc}`;

        const td1 = document.createElement("td"); td1.textContent = idx + 1; tr.appendChild(td1);
        const td2 = document.createElement("td"); td2.innerHTML = `<input type="number" value="${d}">`; tr.appendChild(td2);
        const td3 = document.createElement("td");
        const data1Val = isValid20 ? data1Map[d] : "";
        td3.innerHTML = `<input type="number" class="data1-input" data-distance="${d}" value="${data1Val}" onchange="onData1Change(this)">`;
        tr.appendChild(td3);
        const td4 = document.createElement("td");
        td4.innerHTML = `<input type="text" class="terrain-input" data-distance="${d}" value="${isValid20 ? terrain : ''}" onchange="onTerrainChange(this)">`;
        tr.appendChild(td4);
        let depthVal = '';
        if (isValid20) {
            const depthIdx = valid20Distances.indexOf(d);
            depthVal = depthValues[depthIdx] || '';
        }
        const td5 = document.createElement("td");
        td5.innerHTML = `<input type="number" step="0.01" value="${depthVal}" onchange="onBurialChange(this)">`;
        tr.appendChild(td5);
        const td6 = document.createElement("td"); td6.className = "defectno-cell"; td6.textContent = ""; tr.appendChild(td6);
        const td7 = document.createElement("td"); td7.innerHTML = `<input type="text" class="db-input" value="" data-old-value="">`; tr.appendChild(td7);
        const td8 = document.createElement("td"); td8.className = "grade-cell"; td8.textContent = ""; tr.appendChild(td8);
        const td9 = document.createElement("td"); td9.innerHTML = `<textarea class="coord-input"></textarea>`; tr.appendChild(td9);
        const td10 = document.createElement("td"); td10.innerHTML = `<input type="text" value="${desc}">`; tr.appendChild(td10);

        if (is0) tr.classList.add("zero-data-row");
        if (isLast) tr.classList.add("last-data-row");
        tbody.appendChild(tr);
    });

    const pipeName = pipeStart && pipeEnd ? `${pipeStart}至${pipeEnd}` : '';
    logUserAction('generate', { pipeName, pipeLength: totalDist });

    autoAssignDefectNumbers();
    saveTableData();
    updateStatistics();

    showTip(`生成完成！起点电流：${maxVal}mA，末端电流：${minVal}mA`);
}

// ==================== 编辑电流后同步更新后续行 ====================
function onData1Change(input) {
    const modDist = parseInt(input.dataset.distance);
    const modVal = parseInt(input.value);
    const totalDist = parseInt(document.getElementById("totalDistance").value);
    const minVal = parseInt(document.getElementById("data1Min").value) || 20;

    if (isNaN(modDist) || isNaN(modVal) || modVal < 0) {
        showTip("电流值必须为大于0的数字", true);
        input.value = ""; return;
    }

    let laterDistances = [];
    for (let d = 20; d < totalDist; d += 20) if (d > modDist) laterDistances.push(d);

    let current = modVal;
    laterDistances.forEach((d, idx) => {
        let newVal;
        const remain = laterDistances.length - idx;
        const step = (current - minVal) / remain;
        newVal = current - step;
        newVal += newVal * (Math.random() * 0.04 - 0.02);
        if (idx === laterDistances.length - 1) newVal = minVal;
        else newVal = Math.max(newVal, minVal);
        newVal = Math.round(newVal);
        const target = document.querySelector(`.data1-input[data-distance="${d}"]`);
        if (target) target.value = newVal;
        current = newVal;
    });
    saveTableData();
    updateStatistics();
    showTip("后续电流已基于新值同步更新", false);
}

//地形联动修改函数
function onTerrainChange(input) {
    const modDist = parseInt(input.dataset.distance);
    const newTerrain = input.value.trim();
    if (isNaN(modDist)) return;

    const totalDist = parseInt(document.getElementById("totalDistance").value) || 0;
    const allTerrainInputs = document.querySelectorAll('.terrain-input');
    allTerrainInputs.forEach(inp => {
        const d = parseInt(inp.dataset.distance);
        if (!isNaN(d) && d > modDist && d !== totalDist) {
            if (inp.value.trim() !== '') {
                inp.value = newTerrain;
            }
        }
    });
    saveTableData();
    updateStatistics();
}

//静默格式化函数，供恢复和手动修改使用
function formatBurialInput(input) {
    let val = input.value.trim();
    if (val === '') return;
    let num = parseFloat(val);
    if (isNaN(num) || num <= 0) {
        return;
    }
    let fixed = num.toFixed(2);
    if (fixed.charAt(fixed.length - 1) === '0') {
        fixed = fixed.slice(0, -1) + '1';
    }
    input.value = fixed;
}

//埋深手动修改时自动补齐两位小数，并确保末位非0
function onBurialChange(input) {
    let val = input.value.trim();
    if (val === '') return;
    let num = parseFloat(val);
    if (isNaN(num) || num <= 0) {
        showTip('埋深必须为大于0的数字', true);
        input.value = '';
        return;
    }
    formatBurialInput(input);
    saveTableData();
    updateStatistics();
}

// ==================== 右键菜单与行操作 ====================
function bindContextMenu() {
    const tbody = document.querySelector("#dataTable tbody");
    const newTbody = tbody.cloneNode(true);
    tbody.parentNode.replaceChild(newTbody, tbody);
    const finalTbody = document.querySelector("#dataTable tbody");
    finalTbody.addEventListener("contextmenu", e => {
        e.preventDefault();
        e.stopPropagation();
        const row = e.target.closest("tr");
        if (row) {
            currentRow = row;
            const menu = document.getElementById("contextMenu");
            menu.style.display = "block";
            menu.style.left = e.clientX + "px";
            menu.style.top = e.clientY + "px";
        }
    });
    document.addEventListener("click", () => document.getElementById("contextMenu").style.display = "none");
}

function insertRow(target, pos) {
    const newRow = document.createElement("tr");
    const dis = getAutoDistance(target, pos);
    newRow.innerHTML = `<td>0</td>
        <td><input type="number" value="${dis}"></td>
        <td><input type="number" class="data1-input" data-distance="${dis}" value="" onchange="onData1Change(this)"></td>
        <td><input type="text" class="terrain-input" data-distance="${dis}" value="" onchange="onTerrainChange(this)"></td>
        <td><input type="number" step="0.01" value="" onchange="onBurialChange(this)"></td>
        <td class="defectno-cell"></td>
        <td><input type="text" class="db-input" value="" data-old-value=""></td>
        <td class="grade-cell"></td>
        <td><textarea class="coord-input"></textarea></td>
        <td><input type="text" value=""></td>`;
    pos === "before" ? target.before(newRow) : target.after(newRow);
    reorderSerialNumbers();
    autoAssignDefectNumbers();
    saveTableData();
    updateStatistics();
    showTip("插入成功");
}

function getAutoDistance(tr, p) {
    const rows = Array.from(document.querySelectorAll("#dataTable tbody tr"));
    const idx = rows.indexOf(tr);
    let pre = idx > 0 ? parseFloat(rows[idx - 1].querySelector("td:nth-child(2) input").value) || 0 : 0;
    let nxt = idx < rows.length - 1 ? parseFloat(rows[idx + 1].querySelector("td:nth-child(2) input").value) || 0 : 0;
    let cur = parseFloat(tr.querySelector("td:nth-child(2) input").value) || 0;
    return p === "before" ? (pre ? Math.round((pre + cur) / 2) : cur - 10) : (nxt ? Math.round((cur + nxt) / 2) : cur + 10);
}

function reorderSerialNumbers() {
    document.querySelectorAll("#dataTable tbody tr").forEach((r, i) => r.querySelector("td:nth-child(1)").textContent = i + 1);
}

function deleteCurrentRow() {
    currentRow.remove();
    reorderSerialNumbers();
    autoAssignDefectNumbers();
    saveTableData();
    updateStatistics();
    showTip("已删除");
}

// ==================== 复制与导出 ====================
function copyToExcel() {
    const rows = document.querySelectorAll("#dataTable tbody tr");
    if (rows.length === 0 || (rows.length === 1 && !rows[0].querySelector('td:nth-child(2) input'))) {
        showTip('没有可复制的数据，请先生成表格', true);
        return;
    }
    let text = "";
    rows.forEach(tr => {
        const cells = tr.querySelectorAll("td");
        const rowData = [];
        cells.forEach(cell => {
            let v = "";
            const inp = cell.querySelector("input,textarea");
            if (inp) v = inp.value || "";
            else v = cell.textContent || "";
            rowData.push(v.replace(/\r?\n/g, ""));
        });
        text += rowData.join("\t") + "\r\n";
    });
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.left = "-9999px";
    document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
    const pipeStart = document.getElementById("pipeStart").value.trim();
    const pipeEnd = document.getElementById("pipeEnd").value.trim();
    const totalDist = parseInt(document.getElementById("totalDistance").value) || 0;
    logUserAction('copy', { pipeName: pipeStart && pipeEnd ? `${pipeStart}至${pipeEnd}` : '', pipeLength: totalDist });
    showTip("已复制到剪贴板，可直接在excel中粘贴（不含表头，直接匹配单元格）");
}

function exportToExcel() {
    const rows = document.querySelectorAll("#dataTable tbody tr");
    if (rows.length === 0 || (rows.length === 1 && !rows[0].querySelector('td:nth-child(2) input'))) {
        showTip('没有可导出的数据，请先生成表格', true);
        return;
    }
    // 带边框样式
    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>检测数据</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet>
</x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--><style>td,th{font-family:'Times New Roman';font-size:10pt;text-align:center;vertical-align:middle;border:1px solid black;}</style></head>
<body><table>`;
    html += '<tr><th>序号</th><th>距离(m)</th><th>数据1(mA)</th><th>地形地貌</th><th>埋深(m)</th><th>破损点编号</th><th>db值</th><th>破损分级</th><th>坐标</th><th>位置描述</th></tr>';
    rows.forEach(tr => {
        html += '<tr>';
        const cells = tr.querySelectorAll('td');
        cells.forEach(cell => {
            let val = '';
            const inp = cell.querySelector('input,textarea');
            if (inp) val = inp.value || '';
            else val = cell.textContent || '';
            html += `<td>${val}</td>`;
        });
        html += '</tr>';
    });
    html += '</table></body></html>';
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    saveAs(blob, getExportFileName());
    const pipeStart = document.getElementById("pipeStart").value.trim();
    const pipeEnd = document.getElementById("pipeEnd").value.trim();
    const totalDist = parseInt(document.getElementById("totalDistance").value) || 0;
    logUserAction('export', { pipeName: pipeStart && pipeEnd ? `${pipeStart}至${pipeEnd}` : '', pipeLength: totalDist });
    showTip("导出成功");
}

function showTip(msg, isError = false) {
    const b = document.getElementById("tipBox");
    b.innerHTML = msg;
    b.style.display = "block";
    isError ? b.classList.add("error-tip") : b.classList.remove("error-tip");
    setTimeout(() => b.style.display = "none", isError ? 8000 : 5000);
}

// ==================== 保存/恢复/统计/编号 ====================
function saveTableData() {
    if (isRestoring) return;
    const data = {
        params: {
            totalDistance: document.getElementById('totalDistance').value,
            outputCurrent: document.getElementById('outputCurrent').value,
            data1Max: document.getElementById('data1Max').value,
            data1Min: document.getElementById('data1Min').value,
            burialMax: document.getElementById('burialMax').value,
            burialMin: document.getElementById('burialMin').value,
            pipeStart: document.getElementById('pipeStart').value,
            pipeEnd: document.getElementById('pipeEnd').value,
            defaultTerrain: document.getElementById('defaultTerrain').value,
            specialPoints: document.getElementById('specialPoints').value
        },
        rows: []
    };
    const tbody = document.querySelector('#dataTable tbody');
    if (!tbody) return;
    tbody.querySelectorAll('tr').forEach(tr => {
        const cells = tr.querySelectorAll('td');
        const rowData = {};
        const distInput = cells[1]?.querySelector('input');
        rowData.distance = distInput ? distInput.value : '';
        const data1Input = cells[2]?.querySelector('input');
        rowData.data1 = data1Input ? data1Input.value : '';
        const terrainInput = cells[3]?.querySelector('input');
        rowData.terrain = terrainInput ? terrainInput.value : '';
        const burialInput = cells[4]?.querySelector('input');
        rowData.burial = burialInput ? burialInput.value : '';
        rowData.defectNo = cells[5]?.textContent.trim() || '';
        const dbInput = cells[6]?.querySelector('input');
        rowData.db = dbInput ? dbInput.value : '';
        rowData.grade = cells[7]?.textContent.trim() || '';
        const coordTextarea = cells[8]?.querySelector('textarea');
        rowData.coord = coordTextarea ? coordTextarea.value : '';
        const descInput = cells[9]?.querySelector('input');
        rowData.description = descInput ? descInput.value : '';
        data.rows.push(rowData);
    });
    localStorage.setItem('pcmSavedData', JSON.stringify(data));
}

function restoreTableData() {
    const saved = localStorage.getItem('pcmSavedData');
    if (!saved) return false;
    try {
        const data = JSON.parse(saved);
        if (data.params) {
            const p = data.params;
            document.getElementById('totalDistance').value = p.totalDistance || '';
            document.getElementById('outputCurrent').value = p.outputCurrent || '';
            document.getElementById('data1Max').value = p.data1Max || '';
            document.getElementById('data1Min').value = p.data1Min || '';
            document.getElementById('burialMax').value = p.burialMax || '';
            document.getElementById('burialMin').value = p.burialMin || '';
            document.getElementById('pipeStart').value = p.pipeStart || '';
            document.getElementById('pipeEnd').value = p.pipeEnd || '';
            document.getElementById('defaultTerrain').value = p.defaultTerrain || '';
            document.getElementById('specialPoints').value = p.specialPoints || '';
        }
        const tbody = document.querySelector('#dataTable tbody');
        tbody.innerHTML = '';
        if (data.rows && Array.isArray(data.rows)) {
            isRestoring = true;
            data.rows.forEach((row, idx) => {
                const tr = document.createElement('tr');
                const is0 = row.distance == '0';
                const totalDist = parseFloat(data.params.totalDistance);
                const isLast = row.distance == totalDist;
                tr.innerHTML = `<td>${idx+1}</td>
                    <td><input type="number" value="${row.distance || ''}"></td>
                    <td><input type="number" class="data1-input" data-distance="${row.distance || ''}" value="${row.data1 || ''}" onchange="onData1Change(this)"></td>
                    <td><input type="text" class="terrain-input" data-distance="${row.distance || ''}" value="${row.terrain || ''}" onchange="onTerrainChange(this)"></td>
                    <td><input type="number" step="0.01" value="${row.burial || ''}" onchange="onBurialChange(this)"></td>
                    <td class="defectno-cell">${row.defectNo || ''}</td>
                    <td><input type="text" class="db-input" value="${row.db || ''}" data-old-value="${row.db || ''}"></td>
                    <td class="grade-cell">${row.grade || ''}</td>
                    <td><textarea class="coord-input">${row.coord || ''}</textarea></td>
                    <td><input type="text" value="${row.description || ''}"></td>`;
                if (is0) tr.classList.add('zero-data-row');
                if (isLast) tr.classList.add('last-data-row');
                tbody.appendChild(tr);
            });
            isRestoring = false;
            // 强制格式化埋深
            tbody.querySelectorAll('td:nth-child(5) input').forEach(inp => formatBurialInput(inp));
            // 恢复后直接使用存储的编号和分级，不重新自动分配，但需调用一次保存以同步状态
            saveTableData();
            updateStatistics();
        }
        return true;
    } catch(e) {
        console.error('恢复数据失败：', e);
        return false;
    }
}

function debounceSaveAndStats() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        saveTableData();
        updateStatistics();
    }, 200);
}

function updateGradeForRow(row) {
    const dbInput = row.querySelector('.db-input');
    const gradeCell = row.querySelector('.grade-cell');
    if (!dbInput || !gradeCell) return;
    const dbVal = parseFloat(dbInput.value);
    if (isNaN(dbVal) || dbInput.value.trim() === '') {
        gradeCell.textContent = '';
    } else if (dbVal <= 30) {
        gradeCell.textContent = '轻';
    } else if (dbVal < 60) {
        gradeCell.textContent = '中';
    } else {
        gradeCell.textContent = '严重';
    }
}

function autoAssignDefectNumbers() {
    const tbody = document.querySelector('#dataTable tbody');
    if (!tbody) return;
    const rows = tbody.querySelectorAll('tr');
    let defectIndex = 0;
    rows.forEach(tr => {
        const dbInput = tr.querySelector('.db-input');
        const defectCell = tr.querySelector('.defectno-cell');
        if (dbInput && defectCell) {
            if (dbInput.value.trim() !== '') {
                defectIndex++;
                defectCell.textContent = defectIndex;
            } else {
                defectCell.textContent = '';
            }
        }
    });
}

function updateStatistics() {
    const tbody = document.querySelector('#dataTable tbody');
    if (!tbody || tbody.children.length === 0) {
        document.querySelector('.preview-tip').innerHTML = '使用说明：序号不可编辑，其余均可编辑。更改电流列数据会导致后续电流同步更改。右键可插入/删除行。';
        return;
    }
    const rows = tbody.querySelectorAll('tr');
    let maxDistance = 0;
    const defectNos = [];
    const grades = { light: 0, medium: 0, severe: 0 };
    let burialValues = [];
    rows.forEach(tr => {
        const cells = tr.querySelectorAll('td');
        const distInput = cells[1]?.querySelector('input');
        if (distInput) {
            const d = parseFloat(distInput.value);
            if (!isNaN(d) && d > maxDistance) maxDistance = d;
        }
        const defectText = cells[5]?.textContent.trim() || '';
        if (defectText !== '') {
            defectNos.push(defectText);
        }
        const gradeText = cells[7]?.textContent.trim() || '';
        if (gradeText === '轻') grades.light++;
        else if (gradeText === '中') grades.medium++;
        else if (gradeText === '严重') grades.severe++;
        
        const burialInput = cells[4]?.querySelector('input');
        if (burialInput && burialInput.value.trim() !== '') {
            const b = parseFloat(burialInput.value);
            if (!isNaN(b)) burialValues.push(b);
        }
    });
    const totalDefects = defectNos.length;
    let statsHtml = '';
    if (maxDistance > 0) {
        statsHtml += `实测长度 ${maxDistance}米`;
    }
    if (totalDefects > 0) {
        statsHtml += `，共 ${totalDefects} 处破损点`;
        const percent = (count) => ((count / totalDefects)*100).toFixed(2).replace(/\.?0+$/, '');
        const parts = [];
        if (grades.light > 0) parts.push(`轻 ${grades.light}处 占比 ${percent(grades.light)}%`);
        if (grades.medium > 0) parts.push(`中 ${grades.medium}处 占比 ${percent(grades.medium)}%`);
        if (grades.severe > 0) parts.push(`严重 ${grades.severe}处 占比 ${percent(grades.severe)}%`);
        if (parts.length > 0) statsHtml += '，' + parts.join('，');
    }
    if (burialValues.length > 0) {
        const minB = Math.min(...burialValues).toFixed(2).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
        const maxB = Math.max(...burialValues).toFixed(2).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
        statsHtml += `；管道埋深范围：${minB}-${maxB}m`;
    }
    if (!statsHtml) {
        statsHtml = '暂无统计数据';
    }
    document.querySelector('.preview-tip').innerHTML = statsHtml;
}

//绑定表格事件委托，增加db值数字验证
function bindTableEvents() {
    const tbody = document.querySelector('#dataTable tbody');
    if (!tbody) return;
    if (tbody._inputHandler) {
        tbody.removeEventListener('input', tbody._inputHandler);
    }
    tbody._inputHandler = function(e) {
        if (isRestoring) return;
        const target = e.target;
        if (target.classList.contains('db-input')) {
            const val = target.value.trim();
            // 允许空或纯数字（含小数点）
            if (val !== '' && !/^\d+\.?\d*$/.test(val)) {
                showTip('db值只能输入数字', true);
                target.value = target.dataset.oldValue || '';
                return;
            }
            // 保存当前有效值作为旧值
            target.dataset.oldValue = val;
            updateGradeForRow(target.closest('tr'));
            autoAssignDefectNumbers();
        }
        debounceSaveAndStats();
    };
    tbody.addEventListener('input', tbody._inputHandler);
}

// ==================== 页面启动 ====================
window.onload = function () {
    preventDevTools();

    const loginState = loadLoginState();
    if (loginState) {
        currentUsername = loginState.username;
        currentUserInfo = { expire: loginState.expire, type: loginState.type };
        
        if (!sessionStorage.getItem('pageOpened')) {
            localStorage.removeItem('pcmSavedData');
            sessionStorage.setItem('pageOpened', '1');
        } else {
            restoreTableData();
        }
        
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('systemMain').style.display = 'flex';
        updateUserInfoDisplay();
        initSystemEvents();
        updateStatistics();
    } else {
        sessionStorage.removeItem('pageOpened');
        document.getElementById('loginPage').style.display = 'flex';
        document.getElementById('systemMain').style.display = 'none';
    }

    bindLoginEvent();
    bindLogoutEvent();
};
