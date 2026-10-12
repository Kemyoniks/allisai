/**
 * Rhythm Game Engine
 * Controls the gameplay loop, note scrolling along the 3D highway,
 * approach rate in seconds, hit detection windows, high-impact hit FX,
 * particle explosions, lane laser beams, camera shakes, scoring, and input handling.
 */

class RhythmEngine {
  constructor() {
    this.currentSong = null;
    this.currentDifficulty = 'medium';
    this.activeNotes = [];
    this.processedNotes = new Set();
    this.isPlaying = false;
    this.animFrameId = null;

    // Timing windows (seconds) - tuned for precise and fair rhythm gameplay
    this.PERFECT_WINDOW = 0.140; // +/- 140ms (Perfect window)
    this.GREAT_WINDOW = 0.280;   // +/- 280ms (Great window)
    this.EARLY_BUFFER = 0.360;   // up to 360ms early hit window

    // Scoring & Stats
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.perfectCount = 0;
    this.greatCount = 0;
    this.missCount = 0;
    this.totalJudged = 0;

    // DOM Elements
    this.highwayTrackEl = null;
    this.judgementTextEl = null;
    this.comboTextEl = null;
    this.scoreValEl = null;
    this.comboValEl = null;
    this.accValEl = null;
    this.grooveFillEl = null;
    this.progressBarEl = null;
    this.hitFxLayerEl = null;
    this.milestoneBannerEl = null;
    this.flashOverlayEl = null;
    this.hitZoneEl = null;

    this.laneBeams = {};
    this.laneReceptors = {};

    this.onGameFinished = null;
  }

  init() {
    this.highwayTrackEl = document.getElementById('highway-track');
    this.judgementTextEl = document.getElementById('judgement-display');
    this.comboTextEl = document.getElementById('combo-display');
    this.scoreValEl = document.getElementById('hud-score-val');
    this.comboValEl = document.getElementById('hud-combo-val');
    this.accValEl = document.getElementById('hud-acc-val');
    this.grooveFillEl = document.getElementById('hud-groove-fill');
    this.progressBarEl = document.getElementById('song-progress-bar');
    this.hitFxLayerEl = document.getElementById('hit-fx-layer');
    this.milestoneBannerEl = document.getElementById('combo-milestone-banner');
    this.flashOverlayEl = document.getElementById('highway-flash-overlay');
    this.hitZoneEl = document.getElementById('hit-zone-target');

    this.laneBeams = {
      left: document.getElementById('lane-beam-left'),
      center: document.getElementById('lane-beam-center'),
      right: document.getElementById('lane-beam-right')
    };

    this.laneReceptors = {
      left: document.getElementById('receptor-left'),
      center: document.getElementById('receptor-center'),
      right: document.getElementById('receptor-right')
    };

    this.bindInputs();
  }

  bindInputs() {
    const handleKeyEvent = (e) => {
      // Check if gameplay screen is active
      const gameplayScreen = document.getElementById('screen-gameplay');
      const isGameplayActive = gameplayScreen && gameplayScreen.classList.contains('active');

      if (!this.isPlaying && !isGameplayActive) return;

      const digit = this.parseKeyboardInput(e);
      if (digit !== null) {
        e.preventDefault();
        e.stopPropagation();

        if (this.isPlaying) {
          this.handlePlayerInput(digit);
        }
      }
    };

    // Capture on both window and document with true (capture phase)
    window.addEventListener('keydown', handleKeyEvent, true);
    document.addEventListener('keydown', handleKeyEvent, true);
  }

  parseKeyboardInput(e) {
    // 1. By e.code (Universal across all keyboard languages: English, Thai, etc.)
    if (e.code) {
      if (e.code.startsWith('Digit')) {
        const num = parseInt(e.code.replace('Digit', ''), 10);
        if (!isNaN(num) && num >= 0 && num <= 9) return num;
      }
      if (e.code.startsWith('Numpad')) {
        const num = parseInt(e.code.replace('Numpad', ''), 10);
        if (!isNaN(num) && num >= 0 && num <= 9) return num;
      }
    }

    // 2. By direct single-character key in English ('0'-'9')
    if (typeof e.key === 'string' && e.key.length === 1 && e.key >= '0' && e.key <= '9') {
      return parseInt(e.key, 10);
    }

    // 3. By Thai Kedmanee layout mapping
    const thaiKedmanee = {
      'จ': 0, 'ๅ': 1, '/': 2, '-': 3, 'ภ': 4,
      'ถ': 5, 'ุ': 6, 'ึ': 7, 'ค': 8, 'ต': 9
    };
    if (e.key && thaiKedmanee[e.key] !== undefined) {
      return thaiKedmanee[e.key];
    }

    // 4. By Thai Pattachote layout mapping
    const thaiPattachote = {
      '_': 0, '๒': 1, '๓': 2, '๔': 3, '๕': 4,
      '๖': 5, '๗': 6, '๘': 7, '๙': 8, '๐': 9
    };
    if (e.key && thaiPattachote[e.key] !== undefined) {
      return thaiPattachote[e.key];
    }

    // 5. Fallback keyCode / which
    const code = e.keyCode || e.which;
    if (code >= 48 && code <= 57) return code - 48;
    if (code >= 96 && code <= 105) return code - 96;

    return null;
  }

