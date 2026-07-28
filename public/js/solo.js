// ============================================
// SLOTS SOLO - Game Loop + UI Controller
// Free Play (virtual balance) + Real Play (MATIC wallet)
// ============================================

const SlotsSolo = {
  engine: null,
  balance: 5000,
  betPerLine: 10,
  numLines: 20,
  state: 'idle',
  autoSpin: false,
  freeSpins: 0,
  mode: 'free', // 'free' or 'real'
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
      modeIndicator: document.getElementById('mode-indicator'),
      modeText: document.getElementById('mode-text'),
      modeFree: document.getElementById('mode-free'),
      modeReal: document.getElementById('mode-real'),
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
    if (this.els.paytableBtn) this.els.paytableBtn.addEventListener('click', () => this.els.paytable.classList.remove('hidden'));
    if (this.els.paytableClose) this.els.paytableClose.addEventListener('click', () => this.els.paytable.classList.add('hidden'));

    // Mode switcher
    this.els.modeFree.addEventListener('click', () => this.setMode('free'));
    this.els.modeReal.addEventListener('click', () => this.setMode('real'));

    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && this.state === 'idle') {
        e.preventDefault();
        this.spin();
      }
    });
  },

  setMode(mode) {
    this.mode = mode;
    this.els.modeFree.classList.toggle('active', mode === 'free');
    this.els.modeReal.classList.toggle('active', mode === 'real');

    if (mode === 'free') {
      this.balance = 5000;
      this.els.modeIndicator.className = 'mode-indicator free-play';
      this.els.modeText.textContent = 'FREE PLAY — Balance virtuelle';
      document.getElementById('wallet-status').classList.add('hidden');
      document.getElementById('wallet-info').classList.add('hidden');
    } else {
      // Real play: check wallet
      if (!WalletManager.isConnected()) {
        document.getElementById('wallet-modal').classList.remove('hidden');
        this.els.modeFree.classList.add('active');
        this.els.modeReal.classList.remove('active');
        return;
      }
      this.syncBalance();
      this.els.modeIndicator.className = 'mode-indicator real-play';
      this.els.modeText.textContent = 'REAL PLAY — MATIC';
    }
    this.updateDisplay();
  },

  syncBalance() {
    if (this.mode === 'real' && WalletManager.isConnected()) {
      this.balance = WalletManager.getBalance();
    }
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
    const balText = this.mode === 'real' ? `${this.balance.toFixed(2)}` : this.balance;
    this.els.balanceEl.textContent = balText;
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

    // Update wallet display
    if (this.mode === 'real' && WalletManager.isConnected()) {
      const walletBal = document.getElementById('wallet-balance');
      if (walletBal) walletBal.textContent = `${WalletManager.getBalance().toFixed(2)} MATIC`;
    }
  },

  async spin() {
    const totalBet = this.betPerLine * this.numLines;
    const isFree = this.freeSpins > 0;

    if (!isFree && totalBet > this.balance) return;
    if (this.state !== 'idle') return;

    // Real mode: deduct from wallet first
    if (this.mode === 'real' && !isFree) {
      const deducted = WalletManager.deductBalance(totalBet);
      if (!deducted) return;
    }

    this.state = 'spinning';
    this.els.winEl.textContent = '0';
    this.els.winEl.classList.remove('win-glow');

    if (isFree) {
      this.freeSpins--;
    } else if (this.mode === 'free') {
      this.balance -= totalBet;
    }
    this.updateDisplay();

    // Generate result
    this.engine.spinReels();
    const result = this.engine.evaluate(this.betPerLine, isFree ? 20 : this.numLines);
    const grid = result.grid;

    // Animate reels
    await this.animateReels(grid);

    // Show result
    if (this.mode === 'free') {
      this.balance += result.totalWin;
    } else {
      WalletManager.addBalance(result.totalWin);
      this.syncBalance();
    }

    if (result.totalWin > 0) {
      const winText = this.mode === 'real' ? result.totalWin.toFixed(4) : result.totalWin;
      this.els.winEl.textContent = winText;
      this.els.winEl.classList.add('win-glow');
      this.playSound('win');
    }

    if (result.freeSpins > 0) {
      this.freeSpins += result.freeSpins;
      this.playSound('scatter');
    }

    this.updateDisplay();
    this.saveSpin(result);

    if (this.balance <= 0 && !isFree) {
      this.showResult(
        this.mode === 'real' ? 'SOLDE INSUFFISANT' : 'FAILLITE !',
        this.mode === 'real' ? 'Rechargez votre wallet' : 'Rafraîchissez la page',
        false
      );
      this.stopAuto();
    } else if (result.totalWin >= totalBet * 10) {
      this.showResult('GROS WIN !', this.mode === 'real' ? `+${result.totalWin.toFixed(4)} MATIC` : `+${result.totalWin}`, true);
    }

    this.state = 'idle';

    if (this.autoSpin) {
      await this.sleep(400);
      if (this.balance >= (isFree ? 0 : totalBet)) {
        this.spin();
      } else {
        this.stopAuto();
      }
    }
  },

  async animateReels(finalGrid) {
    const container = this.els.reelsContainer;

    for (let col = 0; col < 5; col++) {
      const reel = container.children[col];
      if (reel) reel.classList.add('spinning');
    }

    await this.sleep(200);

    for (let col = 0; col < 5; col++) {
      const reel = container.children[col];
      if (!reel) continue;

      await this.sleep(300 + col * 250);
      reel.classList.remove('spinning');

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
          mode: this.mode,
          walletAddress: this.mode === 'real' ? (WalletManager.address || '') : '',
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
