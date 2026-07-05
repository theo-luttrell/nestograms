import {
  CellState,
  Difficulty,
  GameState,
  PuzzleMap,
  ScoreEntry,
  UserSettings,
} from '../engine/types';
import {
  createEmptyGrid,
  generateRowClues,
  generateColClues,
  isRowSatisfied,
  isColSatisfied,
  isGridCompleted,
} from '../engine/grid';
import { calculateScore } from '../engine/scoring';
import {
  getManhattanWaveSequence,
  spawnConfettiBurst,
  updateConfettiParticles,
  ConfettiParticle,
} from '../engine/animation';
import { generateSyncHash } from '../engine/anticheat';
import { loadSettings, loadGameState, saveGameState } from '../services/storage';
import { fetchPuzzles, submitScore, FALLBACK_PUZZLES } from '../services/sync';

export class NestoPlayer extends HTMLElement {
  private _settings!: UserSettings;
  private _puzzles: PuzzleMap = FALLBACK_PUZZLES;
  private _currentDifficulty: Difficulty = Difficulty.EASY;
  private _state: GameState | null = null;

  // Key repeat timers
  private _keyRepeatTimeout: any = null;
  private _keyRepeatInterval: any = null;
  private _activeKeys = new Set<string>();

  // Confetti canvas
  private _confettiCanvas: HTMLCanvasElement | null = null;
  private _confettiParticles: ConfettiParticle[] = [];
  private _confettiAnimId: number | null = null;

  // Reveal state
  private _isRevealing = false;
  private _revealedName = '';

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  async connectedCallback() {
    this._settings = await loadSettings();
    this._puzzles = await fetchPuzzles();
    const savedState = await loadGameState();

    if (savedState && !savedState.isCompleted) {
      this._state = savedState;
      this._currentDifficulty = savedState.difficulty;
    } else {
      this.startNewGame(Difficulty.EASY);
    }

    this.setupListeners();
    this.render();
    this.focusPlayer();
  }

  disconnectedCallback() {
    this.cleanupListeners();
    if (this._state && !this._state.isCompleted) {
      saveGameState(this._state);
    }
  }

