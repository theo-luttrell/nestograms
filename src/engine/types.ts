export enum CellState {
  EMPTY = 0,
  FILLED = 1,
  CROSSED = 2,
}

export enum Difficulty {
  EASY = 1,
  MEDIUM = 2,
  HARD = 3,
  IMPOSSIBLE = 4,
}

export interface Puzzle {
  size: number;
  name: string;
  nonogram: number[][];
  'nonogram-reveal': string[][];
}

export interface PuzzleMap {
  [id: string]: Puzzle;
}

export interface ScoreEntry {
  id?: string;
  uid: string;
  username: string;
  puzzleId: string;
  score: number;
  time: number;
  date: string;
  difficulty: number;
  hash?: string;
}

export interface Keybinds {
  up: string;
  down: string;
  left: string;
  right: string;
  fill: string;
  mark: string;
  clear: string;
}

export interface UserSettings {
  username: string;
  keybinds: Keybinds;
  windowType: 'popup' | 'windowed';
  volume: boolean;
}

export interface GameState {
  puzzleId: string;
  difficulty: Difficulty;
  puzzle: Puzzle;
  grid: CellState[][];
  rowClues: number[][];
  colClues: number[][];
  rowSatisfied: boolean[];
  colSatisfied: boolean[];
  cursorRow: number;
  cursorCol: number;
  score: number;
  startTime: number;
  elapsedTime: number;
  isPaused: boolean;
  isCompleted: boolean;
  livesLost: number;
}

export interface UserProgress {
  highestCompleted: {
    [key in Difficulty]: number;
  };
}
