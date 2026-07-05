import { ScoreEntry, UserSettings } from '../engine/types';
import { fetchLeaderboard } from '../services/sync';
import { loadSettings } from '../services/storage';
import { ICONS } from '../styles/icons';

export class NestoLeaderboard extends HTMLElement {
  private _scores: ScoreEntry[] = [];
  private _settings!: UserSettings;
  private _loading = true;
  private _limit = 30;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  async connectedCallback() {
    this._settings = await loadSettings();
    await this.loadScores();
  }

  private async loadScores(append = false) {
    if (!append) {
      this._loading = true;
      this.render();
    }
    const data = await fetchLeaderboard(this._limit);
    this._scores = data;
    this._loading = false;
    this.render();
    this.setupScrollListener();
  }

  private setupScrollListener() {
    const list = this.shadowRoot?.getElementById('score-list');
    if (!list) return;

    list.addEventListener('scroll', () => {
      if (list.scrollTop + list.clientHeight >= list.scrollHeight - 20) {
        if (this._limit < 200 && !this._loading) {
          this._limit += 20;
          this.loadScores(true);
        }
      }
    });
  }

  private render() {
    if (!this.shadowRoot) return;

    const currentUsername = this._settings?.username || '';
    // Find highest rank of current user
    const userBestIdx = this._scores.findIndex((s) => s.username === currentUsername);

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
        .btn-refresh {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 6px;
          border: 1px solid var(--border-color, #d1cfc7);
          background: transparent;
          color: var(--text-main, #1a1a18);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          font-family: inherit;
        }
        .btn-refresh:hover {
          background: var(--surface-color, #f0efe9);
          transform: translateY(-1px);
        }
        .table-header {
          display: grid;
          grid-template-columns: 50px 1fr 90px 70px;
          padding: 10px 16px;
          background: var(--surface-color, #f0efe9);
          border: 1px solid var(--border-color, #d1cfc7);
          border-radius: 6px 6px 0 0;
          font-size: 12px;
          font-weight: 700;
          color: var(--text-muted, #5a5954);
          text-transform: uppercase;
        }
        .list-container {
          flex: 1;
          overflow-y: auto;
          border: 1px solid var(--border-color, #d1cfc7);
          border-top: none;
          border-radius: 0 0 6px 6px;
          position: relative;
        }
        .row {
          display: grid;
          grid-template-columns: 50px 1fr 90px 70px;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-color, #d1cfc7);
          font-size: 13px;
          align-items: center;
          transition: background 0.15s ease;
        }
        .row:hover {
          background: var(--surface-hover, #e5e3dc);
        }
        .row:last-child {
          border-bottom: none;
        }
        .row.user-sticky {
          position: sticky;
          top: 0;
          bottom: 0;
          background: var(--text-main, #1a1a18);
          color: var(--bg-color, #faf9f6);
          font-weight: 700;
          z-index: 10;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .rank {
          font-weight: 700;
        }
        .rank-1 { color: #fbc02d; font-size: 15px; }
        .rank-2 { color: #90a4ae; font-size: 15px; }
        .rank-3 { color: #a1887f; font-size: 15px; }
        .score {
          font-weight: 700;
        }
        .loading {
          padding: 40px;
          text-align: center;
          color: var(--text-muted, #5a5954);
        }
        .empty {
          padding: 40px;
          text-align: center;
          color: var(--text-muted, #5a5954);
        }
      </style>
      <div class="header">
        <div class="title">
          ${ICONS.leaderboard}
          <span>Global Leaderboard</span>
        </div>
        <button class="btn-refresh" id="btn-refresh">
          ${ICONS.refresh}
          <span>Refresh</span>
        </button>
      </div>

      <div class="table-header">
        <div>Rank</div>
        <div>Player</div>
        <div>Score</div>
        <div>Time</div>
      </div>

      <div class="list-container" id="score-list">
        ${
          this._loading && this._scores.length === 0
            ? `<div class="loading">Loading global scores...</div>`
            : this._scores.length === 0
              ? `<div class="empty">No scores recorded yet. Play a game to claim #1!</div>`
              : this._scores
                  .map((entry, idx) => {
                    const rank = idx + 1;
                    const isUser = idx === userBestIdx;
                    let rankContent = `#${rank}`;
                    if (rank === 1) rankContent = '🥇 #1';
                    else if (rank === 2) rankContent = '🥈 #2';
                    else if (rank === 3) rankContent = '🥉 #3';

                    return `
                  <div class="row ${isUser ? 'user-sticky' : ''}">
                    <div class="rank rank-${rank}">${rankContent}</div>
                    <div>${entry.username} ${isUser ? '(You)' : ''}</div>
                    <div class="score">${entry.score.toLocaleString()}</div>
                    <div>${entry.time}s</div>
                  </div>
                `;
                  })
                  .join('')
        }
      </div>
    `;

    this.shadowRoot.getElementById('btn-refresh')?.addEventListener('click', () => {
      this.loadScores();
    });
  }
}

customElements.define('nesto-leaderboard', NestoLeaderboard);
