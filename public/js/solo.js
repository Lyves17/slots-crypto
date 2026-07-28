// ============================================
// SLOTS SOLO - Game Loop + UI Controller
// Fits in viewport, no scroll
// ============================================

const SlotsSolo = {
  engine: null,
  balance: 5000,
  betPerLine: 10,
  numLines: 20,
  state: 'idle',
  autoSpin: false,
  autoSpinCount: 0,
  freeSpins: 0,
  els: {},

  init() {
    this.engine = new SlotsEngine();
    this.cacheElements();
    this.bindEvents();
    this.updateDisplay();
  },

  cacheElements() {
    this.els = {
      reelsContainer: document.getElementById('reels-container'),
      balanceEl: document.getElementById('balance'),
      betTotalEl: document.getElementById('bet-total'),
      winEl: document.getElementById('win-amount'),
      betPerLineEl: document.getElementById('bet-per-line'),
      numLinesEl: document.getElementById('num-lines'),
      btnSpin: document.getElementById('btn-spin'),
      btnMinus: document.getElementById('btn-minus'),
      btnPlus: document.getElementById('btn-plus'),
      btnLinesMinus: document.getElementById('btn-lines-minus'),
      btnLinesPlus: document.getElementById('btn-lines-plus'),
      btnMax: document.getElementById('btn-max-bet'),
      btnAuto: document.getElementById('btn-auto'),
      btnStop: document.getElementById('btn-stop'),
      resultOverlay: document.getElementById('result-overlay'),
      resultText: document.getElementById('result-text'),
      resultAmount: document.getElementById('result-amount'),
      btnNewRound: document.getElementById('btn-new-round'),
      freeSpinBadge: document.getElementById('free-spin-badge'),
      freeSpinCount: document.getElementById('free-spin-count'),
      paytableBtn: document.getElementById('btn-paytable'),
      paytable: document.getElementById('paytable'),
      paytableClose: document.getElementById('paytable-close'),
    };
  },

  bindEvents() {
    this.els.btnSpin.addEventListener('click', () => this.spin());
    this.els.btnMinus.addEventListener('click', () => this.adjustBet(-10));
    this.els.btnPlus.addEventListener('click', () => this.adjustBet(10));
    this.els.btnLinesMinus.addEventListener('click', () => this.adjustLines(-1));
    this.els.btnLinesPlus.addEventListener('click', () => this.adjustLines(1));
    this.els.btnMax.addEventListener('click', () => this.maxBet());
    this.els.btnAuto.addEventListener('click', () => this.toggleAuto());
    this.els.btnStop.addEventListener('click', () => this.stopAuto());
    this.els.btnNewRound.addEventListener('click', () => this.closeResult());
    if (this.els.paytableBtn) this.els.paytableBtn.addEventListener('click', () => this.els.paytable.classList.toggle('hidden'));
    if (this.els.paytableClose) this.els.paytableClose.addEventListener('click', () => this.els.paytable.classList.add('hidden'));

    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && this.state === 'idle') {
        e.preventDefault();
        this.spin();
      }
    });
  },

  adjustBet(delta) {
    this.betPerLine = Math.max(1, Math.min(1000, this.betPerLine + delta));
    this.updateDisplay();
    this.playSound('click');
  },

  adjustLines(delta) {
    this.numLines = Math.max(1, Math.min(20, this.numLines + delta));
    this.updateDisplay();
    this.playSound('click');
  },

  maxBet() {
    const maxLines = 20;
    let maxBet = 1000;
    while (maxBet * maxLines > this.balance && maxBet > 1) maxBet -= 10;
    this.betPerLine = maxBet;
    this.numLines = maxLines;
    this.updateDisplay();
    this.playSound('click');
  },

  toggleAuto() {
    if (this.autoSpin) {
      this.stopAuto();
    } else {
      this.autoSpin = true;
      this.els.btnAuto.classList.add('hidden');
      this.els.btnStop.classList.remove('hidden');
      if (this.state === 'idle') this.spin();
    }
  },

  stopAuto() {
    this.autoSpin = false;
    this.els.btnAuto.classList.remove('hidden');
    this.els.btnStop.classList.add('hidden');
  },

  updateDisplay() {
    this.els.balanceEl.textContent = this.balance;
    this.els.betPerLineEl.textContent = this.betPerLine;
    this.els.numLinesEl.textContent = this.numLines;
    this.els.betTotalEl.textContent = this.betPerLine * this.numLines;

    const totalBet = this.betPerLine * this.numLines;
    this.els.btnSpin.disabled = totalBet > this.balance;

    if (this.freeSpins > 0) {
      this.els.freeSpinBadge.classList.remove('hidden');
      this.els.freeSpinCount.textContent = this.freeSpins;
    } else {
      this.els.freeSpinBadge.classList.add('hidden');
    }
  },

  buildReelColumns(grid) {
    const container = this.els.reelsContainer;
    container.innerHTML = '';

    for (let col = 0; col < 5; col++) {
      const reel = document.createElement('div');
      reel.className = 'reel-column';

      for (let row = 0; row < 3; row++) {
        const cell = document.createElement('div');
        cell.className = 'reel-cell';
        cell.textContent = grid[col][row].emoji;
        cell.dataset.symbol = grid[col][row].id;
        reel.appendChild(cell);
      }

      container.appendChild(reel);
    }
  },

  async spin() {
    const totalBet = this.betPerLine * this.numLines;

    if (this.freeSpins <= 0 && totalBet > this.balance) return;
    if (this.state !== 'idle') return;

    this.state = 'spinning';
    this.els.winEl.textContent = '0';
    this.els.winEl.classList.remove('win-glow');

    if (this.freeSpins > 0) {
      this.freeSpins--;
    } else {
      this.balance -= totalBet;
    }
    this.updateDisplay();

    // Generate result
    this.engine.spinReels();
    const result = this.engine.evaluate(this.betPerLine, this.freeSpins > 0 ? 20 : this.numLines);
    const grid = result.grid;

    // Animate reels
    await this.animateReels(grid);

    // Show result
    this.balance += result.totalWin;
    if (result.totalWin > 0) {
      this.els.winEl.textContent = result.totalWin;
      this.els.winEl.classList.add('win-glow');
      this.playSound('win');
    }

    if (result.freeSpins > 0) {
      this.freeSpins += result.freeSpins;
      this.showFreeSpins(result.freeSpins);
    }

    this.updateDisplay();
    this.saveSpin(result);

    if (this.freeSpins > 0 && this.freeSpins <= 0 && this.balance <= 0) {
      this.showResult('FAILLITE !', 'Vous avez tout perdu', false);
    } else if (result.totalWin >= totalBet * 10) {
      this.showResult('GROS WIN !', `+${result.totalWin}`, true);
    }

    this.state = 'idle';

    if (this.autoSpin && this.balance >= (this.freeSpins > 0 ? 0 : totalBet)) {
      await this.sleep(500);
      this.spin();
    } else if (this.autoSpin) {
      this.stopAuto();
    }
  },

  async animateReels(finalGrid) {
    const container = this.els.reelsContainer;

    // Build spinning columns
    for (let col = 0; col < 5; col++) {
      const reel = container.children[col];
      if (!reel) continue;
      reel.classList.add('spinning');
    }

    await this.sleep(200);

    // Stagger stop each reel
    for (let col = 0; col < 5; col++) {
      const reel = container.children[col];
      if (!reel) continue;

      await this.sleep(300 + col * 250);
      reel.classList.remove('spinning');

      // Set final symbols
      reel.innerHTML = '';
      for (let row = 0; row < 3; row++) {
        const cell = document.createElement('div');
        cell.className = 'reel-cell landing';
        cell.textContent = finalGrid[col][row].emoji;
        cell.dataset.symbol = finalGrid[col][row].id;
        reel.appendChild(cell);
      }
      this.playSound('reelStop');
    }

    this.sleep(100).then(() => {
      document.querySelectorAll('.reel-cell.landing').forEach(c => c.classList.remove('landing'));
    });
  },

  showFreeSpins(count) {
    this.els.freeSpinBadge.classList.remove('hidden');
    this.els.freeSpinCount.textContent = this.freeSpins;
    this.playSound('scatter');
  },

  showResult(text, amount, isWin) {
    this.els.resultText.textContent = text;
    this.els.resultText.className = isWin ? 'result-text win' : 'result-text lose';
    this.els.resultAmount.textContent = amount;
    this.els.resultAmount.className = isWin ? 'result-amount win' : 'result-amount lose';
    this.els.resultOverlay.classList.remove('hidden');
  },

  closeResult() {
    this.els.resultOverlay.classList.add('hidden');
  },

  sleep(ms) { return new Promise(r => setTimeout(r, ms)); },

  playSound(name) {
    try {
      if (window.Sounds && window.Sounds[name]) window.Sounds[name].play();
    } catch (e) {}
  },

  async saveSpin(result) {
    try {
      await fetch('/api/spin/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bet: this.betPerLine * this.numLines,
          lines: this.numLines,
          reels: result.grid.map(col => col.map(s => s.id)),
          winAmount: result.totalWin,
          freeSpins: result.freeSpins,
          timestamp: new Date()
        })
      });
    } catch (e) {}
  }
};

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  SlotsSolo.init();
  if (typeof initWalletModal === 'function') initWalletModal();
});
