/**
 * nav.js — Shared Navigation Component
 * Injects the site-wide navigation, mobile menu, search modal,
 * and footer into every page.
 */
(function () {
  /* ── Config ── */
  const NAV_ITEMS = [
    { label: 'Home',       href: '/index.html',            key: '/' },
    { label: 'About',      href: '/about.html',            key: '/about' },
    { label: 'Journal',    href: '/journal/index.html',    key: '/journal' },
    { label: 'Ventures',   href: '/ventures/index.html',   key: '/ventures' },
    { label: 'Journey',    href: '/journey/index.html',    key: '/journey' },
    { label: 'Projects',   href: '/projects/index.html',   key: '/projects' },
    { label: 'Media',      href: '/media/index.html',      key: '/media' },
    { label: 'Contact',    href: '/contact/index.html',    key: '/contact' },
  ];

  function getRoot() {
    const parts = window.location.pathname.split('/').filter(Boolean);
    if (parts.length === 0) return '';
    const last = parts[parts.length - 1];
    const isFile = last.includes('.');
    const dirDepth = isFile ? parts.length - 1 : parts.length;
    return dirDepth > 0 ? '../'.repeat(dirDepth) : '';
  }

  function resolveHref(href) {
    const root = getRoot();
    return root + href.replace(/^\//, '');
  }

  function isActive(key) {
    const path = window.location.pathname;
    if (key === '/') {
      return path === '/' || path === '/index.html' || (path.endsWith('/index.html') && !path.includes('/journal') && !path.includes('/ventures') && !path.includes('/about') && !path.includes('/journey') && !path.includes('/projects') && !path.includes('/media') && !path.includes('/contact'));
    }
    return path.includes(key.replace('/', ''));
  }

  function buildNav() {
    const links = NAV_ITEMS.map(item => `
      <a href="${resolveHref(item.href)}" class="nav-link${isActive(item.key) ? ' active' : ''}">${item.label}</a>
    `).join('');

    const mobileLinks = NAV_ITEMS.map(item => `
      <a href="${resolveHref(item.href)}" class="nav-mobile-link${isActive(item.key) ? ' active' : ''}">${item.label}</a>
    `).join('');

    const settings = typeof CMS !== 'undefined' ? CMS.Settings.get() : {};
    const avatar = settings.founderImage || 'assets/sankar.jpeg';
    const root = getRoot();

    return `
      <nav class="site-nav" id="site-nav" role="navigation" aria-label="Main navigation">
        <div class="nav-inner">
          <a href="${root}index.html" class="nav-brand" aria-label="Sankar Karanam - Home">
            <img src="${root}${avatar}" alt="Sankar Karanam" class="nav-brand-avatar" width="36" height="36">
            <span class="nav-brand-name">Sankar Karanam</span>
          </a>

          <div class="nav-links" role="menubar">
            ${links}
            <button class="btn btn--icon btn--ghost" id="search-trigger" aria-label="Search" title="Search (Ctrl+K)" style="margin-left:4px">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </button>
            <a href="${root}contact/index.html" class="nav-cta">Let's Connect</a>
          </div>

          <button class="nav-toggle" id="nav-toggle" aria-label="Toggle navigation" aria-expanded="false">
            <span class="nav-toggle-bar"></span>
            <span class="nav-toggle-bar"></span>
            <span class="nav-toggle-bar"></span>
          </button>
        </div>
      </nav>

      <!-- Mobile Nav -->
      <div class="nav-mobile" id="nav-mobile" role="menu">
        <div class="nav-mobile-links">
          ${mobileLinks}
          <button class="nav-mobile-link" id="mobile-search-trigger" style="text-align:left; display:flex; align-items:center; gap:8px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            Search
          </button>
        </div>
        <a href="${root}contact/index.html" class="nav-mobile-cta">Let's Connect →</a>
      </div>

      <!-- Search Modal -->
      <div class="search-modal-overlay" id="search-overlay" role="dialog" aria-modal="true" aria-label="Search">
        <div class="search-modal">
          <div class="search-modal-input-wrap">
            <svg class="search-modal-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input type="text" class="search-modal-input" id="search-modal-input" placeholder="Search articles, ventures, projects…" autocomplete="off" spellcheck="false">
            <button id="search-close-btn" style="color:var(--text-muted); padding:4px 8px; font-size:12px; border-radius:4px; border:1px solid var(--border-light);" title="Close">ESC</button>
          </div>
          <div class="search-results" id="search-results">
            <p class="search-no-results">Start typing to search…</p>
          </div>
        </div>
      </div>

      <!-- Toast Container -->
      <div class="toast-container" id="toast-container" aria-live="polite"></div>
    `;
  }

  function buildFooter() {
    const settings = typeof CMS !== 'undefined' ? CMS.Settings.get() : {};
    const root = getRoot();
    const year = new Date().getFullYear();
    const socials = [
      { label: 'LinkedIn', href: settings.linkedIn || 'https://www.linkedin.com/in/sankarkaranam7/', icon: 'in' },
      { label: 'X',        href: settings.x || '#',         icon: '𝕏' },
      { label: 'YouTube',  href: settings.youtube || '#',    icon: '▶' },
      { label: 'Instagram',href: settings.instagram || '#',  icon: '◎' },
    ];
    const socialLinks = socials.map(s => `<a href="${s.href}" class="footer-social-link" target="_blank" rel="noopener noreferrer" aria-label="${s.label}">${s.icon}</a>`).join('');

    return `
      <footer class="site-footer">
        <div class="container">
          <div class="footer-top">
            <div>
              <div class="footer-brand-name">Sankar Karanam</div>
              <p class="footer-brand-desc">${settings.footerStatement || 'Building ventures that scale & endure.'}</p>
              <div class="footer-social-links">${socialLinks}</div>
            </div>
            <div>
              <div class="footer-col-title">Navigate</div>
              <div class="footer-links">
                <a href="${root}index.html" class="footer-link">Home</a>
                <a href="${root}about.html" class="footer-link">About</a>
                <a href="${root}journal/index.html" class="footer-link">Journal</a>
                <a href="${root}ventures/index.html" class="footer-link">Ventures</a>
                <a href="${root}journey/index.html" class="footer-link">Journey</a>
              </div>
            </div>
            <div>
              <div class="footer-col-title">Explore</div>
              <div class="footer-links">
                <a href="${root}projects/index.html" class="footer-link">Projects</a>
                <a href="${root}media/index.html" class="footer-link">Media</a>
                <a href="${root}newsletter/index.html" class="footer-link">Newsletter</a>
                <a href="${root}contact/index.html" class="footer-link">Contact</a>
              </div>
            </div>
            <div>
              <div class="footer-col-title">Ventures</div>
              <div class="footer-links">
                <a href="http://orumind.com/" class="footer-link" target="_blank" rel="noopener noreferrer">OruMind</a>
                <a href="https://creatorsclub.co.in/" class="footer-link" target="_blank" rel="noopener noreferrer">Creators Club</a>
                <a href="http://worke.in/" class="footer-link" target="_blank" rel="noopener noreferrer">Worke</a>
                <a href="http://adpresence.in/" class="footer-link" target="_blank" rel="noopener noreferrer">AdPresence</a>
              </div>
            </div>
          </div>
          <div class="footer-bottom">
            <p class="footer-copyright">© ${year} Sankar Karanam. All rights reserved.</p>
            <div class="footer-legal">
              <a href="${root}privacy.html" class="footer-legal-link">Privacy Policy</a>
              <a href="${root}terms.html" class="footer-legal-link">Terms of Use</a>
              <a href="${root}sitemap.xml" class="footer-legal-link">Sitemap</a>
            </div>
          </div>
        </div>
      </footer>
    `;
  }

  /* ── Inject ── */
  function init() {
    if (document.getElementById('site-nav')) return;

    // Inject header structure in natural order
    const fragment = document.createRange().createContextualFragment(buildNav());
    document.body.insertBefore(fragment, document.body.firstChild);

    // Inject footer
    const footerFragment = document.createRange().createContextualFragment(buildFooter());
    document.body.appendChild(footerFragment);

    /* ── Scroll Behaviour ── */
    const nav = document.getElementById('site-nav');
    window.addEventListener('scroll', () => {
      if (window.scrollY > 20) nav?.classList.add('scrolled');
      else nav?.classList.remove('scrolled');
    }, { passive: true });

    /* ── Mobile Toggle ── */
    const toggle = document.getElementById('nav-toggle');
    const mobileNav = document.getElementById('nav-mobile');
    toggle?.addEventListener('click', () => {
      const open = mobileNav.classList.toggle('open');
      toggle.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
    mobileNav?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      mobileNav.classList.remove('open');
      toggle?.classList.remove('open');
      document.body.style.overflow = '';
    }));

    /* ── Search ── */
    const overlay = document.getElementById('search-overlay');
    const searchInput = document.getElementById('search-modal-input');
    const searchResults = document.getElementById('search-results');

    function openSearch() {
      overlay.classList.add('open');
      searchInput?.focus();
    }
    function closeSearch() {
      overlay.classList.remove('open');
      if (searchInput) searchInput.value = '';
      if (searchResults) searchResults.innerHTML = '<p class="search-no-results">Start typing to search…</p>';
    }

    document.getElementById('search-trigger')?.addEventListener('click', openSearch);
    document.getElementById('mobile-search-trigger')?.addEventListener('click', openSearch);
    document.getElementById('search-close-btn')?.addEventListener('click', closeSearch);
    overlay?.addEventListener('click', (e) => { if (e.target === overlay) closeSearch(); });
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); }
      if (e.key === 'Escape') closeSearch();
    });

    searchInput?.addEventListener('input', () => {
      const q = searchInput.value.trim().toLowerCase();
      if (!q || q.length < 2) {
        searchResults.innerHTML = '<p class="search-no-results">Start typing to search…</p>';
        return;
      }
      const root = getRoot();
      const results = [];
      const escape = typeof CMS !== 'undefined' ? CMS.utils.escapeHTML : (s) => s;
      if (typeof CMS !== 'undefined') {
        CMS.Posts.published().forEach(p => {
          if (p.title.toLowerCase().includes(q) || (p.excerpt||'').toLowerCase().includes(q) || (p.category||'').toLowerCase().includes(q)) {
            results.push({ type: 'Article', title: escape(p.title), excerpt: escape(p.excerpt), href: `${root}journal/${p.slug}.html` });
          }
        });
        CMS.Ventures.active().forEach(v => {
          if (v.name.toLowerCase().includes(q) || (v.description||'').toLowerCase().includes(q)) {
            results.push({ type: 'Venture', title: escape(v.name), excerpt: escape(v.description), href: `${root}ventures/index.html` });
          }
        });
        CMS.Projects.all().forEach(pr => {
          if (pr.name.toLowerCase().includes(q) || (pr.description||'').toLowerCase().includes(q)) {
            results.push({ type: 'Project', title: escape(pr.name), excerpt: escape(pr.description), href: `${root}projects/index.html` });
          }
        });
      }
      if (results.length === 0) {
        searchResults.innerHTML = `<p class="search-no-results">No results for "<strong>${escape(q)}</strong>"</p>`;
      } else {
        searchResults.innerHTML = results.slice(0, 8).map(r => `
          <a href="${r.href}" class="search-result-item" onclick="document.getElementById('search-overlay').classList.remove('open')">
            <div>
              <div class="search-result-type">${r.type}</div>
              <div class="search-result-title">${r.title}</div>
              <div class="search-result-excerpt">${r.excerpt || ''}</div>
            </div>
          </a>
        `).join('');
      }
    });

    /* ── Analytics ── */
    if (typeof CMS !== 'undefined') {
      CMS.Analytics.trackPageView(window.location.pathname);
    }
  }

  /* ── Toast ── */
  window.showToast = function(msg, type = 'success', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, duration);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