  private setupListeners() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private cleanupListeners() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.stopKeyRepeat();
    if (this._confettiAnimId) {
      cancelAnimationFrame(this._confettiAnimId);
    }
  }

  private handleBlur = () => {
    if (this._state && !this._state.isCompleted && !this._state.isPaused && !this._isRevealing) {
      this._state.isPaused = true;
      saveGameState(this._state);
      this.render();
    }
  };

  private handleVisibilityChange = () => {
    if (document.hidden) {
      this.handleBlur();
    }
  };

  private focusPlayer() {
    const rootEl = this.shadowRoot?.getElementById('player-root');
    rootEl?.focus();
  }

  public async startNewGame(diff: Difficulty) {
    this._currentDifficulty = diff;
    const diffKey = String(diff);
    const puzzle = this._puzzles[diffKey] || FALLBACK_PUZZLES[diffKey] || FALLBACK_PUZZLES['1'];

    const rows = puzzle.nonogram.length;
    const cols = puzzle.nonogram[0].length;

    this._state = {
      puzzleId: diffKey,
      difficulty: diff,
      puzzle,
      grid: createEmptyGrid(rows, cols),
      rowClues: generateRowClues(puzzle.nonogram),
      colClues: generateColClues(puzzle.nonogram),
      rowSatisfied: Array(rows).fill(false),
      colSatisfied: Array(cols).fill(false),
      cursorRow: 0,
      cursorCol: 0,
      score: 0,
      startTime: 0, // 0 until first interaction
      elapsedTime: 0,
      isPaused: false,
      isCompleted: false,
      livesLost: 0,
    };

    this._isRevealing = false;
    this._revealedName = '';
    await saveGameState(this._state);
    this.render();
    this.focusPlayer();
  }

  private stopKeyRepeat() {
    if (this._keyRepeatTimeout) clearTimeout(this._keyRepeatTimeout);
    if (this._keyRepeatInterval) clearInterval(this._keyRepeatInterval);
    this._keyRepeatTimeout = null;
    this._keyRepeatInterval = null;
  }

  private handleKeyUp = (e: KeyboardEvent) => {
    this._activeKeys.delete(e.key);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      this.stopKeyRepeat();
    }
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this._state || !this.isConnected) return;

    const kb = this._settings?.keybinds || {
      up: 'ArrowUp',
      down: 'ArrowDown',
      left: 'ArrowLeft',
      right: 'ArrowRight',
      fill: 'z',
      mark: 'x',
      clear: 'Backspace',
    };

    const isGameKey = [
      kb.up,
      kb.down,
      kb.left,
      kb.right,
      kb.fill,
      kb.mark,
      kb.clear,
      'z',
      'Z',
      'x',
      'X',
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'Backspace',
      'Delete',
    ].includes(e.key);

    if (isGameKey) {
      e.preventDefault();
    }

    if (this._state.isPaused) {
      this._state.isPaused = false;
      this.render();
      return;
    }

    if (this._state.isCompleted || this._isRevealing) return;

    this._activeKeys.add(e.key);

    // Simultaneous press check: X takes priority over Z
    const pressingMark =
      this._activeKeys.has(kb.mark) || this._activeKeys.has('x') || this._activeKeys.has('X');
    const pressingFill =
      this._activeKeys.has(kb.fill) || this._activeKeys.has('z') || this._activeKeys.has('Z');

    if (pressingMark && pressingFill) {
      this.applyCellAction('mark');
      return;
    }

    if (e.key === kb.up || e.key === 'ArrowUp') {
      this.moveCursor(-1, 0);
      this.startKeyRepeat(() => this.moveCursor(-1, 0));
    } else if (e.key === kb.down || e.key === 'ArrowDown') {
      this.moveCursor(1, 0);
      this.startKeyRepeat(() => this.moveCursor(1, 0));
    } else if (e.key === kb.left || e.key === 'ArrowLeft') {
      this.moveCursor(0, -1);
      this.startKeyRepeat(() => this.moveCursor(0, -1));
    } else if (e.key === kb.right || e.key === 'ArrowRight') {
      this.moveCursor(0, 1);
      this.startKeyRepeat(() => this.moveCursor(0, 1));
    } else if (pressingFill) {
      this.applyCellAction('fill');
    } else if (pressingMark) {
      this.applyCellAction('mark');
    } else if (e.key === kb.clear || e.key === 'Backspace' || e.key === 'Delete') {
      this.applyCellAction('clear');
    }
  };

  private startKeyRepeat(action: () => void) {
    this.stopKeyRepeat();
    this._keyRepeatTimeout = setTimeout(() => {
      this._keyRepeatInterval = setInterval(() => {
        action();
      }, 60);
    }, 180);
  }

  private moveCursor(dr: number, dc: number) {
    if (!this._state) return;
    const rows = this._state.grid.length;
    const cols = this._state.grid[0].length;
    this._state.cursorRow = (this._state.cursorRow + dr + rows) % rows;
    this._state.cursorCol = (this._state.cursorCol + dc + cols) % cols;
    this.updateUIOnlyCursor();
  }

  private updateUIOnlyCursor() {
    if (!this.shadowRoot || !this._state) return;
    const cells = this.shadowRoot.querySelectorAll('.cell');
    cells.forEach((el) => {
      const r = Number(el.getAttribute('data-r'));
      const c = Number(el.getAttribute('data-c'));
      const isActive = r === this._state!.cursorRow && c === this._state!.cursorCol;
      const isCrosshair = r === this._state!.cursorRow || c === this._state!.cursorCol;
      el.classList.toggle('active', isActive);
      el.classList.toggle('crosshair', isCrosshair);
    });
  }

  private applyCellAction(action: 'fill' | 'mark' | 'clear') {
    if (!this._state || this._state.isCompleted || this._isRevealing) return;

    // First interaction starts timer
    if (this._state.startTime === 0) {
      this._state.startTime = performance.now();
    }

    const r = this._state.cursorRow;
    const c = this._state.cursorCol;
    const current = this._state.grid[r][c];
    const targetVal = this._state.puzzle.nonogram[r][c];
    let changed = false;

    if (action === 'fill') {
      // Pressing Z on filled keeps it filled. On X overwrites to filled.
      if (current !== CellState.FILLED) {
        this._state.grid[r][c] = CellState.FILLED;
        changed = true;
        if (targetVal === 0) {
          // Instant heart penalty!
          this._state.livesLost++;
        }
      }
    } else if (action === 'mark') {
      if (current !== CellState.CROSSED) {
        this._state.grid[r][c] = CellState.CROSSED;
        changed = true;
      }
    } else if (action === 'clear') {
      if (current !== CellState.EMPTY) {
        this._state.grid[r][c] = CellState.EMPTY;
        changed = true;
      }
    }

    if (changed) {
      this.updateScore();
      this.checkCompletion();
      saveGameState(this._state);
      this.render();
    }
  }

  private updateScore() {
    if (!this._state) return;
    const maxCells = this._state.grid.length * this._state.grid[0].length;
    const elapsedSeconds =
      this._state.startTime > 0 ? (performance.now() - this._state.startTime) / 1000 : 0;
    this._state.elapsedTime = elapsedSeconds;

    const correctFilledCount = this._state.grid.flat().filter((val, idx) => {
      const r = Math.floor(idx / this._state!.grid[0].length);
      const c = idx % this._state!.grid[0].length;
      return val === CellState.FILLED && this._state!.puzzle.nonogram[r][c] === 1;
    }).length;

    this._state.score = calculateScore({
      correctFilledCount,
      livesLost: this._state.livesLost,
      elapsedSeconds,
      maxCells,
      difficulty: this._state.difficulty,
    });
  }

  private async checkCompletion() {
    if (!this._state || this._state.isCompleted) return;

    const rows = this._state.grid.length;
    const cols = this._state.grid[0].length;

    // Check line satisfactions for greying out clues
    for (let r = 0; r < rows; r++) {
      this._state.rowSatisfied[r] = isRowSatisfied(
        this._state.grid,
        this._state.puzzle.nonogram,
        r
      );
    }
    for (let c = 0; c < cols; c++) {
      this._state.colSatisfied[c] = isColSatisfied(
        this._state.grid,
        this._state.puzzle.nonogram,
        c
      );
    }

    if (isGridCompleted(this._state.grid, this._state.puzzle.nonogram)) {
      this._state.isCompleted = true;
      this.updateScore();
      await saveGameState(this._state);

      // Generate anticheat hash & submit score
      const maxCells = rows * cols;
      const hash = generateSyncHash(
        this._state.grid,
        this._state.score,
        this._state.elapsedTime,
        this._state.puzzleId
      );
      const entry: ScoreEntry = {
        uid: '',
        username: this._settings?.username || 'Player',
        puzzleId: this._state.puzzleId,
        score: this._state.score,
        time: Math.floor(this._state.elapsedTime),
        date: new Date().toLocaleDateString(),
        difficulty: this._state.difficulty,
        hash,
      };

      submitScore(entry, maxCells).then((res) => {
        console.log('Score submission result:', res);
      });

      this.triggerWinSequence();
    }
  }

  private triggerWinSequence() {
    this._isRevealing = true;
    this.render();

    // 1. Confetti burst from left and right cannons
    this.startConfetti();

    // 2. Unskippable diagonal Manhattan-distance wave reveal
    if (!this._state) return;
    const rows = this._state.grid.length;
    const cols = this._state.grid[0].length;
    const waves = getManhattanWaveSequence(rows, cols);

    waves.forEach((waveCells, step) => {
      setTimeout(() => {
        if (!this.shadowRoot) return;
        waveCells.forEach(({ row, col }) => {
          const el = this.shadowRoot!.querySelector(
            `.cell[data-r="${row}"][data-c="${col}"]`
          ) as HTMLElement;
          if (el) {
            const hex = this._state?.puzzle['nonogram-reveal'][row][col] || '#1a1a18';
            el.classList.add('reveal-pop');
            el.style.backgroundColor = hex;
            el.style.color = 'transparent';
            el.style.borderColor = 'transparent';
          }
        });
      }, step * 200);
    });

    const totalDurationMs = (rows - 1 + cols - 1) * 200 + 800;
    setTimeout(() => {
      this._isRevealing = false;
      this._revealedName = this._state?.puzzle.name || 'Completed!';
      this.render();
    }, totalDurationMs);
  }

  private startConfetti() {
    if (!this.shadowRoot) return;
    this._confettiCanvas = this.shadowRoot.getElementById('confetti-canvas') as HTMLCanvasElement;
    if (!this._confettiCanvas) return;

    this._confettiCanvas.width = window.innerWidth || 520;
    this._confettiCanvas.height = window.innerHeight || 600;
    this._confettiParticles = spawnConfettiBurst(
      this._confettiCanvas.width,
      this._confettiCanvas.height
    );

    const animate = () => {
      if (!this._confettiCanvas) return;
      const ctx = this._confettiCanvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, this._confettiCanvas.width, this._confettiCanvas.height);

      this._confettiParticles = updateConfettiParticles(this._confettiParticles);
      for (const p of this._confettiParticles) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }

      if (this._confettiParticles.length > 0) {
        this._confettiAnimId = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, this._confettiCanvas.width, this._confettiCanvas.height);
      }
    };
    animate();
  }

  private render() {
    if (!this.shadowRoot || !this._state) return;

    const rows = this._state.grid.length;
    const cols = this._state.grid[0].length;

    // Dynamic grid sizing based on grid dimensions
    const cellSize = rows <= 5 ? 42 : rows <= 8 ? 34 : rows <= 10 ? 28 : 18;
    const clueWidth = rows <= 5 ? 56 : rows <= 8 ? 64 : rows <= 10 ? 70 : 80;
    const clueHeight = cols <= 5 ? 56 : cols <= 8 ? 64 : cols <= 10 ? 70 : 80;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          height: 100%;
          padding: 16px;
          background: var(--bg-color, #faf9f6);
          color: var(--text-main, #1a1a18);
          font-family: var(--font-family, sans-serif);
          position: relative;
          outline: none;
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .difficulty-tabs {
          display: flex;
          gap: 6px;
        }
        .diff-btn {
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 500;
          border-radius: 6px;
          border: 1px solid var(--border-color, #d1cfc7);
          background: transparent;
          color: var(--text-main, #1a1a18);
          cursor: pointer;
          transition: all 0.15s ease;
          font-family: inherit;
        }
        .diff-btn:hover {
          background: var(--surface-color, #f0efe9);
        }
        .diff-btn.active {
          background: var(--text-main, #1a1a18);
          color: var(--bg-color, #faf9f6);
          border-color: var(--text-main, #1a1a18);
        }
        .stats {
          display: flex;
          align-items: center;
          gap: 16px;
          font-size: 13px;
          font-weight: 700;
        }
        .stat-badge {
          background: var(--surface-color, #f0efe9);
          padding: 4px 10px;
          border-radius: 4px;
          border: 1px solid var(--border-color, #d1cfc7);
        }
        .board-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex: 1;
          overflow: auto;
          position: relative;
        }
        .board {
          display: grid;
          grid-template-columns: ${clueWidth}px repeat(${cols}, ${cellSize}px);
          grid-template-rows: ${clueHeight}px repeat(${rows}, ${cellSize}px);
          gap: 0;
          border: 3px solid var(--border-thick, #1a1a18);
          background: var(--grid-line, #cccccc);
          position: relative;
          user-select: none;
          box-shadow: var(--shadow-md, 0 4px 12px rgba(0,0,0,0.08));
        }
        .corner {
          background: var(--bg-color, #faf9f6);
          border-right: 1px solid var(--border-thick, #1a1a18);
          border-bottom: 1px solid var(--border-thick, #1a1a18);
        }
        .col-clue {
          background: var(--bg-color, #faf9f6);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          padding-bottom: 6px;
          font-size: ${cols > 10 ? '10px' : '12px'};
          font-weight: 700;
          gap: 2px;
          border-right: 1px solid var(--grid-line, #cccccc);
          border-bottom: 1px solid var(--border-thick, #1a1a18);
        }
        .col-clue.thick-right {
          border-right: 2px solid var(--border-thick, #1a1a18);
        }
        .row-clue {
          background: var(--bg-color, #faf9f6);
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding-right: 8px;
          font-size: ${rows > 10 ? '10px' : '12px'};
          font-weight: 700;
          gap: 4px;
          border-bottom: 1px solid var(--grid-line, #cccccc);
          border-right: 1px solid var(--border-thick, #1a1a18);
        }
        .row-clue.thick-bottom {
          border-bottom: 2px solid var(--border-thick, #1a1a18);
        }
        .clue-satisfied {
          color: var(--crossed-cell, #8c8b85);
          text-decoration: line-through;
          opacity: 0.6;
        }
        .cell {
          background: var(--bg-color, #faf9f6);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${cellSize * 0.45}px;
          font-weight: 700;
          border-right: 1px solid var(--grid-line, #cccccc);
          border-bottom: 1px solid var(--grid-line, #cccccc);
          transition: background 0.15s ease, transform 0.15s ease;
          pointer-events: none; /* Mouse clicking disabled per specification */
        }
        .cell.thick-right {
          border-right: 2px solid var(--border-thick, #1a1a18);
        }
        .cell.thick-bottom {
          border-bottom: 2px solid var(--border-thick, #1a1a18);
        }
        .cell.active {
          outline: 2px solid var(--text-main, #1a1a18);
          outline-offset: -2px;
          background: var(--highlight-crosshair, rgba(26, 26, 24, 0.08));
          z-index: 2;
        }
        .cell.crosshair {
          background: var(--highlight-crosshair, rgba(26, 26, 24, 0.04));
        }
        .cell.filled {
          background: var(--filled-cell, #1a1a18);
        }
        .cell.crossed {
          color: var(--crossed-cell, #8c8b85);
        }
        .cell.reveal-pop {
          animation: popPulse 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        @keyframes popPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.15); box-shadow: 0 0 8px rgba(0,0,0,0.3); z-index: 5; }
          100% { transform: scale(1); }
        }
        .pause-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: var(--bg-color, #faf9f6);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 50;
          gap: 16px;
          animation: fadeIn 0.2s ease-out;
        }
        .pause-title {
          font-size: 22px;
          font-weight: 700;
          color: var(--text-main, #1a1a18);
        }
        .pause-sub {
          font-size: 14px;
          color: var(--text-muted, #5a5954);
        }
        .btn-resume {
          padding: 10px 24px;
          background: var(--text-main, #1a1a18);
          color: var(--bg-color, #faf9f6);
          border: none;
          border-radius: 6px;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
        }
        .win-banner {
          position: absolute;
          top: 20px;
          background: var(--text-main, #1a1a18);
          color: var(--bg-color, #faf9f6);
          padding: 8px 20px;
          border-radius: 20px;
          font-weight: 700;
          font-size: 16px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.2);
          z-index: 60;
          animation: slideDown 0.3s ease-out;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        #confetti-canvas {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          pointer-events: none;
          z-index: 100;
        }
        .footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 12px;
          font-size: 12px;
          color: var(--text-muted, #5a5954);
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-16px); } to { opacity: 1; transform: translateY(0); } }
      </style>

      <div id="player-root" tabindex="0" style="outline:none; display:flex; flex-direction:column; height:100%;">
        <div class="header">
          <div class="difficulty-tabs">
            <button class="diff-btn ${this._currentDifficulty === Difficulty.EASY ? 'active' : ''}" data-diff="${Difficulty.EASY}">Easy (5x5)</button>
            <button class="diff-btn ${this._currentDifficulty === Difficulty.MEDIUM ? 'active' : ''}" data-diff="${Difficulty.MEDIUM}">Medium (8x8)</button>
            <button class="diff-btn ${this._currentDifficulty === Difficulty.HARD ? 'active' : ''}" data-diff="${Difficulty.HARD}">Hard (10x10)</button>
            <button class="diff-btn ${this._currentDifficulty === Difficulty.IMPOSSIBLE ? 'active' : ''}" data-diff="${Difficulty.IMPOSSIBLE}">Impossible (20x20)</button>
          </div>
          <div class="stats">
            <div class="stat-badge">Time: ${Math.floor(this._state.elapsedTime)}s</div>
            <div class="stat-badge">Score: ${this._state.score}</div>
          </div>
        </div>

        <div class="board-container">
          ${
            this._revealedName
              ? `<div class="win-banner">🎉 ${this._revealedName} Completed! Score: ${this._state.score}</div>`
              : ''
          }
          <div class="board">
            <div class="corner"></div>
            ${this._state.colClues
              .map((clues, c) => {
                const satisfied = this._state!.colSatisfied[c];
                const thickRight = (c + 1) % 5 === 0 && c < cols - 1;
                return `<div class="col-clue ${satisfied ? 'clue-satisfied' : ''} ${thickRight ? 'thick-right' : ''}">
                ${clues.map((num) => `<span>${num}</span>`).join('')}
              </div>`;
              })
              .join('')}
            ${this._state.rowClues
              .map((clues, r) => {
                const satisfied = this._state!.rowSatisfied[r];
                const thickBottom = (r + 1) % 5 === 0 && r < rows - 1;
                const rowCells = this._state!.grid[r].map((cell, c) => {
                  const isActive = r === this._state!.cursorRow && c === this._state!.cursorCol;
                  const isCrosshair = r === this._state!.cursorRow || c === this._state!.cursorCol;
                  const thickCellRight = (c + 1) % 5 === 0 && c < cols - 1;
                  const thickCellBottom = (r + 1) % 5 === 0 && r < rows - 1;
                  let cellClass = 'cell';
                  if (isActive) cellClass += ' active';
                  else if (isCrosshair) cellClass += ' crosshair';
                  if (cell === CellState.FILLED) cellClass += ' filled';
                  else if (cell === CellState.CROSSED) cellClass += ' crossed';
                  if (thickCellRight) cellClass += ' thick-right';
                  if (thickCellBottom) cellClass += ' thick-bottom';

                  const content = cell === CellState.CROSSED ? '✕' : '';
                  return `<div class="${cellClass}" data-r="${r}" data-c="${c}">${content}</div>`;
                }).join('')!;
                return `
                <div class="row-clue ${satisfied ? 'clue-satisfied' : ''} ${thickBottom ? 'thick-bottom' : ''}">
                  ${clues.map((num) => `<span>${num}</span>`).join('')}
                </div>
                ${rowCells}
              `;
              })
              .join('')}
          </div>

          ${
            this._state.isPaused
              ? `
            <div class="pause-overlay">
              <div class="pause-title">Game Paused</div>
              <div class="pause-sub">Grid hidden to prevent cheating during window blur</div>
              <button class="btn-resume" id="btn-resume">Resume Game</button>
            </div>
          `
              : ''
          }
        </div>

        <div class="footer">
          <span>Controls: Arrows to move | Z to fill | X to mark | Backspace to clear</span>
          <button class="diff-btn" id="btn-restart">Restart Puzzle</button>
        </div>
      </div>
      <canvas id="confetti-canvas"></canvas>
    `;

    // Attach event handlers
    this.shadowRoot.querySelectorAll('.diff-btn[data-diff]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const diff = Number(btn.getAttribute('data-diff')) as Difficulty;
        this.startNewGame(diff);
      });
    });

    this.shadowRoot.getElementById('btn-restart')?.addEventListener('click', () => {
      this.startNewGame(this._currentDifficulty);
    });

    this.shadowRoot.getElementById('btn-resume')?.addEventListener('click', () => {
      if (this._state) {
        this._state.isPaused = false;
        this.render();
        this.focusPlayer();
      }
    });
  }
}

customElements.define('nesto-player', NestoPlayer);
