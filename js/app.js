/**
 * Main Application Coordinator
 * Handles 16:9 Screen Transitions, Song & Difficulty Selection,
 * Rhythia/osu! UI features, Modals, Auth UI, Audio Previews, and Game Lifecycle.
 */

class App {
  constructor() {
    this.selectedSong = null;
    this.selectedDifficulty = 'medium'; // 'easy' | 'medium' | 'hard'
    this.currentScreen = 'screen-main-menu';
    this.latestResult = null;
    this.previewAudioBuffer = null;
  }

  init() {
    this.initStarfield();
    window.rhythmEngine.init();
    window.songEditor.init();

    this.bindNavigation();
    this.bindAuthModal();
    this.bindSettingsModal();
    this.updateUserUI();

    // Select first song
    const songs = window.SongManager.getAllSongs();
    if (songs.length > 0) {
      this.selectedSong = songs[0];
    }
  }

  initStarfield() {
    const canvas = document.getElementById('starfield-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = canvas.parentElement.clientWidth || 1280;
    let height = canvas.height = canvas.parentElement.clientHeight || 720;

    window.addEventListener('resize', () => {
      width = canvas.width = canvas.parentElement.clientWidth || 1280;
      height = canvas.height = canvas.parentElement.clientHeight || 720;
    });

    const starsCount = 90;
    const stars = [];
    for (let i = 0; i < starsCount; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.7 + 0.3,
        speed: Math.random() * 0.2 + 0.05,
        twinkleSpeed: Math.random() * 0.02 + 0.005
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Subtle cosmic glow
      const grad = ctx.createRadialGradient(width * 0.25, height * 0.3, 10, width * 0.25, height * 0.3, width * 0.6);
      grad.addColorStop(0, 'rgba(13, 71, 161, 0.15)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Stars
      for (const s of stars) {
        s.y -= s.speed;
        if (s.y < 0) {
          s.y = height;
          s.x = Math.random() * width;
        }
        s.alpha += Math.sin(Date.now() * s.twinkleSpeed) * 0.01;
        const boundedAlpha = Math.max(0.15, Math.min(0.9, s.alpha));

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${boundedAlpha})`;
        ctx.fill();
      }

      requestAnimationFrame(render);
    };

    render();
  }

  // --- Screen Switching ---

  showScreen(screenId) {
    window.soundEngine.playUIClick();
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => s.classList.remove('active'));

    const target = document.getElementById(screenId);
    if (target) {
      target.classList.add('active');
      this.currentScreen = screenId;
    }

    // Stop song selection preview if leaving song select
    if (screenId !== 'screen-song-select') {
      window.soundEngine.stopBGM();
    }

    if (screenId === 'screen-song-select') {
      this.renderSongSelect();
    } else if (screenId === 'screen-editor') {
      window.songEditor.resetEditor();
    }
  }

  // --- Navigation & Action Handlers ---

  bindNavigation() {
    // Main Menu Cards (Picture 1 style)
    document.getElementById('card-menu-play')?.addEventListener('click', () => {
      this.showScreen('screen-song-select');
    });

    document.getElementById('card-menu-settings')?.addEventListener('click', () => {
      window.soundEngine.playUIClick();
      this.openModal('modal-settings');
    });

    document.getElementById('card-menu-editor')?.addEventListener('click', () => {
      this.showScreen('screen-editor');
    });

    document.getElementById('card-menu-exit')?.addEventListener('click', () => {
      window.soundEngine.playUIClick();
      if (confirm('Are you sure you want to exit Math Rhythm?')) {
        window.close();
      }
    });

    // Song Selection Actions
    document.getElementById('btn-song-select-back')?.addEventListener('click', () => {
      this.showScreen('screen-main-menu');
    });

    document.getElementById('btn-showcase-play')?.addEventListener('click', () => {
      this.startGame();
    });

    document.getElementById('btn-showcase-preview')?.addEventListener('click', () => {
      this.toggleSongPreview();
    });

    // Difficulty Switching Pills / Arrows
    document.getElementById('diff-prev-btn')?.addEventListener('click', () => {
      this.cycleDifficulty(-1);
    });

    document.getElementById('diff-next-btn')?.addEventListener('click', () => {
      this.cycleDifficulty(1);
    });

    // Gameplay Screen Actions
    document.getElementById('btn-game-quit')?.addEventListener('click', () => {
      window.soundEngine.playUIClick();
      if (confirm('Do you want to quit the current map and return to selection?')) {
        window.rhythmEngine.stop();
        this.showScreen('screen-song-select');
      }
    });

    // Result Screen Actions
    document.getElementById('btn-result-replay')?.addEventListener('click', () => {
      this.startGame();
    });

    document.getElementById('btn-result-return')?.addEventListener('click', () => {
      this.showScreen('screen-song-select');
    });

    // Editor Actions
    document.getElementById('btn-editor-back')?.addEventListener('click', () => {
      window.songEditor.stopPreview();
      this.showScreen('screen-main-menu');
    });
  }

  cycleDifficulty(dir) {
    window.soundEngine.playUIClick();
    const diffs = ['easy', 'medium', 'hard'];
    let idx = diffs.indexOf(this.selectedDifficulty);
    if (idx === -1) idx = 1;
    idx = (idx + dir + diffs.length) % diffs.length;
    this.selectedDifficulty = diffs[idx];
    this.updateSongShowcase();
    this.renderLeaderboard();
  }

  setDifficulty(diff) {
    window.soundEngine.playUIClick();
    this.selectedDifficulty = diff;
    this.updateSongShowcase();
    this.renderLeaderboard();
  }

  // --- Song Select Screen (Picture 2 Style) ---

  renderSongSelect() {
    const listEl = document.getElementById('song-carousel-list');
    if (!listEl) return;

    const songs = window.SongManager.getAllSongs();
    if (!this.selectedSong && songs.length > 0) {
      this.selectedSong = songs[0];
    }

    listEl.innerHTML = songs.map(song => {
      const isSelected = this.selectedSong && this.selectedSong.id === song.id;
      const isCustom = song.type === 'custom' || song.id.startsWith('custom_');
      const diffData = (song.difficulties && song.difficulties[this.selectedDifficulty])
        ? song.difficulties[this.selectedDifficulty]
        : (song.difficulties ? Object.values(song.difficulties)[0] : { stars: 3.0 });

      const starsCount = Math.min(5, Math.max(1, Math.round(diffData.stars || 3)));
      const starsDisplay = '★'.repeat(starsCount) + '☆'.repeat(5 - starsCount);

      const coverSrc = song.cover || 'assets/covers/rick.svg';

      return `
        <div class="song-card-row ${isSelected ? 'selected' : ''}" data-id="${song.id}">
          <div class="card-cover-wrap">
            <img src="${coverSrc}" class="card-cover-img" alt="${song.title}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'60\' height=\'60\'><rect width=\'100%\' height=\'100%\' fill=\'%230D47A1\'/></svg>'">
          </div>
          <div class="card-info-wrap">
            <div class="card-title-row">
              <span class="card-song-title">${song.title}</span>
              ${isCustom ? '<span class="card-tag-badge">CUSTOM</span>' : ''}
            </div>
            <div class="card-artist-sub">${song.artist} • Mapped by ${song.mapper || 'Official'}</div>
            <div class="card-stats-sub">
              <span class="card-stars">${starsDisplay}</span>
              <span class="card-meta">${diffData.stars ? diffData.stars.toFixed(2) : '3.00'} stars</span>
              <span class="card-bullet">•</span>
              <span class="card-meta">${this.formatDuration(song.duration)}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Click handlers for song rows
    listEl.querySelectorAll('.song-card-row').forEach(row => {
      row.addEventListener('click', () => {
        window.soundEngine.playUIClick();
        const id = row.getAttribute('data-id');
        this.selectedSong = window.SongManager.getSongById(id);
        this.renderSongSelect();
        this.playSongPreview();
      });
    });

    this.updateSongShowcase();
    this.renderLeaderboard();
  }

  updateSongShowcase() {
    if (!this.selectedSong) return;

    const s = this.selectedSong;
    const diffData = (s.difficulties && s.difficulties[this.selectedDifficulty])
      ? s.difficulties[this.selectedDifficulty]
      : (s.difficulties ? Object.values(s.difficulties)[0] : { stars: 3.0, notes: s.notes || [] });

    // Album banner & title
    const coverEl = document.getElementById('showcase-cover-img');
    const titleEl = document.getElementById('showcase-song-title');
    const artistEl = document.getElementById('showcase-artist');
    const mapperEl = document.getElementById('showcase-mapper');

    if (coverEl) coverEl.src = s.cover || 'assets/covers/rick.svg';
    if (titleEl) titleEl.textContent = s.title;
    if (artistEl) artistEl.textContent = s.artist;
    if (mapperEl) mapperEl.textContent = `Mapped by ${s.mapper || 'PWK Beats'}`;

    // Difficulty pill
    const diffNameEl = document.getElementById('showcase-diff-name');
    const diffPill = document.getElementById('showcase-diff-pill');
    if (diffNameEl) diffNameEl.textContent = `< ${this.selectedDifficulty.toUpperCase()} >`;
    if (diffPill) {
      diffPill.className = `diff-select-pill pill-${this.selectedDifficulty}`;
    }

    // Metadata stats
    const starsEl = document.getElementById('showcase-stars-val');
    const notesCountEl = document.getElementById('showcase-notes-val');
    const durationEl = document.getElementById('showcase-duration-val');

    if (starsEl) starsEl.textContent = `${diffData.stars ? diffData.stars.toFixed(2) : '3.00'} stars`;
    if (notesCountEl) notesCountEl.textContent = `${diffData.notes ? diffData.notes.length : 0} notes`;
    if (durationEl) durationEl.textContent = this.formatDuration(s.duration);
  }

  renderLeaderboard() {
    if (!this.selectedSong) return;
    const lbContainer = document.getElementById('showcase-leaderboard-list');
    if (!lbContainer) return;

    const entries = window.LeaderboardSystem.getLeaderboard(this.selectedSong.id, this.selectedDifficulty);

    if (entries.length === 0) {
      lbContainer.innerHTML = `
        <div class="lb-empty-notice">
          No records yet on this difficulty. Be the first to set a score!
        </div>
      `;
      return;
    }

    lbContainer.innerHTML = entries.slice(0, 5).map((r, i) => {
      const rankNum = i + 1;
      const rankBadgeClass = r.grade ? `grade-${r.grade.toLowerCase()}` : 'grade-s';
      return `
        <div class="mini-lb-row">
          <span class="mini-lb-rank">#${rankNum}</span>
          <span class="mini-lb-avatar">👤</span>
          <div class="mini-lb-info">
            <span class="mini-lb-user">${r.user}</span>
            <span class="mini-lb-score">${r.score.toLocaleString()}</span>
          </div>
          <span class="mini-lb-grade ${rankBadgeClass}">${r.grade || 'S'}</span>
        </div>
      `;
    }).join('');
  }

  async toggleSongPreview() {
    if (window.soundEngine.isPlayingBGM) {
      window.soundEngine.stopBGM();
      const btn = document.getElementById('btn-showcase-preview');
      if (btn) btn.textContent = '👁️ Preview';
    } else {
      this.playSongPreview();
    }
  }

  async playSongPreview() {
    if (!this.selectedSong) return;
    const btn = document.getElementById('btn-showcase-preview');
    if (btn) btn.textContent = '⏹ Stop';

    if (this.selectedSong.audioUrl) {
      const buffer = await window.soundEngine.loadAudioFile(this.selectedSong.audioUrl);
      if (buffer) {
        window.soundEngine.playAudioBuffer(buffer, this.selectedSong.previewTime || 15);
      }
    } else {
      window.soundEngine.startProceduralRhythm(this.selectedSong.bpm || 120, 30);
    }
  }

  formatDuration(sec) {
    if (!sec || isNaN(sec)) return '02:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  // --- Gameplay Execution ---

  startGame() {
    if (!this.selectedSong) return;
    window.soundEngine.stopBGM();
    window.soundEngine.playUIClick();

    const s = this.selectedSong;
    const diffData = (s.difficulties && s.difficulties[this.selectedDifficulty])
      ? s.difficulties[this.selectedDifficulty]
      : (s.difficulties ? Object.values(s.difficulties)[0] : { notes: s.notes || [] });

    // Update HUD
    const hudTitle = document.getElementById('hud-song-name');
    const hudAuthor = document.getElementById('hud-song-author');
    if (hudTitle) hudTitle.textContent = s.title;
    if (hudAuthor) hudAuthor.textContent = `${s.artist} [${this.selectedDifficulty.toUpperCase()}] • ${diffData.stars || 3.0}★`;

    this.showScreen('screen-gameplay');

    window.focus();
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }

    window.rhythmEngine.start(s, this.selectedDifficulty, (results) => {
      this.handleGameFinished(results);
    });
  }

  handleGameFinished(results) {
    this.latestResult = results;

    const currentUser = window.AuthSystem.getCurrentUser();
    window.LeaderboardSystem.submitScore(
      results.song.id,
      results.difficulty || this.selectedDifficulty,
      currentUser,
      results.score,
      results.perfectCount,
      results.greatCount,
      results.missCount
    );

    // Populate Results Screen
    const songNameEl = document.getElementById('result-song-title');
    const diffEl = document.getElementById('result-diff-badge');
    const scoreEl = document.getElementById('result-score-val');
    const rankEl = document.getElementById('result-rank-badge');
    const missEl = document.getElementById('result-miss-val');
    const perfectEl = document.getElementById('result-perfect-val');
    const greatEl = document.getElementById('result-great-val');
    const combinedEl = document.getElementById('result-combined-val');
    const comboEl = document.getElementById('result-max-combo');

    if (songNameEl) songNameEl.textContent = results.song.title;
    if (diffEl) {
      diffEl.textContent = (results.difficulty || 'MEDIUM').toUpperCase();
      diffEl.className = `result-diff-tag diff-${(results.difficulty || 'medium').toLowerCase()}`;
    }
    if (scoreEl) scoreEl.textContent = results.score.toLocaleString();
    if (comboEl) comboEl.textContent = `${results.maxCombo} MAX COMBO`;

    if (rankEl) {
      rankEl.textContent = results.rank;
      rankEl.className = `result-rank-badge font-stroked rank-${results.rank.toLowerCase()}`;
    }

    if (missEl) missEl.textContent = results.missCount;
    if (perfectEl) perfectEl.textContent = results.perfectCount;
    if (greatEl) greatEl.textContent = results.greatCount;
    if (combinedEl) combinedEl.textContent = results.combinedGood;

    this.showScreen('screen-result');
  }

  // --- Auth & Modals ---

  bindAuthModal() {
    const btnOpenAuth = document.getElementById('btn-open-auth');
    btnOpenAuth?.addEventListener('click', () => {
      window.soundEngine.playUIClick();
      this.openModal('modal-auth');
    });

    const btnLogout = document.getElementById('btn-logout');
    btnLogout?.addEventListener('click', () => {
      window.soundEngine.playUIClick();
      window.AuthSystem.logout();
      this.updateUserUI();
    });

    const tabLogin = document.getElementById('auth-tab-login');
    const tabRegister = document.getElementById('auth-tab-register');
    const formLogin = document.getElementById('auth-form-login');
    const formRegister = document.getElementById('auth-form-register');
    const alertMsg = document.getElementById('auth-alert');

    tabLogin?.addEventListener('click', () => {
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
      formLogin.style.display = 'block';
      formRegister.style.display = 'none';
      if (alertMsg) alertMsg.style.display = 'none';
    });

    tabRegister?.addEventListener('click', () => {
      tabRegister.classList.add('active');
      tabLogin.classList.remove('active');
      formRegister.style.display = 'block';
      formLogin.style.display = 'none';
      if (alertMsg) alertMsg.style.display = 'none';
    });

    formLogin?.addEventListener('submit', (e) => {
      e.preventDefault();
      const u = document.getElementById('login-username').value;
      const p = document.getElementById('login-password').value;

      const res = window.AuthSystem.login(u, p);
      if (!res.success) {
        if (alertMsg) {
          alertMsg.textContent = res.message;
          alertMsg.style.display = 'block';
          alertMsg.classList.add('anim-shake');
          setTimeout(() => alertMsg.classList.remove('anim-shake'), 300);
        }
      } else {
        if (alertMsg) alertMsg.style.display = 'none';
        this.closeModal('modal-auth');
        this.updateUserUI();
        alert(`Welcome back, ${res.user}! Signed in successfully.`);
      }
    });

    formRegister?.addEventListener('submit', (e) => {
      e.preventDefault();
      const u = document.getElementById('reg-username').value;
      const p = document.getElementById('reg-password').value;
      const cp = document.getElementById('reg-confirm-password').value;

      const res = window.AuthSystem.register(u, p, cp);
      if (!res.success) {
        if (alertMsg) {
          alertMsg.textContent = res.message;
          alertMsg.style.display = 'block';
          alertMsg.classList.add('anim-shake');
          setTimeout(() => alertMsg.classList.remove('anim-shake'), 300);
        }
      } else {
        if (alertMsg) alertMsg.style.display = 'none';
        this.closeModal('modal-auth');
        this.updateUserUI();
        alert(`Account created successfully! Welcome, ${res.user}.`);
      }
    });

    document.querySelectorAll('.modal-close-btn').forEach(btn => {
      btn.addEventListener('click', () => this.closeAllModals());
    });

    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closeAllModals();
      });
    });
  }

  updateUserUI() {
    const currentUser = window.AuthSystem.getCurrentUser();
    const nameEl = document.getElementById('current-username-display');
    const btnOpenAuth = document.getElementById('btn-open-auth');
    const btnLogout = document.getElementById('btn-logout');

    if (nameEl) nameEl.textContent = currentUser;

    if (currentUser === 'Guest') {
      if (btnOpenAuth) btnOpenAuth.style.display = 'inline-flex';
      if (btnLogout) btnLogout.style.display = 'none';
    } else {
      if (btnOpenAuth) btnOpenAuth.style.display = 'none';
      if (btnLogout) btnLogout.style.display = 'inline-flex';
    }
  }

  bindSettingsModal() {
    const sliderBGM = document.getElementById('setting-bgm-volume');
    const sliderSFX = document.getElementById('setting-sfx-volume');
    const toggleMute = document.getElementById('setting-mute-toggle');
    const bgmValDisplay = document.getElementById('setting-bgm-val');
    const sfxValDisplay = document.getElementById('setting-sfx-val');

    if (sliderBGM) {
      sliderBGM.value = Math.round(window.soundEngine.bgmVolume * 100);
      if (bgmValDisplay) bgmValDisplay.textContent = `${sliderBGM.value}%`;
      sliderBGM.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10) / 100;
        window.soundEngine.setBGMVolume(val);
        if (bgmValDisplay) bgmValDisplay.textContent = `${e.target.value}%`;
      });
    }

    if (sliderSFX) {
      sliderSFX.value = Math.round(window.soundEngine.sfxVolume * 100);
      if (sfxValDisplay) sfxValDisplay.textContent = `${sliderSFX.value}%`;
      sliderSFX.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10) / 100;
        window.soundEngine.setSFXVolume(val);
        if (sfxValDisplay) sfxValDisplay.textContent = `${e.target.value}%`;
      });
    }

    if (toggleMute) {
      toggleMute.checked = window.soundEngine.isMuted;
      toggleMute.addEventListener('change', (e) => {
        window.soundEngine.setMute(e.target.checked);
      });
    }
  }

  openModal(id) {
    this.closeAllModals();
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
  }

  closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
  }

  closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
  }
}

window.app = new App();
window.addEventListener('DOMContentLoaded', () => {
  window.app.init();
});
