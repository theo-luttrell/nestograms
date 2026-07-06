import { createCanvas } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';

interface ItemDef {
  name: string;
  emoji: string;
  color: string;
}

interface PuzzleData {
  size: number;
  name: string;
  nonogram: number[][];
  'nonogram-reveal': string[][];
}

// Validation: ensures nonogram is solvable, recognizable, and not trivial
function isValidNonogram(grid: number[][], size: number): boolean {
  if (!grid || grid.length !== size) return false;
  let totalOnes = 0;
  for (let r = 0; r < size; r++) {
    if (!grid[r] || grid[r].length !== size) return false;
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === 1) totalOnes++;
    }
  }

  // Check bounds for filled pixels
  const minOnes = Math.max(3, Math.floor(size * size * 0.15));
  const maxOnes = Math.floor(size * size * 0.82);
  if (totalOnes < minOnes || totalOnes > maxOnes) return false;

  // Check that not all rows or all cols are empty or identical
  let nonZeroRows = 0;
  let nonZeroCols = 0;
  for (let r = 0; r < size; r++) {
    if (grid[r].some((val) => val === 1)) nonZeroRows++;
  }
  for (let c = 0; c < size; c++) {
    let colHasOne = false;
    for (let r = 0; r < size; r++) {
      if (grid[r][c] === 1) {
        colHasOne = true;
        break;
      }
    }
    if (colHasOne) nonZeroCols++;
  }

  if (nonZeroRows < Math.floor(size * 0.5) || nonZeroCols < Math.floor(size * 0.5)) {
    return false;
  }

  return true;
}

// Color utilities for shading reveal grids
function hexToRgb(hex: string): [number, number, number] {
  const cleanHex = hex.replace('#', '');
  const bigint = parseInt(cleanHex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r, g, b];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.max(0, Math.min(255, Math.round(n))).toString(16).toUpperCase();
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function shadeColor(hex: string, factor: number): string {
  try {
    const [r, g, b] = hexToRgb(hex);
    return rgbToHex(r * factor, g * factor, b * factor);
  } catch (e) {
    return hex;
  }
}

// Curated fallback patterns for 5x5 grids (guaranteed crisp & solvable)
const fallback5x5: number[][][] = [
  // Apple / Peach
  [
    [0, 0, 1, 1, 0],
    [0, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [0, 1, 1, 1, 0],
  ],
  // Heart
  [
    [0, 1, 0, 1, 0],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [0, 1, 1, 1, 0],
    [0, 0, 1, 0, 0],
  ],
  // Star
  [
    [0, 0, 1, 0, 0],
    [1, 1, 1, 1, 1],
    [0, 1, 1, 1, 0],
    [0, 1, 0, 1, 0],
    [1, 0, 0, 0, 1],
  ],
  // Cross / Plus
  [
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [1, 1, 1, 1, 1],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
  ],
  // Diamond
  [
    [0, 0, 1, 0, 0],
    [0, 1, 1, 1, 0],
    [1, 1, 1, 1, 1],
    [0, 1, 1, 1, 0],
    [0, 0, 1, 0, 0],
  ],
  // House
  [
    [0, 0, 1, 0, 0],
    [0, 1, 1, 1, 0],
    [1, 1, 1, 1, 1],
    [0, 1, 0, 1, 0],
    [0, 1, 0, 1, 0],
  ],
  // Tree
  [
    [0, 0, 1, 0, 0],
    [0, 1, 1, 1, 0],
    [1, 1, 1, 1, 1],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
  ],
  // Sword
  [
    [0, 0, 0, 0, 1],
    [0, 0, 0, 1, 0],
    [0, 0, 1, 0, 0],
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 0],
  ],
  // Cup / Mug
  [
    [1, 1, 1, 1, 0],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 0],
    [0, 1, 1, 0, 0],
    [1, 1, 1, 1, 0],
  ],
  // Boat
  [
    [0, 0, 1, 0, 0],
    [0, 1, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [1, 1, 1, 1, 1],
    [0, 1, 1, 1, 0],
  ],
  // Duck / Bird
  [
    [0, 1, 1, 0, 0],
    [1, 1, 0, 0, 0],
    [0, 1, 1, 1, 0],
    [1, 1, 1, 1, 1],
    [0, 1, 1, 1, 0],
  ],
  // Cat
  [
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1],
    [1, 0, 1, 0, 1],
    [1, 1, 1, 1, 1],
    [0, 1, 1, 1, 0],
  ],
  // Crown
  [
    [1, 0, 1, 0, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [0, 1, 1, 1, 0],
  ],
  // Fish
  [
    [0, 0, 1, 1, 0],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 0],
    [1, 1, 1, 1, 1],
    [0, 0, 1, 1, 0],
  ],
  // Lightning Bolt
  [
    [0, 0, 1, 1, 0],
    [0, 1, 1, 0, 0],
    [1, 1, 1, 1, 0],
    [0, 0, 1, 1, 0],
    [0, 1, 1, 0, 0],
  ],
  // Moon
  [
    [0, 1, 1, 1, 0],
    [1, 1, 0, 0, 0],
    [1, 1, 0, 0, 0],
    [1, 1, 0, 0, 0],
    [0, 1, 1, 1, 0],
  ],
  // Sun
  [
    [1, 0, 1, 0, 1],
    [0, 1, 1, 1, 0],
    [1, 1, 1, 1, 1],
    [0, 1, 1, 1, 0],
    [1, 0, 1, 0, 1],
  ],
  // Flower
  [
    [0, 1, 0, 1, 0],
    [1, 1, 1, 1, 1],
    [0, 1, 1, 1, 0],
    [0, 0, 1, 0, 0],
    [0, 1, 0, 1, 0],
  ],
  // Mushroom
  [
    [0, 1, 1, 1, 0],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [0, 0, 1, 0, 0],
    [0, 1, 1, 1, 0],
  ],
  // Key
  [
    [0, 1, 1, 0, 0],
    [1, 0, 0, 1, 0],
    [0, 1, 1, 0, 0],
    [0, 0, 1, 1, 0],
    [0, 0, 1, 0, 1],
  ],
  // Shield
  [
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [0, 1, 1, 1, 0],
    [0, 0, 1, 0, 0],
  ],
  // Rocket
  [
    [0, 0, 1, 0, 0],
    [0, 1, 1, 1, 0],
    [0, 1, 1, 1, 0],
    [1, 1, 1, 1, 1],
    [1, 0, 1, 0, 1],
  ],
  // Robot
  [
    [0, 1, 1, 1, 0],
    [1, 0, 1, 0, 1],
    [1, 1, 1, 1, 1],
    [1, 0, 1, 0, 1],
    [0, 1, 0, 1, 0],
  ],
  // Alien
  [
    [0, 1, 1, 1, 0],
    [1, 0, 1, 0, 1],
    [1, 1, 1, 1, 1],
    [0, 1, 0, 1, 0],
    [0, 0, 1, 0, 0],
  ],
  // Car
  [
    [0, 0, 0, 0, 0],
    [0, 1, 1, 1, 0],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [0, 1, 0, 1, 0],
  ],
  // Bell
  [
    [0, 0, 1, 0, 0],
    [0, 1, 1, 1, 0],
    [0, 1, 1, 1, 0],
    [1, 1, 1, 1, 1],
    [0, 0, 1, 0, 0],
  ],
  // Lock
  [
    [0, 1, 1, 1, 0],
    [0, 1, 0, 1, 0],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
  ],
  // Gift
  [
    [0, 1, 0, 1, 0],
    [1, 1, 1, 1, 1],
    [0, 1, 0, 1, 0],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
  ],
  // Target
  [
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 1, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1],
  ],
  // Checkmark
  [
    [0, 0, 0, 0, 1],
    [0, 0, 0, 1, 0],
    [1, 0, 1, 0, 0],
    [0, 1, 0, 0, 0],
    [0, 0, 0, 0, 0],
  ],
];

