// ==================== 全局变量 ====================
let currentRow = null;
let zeroRowDistance = 0;
let lastDataRowDistance = 0;

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

// ==================== 获取服务器标准时间（使用 TimeAPI.io） ====================
async function getServerTime() {
    try {
        const res = await fetch('https://timeapi.io/api/timezone/zone?timeZone=UTC');
        if (!res.ok) throw new Error('时间服务异常');
        const data = await res.json();
        // TimeAPI.io 返回的 currentLocalTime 字段即为 UTC 时间
        return new Date(data.currentLocalTime);
    } catch (error) {
        console.warn('获取服务器时间失败:', error);
        return null;   // 返回 null 表示获取失败
    }
}

// ==================== 获取服务器标准时间（使用苏宁API，国内可用） ====================
async function getServerTime1() {
    try {
        const res = await fetch('http://quan.suning.com/getSysTime.do');
        if (!res.ok) throw new Error('时间服务异常');
        const data = await res.json();
        // 苏宁返回的 sysTime2 字段即为北京时间字符串，格式如 "2026-04-22 12:16:31"
        return new Date(data.sysTime2);
    } catch (error) {
        console.warn('获取服务器时间失败:', error);
        return null;
    }
}

// ==================== 登录验证模块（统一使用 UTC 时间比较） ====================
async function checkUserAuth(username) {
    try {
        // ---------- 1. 获取服务器标准时间（UTC） ----------
        const serverTime = await getServerTime();
        if (!serverTime) {
            return { status: 'error', msg: '授权查询请求失败' };
        }

        // ---------- 2. 原有代码：获取授权配置 ----------
        const timestamp = new Date().getTime();
        const url = `https://woonn.cn/pcm/auth-config.json?t=${timestamp}`;
        const response = await fetch(url, { method: 'GET' });
        if (!response.ok) return { status: 'error', msg: '网络请求失败（' + response.status + '）' };
        const authData = await response.json();
        if (!authData[username]) return { status: 'error', msg: '未给该用户授权，请核对' };
        const userInfo = authData[username];
        if (!userInfo.enabled) return { status: 'error', msg: '该用户已被禁用' };

        // ---------- 3. 核心改进：统一转换为 UTC 时间的毫秒数进行比较 ----------
        // 将服务器时间转换为 UTC 毫秒数
        const serverTimeUTC = serverTime.getTime();

        // 将授权过期时间也解析为 UTC 时间
        // 假设 userInfo.expire 的格式为 "2026-04-23 23:59:59"，且代表北京时间
        const expireTimeBeijing = new Date(userInfo.expire); // 浏览器会按本地时区（如北京时间）解析

        // 关键一步：将解析后的北京时间转换为 UTC 时间
        // 因为北京时间比 UTC 早8小时，所以减去 8 * 60 * 60 * 1000 毫秒
        const expireTimeUTC = expireTimeBeijing.getTime() - (8 * 60 * 60 * 1000);

        // 进行比较
        if (serverTimeUTC > expireTimeUTC) {
            return { status: 'error', msg: '该用户授权已过期（有效期至：' + userInfo.expire + '）' };
        }

        // 验证通过
        userAuthInfo = userInfo;
        return { status: 'success', msg: '验证通过' };
    } catch (error) {
        return { status: 'error', msg: '系统网络服务异常，请联系管理员' };
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
            document.getElementById('loginPage').style.display = 'none';
            document.getElementById('systemMain').style.display = 'flex';
            initSystemEvents();
        } else {
            loginTip.textContent = result.msg;
            loginTip.style.display = 'block';
            setTimeout(() => loginTip.style.display = 'none', 8000);
        }
    };
    loginUsername.onkeydown = e => { if (e.key === 'Enter') loginBtn.click(); };
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
}

