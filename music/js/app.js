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
    let playlist = [];
    let currentIndex = -1;
    let playMode = 'list';
    let isPlaying = false;
    let songUrlCache = {};
    let searchResults = [];
    let currentLyric = [];

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

    function updateLyricDisplay() {
        if (!lyricOverlay.style.display || lyricOverlay.style.display === 'none') return;
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
        const active = lyricOverlayContent.querySelector('.current');
        if(active) active.scrollIntoView({ behavior:'smooth', block:'center' });
    }

    function escapeHtml(str) {
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    function updatePlayerUI() {
        if(currentIndex>=0 && currentIndex<playlist.length) {
            const s = playlist[currentIndex];
            playerSongName.textContent = s.name;
            playerSongArtist.textContent = s.artist;
            if(s.cover) {
                playerCoverImg.src = s.cover;
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
        updateLyricDisplay();
        progressBarContainer.style.display = (currentIndex >= 0) ? '' : 'none';
    }

    function updateQueueDot() {
        if(playlist.length>0) { queueDot.style.display=''; queueCount.textContent=playlist.length; }
        else { queueDot.style.display='none'; queueCount.textContent='0'; }
    }

    async function fetchAndDisplayLyric(songId) {
        const lrc = await getLyric(songId);
        currentLyric = lrc ? parseLyric(lrc) : [];
        if (lyricOverlay.style.display !== 'none') {
            updateLyricDisplay();
        }
    }

    async function playSongAtIndex(idx) {
        if(idx<0 || idx>=playlist.length) return;
        const song = playlist[idx];
        try {
            if(!song.url) {
                showToast('正在获取播放链接...');
                song.url = await getSongUrl(song.id);
            }
            audioPlayer.src = song.url;
            currentIndex = idx;
            audioPlayer.currentTime = 0;
            try { await audioPlayer.play(); isPlaying = true; } catch(e) { isPlaying = false; }
            updatePlayerUI();
            fetchAndDisplayLyric(song.id);
            scrollToCurrentSong();
        } catch(e) {
            showToast('⛔ ' + e.message, 'error');
            // 恢复当前索引，不更新界面
            if(currentIndex !== idx) {
                // 如果之前有歌曲，重新加载原来的
                if(currentIndex >= 0 && playlist[currentIndex].url) {
                    audioPlayer.src = playlist[currentIndex].url;
                    audioPlayer.play().catch(()=>{});
                }
            }
            updatePlayerUI();
        }
    }

    function playNext() {
        if(!playlist.length) return;
        let next;
        if(playMode==='random') next = Math.floor(Math.random()*playlist.length);
        else if(playMode==='single') next = currentIndex;
        else next = (currentIndex+1)%playlist.length;
        playSongAtIndex(next);
    }

    function playPrev() {
        if(!playlist.length) return;
        if(audioPlayer.currentTime>3 && playMode!=='single') { audioPlayer.currentTime=0; return; }
        let prev;
        if(playMode==='random') prev = Math.floor(Math.random()*playlist.length);
        else if(playMode==='single') prev = currentIndex;
        else prev = (currentIndex-1+playlist.length)%playlist.length;
        playSongAtIndex(prev);
    }

    function togglePlayPause() {
        if(!playlist.length) return;
        if(isPlaying) {
            audioPlayer.pause();
            isPlaying = false;
            playerCoverArea.classList.remove('rotating');
        } else {
            if(!audioPlayer.src || audioPlayer.src===window.location.href) {
                playSongAtIndex(currentIndex>=0?currentIndex:0);
                return;
            }
            audioPlayer.play().then(()=>{ isPlaying=true; playerCoverArea.classList.add('rotating'); }).catch(()=>{ isPlaying=false; });
            isPlaying = true;
            playerCoverArea.classList.add('rotating');
        }
    }

    function scrollToCurrentSong() {
        const items = $$('.song-item');
        if(currentIndex>=0 && items.length) {
            const target = document.querySelector(`.song-item[data-queue-index="${currentIndex}"]`);
            if(target) target.scrollIntoView({behavior:'smooth',block:'center'});
        }
    }

    function renderSongList(songs) {
        songList.innerHTML = '';
        if(!songs?.length) { showStatus('empty'); return; }
        showStatus('list');
        songs.forEach((song, i) => {
            const item = document.createElement('div');
            item.className = 'song-item';
            item.dataset.songId = song.id;
            const qIdx = playlist.findIndex(s=>s.id===song.id);
            if(qIdx>=0 && qIdx===currentIndex && isPlaying) item.classList.add('playing');
            item.dataset.queueIndex = qIdx>=0?qIdx:'-1';
            const durSec = song.durationMs?Math.floor(song.durationMs/1000):(song.duration?Math.floor(song.duration/1000):0);
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
            // 点击整行：只有成功获取播放链接才加入队列
            item.addEventListener('click', async (e) => {
                if(e.target.closest('.btn-sm')) return;
                const targetSong = songs[i];
                const existIdx = playlist.findIndex(s=>s.id===targetSong.id);
                if(existIdx>=0) {
                    playSongAtIndex(existIdx);
                    return;
                }
                // 不在列表中，先获取URL
                try {
                    showToast('正在获取播放链接...');
                    const url = await getSongUrl(targetSong.id);
                    const newSong = {...targetSong, url};
                    playlist.push(newSong);
                    playSongAtIndex(playlist.length-1);
                    updatePlayerUI();
                    renderSongList(searchResults);
                } catch(err) {
                    showToast('⛔ ' + err.message, 'error');
                }
            });
            songList.appendChild(item);
        });
        bindSongListButtons();
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
        const song = searchResults.find(s=>s.id===id);
        if(song && !playlist.find(s=>s.id===id)) {
            playlist.push({...song, url: null});
            showToast('✅ 已添加到播放队列');
            updatePlayerUI();
            renderSongList(searchResults);
        } else showToast('⚠️ 歌曲已在队列中');
    }

    function renderSongListHighlight() {
        $$('.song-item').forEach(item => {
            const qIdx = parseInt(item.dataset.queueIndex||'-1');
            if(qIdx===currentIndex && isPlaying) item.classList.add('playing');
            else item.classList.remove('playing');
            const songId = parseInt(item.dataset.songId);
            const newIdx = playlist.findIndex(s=>s.id===songId);
            item.dataset.queueIndex = newIdx>=0?newIdx:'-1';
        });
    }

    async function copySongLink(songId, btn) {
        try {
            let url = songUrlCache[songId];
            if(!url) url = await getSongUrl(songId);
            await navigator.clipboard.writeText(url);
            showToast('✅ 直链已复制！', 'success');
            if(btn) { btn.classList.add('copied'); setTimeout(()=>btn.classList.remove('copied'),1500); }
        } catch(e) {
            showToast('❌ ' + e.message, 'error');
        }
    }

    function renderQueueModal() {
        if(!playlist.length) {
            modalQueueList.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:30px;">队列为空</p>';
            return;
        }
        modalQueueList.innerHTML = playlist.map((song,i) => {
            const isCurrent = i===currentIndex;
            const dur = song.durationMs?Math.floor(song.durationMs/1000):(song.duration?Math.floor(song.duration/1000):0);
            return `<div class="song-item ${isCurrent && isPlaying?'playing':''}" style="cursor:pointer;" data-queue-idx="${i}">
                <span class="song-index">${i+1}</span>
                ${song.cover ? `<img class="song-cover" src="${song.cover}" alt="">` : ''}
                <div class="song-cover-placeholder" style="${song.cover?'display:none;':''}">🎵</div>
                <div class="song-info"><div class="song-name">${escapeHtml(song.name)}</div><div class="song-artist">${escapeHtml(song.artist)}</div></div>
                <span class="song-duration">${formatTime(dur)}</span>
                <div class="song-actions" style="opacity:1;">
                    <button class="btn-sm btn-copy-queue" data-song-id="${song.id}">🔗</button>
                    <button class="btn-sm btn-remove-queue" data-idx="${i}">✕</button>
                </div>
            </div>`;
        }).join('');
        modalQueueList.querySelectorAll('.song-item').forEach(el => {
            el.addEventListener('click', (e) => {
                if(e.target.closest('.btn-sm')) return;
                playSongAtIndex(parseInt(el.dataset.queueIdx));
                modalOverlay.style.display = 'none';
            });
        });
        modalQueueList.querySelectorAll('.btn-copy-queue').forEach(btn => {
            btn.addEventListener('click', async (e) => { e.stopPropagation(); await copySongLink(parseInt(btn.dataset.songId), btn); });
        });
        modalQueueList.querySelectorAll('.btn-remove-queue').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.idx);
                if(idx===currentIndex) { audioPlayer.pause(); isPlaying=false; audioPlayer.src=''; currentIndex=-1; }
                else if(idx<currentIndex) currentIndex--;
                playlist.splice(idx,1);
                updatePlayerUI(); renderQueueModal(); renderSongList(searchResults);
                if(!playlist.length) { currentIndex=-1; isPlaying=false; audioPlayer.pause(); audioPlayer.src=''; updatePlayerUI(); }
            });
        });
        queueCount.textContent = playlist.length;
    }

    function openModal() { modalOverlay.style.display = ''; renderQueueModal(); }
    function closeModal() { modalOverlay.style.display = 'none'; }

    function toggleLyricOverlay() {
        if (currentIndex < 0) {
            showToast('请先播放一首歌曲');
            return;
        }
        const isVisible = lyricOverlay.style.display !== 'none';
        if (isVisible) {
            lyricOverlay.style.display = 'none';
        } else {
            lyricOverlay.style.display = '';
            fetchAndDisplayLyric(playlist[currentIndex].id);
        }
    }
    lyricOverlayClose.addEventListener('click', () => { lyricOverlay.style.display = 'none'; });
    lyricOverlay.addEventListener('click', (e) => {
        if (e.target === lyricOverlay) lyricOverlay.style.display = 'none';
    });
    playerCoverArea.addEventListener('click', toggleLyricOverlay);
    lyricOverlayContent.addEventListener('click', (e) => {
        const p = e.target.closest('p');
        if(p && p.dataset.time) {
            audioPlayer.currentTime = parseFloat(p.dataset.time);
        }
    });

    // 搜索
    let searchTimer;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimer);
        const val = searchInput.value.trim();
        if(!val) { showStatus('initial'); renderHotTags(); return; }
        searchTimer = setTimeout(() => doSearch(val), 400);
    });
    searchBtn.addEventListener('click', () => {
        clearTimeout(searchTimer);
        const val = searchInput.value.trim();
        if(!val) { showToast('请输入搜索关键词'); return; }
        doSearch(val);
    });
    searchInput.addEventListener('keydown', (e) => {
        if(e.key==='Enter') {
            clearTimeout(searchTimer);
            const val = searchInput.value.trim();
            if(val) doSearch(val);
        }
    });

    async function doSearch(keyword) {
        showStatus('loading');
        try {
            const songs = await searchSongs(keyword);
            searchResults = songs;
            if(!songs.length) { showStatus('empty'); songList.innerHTML = ''; }
            else renderSongList(songs);
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
    let dragging = false;
    progressBarWrap.addEventListener('mousedown', (e) => { dragging=true; updateProgress(e); });
    document.addEventListener('mousemove', (e) => { if(dragging) updateProgress(e); });
    document.addEventListener('mouseup', () => { dragging=false; });
    progressBarWrap.addEventListener('touchstart', (e) => { dragging=true; updateProgress(e.touches[0]); });
    document.addEventListener('touchmove', (e) => { if(dragging) updateProgress(e.touches[0]); });
    document.addEventListener('touchend', () => { dragging=false; });
    function updateProgress(e) {
        if(!audioPlayer.duration || isNaN(audioPlayer.duration)) return;
        const rect = progressBarWrap.getBoundingClientRect();
        audioPlayer.currentTime = Math.max(0, Math.min(1, (e.clientX-rect.left)/rect.width)) * audioPlayer.duration;
    }

    volumeSlider.addEventListener('input', () => { audioPlayer.volume = volumeSlider.value/100; });
    audioPlayer.volume = 0.7;

    audioPlayer.addEventListener('timeupdate', () => {
        if(audioPlayer.duration && !isNaN(audioPlayer.duration)) {
            progressBarFill.style.width = (audioPlayer.currentTime/audioPlayer.duration)*100 + '%';
            timeCurrent.textContent = formatTime(audioPlayer.currentTime);
            timeDuration.textContent = formatTime(audioPlayer.duration);
            if(currentLyric.length) updateLyricDisplay();
        }
    });
    audioPlayer.addEventListener('loadedmetadata', () => { timeDuration.textContent = formatTime(audioPlayer.duration); });
    audioPlayer.addEventListener('play', () => { isPlaying=true; playerCoverArea.classList.add('rotating'); });
    audioPlayer.addEventListener('pause', () => { isPlaying=false; playerCoverArea.classList.remove('rotating'); });
    audioPlayer.addEventListener('ended', () => {
        isPlaying=false;
        playerCoverArea.classList.remove('rotating');
        if(playMode==='single') { audioPlayer.currentTime=0; audioPlayer.play(); isPlaying=true; playerCoverArea.classList.add('rotating'); }
        else playNext();
    });
    audioPlayer.addEventListener('error', () => {
        isPlaying=false; playerCoverArea.classList.remove('rotating');
        const cur = playlist[currentIndex];
        if(cur) {
            delete songUrlCache[cur.id]; cur.url=null;
            showToast('⚠️ 播放失败，重试中...', 'error');
            setTimeout(() => { if(currentIndex>=0 && playlist[currentIndex]===cur) playSongAtIndex(currentIndex); }, 1500);
        }
    });

    document.addEventListener('keydown', (e) => {
        if(e.target.tagName==='INPUT') return;
        if(e.key==='ArrowRight') { e.preventDefault(); audioPlayer.currentTime = Math.min(audioPlayer.duration||0, audioPlayer.currentTime+5); }
        else if(e.key==='ArrowLeft') { e.preventDefault(); audioPlayer.currentTime = Math.max(0, audioPlayer.currentTime-5); }
        else if(e.key==='ArrowUp') { e.preventDefault(); audioPlayer.volume = Math.min(1, audioPlayer.volume+0.1); volumeSlider.value=Math.round(audioPlayer.volume*100); }
        else if(e.key==='ArrowDown') { e.preventDefault(); audioPlayer.volume = Math.max(0, audioPlayer.volume-0.1); volumeSlider.value=Math.round(audioPlayer.volume*100); }
    });

    btnPlayPause.addEventListener('click', togglePlayPause);
    btnPrev.addEventListener('click', playPrev);
    btnNext.addEventListener('click', playNext);
    btnCopyLink.addEventListener('click', async () => {
        if(currentIndex>=0 && currentIndex<playlist.length) await copySongLink(playlist[currentIndex].id);
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
        if(e.key==='Escape') { closeModal(); lyricOverlay.style.display = 'none'; }
        if(e.key===' ' && e.target===document.body) { e.preventDefault(); togglePlayPause(); }
    });

    // 初始化
    renderHotTags();
    showStatus('initial');
    updatePlayerUI();
    btnMode.textContent = modeIcons[playMode];
    btnMode.title = '播放模式：'+modeTitles[playMode];
    volumeSlider.value = 70;
    audioPlayer.volume = 0.7;
    progressBarContainer.style.display = 'none';
})();
