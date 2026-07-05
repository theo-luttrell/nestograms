import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
  where,
} from 'firebase/firestore';
import { db, ensureAnonymousAuth, isFirebaseConfigured } from './firebase';
import { ScoreEntry, PuzzleMap, Difficulty } from '../engine/types';
import { getCorrectPlacementPoints } from '../engine/scoring';
import { loadOfflineQueue, saveOfflineQueue, loadSettings, saveSettings } from './storage';

const LAST_SUBMIT_KEY = 'nesto_last_score_submit_time';

export const FALLBACK_PUZZLES: PuzzleMap = {
  '1': {
    size: 1,
    name: 'Apple',
    nonogram: [
      [0, 1, 1, 1, 0],
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
      [0, 1, 1, 1, 0],
      [0, 0, 1, 0, 0],
    ],
    'nonogram-reveal': [
      ['#ffffff', '#e53935', '#e53935', '#43a047', '#ffffff'],
      ['#e53935', '#e53935', '#e53935', '#e53935', '#e53935'],
      ['#e53935', '#e53935', '#e53935', '#e53935', '#e53935'],
      ['#ffffff', '#e53935', '#e53935', '#e53935', '#ffffff'],
      ['#ffffff', '#ffffff', '#5d4037', '#ffffff', '#ffffff'],
    ],
  },
  '2': {
    size: 2,
    name: 'Heart',
    nonogram: [
      [0, 1, 1, 0, 0, 1, 1, 0],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [0, 1, 1, 1, 1, 1, 1, 0],
      [0, 0, 1, 1, 1, 1, 0, 0],
      [0, 0, 0, 1, 1, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
    ],
    'nonogram-reveal': [
      ['#ffffff', '#d81b60', '#d81b60', '#ffffff', '#ffffff', '#d81b60', '#d81b60', '#ffffff'],
      ['#d81b60', '#ff80ab', '#d81b60', '#d81b60', '#d81b60', '#d81b60', '#d81b60', '#d81b60'],
      ['#d81b60', '#d81b60', '#d81b60', '#d81b60', '#d81b60', '#d81b60', '#d81b60', '#d81b60'],
      ['#d81b60', '#d81b60', '#d81b60', '#d81b60', '#d81b60', '#d81b60', '#d81b60', '#d81b60'],
      ['#ffffff', '#d81b60', '#d81b60', '#d81b60', '#d81b60', '#d81b60', '#d81b60', '#ffffff'],
      ['#ffffff', '#ffffff', '#d81b60', '#d81b60', '#d81b60', '#d81b60', '#ffffff', '#ffffff'],
      ['#ffffff', '#ffffff', '#ffffff', '#d81b60', '#d81b60', '#ffffff', '#ffffff', '#ffffff'],
      ['#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff'],
    ],
  },
  '3': {
    size: 3,
    name: 'Smiley',
    nonogram: [
      [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [1, 1, 0, 0, 1, 1, 0, 0, 1, 1],
      [1, 1, 0, 0, 1, 1, 0, 0, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 0, 0, 0, 0, 1, 1, 1],
      [1, 1, 0, 1, 1, 1, 1, 0, 1, 1],
      [0, 1, 1, 0, 0, 0, 0, 1, 1, 0],
      [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ],
    'nonogram-reveal': [
      [
        '#ffffff',
        '#ffffff',
        '#fbc02d',
        '#fbc02d',
        '#fbc02d',
        '#fbc02d',
        '#fbc02d',
        '#fbc02d',
        '#ffffff',
        '#ffffff',
      ],
      [
        '#ffffff',
        '#fbc02d',
        '#fbc02d',
        '#fbc02d',
        '#fbc02d',
        '#fbc02d',
        '#fbc02d',
        '#fbc02d',
        '#fbc02d',
        '#ffffff',
      ],
      [
        '#fbc02d',
        '#fbc02d',
        '#212121',
        '#212121',
        '#fbc02d',
        '#fbc02d',
        '#212121',
        '#212121',
        '#fbc02d',
        '#fbc02d',
      ],
      [
        '#fbc02d',
        '#fbc02d',
        '#212121',
        '#212121',
        '#fbc02d',
        '#fbc02d',
        '#212121',
        '#212121',
        '#fbc02d',
        '#fbc02d',
      ],
      [
        '#fbc02d',
        '#fbc02d',
        '#fbc02d',
        '#fbc02d',
        '#fbc02d',
        '#fbc02d',
        '#fbc02d',
        '#fbc02d',
        '#fbc02d',
        '#fbc02d',
      ],
      [
        '#fbc02d',
        '#fbc02d',
        '#fbc02d',
        '#212121',
        '#212121',
        '#212121',
        '#212121',
        '#fbc02d',
        '#fbc02d',
        '#fbc02d',
      ],
      [
        '#fbc02d',
        '#fbc02d',
        '#212121',
        '#fbc02d',
        '#fbc02d',
        '#fbc02d',
        '#fbc02d',
        '#212121',
        '#fbc02d',
        '#fbc02d',
      ],
      [
        '#ffffff',
        '#fbc02d',
        '#fbc02d',
        '#212121',
        '#212121',
        '#212121',
        '#212121',
        '#fbc02d',
        '#fbc02d',
        '#ffffff',
      ],
      [
        '#ffffff',
        '#ffffff',
        '#fbc02d',
        '#fbc02d',
        '#fbc02d',
        '#fbc02d',
        '#fbc02d',
        '#fbc02d',
        '#ffffff',
        '#ffffff',
      ],
      [
        '#ffffff',
        '#ffffff',
        '#ffffff',
        '#ffffff',
        '#ffffff',
        '#ffffff',
        '#ffffff',
        '#ffffff',
        '#ffffff',
        '#ffffff',
      ],
    ],
  },
  '4': {
    size: 4,
    name: 'Star',
    nonogram: Array(20)
      .fill(0)
      .map((_, r) =>
        Array(20)
          .fill(0)
          .map((_, c) =>
            r === c || r + c === 19 || (r >= 7 && r <= 12 && c >= 7 && c <= 12) ? 1 : 0
          )
      ),
    'nonogram-reveal': Array(20)
      .fill('#ffffff')
      .map((_, r) =>
        Array(20)
          .fill('#ffffff')
          .map((_, c) =>
            r === c || r + c === 19 || (r >= 7 && r <= 12 && c >= 7 && c <= 12)
              ? '#ab47bc'
              : '#ffffff'
          )
      ),
  },
};

export function isScorePlausible(score: number, maxCells: number, difficulty: Difficulty): boolean {
  if (score < 0) return false;
  const maxPossible = maxCells * getCorrectPlacementPoints(maxCells, difficulty);
  return score <= maxPossible;
}

export async function submitScore(
  entry: ScoreEntry,
  maxCells: number
): Promise<{ success: boolean; queued: boolean; message?: string }> {
  if (!isScorePlausible(entry.score, maxCells, entry.difficulty)) {
    return {
      success: false,
      queued: false,
      message: 'Score rejected by plausibility verification.',
    };
  }

  const now = Date.now();
  const lastSubmit = Number(localStorage.getItem(LAST_SUBMIT_KEY) || 0);
  if (now - lastSubmit < 30000) {
    return {
      success: false,
      queued: false,
      message: 'Rate limit exceeded. Please wait 30 seconds between submissions.',
    };
  }
  localStorage.setItem(LAST_SUBMIT_KEY, String(now));

  if (!navigator.onLine || !isFirebaseConfigured || !db) {
    const queue = await loadOfflineQueue();
    queue.push(entry);
    await saveOfflineQueue(queue);
    return { success: true, queued: true, message: 'Saved offline. Will sync when online.' };
  }

  try {
    const user = await ensureAnonymousAuth();
    if (!user) {
      throw new Error('Authentication failed');
    }

    const scoreId = entry.id || `${user.uid}_${Date.now()}`;
    const scoreRef = doc(db, 'scores', scoreId);
    await setDoc(scoreRef, {
      ...entry,
      uid: user.uid,
      timestamp: serverTimestamp(),
    });

    // Also update user doc
    const userRef = doc(db, 'users', user.uid);
    await setDoc(
      userRef,
      { username: entry.username, updatedAt: serverTimestamp() },
      { merge: true }
    );

    return { success: true, queued: false };
  } catch (err) {
    console.warn('Firestore submission failed, queuing offline:', err);
    const queue = await loadOfflineQueue();
    queue.push(entry);
    await saveOfflineQueue(queue);
    return { success: true, queued: true, message: 'Network error. Saved to offline queue.' };
  }
}

export async function syncOfflineScores(): Promise<void> {
  if (!navigator.onLine || !isFirebaseConfigured || !db) return;
  const queue = await loadOfflineQueue();
  if (queue.length === 0) return;

  const remaining: ScoreEntry[] = [];
  for (const item of queue) {
    try {
      const user = await ensureAnonymousAuth();
      if (!user) {
        remaining.push(item);
        continue;
      }
      const scoreId =
        item.id || `${user.uid}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      await setDoc(doc(db, 'scores', scoreId), {
        ...item,
        uid: user.uid,
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Failed to sync offline item:', err);
      remaining.push(item);
    }
  }
  await saveOfflineQueue(remaining);
}

export async function fetchLeaderboard(limitCount = 50): Promise<ScoreEntry[]> {
  if (!navigator.onLine || !isFirebaseConfigured || !db) {
    return [
      {
        uid: 'mock_1',
        username: 'Nestor-Pro',
        puzzleId: '3',
        score: 3200,
        time: 42,
        date: new Date().toLocaleDateString(),
        difficulty: 3,
      },
      {
        uid: 'mock_2',
        username: 'Vite-King',
        puzzleId: '2',
        score: 2450,
        time: 65,
        date: new Date().toLocaleDateString(),
        difficulty: 2,
      },
      {
        uid: 'mock_3',
        username: 'CRX-Queen',
        puzzleId: '4',
        score: 8900,
        time: 180,
        date: new Date().toLocaleDateString(),
        difficulty: 4,
      },
    ];
  }

  try {
    const scoresRef = collection(db, 'scores');
    const q = query(scoresRef, orderBy('score', 'desc'), orderBy('time', 'asc'), limit(limitCount));
    const snap = await getDocs(q);
    const entries: ScoreEntry[] = [];
    snap.forEach((docSnap) => {
      entries.push({ id: docSnap.id, ...docSnap.data() } as ScoreEntry);
    });
    return entries;
  } catch (err) {
    console.warn('Failed to fetch leaderboard from Firestore, using mock:', err);
    return [
      {
        uid: 'mock_1',
        username: 'Nestor-Pro',
        puzzleId: '3',
        score: 3200,
        time: 42,
        date: new Date().toLocaleDateString(),
        difficulty: 3,
      },
      {
        uid: 'mock_2',
        username: 'Vite-King',
        puzzleId: '2',
        score: 2450,
        time: 65,
        date: new Date().toLocaleDateString(),
        difficulty: 2,
      },
    ];
  }
}

export async function fetchPuzzles(): Promise<PuzzleMap> {
  if (!navigator.onLine || !isFirebaseConfigured || !db) {
    return FALLBACK_PUZZLES;
  }

  try {
    const puzzlesRef = collection(db, 'puzzles');
    const snap = await getDocs(puzzlesRef);
    if (snap.empty) {
      return FALLBACK_PUZZLES;
    }
    const map: PuzzleMap = {};
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const nonogram = typeof data.nonogram === 'string' ? JSON.parse(data.nonogram) : data.nonogram;
      const reveal =
        typeof data['nonogram-reveal'] === 'string'
          ? JSON.parse(data['nonogram-reveal'])
          : data['nonogram-reveal'];
      map[docSnap.id] = {
        ...data,
        nonogram,
        'nonogram-reveal': reveal,
      } as any;
    });
    return map;
  } catch (err) {
    console.warn('Failed to fetch puzzles from Firestore, using fallback:', err);
    return FALLBACK_PUZZLES;
  }
}

export async function updateServerUsername(newUsername: string): Promise<boolean> {
  const settings = await loadSettings();
  settings.username = newUsername;
  await saveSettings(settings);

  if (!navigator.onLine || !isFirebaseConfigured || !db) {
    return true;
  }

  try {
    const user = await ensureAnonymousAuth();
    if (!user) return true;

    // Check if username is taken in users collection
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', newUsername));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const existing = snap.docs[0];
      if (existing.id !== user.uid) {
        throw new Error('Username already taken');
      }
    }

    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, { username: newUsername, updatedAt: serverTimestamp() }, { merge: true });

    // Batch update existing scores for this user so leaderboard reflects new username instantly
    const scoresRef = collection(db, 'scores');
    const userScoresQ = query(scoresRef, where('uid', '==', user.uid));
    const scoresSnap = await getDocs(userScoresQ);

    if (!scoresSnap.empty) {
      const batch = writeBatch(db);
      scoresSnap.forEach((sDoc) => {
        batch.update(sDoc.ref, { username: newUsername });
      });
      await batch.commit();
    }

    return true;
  } catch (err: any) {
    console.error('Failed to update username on server:', err);
    throw err;
  }
}
