/**
 * home.js — Homepage controller
 * Renders: articles grid, ventures grid, journey teaser,
 * newsletter form, 1% calculator, typewriter, quote refresh,
 * intersection observer animations
 */
document.addEventListener('DOMContentLoaded', () => {

  const DAILY_QUOTES = typeof DAILY_INSIGHTS !== 'undefined' ? DAILY_INSIGHTS : [
    "True leverage isn't working 80 hours a week — it's building systems and content that work for you 24/7.",
    "If you improve by 1% every day for a year, you end up 37x better. Small habits create massive compounding.",
    "Your personal brand is the ultimate digital equity. Products come and go, but founder reputation endures.",
    "Don't build in isolation. Share your raw progress, failures, and breakthroughs openly.",
    "Security and scalability must be baked into your product architecture from Day 1, not patched in after.",
    "The best content doesn't chase trends. It creates them by solving deep problems with deep expertise.",
    "Capital efficiency beats vanity growth every single time. Know your unit economics cold.",
  ];

  /* ── Typewriter ── */
  const ROLES = [
    "Serial Entrepreneur & Founder",
    "AI & Software Builder",
    "Cybersecurity Author",
    "1% Daily Growth Practitioner",
    "Content Strategy Architect",
  ];
  let ri = 0, ci = 0, deleting = false;
  const tw = document.getElementById('typewriter-text');
  function typewrite() {
    if (!tw) return;
    const role = ROLES[ri];
    tw.textContent = deleting ? role.slice(0, ci - 1) : role.slice(0, ci + 1);
    ci += deleting ? -1 : 1;
    let speed = deleting ? 35 : 70;
    if (!deleting && ci === role.length) { speed = 2000; deleting = true; }
    else if (deleting && ci === 0) { deleting = false; ri = (ri + 1) % ROLES.length; speed = 350; }
    setTimeout(typewrite, speed);
  }
  typewrite();

  /* ── Daily Quote ── */
  const quoteEl = document.getElementById('daily-quote');
  const refreshBtn = document.getElementById('refresh-quote');
  let quoteIdx = Math.floor(Math.random() * DAILY_QUOTES.length);
  function setQuote() {
    if (!quoteEl) return;
    quoteEl.style.opacity = '0';
    setTimeout(() => {
      quoteEl.textContent = `"${DAILY_QUOTES[quoteIdx]}"`;
      quoteEl.style.opacity = '1';
      quoteEl.style.transition = 'opacity 0.2s';
    }, 200);
    quoteIdx = (quoteIdx + 1) % DAILY_QUOTES.length;
  }
  refreshBtn?.addEventListener('click', setQuote);

  /* ── Render Articles ── */
  const articlesGrid = document.getElementById('home-articles-grid');
  const filterPills  = document.querySelectorAll('.filter-pill');
  let currentCat = 'all';

  function formatDate(iso) {
    try { return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return iso; }
  }

  function gradients(cat) {
    const map = {
      '1% Daily Growth':  'linear-gradient(135deg,rgba(37,99,235,.06),rgba(99,102,241,.08))',
      'AI & Tech':        'linear-gradient(135deg,rgba(79,70,229,.06),rgba(124,58,237,.08))',
      'Entrepreneurship': 'linear-gradient(135deg,rgba(217,119,6,.06),rgba(234,88,12,.08))',
      'Content Creation': 'linear-gradient(135deg,rgba(5,150,105,.06),rgba(13,148,136,.08))',
      'Cybersecurity':    'linear-gradient(135deg,rgba(225,29,72,.06),rgba(244,63,94,.08))',
    };
    return map[cat] || 'linear-gradient(135deg,rgba(100,116,139,.04),rgba(148,163,184,.06))';
  }

  function emojiFor(cat) {
    const map = { '1% Daily Growth': '📈', 'AI & Tech': '🤖', 'Entrepreneurship': '🚀', 'Content Creation': '🎬', 'Cybersecurity': '🛡️' };
    return map[cat] || '💡';
  }

  function renderArticles() {
    if (!articlesGrid || typeof CMS === 'undefined') return;
    const posts = CMS.Posts.published().filter(p => currentCat === 'all' || p.category === currentCat).slice(0, 6);
    if (posts.length === 0) {
      articlesGrid.innerHTML = '<p style="color:var(--text-muted); grid-column:1/-1; text-align:center; padding:var(--space-12) 0;">No articles in this category yet. Check back soon.</p>';
      return;
    }
    articlesGrid.innerHTML = posts.map(p => `
      <a href="journal/${p.slug}.html" class="article-card" aria-label="${p.title}">
        <div class="article-card-cover article-card-cover-placeholder" style="background:${p.coverGradient || gradients(p.category)}">
          <span aria-hidden="true">${emojiFor(p.category)}</span>
        </div>
        <div class="article-card-body">
          <div class="article-card-meta">
            <span class="article-card-category">${p.category}</span>
            <span class="article-card-date">${formatDate(p.publishedAt)}</span>
            <span class="article-card-readtime">${p.readTime || '5 min read'}</span>
          </div>
          <h3 class="article-card-title">${p.title}</h3>
          <p class="article-card-excerpt">${p.excerpt}</p>
          <div class="article-card-footer">
            <span class="article-card-claps">👏 ${p.claps || 0}</span>
            <span class="article-card-link">Read more →</span>
          </div>
        </div>
      </a>
    `).join('');
  }

  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => { p.classList.remove('active'); p.setAttribute('aria-selected', 'false'); });
      pill.classList.add('active');
      pill.setAttribute('aria-selected', 'true');
      currentCat = pill.dataset.cat;
      renderArticles();
    });
  });
  renderArticles();

  /* ── Render Ventures ── */
  const venturesGrid = document.getElementById('home-ventures-grid');
  function renderVentures() {
    if (!venturesGrid || typeof CMS === 'undefined') return;
    const ventures = CMS.Ventures.active();
    venturesGrid.innerHTML = ventures.map(v => `
      <div class="venture-card">
        <div class="venture-logo-wrap">
          ${v.logo ? `<img src="${v.logo}" alt="${v.name} logo" class="venture-logo" width="48" height="48" loading="lazy" onerror="this.style.display='none'">` : ''}
          <div ${v.logo ? 'style="display:none"' : ''} class="venture-logo-emoji">${v.emoji || '🏢'}</div>
          <div>
            <div class="venture-name">${v.name}</div>
            <div class="venture-tagline">${v.tagline}</div>
          </div>
        </div>
        <div class="venture-role-badge">
          <span class="badge badge--blue badge--dot">${v.role}</span>
        </div>
        <p class="venture-description">${v.description}</p>
        <div class="venture-footer">
          <span class="badge badge--${v.status === 'active' ? 'green' : v.status === 'building' ? 'amber' : 'slate'} badge--dot">${v.status === 'active' ? 'Active' : v.status === 'building' ? 'Building' : v.status}</span>
          <a href="${v.url}" target="_blank" rel="noopener noreferrer" class="venture-link" aria-label="Visit ${v.name}">
            Visit site →
          </a>
        </div>
      </div>
    `).join('');
  }
  renderVentures();

  /* ── Render Journey Teaser ── */
  const journeyGrid = document.getElementById('home-journey-grid');
  function renderJourneyTeaser() {
    if (!journeyGrid || typeof CMS === 'undefined') return;
    const items = CMS.Journey.ordered().slice(0, 3);
    journeyGrid.innerHTML = items.map(j => `
      <div class="journey-teaser-card">
        <div class="journey-teaser-year">${j.year}</div>
        <div class="journey-teaser-title">${j.title}</div>
        <div class="journey-teaser-company">${j.company}</div>
        <p class="journey-teaser-desc">${j.description}</p>
      </div>
    `).join('');
  }
  renderJourneyTeaser();

  /* ── Calculator ── */
  const daysInput  = document.getElementById('calc-days');
  const rateInput  = document.getElementById('calc-rate');
  const daysLabel  = document.getElementById('days-display');
  const rateLabel  = document.getElementById('rate-display');
  const resultEl   = document.getElementById('calc-result');

  function updateCalc() {
    const days = parseInt(daysInput?.value || 365);
    const rate = parseFloat(rateInput?.value || 1.0);
    if (daysLabel) daysLabel.textContent = `${days} Day${days !== 1 ? 's' : ''}`;
    if (rateLabel) rateLabel.textContent = `${rate.toFixed(1)}% / Day`;
    if (resultEl) {
      const multiplier = Math.pow(1 + rate / 100, days);
      resultEl.textContent = multiplier.toFixed(2) + '×';
    }
  }
  daysInput?.addEventListener('input', updateCalc);
  rateInput?.addEventListener('input', updateCalc);
  updateCalc();

  /* ── Newsletter Form ── */
  const newsletterForm = document.getElementById('newsletter-form');
  const successEl = document.getElementById('newsletter-success');
  newsletterForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('newsletter-email')?.value?.trim();
    if (!email) return;
    const btn = newsletterForm.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Subscribing…'; }

    try {
      const result = await CMS.Subscribers.add(email, '', 'homepage');
      if (btn) { btn.disabled = false; btn.textContent = 'Subscribe Free →'; }
      if (result.ok) {
        if (successEl) {
          successEl.style.display = 'block';
          successEl.textContent = "✓ You're in! Watch for your first insight.";
        }
        newsletterForm.reset();
        if (typeof showToast !== 'undefined') showToast('Subscribed successfully!', 'success');
      } else {
        if (successEl) {
          successEl.style.display = 'block';
          successEl.textContent = "ℹ️ You're already subscribed to this newsletter.";
        }
        if (typeof showToast !== 'undefined') showToast("You're already subscribed!", 'info');
      }
    } catch (err) {
      if (btn) { btn.disabled = false; btn.textContent = 'Subscribe Free →'; }
      if (typeof showToast !== 'undefined') showToast('Subscription failed. Try again.', 'error');
    }
  });

  /* ── Intersection Observer Animations ── */
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
  }, { threshold: 0.1 });
  document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el));

  /* ── Scroll spy for nav ── */
  const nav = document.getElementById('site-nav');
  window.addEventListener('scroll', () => {
    nav?.classList.toggle('scrolled', window.scrollY > 30);
  }, { passive: true });

});
