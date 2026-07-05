export interface WaveCell {
  row: number;
  col: number;
  step: number;
  delayMs: number;
}

export function getManhattanWaveSequence(rows: number, cols: number): WaveCell[][] {
  const waves: WaveCell[][] = [];
  const maxStep = rows - 1 + (cols - 1);

  for (let s = 0; s <= maxStep; s++) {
    waves[s] = [];
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const step = r + c;
      waves[step].push({
        row: r,
        col: c,
        step,
        delayMs: step * 200,
      });
    }
  }

  return waves;
}

export function getCellRevealDelayMs(row: number, col: number): number {
  return (row + col) * 200;
}

export function getTotalRevealDurationMs(
  rows: number,
  cols: number,
  popPulseDurationMs = 600
): number {
  const maxStep = Math.max(0, rows - 1 + (cols - 1));
  return maxStep * 200 + popPulseDurationMs;
}

export interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  alpha: number;
}

export function spawnConfettiBurst(width: number, height: number): ConfettiParticle[] {
  const particles: ConfettiParticle[] = [];
  const colors = [
    '#f44336',
    '#e91e63',
    '#9c27b0',
    '#3f51b5',
    '#2196f3',
    '#00bcd4',
    '#4caf50',
    '#ffeb3b',
    '#ff9800',
  ];

  // Left cannon
  for (let i = 0; i < 50; i++) {
    const angle = (Math.PI / 180) * (Math.random() * 35 + 45); // 45 to 80 deg up-right
    const speed = Math.random() * 14 + 10;
    particles.push({
      x: 0,
      y: height * 0.8,
      vx: Math.cos(angle) * speed,
      vy: -Math.sin(angle) * speed,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
      alpha: 1.0,
    });
  }

  // Right cannon
  for (let i = 0; i < 50; i++) {
    const angle = (Math.PI / 180) * (Math.random() * 35 + 100); // 100 to 135 deg up-left
    const speed = Math.random() * 14 + 10;
    particles.push({
      x: width,
      y: height * 0.8,
      vx: Math.cos(angle) * speed,
      vy: -Math.sin(angle) * speed,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
      alpha: 1.0,
    });
  }

  return particles;
}

export function updateConfettiParticles(
  particles: ConfettiParticle[],
  gravity = 0.4
): ConfettiParticle[] {
  const active: ConfettiParticle[] = [];
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += gravity;
    p.rotation += p.rotationSpeed;
    p.alpha -= 0.008;

    if (p.alpha > 0 && p.y < 3000) {
      active.push(p);
    }
  }
  return active;
}
