import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outputDir = join(root, '.vercel', 'output');

function fixFile(filePath) {
  if (!existsSync(filePath)) return;
  let content = readFileSync(filePath, 'utf-8');
  if (content.includes('nodejs18.x')) {
    content = content.replace(/nodejs18\.x/g, 'nodejs20.x');
    writeFileSync(filePath, content);
    console.log(`Fixed: ${filePath}`);
  }
}

function walkDir(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walkDir(full);
    } else if (entry === 'config.json' || entry === '.vc-config.json') {
      fixFile(full);
    }
  }
}

walkDir(outputDir);
console.log('Done fixing Node.js version');
