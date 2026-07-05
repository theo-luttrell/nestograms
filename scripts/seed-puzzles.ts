import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import * as dotenv from 'dotenv';

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey || firebaseConfig.apiKey.includes('your_api_key')) {
  console.error('ERROR: Please configure your Firebase credentials in .env first!');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const seedPuzzles: Record<string, any> = {
  '1': {
    size: 1, // Easy (5x5)
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
    size: 2, // Medium (8x8)
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
    size: 3, // Hard (10x10)
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
    size: 4, // Impossible (20x20)
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

async function seed() {
  console.log('Starting puzzle seeding to Firestore...');
  for (const [id, puzzleData] of Object.entries(seedPuzzles)) {
    const docRef = doc(db, 'puzzles', id);
    await setDoc(docRef, {
      ...puzzleData,
      nonogram: JSON.stringify(puzzleData.nonogram),
      'nonogram-reveal': JSON.stringify(puzzleData['nonogram-reveal']),
    });
    console.log(`Seeded puzzle ID: ${id} (${puzzleData.name}, size: ${puzzleData.size})`);
  }
  console.log('Seeding complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Failed to seed puzzles:', err);
  process.exit(1);
});