  async start(song, difficulty = 'medium', onFinished = null) {
    this.currentSong = song;
    this.currentDifficulty = difficulty;
    this.onGameFinished = onFinished;

    // Reset stats
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.perfectCount = 0;
    this.greatCount = 0;
    this.missCount = 0;
    this.totalJudged = 0;
    this.processedNotes.clear();

    // Extract difficulty data
    const diffData = (song.difficulties && song.difficulties[difficulty])
      ? song.difficulties[difficulty]
      : (song.difficulties ? Object.values(song.difficulties)[0] : { approachTime: song.approachTime || 2.0, notes: song.notes || [] });

    this.currentApproachTime = diffData.approachTime || 2.0;

    // Prepare note instances with 3-lane distribution (Left, Center, Right)
    const laneCycle = ['center', 'left', 'center', 'right', 'left', 'right'];
    this.activeNotes = diffData.notes.map((n, idx) => ({
      ...n,
      lane: n.lane || laneCycle[idx % laneCycle.length],
      element: null,
      spawned: false,
      hit: false
    }));

    // Clear highway elements
    if (this.highwayTrackEl) {
      const existingNotes = this.highwayTrackEl.querySelectorAll('.note-item');
      existingNotes.forEach(el => el.remove());
    }

    if (this.hitFxLayerEl) {
      this.hitFxLayerEl.innerHTML = '';
    }

    this.updateHUD();
    this.isPlaying = true;

    // Start Audio
    if (song.audioUrl) {
      const buffer = await window.soundEngine.loadAudioFile(song.audioUrl);
      if (buffer) {
        window.soundEngine.playAudioBuffer(buffer, 0, () => this.finishGame());
      } else {
        window.soundEngine.startProceduralRhythm(song.bpm || 120, song.duration || 60, () => this.finishGame());
      }
    } else if (song.type === 'custom' && window.SongManager.audioBufferStore.has(song.id)) {
      const buf = window.SongManager.audioBufferStore.get(song.id);
      window.soundEngine.playAudioBuffer(buf, 0, () => this.finishGame());
    } else {
      window.soundEngine.startProceduralRhythm(song.bpm || 120, song.duration || 45, () => this.finishGame());
    }

    // Start Loop
    this.loop();
  }

  stop() {
    this.isPlaying = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    window.soundEngine.stopBGM();
  }

  loop() {
    if (!this.isPlaying) return;

    const currentTime = window.soundEngine.getCurrentAudioTime();
    const approachTime = this.currentApproachTime || (this.currentSong && this.currentSong.approachTime) || 2.0;

    // Update song progress bar
    if (this.progressBarEl && this.currentSong.duration > 0) {
      const pct = Math.min(100, (currentTime / this.currentSong.duration) * 100);
      this.progressBarEl.style.width = `${pct}%`;
    }

    // Update notes position & spawning
    this.activeNotes.forEach(note => {
      if (this.processedNotes.has(note.id)) return;

      const timeUntilHit = note.time - currentTime;

      // Note should be visible on highway from approachTime down to past hit line
      if (timeUntilHit <= approachTime && timeUntilHit >= -this.GREAT_WINDOW) {
        if (!note.spawned) {
          this.spawnNoteElement(note);
        }

        // Calculate vertical progress (0% at top, exactly 82% at hit line center)
        const progress = 1 - (timeUntilHit / approachTime);
        const topPercent = progress * 82;

        if (note.element) {
          note.element.style.top = `${topPercent}%`;
          // Dynamic scale as note approaches for depth
          const scale = 0.75 + (progress * 0.35);
          note.element.style.transform = `translate(-50%, -50%) scale(${scale})`;
        }
      }

      // Check for Miss if player didn't hit and note passed beyond Great window
      if (timeUntilHit < -this.GREAT_WINDOW && !note.hit) {
        this.registerJudgement('MISS', note, timeUntilHit);
      }
    });

    // End condition check if music completed or past duration
    if (currentTime >= this.currentSong.duration + 1.0) {
      this.finishGame();
      return;
    }

    this.animFrameId = requestAnimationFrame(() => this.loop());
  }

