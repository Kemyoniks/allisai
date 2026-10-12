/**
 * Map & Song Editor Module
 * Allows uploading MP3 audio, adjusting approach rate (seconds ahead),
 * setting single-digit arithmetic math notes (+, -), 3-lane assignment,
 * tap-to-record beats, previewing, and saving charts.
 */

class SongEditor {
  constructor() {
    this.currentAudioBuffer = null;
    this.currentFileName = '';
    this.notes = [];
    this.approachTime = 2.0; // Seconds ahead note approaches
    this.isPlayingPreview = false;
    this.previewTimer = null;
    this.isRecordingTap = false;
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    const fileInput = document.getElementById('editor-audio-file');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => this.handleAudioUpload(e));
    }

    const approachInput = document.getElementById('editor-approach-time');
    const approachValDisplay = document.getElementById('editor-approach-val');
    if (approachInput && approachValDisplay) {
      approachInput.addEventListener('input', (e) => {
        this.approachTime = parseFloat(e.target.value) || 2.0;
        approachValDisplay.textContent = `${this.approachTime.toFixed(1)}s`;
      });
    }

    const btnAddNote = document.getElementById('editor-btn-add-note');
    if (btnAddNote) {
      btnAddNote.addEventListener('click', () => this.addManualNote());
    }

    const btnTapRecord = document.getElementById('editor-btn-tap-record');
    if (btnTapRecord) {
      btnTapRecord.addEventListener('click', () => this.toggleTapRecording());
    }

    const btnPlayPreview = document.getElementById('editor-btn-preview');
    if (btnPlayPreview) {
      btnPlayPreview.addEventListener('click', () => this.togglePreview());
    }

    const btnSaveChart = document.getElementById('editor-btn-save');
    if (btnSaveChart) {
      btnSaveChart.addEventListener('click', () => this.saveChart());
    }

    // Spacebar tap recording shortcut in editor
    window.addEventListener('keydown', (e) => {
      const editorScreen = document.getElementById('screen-editor');
      if (editorScreen && editorScreen.classList.contains('active') && e.code === 'Space') {
        if (this.isRecordingTap) {
          e.preventDefault();
          this.recordCurrentTap();
        }
      }
    });
  }

  async handleAudioUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    this.currentFileName = file.name.replace(/\.[^/.]+$/, "");
    const titleInput = document.getElementById('editor-song-title');
    if (titleInput && !titleInput.value) {
      titleInput.value = this.currentFileName;
    }

    const statusEl = document.getElementById('editor-upload-status');
    if (statusEl) {
      statusEl.textContent = 'Decoding MP3 audio file...';
      statusEl.style.color = '#00E5FF';
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      this.currentAudioBuffer = await window.soundEngine.decodeAudio(arrayBuffer);

      if (statusEl) {
        statusEl.textContent = `Loaded successfully! Length: ${this.currentAudioBuffer.duration.toFixed(1)}s`;
        statusEl.style.color = '#00E676';
      }

      const durationInput = document.getElementById('editor-song-duration');
      if (durationInput) {
        durationInput.value = Math.ceil(this.currentAudioBuffer.duration);
      }
    } catch (err) {
      console.error('Audio decode error:', err);
      if (statusEl) {
        statusEl.textContent = 'Failed to load audio file. Please try another MP3/WAV file.';
        statusEl.style.color = '#FF1744';
      }
    }
  }

  addManualNote() {
    const timeInput = document.getElementById('editor-note-time');
    const formulaInput = document.getElementById('editor-note-formula');
    const noteTime = parseFloat(timeInput.value);
    const formulaStr = formulaInput.value.trim();

    if (isNaN(noteTime) || noteTime < 0) {
      alert('Please specify a valid timestamp in seconds (e.g. 2.5).');
      return;
    }

    const check = window.MathGenerator.validateFormula(formulaStr);
    if (!check.valid) {
      alert(check.error || 'Formula must be single-digit arithmetic with answer between 0 and 9.');
      return;
    }

    const laneSelect = document.getElementById('editor-note-lane');
    const lane = laneSelect ? laneSelect.value : 'center';

    this.notes.push({
      id: Date.now() + Math.random(),
      time: parseFloat(noteTime.toFixed(2)),
      lane: lane,
      formula: `${check.num1} ${check.op} ${check.num2}`,
      answer: check.answer
    });

    this.notes.sort((a, b) => a.time - b.time);
    this.renderNotesList();

    // Advance time suggestion
    timeInput.value = (noteTime + 1.5).toFixed(2);
    // Cycle lane suggestion: left -> center -> right
    if (laneSelect) {
      laneSelect.value = lane === 'left' ? 'center' : lane === 'center' ? 'right' : 'left';
    }
    // Generate new random valid formula for next note convenience
    const nextProb = window.MathGenerator.generateOneDigitProblem();
    formulaInput.value = nextProb.formula;
  }

  recordCurrentTap() {
    if (!this.isPlayingPreview) return;
    const curTime = window.soundEngine.getCurrentAudioTime();
    if (curTime < 0.2) return;

    const prob = window.MathGenerator.generateOneDigitProblem();
    const laneCycle = ['center', 'left', 'center', 'right', 'left', 'right'];
    const lane = laneCycle[this.notes.length % laneCycle.length];

    this.notes.push({
      id: Date.now() + Math.random(),
      time: parseFloat(curTime.toFixed(2)),
      lane: lane,
      formula: prob.formula,
      answer: prob.answer
    });

    this.notes.sort((a, b) => a.time - b.time);
    this.renderNotesList();

    // Flash tap button visual feedback
    const btnTap = document.getElementById('editor-btn-tap-record');
    if (btnTap) {
      btnTap.classList.add('anim-pulse-hit');
      setTimeout(() => btnTap.classList.remove('anim-pulse-hit'), 150);
    }
  }

  toggleTapRecording() {
    if (!this.isRecordingTap) {
      this.isRecordingTap = true;
      const btn = document.getElementById('editor-btn-tap-record');
      if (btn) {
        btn.textContent = '● RECORDING BEATS (Tap or Press Spacebar)';
        btn.style.backgroundColor = '#E91E63';
      }
      if (!this.isPlayingPreview) {
        this.startPreview();
      }
    } else {
      this.isRecordingTap = false;
      const btn = document.getElementById('editor-btn-tap-record');
      if (btn) {
        btn.textContent = 'Tap to Beat (Record Beats)';
        btn.style.backgroundColor = '#9C27B0';
      }
    }
  }

  togglePreview() {
    if (this.isPlayingPreview) {
      this.stopPreview();
    } else {
      this.startPreview();
    }
  }

  startPreview() {
    if (this.currentAudioBuffer) {
      window.soundEngine.playAudioBuffer(this.currentAudioBuffer, 0, () => this.stopPreview());
    } else {
      const bpm = parseInt(document.getElementById('editor-song-bpm').value, 10) || 120;
      window.soundEngine.startProceduralRhythm(bpm, 60, () => this.stopPreview());
    }

    this.isPlayingPreview = true;
    const btn = document.getElementById('editor-btn-preview');
    if (btn) btn.textContent = '⏹ Stop Preview';

    const timeDisplay = document.getElementById('editor-preview-time');
    this.previewTimer = setInterval(() => {
      const cur = window.soundEngine.getCurrentAudioTime();
      if (timeDisplay) timeDisplay.textContent = `${cur.toFixed(2)}s`;
    }, 50);
  }

  stopPreview() {
    window.soundEngine.stopBGM();
    this.isPlayingPreview = false;
    this.isRecordingTap = false;

    const btnPreview = document.getElementById('editor-btn-preview');
    if (btnPreview) btnPreview.textContent = '▶ Play Audio Preview';

    const btnTap = document.getElementById('editor-btn-tap-record');
    if (btnTap) {
      btnTap.textContent = 'Tap to Beat (Record Beats)';
      btnTap.style.backgroundColor = '#9C27B0';
    }

    if (this.previewTimer) {
      clearInterval(this.previewTimer);
      this.previewTimer = null;
    }
  }

  deleteNote(id) {
    this.notes = this.notes.filter(n => n.id !== id);
    this.renderNotesList();
  }

  renderNotesList() {
    const listEl = document.getElementById('editor-notes-table-body');
    const countEl = document.getElementById('editor-notes-count');
    if (!listEl) return;

    if (countEl) countEl.textContent = `Total Notes: ${this.notes.length}`;

    if (this.notes.length === 0) {
      listEl.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#9E9E9E; padding:16px;">No notes charted yet. Add notes above or use Tap to Beat!</td></tr>`;
      return;
    }

    const laneLabels = {
      left: '<span style="background:#E1F5FE; color:#0288D1; padding:2px 6px; border-radius:4px; font-size:0.75rem; font-weight:800; margin-right:4px;">LEFT</span>',
      center: '<span style="background:#F3E5F5; color:#7B1FA2; padding:2px 6px; border-radius:4px; font-size:0.75rem; font-weight:800; margin-right:4px;">CENTER</span>',
      right: '<span style="background:#FFF3E0; color:#E65100; padding:2px 6px; border-radius:4px; font-size:0.75rem; font-weight:800; margin-right:4px;">RIGHT</span>'
    };

    listEl.innerHTML = this.notes.map((n, i) => `
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
        <td style="padding: 8px; font-weight:700;">#${i + 1}</td>
        <td style="padding: 8px; color: #00E5FF; font-weight:800;">${n.time.toFixed(2)}s</td>
        <td style="padding: 8px;">
          ${laneLabels[n.lane || 'center']}
          <div style="display:inline-block; background:#1E293B; padding:3px 10px; border-radius:12px; font-size:1.1rem; vertical-align:middle;">
            ${window.MathGenerator.renderFormulaHTML(n.formula)}
          </div>
          <span style="font-size:0.85rem; color:#15D8B3; margin-left:6px; font-weight:700;">(= ${n.answer})</span>
        </td>
        <td style="padding: 8px; text-align:right;">
          <button onclick="window.songEditor.deleteNote(${n.id})" style="background:#FF1744; color:#fff; border:none; border-radius:4px; padding:4px 8px; cursor:pointer; font-weight:700;">Delete</button>
        </td>
      </tr>
    `).join('');
  }

  saveChart() {
    const title = (document.getElementById('editor-song-title').value || '').trim();
    const artist = (document.getElementById('editor-song-artist').value || 'Custom Artist').trim();
    const bpm = parseInt(document.getElementById('editor-song-bpm').value, 10) || 120;
    const duration = parseInt(document.getElementById('editor-song-duration').value, 10) || 45;

    if (!title) {
      alert('Please enter a song title.');
      return;
    }

    if (this.notes.length === 0) {
      alert('Please chart at least one note before saving.');
      return;
    }

    const songId = 'custom_' + Date.now();
    const songData = {
      id: songId,
      title,
      artist,
      mapper: window.AuthSystem.getCurrentUser(),
      bpm,
      duration,
      approachTime: this.approachTime,
      type: this.currentAudioBuffer ? 'custom' : 'procedural',
      color: '#2196F3',
      difficulties: {
        medium: {
          name: 'Custom Chart',
          stars: 3.5,
          approachTime: this.approachTime,
          notes: this.notes
        }
      }
    };

    window.SongManager.saveCustomSong(songData, this.currentAudioBuffer);
    alert(`Map "${title}" saved successfully! You can select and play it now.`);

    if (window.app) {
      window.app.showScreen('screen-song-select');
    }
  }

  resetEditor() {
    this.stopPreview();
    this.notes = [];
    this.currentAudioBuffer = null;
    this.currentFileName = '';
    const titleInput = document.getElementById('editor-song-title');
    if (titleInput) titleInput.value = '';
    const fileInput = document.getElementById('editor-audio-file');
    if (fileInput) fileInput.value = '';
    const statusEl = document.getElementById('editor-upload-status');
    if (statusEl) statusEl.textContent = 'No audio file selected (system will generate procedural rhythm beat if none provided).';
    this.renderNotesList();
  }
}

window.songEditor = new SongEditor();