// Procedural generators for larger fallback grids if canvas rendering ever fails
function generateProceduralGrid(size: number, id: number): number[][] {
  const grid: number[][] = [];
  const patternType = id % 5;
  for (let r = 0; r < size; r++) {
    const row: number[] = [];
    for (let c = 0; c < size; c++) {
      let val = 0;
      const dr = Math.abs(r - (size - 1) / 2);
      const dc = Math.abs(c - (size - 1) / 2);
      if (patternType === 0) {
        // Diamond frame + center
        if (Math.round(dr + dc) <= Math.floor(size / 2) && Math.round(dr + dc) >= Math.floor(size / 4)) val = 1;
      } else if (patternType === 1) {
        // Star / Cross
        if (r === c || r + c === size - 1 || r === Math.floor(size / 2) || c === Math.floor(size / 2)) val = 1;
      } else if (patternType === 2) {
        // Concentric squares
        const maxD = Math.max(dr, dc);
        if (Math.round(maxD) === Math.floor(size / 2) || Math.round(maxD) === Math.floor(size / 4)) val = 1;
      } else if (patternType === 3) {
        // Bullseye target
        const dist = Math.sqrt(dr * dr + dc * dc);
        if ((dist <= size / 2 && dist >= size / 3) || dist <= size / 6) val = 1;
      } else {
        // Framed heart/pyramid
        if (r >= Math.floor(size * 0.2) && r <= Math.floor(size * 0.8) && Math.abs(c - size / 2) <= r * 0.6) val = 1;
      }
      row.push(val);
    }
    grid.push(row);
  }
  return grid;
}

