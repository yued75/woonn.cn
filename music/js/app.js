(function() {
    const $ = (s) => document.querySelector(s);
    const $$ = (s) => document.querySelectorAll(s);

    // DOM 元素
    const searchInput = $('#searchInput');
    const searchBtn = $('#searchBtn');
    const hotTags = $('#hotTags');
    const mainContent = $('#mainContent');
    const songList = $('#songList');
    const statusInitial = $('#statusInitial');
    const statusLoading = $('#statusLoading');
    const statusEmpty = $('#statusEmpty');
    const statusError = $('#statusError');
    const statusErrorMsg = $('#statusErrorMsg');
    const audioPlayer = $('#audioPlayer');
    const playerCoverArea = $('#playerCoverArea');
    const playerCoverImg = $('#playerCoverImg');
    const playerSongName = $('#playerSongName');
    const playerSongArtist = $('#playerSongArtist');
    const btnPlayPause = $('#btnPlayPause');
    const btnPrev = $('#btnPrev');
    const btnNext = $('#btnNext');
    const progressBarWrap = $('#progressBarWrap');
    const progressBarFill = $('#progressBarFill');
    const timeCurrent = $('#timeCurrent');
    const timeDuration = $('#timeDuration');
    const btnCopyLink = $('#btnCopyLink');
    const btnMode = $('#btnMode');
    const btnPlaylist = $('#btnPlaylist');
    const queueDot = $('#queueDot');
    const modalOverlay = $('#modalOverlay');
    const modalQueueList = $('#modalQueueList');
    const modalClose = $('#modalClose');
    const queueCount = $('#queueCount');
    const toastContainer = $('#toastContainer');
    const lyricOverlay = $('#lyricOverlay');
    const lyricOverlayContent = $('#lyricOverlayContent');
    const lyricOverlayClose = $('#lyricOverlayClose');
    const progressBarContainer = $('#progressBarContainer');
    const progressTooltip = $('#progressTooltip');
    const lyricIndicator = $('#lyricIndicator');

    const API_BASE_URL = 'https://musicapi.yued75.workers.dev';
    let playlist = [];
    let searchResults = [];
    let playMode = 'list';
    let isPlaying = false;
    let songUrlCache = {};
    let currentLyric = [];
    let currentSong = null;
    let queueIndex = -1;
    let searchIndex = -1;

    let isManualScroll = false;
    let manualScrollTimer = null;
    const SCROLL_BACK_DELAY = 3000;
    let indicatorTimer = null;
    let lastLyricLength = 0;

    const modeIcons = { list:'🔁', single:'🔂', random:'🔀' };
    const modeTitles = { list:'列表循环', single:'单曲循环', random:'随机播放' };

    const keywordPool = [
        '周杰伦','Taylor Swift','告五人','纯音乐','电音','爵士','说唱','陈奕迅',
        '林俊杰','邓紫棋','BTS','钢琴曲','古风','轻音乐','R&B','摇滚','朴树',
        '许巍','蔡依林','孙燕姿','薛之谦','毛不易','赵雷','华语流行','欧美经典'
    ];

    // 工具函数
    function getRandomKeywords(count = 8) {
        const shuffled = [...keywordPool].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    function formatTime(s) {
        if(!s || isNaN(s)) return '00:00';
        const m = Math.floor(s/60), sec = Math.floor(s%60);
        return String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0');
    }

    function showToast(msg, type='') {
        const t = document.createElement('div');
        t.className = 'toast '+type;
        t.textContent = msg;
        toastContainer.appendChild(t);
        setTimeout(() => { if(t.parentNode) t.remove(); }, 2200);
    }

    function escapeHtml(str) {
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    function sanitizeUrl(url) {
        if (url && (url.startsWith('https://') || url.startsWith('http://'))) return url;
        return '';
    }

    async function copyText(text) {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
        } else {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        }
    }

    async function apiCall(endpoint, timeoutMs = 10000) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const resp = await fetch(API_BASE_URL + endpoint, { signal: controller.signal });
            clearTimeout(id);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            if (data.error) throw new Error(data.message || '服务器错误');
            return data;
        } catch (e) {
            clearTimeout(id);
            if (e.name === 'AbortError') throw new Error('请求超时');
            throw e;
        }
    }

    function showStatus(s) {
        statusInitial.style.display = 'none';
        statusLoading.style.display = 'none';
        statusEmpty.style.display = 'none';
        statusError.style.display = 'none';
        songList.style.display = 'none';
        if(s==='initial') statusInitial.style.display='';
        else if(s==='loading') statusLoading.style.display='';
        else if(s==='empty') statusEmpty.style.display='';
        else if(s==='error') statusError.style.display='';
        else if(s==='list') songList.style.display='';
    }

    // API
    async function searchSongs(keyword) {
        const data = await apiCall(`/search?keywords=${encodeURIComponent(keyword)}&limit=40`);
        if (!data?.result?.songs) throw new Error('数据异常');
        return data.result.songs.map(song => ({
            id: song.id,
            name: song.name || '未知歌曲',
            artist: (song.artists?.map(a=>a.name).join(' / ')) || '未知歌手',
            cover: sanitizeUrl(song.album?.picUrl) || '',
            duration: song.duration || 0,
            durationMs: song.dt || song.duration || 0,
        }));
    }

    async function getSongUrl(songId) {
        if (songUrlCache[songId]) return songUrlCache[songId];
        const data = await apiCall(`/song/url?id=${songId}`);
        if (data?.data?.length>0) {
            const d = data.data[0];
            if (d.url) { songUrlCache[songId] = d.url; return d.url; }
            if (d.error === 'copyright') throw new Error('该歌曲因版权限制无法播放');
        }
        throw new Error('无法获取播放链接');
    }

    async function getLyric(songId) {
        try {
            const data = await apiCall(`/lyric?id=${songId}`);
            return data?.lrc?.lyric || null;
        } catch(e) { return null; }
    }

    function parseLyric(lrcText) {
        if (!lrcText) return [];
        const lines = lrcText.split('\n');
        const parsed = [];
        const timeReg = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
        lines.forEach(line => {
            const match = line.match(timeReg);
            if(match) {
                const min = parseInt(match[1]);
                const sec = parseInt(match[2]);
                const ms = parseInt(match[3]) * (match[3].length===2?10:1);
                const time = min*60 + sec + ms/1000;
                const text = line.replace(timeReg, '').trim();
                if(text) parsed.push({ time, text });
            }
        });
        return parsed.sort((a,b) => a.time - b.time);
    }

    // 歌词渲染 (不再包含指示线元素)
    function renderLyricContent() {
        lyricOverlayContent.innerHTML = currentLyric.map((line, i) =>
            `<p data-time="${line.time}" data-idx="${i}">${escapeHtml(line.text)}</p>`
        ).join('');
        lastLyricLength = currentLyric.length;
    }

    function updateLyricActive() {
        if (lyricOverlay.style.display === 'none') return;
        const currentTime = audioPlayer.currentTime || 0;
        let activeIndex = -1;
        for(let i=0; i<currentLyric.length; i++) {
            if(currentTime >= currentLyric[i].time) activeIndex = i;
        }
        const allLines = lyricOverlayContent.querySelectorAll('p');
        allLines.forEach((line, idx) => {
            line.classList.toggle('current', idx === activeIndex);
        });
        if (!isManualScroll && activeIndex >= 0) {
            const target = allLines[activeIndex];
            if(target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    function setManualMode() {
        isManualScroll = true;
        clearTimeout(manualScrollTimer);
        manualScrollTimer = setTimeout(() => {
            isManualScroll = false;
            updateLyricActive();
        }, SCROLL_BACK_DELAY);
    }

    // 显示指示线并更新时间，2秒后隐藏
    function showIndicatorWithTime() {
        lyricIndicator.style.display = 'flex';
        updateIndicatorTime();
        clearTimeout(indicatorTimer);
        indicatorTimer = setTimeout(() => {
            lyricIndicator.style.display = 'none';
        }, 2000);
    }

    function updateIndicatorTime() {
        const line = getLineAtMiddle();
        if (line && line.dataset.time) {
            const sec = parseFloat(line.dataset.time);
            lyricIndicator.querySelector('.lyric-indicator-time').textContent = formatTime(sec);
        }
    }

    // 获取歌词内容区正中间的行（基于 lyricOverlayContent 的可视区域）
    function getLineAtMiddle() {
        const contentRect = lyricOverlayContent.getBoundingClientRect();
        const middleY = contentRect.top + contentRect.height / 2;
        const lines = lyricOverlayContent.querySelectorAll('p');
        let closest = null;
        let minDist = Infinity;
        lines.forEach(line => {
            const rect = line.getBoundingClientRect();
            const lineCenter = rect.top + rect.height / 2;
            const dist = Math.abs(middleY - lineCenter);
            if (dist < minDist) {
                minDist = dist;
                closest = line;
            }
        });
        return closest;
    }

    // 跳转到标线所在行（仅通过拖拽松手调用）
    function jumpToIndicatorLine() {
        const line = getLineAtMiddle();
        if (line && line.dataset.time) {
            audioPlayer.currentTime = parseFloat(line.dataset.time);
            setManualMode();
        }
    }

    // 进度条拖动提示
    let tooltipTimer;
    function showProgressTooltip(clientX) {
        const rect = progressBarWrap.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const time = percent * (audioPlayer.duration || 0);
        progressTooltip.textContent = formatTime(time);
        progressTooltip.style.left = (percent * 100) + '%';
        progressTooltip.style.display = 'block';
        clearTimeout(tooltipTimer);
    }
    function hideProgressTooltip() {
        tooltipTimer = setTimeout(() => {
            progressTooltip.style.display = 'none';
        }, 1000);
    }

    let progressDragging = false;
    progressBarWrap.addEventListener('pointerdown', (e) => {
        progressDragging = true;
        updateProgressFromEvent(e);
        showProgressTooltip(e.clientX);
        progressBarWrap.setPointerCapture(e.pointerId);
    });
    document.addEventListener('pointermove', (e) => {
        if (progressDragging) {
            updateProgressFromEvent(e);
            showProgressTooltip(e.clientX);
        }
    });
    document.addEventListener('pointerup', () => {
        if (progressDragging) {
            progressDragging = false;
            hideProgressTooltip();
        }
    });
    progressBarWrap.addEventListener('click', (e) => updateProgressFromEvent(e));

    function updateProgressFromEvent(e) {
        if (!audioPlayer.duration || isNaN(audioPlayer.duration)) return;
        const rect = progressBarWrap.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        audioPlayer.currentTime = percent * audioPlayer.duration;
    }

    // 歌词拖拽 / 滚轮（点击无跳转，仅拖拽松手跳转）
    {
        let isDragging = false, startY = 0, startScrollTop = 0;
        let moved = false;

        lyricOverlayContent.addEventListener('pointerdown', (e) => {
            isDragging = true;
            moved = false;
            startY = e.clientY;
            startScrollTop = lyricOverlayContent.scrollTop;
            lyricOverlayContent.setPointerCapture(e.pointerId);
        });

        lyricOverlayContent.addEventListener('pointermove', (e) => {
            if (!isDragging) return;
            const dy = e.clientY - startY;
            if (Math.abs(dy) > 5) moved = true;
            lyricOverlayContent.scrollTop = startScrollTop - dy;
            setManualMode();
            if (moved) {
                showIndicatorWithTime();
            }
        });

        lyricOverlayContent.addEventListener('pointerup', () => {
            if (!isDragging) return;
            isDragging = false;
            lyricOverlayContent.releasePointerCapture(e.pointerId);

            // 只有发生了拖拽（移动超过阈值）才跳转，点击不做任何反应
            if (moved) {
                jumpToIndicatorLine();
                showToast('已跳转');
            }
            // 指示线保留，由计时器控制
        });

        lyricOverlayContent.addEventListener('wheel', () => {
            setManualMode();
            showIndicatorWithTime();
        });
    }

    // 播放核心
    async function playSong(song) {
        try {
            if (!song.url) {
                showToast('正在获取播放链接...');
                song.url = await getSongUrl(song.id);
            }
            audioPlayer.src = song.url;
            currentSong = song;
            audioPlayer.currentTime = 0;
            isPlaying = true;
            await audioPlayer.play();
            playerCoverArea.classList.add('rotating');
            updatePlayerUI();
            updatePlayPauseBtn();
            fetchAndDisplayLyric(song.id);
            scrollToCurrentSong();
            return true;
        } catch(e) {
            showToast('⛔ ' + e.message, 'error');
            if (!currentSong) {
                audioPlayer.pause();
                audioPlayer.src = '';
                isPlaying = false;
            }
            updatePlayerUI();
            updatePlayPauseBtn();
            return false;
        }
    }

    async function playQueueAt(index) {
        if (index < 0 || index >= playlist.length) return;
        queueIndex = index;
        const song = playlist[index];
        const success = await playSong(song);
        if (success) {
            const sIdx = searchResults.findIndex(s => s.id === song.id);
            if (sIdx >= 0) searchIndex = sIdx;
        }
    }

    async function playSearchAt(index) {
        if (index < 0 || index >= searchResults.length) return;
        searchIndex = index;
        const song = searchResults[index];
        await playSong(song);
    }

    function togglePlayPause() {
        if (!currentSong) {
            if (playlist.length > 0) playQueueAt(0);
            else if (searchResults.length > 0) playSearchAt(0);
            return;
        }
        if (isPlaying) {
            audioPlayer.pause();
            isPlaying = false;
            playerCoverArea.classList.remove('rotating');
        } else {
            audioPlayer.play().then(() => {
                isPlaying = true;
                playerCoverArea.classList.add('rotating');
            }).catch(() => {});
            isPlaying = true;
            playerCoverArea.classList.add('rotating');
        }
        updatePlayPauseBtn();
    }

    function getNextIndexRaw() {
        if (playlist.length > 0) {
            const len = playlist.length;
            if (playMode === 'random') return Math.floor(Math.random() * len);
            return (queueIndex + 1) % len;
        } else if (searchResults.length > 0) {
            const len = searchResults.length;
            if (playMode === 'random') return Math.floor(Math.random() * len);
            return (searchIndex + 1) % len;
        }
        return -1;
    }

    function getPrevIndexRaw() {
        if (playlist.length > 0) {
            const len = playlist.length;
            if (playMode === 'random') return Math.floor(Math.random() * len);
            return (queueIndex - 1 + len) % len;
        } else if (searchResults.length > 0) {
            const len = searchResults.length;
            if (playMode === 'random') return Math.floor(Math.random() * len);
            return (searchIndex - 1 + len) % len;
        }
        return -1;
    }

    async function playNext(isManual = false) {
        if (!isManual && playMode === 'single') {
            if (currentSong) {
                audioPlayer.currentTime = 0;
                audioPlayer.play();
                isPlaying = true;
                playerCoverArea.classList.add('rotating');
                updatePlayPauseBtn();
            }
            return;
        }
        const next = getNextIndexRaw();
        if (playlist.length > 0 && next >= 0) {
            await playQueueAt(next);
        } else if (searchResults.length > 0 && next >= 0) {
            await playSearchAt(next);
        } else {
            audioPlayer.pause();
            isPlaying = false;
            updatePlayPauseBtn();
        }
    }

    async function playPrev() {
        if (audioPlayer.currentTime > 3 && currentSong) {
            audioPlayer.currentTime = 0;
            audioPlayer.play();
            return;
        }
        const prev = getPrevIndexRaw();
        if (playlist.length > 0 && prev >= 0) {
            await playQueueAt(prev);
        } else if (searchResults.length > 0 && prev >= 0) {
            await playSearchAt(prev);
        }
    }

    // UI 更新
    function updatePlayerUI() {
        if(currentSong) {
            playerSongName.textContent = currentSong.name;
            playerSongArtist.textContent = currentSong.artist;
            if(currentSong.cover) {
                playerCoverImg.src = currentSong.cover;
                playerCoverImg.style.display = '';
                playerCoverArea.querySelector('.player-cover-placeholder').style.display = 'none';
            } else {
                playerCoverImg.style.display = 'none';
                playerCoverArea.querySelector('.player-cover-placeholder').style.display = '';
            }
            btnCopyLink.style.display = '';
            if(isPlaying) {
                playerCoverArea.classList.add('rotating');
            } else {
                playerCoverArea.classList.remove('rotating');
            }
        } else {
            playerSongName.textContent = '未在播放';
            playerSongArtist.textContent = '选择一首歌曲开始';
            playerCoverImg.style.display = 'none';
            playerCoverArea.querySelector('.player-cover-placeholder').style.display = '';
            btnCopyLink.style.display = 'none';
            progressBarFill.style.width = '0%';
            timeCurrent.textContent = '00:00';
            timeDuration.textContent = '00:00';
            playerCoverArea.classList.remove('rotating');
        }
        updateQueueDot();
        renderSongListHighlight();
        renderQueueModal();
        progressBarContainer.style.display = currentSong ? '' : 'none';
    }

    function updatePlayPauseBtn() {
        btnPlayPause.textContent = isPlaying ? '⏸' : '▶';
    }

    function updateQueueDot() {
        const len = playlist.length;
        if(len > 0) {
            queueDot.style.display = '';
            queueCount.textContent = len;
        } else {
            queueDot.style.display = 'none';
            queueCount.textContent = '0';
        }
    }

    function renderSongListHighlight() {
        $$('.song-item').forEach(item => item.classList.remove('playing'));
        if (!currentSong) return;
        const searchItem = document.querySelector(`.song-item[data-song-id="${currentSong.id}"]`);
        if (searchItem) searchItem.classList.add('playing');
        const queueItems = modalQueueList.querySelectorAll('.song-item');
        queueItems.forEach(item => {
            item.classList.remove('playing');
            if (item.dataset.songId == currentSong.id) item.classList.add('playing');
        });
    }

    // 歌曲列表渲染
    function renderSongList(songs) {
        songList.innerHTML = '';
        if (!songs || !songs.length) { showStatus('empty'); return; }
        showStatus('list');
        searchResults = songs;
        songs.forEach((song, i) => {
            const item = document.createElement('div');
            item.className = 'song-item';
            item.dataset.songId = song.id;
            const durSec = song.durationMs ? Math.floor(song.durationMs/1000) : (song.duration ? Math.floor(song.duration/1000) : 0);
            item.innerHTML = `
                <span class="song-index">${i+1}</span>
                ${song.cover ? `<img class="song-cover" src="${song.cover}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">` : ''}
                <div class="song-cover-placeholder" style="${song.cover?'display:none;':''}">🎵</div>
                <div class="song-info">
                    <div class="song-name">${escapeHtml(song.name)}</div>
                    <div class="song-artist">${escapeHtml(song.artist)}</div>
                </div>
                <span class="song-duration">${formatTime(durSec)}</span>
                <div class="song-actions">
                    <button class="btn-sm btn-copy-song" data-song-id="${song.id}">🔗</button>
                    <button class="btn-sm btn-add-queue" data-song-id="${song.id}">➕</button>
                </div>
            `;
            item.addEventListener('click', async (e) => {
                if (e.target.closest('.btn-sm')) return;
                await playSearchAt(i);
                updatePlayerUI();
            });
            songList.appendChild(item);
        });
        bindSongListButtons();
        renderSongListHighlight();
    }

    function bindSongListButtons() {
        $$('.btn-copy-song').forEach(btn => {
            btn.removeEventListener('click', handleCopy);
            btn.addEventListener('click', handleCopy);
        });
        $$('.btn-add-queue').forEach(btn => {
            btn.removeEventListener('click', handleAddQueue);
            btn.addEventListener('click', handleAddQueue);
        });
    }

    async function handleCopy(e) {
        e.stopPropagation();
        const btn = e.currentTarget;
        const songId = parseInt(btn.dataset.songId);
        await copySongLink(songId, btn);
    }

    function handleAddQueue(e) {
        e.stopPropagation();
        const btn = e.currentTarget;
        const id = parseInt(btn.dataset.songId);
        const song = searchResults.find(s => s.id === id);
        if (song && !playlist.find(s => s.id === id)) {
            playlist.push({...song, url: null});
            showToast('✅ 已添加到播放列表');
            updateQueueDot();
            renderQueueModal();
        } else {
            showToast('⚠️ 歌曲已在列表中');
        }
    }

    // 播放列表弹窗
    function renderQueueModal() {
        if (!playlist.length) {
            modalQueueList.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:30px;">列表为空</p>';
        } else {
            modalQueueList.innerHTML = playlist.map((song, i) => {
                const dur = song.durationMs ? Math.floor(song.durationMs/1000) : (song.duration ? Math.floor(song.duration/1000) : 0);
                return `<div class="song-item" data-song-id="${song.id}" style="cursor:pointer;">
                    <span class="song-index">${i+1}</span>
                    ${song.cover ? `<img class="song-cover" src="${song.cover}" alt="">` : ''}
                    <div class="song-cover-placeholder" style="${song.cover?'display:none;':''}">🎵</div>
                    <div class="song-info">
                        <div class="song-name">${escapeHtml(song.name)}</div>
                        <div class="song-artist">${escapeHtml(song.artist)}</div>
                    </div>
                    <span class="song-duration">${formatTime(dur)}</span>
                    <div class="song-actions" style="opacity:1;">
                        <button class="btn-sm btn-copy-queue" data-song-id="${song.id}">🔗</button>
                        <button class="btn-sm btn-remove-queue" data-idx="${i}">✕</button>
                    </div>
                </div>`;
            }).join('');

            modalQueueList.querySelectorAll('.song-item').forEach(el => {
                el.addEventListener('click', (e) => {
                    if (e.target.closest('.btn-sm')) return;
                    const idx = Array.from(el.parentNode.children).indexOf(el);
                    playQueueAt(idx);
                    modalOverlay.style.display = 'none';
                });
            });
            modalQueueList.querySelectorAll('.btn-copy-queue').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await copySongLink(parseInt(btn.dataset.songId), btn);
                });
            });
            modalQueueList.querySelectorAll('.btn-remove-queue').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const idx = parseInt(btn.dataset.idx);
                    removeFromQueue(idx);
                });
            });
        }
        updateQueueDot();
        renderSongListHighlight();
    }

    function removeFromQueue(idx) {
        if (idx < 0 || idx >= playlist.length) return;
        if (currentSong && playlist[idx] && playlist[idx].id === currentSong.id) {
            audioPlayer.pause();
            isPlaying = false;
            playerCoverArea.classList.remove('rotating');
            playlist.splice(idx, 1);
            if (playlist.length > 0) {
                const newIdx = Math.min(idx, playlist.length - 1);
                queueIndex = newIdx;
                playQueueAt(newIdx);
            } else {
                queueIndex = -1;
                currentSong = null;
                audioPlayer.src = '';
                updatePlayerUI();
                updatePlayPauseBtn();
            }
        } else {
            if (idx < queueIndex) queueIndex--;
            playlist.splice(idx, 1);
            updatePlayerUI();
        }
        renderQueueModal();
    }

    function openModal() { modalOverlay.style.display = ''; renderQueueModal(); }
    function closeModal() { modalOverlay.style.display = 'none'; }

    async function copySongLink(songId, btn) {
        try {
            let url = songUrlCache[songId];
            if (!url) url = await getSongUrl(songId);
            await copyText(url);
            showToast('直链已复制！', 'success');
            if (btn) { btn.classList.add('copied'); setTimeout(() => btn.classList.remove('copied'), 1500); }
        } catch(e) {
            showToast('复制失败: ' + e.message, 'error');
        }
    }

    function toggleLyricOverlay() {
        if (!currentSong) { showToast('请先播放一首歌曲'); return; }
        const isVisible = lyricOverlay.style.display !== 'none';
        if (isVisible) {
            lyricOverlay.style.display = 'none';
            clearTimeout(indicatorTimer);
            lyricIndicator.style.display = 'none';
        } else {
            lyricOverlay.style.display = '';
            isManualScroll = false;
            clearTimeout(manualScrollTimer);
            fetchAndDisplayLyric(currentSong.id);
        }
    }

    async function fetchAndDisplayLyric(songId) {
        const lrc = await getLyric(songId);
        currentLyric = lrc ? parseLyric(lrc) : [];
        lastLyricLength = 0;
        if (lyricOverlay.style.display !== 'none') {
            if (currentLyric.length === 0) {
                lyricOverlayContent.innerHTML = '<p class="lyric-empty">暂无歌词</p>';
            } else {
                renderLyricContent();
                updateLyricActive();
            }
        }
    }

    function scrollToCurrentSong() {
        const target = document.querySelector(`.song-item[data-song-id="${currentSong?.id}"]`);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // 搜索
    let searchTimer;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimer);
        const val = searchInput.value.trim();
        if (!val) { showStatus('initial'); renderHotTags(); return; }
        searchTimer = setTimeout(() => doSearch(val), 400);
    });
    searchBtn.addEventListener('click', () => {
        clearTimeout(searchTimer);
        const val = searchInput.value.trim();
        if (!val) { showToast('请输入搜索关键词'); return; }
        doSearch(val);
    });
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            clearTimeout(searchTimer);
            const val = searchInput.value.trim();
            if (val) doSearch(val);
        }
    });

    async function doSearch(keyword) {
        showStatus('loading');
        try {
            const songs = await searchSongs(keyword);
            searchResults = songs;
            if (!songs.length) {
                showStatus('empty');
                songList.innerHTML = '';
            } else {
                renderSongList(songs);
            }
        } catch(e) {
            console.error(e);
            statusErrorMsg.textContent = '搜索服务暂不可用，请稍后重试';
            showStatus('error');
            songList.innerHTML = '';
        }
    }

    // 音频事件
    audioPlayer.addEventListener('timeupdate', () => {
        if (audioPlayer.duration && !isNaN(audioPlayer.duration)) {
            progressBarFill.style.width = (audioPlayer.currentTime/audioPlayer.duration)*100 + '%';
            timeCurrent.textContent = formatTime(audioPlayer.currentTime);
            timeDuration.textContent = formatTime(audioPlayer.duration);
            if (currentLyric.length) updateLyricActive();
        }
    });
    audioPlayer.addEventListener('loadedmetadata', () => {
        timeDuration.textContent = formatTime(audioPlayer.duration);
    });
    audioPlayer.addEventListener('play', () => {
        isPlaying = true;
        playerCoverArea.classList.add('rotating');
        updatePlayPauseBtn();
    });
    audioPlayer.addEventListener('pause', () => {
        isPlaying = false;
        playerCoverArea.classList.remove('rotating');
        updatePlayPauseBtn();
    });
    audioPlayer.addEventListener('ended', () => {
        isPlaying = false;
        playerCoverArea.classList.remove('rotating');
        updatePlayPauseBtn();
        if (playMode === 'single') {
            if (currentSong) {
                audioPlayer.currentTime = 0;
                audioPlayer.play();
                isPlaying = true;
                playerCoverArea.classList.add('rotating');
                updatePlayPauseBtn();
            }
        } else {
            playNext(false);
        }
    });
    audioPlayer.addEventListener('error', () => {
        isPlaying = false;
        playerCoverArea.classList.remove('rotating');
        updatePlayPauseBtn();
        if (currentSong) {
            delete songUrlCache[currentSong.id];
            currentSong.url = null;
            showToast('播放失败，尝试下一首...', 'error');
            setTimeout(() => { if (currentSong) playNext(false); }, 1500);
        }
    });

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT') return;
        if (e.key === 'ArrowRight') { e.preventDefault(); audioPlayer.currentTime = Math.min(audioPlayer.duration||0, audioPlayer.currentTime+5); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); audioPlayer.currentTime = Math.max(0, audioPlayer.currentTime-5); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); audioPlayer.volume = Math.min(1, audioPlayer.volume+0.1); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); audioPlayer.volume = Math.max(0, audioPlayer.volume-0.1); }
    });

    // 按钮绑定
    btnPlayPause.addEventListener('click', togglePlayPause);
    btnPrev.addEventListener('click', playPrev);
    btnNext.addEventListener('click', () => playNext(true));
    btnCopyLink.addEventListener('click', async () => {
        if (currentSong) await copySongLink(currentSong.id);
        else showToast('请先播放一首歌曲');
    });
    btnMode.addEventListener('click', () => {
        const modes = ['list','single','random'];
        const idx = modes.indexOf(playMode);
        playMode = modes[(idx+1)%3];
        btnMode.textContent = modeIcons[playMode];
        btnMode.title = '播放模式：' + modeTitles[playMode];
        btnMode.classList.toggle('active', playMode!=='list');
        showToast('切换至 ' + modeTitles[playMode]);
    });
    btnPlaylist.addEventListener('click', openModal);
    modalClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => { if(e.target===modalOverlay) closeModal(); });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { closeModal(); lyricOverlay.style.display = 'none'; }
        if (e.key === ' ' && e.target === document.body) { e.preventDefault(); togglePlayPause(); }
    });

    lyricOverlayClose.addEventListener('click', () => { lyricOverlay.style.display = 'none'; });
    lyricOverlay.addEventListener('click', (e) => { if (e.target === lyricOverlay) lyricOverlay.style.display = 'none'; });
    playerCoverArea.addEventListener('click', toggleLyricOverlay);

    function renderHotTags() {
        const tags = getRandomKeywords();
        hotTags.innerHTML = tags.map(t => `<span class="hot-tag">${t}</span>`).join('');
        hotTags.querySelectorAll('.hot-tag').forEach(tag => {
            tag.addEventListener('click', () => {
                searchInput.value = tag.textContent.trim();
                doSearch(tag.textContent.trim());
                mainContent.scrollTop = 0;
            });
        });
    }

    // 初始化
    renderHotTags();
    showStatus('initial');
    updatePlayerUI();
    updatePlayPauseBtn();
    btnMode.textContent = modeIcons[playMode];
    btnMode.title = '播放模式：' + modeTitles[playMode];
    progressBarContainer.style.display = 'none';
})();
