/**
 * Song Manager & Built-in MP3 Tracks
 * Features the 3 uploaded MP3 tracks with 3 distinct difficulties:
 * 1. Rick Astley - Never Gonna Give You Up (Easy, Medium, Hard)
 * 2. Alstroemeria Records - Bad Apple!! feat. nomico (Easy, Medium, Hard)
 * 3. Nirvana - Smells Like Teen Spirit (Easy, Medium, Hard)
 */

function generateBeatNotes(bpm, offsetSec, durationSec, beatStep, difficulty) {
  const notes = [];
  const beatInterval = 60 / bpm;
  const laneCycle = ['center', 'left', 'center', 'right', 'left', 'right', 'left', 'center', 'right'];
  let time = offsetSec + beatInterval * 2;
  let id = 1;
  let stepIndex = 0;

  // Curated single-digit math problems: (formula, answer)
  const mathPool = [
    { formula: '1 + 1', answer: 2 },
    { id: 2, formula: '2 + 1', answer: 3 },
    { id: 3, formula: '3 - 1', answer: 2 },
    { id: 4, formula: '2 + 2', answer: 4 },
    { id: 5, formula: '5 - 0', answer: 5 },
    { id: 6, formula: '3 + 3', answer: 6 },
    { id: 7, formula: '7 - 2', answer: 5 },
    { id: 8, formula: '4 + 4', answer: 8 },
    { id: 9, formula: '9 - 1', answer: 8 },
    { id: 10, formula: '4 + 5', answer: 9 },
    { id: 11, formula: '8 - 7', answer: 1 },
    { id: 12, formula: '6 + 1', answer: 7 },
    { id: 13, formula: '9 - 9', answer: 0 },
    { id: 14, formula: '3 + 4', answer: 7 },
    { id: 15, formula: '1 + 2', answer: 3 },
    { id: 16, formula: '4 - 1', answer: 3 },
    { id: 17, formula: '2 + 4', answer: 6 },
    { id: 18, formula: '8 - 3', answer: 5 },
    { id: 19, formula: '6 - 2', answer: 4 },
    { id: 20, formula: '5 + 3', answer: 8 },
    { id: 21, formula: '9 - 5', answer: 4 },
    { id: 22, formula: '2 + 7', answer: 9 },
    { id: 23, formula: '7 - 6', answer: 1 },
    { id: 24, formula: '4 + 2', answer: 6 },
    { id: 25, formula: '8 - 8', answer: 0 },
    { id: 26, formula: '5 + 0', answer: 5 },
    { id: 27, formula: '9 - 3', answer: 6 },
    { id: 28, formula: '1 + 7', answer: 8 },
    { id: 29, formula: '6 - 4', answer: 2 },
    { id: 30, formula: '3 + 5', answer: 8 },
    { id: 31, formula: '7 - 4', answer: 3 },
    { id: 32, formula: '2 + 5', answer: 7 },
    { id: 33, formula: '8 - 6', answer: 2 },
    { id: 34, formula: '0 + 5', answer: 5 },
    { id: 35, formula: '7 - 3', answer: 4 },
    { id: 36, formula: '2 + 6', answer: 8 },
    { id: 37, formula: '9 - 7', answer: 2 },
    { id: 38, formula: '4 + 3', answer: 7 },
    { id: 39, formula: '8 - 2', answer: 6 },
    { id: 40, formula: '1 + 8', answer: 9 },
    { id: 41, formula: '5 - 4', answer: 1 },
    { id: 42, formula: '6 - 5', answer: 1 },
    { id: 43, formula: '2 + 3', answer: 5 },
    { id: 44, formula: '4 + 0', answer: 4 },
    { id: 45, formula: '7 - 5', answer: 2 },
    { id: 46, formula: '5 + 4', answer: 9 },
    { id: 47, formula: '8 - 1', answer: 7 },
    { id: 48, formula: '6 - 6', answer: 0 },
    { id: 49, formula: '3 + 6', answer: 9 },
    { id: 50, formula: '9 - 4', answer: 5 }
  ];

  while (time <= durationSec - 2) {
    const math = mathPool[(id - 1) % mathPool.length];
    const lane = difficulty === 'easy'
      ? (id % 2 === 0 ? 'center' : (id % 4 === 1 ? 'left' : 'right'))
      : laneCycle[(id - 1) % laneCycle.length];

    notes.push({
      id: id++,
      time: parseFloat(time.toFixed(3)),
      lane,
      formula: math.formula,
      answer: math.answer
    });

    // Step to next note
    let step = beatStep;
    if (difficulty === 'hard') {
      // Dynamic syncopation on hard mode (mix 1-beat and 2-beat cadence)
      step = (stepIndex % 3 === 2) ? 1 : beatStep;
    }
    time += step * beatInterval;
    stepIndex++;
  }

  return notes;
}

