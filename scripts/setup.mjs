#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function ask(query) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(query, (a) => { rl.close(); resolve(a); }));
}

function run(cmd, cwd = root) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

async function main() {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║   QR Menu — Setup                     ║
  ║   Configura Supabase in 2 minuti      ║
  ╚═══════════════════════════════════════╝
  `);

  // 1. Check .env
  const envPath = join(root, '.env');
  let supabaseUrl = '', anonKey = '', serviceKey = '';

  if (existsSync(envPath)) {
    const env = readFileSync(envPath, 'utf-8');
    const get = (k) => { const m = env.match(new RegExp(`^${k}=(.*)`, 'm')); return m ? m[1].trim() : ''; };
    supabaseUrl = get('PUBLIC_SUPABASE_URL');
    anonKey = get('PUBLIC_SUPABASE_KEY');
    serviceKey = get('PRIVATE_SUPABASE_SERVICE_KEY');
    if (supabaseUrl && anonKey && serviceKey) {
      console.log('✓ .env trovato con tutte le chiavi\n');
    }
  }

  if (!supabaseUrl || !serviceKey) {
    console.log('Inserisci i dati del tuo progetto Supabase.\n');
    console.log('(Se non hai un progetto, crealo su https://supabase.com e torna qui)\n');

    if (!supabaseUrl) supabaseUrl = (await ask('SUPABASE URL (es. https://xxx.supabase.co): ')).trim();
    if (!anonKey) anonKey = (await ask('ANON PUBLIC KEY: ')).trim();
    if (!serviceKey) serviceKey = (await ask('SERVICE_ROLE KEY: ')).trim();

    const envContent = [
      `PUBLIC_SUPABASE_URL=${supabaseUrl.replace(/\/+$/, '')}`,
      `PUBLIC_SUPABASE_KEY=${anonKey}`,
      `PRIVATE_SUPABASE_SERVICE_KEY=${serviceKey}`,
    ].join('\n');
    writeFileSync(envPath, envContent + '\n');
    console.log('✓ .env creato\n');
  }

  // 2. Install dependencies
  console.log('Installazione dipendenze...');
  run('pnpm install');

  // 3. Run SQL setup
  console.log('\nEsecuzione setup database...');
  const sqlPath = join(root, 'supabase', 'setup.sql');
  const sql = readFileSync(sqlPath, 'utf-8');

  // Use Supabase REST API to run SQL
  const headers = { 'Content-Type': 'application/json', apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

  try {
    // Query the SQL via Supabase's pg_dump endpoint or REST
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: sql }),
    });

    if (!response.ok) {
      // Fallback: tell user to run manually
      console.log('⚠️  Setup automatico non disponibile via REST.');
      console.log('👉 Esegui manualmente il contenuto di supabase/setup.sql');
      console.log('   nel SQL Editor di Supabase Dashboard.');
      const y = await ask('\nHai eseguito il SQL? (s/N): ');
      if (y.toLowerCase() !== 's') {
        console.log('\nEsegui il SQL e rilancia questo script.');
        process.exit(0);
      }
    } else {
      console.log('✓ Database configurato');
    }
  } catch (e) {
    console.log('⚠️  Errore connessione Supabase.');
    console.log('👉 Esegui manualmente supabase/setup.sql nel SQL Editor.');
    const y = await ask('\nHai eseguito il SQL? (s/N): ');
    if (y.toLowerCase() !== 's') {
      console.log('\nEsegui il SQL e rilancia questo script.');
      process.exit(0);
    }
  }

  // 4. Create demo auth users
  console.log('\nCreazione account demo staff...');
  const demos = [
    { email: 'admin@demo.it', password: 'demo1234', role: 'admin' },
    { email: 'cameriere@demo.it', password: 'demo1234', role: 'cameriere' },
    { email: 'cucina@demo.it', password: 'demo1234', role: 'cucina' },
  ];

  for (const demo of demos) {
    try {
      const res = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email: demo.email, password: demo.password, email_confirm: true }),
      });
      if (res.ok) {
        const user = await res.json();
        // Add staff record
        await fetch(`${supabaseUrl}/rest/v1/staff`, {
          method: 'POST',
          headers: { ...headers, Prefer: 'resolution=merge-duplicates' },
          body: JSON.stringify({
            tenant_id: 'd0000000-0000-0000-0000-000000000001',
            auth_user_id: user.id,
            role: demo.role,
          }),
        });
        console.log(`  ✓ ${demo.email} (${demo.role})`);
      } else {
        const err = await res.json();
        if (err.msg?.includes('already exists')) {
          console.log(`  ○ ${demo.email} — già esistente`);
        } else {
          console.log(`  ✗ ${demo.email}: ${err.msg || res.status}`);
        }
      }
    } catch (e) {
      console.log(`  ✗ ${demo.email}: ${e.message}`);
    }
  }

  // 5. Done
  console.log(`
  ╔═══════════════════════════════════════╗
  ║   Setup completato!                    ║
  ║                                       ║
  ║   pnpm run dev                        ║
  ║   → http://localhost:4321             ║
  ║                                       ║
  ║   Staff login:                        ║
  ║   admin@demo.it / demo1234            ║
  ║   cameriere@demo.it / demo1234        ║
  ║   cucina@demo.it / demo1234           ║
  ╚═══════════════════════════════════════╝
  `);
}

main().catch(console.error);
