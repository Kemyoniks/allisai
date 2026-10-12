/**
 * Leaderboard Module
 * Manages per-song and per-difficulty leaderboards, saving scores, and ranking.
 */

const LeaderboardSystem = {
  STORAGE_KEY_PREFIX: 'MATH_RHYTHM_LB_',

  init() {
    // Seed initial demo leaderboards for the uploaded tracks across difficulties
    const songs = ['rick_astley', 'bad_apple', 'nirvana', 'song_tutorial'];
    const diffs = ['easy', 'medium', 'hard'];

    songs.forEach(songId => {
      diffs.forEach(diff => {
        const mult = diff === 'easy' ? 0.7 : diff === 'medium' ? 1.0 : 1.35;
        this.seedDefaults(`${songId}_${diff}`, [
          { user: 'Semyoniks', score: Math.round(98500 * mult), perfect: 32, great: 3, miss: 0, grade: 'SS', date: '2026-10-01' },
          { user: 'darkyshark', score: Math.round(94200 * mult), perfect: 29, great: 5, miss: 1, grade: 'S', date: '2026-10-02' },
          { user: 'fairystick', score: Math.round(89400 * mult), perfect: 26, great: 7, miss: 2, grade: 'S', date: '2026-10-02' },
          { user: 'Skierass', score: Math.round(82100 * mult), perfect: 22, great: 8, miss: 3, grade: 'A', date: '2026-10-03' },
          { user: 'BANTHER', score: Math.round(76500 * mult), perfect: 19, great: 10, miss: 4, grade: 'A', date: '2026-10-03' }
        ]);
      });
    });
  },

  seedDefaults(keySuffix, defaultEntries) {
    const key = this.STORAGE_KEY_PREFIX + keySuffix;
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify(defaultEntries));
    }
  },

  /**
   * Get leaderboard entries for a specific song and difficulty
   * @param {string} songId
   * @param {string} difficulty
   * @returns {Array}
   */
  getLeaderboard(songId, difficulty = 'medium') {
    try {
      const key = `${this.STORAGE_KEY_PREFIX}${songId}_${difficulty}`;
      const data = localStorage.getItem(key);
      const list = data ? JSON.parse(data) : [];
      return list.sort((a, b) => b.score - a.score);
    } catch (e) {
      return [];
    }
  },

  /**
   * Submit a new score for a specific song and difficulty
   */
  submitScore(songId, difficulty = 'medium', user, score, perfect, great, miss) {
    const key = `${this.STORAGE_KEY_PREFIX}${songId}_${difficulty}`;
    const list = this.getLeaderboard(songId, difficulty);

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    // Compute grade
    const total = (perfect || 0) + (great || 0) + (miss || 0);
    const acc = total > 0 ? (perfect + great * 0.6) / total : 1;
    let grade = 'D';
    if (miss === 0 && acc >= 0.98) grade = 'SS';
    else if (acc >= 0.90) grade = 'S';
    else if (acc >= 0.80) grade = 'A';
    else if (acc >= 0.65) grade = 'B';
    else if (acc >= 0.50) grade = 'C';

    const newRecord = {
      user: user || 'Guest',
      score: Math.round(score),
      perfect: perfect || 0,
      great: great || 0,
      miss: miss || 0,
      grade,
      date: dateStr,
      timestamp: Date.now()
    };

    list.push(newRecord);
    list.sort((a, b) => b.score - a.score);

    const trimmed = list.slice(0, 50);
    localStorage.setItem(key, JSON.stringify(trimmed));

    const rank = trimmed.findIndex(r => r.timestamp === newRecord.timestamp) + 1;
    return { success: true, rank, record: newRecord };
  }
};

window.LeaderboardSystem = LeaderboardSystem;
LeaderboardSystem.init();
