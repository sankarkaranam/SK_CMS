/**
 * auth.js — Production Server-Backed Authentication for Sankar Karanam CMS
 * Communicates with /api/auth/* for PBKDF2 verification, session token issuance,
 * and rate-limiting.
 */
const AdminAuth = (() => {
  const SESSION_KEY = 'sk_admin_session';

  return {
    async login(username, password) {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: username || 'admin',
            password: password
          })
        });

        if (res.ok) {
          const data = await res.json();
          localStorage.setItem(SESSION_KEY, JSON.stringify({
            token: data.token,
            expiresAt: new Date(data.expiresAt).getTime(),
            user: data.user
          }));
          return { ok: true };
        } else {
          const err = await res.json();
          return { ok: false, message: err.error || 'Invalid credentials' };
        }
      } catch (e) {
        return { ok: false, message: 'Server connection error. Please try again.' };
      }
    },

    async logout() {
      const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      if (s && s.token) {
        try {
          await fetch('/api/auth/logout', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${s.token}` }
          });
        } catch {}
      }
      localStorage.removeItem(SESSION_KEY);
    },

    async checkServerAuth() {
      const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      if (!s || !s.token || Date.now() > s.expiresAt) {
        localStorage.removeItem(SESSION_KEY);
        return false;
      }
      try {
        const res = await fetch('/api/auth/check', {
          headers: { 'Authorization': `Bearer ${s.token}` }
        });
        if (res.ok) {
          const data = await res.json();
          return !!data.authenticated;
        }
      } catch {}
      return false;
    },

    isAuthenticated() {
      const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      if (!s) return false;
      return Date.now() < s.expiresAt;
    },

    getToken() {
      const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      return s ? s.token : null;
    },

    guard() {
      if (!this.isAuthenticated()) {
        window.location.href = 'login.html';
        return false;
      }
      return true;
    },

    async changePassword(oldPassword, newPassword) {
      const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      if (!s || !s.token) return { ok: false, message: 'Not authenticated' };

      try {
        const res = await fetch('/api/auth/change-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${s.token}`
          },
          body: JSON.stringify({ oldPassword, newPassword })
        });
        if (res.ok) {
          return { ok: true, message: 'Password changed successfully' };
        } else {
          const err = await res.json();
          return { ok: false, message: err.error || 'Failed to change password' };
        }
      } catch (e) {
        return { ok: false, message: e.message };
      }
    }
  };
})();

window.AdminAuth = AdminAuth;
