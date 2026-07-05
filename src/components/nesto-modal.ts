import { ICONS } from '../styles/icons';

export class NestoModal extends HTMLElement {
  private _isOpen = false;
  private _title = 'Confirmation Required';
  private _message = 'You have a game in progress. Are you sure you want to leave this tab?';
  private _onConfirm: () => void = () => {};
  private _onCancel: () => void = () => {};

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  open(title: string, message: string, onConfirm: () => void, onCancel: () => void = () => {}) {
    this._title = title;
    this._message = message;
    this._onConfirm = onConfirm;
    this._onCancel = onCancel;
    this._isOpen = true;
    this.render();
  }

  close() {
    this._isOpen = false;
    this.render();
    this._onCancel();
  }

  private render() {
    if (!this.shadowRoot) return;

    if (!this._isOpen) {
      this.shadowRoot.innerHTML = '';
      return;
    }

    this.shadowRoot.innerHTML = `
      <style>
        .overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeIn 0.2s ease-out;
        }
        .modal {
          background: var(--bg-color, #faf9f6);
          color: var(--text-main, #1a1a18);
          border: 2px solid var(--border-thick, #1a1a18);
          border-radius: 12px;
          padding: 24px;
          width: 90%;
          max-width: 380px;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
          animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          font-family: var(--font-family, sans-serif);
        }
        .header {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 12px;
          color: var(--error-color, #d32f2f);
        }
        .message {
          font-size: 13px;
          line-height: 1.5;
          color: var(--text-main, #1a1a18);
          margin-bottom: 24px;
        }
        .actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }
        button {
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 500;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
          font-family: inherit;
        }
        .btn-cancel {
          background: transparent;
          color: var(--text-main, #1a1a18);
          border: 1px solid var(--border-color, #d1cfc7);
        }
        .btn-cancel:hover {
          background: var(--surface-color, #f0efe9);
        }
        .btn-confirm {
          background: var(--error-color, #d32f2f);
          color: #ffffff;
          border: 1px solid var(--error-color, #d32f2f);
        }
        .btn-confirm:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      </style>
      <div class="overlay" id="overlay">
        <div class="modal">
          <div class="header">
            ${ICONS.alert}
            <span>${this._title}</span>
          </div>
          <div class="message">${this._message}</div>
          <div class="actions">
            <button class="btn-cancel" id="btn-cancel">Stay</button>
            <button class="btn-confirm" id="btn-confirm">Leave Game</button>
          </div>
        </div>
      </div>
    `;

    const cancelBtn = this.shadowRoot.getElementById('btn-cancel');
    const confirmBtn = this.shadowRoot.getElementById('btn-confirm');
    const overlay = this.shadowRoot.getElementById('overlay');

    cancelBtn?.addEventListener('click', () => {
      this._isOpen = false;
      this.render();
      this._onCancel();
    });

    confirmBtn?.addEventListener('click', () => {
      this._isOpen = false;
      this.render();
      this._onConfirm();
    });

    overlay?.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this._isOpen = false;
        this.render();
        this._onCancel();
      }
    });
  }
}

customElements.define('nesto-modal', NestoModal);
