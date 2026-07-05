import { isFirstRun, loadGameState } from '../services/storage';
import { ICONS } from '../styles/icons';
import './nesto-player';
import './nesto-leaderboard';
import './nesto-settings';
import './nesto-tutorial';
import './nesto-modal';
import { NestoModal } from './nesto-modal';

export type ViewType = 'player' | 'leaderboard' | 'settings' | 'tutorial';

export class NestoApp extends HTMLElement {
  private _currentView: ViewType = 'player';
  private _pendingView: ViewType | null = null;
  private _isTransitioning = false;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  async connectedCallback() {
    const firstRun = await isFirstRun();
    if (firstRun) {
      this._currentView = 'tutorial';
    } else {
      this._currentView = 'player';
    }

    this.render();
    this.setupListeners();
  }

  private setupListeners() {
    this.addEventListener('switch-view', ((e: CustomEvent<{ view: ViewType }>) => {
      this.requestViewChange(e.detail.view);
    }) as EventListener);
  }

  private async requestViewChange(targetView: ViewType) {
    if (targetView === this._currentView || this._isTransitioning) return;

    // Check mid-game exit condition
    if (this._currentView === 'player') {
      const state = await loadGameState();
      if (state && !state.isCompleted && state.startTime > 0) {
        this._pendingView = targetView;
        const modal = this.shadowRoot?.querySelector('nesto-modal') as NestoModal;
        if (modal) {
          modal.open(
            'Leave Puzzle in Progress?',
            'You are in the middle of solving a puzzle. Leaving this view will pause your game or risk losing progress if reset.',
            () => {
              if (this._pendingView) {
                this.executeViewTransition(this._pendingView);
              }
            },
            () => {
              this._pendingView = null;
            }
          );
          return;
        }
      }
    }

    this.executeViewTransition(targetView);
  }

  private executeViewTransition(newView: ViewType) {
    this._isTransitioning = true;
    const contentEl = this.shadowRoot?.getElementById('view-content');
    if (!contentEl) {
      this._currentView = newView;
      this._isTransitioning = false;
      this.render();
      return;
    }

    contentEl.classList.add('view-exit-active');
    setTimeout(() => {
      this._currentView = newView;
      this.render();
      const newContentEl = this.shadowRoot?.getElementById('view-content');
      if (newContentEl) {
        newContentEl.classList.add('view-enter');
        requestAnimationFrame(() => {
          newContentEl.classList.remove('view-enter');
          newContentEl.classList.add('view-enter-active');
          setTimeout(() => {
            newContentEl.classList.remove('view-enter-active');
            this._isTransitioning = false;
          }, 250);
        });
      } else {
        this._isTransitioning = false;
      }
    }, 150);
  }

  private render() {
    if (!this.shadowRoot) return;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          width: 100vw;
          height: 100vh;
          background: var(--bg-color, #faf9f6);
          color: var(--text-main, #1a1a18);
          font-family: var(--font-family, sans-serif);
          overflow: hidden;
        }
        .nav-bar {
          display: flex;
          align-items: center;
          justify-content: space-around;
          background: var(--surface-color, #f0efe9);
          border-bottom: 2px solid var(--border-thick, #1a1a18);
          padding: 0 8px;
          height: 52px;
          flex-shrink: 0;
          z-index: 20;
        }
        .nav-tab {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          font-size: 13px;
          font-weight: 700;
          color: var(--text-muted, #5a5954);
          background: transparent;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
          font-family: inherit;
        }
        .nav-tab:hover {
          color: var(--text-main, #1a1a18);
          background: var(--surface-hover, #e5e3dc);
        }
        .nav-tab.active {
          color: var(--bg-color, #faf9f6);
          background: var(--text-main, #1a1a18);
        }
        .main-content {
          flex: 1;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .view-wrapper {
          flex: 1;
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
        }
        .view-enter {
          opacity: 0;
          transform: translateY(6px) translateZ(0);
        }
        .view-enter-active {
          opacity: 1;
          transform: translateY(0) translateZ(0);
          transition: opacity 0.25s ease-out, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .view-exit-active {
          opacity: 0;
          transform: translateY(-6px) translateZ(0);
          transition: opacity 0.15s ease-in, transform 0.15s ease-in;
        }
      </style>

      <nav class="nav-bar">
        <button class="nav-tab ${this._currentView === 'player' ? 'active' : ''}" data-view="player">
          ${ICONS.player}
          <span>Play</span>
        </button>
        <button class="nav-tab ${this._currentView === 'leaderboard' ? 'active' : ''}" data-view="leaderboard">
          ${ICONS.leaderboard}
          <span>Leaderboard</span>
        </button>
        <button class="nav-tab ${this._currentView === 'settings' ? 'active' : ''}" data-view="settings">
          ${ICONS.settings}
          <span>Settings</span>
        </button>
        <button class="nav-tab ${this._currentView === 'tutorial' ? 'active' : ''}" data-view="tutorial">
          ${ICONS.tutorial}
          <span>How To Play</span>
        </button>
      </nav>

      <main class="main-content">
        <div class="view-wrapper" id="view-content">
          ${
            this._currentView === 'player'
              ? `<nesto-player></nesto-player>`
              : this._currentView === 'leaderboard'
                ? `<nesto-leaderboard></nesto-leaderboard>`
                : this._currentView === 'settings'
                  ? `<nesto-settings></nesto-settings>`
                  : `<nesto-tutorial></nesto-tutorial>`
          }
        </div>
      </main>

      <nesto-modal></nesto-modal>
    `;

    this.shadowRoot.querySelectorAll('.nav-tab[data-view]').forEach((tab) => {
      tab.addEventListener('click', () => {
        const target = tab.getAttribute('data-view') as ViewType;
        this.requestViewChange(target);
      });
    });
  }
}

customElements.define('nesto-app', NestoApp);
