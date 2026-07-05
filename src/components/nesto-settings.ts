import { UserSettings, Keybinds } from '../engine/types';
import { loadSettings, saveSettings, getDefaultSettings } from '../services/storage';
import { updateServerUsername } from '../services/sync';
import { ICONS } from '../styles/icons';

export class NestoSettings extends HTMLElement {
  private _settings!: UserSettings;
  private _listeningKey: keyof Keybinds | null = null;
  private _usernameError = '';
  private _saveMessage = '';

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  async connectedCallback() {
    this._settings = await loadSettings();
    this.render();
    window.addEventListener('keydown', this.handleKeyRemap);
  }

  disconnectedCallback() {
    window.removeEventListener('keydown', this.handleKeyRemap);
  }

  private handleKeyRemap = async (e: KeyboardEvent) => {
    if (!this._listeningKey) return;

    e.preventDefault();
    e.stopPropagation();

    // Reject system keys per specification
    const systemKeys = [
      'Escape',
      'Tab',
      'CapsLock',
      'NumLock',
      'ScrollLock',
      'Pause',
      'PrintScreen',
      'Meta',
      'Control',
      'Alt',
      'Shift',
    ];
    if (systemKeys.includes(e.key)) {
      this._saveMessage = 'System keys cannot be bound.';
      this.render();
      return;
    }

    let keyName = e.key;
    if (e.ctrlKey || e.altKey || e.shiftKey) {
      const mods = [];
      if (e.ctrlKey) mods.push('Ctrl');
      if (e.altKey) mods.push('Alt');
      if (e.shiftKey) mods.push('Shift');
      keyName = `${mods.join('+')}+${e.key}`;
    }

    this._settings.keybinds[this._listeningKey] = keyName;
    this._listeningKey = null;
    this._saveMessage = 'Keybind updated!';
    await saveSettings(this._settings);
    this.render();
    setTimeout(() => {
      this._saveMessage = '';
      this.render();
    }, 2000);
  };

  private async handleUsernameChange(val: string) {
    const trimmed = val.trim();
    // Validate ASCII visible chars and spaces, 3 to 16 chars
    if (trimmed.length < 3 || trimmed.length > 16) {
      this._usernameError = 'Username must be 3 to 16 characters.';
      this.render();
      return;
    }
    if (!/^[\x20-\x7E]+$/.test(trimmed)) {
      this._usernameError = 'Username must contain only standard ASCII characters.';
      this.render();
      return;
    }

    this._usernameError = '';
    this._settings.username = trimmed;
    await saveSettings(this._settings);
    this.render();

    try {
      await updateServerUsername(trimmed);
      this._saveMessage = 'Username synced to server!';
    } catch (err: any) {
      this._usernameError = err.message || 'Failed to sync username.';
    }
    this.render();
  }

  private async handleWindowTypeChange(type: 'popup' | 'windowed') {
    if (this._settings.windowType === type) return;
    this._settings.windowType = type;
    await saveSettings(this._settings);

    if (
      type === 'windowed' &&
      typeof chrome !== 'undefined' &&
      chrome.windows &&
      chrome.windows.create
    ) {
      // Open in dedicated window and close popup
      chrome.windows.create({
        url: chrome.runtime.getURL('index.html'),
        type: 'popup',
        width: 600,
        height: 700,
      });
      if (window.close) {
        window.close();
      }
    }
    this.render();
  }

