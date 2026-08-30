// Add compounding calculator and audio narration to main.js
// Let's enhance main.js with audio narration, compounding calculator, and rich reader experience

document.addEventListener('DOMContentLoaded', () => {
  // Compounding Calculator Widget logic
  const compDaysInput = document.getElementById('calc-days');
  const compRateInput = document.getElementById('calc-rate');
  const compResultValue = document.getElementById('calc-result-value');
  const compDaysDisplay = document.getElementById('calc-days-display');

  function calculateCompounding() {
    if (!compDaysInput || !compRateInput || !compResultValue) return;
    const days = parseInt(compDaysInput.value) || 365;
    const rate = parseFloat(compRateInput.value) || 1.0;
    
    if (compDaysDisplay) compDaysDisplay.textContent = `${days} Days`;
    
    // Formula: (1 + rate/100)^days
    const multiplier = Math.pow(1 + (rate / 100), days);
    compResultValue.textContent = `${multiplier.toFixed(2)}x`;
  }

  if (compDaysInput && compRateInput) {
    compDaysInput.addEventListener('input', calculateCompounding);
    compRateInput.addEventListener('input', calculateCompounding);
    calculateCompounding();
  }

  // Audio Text-To-Speech Reader for Daily Insights
  window.playArticleAudio = function(btnElement) {
    if (!('speechSynthesis' in window)) {
      Reactions.showToast("Speech synthesis is not supported in this browser.", "⚠️");
      return;
    }

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      btnElement.innerHTML = '🎧 Listen to Insight';
      btnElement.classList.remove('playing');
      return;
    }

    const modalBody = document.querySelector('.modal-article-body');
    if (!modalBody) return;

    const textToRead = modalBody.innerText;
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      btnElement.innerHTML = '⏹️ Pause Audio';
      btnElement.classList.add('playing');
      Reactions.showToast("Playing audio narration...", "🎧");
    };

    utterance.onend = () => {
      btnElement.innerHTML = '🎧 Listen to Insight';
      btnElement.classList.remove('playing');
    };

    utterance.onerror = () => {
      btnElement.innerHTML = '🎧 Listen to Insight';
      btnElement.classList.remove('playing');
    };

    window.speechSynthesis.speak(utterance);
  };
});
