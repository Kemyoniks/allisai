/**
 * Authentication Module
 * Handles User Registration, Login, Session Management, and English Alerts.
 */

const AuthSystem = {
  STORAGE_KEY_USERS: 'MATH_RHYTHM_USERS',
  STORAGE_KEY_CURRENT: 'MATH_RHYTHM_CURRENT_USER',

  init() {
    const users = this.getUsers();
    if (Object.keys(users).length === 0) {
      users['Player1'] = { password: '123' };
      this.saveUsers(users);
    }
  },

  getUsers() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY_USERS);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  },

  saveUsers(users) {
    try {
      localStorage.setItem(this.STORAGE_KEY_USERS, JSON.stringify(users));
    } catch (e) {
      console.error('Error saving users', e);
    }
  },

  getCurrentUser() {
    try {
      const u = localStorage.getItem(this.STORAGE_KEY_CURRENT);
      return u || 'Guest';
    } catch (e) {
      return 'Guest';
    }
  },

  setCurrentUser(username) {
    localStorage.setItem(this.STORAGE_KEY_CURRENT, username);
  },

  register(username, password, confirmPassword) {
    const cleanUser = (username || '').trim();
    if (!cleanUser) {
      return { success: false, message: 'Please enter a username.' };
    }

    if (!password) {
      return { success: false, message: 'Please enter a password.' };
    }

    if (password !== confirmPassword) {
      return { success: false, message: 'Passwords do not match.' };
    }

    const users = this.getUsers();
    if (users[cleanUser]) {
      return { success: false, message: 'Username is already taken.' };
    }

    users[cleanUser] = { password };
    this.saveUsers(users);
    this.setCurrentUser(cleanUser);

    return { success: true, user: cleanUser };
  },

  login(username, password) {
    const cleanUser = (username || '').trim();
    const users = this.getUsers();

    if (!cleanUser || !password || !users[cleanUser] || users[cleanUser].password !== password) {
      return {
        success: false,
        message: 'Incorrect username or password.'
      };
    }

    this.setCurrentUser(cleanUser);
    return { success: true, user: cleanUser };
  },

  logout() {
    this.setCurrentUser('Guest');
  }
};

window.AuthSystem = AuthSystem;
AuthSystem.init();
