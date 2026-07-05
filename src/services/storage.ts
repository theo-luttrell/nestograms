import { UserSettings, GameState, ScoreEntry, UserProgress, Difficulty } from '../engine/types';

const STORAGE_KEYS = {
  SETTINGS: 'nesto_settings_v1',
  GAME_STATE: 'nesto_active_game_v1',
  OFFLINE_QUEUE: 'nesto_offline_scores_v1',
  PROGRESS: 'nesto_user_progress_v1',
  FIRST_RUN: 'nesto_has_launched_v1',
};

export function getDefaultSettings(): UserSettings {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return {
    username: `Player-${randomNum}`,
    keybinds: {
      up: 'ArrowUp',
      down: 'ArrowDown',
      left: 'ArrowLeft',
      right: 'ArrowRight',
      fill: 'z',
      mark: 'x',
      clear: 'Backspace',
    },
    windowType: 'popup',
    volume: true,
  };
}

export function getDefaultProgress(): UserProgress {
  return {
    highestCompleted: {
      [Difficulty.EASY]: 0,
      [Difficulty.MEDIUM]: 0,
      [Difficulty.HARD]: 0,
      [Difficulty.IMPOSSIBLE]: 0,
    },
  };
}

async function storageGet<T>(key: string, fallback: T): Promise<T> {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    try {
      const res = await chrome.storage.local.get([key]);
      return res[key] !== undefined ? res[key] : fallback;
    } catch (err) {
      console.warn(
        `chrome.storage.local.get failed for ${key}, falling back to localStorage:`,
        err
      );
    }
  }
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (err) {
    console.warn(`localStorage.getItem failed for ${key}:`, err);
    return fallback;
  }
}

async function storageSet(key: string, value: any): Promise<void> {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    try {
      await chrome.storage.local.set({ [key]: value });
      return;
    } catch (err) {
      console.warn(
        `chrome.storage.local.set failed for ${key}, falling back to localStorage:`,
        err
      );
    }
  }
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`localStorage.setItem failed for ${key}:`, err);
  }
}

export async function loadSettings(): Promise<UserSettings> {
  const defaults = getDefaultSettings();
  const loaded = await storageGet<UserSettings>(STORAGE_KEYS.SETTINGS, defaults);
  return {
    ...defaults,
    ...loaded,
    keybinds: {
      ...defaults.keybinds,
      ...(loaded?.keybinds || {}),
    },
  };
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  await storageSet(STORAGE_KEYS.SETTINGS, settings);
}

export async function loadGameState(): Promise<GameState | null> {
  return await storageGet<GameState | null>(STORAGE_KEYS.GAME_STATE, null);
}

export async function saveGameState(state: GameState | null): Promise<void> {
  await storageSet(STORAGE_KEYS.GAME_STATE, state);
}

export async function loadOfflineQueue(): Promise<ScoreEntry[]> {
  return await storageGet<ScoreEntry[]>(STORAGE_KEYS.OFFLINE_QUEUE, []);
}

export async function saveOfflineQueue(queue: ScoreEntry[]): Promise<void> {
  await storageSet(STORAGE_KEYS.OFFLINE_QUEUE, queue);
}

export async function loadUserProgress(): Promise<UserProgress> {
  const defaults = getDefaultProgress();
  const loaded = await storageGet<UserProgress>(STORAGE_KEYS.PROGRESS, defaults);
  return {
    highestCompleted: {
      ...defaults.highestCompleted,
      ...(loaded?.highestCompleted || {}),
    },
  };
}

export async function saveUserProgress(progress: UserProgress): Promise<void> {
  await storageSet(STORAGE_KEYS.PROGRESS, progress);
}

export async function isFirstRun(): Promise<boolean> {
  const launched = await storageGet<boolean>(STORAGE_KEYS.FIRST_RUN, false);
  if (!launched) {
    await storageSet(STORAGE_KEYS.FIRST_RUN, true);
    return true;
  }
  return false;
}
