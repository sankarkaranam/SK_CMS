/**
 * cms.js — Sankar Karanam Founder Platform Client Layer
 * Production REST API Client with in-memory caching & localStorage offline fallback.
 * Single source of truth is the centralized backend database at /api/*.
 */

const CMS = (() => {

  const API_BASE = '/api';

  // In-memory cache
  const cache = {
    posts: null,
    ideas: null,
    ventures: null,
    journey: null,
    projects: null,
    settings: null
  };

  const getAuthToken = () => {
    try {
      const s = JSON.parse(localStorage.getItem('sk_admin_session') || 'null');
      return s ? s.token : null;
    } catch { return null; }
  };

  const headers = (withAuth = false) => {
    const h = { 'Content-Type': 'application/json' };
    if (withAuth) {
      const t = getAuthToken();
      if (t) h['Authorization'] = `Bearer ${t}`;
    }
    return h;
  };

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const now = () => new Date().toISOString();
  const slug = (str) => (str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const readTime = (html) => {
    const words = (html || '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200)) + ' min read';
  };

  const escapeHTML = (str) => {
    if (!str && str !== 0) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const sanitizeHTML = (dirty) => {
    if (!dirty) return '';
    return String(dirty)
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/on\w+='[^']*'/gi, '')
      .replace(/javascript:/gi, '');
  };

  /* ══════════════════════════════════════════════════════
     POSTS API
  ══════════════════════════════════════════════════════ */
  const Posts = {
    async fetchAll() {
      try {
        const res = await fetch(`${API_BASE}/posts`, { headers: headers(true) });
        if (res.ok) {
          cache.posts = await res.json();
          localStorage.setItem('sk_cached_posts', JSON.stringify(cache.posts));
          return cache.posts;
        }
      } catch (e) {}
      // Fallback to cache or pre-seeded data
      try { cache.posts = JSON.parse(localStorage.getItem('sk_cached_posts') || '[]'); } catch { cache.posts = []; }
      return cache.posts;
    },

    all() {
      if (cache.posts) return cache.posts;
      try { return JSON.parse(localStorage.getItem('sk_cached_posts') || '[]'); } catch { return []; }
    },

    published() {
      return (Posts.all() || []).filter(p => p.status === 'published').sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    },

    get(id) {
      return (Posts.all() || []).find(p => p.id === id || p.slug === id) || null;
    },

    bySlug(sl) {
      return (Posts.all() || []).find(p => p.slug === sl) || null;
    },

    async save(post) {
      const isNew = !post.id || post.id.startsWith('temp_');
      const url = isNew ? `${API_BASE}/posts` : `${API_BASE}/posts/${post.id}`;
      const method = isNew ? 'POST' : 'PUT';

      try {
        const res = await fetch(url, {
          method: method,
          headers: headers(true),
          body: JSON.stringify(post)
        });
        if (res.ok) {
          const saved = await res.json();
          await Posts.fetchAll();
          return saved;
        } else {
          const err = await res.json();
          throw new Error(err.error || 'Failed to save post');
        }
      } catch (e) {
        console.error('Post save error:', e);
        throw e;
      }
    },

    async delete(id) {
      try {
        const res = await fetch(`${API_BASE}/posts/${id}`, {
          method: 'DELETE',
          headers: headers(true)
        });
        if (res.ok) {
          await Posts.fetchAll();
          return true;
        }
      } catch (e) {
        console.error('Delete post error:', e);
      }
      return false;
    },

    async incrementClap(id) {
      try {
        const res = await fetch(`${API_BASE}/posts/${id}/clap`, { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          return data.claps;
        }
      } catch {}
      return 0;
    }
  };

  /* ══════════════════════════════════════════════════════
     VENTURES API
  ══════════════════════════════════════════════════════ */
  const Ventures = {
    async fetchAll() {
      try {
        const res = await fetch(`${API_BASE}/ventures`);
        if (res.ok) {
          cache.ventures = await res.json();
          localStorage.setItem('sk_cached_ventures', JSON.stringify(cache.ventures));
          return cache.ventures;
        }
      } catch {}
      try { cache.ventures = JSON.parse(localStorage.getItem('sk_cached_ventures') || '[]'); } catch { cache.ventures = []; }
      return cache.ventures;
    },

    all() {
      if (cache.ventures) return cache.ventures;
      try { return JSON.parse(localStorage.getItem('sk_cached_ventures') || '[]'); } catch { return []; }
    },

    active() {
      return (Ventures.all() || []).filter(v => v.status !== 'archived').sort((a, b) => (a.order || 0) - (b.order || 0));
    },

    get(id) {
      return (Ventures.all() || []).find(v => v.id === id) || null;
    },

    async save(v) {
      try {
        const res = await fetch(`${API_BASE}/ventures`, {
          method: 'POST',
          headers: headers(true),
          body: JSON.stringify(v)
        });
        if (res.ok) {
          await Ventures.fetchAll();
          return await res.json();
        }
      } catch (e) {
        console.error('Save venture error:', e);
      }
    },

    async delete(id) {
      try {
        const res = await fetch(`${API_BASE}/ventures/${id}`, {
          method: 'DELETE',
          headers: headers(true)
        });
        if (res.ok) {
          await Ventures.fetchAll();
          return true;
        }
      } catch (e) {}
      return false;
    }
  };

  /* ══════════════════════════════════════════════════════
     JOURNEY API
  ══════════════════════════════════════════════════════ */
  const Journey = {
    async fetchAll() {
      try {
        const res = await fetch(`${API_BASE}/journey`);
        if (res.ok) {
          cache.journey = await res.json();
          localStorage.setItem('sk_cached_journey', JSON.stringify(cache.journey));
          return cache.journey;
        }
      } catch {}
      try { cache.journey = JSON.parse(localStorage.getItem('sk_cached_journey') || '[]'); } catch { cache.journey = []; }
      return cache.journey;
    },

    all() {
      if (cache.journey) return cache.journey;
      try { return JSON.parse(localStorage.getItem('sk_cached_journey') || '[]'); } catch { return []; }
    },

    ordered() {
      return (Journey.all() || []).sort((a, b) => (a.order || 0) - (b.order || 0));
    },

    get(id) {
      return (Journey.all() || []).find(j => j.id === id) || null;
    },

    async save(j) {
      try {
        const res = await fetch(`${API_BASE}/journey`, {
          method: 'POST',
          headers: headers(true),
          body: JSON.stringify(j)
        });
        if (res.ok) {
          await Journey.fetchAll();
          return await res.json();
        }
      } catch (e) {}
    },

    async delete(id) {
      try {
        const res = await fetch(`${API_BASE}/journey/${id}`, {
          method: 'DELETE',
          headers: headers(true)
        });
        if (res.ok) {
          await Journey.fetchAll();
          return true;
        }
      } catch (e) {}
      return false;
    }
  };

  /* ══════════════════════════════════════════════════════
     CONTACTS & NEWSLETTER
  ══════════════════════════════════════════════════════ */
  const Contacts = {
    async fetchAll() {
      try {
        const res = await fetch(`${API_BASE}/contacts`, { headers: headers(true) });
        if (res.ok) return await res.json();
      } catch {}
      return [];
    },

    async submit(form) {
      try {
        const res = await fetch(`${API_BASE}/contact`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        });
        return await res.json();
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },

    async markRead(id) {
      try {
        await fetch(`${API_BASE}/contacts/${id}/read`, { method: 'PUT', headers: headers(true) });
      } catch {}
    },

    async delete(id) {
      try {
        await fetch(`${API_BASE}/contacts/${id}`, { method: 'DELETE', headers: headers(true) });
      } catch {}
    }
  };

  const Subscribers = {
    async fetchAll() {
      try {
        const res = await fetch(`${API_BASE}/newsletter`, { headers: headers(true) });
        if (res.ok) return await res.json();
      } catch {}
      return [];
    },

    async add(email, name = '', source = 'website') {
      try {
        const res = await fetch(`${API_BASE}/newsletter`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name, source })
        });
        return await res.json();
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },

    async exportCSV() {
      try {
        const res = await fetch(`${API_BASE}/newsletter/export`, { headers: headers(true) });
        if (res.ok) return await res.text();
      } catch {}
      return '';
    }
  };

  /* ══════════════════════════════════════════════════════
     SETTINGS & TELEMETRY
  ══════════════════════════════════════════════════════ */
  const Settings = {
    async fetch() {
      try {
        const res = await fetch(`${API_BASE}/settings`);
        if (res.ok) {
          cache.settings = await res.json();
          return cache.settings;
        }
      } catch {}
      return cache.settings || {};
    },

    get() {
      return cache.settings || {
        founderName: 'Sankar Karanam',
        founderBio: 'Engineer turned serial entrepreneur. Founder of OruMind, Creators Club, Worke & AdPresence.',
        linkedIn: 'https://www.linkedin.com/in/sankarkaranam7/',
        email: 'sankarkaranam7@gmail.com',
        phone: '+91 88855 94123',
        whatsapp: 'https://wa.me/918885594123',
        footerStatement: 'Building ventures that scale & endure.'
      };
    },

    async save(s) {
      try {
        const res = await fetch(`${API_BASE}/settings`, {
          method: 'PUT',
          headers: headers(true),
          body: JSON.stringify(s)
        });
        if (res.ok) {
          cache.settings = await res.json();
          return cache.settings;
        }
      } catch (e) {}
    }
  };

  const Analytics = {
    async trackPageView(path) {
      try {
        await fetch(`${API_BASE}/analytics/view`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path })
        });
      } catch {}
    },

    async fetch() {
      try {
        const res = await fetch(`${API_BASE}/analytics`, { headers: headers(true) });
        if (res.ok) return await res.json();
      } catch {}
      return { pageViews: {}, events: [] };
    }
  };

  /* ══════════════════════════════════════════════════════
     IDEAS API
  ══════════════════════════════════════════════════════ */
  const Ideas = {
    async fetchAll() {
      try {
        const res = await fetch(`${API_BASE}/ideas`, { headers: headers(true) });
        if (res.ok) {
          cache.ideas = await res.json();
          localStorage.setItem('sk_cached_ideas', JSON.stringify(cache.ideas));
          return cache.ideas;
        }
      } catch (e) {}
      try { cache.ideas = JSON.parse(localStorage.getItem('sk_cached_ideas') || '[]'); } catch { cache.ideas = []; }
      return cache.ideas;
    },

    all() {
      if (cache.ideas) return cache.ideas;
      try { return JSON.parse(localStorage.getItem('sk_cached_ideas') || '[]'); } catch { return []; }
    },

    published() {
      return (Ideas.all() || []).filter(i => i.status === 'published').sort((a, b) => new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt));
    },

    get(id) {
      return (Ideas.all() || []).find(i => i.id === id || i.slug === id) || null;
    },

    async save(idea) {
      const isNew = !idea.id || idea.id.startsWith('temp_');
      const url = isNew ? `${API_BASE}/ideas` : `${API_BASE}/ideas/${idea.id}`;
      const method = isNew ? 'POST' : 'PUT';
      try {
        const res = await fetch(url, {
          method,
          headers: headers(true),
          body: JSON.stringify(idea)
        });
        if (res.ok) {
          await Ideas.fetchAll();
          return await res.json();
        }
      } catch (e) {}
    },

    async delete(id) {
      try {
        const res = await fetch(`${API_BASE}/ideas/${id}`, {
          method: 'DELETE',
          headers: headers(true)
        });
        if (res.ok) {
          await Ideas.fetchAll();
          return true;
        }
      } catch (e) {}
      return false;
    }
  };

  // Auto-fetch data on initialization
  Promise.all([Posts.fetchAll(), Ideas.fetchAll(), Ventures.fetchAll(), Journey.fetchAll(), Settings.fetch()]).catch(() => {});

  return {
    Posts,
    Ideas,
    Ventures,
    Journey,
    Contacts,
    Subscribers,
    Settings,
    Analytics,
    utils: { uid, now, slug, readTime, escapeHTML, sanitizeHTML }
  };

})();

window.CMS = CMS;
