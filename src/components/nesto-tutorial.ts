import { CellState } from '../engine/types';
import {
  createEmptyGrid,
  generateRowClues,
  generateColClues,
  isRowSatisfied,
  isColSatisfied,
  isGridCompleted,
} from '../engine/grid';
import { ICONS } from '../styles/icons';

export class NestoTutorial extends HTMLElement {
  private _grid: CellState[][] = [];
  private _target = [
    [1, 1, 0, 0],
    [1, 1, 1, 0],
    [0, 1, 1, 1],
    [0, 0, 1, 1],
  ];
  private _rowClues: number[][] = [];
  private _colClues: number[][] = [];
  private _cursorRow = 0;
  private _cursorCol = 0;
  private _fakeScore = 500;
  private _tipMessage =
    'Use Arrow Keys to move. Press Z to fill a cell, X to mark empty, Backspace to clear.';
  private _completed = false;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.init();
    this.setupKeyboard();
  }

  disconnectedCallback() {
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  private init() {
    this._grid = createEmptyGrid(4, 4);
    this._rowClues = generateRowClues(this._target);
    this._colClues = generateColClues(this._target);
    this._cursorRow = 0;
    this._cursorCol = 0;
    this._fakeScore = 500;
    this._completed = false;
    this.render();
  }

  private setupKeyboard() {
    window.addEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.isConnected || this._completed) return;

    if (
      [
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'z',
        'Z',
        'x',
        'X',
        'Backspace',
        'Delete',
      ].includes(e.key)
    ) {
      e.preventDefault();
    }

    let moved = false;
    if (e.key === 'ArrowUp') {
      this._cursorRow = (this._cursorRow - 1 + 4) % 4;
      moved = true;
    } else if (e.key === 'ArrowDown') {
      this._cursorRow = (this._cursorRow + 1) % 4;
      moved = true;
    } else if (e.key === 'ArrowLeft') {
      this._cursorCol = (this._cursorCol - 1 + 4) % 4;
      moved = true;
    } else if (e.key === 'ArrowRight') {
      this._cursorCol = (this._cursorCol + 1) % 4;
      moved = true;
    }

    if (moved) {
      this.updateStepGuidance();
      this.render();
      return;
    }

    const current = this._grid[this._cursorRow][this._cursorCol];
    const targetVal = this._target[this._cursorRow][this._cursorCol];

    if (e.key === 'z' || e.key === 'Z') {
      if (current !== CellState.FILLED) {
        this._grid[this._cursorRow][this._cursorCol] = CellState.FILLED;
        if (targetVal === 0) {
          this._fakeScore = Math.max(0, this._fakeScore - 50);
          this._tipMessage =
            'Oops! That cell should not be filled. -50 fake points! Try marking it with X.';
        } else {
          this._fakeScore += 20;
          this._tipMessage = 'Great fill! Keep satisfying the number clues.';
        }
      }
    } else if (e.key === 'x' || e.key === 'X') {
      if (current !== CellState.CROSSED) {
        this._grid[this._cursorRow][this._cursorCol] = CellState.CROSSED;
        if (targetVal === 1) {
          this._fakeScore = Math.max(0, this._fakeScore - 30);
          this._tipMessage = 'Careful! That cell is actually part of the filled pattern.';
        } else {
          this._tipMessage = 'Good X mark! This rules out empty cells.';
        }
      }
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      this._grid[this._cursorRow][this._cursorCol] = CellState.EMPTY;
      this._tipMessage = 'Cell cleared.';
    }

    if (isGridCompleted(this._grid, this._target)) {
      this._completed = true;
      this._tipMessage =
        'Tutorial Completed! You earned 0 actual points, but you are now ready for real puzzles!';
    } else {
      this.updateStepGuidance();
    }

    this.render();
  };

  private updateStepGuidance() {
    if (this._completed) return;
    const filledCount = this._grid.flat().filter((c) => c === CellState.FILLED).length;
    if (filledCount === 0) {
      this._tipMessage =
        'Tip: Look at Row 1, Clues [2]. The first two cells can be filled! Navigate there and press Z.';
    } else if (filledCount < 4) {
      this._tipMessage =
        'Tip: When a row or column clue is satisfied, it will turn grey! Keep going.';
    }
  }

  private render() {
    if (!this.shadowRoot) return;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          height: 100%;
          padding: 20px;
          background: var(--bg-color, #faf9f6);
          color: var(--text-main, #1a1a18);
          font-family: var(--font-family, sans-serif);
          overflow-y: auto;
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 18px;
          font-weight: 700;
        }
        .score-badge {
          background: var(--surface-color, #f0efe9);
          border: 1px solid var(--border-color, #d1cfc7);
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 500;
        }
        .instruction-card {
          background: var(--surface-color, #f0efe9);
          border-left: 4px solid var(--text-main, #1a1a18);
          padding: 12px 16px;
          border-radius: 4px;
          margin-bottom: 20px;
          font-size: 13px;
          line-height: 1.5;
          animation: pulseBorder 2s infinite alternate;
        }
        .grid-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin: 16px 0;
        }
        .board {
          display: grid;
          grid-template-columns: 60px repeat(4, 48px);
          grid-template-rows: 60px repeat(4, 48px);
          gap: 0;
          border: 2px solid var(--border-thick, #1a1a18);
          background: var(--border-thick, #1a1a18);
        }
        .corner {
          background: var(--bg-color, #faf9f6);
        }
        .col-clue {
          background: var(--bg-color, #faf9f6);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          padding-bottom: 6px;
          font-size: 12px;
          font-weight: 700;
          gap: 2px;
          border-right: 1px solid var(--border-color, #d1cfc7);
        }
        .row-clue {
          background: var(--bg-color, #faf9f6);
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding-right: 8px;
          font-size: 12px;
          font-weight: 700;
          gap: 4px;
          border-bottom: 1px solid var(--border-color, #d1cfc7);
        }
        .clue-satisfied {
          color: var(--crossed-cell, #8c8b85);
          text-decoration: line-through;
        }
        .cell {
          background: var(--bg-color, #faf9f6);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: 700;
          cursor: pointer;
          border-right: 1px solid var(--grid-line, #cccccc);
          border-bottom: 1px solid var(--grid-line, #cccccc);
          transition: background 0.15s ease;
        }
        .cell.active {
          outline: 2px solid var(--text-main, #1a1a18);
          outline-offset: -2px;
          background: var(--highlight-crosshair, rgba(26, 26, 24, 0.08));
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
        .footer-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: auto;
          padding-top: 16px;
          border-top: 1px solid var(--border-color, #d1cfc7);
        }
        button {
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 500;
          border-radius: 6px;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.15s ease;
        }
        .btn-primary {
          background: var(--text-main, #1a1a18);
          color: var(--bg-color, #faf9f6);
          border: 1px solid var(--text-main, #1a1a18);
        }
        .btn-primary:hover {
          background: var(--accent-color, #2d2c29);
        }
        .btn-outline {
          background: transparent;
          color: var(--text-main, #1a1a18);
          border: 1px solid var(--border-color, #d1cfc7);
        }
        .btn-outline:hover {
          background: var(--surface-color, #f0efe9);
        }
        @keyframes pulseBorder {
          from { border-left-color: var(--text-main, #1a1a18); }
          to { border-left-color: var(--crossed-cell, #8c8b85); }
        }
      </style>
      <div class="header">
        <div class="title">
          ${ICONS.tutorial}
          <span>How To Play Nonograms</span>
        </div>
        <div class="score-badge">Fake Score: ${this._fakeScore} pts (0 real pts)</div>
      </div>

      <div class="instruction-card">
        <strong>${this._completed ? '🎉 Sandbox Complete!' : '💡 Interactive Sandbox Tip:'}</strong><br />
        ${this._tipMessage}
      </div>

      <div class="grid-container">
        <div class="board">
          <div class="corner"></div>
          ${this._colClues
            .map((clues, c) => {
              const satisfied = isColSatisfied(this._grid, this._target, c);
              return `<div class="col-clue ${satisfied ? 'clue-satisfied' : ''}">
              ${clues.map((num) => `<span>${num}</span>`).join('')}
            </div>`;
            })
            .join('')}
          ${this._rowClues
            .map((clues, r) => {
              const satisfied = isRowSatisfied(this._grid, this._target, r);
              const rowCells = this._grid[r]
                .map((cell, c) => {
                  const isActive = r === this._cursorRow && c === this._cursorCol;
                  const isCrosshair = r === this._cursorRow || c === this._cursorCol;
                  let cellClass = 'cell';
                  if (isActive) cellClass += ' active';
                  else if (isCrosshair) cellClass += ' crosshair';
                  if (cell === CellState.FILLED) cellClass += ' filled';
                  else if (cell === CellState.CROSSED) cellClass += ' crossed';

                  const content = cell === CellState.CROSSED ? '✕' : '';
                  return `<div class="${cellClass}" data-r="${r}" data-c="${c}">${content}</div>`;
                })
                .join('')!;
              return `
              <div class="row-clue ${satisfied ? 'clue-satisfied' : ''}">
                ${clues.map((num) => `<span>${num}</span>`).join('')}
              </div>
              ${rowCells}
            `;
            })
            .join('')}
        </div>
      </div>

      <div class="footer-controls">
        <button class="btn-outline" id="btn-reset">Reset Sandbox</button>
        <button class="btn-primary" id="btn-play">${this._completed ? 'Start Playing Real Game →' : 'Skip to Real Game →'}</button>
      </div>
    `;

    this.shadowRoot.getElementById('btn-reset')?.addEventListener('click', () => {
      this.init();
    });

    this.shadowRoot.getElementById('btn-play')?.addEventListener('click', () => {
      this.dispatchEvent(
        new CustomEvent('switch-view', {
          detail: { view: 'player' },
          bubbles: true,
          composed: true,
        })
      );
    });
  }
}

customElements.define('nesto-tutorial', NestoTutorial);
