import { CellState } from './types';

const SECRET_SALT = 'nestograms_anticheat_salt_v1_8a7b6c5d4e3f2g1h';

export function generateStateString(
  grid: CellState[][],
  score: number,
  time: number,
  puzzleId: string
): string {
  const flatGrid = grid.map((row) => row.join('')).join('-');
  return `${puzzleId}|${flatGrid}|${score}|${Math.floor(time)}|${SECRET_SALT}`;
}

export function generateSyncHash(
  grid: CellState[][],
  score: number,
  time: number,
  puzzleId: string
): string {
  const input = generateStateString(grid, score, time, puzzleId);
  let hash1 = 5381;
  let hash2 = 52711;

  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash1 = (hash1 * 33) ^ char;
    hash2 = (hash2 * 33) ^ char;
  }

  const hex1 = (hash1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (hash2 >>> 0).toString(16).padStart(8, '0');
  return `${hex1}${hex2}`;
}

export async function generateSHA256Hash(
  grid: CellState[][],
  score: number,
  time: number,
  puzzleId: string
): Promise<string> {
  const input = generateStateString(grid, score, time, puzzleId);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return generateSyncHash(grid, score, time, puzzleId);
}

export function verifyStateHash(
  hash: string,
  grid: CellState[][],
  score: number,
  time: number,
  puzzleId: string
): boolean {
  const expectedSync = generateSyncHash(grid, score, time, puzzleId);
  return hash === expectedSync || hash.endsWith(expectedSync);
}
