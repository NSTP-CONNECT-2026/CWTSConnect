/**
 * CWTSConnect — Persistent File-based Session Store (High Performance)
 * In-memory caching with debounced asynchronous file persistence.
 * Eliminates synchronous blocking disk I/O on every HTTP request.
 */

const fs = require('fs');
const path = require('path');
const session = require('express-session');

const SESSION_FILE_PATH = path.join(__dirname, '../../data/sessions.json');

class FileSessionStore extends session.Store {
  constructor(options = {}) {
    super(options);
    this.filePath = options.filePath || SESSION_FILE_PATH;
    this._cache = {};
    this._saveTimeout = null;
    this._isWriting = false;
    this._pendingWrite = false;

    // Initialize directory and load cache once synchronously on startup
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          this._cache = parsed;
        }
      } else {
        fs.writeFileSync(this.filePath, '{}', 'utf8');
      }
    } catch (err) {
      console.warn('Session store initialization:', err.message);
    }
  }

  _scheduleSave() {
    if (this._saveTimeout) return;

    this._saveTimeout = setTimeout(() => {
      this._saveTimeout = null;
      this._persistToDisk();
    }, 1000); // Debounce write to disk once per second
  }

  _persistToDisk() {
    if (this._isWriting) {
      this._pendingWrite = true;
      return;
    }

    this._isWriting = true;
    const jsonStr = JSON.stringify(this._cache);

    fs.writeFile(this.filePath, jsonStr, 'utf8', (err) => {
      this._isWriting = false;
      if (err) {
        console.warn('Session file async write error:', err.message);
      }
      if (this._pendingWrite) {
        this._pendingWrite = false;
        this._scheduleSave();
      }
    });
  }

  get(sid, callback) {
    const sess = this._cache[sid];

    if (!sess) {
      return callback(null, null);
    }

    // Check expiry
    if (sess.cookie && sess.cookie.expires) {
      const expires = new Date(sess.cookie.expires);
      if (expires <= new Date()) {
        delete this._cache[sid];
        this._scheduleSave();
        return callback(null, null);
      }
    }

    return callback(null, sess);
  }

  set(sid, sess, callback) {
    this._cache[sid] = sess;
    this._scheduleSave();
    if (typeof callback === 'function') {
      callback(null);
    }
  }

  destroy(sid, callback) {
    if (this._cache[sid]) {
      delete this._cache[sid];
      this._scheduleSave();
    }
    if (typeof callback === 'function') {
      callback(null);
    }
  }

  touch(sid, sess, callback) {
    if (this._cache[sid]) {
      this._cache[sid].cookie = sess.cookie;
      this._scheduleSave();
    }
    if (typeof callback === 'function') {
      callback(null);
    }
  }
}

module.exports = FileSessionStore;