  spawnNoteElement(note) {
    note.spawned = true;
    const el = document.createElement('div');
    const lane = note.lane || 'center';
    el.className = `note-item lane-${lane}`;
    el.id = `note-${note.id}`;
    el.innerHTML = window.MathGenerator.renderFormulaHTML(note.formula);
    this.highwayTrackEl.appendChild(el);
    note.element = el;
  }

  handlePlayerInput(digit) {
    if (!this.isPlaying) return;

    const currentTime = window.soundEngine.getCurrentAudioTime();

    // Find the closest unhit active note within the timing window
    let candidate = null;
    let minAbsDiff = Infinity;
    let actualDiff = 0;

    for (const note of this.activeNotes) {
      if (this.processedNotes.has(note.id)) continue;

      const diff = note.time - currentTime;
      const absDiff = Math.abs(diff);

      // Search range: up to EARLY_BUFFER before hit, and GREAT_WINDOW after hit
      if (diff >= -this.GREAT_WINDOW && diff <= this.EARLY_BUFFER) {
        if (absDiff < minAbsDiff) {
          minAbsDiff = absDiff;
          actualDiff = diff;
          candidate = note;
        }
      }
    }

    if (candidate) {
      // Light up the corresponding receptor
      this.triggerReceptorPress(candidate.lane);

      // Check if the calculated answer matches
      if (candidate.answer === digit) {
        if (minAbsDiff <= this.PERFECT_WINDOW) {
          this.registerJudgement('PERFECT', candidate, actualDiff);
        } else {
          this.registerJudgement('GREAT', candidate, actualDiff);
        }
      } else {
        // Player calculated wrong answer while note is in hit range -> Miss
        this.registerJudgement('MISS', candidate, actualDiff);
      }
    } else {
      // Pressed a number with no note in window - trigger center receptor & light feedback
      this.triggerReceptorPress('center');
      window.soundEngine.playUIClick();
    }
  }

  registerJudgement(type, note, diffTime = 0) {
    this.processedNotes.add(note.id);
    note.hit = true;
    this.totalJudged++;

    const lane = note.lane || 'center';
    const xCoord = lane === 'left' ? '17%' : (lane === 'right' ? '83%' : '50%');
    const yCoord = '82%';

    // Remove the original scrolling note element immediately
    if (note.element) {
      note.element.remove();
      note.element = null;
    }

    // 1. Trigger Lane Flash Beam (Rhythm Laser)
    this.triggerLaneBeam(lane, type);

    // 2. Trigger Lane Receptor Flash
    this.triggerReceptorPress(lane);

    // 3. Trigger Particle Explosion & Shockwave
    this.spawnHitBurst(type, note, xCoord, yCoord, diffTime);

    // 4. Highway Screen Kick / Shake
    this.triggerHighwayImpact(type);

    // 5. Scoring & Sound
    if (type === 'PERFECT') {
      this.perfectCount++;
      this.combo++;
      this.score += 1000 + (this.combo * 25);
      window.soundEngine.playHitPerfect();
      this.showJudgementText('PERFECT', 'judge-perfect');
    } else if (type === 'GREAT') {
      this.greatCount++;
      this.combo++;
      this.score += 650 + (this.combo * 15);
      window.soundEngine.playHitGreat();
      this.showJudgementText('GREAT', 'judge-great');
    } else {
      this.missCount++;
      this.combo = 0;
      window.soundEngine.playHitMiss();
      this.showJudgementText('MISS', 'judge-miss');
    }

    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo;
    }

    // 6. Check Combo Milestones (10, 25, 50, 75, 100...)
    this.checkComboMilestone(this.combo);

