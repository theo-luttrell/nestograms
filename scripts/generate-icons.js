import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const iconsDir = path.join(__dirname, '../icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Minimal valid 1x1 black PNG hex
const minPngHex = '89504e470d0a1a0a0000000d49484452000000010000000108000000003a7e9b550000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082';
const pngBuffer = Buffer.from(minPngHex, 'hex');

['icon16.png', 'icon32.png', 'icon48.png', 'icon128.png'].forEach((file) => {
  const filePath = path.join(iconsDir, file);
  fs.writeFileSync(filePath, pngBuffer);
  console.log(`Generated placeholder icon: ${file}`);
});