// ==================== 禁用右键和F12（保留表格内自定义右键菜单） ====================
function preventDevTools() {
    // 1. 全局禁止浏览器右键菜单（任何地方都不弹出浏览器菜单）
    document.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        return false;
    });

    // 2. 禁用 F12、Ctrl+Shift+I、Ctrl+Shift+J、Ctrl+U、Ctrl+S 等快捷键
    document.addEventListener('keydown', function (e) {
        // F12
        if (e.keyCode === 123) {
            e.preventDefault();
            return false;
        }
        // Ctrl+Shift+I (打开开发者工具)
        if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
            e.preventDefault();
            return false;
        }
        // Ctrl+Shift+J (打开控制台)
        if (e.ctrlKey && e.shiftKey && e.keyCode === 74) {
            e.preventDefault();
            return false;
        }
        // Ctrl+U (查看源代码)
        if (e.ctrlKey && e.keyCode === 85) {
            e.preventDefault();
            return false;
        }
        // Ctrl+S (保存网页)
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
    return (ps && pe) ? `${ps}至${pe}检测数据.xlsx` : `检测数据_${getFileNameTime()}.xlsx`;
}

function parseDecayPoints() {
    const input = document.getElementById("decayPoints").value.trim();
    if (!input) return [];
    const points = [];
    input.split(/[ ,，]+/).forEach(item => {
        const [dStr, pStr] = item.split(/[:：]/);
        const d = parseInt(dStr), p = parseFloat(pStr);
        if (!isNaN(d) && d > 0 && !isNaN(p) && p > 0 && p <= 100) points.push({ distance: d, rate: (100 - p) / 100 });
    });
    return points.sort((a, b) => a.distance - b.distance);
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

function generateBurialValue(min, max) {
    const r = Math.random();
    if (r < 0.08) return min.toFixed(2);
    if (r < 0.16) return max.toFixed(2);
    return (min + Math.random() * (max - min)).toFixed(2);
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ==================== 核心：生成表格数据 ====================
function generateBaseData() {
    const outCur = parseInt(document.getElementById("outputCurrent").value);
    const totalDist = parseInt(document.getElementById("totalDistance").value);
    let maxVal = parseInt(document.getElementById("data1Max").value) || null;
    let minVal = parseInt(document.getElementById("data1Min").value) || null;
    const burialMax = parseFloat(document.getElementById("burialMax").value) || null;
    const burialMin = parseFloat(document.getElementById("burialMin").value) || null;
    const pipeStart = document.getElementById("pipeStart").value.trim();
    const pipeEnd = document.getElementById("pipeEnd").value.trim();
    const terrain = document.getElementById("defaultTerrain").value.trim() || "绿化带";

    const errs = [];
    if (!outCur || outCur <= 0) errs.push("输出电流都不填！");
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
    const decays = parseDecayPoints();
    const decayMap = {}; decays.forEach(p => decayMap[p.distance] = p.rate);

    let distSet = new Set([0, totalDist]);
    for (let d = 20; d < totalDist; d += 20) distSet.add(d);
    specials.forEach(sp => distSet.add(sp.d));
    decays.forEach(dp => distSet.add(dp.distance));
    const distances = Array.from(distSet).sort((a, b) => a - b);
    const valid20Distances = distances.filter(d => d > 0 && d < totalDist && d % 20 === 0);

    let data1Map = {};
    let prevEffective = maxVal;

    valid20Distances.forEach((d, idx) => {
        let newVal;
        const customRate = decayMap[d];
        if (idx === 0) {
            newVal = customRate !== undefined ? maxVal * customRate : maxVal;
        } else {
            if (customRate !== undefined) {
                newVal = prevEffective * customRate;
            } else {
                const remaining = valid20Distances.length - idx;
                const step = (prevEffective - minVal) / remaining;
                newVal = prevEffective - step;
                newVal += newVal * (Math.random() * 0.04 - 0.02);
            }
        }
        if (idx === valid20Distances.length - 1) newVal = minVal;
        else newVal = Math.max(newVal, minVal);
        newVal = Math.round(newVal);
        data1Map[d] = newVal;
        prevEffective = newVal;
    });

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
        const td4 = document.createElement("td"); td4.innerHTML = `<input type="text" value="${isValid20 ? terrain : ''}">`; tr.appendChild(td4);
        const td5 = document.createElement("td"); td5.innerHTML = `<input type="text" value="${isValid20 ? generateBurialValue(bMin, bMax) : ''}">`; tr.appendChild(td5);
        const td6 = document.createElement("td"); td6.innerHTML = `<input type="text" value="">`; tr.appendChild(td6);
        const td7 = document.createElement("td"); td7.innerHTML = `<input type="text" value="">`; tr.appendChild(td7);
        const td8 = document.createElement("td"); td8.innerHTML = `<input type="text" value="">`; tr.appendChild(td8);
        const td9 = document.createElement("td"); td9.innerHTML = `<textarea class="coord-input"></textarea>`; tr.appendChild(td9);
        const td10 = document.createElement("td"); td10.innerHTML = `<input type="text" value="${desc}">`; tr.appendChild(td10);

        if (is0) tr.classList.add("zero-data-row");
        if (isLast) tr.classList.add("last-data-row");
        tbody.appendChild(tr);
    });
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

    const decays = parseDecayPoints();
    const decayMap = {}; decays.forEach(p => decayMap[p.distance] = p.rate);

    let laterDistances = [];
    for (let d = 20; d < totalDist; d += 20) if (d > modDist) laterDistances.push(d);

    let current = modVal;
    laterDistances.forEach((d, idx) => {
        let newVal;
        const rate = decayMap[d];
        if (rate !== undefined) {
            newVal = current * rate;
        } else {
            const remain = laterDistances.length - idx;
            const step = (current - minVal) / remain;
            newVal = current - step;
            newVal += newVal * (Math.random() * 0.04 - 0.02);
        }
        if (idx === laterDistances.length - 1) newVal = minVal;
        else newVal = Math.max(newVal, minVal);
        newVal = Math.round(newVal);
        const target = document.querySelector(`.data1-input[data-distance="${d}"]`);
        if (target) target.value = newVal;
        current = newVal;
    });
    showTip("后续电流已基于新值同步更新", false);
}

