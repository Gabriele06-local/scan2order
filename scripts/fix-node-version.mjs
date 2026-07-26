import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const configPath = join(root, '.vercel', 'output', 'config.json');
if (!existsSync(configPath)) {
  console.log('config.json not found, skipping');
  process.exit(0);
}

let config = JSON.parse(readFileSync(configPath, 'utf-8'));

function fixRuntime(obj) {
  if (!obj || typeof obj !== 'object') return;
  if (obj.runtime === 'nodejs18.x') {
    console.log(`Fixing runtime: ${obj.runtime} → nodejs20.x`);
    obj.runtime = 'nodejs20.x';
  }
  for (const val of Object.values(obj)) {
    if (Array.isArray(val)) val.forEach(fixRuntime);
    else fixRuntime(val);
  }
}

fixRuntime(config);
writeFileSync(configPath, JSON.stringify(config, null, 2));
console.log('Done');
