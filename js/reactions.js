// reactions.js - High-Engagement Mechanics: Claps, Floating Confetti, Quotes, & Bookmarks
window.Reactions = (function () {
  const STORAGE_CLAPS_KEY = 'sk_user_claps';
  const STORAGE_BOOKMARKS_KEY = 'sk_user_bookmarks';

  function getUserClaps() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_CLAPS_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function getUserBookmarks() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_BOOKMARKS_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function showToast(message, icon = '✨') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'custom-toast';
    toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 3200);
  }

  function triggerClapBurst(event, element) {
    const rect = element.getBoundingClientRect();
    const burstCount = 8;
    const colors = ['#00f0ff', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899'];

    for (let i = 0; i < burstCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'clap-floating-particle';
      particle.innerText = Math.random() > 0.5 ? '👏' : '✨';
      particle.style.left = `${event.clientX || rect.left + rect.width / 2}px`;
      particle.style.top = `${event.clientY || rect.top}px`;
      particle.style.color = colors[Math.floor(Math.random() * colors.length)];
      
      const angle = (Math.PI * 2 * i) / burstCount + (Math.random() - 0.5);
      const velocity = 40 + Math.random() * 40;
      const tx = Math.cos(angle) * velocity;
      const ty = Math.sin(angle) * velocity - 30;

      particle.style.setProperty('--tx', `${tx}px`);
      particle.style.setProperty('--ty', `${ty}px`);

      document.body.appendChild(particle);

      setTimeout(() => {
        particle.remove();
      }, 900);
    }
  }

  function clapArticle(articleId, buttonElement, countSpanElement) {
    const claps = getUserClaps();
    claps[articleId] = (claps[articleId] || 0) + 1;
    localStorage.setItem(STORAGE_CLAPS_KEY, JSON.stringify(claps));

    // Find article in data and increment
    const article = ARTICLES_DATA.find(a => a.id === articleId);
    if (article) {
      article.claps += 1;
      if (countSpanElement) {
        countSpanElement.innerText = article.claps;
      }
    }

    triggerClapBurst(window.event || { clientX: null, clientY: null }, buttonElement);
    buttonElement.classList.add('clapped-active');
    setTimeout(() => buttonElement.classList.remove('clapped-active'), 300);

    showToast(`You clapped for this insight! (+1)`, '👏');
  }

  function copyQuoteToClipboard(quoteText, articleTitle) {
    const formatted = `"${quoteText}"\n— Sankar Karanam (via sankarkaranam.com)`;
    navigator.clipboard.writeText(formatted).then(() => {
      showToast("Quote copied to clipboard! Share it with your network.", "📋");
    }).catch(() => {
      showToast("Quote selected! Press Ctrl+C to copy.", "ℹ️");
    });
  }

  function toggleBookmark(articleId, iconBtn) {
    let bookmarks = getUserBookmarks();
    const index = bookmarks.indexOf(articleId);

    if (index === -1) {
      bookmarks.push(articleId);
      localStorage.setItem(STORAGE_BOOKMARKS_KEY, JSON.stringify(bookmarks));
      if (iconBtn) iconBtn.classList.add('bookmarked');
      showToast("Article saved to your bookmarks!", "🔖");
    } else {
      bookmarks.splice(index, 1);
      localStorage.setItem(STORAGE_BOOKMARKS_KEY, JSON.stringify(bookmarks));
      if (iconBtn) iconBtn.classList.remove('bookmarked');
      showToast("Removed from bookmarks.", "🗑️");
    }
  }

  function updateReadingProgress(modalElement, progressBar) {
    if (!modalElement || !progressBar) return;
    const scrollTop = modalElement.scrollTop;
    const scrollHeight = modalElement.scrollHeight - modalElement.clientHeight;
    const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    progressBar.style.width = `${progress}%`;
  }

  return {
    clapArticle,
    copyQuoteToClipboard,
    toggleBookmark,
    getUserBookmarks,
    updateReadingProgress,
    showToast
  };
})();
