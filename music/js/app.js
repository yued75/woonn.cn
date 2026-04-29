(function() {
    const $ = (s) => document.querySelector(s);
    const $$ = (s) => document.querySelectorAll(s);

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
    const volumeSlider = $('#volumeSlider');
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

    const API_BASE_URL = 'https://musicapi.yued75.workers.dev';
    let playlist = [];               // 播放队列
    let searchResults = [];         // 当前搜索结果
    let playMode = 'list';          // list / single / random
    let isPlaying = false;
    let songUrlCache = {};
    let currentLyric = [];

    // 当前播放的歌曲对象（可以来自队列或搜索结果）
    let currentSong = null;
    // 队列游标（仅在队列模式使用）
    let queueIndex = -1;
    // 搜索结果游标（仅在无队列时使用）
    let searchIndex = -1;

    // 歌词拖拽相关变量
    let isManualScroll = false;
    let manualScrollTimer = null;
    const SCROLL_BACK_DELAY = 3000;

    const modeIcons = { list:'🔁', single:'🔂', random:'🔀' };
    const modeTitles = { list:'列表循环', single:'单曲循环', random:'随机播放' };

    const keywordPool = [
        '周杰伦','Taylor Swift','告五人','纯音乐','电音','爵士','说唱','陈奕迅',
        '林俊杰','邓紫棋','BTS','钢琴曲','古风','轻音乐','R&B','摇滚','朴树',
        '许巍','蔡依林','孙燕姿','薛之谦','毛不易','赵雷','华语流行','欧美经典'
    ];

    function getRandomKeywords(count = 8) {
        const shuffled = [...keywordPool].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

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

    function formatTime(s) {
        if(!s || isNaN(s)) return '00:00';
        const m = Math.floor(s/60), sec = Math.floor(s%60);
        return String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0');
    }

    function showToast(msg, type='') {
        const t = document.createElement('div');
        t.className = 'toast '+type; t.textContent = msg;
        toastContainer.appendChild(t);
        setTimeout(() => { if(t.parentNode) t.remove(); }, 2200);
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

    async function apiCall(endpoint) {
        const resp = await fetch(API_BASE_URL + endpoint);
        if(!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return await resp.json();
    }

    async function searchSongs(keyword) {
        const data = await apiCall(`/search?keywords=${encodeURIComponent(keyword)}&limit=40`);
        if(!data?.result?.songs) throw new Error('数据异常');
        return data.result.songs.map(song => ({
            id: song.id,
            name: song.name || '未知歌曲',
            artist: (song.artists?.map(a=>a.name).join(' / ')) || '未知歌手',
            cover: song.album?.picUrl || '',
            duration: song.duration || 0,
            durationMs: song.dt || song.duration || 0,
        }));
    }

    async function getSongUrl(songId) {
        if(songUrlCache[songId]) return songUrlCache[songId];
        const data = await apiCall(`/song/url?id=${songId}`);
        if(data?.data?.length>0) {
            const d = data.data[0];
            if(d.url) { songUrlCache[songId] = d.url; return d.url; }
            if(d.error==='copyright') throw new Error('该歌曲因版权限制无法播放');
        }
        throw new Error('无法获取播放链接，请稍后重试');
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

    function autoScrollToCurrentLyric() {
        if (lyricOverlay.style.display === 'none' || !currentLyric.length) return;
        const currentTime = audioPlayer.currentTime || 0;
        let activeIndex = -1;
        for(let i=0; i<currentLyric.length; i++) {
            if(currentTime >= currentLyric[i].time) activeIndex = i;
        }
        if(activeIndex >= 0) {
            const allLines = lyricOverlayContent.querySelectorAll('p');
            const target = allLines[activeIndex];
            if(target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    function setManualMode() {
        isManualScroll = true;
        clearTimeout(manualScrollTimer);
        manualScrollTimer = setTimeout(() => {
            isManualScroll = false;
            autoScrollToCurrentLyric();
        }, SCROLL_BACK_DELAY);
    }

    function updateLyricDisplay() {
        if (lyricOverlay.style.display === 'none') return;
        if(!currentLyric.length) {
            lyricOverlayContent.innerHTML = '<p class="lyric-empty">暂无歌词</p>';
            return;
        }
        const currentTime = audioPlayer.currentTime || 0;
        let activeIndex = -1;
        for(let i=0; i<currentLyric.length; i++) {
            if(currentTime >= currentLyric[i].time) activeIndex = i;
        }
        lyricOverlayContent.innerHTML = currentLyric.map((line, i) => {
            const cls = i===activeIndex ? 'current' : '';
            return `<p class="${cls}" data-time="${line.time}">${escapeHtml(line.text)}</p>`;
        }).join('');
        if (!isManualScroll) autoScrollToCurrentLyric();
    }

    function escapeHtml(str) {
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    // ---------- UI 更新 ----------
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

    // 高亮当前播放的歌曲（搜索列表或队列弹窗中）
    function renderSongListHighlight() {
        $$('.song-item').forEach(item => {
            item.classList.remove('playing');
        });
        if (!currentSong) return;
        // 在搜索结果列表中高亮
        if (searchResults.length > 0) {
            const searchItem = document.querySelector(`.song-item[data-song-id="${currentSong.id}"]`);
            if (searchItem) searchItem.classList.add('playing');
        }
        // 在队列弹窗中高亮（如果打开的话）
        const queueItems = modalQueueList.querySelectorAll('.song-item');
        queueItems.forEach(item => {
            item.classList.remove('playing');
            if (item.dataset.songId == currentSong.id) item.classList.add('playing');
        });
    }

    // ---------- 播放核心 ----------
    async function playSong(song, updateIndex = true) {
        // 统一播放入口：获取URL，更新 currentSong，播放
        try {
            if (!song.url) {
                showToast('正在获取播放链接...');
                song.url = await getSongUrl(song.id);
            }
            audioPlayer.src = song.url;
            currentSong = song;
            audioPlayer.currentTime = 0;
            try { await audioPlayer.play(); isPlaying = true; } catch(e) { isPlaying = false; }
            updatePlayerUI();
            updatePlayPauseBtn();
            fetchAndDisplayLyric(song.id);
            scrollToCurrentSong();
            return true;
        } catch(e) {
            showToast('⛔ ' + e.message, 'error');
            // 播放失败，保留原来的 currentSong（如果有的话），否则清空
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

    // 播放队列中指定索引的歌曲
    async function playQueueAt(index) {
        if (index < 0 || index >= playlist.length) return;
        queueIndex = index;
        const song = playlist[index];
        // 确保 song 有 url
        const success = await playSong(song, false);
        if (success) {
            // 如果这首歌也在 searchResults 中，更新 searchIndex（可选，不影响队列模式）
            const sIdx = searchResults.findIndex(s => s.id === song.id);
            if (sIdx >= 0) searchIndex = sIdx;
        }
    }

    // 播放搜索结果中指定索引的歌曲
    async function playSearchAt(index) {
        if (index < 0 || index >= searchResults.length) return;
        searchIndex = index;
        const song = searchResults[index];
        // 如果队列非空，但用户强制从搜索结果点击播放，我们更新队列索引吗？按需求：队列有歌曲仍按队列切换，但当前播放可以来自搜索。此时 queueIndex 保持不变（不更新），以便上/下一曲回到队列。但我们仍需要记录 queueIndex 的有效值，避免越界。这里我们不清除 queueIndex，让它保持原来的值。如果当前队列为空，queueIndex 为 -1。
        const success = await playSong(song, false);
        if (success && playlist.length === 0) {
            // 无队列时，searchIndex 已在上面更新
        }
    }

    // 播放当前歌曲（单曲循环用）
    async function replayCurrent() {
        if (!currentSong) return;
        audioPlayer.currentTime = 0;
        audioPlayer.play();
        isPlaying = true;
        updatePlayPauseBtn();
    }

    // 获取下一首的索引（根据队列是否为空决定）
    function getNextIndex() {
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

    function getPrevIndex() {
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

    async function playNext() {
        if (playMode === 'single') {
            replayCurrent();
            return;
        }
        if (playlist.length > 0) {
            const next = getNextIndex();
            if (next >= 0) await playQueueAt(next);
        } else if (searchResults.length > 0) {
            const next = getNextIndex();
            if (next >= 0) await playSearchAt(next);
        }
    }

    async function playPrev() {
        if (playMode === 'single') {
            replayCurrent();
            return;
        }
        // 如果播放超过3秒，重放当前歌曲
        if (audioPlayer.currentTime > 3 && playMode !== 'single') {
            if (currentSong) {
                audioPlayer.currentTime = 0;
                audioPlayer.play();
                return;
            }
        }
        if (playlist.length > 0) {
            const prev = getPrevIndex();
            if (prev >= 0) await playQueueAt(prev);
        } else if (searchResults.length > 0) {
            const prev = getPrevIndex();
            if (prev >= 0) await playSearchAt(prev);
        }
    }

    function togglePlayPause() {
        if (!currentSong) {
            // 没有当前歌曲，尝试从队列或搜索列表开始
            if (playlist.length > 0) {
                playQueueAt(0);
            } else if (searchResults.length > 0) {
                playSearchAt(0);
            }
            return;
        }
        if (isPlaying) {
            audioPlayer.pause();
            isPlaying = false;
            playerCoverArea.classList.remove('rotating');
        } else {
            audioPlayer.play().then(() => { isPlaying = true; playerCoverArea.classList.add('rotating'); }).catch(() => {});
            isPlaying = true;
            playerCoverArea.classList.add('rotating');
        }
        updatePlayPauseBtn();
    }

    function scrollToCurrentSong() {
        // 尝试滚动搜索结果或队列弹窗中当前歌曲
        const target = document.querySelector(`.song-item[data-song-id="${currentSong?.id}"]`);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    async function fetchAndDisplayLyric(songId) {
        const lrc = await getLyric(songId);
        currentLyric = lrc ? parseLyric(lrc) : [];
        isManualScroll = false;
        clearTimeout(manualScrollTimer);
        if (lyricOverlay.style.display !== 'none') updateLyricDisplay();
    }

    // ---------- 渲染搜索结果列表 ----------
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
            // 点击行：仅播放，不加入队列
            item.addEventListener('click', async (e) => {
                if (e.target.closest('.btn-sm')) return;
                // 直接调用播放搜索歌曲
                await playSearchAt(i);
                updatePlayerUI();
            });
            songList.appendChild(item);
        });
        bindSongListButtons();
        renderSongListHighlight(); // 立即高亮当前歌曲
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
            showToast('✅ 已添加到播放队列');
            updateQueueDot();
            renderQueueModal(); // 更新弹窗
        } else {
            showToast('⚠️ 歌曲已在队列中');
        }
    }

    // ---------- 队列弹窗 ----------
    function renderQueueModal() {
        if (!playlist.length) {
            modalQueueList.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:30px;">队列为空</p>';
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
            // 点击队列中的歌曲：播放该歌曲，并更新队列索引
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
                    // 如果移除的是当前播放且队列模式，需要处理
                    if (playlist.length > 0 && idx === queueIndex && currentSong && playlist[idx].id === currentSong.id) {
                        // 先停止播放
                        audioPlayer.pause();
                        isPlaying = false;
                        audioPlayer.src = '';
                        currentSong = null;
                        // 从队列移除
                        playlist.splice(idx, 1);
                        // 调整索引
                        if (playlist.length > 0) {
                            queueIndex = Math.min(idx, playlist.length - 1);
                        } else {
                            queueIndex = -1;
                            // 如果搜索结果还存在，可以继续从搜索结果播放？我们清空 currentSong
                        }
                    } else {
                        if (idx < queueIndex) queueIndex--;
                        playlist.splice(idx, 1);
                    }
                    updatePlayerUI();
                    renderQueueModal();
                    renderSongList(searchResults);
                    if (!playlist.length && !currentSong) {
                        // 尝试播放搜索列表第一首？根据需求可以不自动播放
                    }
                });
            });
        }
        updateQueueDot();
        renderSongListHighlight();
    }

    function openModal() { modalOverlay.style.display = ''; renderQueueModal(); }
    function closeModal() { modalOverlay.style.display = 'none'; }

    async function copySongLink(songId, btn) {
        try {
            let url = songUrlCache[songId];
            if (!url) url = await getSongUrl(songId);
            await navigator.clipboard.writeText(url);
            showToast('✅ 直链已复制！', 'success');
            if (btn) { btn.classList.add('copied'); setTimeout(() => btn.classList.remove('copied'), 1500); }
        } catch(e) {
            showToast('❌ ' + e.message, 'error');
        }
    }

    // 歌词全屏控制
    function toggleLyricOverlay() {
        if (!currentSong) {
            showToast('请先播放一首歌曲');
            return;
        }
        const isVisible = lyricOverlay.style.display !== 'none';
        if (isVisible) {
            lyricOverlay.style.display = 'none';
        } else {
            lyricOverlay.style.display = '';
            isManualScroll = false;
            clearTimeout(manualScrollTimer);
            fetchAndDisplayLyric(currentSong.id);
        }
    }

    lyricOverlayClose.addEventListener('click', () => { lyricOverlay.style.display = 'none'; });
    lyricOverlay.addEventListener('click', (e) => { if (e.target === lyricOverlay) lyricOverlay.style.display = 'none'; });
    playerCoverArea.addEventListener('click', toggleLyricOverlay);

    // 歌词点击跳转
    lyricOverlayContent.addEventListener('click', (e) => {
        const p = e.target.closest('p');
        if (p && p.dataset.time) {
            audioPlayer.currentTime = parseFloat(p.dataset.time);
            setManualMode();
        }
    });

    // 滚动和拖拽事件
    lyricOverlayContent.addEventListener('wheel', setManualMode);
    lyricOverlayContent.addEventListener('touchmove', setManualMode);
    let isDragging = false, startY = 0, startScrollTop = 0;
    lyricOverlayContent.addEventListener('mousedown', (e) => {
        isDragging = true;
        startY = e.clientY;
        startScrollTop = lyricOverlayContent.scrollTop;
        lyricOverlayContent.style.cursor = 'grabbing';
        e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dy = e.clientY - startY;
        lyricOverlayContent.scrollTop = startScrollTop - dy;
        setManualMode();
    });
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            lyricOverlayContent.style.cursor = 'grab';
        }
    });

    // 搜索相关
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

    // 进度条
    progressBarWrap.addEventListener('click', (e) => {
        if(!audioPlayer.duration || isNaN(audioPlayer.duration)) return;
        const rect = progressBarWrap.getBoundingClientRect();
        audioPlayer.currentTime = ((e.clientX-rect.left)/rect.width) * audioPlayer.duration;
    });
    let progressDragging = false;
    progressBarWrap.addEventListener('mousedown', (e) => { progressDragging=true; updateProgress(e); });
    document.addEventListener('mousemove', (e) => { if(progressDragging) updateProgress(e); });
    document.addEventListener('mouseup', () => { progressDragging=false; });
    progressBarWrap.addEventListener('touchstart', (e) => { progressDragging=true; updateProgress(e.touches[0]); });
    document.addEventListener('touchmove', (e) => { if(progressDragging) updateProgress(e.touches[0]); });
    document.addEventListener('touchend', () => { progressDragging=false; });
    function updateProgress(e) {
        if(!audioPlayer.duration || isNaN(audioPlayer.duration)) return;
        const rect = progressBarWrap.getBoundingClientRect();
        audioPlayer.currentTime = Math.max(0, Math.min(1, (e.clientX-rect.left)/rect.width)) * audioPlayer.duration;
    }

    volumeSlider.addEventListener('input', () => { audioPlayer.volume = volumeSlider.value/100; });
    audioPlayer.volume = 0.7;

    audioPlayer.addEventListener('timeupdate', () => {
        if (audioPlayer.duration && !isNaN(audioPlayer.duration)) {
            progressBarFill.style.width = (audioPlayer.currentTime/audioPlayer.duration)*100 + '%';
            timeCurrent.textContent = formatTime(audioPlayer.currentTime);
            timeDuration.textContent = formatTime(audioPlayer.duration);
            if (currentLyric.length) updateLyricDisplay();
        }
    });
    audioPlayer.addEventListener('loadedmetadata', () => { timeDuration.textContent = formatTime(audioPlayer.duration); });
    audioPlayer.addEventListener('play', () => { isPlaying=true; playerCoverArea.classList.add('rotating'); updatePlayPauseBtn(); });
    audioPlayer.addEventListener('pause', () => { isPlaying=false; playerCoverArea.classList.remove('rotating'); updatePlayPauseBtn(); });
    audioPlayer.addEventListener('ended', () => {
        isPlaying=false;
        playerCoverArea.classList.remove('rotating');
        if (playMode === 'single') {
            replayCurrent();
        } else {
            playNext();
        }
        updatePlayPauseBtn();
    });
    audioPlayer.addEventListener('error', () => {
        isPlaying=false; playerCoverArea.classList.remove('rotating');
        updatePlayPauseBtn();
        const cur = currentSong;
        if (cur) {
            delete songUrlCache[cur.id];
            cur.url = null;
            showToast('⚠️ 播放失败，尝试下一首...', 'error');
            setTimeout(() => {
                if (currentSong === cur) playNext();
            }, 1500);
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT') return;
        if (e.key === 'ArrowRight') { e.preventDefault(); audioPlayer.currentTime = Math.min(audioPlayer.duration||0, audioPlayer.currentTime+5); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); audioPlayer.currentTime = Math.max(0, audioPlayer.currentTime-5); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); audioPlayer.volume = Math.min(1, audioPlayer.volume+0.1); volumeSlider.value=Math.round(audioPlayer.volume*100); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); audioPlayer.volume = Math.max(0, audioPlayer.volume-0.1); volumeSlider.value=Math.round(audioPlayer.volume*100); }
    });

    btnPlayPause.addEventListener('click', togglePlayPause);
    btnPrev.addEventListener('click', playPrev);
    btnNext.addEventListener('click', playNext);
    btnCopyLink.addEventListener('click', async () => {
        if (currentSong) await copySongLink(currentSong.id);
        else showToast('⚠️ 请先播放一首歌曲');
    });
    btnMode.addEventListener('click', () => {
        const modes = ['list','single','random'];
        const idx = modes.indexOf(playMode);
        playMode = modes[(idx+1)%3];
        btnMode.textContent = modeIcons[playMode];
        btnMode.title = '播放模式：'+modeTitles[playMode];
        btnMode.classList.toggle('active', playMode!=='list');
        showToast('🔄 '+modeTitles[playMode]);
    });
    btnPlaylist.addEventListener('click', openModal);
    modalClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => { if(e.target===modalOverlay) closeModal(); });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { closeModal(); lyricOverlay.style.display = 'none'; }
        if (e.key === ' ' && e.target === document.body) { e.preventDefault(); togglePlayPause(); }
    });

    // 初始化
    renderHotTags();
    showStatus('initial');
    updatePlayerUI();
    updatePlayPauseBtn();
    btnMode.textContent = modeIcons[playMode];
    btnMode.title = '播放模式：'+modeTitles[playMode];
    volumeSlider.value = 70;
    audioPlayer.volume = 0.7;
    progressBarContainer.style.display = 'none';
})();
