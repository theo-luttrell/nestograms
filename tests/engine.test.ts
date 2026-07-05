import { describe, it, expect } from 'vitest';
import { Difficulty, CellState } from '../src/engine/types';
import {
  getDifficultyMultiplier,
  getCorrectPlacementPoints,
  getIncorrectPlacementPenalty,
  getTimePenaltyPerSecond,
  calculateScore,
} from '../src/engine/scoring';
import {
  createEmptyGrid,
  generateRowClues,
  generateColClues,
  isRowSatisfied,
  isGridCompleted,
  countCorrectFilled,
} from '../src/engine/grid';
import { getManhattanWaveSequence, spawnConfettiBurst } from '../src/engine/animation';
import { generateSyncHash, verifyStateHash } from '../src/engine/anticheat';

describe('Scoring Engine', () => {
  it('should return correct difficulty multipliers', () => {
    expect(getDifficultyMultiplier(Difficulty.EASY)).toBe(0.75);
    expect(getDifficultyMultiplier(Difficulty.MEDIUM)).toBe(1.0);
    expect(getDifficultyMultiplier(Difficulty.HARD)).toBe(1.25);
    expect(getDifficultyMultiplier(Difficulty.IMPOSSIBLE)).toBe(3.0);
  });

  it('should calculate correct placement points based on maxCells and multiplier', () => {
    // Easy (25 cells): Math.ceil(3000 / 25) = 120; 120 * 0.75 = 90
    expect(getCorrectPlacementPoints(25, Difficulty.EASY)).toBe(90);
    // Medium (64 cells): Math.ceil(3000 / 64) = 47; 47 * 1 = 47
    expect(getCorrectPlacementPoints(64, Difficulty.MEDIUM)).toBe(47);
  });

  it('should deduct incorrect placement heart penalties silently', () => {
    // Easy (25 cells): Math.ceil(1500 / 25) = 60; 60 * 0.75 = 45
    expect(getIncorrectPlacementPenalty(25, Difficulty.EASY)).toBe(45);
  });

  it('should calculate time penalty per second', () => {
    // Easy (25 cells): Math.ceil(30 / 25) = 2; 2 * 0.75 = 1.5 -> Math.ceil(1.5) = 2
    expect(getTimePenaltyPerSecond(25, Difficulty.EASY)).toBe(2);
  });

  it('should compute total score and enforce 0 absolute floor', () => {
    const params = {
      correctFilledCount: 5,
      livesLost: 1,
      elapsedSeconds: 10,
      maxCells: 25,
      difficulty: Difficulty.EASY,
    };
    // 5 * 90 = 450 positive
    // 1 * 45 = 45 penalty for livesLost
    // 10 * 2 = 20 penalty for time
    // Total = 450 - 45 - 20 = 385
    expect(calculateScore(params)).toBe(385);

    // With massive penalty, should floor at 0
    expect(
      calculateScore({
        ...params,
        livesLost: 50,
      })
    ).toBe(0);
  });
});

describe('Grid Engine', () => {
  it('should create empty grid of correct dimensions', () => {
    const grid = createEmptyGrid(5, 5);
    expect(grid.length).toBe(5);
    expect(grid[0].length).toBe(5);
    expect(grid[0][0]).toBe(CellState.EMPTY);
  });

  it('should generate accurate row and column clues', () => {
    const target = [
      [1, 0, 1, 0],
      [1, 1, 0, 0],
      [0, 0, 0, 0],
      [1, 1, 1, 1],
    ];
    const rowClues = generateRowClues(target);
    expect(rowClues).toEqual([[1, 1], [2], [0], [4]]);

    const colClues = generateColClues(target);
    expect(colClues).toEqual([[2, 1], [1, 1], [1, 1], [1]]);
  });

  it('should detect when row or column is satisfied', () => {
    const target = [
      [1, 0, 1],
      [0, 1, 0],
      [1, 1, 1],
    ];
    const grid = createEmptyGrid(3, 3);
    grid[0][0] = CellState.FILLED;
    grid[0][2] = CellState.FILLED;
    expect(isRowSatisfied(grid, target, 0)).toBe(true);
    expect(isRowSatisfied(grid, target, 1)).toBe(false);

    // Adding an X should still leave it satisfied
    grid[0][1] = CellState.CROSSED;
    expect(isRowSatisfied(grid, target, 0)).toBe(true);
  });

  it('should validate grid completion correctly', () => {
    const target = [
      [1, 0],
      [0, 1],
    ];
    const grid = createEmptyGrid(2, 2);
    expect(isGridCompleted(grid, target)).toBe(false);

    grid[0][0] = CellState.FILLED;
    grid[1][1] = CellState.FILLED;
    expect(isGridCompleted(grid, target)).toBe(true);

    // Filling a 0 cell should invalidate completion
    grid[0][1] = CellState.FILLED;
    expect(isGridCompleted(grid, target)).toBe(false);
  });

  it('should count correct filled cells', () => {
    const target = [
      [1, 0],
      [0, 1],
    ];
    const grid = createEmptyGrid(2, 2);
    grid[0][0] = CellState.FILLED;
    grid[0][1] = CellState.FILLED; // Incorrect
    expect(countCorrectFilled(grid, target)).toBe(1);
  });
});

describe('Animation Engine', () => {
  it('should generate Manhattan distance waves in diagonal order', () => {
    const waves = getManhattanWaveSequence(3, 3);
    expect(waves.length).toBe(5); // max step is (3-1) + (3-1) = 4, so indices 0..4
    expect(waves[0][0]).toEqual({ row: 0, col: 0, step: 0, delayMs: 0 });
    expect(waves[4][0]).toEqual({ row: 2, col: 2, step: 4, delayMs: 800 });
  });

  it('should spawn confetti particles from both cannons', () => {
    const particles = spawnConfettiBurst(800, 600);
    expect(particles.length).toBe(100);
    expect(particles[0].y).toBeCloseTo(480);
  });
});

describe('Anti-Cheat Engine', () => {
  it('should generate deterministic hash and verify state', () => {
    const grid = createEmptyGrid(2, 2);
    grid[0][0] = CellState.FILLED;
    const hash = generateSyncHash(grid, 500, 42, 'puz_1');
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
    expect(verifyStateHash(hash, grid, 500, 42, 'puz_1')).toBe(true);
    expect(verifyStateHash(hash, grid, 500, 43, 'puz_1')).toBe(false);
  });
});
