import { Difficulty } from './types';

export function getDifficultyMultiplier(difficulty: Difficulty): number {
  switch (difficulty) {
    case Difficulty.EASY:
      return 0.75;
    case Difficulty.MEDIUM:
      return 1.0;
    case Difficulty.HARD:
      return 1.25;
    case Difficulty.IMPOSSIBLE:
      return 3.0;
    default:
      return 1.0;
  }
}

export function getCorrectPlacementPoints(maxCells: number, difficulty: Difficulty): number {
  const base = Math.ceil(3000 / maxCells);
  const mult = getDifficultyMultiplier(difficulty);
  return Math.ceil(base * mult);
}

export function getIncorrectPlacementPenalty(maxCells: number, difficulty: Difficulty): number {
  const base = Math.ceil(1500 / maxCells);
  const mult = getDifficultyMultiplier(difficulty);
  return Math.ceil(base * mult);
}

export function getTimePenaltyPerSecond(maxCells: number, difficulty: Difficulty): number {
  const base = Math.ceil(30 / maxCells);
  const mult = getDifficultyMultiplier(difficulty);
  return Math.ceil(base * mult);
}

export interface ScoreCalculationParams {
  correctFilledCount: number;
  livesLost: number;
  elapsedSeconds: number;
  maxCells: number;
  difficulty: Difficulty;
}

export function calculateScore(params: ScoreCalculationParams): number {
  const { correctFilledCount, livesLost, elapsedSeconds, maxCells, difficulty } = params;

  if (maxCells <= 0) return 0;

  const correctPoints = getCorrectPlacementPoints(maxCells, difficulty);
  const incorrectPenalty = getIncorrectPlacementPenalty(maxCells, difficulty);
  const timePenaltyRate = getTimePenaltyPerSecond(maxCells, difficulty);

  const totalPositive = correctFilledCount * correctPoints;
  const totalNegative = livesLost * incorrectPenalty + Math.floor(elapsedSeconds) * timePenaltyRate;

  const rawScore = totalPositive - totalNegative;
  return Math.max(0, rawScore);
}