    this.updateHUD();
  }

  // --- Visual Effects System ---

  triggerLaneBeam(lane, type) {
    const beam = this.laneBeams[lane];
    if (!beam) return;

    beam.className = `lane-beam lane-beam-${lane} anim-lane-beam`;
    if (type === 'GREAT') beam.classList.add('beam-great');
    else if (type === 'MISS') beam.classList.add('beam-miss');

    // Force restart animation
    beam.style.animation = 'none';
    beam.offsetHeight; // reflow
    beam.style.animation = '';
  }

  triggerReceptorPress(lane) {
    const receptor = this.laneReceptors[lane];
    if (receptor) {
      receptor.classList.remove('receptor-active');
      receptor.offsetHeight; // reflow
      receptor.classList.add('receptor-active');
      setTimeout(() => receptor.classList.remove('receptor-active'), 140);
    }

    if (this.hitZoneEl) {
      this.hitZoneEl.classList.remove('pulse-hit');
      this.hitZoneEl.offsetHeight; // reflow
      this.hitZoneEl.classList.add('pulse-hit');
      setTimeout(() => this.hitZoneEl?.classList.remove('pulse-hit'), 150);
    }
  }

  triggerHighwayImpact(type) {
    if (!this.highwayTrackEl) return;

    if (type === 'PERFECT' || type === 'GREAT') {
      this.highwayTrackEl.classList.remove('highway-kick');
      this.highwayTrackEl.offsetHeight; // reflow
      this.highwayTrackEl.classList.add('highway-kick');
      setTimeout(() => this.highwayTrackEl?.classList.remove('highway-kick'), 150);
    } else if (type === 'MISS') {
      this.highwayTrackEl.classList.remove('highway-miss-shake');
      this.highwayTrackEl.offsetHeight; // reflow
      this.highwayTrackEl.classList.add('highway-miss-shake');
      setTimeout(() => this.highwayTrackEl?.classList.remove('highway-miss-shake'), 280);

      // Red Screen Vignette Flash
      if (this.flashOverlayEl) {
        this.flashOverlayEl.classList.remove('anim-miss-vignette');
        this.flashOverlayEl.offsetHeight;
        this.flashOverlayEl.classList.add('anim-miss-vignette');
      }
    }
  }

  spawnHitBurst(type, note, xCoord, yCoord, diffTime) {
    if (!this.hitFxLayerEl) return;

    const isMiss = type === 'MISS';

    // 1. Lens Flare Starburst Core (Blinding center flash)
    if (!isMiss) {
      const lensFlare = document.createElement('div');
      lensFlare.className = `hit-lens-flare ${type === 'GREAT' ? 'flare-great' : ''} anim-lens-flare`;
      lensFlare.style.left = xCoord;
      lensFlare.style.top = yCoord;
      this.hitFxLayerEl.appendChild(lensFlare);
      setTimeout(() => lensFlare.remove(), 290);

      // Floor Energy Wave on Highway
      if (this.highwayTrackEl) {
        const energyWave = document.createElement('div');
        energyWave.className = 'highway-energy-wave anim-floor-energy';
        this.highwayTrackEl.appendChild(energyWave);
        setTimeout(() => energyWave.remove(), 360);
      }
    }

    // 2. Primary Expanding Shockwave Ring
    const shockwave = document.createElement('div');
    shockwave.className = `hit-shockwave shockwave-${type.toLowerCase()} anim-shockwave`;
    shockwave.style.left = xCoord;
    shockwave.style.top = yCoord;
    this.hitFxLayerEl.appendChild(shockwave);
    setTimeout(() => shockwave.remove(), 350);

    // 3. Secondary Outer Distortion Shockwave (Bigger secondary wave)
    if (!isMiss) {
      const shockwave2 = document.createElement('div');
      shockwave2.className = 'hit-shockwave-secondary anim-shockwave-secondary';
      shockwave2.style.left = xCoord;
      shockwave2.style.top = yCoord;
      if (type === 'GREAT') shockwave2.style.borderColor = 'rgba(0, 230, 118, 0.85)';
      this.hitFxLayerEl.appendChild(shockwave2);
      setTimeout(() => shockwave2.remove(), 420);
    }

    // 4. Floating Arcade Score Popup (+1000! / +650!)
    if (!isMiss) {
      const scorePopup = document.createElement('div');
      const scorePoints = type === 'PERFECT' ? '+1000!' : '+650!';
      scorePopup.className = `hit-score-popup ${type === 'PERFECT' ? 'score-popup-perfect' : 'score-popup-great'} anim-score-popup font-stroked`;
      scorePopup.textContent = scorePoints;
      scorePopup.style.left = xCoord;
      scorePopup.style.top = `calc(${yCoord} - 15px)`;
      this.hitFxLayerEl.appendChild(scorePopup);
      setTimeout(() => scorePopup.remove(), 520);
    }

    // 5. Radiating Particle Fireworks (28 multi-style particles: Stars, Diamonds, Streaks, Dots)
    const numSparks = isMiss ? 10 : 28;
    const colors = type === 'PERFECT'
      ? ['#00E5FF', '#FFFFFF', '#FFD54F', '#15D8B3', '#64FFDA', '#FFF9C4']
      : (type === 'GREAT' ? ['#00E676', '#69F0AE', '#FFF59D', '#B9F6CA'] : ['#FF1744', '#FF5252', '#B71C1C', '#FF8A80']);

    const particleTypes = ['dot', 'star', 'diamond', 'streak'];

    for (let i = 0; i < numSparks; i++) {
      const spark = document.createElement('div');
      const pType = particleTypes[i % particleTypes.length];
      spark.className = `hit-particle spark-${pType}`;

      const color = colors[i % colors.length];
      spark.style.color = color;
      spark.style.left = xCoord;
      spark.style.top = yCoord;

      if (pType === 'star') {
        spark.textContent = i % 2 === 0 ? '✦' : '★';
      } else if (pType === 'diamond') {
        spark.textContent = '◆';
      } else if (pType === 'streak') {
        spark.style.backgroundColor = color;
      } else {
        spark.style.backgroundColor = color;
      }

      const angle = (i / numSparks) * Math.PI * 2 + (Math.random() * 0.4 - 0.2);
      const distance = 45 + Math.random() * 85;
      const targetX = Math.cos(angle) * distance;
      const targetY = Math.sin(angle) * distance;
      const rotate = Math.random() * 360;

      spark.style.transform = `translate(-50%, -50%) rotate(0deg) scale(1)`;
      spark.style.transition = `all ${0.28 + Math.random() * 0.14}s cubic-bezier(0.1, 0.85, 0.25, 1)`;

      this.hitFxLayerEl.appendChild(spark);

      requestAnimationFrame(() => {
        const streakAngle = (angle * 180 / Math.PI);
        const finalTransform = pType === 'streak'
          ? `translate(calc(-50% + ${targetX}px), calc(-50% + ${targetY}px)) rotate(${streakAngle}deg) scale(0.2)`
          : `translate(calc(-50% + ${targetX}px), calc(-50% + ${targetY}px)) rotate(${rotate}deg) scale(0)`;

        spark.style.transform = finalTransform;
        spark.style.opacity = '0';
      });

      setTimeout(() => spark.remove(), 420);
    }

    // 6. Solved Formula Pop Bloom (Ghost formula ascending or miss shattering)
    if (note.formula) {
      const ghost = document.createElement('div');
      ghost.className = `hit-ghost-formula ${isMiss ? 'anim-formula-miss' : 'anim-formula-pop'}`;
      ghost.style.left = xCoord;
      ghost.style.top = yCoord;
      ghost.innerHTML = window.MathGenerator.renderFormulaHTML(note.formula);
      this.hitFxLayerEl.appendChild(ghost);
      setTimeout(() => ghost.remove(), 360);
    }

    // 7. Timing Offset Badge (e.g. ✦ CRITICAL ✦, +14ms EARLY, LATE)
    if (!isMiss && typeof diffTime === 'number') {
      const badge = document.createElement('div');
      const ms = Math.round(diffTime * 1000);
      const isEarly = ms > 0;
      const labelText = Math.abs(ms) <= 25
        ? '✦ CRITICAL ✦'
        : (isEarly ? `+${ms}ms EARLY` : `${ms}ms LATE`);

      badge.className = `hit-offset-badge ${type === 'PERFECT' ? 'offset-perfect' : 'offset-great'} font-stroked`;
      badge.textContent = labelText;
      badge.style.left = xCoord;
      badge.style.top = `calc(${yCoord} - 45px)`;
      this.hitFxLayerEl.appendChild(badge);
      setTimeout(() => badge.remove(), 440);
    }
  }

  showJudgementText(text, cssClass) {
    if (!this.judgementTextEl) return;

    // Force restart animation on judgement text every hit
    this.judgementTextEl.className = 'judgement-text font-stroked';
    this.judgementTextEl.textContent = text;
    void this.judgementTextEl.offsetWidth; // force reflow
    this.judgementTextEl.className = `judgement-text font-stroked ${cssClass} anim-popup`;

    if (this.comboTextEl) {
      if (this.combo > 1) {
        let fireClass = '';
        if (this.combo >= 50) fireClass = 'combo-fire-3';
        else if (this.combo >= 25) fireClass = 'combo-fire-2';
        else if (this.combo >= 10) fireClass = 'combo-fire-1';

        // Alternating punch direction on each number increment
        const punchClass = (this.combo % 2 === 0) ? 'anim-combo-punch-left' : 'anim-combo-punch-right';

        this.comboTextEl.className = 'combo-text';
        this.comboTextEl.innerHTML = `
          <div class="combo-ghost-echo font-stroked anim-combo-ghost ${fireClass}">${this.combo}</div>
          <span class="combo-big-num font-stroked ${punchClass} ${fireClass}">${this.combo}</span>
          <span class="combo-sub-label font-stroked">COMBO</span>
        `;
        this.comboTextEl.style.opacity = '1';
      } else {
        this.comboTextEl.style.opacity = '0';
        this.comboTextEl.innerHTML = '';
      }
    }
  }

  checkComboMilestone(combo) {
    const milestones = [10, 25, 50, 75, 100, 150, 200, 300];
    if (milestones.includes(combo)) {
      window.soundEngine.playComboMilestone(combo);

      if (this.milestoneBannerEl) {
        let title = `${combo} COMBO! FEVER! 🔥`;
        if (combo >= 100) title = `${combo} COMBO! GODLIKE! ⚡`;
        else if (combo >= 50) title = `${combo} COMBO! UNSTOPPABLE! ⭐`;

        this.milestoneBannerEl.textContent = title;
        this.milestoneBannerEl.className = 'combo-milestone-banner font-stroked';
        void this.milestoneBannerEl.offsetWidth; // force reflow
        this.milestoneBannerEl.className = 'combo-milestone-banner font-stroked anim-milestone-banner';
        this.milestoneBannerEl.style.opacity = '1';

        setTimeout(() => {
          if (this.milestoneBannerEl) this.milestoneBannerEl.style.opacity = '0';
        }, 880);
      }
    }
  }

  updateHUD() {
    if (this.scoreValEl) this.scoreValEl.textContent = this.score.toLocaleString();
    if (this.comboValEl) {
      this.comboValEl.textContent = this.combo;
      if (this.combo >= 25) {
        this.comboValEl.style.color = '#FFD54F';
      } else if (this.combo >= 10) {
        this.comboValEl.style.color = '#00E5FF';
      } else {
        this.comboValEl.style.color = '#FFB300';
      }

      // Visceral pop bounce on HUD combo counter
      if (this.combo > 0) {
        this.comboValEl.classList.remove('anim-hud-combo');
        void this.comboValEl.offsetWidth; // force reflow
        this.comboValEl.classList.add('anim-hud-combo');
      }
    }

    // Live Accuracy
    if (this.accValEl) {
      if (this.totalJudged === 0) {
        this.accValEl.textContent = '100.0%';
      } else {
        const acc = ((this.perfectCount * 1.0 + this.greatCount * 0.65) / this.totalJudged) * 100;
        this.accValEl.textContent = `${acc.toFixed(1)}%`;
      }
    }

    // Live Groove / Fever Bar
    if (this.grooveFillEl) {
      const groovePct = Math.min(100, Math.max(10, (this.combo / 30) * 100));
      this.grooveFillEl.style.width = `${groovePct}%`;
    }
  }

  finishGame() {
    this.stop();

    const results = {
      song: this.currentSong,
      difficulty: this.currentDifficulty || 'medium',
      score: this.score,
      maxCombo: this.maxCombo,
      perfectCount: this.perfectCount,
      greatCount: this.greatCount,
      missCount: this.missCount,
      combinedGood: this.perfectCount + this.greatCount
    };

    // Calculate Rank
    const totalNotes = (this.activeNotes && this.activeNotes.length) ? this.activeNotes.length : (this.currentSong.notes ? this.currentSong.notes.length : 1);
    const accuracy = totalNotes > 0 ? ((this.perfectCount * 1.0) + (this.greatCount * 0.6)) / totalNotes : 1;

    if (accuracy >= 0.98 && this.missCount === 0) results.rank = 'SS';
    else if (accuracy >= 0.90) results.rank = 'S';
    else if (accuracy >= 0.80) results.rank = 'A';
    else if (accuracy >= 0.65) results.rank = 'B';
    else if (accuracy >= 0.50) results.rank = 'C';
    else results.rank = 'D';

    if (this.onGameFinished) {
      this.onGameFinished(results);
    }
  }
}

window.rhythmEngine = new RhythmEngine();