  private render() {
    if (!this.shadowRoot || !this._settings) return;

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
          gap: 8px;
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 20px;
        }
        .section {
          background: var(--surface-color, #f0efe9);
          border: 1px solid var(--border-color, #d1cfc7);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
        }
        .section-title {
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 12px;
          text-transform: uppercase;
          color: var(--text-muted, #5a5954);
        }
        .field-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 12px;
        }
        .field-group:last-child {
          margin-bottom: 0;
        }
        label {
          font-size: 13px;
          font-weight: 500;
        }
        input[type="text"] {
          padding: 8px 12px;
          font-size: 14px;
          border-radius: 6px;
          border: 1px solid var(--border-color, #d1cfc7);
          background: var(--bg-color, #faf9f6);
          color: var(--text-main, #1a1a18);
          font-family: inherit;
        }
        input[type="text"]:focus {
          outline: 2px solid var(--text-main, #1a1a18);
        }
        .error {
          color: var(--error-color, #d32f2f);
          font-size: 12px;
          margin-top: 4px;
        }
        .message {
          color: var(--success-color, #388e3c);
          font-size: 12px;
          margin-top: 4px;
        }
        .keybind-grid {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 10px;
          align-items: center;
        }
        .key-btn {
          padding: 6px 14px;
          font-size: 13px;
          font-weight: 700;
          border-radius: 6px;
          border: 1px solid var(--border-color, #d1cfc7);
          background: var(--bg-color, #faf9f6);
          color: var(--text-main, #1a1a18);
          cursor: pointer;
          min-width: 90px;
          text-align: center;
          transition: all 0.15s ease;
          font-family: inherit;
        }
        .key-btn:hover {
          border-color: var(--text-main, #1a1a18);
        }
        .key-btn.listening {
          background: var(--text-main, #1a1a18);
          color: var(--bg-color, #faf9f6);
          animation: pulse 1s infinite alternate;
        }
        .dropdown-container {
          position: relative;
        }
        select {
          width: 100%;
          padding: 8px 12px;
          font-size: 14px;
          border-radius: 6px;
          border: 1px solid var(--border-color, #d1cfc7);
          background: var(--bg-color, #faf9f6);
          color: var(--text-main, #1a1a18);
          font-family: inherit;
          cursor: pointer;
        }
        .btn-reset {
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 500;
          border-radius: 6px;
          border: 1px solid var(--border-color, #d1cfc7);
          background: transparent;
          color: var(--text-main, #1a1a18);
          cursor: pointer;
          font-family: inherit;
          transition: all 0.15s ease;
          margin-top: 8px;
        }
        .btn-reset:hover {
          background: var(--surface-hover, #e5e3dc);
        }
        .version {
          margin-top: auto;
          text-align: center;
          font-size: 12px;
          color: var(--text-muted, #5a5954);
          padding-top: 16px;
        }
        @keyframes pulse {
          from { opacity: 0.7; }
          to { opacity: 1; }
        }
      </style>
      <div class="header">
        ${ICONS.settings}
        <span>Extension Settings</span>
      </div>

      <div class="section">
        <div class="section-title">Player Profile</div>
        <div class="field-group">
          <label>Username (3-16 ASCII characters)</label>
          <input type="text" id="input-username" value="${this._settings.username}" maxlength="16" />
          ${this._usernameError ? `<div class="error">${this._usernameError}</div>` : ''}
          ${this._saveMessage ? `<div class="message">${this._saveMessage}</div>` : ''}
        </div>
      </div>

      <div class="section">
        <div class="section-title">Window Mode</div>
        <div class="field-group">
          <label>Select Extension Display Mode</label>
          <select id="select-window-type">
            <option value="popup" ${this._settings.windowType === 'popup' ? 'selected' : ''}>Popup (Default Chrome Toolbar Dropdown)</option>
            <option value="windowed" ${this._settings.windowType === 'windowed' ? 'selected' : ''}>Windowed (Dedicated Browser Window)</option>
          </select>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Keybinds (1-to-1 Remapping)</div>
        <div class="keybind-grid">
          <span>Move Up</span>
          <button class="key-btn ${this._listeningKey === 'up' ? 'listening' : ''}" data-key="up">${this._listeningKey === 'up' ? 'Press any key...' : this._settings.keybinds.up}</button>
          <span>Move Down</span>
          <button class="key-btn ${this._listeningKey === 'down' ? 'listening' : ''}" data-key="down">${this._listeningKey === 'down' ? 'Press any key...' : this._settings.keybinds.down}</button>
          <span>Move Left</span>
          <button class="key-btn ${this._listeningKey === 'left' ? 'listening' : ''}" data-key="left">${this._listeningKey === 'left' ? 'Press any key...' : this._settings.keybinds.left}</button>
          <span>Move Right</span>
          <button class="key-btn ${this._listeningKey === 'right' ? 'listening' : ''}" data-key="right">${this._listeningKey === 'right' ? 'Press any key...' : this._settings.keybinds.right}</button>
          <span>Fill Cell (Z Priority)</span>
          <button class="key-btn ${this._listeningKey === 'fill' ? 'listening' : ''}" data-key="fill">${this._listeningKey === 'fill' ? 'Press any key...' : this._settings.keybinds.fill}</button>
          <span>Mark Cell with X</span>
          <button class="key-btn ${this._listeningKey === 'mark' ? 'listening' : ''}" data-key="mark">${this._listeningKey === 'mark' ? 'Press any key...' : this._settings.keybinds.mark}</button>
          <span>Clear Cell</span>
          <button class="key-btn ${this._listeningKey === 'clear' ? 'listening' : ''}" data-key="clear">${this._listeningKey === 'clear' ? 'Press any key...' : this._settings.keybinds.clear}</button>
        </div>
        <button class="btn-reset" id="btn-reset-keybinds">Reset Keybinds to Defaults</button>
      </div>

      <div class="version">
        Nestograms v1.0.0 (Manifest V3) | Powered by Vite & CRXJS
      </div>
    `;

    const usernameInput = this.shadowRoot.getElementById('input-username') as HTMLInputElement;
    usernameInput?.addEventListener('blur', () => {
      this.handleUsernameChange(usernameInput.value);
    });
    usernameInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        usernameInput.blur();
      }
    });

    const selectEl = this.shadowRoot.getElementById('select-window-type') as HTMLSelectElement;
    selectEl?.addEventListener('change', () => {
      this.handleWindowTypeChange(selectEl.value as any);
    });

    this.shadowRoot.querySelectorAll('.key-btn[data-key]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const k = btn.getAttribute('data-key') as keyof Keybinds;
        this._listeningKey = k;
        this.render();
      });
    });

    this.shadowRoot.getElementById('btn-reset-keybinds')?.addEventListener('click', async () => {
      this._settings.keybinds = getDefaultSettings().keybinds;
      await saveSettings(this._settings);
      this._saveMessage = 'Keybinds reset to defaults.';
      this.render();
    });
  }
}

customElements.define('nesto-settings', NestoSettings);
