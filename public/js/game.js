// ============================================
// SLOTS GAME ENGINE - Pure Logic
// 5 reels x 3 rows, 20 paylines
// ============================================

const SYMBOLS = [
  { id: 'cherry',   emoji: '🍒', name: 'Cherry',   weight: 25, payout3: 2,   payout4: 5,   payout5: 15 },
  { id: 'lemon',    emoji: '🍋', name: 'Lemon',    weight: 22, payout3: 3,   payout4: 8,   payout5: 20 },
  { id: 'orange',   emoji: '🍊', name: 'Orange',   weight: 20, payout3: 4,   payout4: 10,  payout5: 25 },
  { id: 'plum',     emoji: '🍇', name: 'Plum',     weight: 18, payout3: 5,   payout4: 15,  payout5: 40 },
  { id: 'watermelon',emoji: '🍉', name: 'Melon',   weight: 15, payout3: 8,   payout4: 20,  payout5: 50 },
  { id: 'bell',     emoji: '🔔', name: 'Bell',     weight: 12, payout3: 10,  payout4: 30,  payout5: 75 },
  { id: 'bar',      emoji: ' Bars', name: 'Bar',    weight: 10, payout3: 15,  payout4: 50,  payout5: 100 },
  { id: 'seven',    emoji: '7️⃣', name: 'Seven',    weight: 6,  payout3: 25,  payout4: 75,  payout5: 200 },
  { id: 'diamond',  emoji: '💎', name: 'Diamond',  weight: 4,  payout3: 50,  payout4: 150, payout5: 500 },
  { id: 'wild',     emoji: '⭐', name: 'Wild',     weight: 3,  payout3: 100, payout4: 250, payout5: 1000, isWild: true },
  { id: 'scatter',  emoji: '🎰', name: 'Scatter',  weight: 2,  payout3: 5,   payout4: 20,  payout5: 100, isScatter: true },
];

const REEL_LENGTH = 32;
const NUM_REELS = 5;
const NUM_ROWS = 3;
const NUM_PAYLINES = 20;

// Paylines: [row_reel0, row_reel1, row_reel2, row_reel3, row_reel4]
// rows: 0=top, 1=middle, 2=bottom
const PAYLINES = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
  [0, 1, 1, 1, 0],
  [2, 1, 1, 1, 2],
  [1, 0, 1, 0, 1],
  [1, 2, 1, 2, 1],
  [0, 1, 0, 1, 0],
  [2, 1, 2, 1, 2],
  [1, 1, 0, 1, 1],
  [1, 1, 2, 1, 1],
  [0, 0, 1, 0, 0],
  [2, 2, 1, 2, 2],
  [0, 2, 0, 2, 0],
];

class SlotsEngine {
  constructor() {
    this.weightedPool = [];
    SYMBOLS.forEach(s => {
      for (let i = 0; i < s.weight; i++) this.weightedPool.push(s);
    });
    this.reels = [];
    this.lastResult = null;
  }

  spinReels() {
    this.reels = [];
    for (let r = 0; r < NUM_REELS; r++) {
      const reel = [];
      for (let row = 0; row < NUM_ROWS + 2; row++) {
        reel.push(this.weightedPool[Math.floor(Math.random() * this.weightedPool.length)]);
      }
      this.reels.push(reel);
    }
    return this.getVisibleGrid();
  }

  getVisibleGrid() {
    return this.reels.map(reel => reel.slice(0, NUM_ROWS));
  }

  evaluate(betPerLine, numLines) {
    const grid = this.getVisibleGrid();
    let totalWin = 0;
    const winningLines = [];
    const scatterCount = this.countScatters(grid);

    // Check paylines
    for (let i = 0; i < numLines; i++) {
      const line = PAYLINES[i];
      const symbols = line.map((row, col) => grid[col][row]);
      const result = this.evaluateLine(symbols);
      if (result) {
        totalWin += result.payout * betPerLine;
        winningLines.push({ line: i + 1, ...result, bet: betPerLine });
      }
    }

    // Scatter wins
    if (scatterCount >= 3) {
      const scatterPayout = scatterCount === 3 ? 5 : scatterCount === 4 ? 20 : 100;
      totalWin += scatterPayout * betPerLine;
      winningLines.push({ line: 'SCATTER', count: scatterCount, payout: scatterPayout * betPerLine });
    }

    // Free spins
    let freeSpins = 0;
    if (scatterCount >= 3) freeSpins = scatterCount === 3 ? 10 : scatterCount === 4 ? 15 : 25;

    this.lastResult = {
      grid,
      totalWin,
      winningLines,
      scatterCount,
      freeSpins,
      betPerLine,
      numLines,
      totalBet: betPerLine * numLines,
    };

    return this.lastResult;
  }

  evaluateLine(symbols) {
    let firstSymbol = null;
    let count = 0;

    for (let i = 0; i < symbols.length; i++) {
      const s = symbols[i];
      if (s.isScatter) continue;

      if (s.isWild) {
        count++;
        continue;
      }

      if (!firstSymbol) {
        firstSymbol = s;
        count++;
      } else if (s.id === firstSymbol.id) {
        count++;
      } else {
        break;
      }
    }

    // All wilds
    if (!firstSymbol && count >= 3) {
      firstSymbol = SYMBOLS.find(s => s.id === 'wild');
    }

    if (!firstSymbol || count < 3) return null;

    let payout = 0;
    if (count === 3) payout = firstSymbol.payout3;
    else if (count === 4) payout = firstSymbol.payout4;
    else if (count === 5) payout = firstSymbol.payout5;

    if (payout === 0) return null;

    return { symbol: firstSymbol.id, emoji: firstSymbol.emoji, count, payout };
  }

  countScatters(grid) {
    let count = 0;
    for (let col = 0; col < NUM_REELS; col++) {
      for (let row = 0; row < NUM_ROWS; row++) {
        if (grid[col][row].isScatter) count++;
      }
    }
    return count;
  }
}

window.SlotsEngine = SlotsEngine;
window.SYMBOLS = SYMBOLS;
window.NUM_REELS = NUM_REELS;
window.NUM_ROWS = NUM_ROWS;
window.PAYLINES = PAYLINES;