// ==================== 右键菜单与行操作 ====================
function bindContextMenu() {
    const tbody = document.querySelector("#dataTable tbody");
    tbody.addEventListener("contextmenu", e => {
        e.preventDefault();
        e.stopPropagation();   // 阻止事件冒泡，避免触发全局监听（虽然全局已阻止，但保持良好习惯）
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
    newRow.innerHTML = `<td>0</td><td><input type="number" value="${dis}"></td><td><input type="text" value=""></td><td><input type="text" value=""></td><td><input type="text" value=""></td><td><input type="text" value=""></td><td><input type="text" value=""></td><td><input type="text" value=""></td><td><textarea class="coord-input"></textarea></td><td><input type="text" value=""></td>`;
    pos === "before" ? target.before(newRow) : target.after(newRow);
    reorderSerialNumbers();
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
    showTip("已删除");
}

// ==================== 复制与导出 ====================
function copyToExcel() {
    const rows = document.querySelectorAll("#dataTable tbody tr");
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
    showTip("已复制数据行到剪贴板，可直接在excel中粘贴（不含表头，匹配单元格）");
}

function exportToExcel() {
    const ws = XLSX.utils.table_to_sheet(document.getElementById("dataTable"));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "检测数据");
    XLSX.writeFile(wb, getExportFileName());
    showTip("导出成功");
}

function showTip(msg, isError = false) {
    const b = document.getElementById("tipBox");
    b.innerHTML = msg;
    b.style.display = "block";
    isError ? b.classList.add("error-tip") : b.classList.remove("error-tip");
    setTimeout(() => b.style.display = "none", isError ? 8000 : 5000);
}

// ==================== 页面启动 ====================
window.onload = function () {
    // 启用防调试与右键禁用
    preventDevTools();
    bindLoginEvent();
};