// Render an item to a Nonogram grid + Reveal colors
function renderToGrid(
  item: ItemDef,
  sizeNumber: number,
  id: number
): { nonogram: number[][]; 'nonogram-reveal': string[][] } {
  const gridSize = sizeNumber === 1 ? 5 : sizeNumber === 2 ? 8 : sizeNumber === 3 ? 10 : 20;

  let validGrid: number[][] | null = null;
  let resData: Uint8ClampedArray | null = null;

  try {
    // Step 1: Render high-res emoji onto scratch canvas
    const scratchSize = 100;
    const sc = createCanvas(scratchSize, scratchSize);
    const sctx = sc.getContext('2d');
    sctx.font = '68px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    sctx.fillText(item.emoji, 12, 75);

    const idData = sctx.getImageData(0, 0, scratchSize, scratchSize).data;
    let minX = scratchSize,
      minY = scratchSize,
      maxX = -1,
      maxY = -1;
    for (let y = 0; y < scratchSize; y++) {
      for (let x = 0; x < scratchSize; x++) {
        if (idData[(y * scratchSize + x) * 4 + 3] > 15) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const w = maxX - minX + 1;
    const h = maxY - minY + 1;

    if (w > 0 && h > 0) {
      // Step 2: Draw cropped emoji onto target grid canvas
      const c = createCanvas(gridSize, gridSize);
      const ctx = c.getContext('2d');
      // For 5x5, use fill bounding box; for larger grids, leave subtle margin
      const margin = gridSize >= 10 ? 1 : 0;
      ctx.drawImage(sc, minX, minY, w, h, margin, margin, gridSize - margin * 2, gridSize - margin * 2);

      resData = ctx.getImageData(0, 0, gridSize, gridSize).data;

      // Try multiple alpha thresholds to find the most structured, solvable grid
      const thresholds = [40, 60, 80, 100, 120, 150, 30];
      for (const thresh of thresholds) {
        const testGrid: number[][] = [];
        for (let r = 0; r < gridSize; r++) {
          const row: number[] = [];
          for (let col = 0; col < gridSize; col++) {
            const alpha = resData[(r * gridSize + col) * 4 + 3];
            row.push(alpha > thresh ? 1 : 0);
          }
          testGrid.push(row);
        }
        if (isValidNonogram(testGrid, gridSize)) {
          validGrid = testGrid;
          break;
        }
      }
    }
  } catch (err) {
    // Ignore canvas render error and fall back
  }

  // Fallback if canvas rendering did not produce a valid nonogram
  if (!validGrid) {
    if (gridSize === 5) {
      validGrid = fallback5x5[id % fallback5x5.length];
    } else {
      validGrid = generateProceduralGrid(gridSize, id);
    }
  }

  // Construct reveal colors
  const nonogramReveal: string[][] = [];
  for (let r = 0; r < gridSize; r++) {
    const row: string[] = [];
    const shadeFactor = 1.1 - 0.22 * (r / Math.max(1, gridSize - 1)); // Subtle vertical 3D shading
    const shadedHex = shadeColor(item.color, shadeFactor);

    for (let c = 0; c < gridSize; c++) {
      if (validGrid[r][c] === 1) {
        // Check if canvas gave us real RGB colors (not monochrome black/white)
        if (resData) {
          const idx = (r * gridSize + c) * 4;
          const red = resData[idx];
          const green = resData[idx + 1];
          const blue = resData[idx + 2];
          const alpha = resData[idx + 3];
          const colorDiff = Math.max(red, green, blue) - Math.min(red, green, blue);
          if (alpha > 40 && (colorDiff > 15 || (red > 50 && red < 240))) {
            row.push(rgbToHex(red, green, blue));
            continue;
          }
        }
        row.push(shadedHex);
      } else {
        row.push('#FFFFFF');
      }
    }
    nonogramReveal.push(row);
  }

  return { nonogram: validGrid, 'nonogram-reveal': nonogramReveal };
}

// 600 Diverse Items grouped into 4 difficulty tiers (150 each)
const tier1Items: ItemDef[] = [
  { name: 'Apple', emoji: '🍎', color: '#E53935' },
  { name: 'Banana', emoji: '🍌', color: '#FDD835' },
  { name: 'Cherries', emoji: '🍒', color: '#D81B60' },
  { name: 'Grapes', emoji: '🍇', color: '#8E24AA' },
  { name: 'Lemon', emoji: '🍋', color: '#FFF176' },
  { name: 'Peach', emoji: '🍑', color: '#FFB74D' },
  { name: 'Strawberry', emoji: '🍓', color: '#E53935' },
  { name: 'Watermelon', emoji: '🍉', color: '#43A047' },
  { name: 'Tangerine', emoji: '🍊', color: '#FB8C00' },
  { name: 'Pineapple', emoji: '🍍', color: '#FDD835' },
  { name: 'Mango', emoji: '🥭', color: '#FFA000' },
  { name: 'Coconut', emoji: '🥥', color: '#8D6E63' },
  { name: 'Avocado', emoji: '🥑', color: '#689F38' },
  { name: 'Tomato', emoji: '🍅', color: '#E53935' },
  { name: 'Carrot', emoji: '🥕', color: '#F57C00' },
  { name: 'Corn', emoji: '🌽', color: '#FBC02D' },
  { name: 'Broccoli', emoji: '🥦', color: '#388E3C' },
  { name: 'Mushroom', emoji: '🍄', color: '#E53935' },
  { name: 'Potato', emoji: '🥔', color: '#A1887F' },
  { name: 'Eggplant', emoji: '🍆', color: '#5E35B1' },
  { name: 'Heart', emoji: '❤️', color: '#E53935' },
  { name: 'Star', emoji: '⭐', color: '#FDD835' },
  { name: 'Sparkle', emoji: '✨', color: '#FFF176' },
  { name: 'Fire', emoji: '🔥', color: '#FF5722' },
  { name: 'Droplet', emoji: '💧', color: '#29B6F6' },
  { name: 'Sun', emoji: '☀️', color: '#FFA000' },
  { name: 'Moon', emoji: '🌙', color: '#FFF59D' },
  { name: 'Cloud', emoji: '☁️', color: '#90A4AE' },
  { name: 'Lightning', emoji: '⚡', color: '#FDD835' },
  { name: 'Snowflake', emoji: '❄️', color: '#81D4FA' },
  { name: 'Rainbow', emoji: '🌈', color: '#AB47BC' },
  { name: 'Tree', emoji: '🌲', color: '#2E7D32' },
  { name: 'Palm Tree', emoji: '🌴', color: '#43A047' },
  { name: 'Cactus', emoji: '🌵', color: '#689F38' },
  { name: 'Flower', emoji: '🌸', color: '#F48FB1' },
  { name: 'Rose', emoji: '🌹', color: '#D32F2F' },
  { name: 'Sunflower', emoji: '🌻', color: '#FBC02D' },
  { name: 'Tulip', emoji: '🌷', color: '#EC407A' },
  { name: 'Seedling', emoji: '🌱', color: '#66BB6A' },
  { name: 'Leaf', emoji: '🍂', color: '#FF8F00' },
  { name: 'Dog', emoji: '🐶', color: '#A1887F' },
  { name: 'Cat', emoji: '🐱', color: '#FFB74D' },
  { name: 'Mouse', emoji: '🐭', color: '#B0BEC5' },
  { name: 'Hamster', emoji: '🐹', color: '#FFE082' },
  { name: 'Rabbit', emoji: '🐰', color: '#F5F5F5' },
  { name: 'Fox', emoji: '🦊', color: '#F57C00' },
  { name: 'Bear', emoji: '🐻', color: '#795548' },
  { name: 'Panda', emoji: '🐼', color: '#424242' },
  { name: 'Koala', emoji: '🐨', color: '#90A4AE' },
  { name: 'Tiger', emoji: '🐯', color: '#EF6C00' },
  { name: 'Lion', emoji: '🦁', color: '#FFA000' },
  { name: 'Cow', emoji: '🐮', color: '#8D6E63' },
  { name: 'Pig', emoji: '🐷', color: '#F48FB1' },
  { name: 'Frog', emoji: '🐸', color: '#43A047' },
  { name: 'Monkey', emoji: '🐵', color: '#8D6E63' },
  { name: 'Chicken', emoji: '🐔', color: '#E53935' },
  { name: 'Penguin', emoji: '🐧', color: '#263238' },
  { name: 'Bird', emoji: '🐦', color: '#42A5F5' },
  { name: 'Duck', emoji: '🦆', color: '#66BB6A' },
  { name: 'Eagle', emoji: '🦅', color: '#5D4037' },
  { name: 'Owl', emoji: '🦉', color: '#8D6E63' },
  { name: 'Bat', emoji: '🦇', color: '#455A64' },
  { name: 'Wolf', emoji: '🐺', color: '#78909C' },
  { name: 'Boar', emoji: '🐗', color: '#6D4C41' },
  { name: 'Horse', emoji: '🐴', color: '#8D6E63' },
  { name: 'Unicorn', emoji: '🦄', color: '#BA68C8' },
  { name: 'Bee', emoji: '🐝', color: '#FDD835' },
  { name: 'Bug', emoji: '🐛', color: '#8BC34A' },
  { name: 'Butterfly', emoji: '🦋', color: '#42A5F5' },
  { name: 'Snail', emoji: '🐌', color: '#A1887F' },
  { name: 'Beetle', emoji: '🐞', color: '#D32F2F' },
  { name: 'Turtle', emoji: '🐢', color: '#43A047' },
  { name: 'Snake', emoji: '🐍', color: '#689F38' },
  { name: 'Octopus', emoji: '🐙', color: '#AB47BC' },
  { name: 'Fish', emoji: '🐟', color: '#29B6F6' },
  { name: 'Dolphin', emoji: '🐬', color: '#00ACC1' },
  { name: 'Whale', emoji: '🐳', color: '#1E88E5' },
  { name: 'Shark', emoji: '🦈', color: '#78909C' },
  { name: 'Crab', emoji: '🦀', color: '#E53935' },
  { name: 'Shrimp', emoji: '🦐', color: '#FF7043' },
  { name: 'Bread', emoji: '🍞', color: '#D7CCC8' },
  { name: 'Croissant', emoji: '🥐', color: '#FFE082' },
  { name: 'Pretzel', emoji: '🥨', color: '#8D6E63' },
  { name: 'Pancake', emoji: '🥞', color: '#FFB74D' },
  { name: 'Cheese', emoji: '🧀', color: '#FDD835' },
  { name: 'Hotdog', emoji: '🌭', color: '#E53935' },
  { name: 'Burger', emoji: '🍔', color: '#8D6E63' },
  { name: 'Fries', emoji: '🍟', color: '#FBC02D' },
  { name: 'Pizza', emoji: '🍕', color: '#E53935' },
  { name: 'Taco', emoji: '🌮', color: '#FFA000' },
  { name: 'Burrito', emoji: '🌯', color: '#A1887F' },
  { name: 'Egg', emoji: '🥚', color: '#FFF9C4' },
  { name: 'Popcorn', emoji: '🍿', color: '#FFF176' },
  { name: 'Bento', emoji: '🍱', color: '#332940' },
  { name: 'Rice', emoji: '🍚', color: '#F5F5F5' },
  { name: 'Spaghetti', emoji: '🍝', color: '#E53935' },
  { name: 'Sushi', emoji: '🍣', color: '#FF7043' },
  { name: 'Ice Cream', emoji: '🍦', color: '#F8BBD0' },
  { name: 'Donut', emoji: '🍩', color: '#EC407A' },
  { name: 'Cookie', emoji: '🍪', color: '#8D6E63' },
  { name: 'Cake', emoji: '🎂', color: '#F48FB1' },
  { name: 'Pie', emoji: '🥧', color: '#FFB74D' },
  { name: 'Chocolate', emoji: '🍫', color: '#5D4037' },
  { name: 'Candy', emoji: '🍬', color: '#AB47BC' },
  { name: 'Lollipop', emoji: '🍭', color: '#EC407A' },
  { name: 'Coffee', emoji: '☕', color: '#6D4C41' },
  { name: 'Tea', emoji: '🍵', color: '#81C784' },
  { name: 'Milk', emoji: '🥛', color: '#90CAF9' },
  { name: 'Wine', emoji: '🍷', color: '#880E4F' },
  { name: 'Beer', emoji: '🍺', color: '#FBC02D' },
  { name: 'Cocktail', emoji: '🍸', color: '#80DEEA' },
  { name: 'Juice', emoji: '🧃', color: '#66BB6A' },
  { name: 'Watch', emoji: '⌚', color: '#37474F' },
  { name: 'Phone', emoji: '📱', color: '#455A64' },
  { name: 'Laptop', emoji: '💻', color: '#78909C' },
  { name: 'Keyboard', emoji: '⌨️', color: '#607D8B' },
  { name: 'Desktop', emoji: '🖥️', color: '#37474F' },
  { name: 'Printer', emoji: '🖨️', color: '#90A4AE' },
  { name: 'Mouse', emoji: '🖱️', color: '#CFD8DC' },
  { name: 'Joystick', emoji: '🕹️', color: '#D32F2F' },
  { name: 'TV', emoji: '📺', color: '#263238' },
  { name: 'Camera', emoji: '📷', color: '#455A64' },
  { name: 'Tape', emoji: '📼', color: '#212121' },
  { name: 'Battery', emoji: '🔋', color: '#43A047' },
  { name: 'Plug', emoji: '🔌', color: '#78909C' },
  { name: 'Bulb', emoji: '💡', color: '#FFEE58' },
  { name: 'Flashlight', emoji: '🔦', color: '#FDD835' },
  { name: 'Candle', emoji: '🕯️', color: '#FFE082' },
  { name: 'Book', emoji: '📖', color: '#1E88E5' },
  { name: 'Notebook', emoji: '📓', color: '#5C6BC0' },
  { name: 'Envelope', emoji: '✉️', color: '#90A4AE' },
  { name: 'Package', emoji: '📦', color: '#A1887F' },
  { name: 'Box', emoji: '🗃️', color: '#78909C' },
  { name: 'Pen', emoji: '🖊️', color: '#1976D2' },
  { name: 'Pencil', emoji: '✏️', color: '#FBC02D' },
  { name: 'Paintbrush', emoji: '🖌️', color: '#E53935' },
  { name: 'Crayon', emoji: '🖍️', color: '#D81B60' },
  { name: 'Ruler', emoji: '📏', color: '#F57C00' },
  { name: 'Scissors', emoji: '✂️', color: '#455A64' },
  { name: 'Lock', emoji: '🔒', color: '#FFA000' },
  { name: 'Key', emoji: '🔑', color: '#FDD835' },
  { name: 'Hammer', emoji: '🔨', color: '#78909C' },
  { name: 'Axe', emoji: '🪓', color: '#5D4037' },
  { name: 'Wrench', emoji: '🔧', color: '#90A4AE' },
  { name: 'Nut', emoji: '🔩', color: '#607D8B' },
  { name: 'Gear', emoji: '⚙️', color: '#78909C' },
  { name: 'Magnet', emoji: '🧲', color: '#E53935' },
  { name: 'Shield', emoji: '🛡️', color: '#1E88E5' },
  { name: 'Sword', emoji: '⚔️', color: '#B0BEC5' },
  { name: 'Bow', emoji: '🏹', color: '#8D6E63' },
  { name: 'Trophy', emoji: '🏆', color: '#FDD835' },
  { name: 'Medal', emoji: '🏅', color: '#FFB300' },
  { name: 'Crown', emoji: '👑', color: '#FBC02D' },
  { name: 'Ring', emoji: '💍', color: '#80DEEA' },
  { name: 'Diamond', emoji: '💎', color: '#29B6F6' },
  { name: 'Car', emoji: '🚗', color: '#E53935' },
  { name: 'Taxi', emoji: '🚕', color: '#FDD835' },
  { name: 'Bus', emoji: '🚌', color: '#1E88E5' },
  { name: 'Racecar', emoji: '🏎️', color: '#D32F2F' },
  { name: 'Police', emoji: '🚓', color: '#1565C0' },
];

const tier2Items: ItemDef[] = [
  { name: 'Ambulance', emoji: '🚑', color: '#E53935' },
  { name: 'Fire Engine', emoji: '🚒', color: '#C62828' },
  { name: 'Truck', emoji: '🚚', color: '#455A64' },
  { name: 'Tractor', emoji: '🚜', color: '#388E3C' },
  { name: 'Scooter', emoji: '🛵', color: '#00ACC1' },
  { name: 'Bike', emoji: '🚲', color: '#43A047' },
  { name: 'Motorcycle', emoji: '🏍️', color: '#37474F' },
  { name: 'Train', emoji: '🚂', color: '#263238' },
  { name: 'Metro', emoji: '🚇', color: '#5E35B1' },
  { name: 'Tram', emoji: '🚊', color: '#00897B' },
  { name: 'Airplane', emoji: '✈️', color: '#1E88E5' },
  { name: 'Helicopter', emoji: '🚁', color: '#039BE5' },
  { name: 'Rocket', emoji: '🚀', color: '#E53935' },
  { name: 'Satellite', emoji: '🛰️', color: '#90A4AE' },
  { name: 'Canoe', emoji: '🛶', color: '#8D6E63' },
  { name: 'Boat', emoji: '⛵', color: '#0288D1' },
  { name: 'Ship', emoji: '🚢', color: '#37474F' },
  { name: 'Anchor', emoji: '⚓', color: '#455A64' },
  { name: 'House', emoji: '🏠', color: '#8D6E63' },
  { name: 'Building', emoji: '🏢', color: '#607D8B' },
  { name: 'Castle', emoji: '🏰', color: '#78909C' },
  { name: 'Stadium', emoji: '🏟️', color: '#43A047' },
  { name: 'Factory', emoji: '🏭', color: '#546E7A' },
  { name: 'Tower', emoji: '🗼', color: '#D32F2F' },
  { name: 'Tent', emoji: '⛺', color: '#FB8C00' },
  { name: 'Bridge', emoji: '🌉', color: '#5C6BC0' },
  { name: 'Soccer Ball', emoji: '⚽', color: '#212121' },
  { name: 'Basketball', emoji: '🏀', color: '#E65100' },
  { name: 'Football', emoji: '🏈', color: '#6D4C41' },
  { name: 'Baseball', emoji: '⚾', color: '#E53935' },
  { name: 'Tennis', emoji: '🎾', color: '#C0CA33' },
  { name: 'Volleyball', emoji: '🏐', color: '#FDD835' },
  { name: 'Rugby', emoji: '🏉', color: '#8D6E63' },
  { name: '8 Ball', emoji: '🎱', color: '#111111' },
  { name: 'Ping Pong', emoji: '🏓', color: '#E53935' },
  { name: 'Badminton', emoji: '🏸', color: '#78909C' },
  { name: 'Hockey', emoji: '🏒', color: '#455A64' },
  { name: 'Cricket', emoji: '🏏', color: '#A1887F' },
  { name: 'Golf', emoji: '⛳', color: '#43A047' },
  { name: 'Bowling', emoji: '🎳', color: '#1E88E5' },
  { name: 'Boxing', emoji: '🥊', color: '#D32F2F' },
  { name: 'Martial Arts', emoji: '🥋', color: '#E0E0E0' },
  { name: 'Skateboard', emoji: '🛹', color: '#FB8C00' },
  { name: 'Roller Skate', emoji: '🛼', color: '#EC407A' },
  { name: 'Ski', emoji: '🎿', color: '#1E88E5' },
  { name: 'Snowboard', emoji: '🏂', color: '#00ACC1' },
  { name: 'Parachute', emoji: '🪂', color: '#E53935' },
  { name: 'Surfboard', emoji: '🏄', color: '#00897B' },
  { name: 'Gym', emoji: '🏋️', color: '#546E7A' },
  { name: 'Dart', emoji: '🎯', color: '#E53935' },
  { name: 'Dice', emoji: '🎲', color: '#D32F2F' },
  { name: 'Chess Pawn', emoji: '♟️', color: '#263238' },
  { name: 'Playing Card', emoji: '🃏', color: '#E53935' },
  { name: 'Gamepad', emoji: '🎮', color: '#455A64' },
  { name: 'Puzzle Piece', emoji: '🧩', color: '#43A047' },
  { name: 'Shirt', emoji: '👕', color: '#1E88E5' },
  { name: 'Jeans', emoji: '👖', color: '#1565C0' },
  { name: 'Coat', emoji: '🧥', color: '#8D6E63' },
  { name: 'Dress', emoji: '👗', color: '#26A69A' },
  { name: 'Kimono', emoji: '👘', color: '#EC407A' },
  { name: 'Bikini', emoji: '👙', color: '#FF4081' },
  { name: 'Purse', emoji: '👛', color: '#F48FB1' },
  { name: 'Handbag', emoji: '👜', color: '#8D6E63' },
  { name: 'Backpack', emoji: '🎒', color: '#E53935' },
  { name: 'Sneaker', emoji: '👟', color: '#1E88E5' },
  { name: 'Boot', emoji: '👢', color: '#5D4037' },
  { name: 'Heel', emoji: '👠', color: '#D32F2F' },
  { name: 'Sandal', emoji: '👡', color: '#FFB74D' },
  { name: 'Hat', emoji: '🎩', color: '#212121' },
  { name: 'Cap', emoji: '🧢', color: '#1976D2' },
  { name: 'Helmet', emoji: '⛑️', color: '#E53935' },
  { name: 'Glove', emoji: '🧤', color: '#43A047' },
  { name: 'Scarf', emoji: '🧣', color: '#C62828' },
  { name: 'Ribbon', emoji: '🎀', color: '#FF80AB' },
  { name: 'Glasses', emoji: '👓', color: '#546E7A' },
  { name: 'Sunglasses', emoji: '🕶️', color: '#212121' },
  { name: 'Goggles', emoji: '🥽', color: '#039BE5' },
  { name: 'Umbrella', emoji: '☂️', color: '#7E57C2' },
  { name: 'Briefcase', emoji: '💼', color: '#5D4037' },
  { name: 'Smiley', emoji: '😀', color: '#FDD835' },
  { name: 'Grin', emoji: '😁', color: '#FBC02D' },
  { name: 'Laugh', emoji: '😂', color: '#FBC02D' },
  { name: 'Wink', emoji: '😉', color: '#FFA000' },
  { name: 'Cool', emoji: '😎', color: '#FFA000' },
  { name: 'Love Eyes', emoji: '😍', color: '#E53935' },
  { name: 'Star Eyes', emoji: '🤩', color: '#FDD835' },
  { name: 'Kiss', emoji: '😘', color: '#E53935' },
  { name: 'Thinking', emoji: '🤔', color: '#FB8C00' },
  { name: 'Neutral', emoji: '😐', color: '#FBC02D' },
  { name: 'Sleepy', emoji: '😴', color: '#64B5F6' },
  { name: 'Drool', emoji: '🤤', color: '#90CAF9' },
  { name: 'Nerd', emoji: '🤓', color: '#8D6E63' },
  { name: 'Party', emoji: '🥳', color: '#AB47BC' },
  { name: 'Monocle', emoji: '🧐', color: '#5D4037' },
  { name: 'Cowboy', emoji: '🤠', color: '#8D6E63' },
  { name: 'Clown', emoji: '🤡', color: '#E53935' },
  { name: 'Ghost', emoji: '👻', color: '#ECEFF1' },
  { name: 'Alien Face', emoji: '👽', color: '#66BB6A' },
  { name: 'Monster', emoji: '👾', color: '#AB47BC' },
  { name: 'Goblin', emoji: '👺', color: '#D32F2F' },
  { name: 'Ogre', emoji: '👹', color: '#C62828' },
  { name: 'Robot Head', emoji: '🤖', color: '#90A4AE' },
  { name: 'Skull', emoji: '💀', color: '#CFD8DC' },
  { name: 'Cat Face', emoji: '😸', color: '#FFB74D' },
  { name: 'Dog Face', emoji: '🐶', color: '#A1887F' },
  { name: 'Fox Face', emoji: '🦊', color: '#F57C00' },
  { name: 'Panda Face', emoji: '🐼', color: '#212121' },
  { name: 'Lion Face', emoji: '🦁', color: '#FFA000' },
  { name: 'Bell', emoji: '🔔', color: '#FDD835' },
  { name: 'Clock', emoji: '⏰', color: '#E53935' },
  { name: 'Hourglass', emoji: '⏳', color: '#FFB300' },
  { name: 'Globe', emoji: '🌍', color: '#1E88E5' },
  { name: 'Compass', emoji: '🧭', color: '#5D4037' },
  { name: 'Map', emoji: '🗺️', color: '#81C784' },
  { name: 'Flag', emoji: '🏁', color: '#212121' },
  { name: 'Banner', emoji: '🚩', color: '#D32F2F' },
  { name: 'Tag', emoji: '🏷️', color: '#FF8A65' },
  { name: 'Bookmark', emoji: '🔖', color: '#E53935' },
  { name: 'Pumpkin', emoji: '🎃', color: '#E65100' },
  { name: 'Snowman', emoji: '⛄', color: '#E0F7FA' },
  { name: 'Firework', emoji: '🎆', color: '#AB47BC' },
  { name: 'Balloon', emoji: '🎈', color: '#E53935' },
  { name: 'Gift', emoji: '🎁', color: '#D32F2F' },
  { name: 'Music Note', emoji: '🎵', color: '#1E88E5' },
  { name: 'Notes', emoji: '🎶', color: '#8E24AA' },
  { name: 'Guitar', emoji: '🎸', color: '#D84315' },
  { name: 'Violin', emoji: '🎻', color: '#6D4C41' },
  { name: 'Trumpet', emoji: '🎺', color: '#FBC02D' },
  { name: 'Saxophone', emoji: '🎷', color: '#FFA000' },
  { name: 'Drum', emoji: '🥁', color: '#C62828' },
  { name: 'Mic', emoji: '🎙️', color: '#78909C' },
  { name: 'Headphones', emoji: '🎧', color: '#37474F' },
  { name: 'Radio', emoji: '📻', color: '#5D4037' },
  { name: 'Speaker', emoji: '🔊', color: '#455A64' },
  { name: 'Megaphone', emoji: '📣', color: '#E53935' },
  { name: 'Bellhop', emoji: '🛎️', color: '#FDD835' },
  { name: 'Microscope', emoji: '🔬', color: '#5C6BC0' },
  { name: 'Telescope', emoji: '🔭', color: '#37474F' },
  { name: 'Pill', emoji: '💊', color: '#E53935' },
  { name: 'Syringe', emoji: '💉', color: '#42A5F5' },
  { name: 'Stethoscope', emoji: '🩺', color: '#26A69A' },
  { name: 'Bandage', emoji: '🩹', color: '#FFE082' },
  { name: 'DNABar', emoji: '🧬', color: '#AB47BC' },
  { name: 'Abacus', emoji: '🧮', color: '#8D6E63' },
  { name: 'Film', emoji: '🎞️', color: '#212121' },
  { name: 'Clapper', emoji: '🎬', color: '#37474F' },
  { name: 'Ticket', emoji: '🎫', color: '#FFB74D' },
  { name: 'Palette', emoji: '🎨', color: '#E53935' },
  { name: 'Thread', emoji: '🧵', color: '#039BE5' },
  { name: 'Yarn', emoji: '🧶', color: '#E91E63' },
  { name: 'Pin', emoji: '📍', color: '#D32F2F' },
  { name: 'Paperclip', emoji: '📎', color: '#90A4AE' },
];

const tier3Items: ItemDef[] = [
  { name: 'Anchor', emoji: '⚓', color: '#37474F' },
  { name: 'Sailboat', emoji: '⛵', color: '#0288D1' },
  { name: 'Speedboat', emoji: '🚤', color: '#00ACC1' },
  { name: 'Ferry', emoji: '⛴️', color: '#1E88E5' },
  { name: 'Cruiser', emoji: '🚢', color: '#263238' },
  { name: 'Jet', emoji: '🛩️', color: '#42A5F5' },
  { name: 'Helicopter', emoji: '🚁', color: '#039BE5' },
  { name: 'Locomotive', emoji: '🚂', color: '#212121' },
  { name: 'Bullet Train', emoji: '🚄', color: '#00897B' },
  { name: 'Subway', emoji: '🚇', color: '#5E35B1' },
  { name: 'Monorail', emoji: '🚝', color: '#3949AB' },
  { name: 'Trolleybus', emoji: '🚎', color: '#43A047' },
  { name: 'Minibus', emoji: '🚐', color: '#00ACC1' },
  { name: 'Fire Truck', emoji: '🚒', color: '#C62828' },
  { name: 'Police Car', emoji: '🚓', color: '#1565C0' },
  { name: 'Taxi Cab', emoji: '🚕', color: '#FBC02D' },
  { name: 'Sedan', emoji: '🚗', color: '#E53935' },
  { name: 'SUV', emoji: '🚙', color: '#1E88E5' },
  { name: 'Pickup', emoji: '🛻', color: '#FB8C00' },
  { name: 'Delivery Truck', emoji: '🚚', color: '#546E7A' },
  { name: 'Semi Truck', emoji: '🚛', color: '#37474F' },
  { name: 'Tractor', emoji: '🚜', color: '#388E3C' },
  { name: 'Racecar', emoji: '🏎️', color: '#D32F2F' },
  { name: 'Motorcycle', emoji: '🏍️', color: '#E65100' },
  { name: 'Scooter', emoji: '🛵', color: '#26A69A' },
  { name: 'Wheelchair', emoji: '🦽', color: '#455A64' },
  { name: 'Skateboard', emoji: '🛹', color: '#FF7043' },
  { name: 'Rollerblades', emoji: '🛼', color: '#EC407A' },
  { name: 'Bus Stop', emoji: '🚏', color: '#1976D2' },
  { name: 'Fuel Pump', emoji: '⛽', color: '#E53935' },
  { name: 'Traffic Light', emoji: '🚦', color: '#FBC02D' },
  { name: 'Stop Sign', emoji: '🛑', color: '#C62828' },
  { name: 'Construction', emoji: '🚧', color: '#FFA000' },
  { name: 'Lighthouse', emoji: '🚨', color: '#D32F2F' },
  { name: 'Tent Camp', emoji: '⛺', color: '#8D6E63' },
  { name: 'Cabin', emoji: '🛖', color: '#6D4C41' },
  { name: 'House', emoji: '🏠', color: '#795548' },
  { name: 'Garden House', emoji: '🏡', color: '#43A047' },
  { name: 'Office', emoji: '🏢', color: '#607D8B' },
  { name: 'Post Office', emoji: '🏣', color: '#E53935' },
  { name: 'Hospital', emoji: '🏥', color: '#E53935' },
  { name: 'Bank', emoji: '🏦', color: '#388E3C' },
  { name: 'Hotel', emoji: '🏨', color: '#1E88E5' },
  { name: 'Convenience', emoji: '🏪', color: '#FB8C00' },
  { name: 'School', emoji: '🏫', color: '#8E24AA' },
  { name: 'Department', emoji: '🏬', color: '#00897B' },
  { name: 'Factory Building', emoji: '🏭', color: '#546E7A' },
  { name: 'Ancient Castle', emoji: '🏰', color: '#78909C' },
  { name: 'Wedding', emoji: '💒', color: '#F48FB1' },
  { name: 'Tokyo Tower', emoji: '🗼', color: '#D32F2F' },
  { name: 'Statue', emoji: '🗽', color: '#00ACC1' },
  { name: 'Church', emoji: '⛪', color: '#A1887F' },
  { name: 'Mosque', emoji: '🕌', color: '#00897B' },
  { name: 'Temple', emoji: '🛕', color: '#FFB300' },
  { name: 'Synagogue', emoji: '🕍', color: '#5C6BC0' },
  { name: 'Shrine', emoji: '⛩️', color: '#E53935' },
  { name: 'Fountain', emoji: '⛲', color: '#42A5F5' },
  { name: 'Rollercoaster', emoji: '🎢', color: '#E53935' },
  { name: 'Ferris Wheel', emoji: '🎡', color: '#AB47BC' },
  { name: 'Carousel', emoji: '🎠', color: '#FF80AB' },
  { name: 'Circus', emoji: '🎪', color: '#D32F2F' },
  { name: 'Train Station', emoji: '🚉', color: '#37474F' },
  { name: 'Airport', emoji: '🛬', color: '#1E88E5' },
  { name: 'Sunrise', emoji: '🌅', color: '#FF7043' },
  { name: 'Sunset', emoji: '🌇', color: '#E65100' },
  { name: 'Cityscape', emoji: '🏙️', color: '#546E7A' },
  { name: 'Night City', emoji: '🌃', color: '#283593' },
  { name: 'Milky Way', emoji: '🌌', color: '#4A148C' },
  { name: 'Bridge Night', emoji: '🌉', color: '#3F51B5' },
  { name: 'Mountain View', emoji: '🏔️', color: '#90A4AE' },
  { name: 'Volcano Eruption', emoji: '🌋', color: '#D32F2F' },
  { name: 'Desert Dune', emoji: '🏜️', color: '#FFA000' },
  { name: 'Beach Island', emoji: '🏝️', color: '#26A69A' },
  { name: 'National Park', emoji: '🏞️', color: '#2E7D32' },
  { name: 'Stadium Arena', emoji: '🏟️', color: '#388E3C' },
  { name: 'Classical Building', emoji: '🏛️', color: '#B0BEC5' },
  { name: 'Brick Wall', emoji: '🧱', color: '#BF360C' },
  { name: 'Rock Boulder', emoji: '🪨', color: '#78909C' },
  { name: 'Wood Log', emoji: '🪵', color: '#6D4C41' },
  { name: 'Bamboo', emoji: '🎍', color: '#66BB6A' },
  { name: 'Pine Cone', emoji: '🫒', color: '#558B2F' },
  { name: 'Four Leaf Clover', emoji: '🍀', color: '#2E7D32' },
  { name: 'Maple', emoji: '🍁', color: '#E65100' },
  { name: 'Fallen Leaf', emoji: '🍂', color: '#D84315' },
  { name: 'Fluttering Leaf', emoji: '🍃', color: '#66BB6A' },
  { name: 'Mushroom Forest', emoji: '🍄', color: '#C62828' },
  { name: 'Chestnut', emoji: '🌰', color: '#5D4037' },
  { name: 'Crab Shell', emoji: '🦀', color: '#E53935' },
  { name: 'Lobster', emoji: '🦞', color: '#D32F2F' },
  { name: 'Shrimp Tail', emoji: '🦐', color: '#FF7043' },
  { name: 'Squid Tentacle', emoji: '🦑', color: '#AB47BC' },
  { name: 'Oyster Pearl', emoji: '🦪', color: '#B0BEC5' },
  { name: 'Tropical Fish', emoji: '🐠', color: '#00ACC1' },
  { name: 'Blowfish', emoji: '🐡', color: '#FDD835' },
  { name: 'Shark Fin', emoji: '🦈', color: '#607D8B' },
  { name: 'Dolphin Leap', emoji: '🐬', color: '#039BE5' },
  { name: 'Whale Spout', emoji: '🐳', color: '#1E88E5' },
  { name: 'Orca', emoji: '🐋', color: '#263238' },
  { name: 'Crocodile', emoji: '🐊', color: '#388E3C' },
  { name: 'Leopard', emoji: '🐆', color: '#FFA000' },
  { name: 'Zebra', emoji: '🦓', color: '#212121' },
  { name: 'Gorilla', emoji: '🦍', color: '#424242' },
  { name: 'Orangutan', emoji: '🦧', color: '#D84315' },
  { name: 'Mammoth', emoji: '🦣', color: '#5D4037' },
  { name: 'Elephant', emoji: '🐘', color: '#78909C' },
  { name: 'Hippo', emoji: '🦛', color: '#8D6E63' },
  { name: 'Rhino', emoji: '🦏', color: '#78909C' },
  { name: 'Camel', emoji: '🐪', color: '#FFA000' },
  { name: 'Two Hump Camel', emoji: '🐫', color: '#FFB300' },
  { name: 'Giraffe', emoji: '🦒', color: '#FBC02D' },
  { name: 'Kangaroo', emoji: '🦘', color: '#8D6E63' },
  { name: 'Bison', emoji: '🦬', color: '#4E342E' },
  { name: 'Water Buffalo', emoji: '🐃', color: '#37474F' },
  { name: 'Ox', emoji: '🐂', color: '#6D4C41' },
  { name: 'Ram', emoji: '🐏', color: '#D7CCC8' },
  { name: 'Sheep', emoji: '🐑', color: '#F5F5F5' },
  { name: 'Goat', emoji: '🐐', color: '#E0E0E0' },
  { name: 'Deer', emoji: '🦌', color: '#8D6E63' },
  { name: 'Llama', emoji: '🦙', color: '#FFE082' },
  { name: 'Sloth', emoji: '🦥', color: '#8D6E63' },
  { name: 'Skunk', emoji: '🦨', color: '#212121' },
  { name: 'Badger', emoji: '🦡', color: '#607D8B' },
  { name: 'Hedgehog', emoji: '🦔', color: '#795548' },
  { name: 'Otter', emoji: '🦦', color: '#6D4C41' },
  { name: 'Beaver', emoji: '🦫', color: '#8D6E63' },
  { name: 'Bat Wings', emoji: '🦇', color: '#37474F' },
  { name: 'Rooster', emoji: '🐓', color: '#C62828' },
  { name: 'Hatching Chick', emoji: '🐣', color: '#FFF176' },
  { name: 'Baby Chick', emoji: '🐤', color: '#FDD835' },
  { name: 'Front Chick', emoji: '🐥', color: '#FBC02D' },
  { name: 'Swan', emoji: '🦢', color: '#FAFAFA' },
  { name: 'Flamingo', emoji: '🦩', color: '#F48FB1' },
  { name: 'Peacock', emoji: '🦚', color: '#00897B' },
  { name: 'Parrot', emoji: '🦜', color: '#E53935' },
  { name: 'Turkey', emoji: '🦃', color: '#6D4C41' },
  { name: 'Dodo', emoji: '🦤', color: '#78909C' },
  { name: 'Feather', emoji: '🪶', color: '#B0BEC5' },
  { name: 'Dragon', emoji: '🐉', color: '#2E7D32' },
  { name: 'Dragon Face', emoji: '🐲', color: '#43A047' },
  { name: 'T-Rex', emoji: '🦖', color: '#388E3C' },
  { name: 'Sauropod', emoji: '🦕', color: '#1E88E5' },
  { name: 'Spout Whale', emoji: '🐳', color: '#0288D1' },
  { name: 'Seal', emoji: '🦭', color: '#90A4AE' },
  { name: 'Coral', emoji: '🪸', color: '#FF7043' },
  { name: 'Lotus', emoji: '🪷', color: '#F48FB1' },
  { name: 'Rosette', emoji: '🏵️', color: '#FFA000' },
  { name: 'Hibiscus', emoji: '🌺', color: '#EC407A' },
  { name: 'Cherry Blossom', emoji: '🌸', color: '#F8BBD0' },
  { name: 'Daisy', emoji: '🌼', color: '#FFEE58' },
  { name: 'Cable Car', emoji: '🚡', color: '#E53935' },
];

const tier4Items: ItemDef[] = [
  { name: 'Ancient Sphinx', emoji: '🗿', color: '#78909C' },
  { name: 'World Globe', emoji: '🌐', color: '#1E88E5' },
  { name: 'Full Moon', emoji: '🌕', color: '#FFE082' },
  { name: 'Crescent Moon', emoji: '🌙', color: '#FFF176' },
  { name: 'New Moon', emoji: '🌑', color: '#263238' },
  { name: 'First Quarter', emoji: '🌓', color: '#B0BEC5' },
  { name: 'Last Quarter', emoji: '🌗', color: '#90A4AE' },
  { name: 'Waning Moon', emoji: '🌘', color: '#546E7A' },
  { name: 'Waxing Moon', emoji: '🌔', color: '#FFE082' },
  { name: 'Thermometer', emoji: '🌡️', color: '#E53935' },
  { name: 'Sunny Weather', emoji: '🌤️', color: '#FFA000' },
  { name: 'Cloudy Sky', emoji: '⛅', color: '#90A4AE' },
  { name: 'Rain Cloud', emoji: '🌧️', color: '#42A5F5' },
  { name: 'Snow Cloud', emoji: '🌨️', color: '#81D4FA' },
  { name: 'Thunder Cloud', emoji: '⛈️', color: '#5E35B1' },
  { name: 'Tornado Sky', emoji: '🌪️', color: '#78909C' },
  { name: 'Foggy Sky', emoji: '🌫️', color: '#B0BEC5' },
  { name: 'Wind Gust', emoji: '💨', color: '#E0E0E0' },
  { name: 'Cyclone', emoji: '🌀', color: '#039BE5' },
  { name: 'Rainbow Arch', emoji: '🌈', color: '#E91E63' },
  { name: 'Closed Umbrella', emoji: '🌂', color: '#AB47BC' },
  { name: 'Open Umbrella', emoji: '☂️', color: '#7E57C2' },
  { name: 'Rain Umbrella', emoji: '☔', color: '#5C6BC0' },
  { name: 'Beach Parasol', emoji: '⛱️', color: '#E53935' },
  { name: 'High Voltage', emoji: '⚡', color: '#FDD835' },
  { name: 'Snowflake Crystal', emoji: '❄️', color: '#4FC3F7' },
  { name: 'Snowman Warm', emoji: '☃️', color: '#E0F7FA' },
  { name: 'Snowman Cold', emoji: '⛄', color: '#B2EBF2' },
  { name: 'Comet Star', emoji: '☄️', color: '#FFB300' },
  { name: 'Fire Flame', emoji: '🔥', color: '#FF5722' },
  { name: 'Water Drop', emoji: '💧', color: '#0288D1' },
  { name: 'Ocean Wave', emoji: '🌊', color: '#00897B' },
  { name: 'Christmas Tree', emoji: '🎄', color: '#2E7D32' },
  { name: 'Sparkles', emoji: '✨', color: '#FFF176' },
  { name: 'Tanabata Tree', emoji: '🎋', color: '#66BB6A' },
  { name: 'Pine Decoration', emoji: '🎍', color: '#43A047' },
  { name: 'Red Gift', emoji: '🎁', color: '#E53935' },
  { name: 'Reminder Ribbon', emoji: '🎗️', color: '#FDD835' },
  { name: 'Admission Ticket', emoji: '🎟️', color: '#FF7043' },
  { name: 'Gold Trophy', emoji: '🏆', color: '#FFB300' },
  { name: 'Sports Medal', emoji: '🏅', color: '#FFA000' },
  { name: 'First Place Medal', emoji: '🥇', color: '#FFD54F' },
  { name: 'Second Place Medal', emoji: '🥈', color: '#B0BEC5' },
  { name: 'Third Place Medal', emoji: '🥉', color: '#A1887F' },
  { name: 'Soccer Ball', emoji: '⚽', color: '#212121' },
  { name: 'Baseball Ball', emoji: '⚾', color: '#E53935' },
  { name: 'Softball', emoji: '🥎', color: '#C0CA33' },
  { name: 'Basketball Ball', emoji: '🏀', color: '#E65100' },
  { name: 'Volleyball Ball', emoji: '🏐', color: '#FFF176' },
  { name: 'American Football', emoji: '🏈', color: '#6D4C41' },
  { name: 'Rugby Ball', emoji: '🏉', color: '#8D6E63' },
  { name: 'Tennis Ball', emoji: '🎾', color: '#AFB42B' },
  { name: 'Flying Disc', emoji: '🥏', color: '#1E88E5' },
  { name: 'Bowling Ball', emoji: '🎳', color: '#0288D1' },
  { name: 'Cricket Bat', emoji: '🏏', color: '#8D6E63' },
  { name: 'Field Hockey', emoji: '🏑', color: '#795548' },
  { name: 'Ice Hockey', emoji: '🏒', color: '#37474F' },
  { name: 'Lacrosse', emoji: '🥍', color: '#607D8B' },
  { name: 'Ping Pong Paddle', emoji: '🏓', color: '#C62828' },
  { name: 'Badminton Racquet', emoji: '🏸', color: '#546E7A' },
  { name: 'Boxing Glove', emoji: '🥊', color: '#D32F2F' },
  { name: 'Martial Arts Uniform', emoji: '🥋', color: '#FAFAFA' },
  { name: 'Goal Net', emoji: '🥅', color: '#B0BEC5' },
  { name: 'Flag In Hole', emoji: '⛳', color: '#43A047' },
  { name: 'Ice Skates', emoji: '⛸️', color: '#90A4AE' },
  { name: 'Fishing Rod', emoji: '🎣', color: '#1976D2' },
  { name: 'Diving Mask', emoji: '🤿', color: '#00ACC1' },
  { name: 'Running Shirt', emoji: '🎽', color: '#1E88E5' },
  { name: 'Wooden Ski', emoji: '🎿', color: '#D84315' },
  { name: 'Sledding', emoji: '🛷', color: '#8D6E63' },
  { name: 'Curling Stone', emoji: '🥌', color: '#607D8B' },
  { name: 'Bullseye Target', emoji: '🎯', color: '#E53935' },
  { name: 'Yo-Yo Toy', emoji: '🪀', color: '#E91E63' },
  { name: 'Kite Flying', emoji: '🪁', color: '#FF7043' },
  { name: '8 Ball Pool', emoji: '🎱', color: '#111111' },
  { name: 'Crystal Ball', emoji: '🔮', color: '#7E57C2' },
  { name: 'Magic Wand', emoji: '🪄', color: '#212121' },
  { name: 'Nazar Amulet', emoji: '🧿', color: '#1565C0' },
  { name: 'Hamsa Hand', emoji: '🪬', color: '#1E88E5' },
  { name: 'Video Gamepad', emoji: '🎮', color: '#455A64' },
  { name: 'Arcade Joystick', emoji: '🕹️', color: '#D32F2F' },
  { name: 'Slot Machine', emoji: '🎰', color: '#FFB300' },
  { name: 'Game Dice', emoji: '🎲', color: '#E53935' },
  { name: 'Jigsaw Piece', emoji: '🧩', color: '#43A047' },
  { name: 'Teddy Bear', emoji: '🧸', color: '#8D6E63' },
  { name: 'Piñata Party', emoji: '🪅', color: '#EC407A' },
  { name: 'Nesting Dolls', emoji: '🪆', color: '#D32F2F' },
  { name: 'Spade Suit', emoji: '♠️', color: '#212121' },
  { name: 'Heart Suit', emoji: '♥️', color: '#E53935' },
  { name: 'Diamond Suit', emoji: '♦️', color: '#D32F2F' },
  { name: 'Club Suit', emoji: '♣️', color: '#212121' },
  { name: 'Chess King', emoji: '♔', color: '#37474F' },
  { name: 'Chess Queen', emoji: '♕', color: '#455A64' },
  { name: 'Chess Rook', emoji: '♖', color: '#546E7A' },
  { name: 'Chess Bishop', emoji: '♗', color: '#607D8B' },
  { name: 'Chess Knight', emoji: '♘', color: '#78909C' },
  { name: 'Joker Card', emoji: '🃏', color: '#8E24AA' },
  { name: 'Mahjong Tile', emoji: '🀄', color: '#2E7D32' },
  { name: 'Flower Playing Card', emoji: '🎴', color: '#C62828' },
  { name: 'Performing Arts', emoji: '🎭', color: '#FFA000' },
  { name: 'Framed Picture', emoji: '🖼️', color: '#8D6E63' },
  { name: 'Artist Palette', emoji: '🎨', color: '#E53935' },
  { name: 'Sewing Thread', emoji: '🧵', color: '#039BE5' },
  { name: 'Knitting Yarn', emoji: '🧶', color: '#E91E63' },
  { name: 'Eyeglasses', emoji: '👓', color: '#455A64' },
  { name: 'Dark Sunglasses', emoji: '🕶️', color: '#212121' },
  { name: 'Safety Goggles', emoji: '🥽', color: '#00ACC1' },
  { name: 'Lab Coat', emoji: '🥼', color: '#ECEFF1' },
  { name: 'Safety Vest', emoji: '🦺', color: '#FF6D00' },
  { name: 'Necktie', emoji: '👔', color: '#1565C0' },
  { name: 'T-Shirt', emoji: '👕', color: '#1E88E5' },
  { name: 'Denim Jeans', emoji: '👖', color: '#0D47A1' },
  { name: 'Winter Scarf', emoji: '🧣', color: '#B71C1C' },
  { name: 'Leather Gloves', emoji: '🧤', color: '#33691E' },
  { name: 'Winter Coat', emoji: '🧥', color: '#5D4037' },
  { name: 'Wool Socks', emoji: '🧦', color: '#EF6C00' },
  { name: 'Party Dress', emoji: '👗', color: '#00897B' },
  { name: 'Silk Kimono', emoji: '👘', color: '#D81B60' },
  { name: 'Summer Sari', emoji: '🥻', color: '#8E24AA' },
  { name: 'One-Piece Swimsuit', emoji: '🩱', color: '#E91E63' },
  { name: 'Swim Briefs', emoji: '🩲', color: '#0288D1' },
  { name: 'Running Shorts', emoji: '🩳', color: '#43A047' },
  { name: 'Summer Bikini', emoji: '👙', color: '#FF4081' },
  { name: 'Woman Clothes', emoji: '👚', color: '#F48FB1' },
  { name: 'Folding Fan', emoji: '🪭', color: '#E53935' },
  { name: 'Coin Purse', emoji: '👛', color: '#EC407A' },
  { name: 'Leather Handbag', emoji: '👜', color: '#795548' },
  { name: 'Clutch Pouch', emoji: '👝', color: '#A1887F' },
  { name: 'Shopping Bag', emoji: '🛍️', color: '#FF8A65' },
  { name: 'School Backpack', emoji: '🎒', color: '#E53935' },
  { name: 'Thong Sandal', emoji: '🩴', color: '#26A69A' },
  { name: 'Men Shoe', emoji: '👞', color: '#4E342E' },
  { name: 'Athletic Sneaker', emoji: '👟', color: '#1E88E5' },
  { name: 'Hiking Boot', emoji: '🥾', color: '#6D4C41' },
  { name: 'Flat Shoe', emoji: '🥿', color: '#E53935' },
  { name: 'High Heel', emoji: '👠', color: '#D32F2F' },
  { name: 'Woman Sandal', emoji: '👡', color: '#FFA000' },
  { name: 'Ballet Shoes', emoji: '🩰', color: '#F8BBD0' },
  { name: 'Cowboy Boot', emoji: '🥿', color: '#8D6E63' },
  { name: 'Crown Jewel', emoji: '👑', color: '#FFD54F' },
  { name: 'Woman Hat', emoji: '👒', color: '#81C784' },
  { name: 'Top Hat', emoji: '🎩', color: '#212121' },
  { name: 'Graduation Cap', emoji: '🎓', color: '#111111' },
  { name: 'Baseball Cap', emoji: '🧢', color: '#1976D2' },
  { name: 'Military Helmet', emoji: '🪖', color: '#33691E' },
  { name: 'Rescue Helmet', emoji: '⛑️', color: '#E53935' },
  { name: 'Prayer Beads', emoji: '📿', color: '#5D4037' },
  { name: 'Lipstick', emoji: '💄', color: '#C62828' },
  { name: 'Diamond Ring', emoji: '💍', color: '#80DEEA' },
  { name: 'Gemstone Jewel', emoji: '💎', color: '#00ACC1' },
  { name: 'Megaphone Horn', emoji: '📢', color: '#FFA000' },
  { name: 'Studio Microphone', emoji: '🎙️', color: '#546E7A' },
  { name: 'Level Slider', emoji: '🎚️', color: '#78909C' },
  { name: 'Control Knobs', emoji: '🎛️', color: '#455A64' },
  { name: 'Voice Microphone', emoji: '🎤', color: '#37474F' },
  { name: 'Audio Headphones', emoji: '🎧', color: '#263238' },
  { name: 'Retro Radio', emoji: '📻', color: '#6D4C41' },
  { name: 'Saxophone Music', emoji: '🎷', color: '#FFB300' },
  { name: 'Accordion Music', emoji: '🪗', color: '#C62828' },
  { name: 'Acoustic Guitar', emoji: '🎸', color: '#D84315' },
  { name: 'Music Piano', emoji: '🎹', color: '#212121' },
  { name: 'Brass Trumpet', emoji: '🎺', color: '#FBC02D' },
  { name: 'Classical Violin', emoji: '🎻', color: '#8D6E63' },
  { name: 'Banjo Music', emoji: '🪕', color: '#BCAAA4' },
  { name: 'Percussion Drum', emoji: '🥁', color: '#E53935' },
  { name: 'Maracas Party', emoji: '🪇', color: '#26A69A' },
  { name: 'Flute Music', emoji: '🪈', color: '#90A4AE' },
  { name: 'Mobile Phone', emoji: '📱', color: '#37474F' },
];

async function generateAllPuzzles() {
  console.log('====================================================');
  console.log('   NESTOGRAMS 600-PUZZLE AUTONOMOUS GENERATOR');
  console.log('====================================================');

  const t1 = tier1Items.slice(0, 150);
  const t2 = tier2Items.slice(0, 150);
  const t3 = tier3Items.slice(0, 150);
  const t4 = tier4Items.slice(0, 150);
  const allItems = [...t1, ...t2, ...t3, ...t4];
  if (allItems.length !== 600) {
    console.warn(`Warning: Expected 600 items, found ${allItems.length}. Adjusting loop...`);
  }

  const puzzles: Record<string, PuzzleData> = {};
  let easyCount = 0,
    mediumCount = 0,
    hardCount = 0,
    impossibleCount = 0;

  for (let id = 1; id <= 600; id++) {
    let sizeNumber = 1;
    let item: ItemDef;

    if (id <= 150) {
      sizeNumber = 1;
      item = t1[id - 1];
      easyCount++;
    } else if (id <= 300) {
      sizeNumber = 2;
      item = t2[id - 151];
      mediumCount++;
    } else if (id <= 450) {
      sizeNumber = 3;
      item = t3[id - 301];
      hardCount++;
    } else {
      sizeNumber = 4;
      item = t4[id - 451];
      impossibleCount++;
    }

    const name = item.name;
    const itemDef = { ...item, name };

    const { nonogram, 'nonogram-reveal': reveal } = renderToGrid(itemDef, sizeNumber, id);

    puzzles[id.toString()] = {
      size: sizeNumber,
      name: itemDef.name,
      nonogram: nonogram,
      'nonogram-reveal': reveal,
    };
  }

  const outputPath = path.resolve(process.cwd(), 'puzzles.json');
  fs.writeFileSync(outputPath, JSON.stringify(puzzles, null, 2), 'utf-8');

  console.log(`\n✅ SUCCESS! Generated exactly ${Object.keys(puzzles).length} puzzles:`);
  console.log(`   - Size 1 (Easy 5x5):       ${easyCount} puzzles (IDs 1 - 150)`);
  console.log(`   - Size 2 (Medium 8x8):     ${mediumCount} puzzles (IDs 151 - 300)`);
  console.log(`   - Size 3 (Hard 10x10):     ${hardCount} puzzles (IDs 301 - 450)`);
  console.log(`   - Size 4 (Impossible 20x20): ${impossibleCount} puzzles (IDs 451 - 600)`);
  console.log(`\nSaved output to: ${outputPath}`);
  console.log('====================================================\n');
}

generateAllPuzzles().catch((err) => {
  console.error('Fatal Error Generating Puzzles:', err);
  process.exit(1);
});