const SongManager = {
  STORAGE_KEY_CUSTOM_SONGS: 'MATH_RHYTHM_CUSTOM_SONGS',

  defaultSongs: [
    {
      id: 'rick_astley',
      title: 'Never Gonna Give You Up',
      artist: 'Rick Astley',
      mapper: 'PWK Beats',
      bpm: 113.3,
      duration: 213,
      previewTime: 18.0,
      audioUrl: 'assets/audio/rick_astley.mp3',
      color: '#2196F3',
      cover: 'assets/covers/rick.svg',
      difficulties: {
        easy: {
          name: 'Easy',
          stars: 1.5,
          approachTime: 2.4,
          notes: generateBeatNotes(113.3, 1.0, 92, 4, 'easy') // every 4 beats (~2.12s)
        },
        medium: {
          name: 'Medium',
          stars: 3.2,
          approachTime: 1.8,
          notes: generateBeatNotes(113.3, 1.0, 92, 2, 'medium') // every 2 beats (~1.06s)
        },
        hard: {
          name: 'Hard',
          stars: 5.0,
          approachTime: 1.35,
          notes: generateBeatNotes(113.3, 1.0, 92, 2, 'hard') // faster syncopated beats
        }
      }
    },
    {
      id: 'bad_apple',
      title: 'Bad Apple!! feat. nomico',
      artist: 'Alstroemeria Records',
      mapper: 'TouhouProject',
      bpm: 138,
      duration: 318,
      previewTime: 15.0,
      audioUrl: 'assets/audio/bad_apple.mp3',
      color: '#AB47BC',
      cover: 'assets/covers/bad_apple.svg',
      difficulties: {
        easy: {
          name: 'Easy',
          stars: 1.9,
          approachTime: 2.3,
          notes: generateBeatNotes(138, 0.5, 96, 4, 'easy') // every 4 beats (~1.74s)
        },
        medium: {
          name: 'Medium',
          stars: 3.8,
          approachTime: 1.7,
          notes: generateBeatNotes(138, 0.5, 96, 2, 'medium') // every 2 beats (~0.87s)
        },
        hard: {
          name: 'Hard',
          stars: 5.6,
          approachTime: 1.25,
          notes: generateBeatNotes(138, 0.5, 96, 2, 'hard') // intense speed
        }
      }
    },
    {
      id: 'nirvana',
      title: 'Smells Like Teen Spirit',
      artist: 'Nirvana',
      mapper: 'GrungeRocker',
      bpm: 117,
      duration: 301,
      previewTime: 25.0,
      audioUrl: 'assets/audio/nirvana.mp3',
      color: '#FF7043',
      cover: 'assets/covers/nirvana.svg',
      difficulties: {
        easy: {
          name: 'Easy',
          stars: 1.7,
          approachTime: 2.4,
          notes: generateBeatNotes(117, 1.2, 94, 4, 'easy') // every 4 beats (~2.05s)
        },
        medium: {
          name: 'Medium',
          stars: 3.5,
          approachTime: 1.8,
          notes: generateBeatNotes(117, 1.2, 94, 2, 'medium') // every 2 beats (~1.02s)
        },
        hard: {
          name: 'Hard',
          stars: 5.2,
          approachTime: 1.3,
          notes: generateBeatNotes(117, 1.2, 94, 2, 'hard') // rock drums rhythm
        }
      }
    }
  ],

  // In-memory audio buffers
  audioBufferStore: new Map(),

  getAllSongs() {
    const custom = this.getCustomSongs();
    return [...this.defaultSongs, ...custom];
  },

  getSongById(id) {
    const all = this.getAllSongs();
    return all.find(s => s.id === id) || this.defaultSongs[0];
  },

  getCustomSongs() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY_CUSTOM_SONGS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  saveCustomSong(songData, audioBuffer = null) {
    const custom = this.getCustomSongs();
    const existingIndex = custom.findIndex(s => s.id === songData.id);

    // If custom song doesn't have difficulties format, wrap it
    if (!songData.difficulties) {
      songData.difficulties = {
        medium: {
          name: 'Standard',
          stars: 3.0,
          approachTime: songData.approachTime || 2.0,
          notes: songData.notes || []
        }
      };
    }

    if (existingIndex >= 0) {
      custom[existingIndex] = songData;
    } else {
      custom.push(songData);
    }

    localStorage.setItem(this.STORAGE_KEY_CUSTOM_SONGS, JSON.stringify(custom));

    if (audioBuffer) {
      this.audioBufferStore.set(songData.id, audioBuffer);
    }
    return true;
  },

  deleteCustomSong(id) {
    let custom = this.getCustomSongs();
    custom = custom.filter(s => s.id !== id);
    localStorage.setItem(this.STORAGE_KEY_CUSTOM_SONGS, JSON.stringify(custom));
    this.audioBufferStore.delete(id);
  }
};

window.SongManager = SongManager;
