// main.js - Core UI Controller for Sankar Karanam Portal
document.addEventListener('DOMContentLoaded', () => {
  // State
  let currentCategory = 'all';
  let searchQuery = '';
  let activeArticle = null;

  // DOM Elements
  const articlesGrid = document.getElementById('articles-grid');
  const searchInput = document.getElementById('search-articles');
  const categoryPills = document.querySelectorAll('.category-pill');
  const articleModal = document.getElementById('article-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalProgressBar = document.getElementById('reading-progress-bar');
  const dailyQuoteText = document.getElementById('daily-quote-text');
  const newQuoteBtn = document.getElementById('new-quote-btn');
  const typewriterElement = document.getElementById('hero-typewriter');
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  const navLinksContainer = document.getElementById('nav-links');
  const newsletterForm = document.getElementById('newsletter-form');

  // --- Typewriter Effect for Hero ---
  const roles = [
    "Serial Entrepreneur & Founder",
    "Growth & Content Strategist",
    "Ethical Hacking Author",
    "1% Daily Growth Practitioner"
  ];
  let roleIndex = 0;
  let charIndex = 0;
  let isDeleting = false;

  function typeRole() {
    if (!typewriterElement) return;
    const currentRole = roles[roleIndex];
    if (isDeleting) {
      typewriterElement.textContent = currentRole.substring(0, charIndex - 1);
      charIndex--;
    } else {
      typewriterElement.textContent = currentRole.substring(0, charIndex + 1);
      charIndex++;
    }

    let typingSpeed = isDeleting ? 40 : 80;

    if (!isDeleting && charIndex === currentRole.length) {
      typingSpeed = 2200; // Pause at end
      isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      roleIndex = (roleIndex + 1) % roles.length;
      typingSpeed = 400;
    }

    setTimeout(typeRole, typingSpeed);
  }
  typeRole();

  // --- Daily Quote Generator ---
  function setRandomDailyQuote() {
    if (!dailyQuoteText) return;
    const randomIndex = Math.floor(Math.random() * DAILY_INSIGHTS.length);
    dailyQuoteText.style.opacity = '0';
    setTimeout(() => {
      dailyQuoteText.textContent = `"${DAILY_INSIGHTS[randomIndex]}"`;
      dailyQuoteText.style.opacity = '1';
    }, 200);
  }
  setRandomDailyQuote();
  if (newQuoteBtn) {
    newQuoteBtn.addEventListener('click', setRandomDailyQuote);
  }

  // --- Render Articles Grid ---
  function renderArticles() {
    if (!articlesGrid) return;
    const bookmarks = Reactions.getUserBookmarks();

    const filtered = ARTICLES_DATA.filter(article => {
      const matchesCategory = 
        currentCategory === 'all' || 
        (currentCategory === 'bookmarks' ? bookmarks.includes(article.id) : article.category === currentCategory);

      const matchesSearch = 
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.category.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesSearch;
    });

    if (filtered.length === 0) {
      articlesGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <h3>No articles found</h3>
          <p>Try searching for different keywords or clear your active category filter.</p>
        </div>
      `;
      return;
    }

    articlesGrid.innerHTML = filtered.map(article => {
      const isBookmarked = bookmarks.includes(article.id);
      return `
        <article class="article-card" data-id="${article.id}">
          <div class="card-glow-layer" style="background: ${article.coverGradient}"></div>
          <div class="article-card-header">
            <span class="category-badge">${article.category}</span>
            <div class="article-actions-mini">
              <button class="icon-action-btn bookmark-btn ${isBookmarked ? 'bookmarked' : ''}" title="Bookmark" onclick="event.stopPropagation(); Reactions.toggleBookmark('${article.id}', this)">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
              </button>
            </div>
          </div>
          
          <h3 class="article-card-title">${article.title}</h3>
          <p class="article-card-excerpt">${article.excerpt}</p>

          <div class="article-card-footer">
            <div class="article-meta-info">
              <span>📅 ${formatDate(article.date)}</span>
              <span>⏱️ ${article.readTime}</span>
            </div>
            <div class="article-engagement-bar">
              <button class="clap-btn" onclick="event.stopPropagation(); Reactions.clapArticle('${article.id}', this, this.querySelector('.clap-count'))">
                👏 <span class="clap-count">${article.claps}</span>
              </button>
              <button class="read-more-btn" onclick="openArticleModal('${article.id}')">
                Read Deep Dive →
              </button>
            </div>
          </div>
        </article>
      `;
    }).join('');

    // Attach click handlers to cards
    document.querySelectorAll('.article-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-id');
        openArticleModal(id);
      });
    });
  }

  function formatDate(dateString) {
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  }

  // --- Open Article Modal / Reading Drawer ---
  window.openArticleModal = function (articleId) {
    const article = ARTICLES_DATA.find(a => a.id === articleId);
    if (!article || !articleModal) return;

    activeArticle = article;
    const bookmarks = Reactions.getUserBookmarks();
    const isBookmarked = bookmarks.includes(article.id);

    const modalBody = document.getElementById('modal-article-content');
    modalBody.innerHTML = `
      <div class="modal-article-header">
        <div class="modal-badges">
          <span class="category-badge">${article.category}</span>
          <span class="date-badge">📅 Published ${formatDate(article.date)}</span>
          <span class="read-badge">⏱️ ${article.readTime}</span>
          <button class="audio-listen-btn" onclick="playArticleAudio(this)">🎧 Listen to Insight</button>
        </div>
        <h1 class="modal-article-title">${article.title}</h1>
        <p class="modal-article-subtitle">${article.excerpt}</p>
        
        <div class="author-meta-card">
          <img src="assets/sankar.jpeg" alt="Sankar Karanam" class="author-avatar-img">
          <div class="author-details">
            <strong>Sankar Karanam</strong>
            <span>Founder & Strategist • OruMind & Creators Club</span>
          </div>
          <div class="modal-share-actions">
            <button class="share-btn" title="Share to X / Twitter" onclick="shareArticle('twitter', '${article.title}')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </button>
            <button class="share-btn" title="Share to LinkedIn" onclick="shareArticle('linkedin', '${article.title}')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
            </button>
            <button class="share-btn" title="Share to WhatsApp" onclick="shareArticle('whatsapp', '${article.title}')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/></svg>
            </button>
          </div>
        </div>
      </div>

      <div class="modal-tweetable-card">
        <div class="quote-icon-bar">“</div>
        <p class="tweetable-quote-text">${article.quote}</p>
        <button class="copy-quote-btn" onclick="Reactions.copyQuoteToClipboard('${article.quote.replace(/'/g, "\\'")}', '${article.title.replace(/'/g, "\\'")}')">
          📋 Copy Tweetable Insight
        </button>
      </div>

      <div class="modal-article-body">
        ${article.content}
      </div>

      <div class="modal-article-footer-cta">
        <div class="footer-clap-zone">
          <h4>Did you find this insight valuable?</h4>
          <button class="large-clap-btn" onclick="Reactions.clapArticle('${article.id}', this, this.querySelector('.large-clap-count'))">
            👏 Clap for this Article (<span class="large-clap-count">${article.claps}</span>)
          </button>
        </div>
        <div class="footer-author-box">
          <p><strong>Written by Sankar Karanam</strong> — Getting 1% better every day across tech, entrepreneurship, and digital transformation.</p>
          <a href="#contact" class="connect-author-btn" onclick="closeArticleModal()">Discuss Collaboration →</a>
        </div>
      </div>
    `;

    articleModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    modalProgressBar.style.width = '0%';
  };

  window.closeArticleModal = function () {
    if (!articleModal) return;
    articleModal.classList.remove('active');
    document.body.style.overflow = '';
  };

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', closeArticleModal);
  }

  // Close modal when clicking outside content container
  if (articleModal) {
    articleModal.addEventListener('click', (e) => {
      if (e.target === articleModal) {
        closeArticleModal();
      }
    });

    const modalContent = articleModal.querySelector('.modal-container');
    if (modalContent) {
      modalContent.addEventListener('scroll', () => {
        Reactions.updateReadingProgress(modalContent, modalProgressBar);
      });
    }
  }

  // Keyboard shortcut Esc to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && articleModal && articleModal.classList.contains('active')) {
      closeArticleModal();
    }
  });

  // --- Category Tabs Filter ---
  categoryPills.forEach(pill => {
    pill.addEventListener('click', () => {
      categoryPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentCategory = pill.getAttribute('data-category');
      renderArticles();
    });
  });

  // --- Search Input ---
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderArticles();
    });
  }

  // --- Social Sharing ---
  window.shareArticle = function (platform, title) {
    const url = window.location.href;
    let shareUrl = '';
    if (platform === 'twitter') {
      shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent('Insight from @SankarKaranam: ' + title)}&url=${encodeURIComponent(url)}`;
    } else if (platform === 'linkedin') {
      shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    } else if (platform === 'whatsapp') {
      shareUrl = `https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`;
    }
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=500');
    }
  };

  // --- 3D Tilt Effect on Venture Cards ---
  const tiltCards = document.querySelectorAll('.tilt-card');
  tiltCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -8;
      const rotateY = ((x - centerX) / centerX) * 8;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)';
    });
  });

  // --- Newsletter Form Submission ---
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const emailInput = document.getElementById('newsletter-email');
      if (emailInput && emailInput.value) {
        Reactions.showToast(`Welcome! You are subscribed to Sankar's 1% Daily Growth newsletter.`, '🚀');
        emailInput.value = '';
      }
    });
  }

  // --- Mobile Menu Toggle ---
  if (mobileMenuToggle && navLinksContainer) {
    mobileMenuToggle.addEventListener('click', () => {
      navLinksContainer.classList.toggle('mobile-open');
    });

    // Close menu when link is clicked
    navLinksContainer.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinksContainer.classList.remove('mobile-open');
      });
    });
  }

  // Initial render
  renderArticles();
});
