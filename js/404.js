(function() {
  // ========== 公益项目配置 ==========
  const PROJECTS = [
    {
      id: 'ocean', name: '海洋减塑', emoji: '🌊',
      desc: '每年数百万吨塑料流入海洋，伤害海洋生命。点击清除塑料垃圾！',
      goal: '目标：清除 20 个塑料垃圾',
      comment: '你成功清理了海洋垃圾，为海洋生态贡献了力量！',
      gameType: 'ocean',
      specificWord: '拒绝使用一次性塑料'
    },
    {
      id: 'forest', name: '绿色森林', emoji: '🌳',
      desc: '森林是地球之肺，一起在荒地上种下希望之树！',
      goal: '目标：种植 10 棵树苗',
      comment: '你种下的树苗将长成参天大树，感谢你的付出！',
      gameType: 'forest',
      specificWord: '节约用纸，拒绝非法木材'
    },
    {
      id: 'animal', name: '拯救动物', emoji: '🐾',
      desc: '小动物从高处坠落，移动救援垫接住它们！',
      goal: '目标：接住 15 只小动物',
      comment: '你拯救了这些可爱的小生命，动物们感谢你！',
      gameType: 'animal',
      specificWord: '拒绝买卖野生动物制品'
    },
    {
      id: 'virus', name: '消灭病毒', emoji: '💊',
      desc: '精准消灭病毒，守护健康防线！',
      goal: '目标：消灭 30 个病毒',
      comment: '你是一名勇敢的战士，为抗击疾病做出了贡献！',
      gameType: 'virus',
      specificWord: '支持公共卫生事业'
    }
  ];

  const HUMOR_TEMPLATES = [
    '你访问的页面已消失在历史长河，但你可以 {word} ！',
    '页面被外星人抓走了，但你可以 {word} 防止它们也被抓走。',
    '这个页面像森林一样消失了，但你可以 {word} 让地球更好。',
    '页面可能迷路了，但善意从不迷路，来 {word} 吧。',
    '啊哦，页面走丢了，不过你可以 {word} ，帮助需要帮助的生命。'
  ];

  const isMobile = /mobile/i.test(navigator.userAgent);
  const BG_IMAGES = isMobile
    ? ['img/绿色找回1m.png', 'img/绿色找回2m.jpg', 'img/台风m.jpg', 'img/残障人士m.png']
    : ['img/绿色找回1.png', 'img/绿色找回2.jpg', 'img/台风.jpg', 'img/障碍人士.png'];

  // ========== 游戏类定义 ==========
  class OceanGame {
    constructor(w, h) { this.width = w; this.height = h; this.target = 20; this.trash = []; this.frame = 0; this.score = 0; }
    reset() { this.trash = []; this.frame = 0; this.score = 0; }
    update() {
      this.frame++;
      if (this.frame % 45 === 0 && this.trash.length < 25) {
        const types = ['bottle','bag','can'];
        this.trash.push({
          x: 30 + Math.random() * (this.width - 60),
          y: 30 + Math.random() * (this.height - 80),
          type: types[Math.floor(Math.random() * types.length)]
        });
      }
    }
    draw(ctx) {
      this.trash.forEach(t => {
        ctx.save(); ctx.translate(t.x, t.y);
        ctx.fillStyle = '#666';
        if (t.type === 'bottle') { ctx.fillRect(-5, -12, 10, 24); ctx.fillStyle = '#8bc34a'; ctx.fillRect(-5, -14, 10, 4); }
        else if (t.type === 'bag') { ctx.beginPath(); ctx.ellipse(0, 0, 9, 12, 0, 0, Math.PI*2); ctx.fill(); }
        else { ctx.fillRect(-6, -10, 12, 20); ctx.fillStyle = '#aaa'; ctx.fillRect(-6, -12, 12, 3); }
        ctx.restore();
      });
    }
    onClick(x, y) {
      for (let i = this.trash.length - 1; i >= 0; i--) {
        if (Math.hypot(x - this.trash[i].x, y - this.trash[i].y) < 18) {
          this.trash.splice(i, 1); this.score++; break;
        }
      }
    }
    checkWin() { return this.score >= this.target; }
    getProgress() { return `${this.score} / ${this.target}`; }
  }

  class ForestGame {
    constructor(w, h) { this.width = w; this.height = h; this.target = 10; this.trees = []; }
    reset() { this.trees = []; }
    update() {}
    draw(ctx) {
      this.trees.forEach(t => {
        if (t.growth < 1) t.growth += 0.02;
        const g = Math.min(t.growth, 1);
        ctx.save(); ctx.translate(t.x, t.y);
        ctx.fillStyle = '#5d4037'; ctx.fillRect(-3, -25 * g, 6, 25 * g);
        ctx.fillStyle = '#2e7d32'; ctx.beginPath(); ctx.arc(0, -30 * g, 15 * g, 0, Math.PI*2); ctx.fill();
        ctx.restore();
      });
      if (this.trees.length >= this.target && this.trees.every(t => t.growth >= 1)) this.score = this.target;
    }
    onClick(x, y) {
      if (this.trees.length >= this.target) return;
      if (y > this.height * 0.5 && y < this.height * 0.72) {
        this.trees.push({ x, y, growth: 0 });
        this.score = this.trees.length;
      }
    }
    checkWin() { return this.trees.length >= this.target && this.trees.every(t => t.growth >= 1); }
    getProgress() { return `${this.trees.length} / ${this.target}`; }
  }

  class AnimalGame {
    constructor(w, h) {
      this.width = w; this.height = h; this.target = 15;
      this.animals = []; this.lives = 3; this.padX = w/2;
      this.PAD_W = 100; this.PAD_Y = h - 50; this.frame = 0; this.score = 0;
    }
    reset() { this.animals = []; this.lives = 3; this.frame = 0; this.score = 0; this.padX = this.width/2; }
    update() {
      this.frame++;
      if (this.frame % 50 === 0 && this.animals.length < 20) {
        const emojis = ['🐼','🐨','🐯','🐰','🦊'];
        this.animals.push({
          x: 30 + Math.random() * (this.width - 60),
          y: -20, speed: 1.5 + Math.random() * 2.5,
          emoji: emojis[Math.floor(Math.random() * emojis.length)]
        });
      }
      for (let i = this.animals.length - 1; i >= 0; i--) {
        const a = this.animals[i]; a.y += a.speed;
        if (a.y > this.PAD_Y - 10 && a.y < this.PAD_Y + 20 && a.x > this.padX - this.PAD_W/2 && a.x < this.padX + this.PAD_W/2) {
          this.score++; this.animals.splice(i, 1); continue;
        }
        if (a.y > this.height + 30) { this.animals.splice(i, 1); this.lives--; }
      }
    }
    draw(ctx) {
      this.animals.forEach(a => { ctx.font = '26px "Segoe UI Emoji"'; ctx.fillText(a.emoji, a.x - 13, a.y + 10); });
      ctx.fillStyle = '#ff7043'; ctx.fillRect(this.padX - this.PAD_W/2, this.PAD_Y, this.PAD_W, 12);
    }
    onMove(x) { this.padX = Math.min(Math.max(x, this.PAD_W/2), this.width - this.PAD_W/2); }
    checkWin() { return this.score >= this.target; }
    isGameOver() { return this.lives <= 0; }
    getProgress() { return `${this.score} / ${this.target}  ❤️${this.lives}`; }
  }

  class VirusGame {
    constructor(w, h) {
      this.width = w; this.height = h; this.target = 30;
      this.viruses = []; this.frame = 0; this.score = 0;
    }
    reset() { this.viruses = []; this.frame = 0; this.score = 0; }
    update() {
      this.frame++;
      if (this.frame % 35 === 0 && this.viruses.length < 25) {
        this.viruses.push({
          x: 30 + Math.random() * (this.width - 60),
          y: 30 + Math.random() * (this.height - 60),
          vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, r: 12
        });
      }
      this.viruses.forEach(v => {
        v.x += v.vx; v.y += v.vy;
        if (v.x < 15 || v.x > this.width - 15) v.vx *= -1;
        if (v.y < 15 || v.y > this.height - 15) v.vy *= -1;
      });
    }
    draw(ctx) {
      this.viruses.forEach(v => {
        ctx.save(); ctx.translate(v.x, v.y);
        ctx.fillStyle = '#e040fb';
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          const rad = i % 2 === 0 ? v.r * 1.2 : v.r;
          if (i === 0) ctx.moveTo(rad, 0);
          else ctx.lineTo(Math.cos(angle)*rad, Math.sin(angle)*rad);
        }
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.fill();
        ctx.restore();
      });
    }
    onClick(x, y) {
      for (let i = this.viruses.length - 1; i >= 0; i--) {
        if (Math.hypot(x - this.viruses[i].x, y - this.viruses[i].y) < this.viruses[i].r + 6) {
          this.viruses.splice(i, 1); this.score++; break;
        }
      }
    }
    checkWin() { return this.score >= this.target; }
    getProgress() { return `${this.score} / ${this.target}`; }
  }

  // ========== 主控制器 ==========
  const App = {
    currentProject: null,
    game: null,
    gameType: null,
    state: 'idle',
    animFrame: null,
    canvas: null,
    ctx: null,
    width: 600,
    height: 400,
    supported: new Set(),

    init() {
      const mode = Math.floor(Math.random() * 4); // 0:背景图 1:宝贝回家 2:小游戏 3:腾讯失踪儿童
      this.currentProject = PROJECTS[Math.floor(Math.random() * PROJECTS.length)];
      this.gameType = this.currentProject.gameType;
      this.setHumorText();

      if (mode === 0) this.showBackgroundImage();
      else if (mode === 1) this.showMissingChild();
      else if (mode === 2) this.showGame();
      else if (mode === 3) this.showLostChild();

      this.bindEvents();
    },

    setHumorText() {
      const tpl = HUMOR_TEMPLATES[Math.floor(Math.random() * HUMOR_TEMPLATES.length)];
      document.getElementById('dynamicMessage').textContent = tpl.replace('{word}', this.currentProject.specificWord);
    },

    showBackgroundImage() {
      document.getElementById('bg').style.display = 'block';
      document.getElementById('bg').style.backgroundImage = `url(${BG_IMAGES[Math.floor(Math.random() * BG_IMAGES.length)]})`;
      document.getElementById('gameSection').style.display = 'none';
      document.querySelector('.mod_404').style.display = 'none';
      document.querySelector('.collage-404').style.display = 'none';
      document.getElementById('lostchildSection').style.display = 'none';
    },

    showMissingChild() {
      document.getElementById('bg').style.display = 'none';
      document.getElementById('gameSection').style.display = 'none';
      document.getElementById('lostchildSection').style.display = 'none';
      document.querySelector('.mod_404').style.display = 'block';
      document.querySelector('.collage-404').style.display = 'block';
      if (!document.querySelector('script[src*="404.new.js"]')) {
        const s = document.createElement('script');
        s.src = '//cdn.zhaolinlang.com/cdn.dnpw.org/project/404/0/common/404.new.js';
        document.head.appendChild(s);
      }
    },

    showLostChild() {
      document.getElementById('bg').style.display = 'none';
      document.getElementById('gameSection').style.display = 'none';
      document.querySelector('.mod_404').style.display = 'none';
      document.querySelector('.collage-404').style.display = 'none';
      document.getElementById('lostchildSection').style.display = 'block';
      if (!document.querySelector('script[src*="search_children.js"]')) {
        const s = document.createElement('script');
        s.src = 'https://qzonestyle.gtimg.cn/qzone_v6/lostchild/search_children.js';
        document.head.appendChild(s);
      }
    },

    showGame() {
      document.getElementById('bg').style.display = 'none';
      document.querySelector('.mod_404').style.display = 'none';
      document.querySelector('.collage-404').style.display = 'none';
      document.getElementById('lostchildSection').style.display = 'none';
      const section = document.getElementById('gameSection');
      section.style.display = 'block';
      this.canvas = document.getElementById('gameCanvas');
      this.ctx = this.canvas.getContext('2d');
      this.resizeCanvas();
      window.addEventListener('resize', () => this.resizeCanvas());

      document.getElementById('introTitle').innerHTML = `${this.currentProject.emoji} ${this.currentProject.name}`;
      document.getElementById('introDesc').textContent = this.currentProject.desc;
      document.getElementById('introGoal').textContent = this.currentProject.goal;
      document.getElementById('introCard').classList.remove('hidden');
      document.getElementById('endCard').classList.add('hidden');
      document.getElementById('overlay').classList.add('active');
      this.state = 'idle';
    },

    resizeCanvas() {
      const wrapper = document.getElementById('gameWrapper');
      const rect = wrapper.getBoundingClientRect();
      this.canvas.width = this.width;
      this.canvas.height = this.height;
      this.canvas.style.width = rect.width + 'px';
      this.canvas.style.height = rect.height + 'px';
    },

    startGame() {
      if (this.animFrame) cancelAnimationFrame(this.animFrame);
      switch (this.gameType) {
        case 'ocean': this.game = new OceanGame(this.width, this.height); break;
        case 'forest': this.game = new ForestGame(this.width, this.height); break;
        case 'animal': this.game = new AnimalGame(this.width, this.height); break;
        case 'virus': this.game = new VirusGame(this.width, this.height); break;
      }
      this.game.reset();
      this.state = 'playing';
      document.getElementById('overlay').classList.remove('active');
      this.loop();
    },

    endGame() {
      this.state = 'end';
      if (this.animFrame) cancelAnimationFrame(this.animFrame);
      document.getElementById('endComment').textContent = this.currentProject.comment;
      document.getElementById('endCard').classList.remove('hidden');
      document.getElementById('introCard').classList.add('hidden');
      document.getElementById('overlay').classList.add('active');
      this.drawFrame();
    },

    drawFrame() {
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.drawBackground();
      if (this.game) this.game.draw(this.ctx);
      this.drawProgress();
    },

    loop() {
      if (this.state !== 'playing') return;
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.drawBackground();
      this.game.update();
      this.game.draw(this.ctx);
      this.drawProgress();

      if (this.game.checkWin()) { this.endGame(); return; }
      if (this.game instanceof AnimalGame && this.game.isGameOver()) { this.endGame(); return; }
      this.animFrame = requestAnimationFrame(() => this.loop());
    },

    drawBackground() {
      this.ctx.fillStyle = '#1e1e1e';
      this.ctx.fillRect(0, 0, this.width, this.height);
    },

    drawProgress() {
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 16px "PingFang SC"';
      this.ctx.fillText(this.game.getProgress(), 15, 30);
    },

    bindEvents() {
      const canvas = document.getElementById('gameCanvas');
      const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        const cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
        const cy = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
        return { x: cx * (this.width / rect.width), y: cy * (this.height / rect.height) };
      };

      canvas.addEventListener('mousedown', (e) => {
        if (this.state !== 'playing') return;
        const { x, y } = getPos(e);
        if (this.game && this.game.onClick) this.game.onClick(x, y);
      });
      canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (this.state !== 'playing') return;
        const { x, y } = getPos(e);
        if (this.game && this.game.onClick) this.game.onClick(x, y);
      }, { passive: false });
      canvas.addEventListener('mousemove', (e) => {
        if (this.state !== 'playing' || !this.game || !this.game.onMove) return;
        const { x } = getPos(e);
        this.game.onMove(x);
      });
      canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (this.state !== 'playing' || !this.game || !this.game.onMove) return;
        const { x } = getPos(e);
        this.game.onMove(x);
      }, { passive: false });

      document.getElementById('startBtn').onclick = () => this.startGame();
      document.getElementById('replayBtn').onclick = () => this.startGame();
      document.getElementById('refreshBtn').onclick = () => location.reload();
      document.getElementById('donateBtn').onclick = () => this.openDonate();
      document.getElementById('closeModalBtn').onclick = () => document.getElementById('modalOverlay').classList.add('hidden');
      document.getElementById('modalOverlay').onclick = (e) => {
        if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden');
      };
    },

    openDonate() {
      const container = document.getElementById('projectListContainer');
      container.innerHTML = '';
      PROJECTS.forEach(p => {
        const div = document.createElement('div');
        div.className = 'project-item';
        div.innerHTML = `
          <div class="project-info">
            <strong>${p.emoji} ${p.name}</strong>
            <p>${p.desc}</p>
          </div>
          <button class="support-btn ${this.supported.has(p.id) ? 'supported' : ''}" data-id="${p.id}">
            ${this.supported.has(p.id) ? '已支持' : '支持'}
          </button>
        `;
        container.appendChild(div);
      });
      container.querySelectorAll('.support-btn').forEach(btn => {
        btn.onclick = () => {
          const id = btn.dataset.id;
          if (this.supported.has(id)) return;
          this.supported.add(id);
          btn.classList.add('supported');
          btn.textContent = '已支持';
          alert(`感谢您支持“${PROJECTS.find(p => p.id === id).name}”！`);
        };
      });
      document.getElementById('modalOverlay').classList.remove('hidden');
    }
  };

  window.addEventListener('DOMContentLoaded', () => App.init());
})();
