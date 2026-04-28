(function() {
    const $ = (s) => document.querySelector(s);
    const $$ = (s) => document.querySelectorAll(s);

    const searchInput = $('#searchInput');
    const searchBtn = $('#searchBtn');
    const mainContent = $('#mainContent');
    const songList = $('#songList');
    const statusInitial = $('#statusInitial');
    const statusLoading = $('#statusLoading');
    const statusEmpty = $('#statusEmpty');
    const statusError = $('#statusError');
    const statusErrorMsg = $('#statusErrorMsg');
    const hotTags = $('#hotTags');
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
    const btnLyric = $('#btnLyric');
    const btnPlaylist = $('#btnPlaylist');
    const queueDot = $('#queueDot');
    const modalOverlay = $('#modalOverlay');
    const modalQueueList = $('#modalQueueList');
    const modalClose = $('#modalClose');
    const queueCount = $('#queueCount');
    const toastContainer = $('#toastContainer');
    const lyricPanel = $('#lyricPanel');
    const lyricContent = $('#lyricContent');
    const lyricTitle = $('#lyricTitle');
    const lyricClose = $('#lyricClose');

    const API_BASE_URL = 'https://musicapi.yued75.workers.dev';

    let playlist = [];
    let currentIndex = -1;
    let playMode = 'list';
    let isPlaying = false;
    let songUrlCache = {};
    let searchResults = [];
    let currentLyric = {};

    const modeIcons = { list:'🔁', single:'🔂', random:'🔀' };
    const modeTitles = { list:'列表循环', single:'单曲循环', random:'随机播放' };

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
        [statusInitial, statusLoading, statusEmpty, statusError].forEach(el => el.style.display='none');
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
            if(d.error==='copyright') throw new Error('copyright');
        }
        throw new Error('无法获取播放链接');
    }

    async function getLyric(songId) {
        try {
            const data = await apiCall(`/lyric?id=${songId}`);
            if(data?.lrc?.lyric) {
                return data.lrc.lyric;
            }
            return null;
        } catch(e) {
            return null;
        }
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
        } else {
            playerSongName.textContent = '未在播放';
            playerSongArtist.textContent = '选择一首歌曲开始';
            playerCoverImg.style.display = 'none';
            playerCoverArea.querySelector('.player-cover-placeholder').style.display = '';
            btnCopyLink.style.display = 'none';
            progressBarFill.style.width = '0%';
            timeCurrent.textContent = '00:00';
            timeDuration.textContent = '00:00';
        }
        updatePlayPauseBtn();
        updateQueueDot();
        renderSongListHighlight();
        renderQueueModal();
        updateLyricDisplay();
    }

    function updatePlayPauseBtn() {
        btnPlayPause.textContent = isPlaying ? '⏸️' : '▶️';
        if(isPlaying) {
            playerCoverArea.classList.add('rotating');
        } else {
            playerCoverArea.classList.remove('rotating');
        }
    }

    function updateQueueDot() {
        if(playlist.length>0) { queueDot.style.display=''; queueCount.textContent=playlist.length; }
        else { queueDot.style.display='none'; queueCount.textContent='0'; }
    }

    async function playSongAtIndex(idx) {
        if(idx<0 || idx>=playlist.length) return;
        currentIndex = idx;
        const song = playlist[idx];
        if(!song.url) {
            try {
                showToast('正在获取播放链接...');
                song.url = await getSongUrl(song.id);
            } catch(e) {
                if(e.message==='copyright') showToast('⛔ 该歌曲因版权限制无法播放', 'error');
                else showToast('📶 暂无可用的播放链接', 'error');
                return;
            }
        }
        audioPlayer.src = song.url;
        audioPlayer.currentTime = 0;
        try { await audioPlayer.play(); isPlaying = true; } catch(e) { isPlaying = false; }
        updat
