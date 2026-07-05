import { CellState } from './types';

export function createEmptyGrid(rows: number, cols: number): CellState[][] {
  const grid: CellState[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: CellState[] = [];
    for (let c = 0; c < cols; c++) {
      row.push(CellState.EMPTY);
    }
    grid.push(row);
  }
  return grid;
}

export function generateRowClues(targetGrid: number[][]): number[][] {
  return targetGrid.map((row) => {
    const clues: number[] = [];
    let count = 0;
    for (const cell of row) {
      if (cell === 1) {
        count++;
      } else if (count > 0) {
        clues.push(count);
        count = 0;
      }
    }
    if (count > 0) {
      clues.push(count);
    }
    return clues.length > 0 ? clues : [0];
  });
}

export function generateColClues(targetGrid: number[][]): number[][] {
  if (targetGrid.length === 0 || targetGrid[0].length === 0) return [];
  const cols = targetGrid[0].length;
  const rows = targetGrid.length;
  const colClues: number[][] = [];

  for (let c = 0; c < cols; c++) {
    const clues: number[] = [];
    let count = 0;
    for (let r = 0; r < rows; r++) {
      if (targetGrid[r][c] === 1) {
        count++;
      } else if (count > 0) {
        clues.push(count);
        count = 0;
      }
    }
    if (count > 0) {
      clues.push(count);
    }
    colClues.push(clues.length > 0 ? clues : [0]);
  }
  return colClues;
}

export function isRowSatisfied(
  grid: CellState[][],
  targetGrid: number[][],
  rowIdx: number
): boolean {
  if (!grid[rowIdx] || !targetGrid[rowIdx]) return false;
  const cols = targetGrid[rowIdx].length;
  for (let c = 0; c < cols; c++) {
    const isFilled = grid[rowIdx][c] === CellState.FILLED;
    const isTarget = targetGrid[rowIdx][c] === 1;
    if (isFilled !== isTarget) {
      return false;
    }
  }
  return true;
}

export function isColSatisfied(
  grid: CellState[][],
  targetGrid: number[][],
  colIdx: number
): boolean {
  if (targetGrid.length === 0 || !grid[0] || !targetGrid[0]) return false;
  const rows = targetGrid.length;
  for (let r = 0; r < rows; r++) {
    const isFilled = grid[r][colIdx] === CellState.FILLED;
    const isTarget = targetGrid[r][colIdx] === 1;
    if (isFilled !== isTarget) {
      return false;
    }
  }
  return true;
}

export function isGridCompleted(grid: CellState[][], targetGrid: number[][]): boolean {
  const rows = targetGrid.length;
  if (rows === 0) return true;
  const cols = targetGrid[0].length;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const isFilled = grid[r][c] === CellState.FILLED;
      const isTarget = targetGrid[r][c] === 1;
      if (isFilled !== isTarget) {
        return false;
      }
    }
  }
  return true;
}

export function countCorrectFilled(grid: CellState[][], targetGrid: number[][]): number {
  const rows = targetGrid.length;
  if (rows === 0) return 0;
  const cols = targetGrid[0].length;
  let count = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === CellState.FILLED && targetGrid[r][c] === 1) {
        count++;
      }
    }
  }
  return count;
}
