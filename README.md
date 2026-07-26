# scan2order — QR Menu per ristoranti

**I clienti inquadrano il QR sul tavolo e ordinano dal telefono. Zero carta, zero app.**

Piatti con foto, calorie e allergeni. Extra e note per ogni ordine. Le comande arrivano in tempo reale in cucina e al cameriere. Tutto gratis, open source.

```
Cliente → QR → Menu → Ordine → Cameriere conferma → Cucina prepara → Servito
```

## Demo live

**Menu:** https://scan2order-alpha.vercel.app
**Staff:** https://scan2order-alpha.vercel.app/staff/login

| Ruolo | Email | Password |
|---|---|---|
| Admin | `admin@demo.it` | `demo1234` |
| Cameriere | `cameriere@demo.it` | `demo1234` |
| Cucina | `cucina@demo.it` | `demo1234` |

## Setup in 2 minuti

```bash
git clone https://github.com/Gabriele06-local/scan2order.git
cd qr-menu
node scripts/setup.mjs   # ← ti guida passo passo
pnpm run dev
```

> Serve solo un progetto Supabase gratuito (lo crei in 1 minuto su supabase.com).

## Perché esiste

I menu cartacei costano, si sporcano, e vanno ristampati ogni volta che cambi un prezzo. Scan2order è gratuito, si aggiorna in tempo reale dall'admin (prezzi, foto, extra, orari), e funziona su qualsiasi telefono senza installare nulla.

## Per chi è

- **Ristoratori, pizzaioli, bar** — nessun canone mensile, niente abbonamento
- **Sviluppatori** — stack moderno (Astro + Svelte + Supabase), pronto per self-hosting o deploy su Vercel

---

## Funzionalità

### Cliente

- **Menu digitale** — Categorie, foto, descrizioni, prezzi, calorie, allergeni
- **Extra e note** — Personalizza ogni piatto con modifiche e note
- **Carrello** — Riepilogo prima dell'invio, modifica quantità, rimuovi
- **Orari apertura** — Se il ristorante è chiuso, blocca l'ordine
- **PWA** — Il menu funziona anche con rete lenta o assente
- **Coda offline** — Se non c'è connessione, l'ordine viene accodato e inviato quando si torna online

### Staff (cameriere, cucina, admin)

- **Ordina per i tavoli** — Lo staff può aprire il menu e ordinare per conto dei clienti
- **Tutti i dettagli** — Ogni card ordine mostra i piatti con quantità, extra e note
- **Notifiche smart** — Suono + vibrazione + badge rosso + titolo scheda quando arriva un ordine
- **Realtime** — Le dashboard si aggiornano in tempo reale senza refresh

### Cameriere

- **Conferma ordini** — Vedi chi ha ordinato cosa, conferma o segna come servito
- **Colonne** — Da confermare / Da servire

### Cucina

- **Prepara e pronto** — Gestisci il flusso: confermato → in preparazione → pronto
- **Stampa ordini** — Comanda stampabile con piatti, extra e note

### Admin

- **Ristorante** — Nome, slug URL, orari apertura (editor visuale giorno per giorno)
- **Categorie e Piatti** — CRUD completo, foto, kcal, allergeni, disponibilità
- **Personalizzazioni** — Extra con sovrapprezzo per ogni piatto
- **Tavoli** — Aggiungi, modifica, copia link QR
- **Personale** — Aggiungi membri (admin, cameriere, cucina), cambia ruolo, elimina
- **Statistiche** — Ordini oggi, in attesa, incasso (in tempo reale)
- **Esporta / Importa Menu** — Scarica il menu come JSON o caricalo per sostituirlo
- **Conferma cameriere** — Attiva/disattiva
- **Storico ordini** — Mostra/nascondi ai clienti

---

## Stack

| Cosa | Perché |
|---|---|
| **Astro 4** | Framework web veloce, render lato server (SSR/SSG), supporto multi-framework |
| **Svelte 5** | Componenti interattivi lato client, reattività nativa ($state, $derived), bundle piccoli |
| **Tailwind CSS 3** | Utility-first CSS, design responsive senza scrivere CSS custom |
| **Supabase** | Backend completo: database PostgreSQL, autenticazione, RLS, Realtime, API REST |
| **Vercel** | Hosting serverless, deploy automatico da GitHub, CDN globale, gratis |
| **pnpm** | Package manager veloce e a prova di errore |
| **Vitest** | Test unitari veloci, compatibile con Vite |
| **Playwright** | Test E2E (end-to-end) per simulare l'utente reale |

### Perché Supabase e non un backend custom?

- Zero gestione server — database, auth e API in un colpo solo
- RLS (Row Level Security) — ogni riga del database ha una policy che dice chi può leggerla/modificarla
- Realtime — gli ordini arrivano in cucina e al cameriere in tempo reale senza WebSocket custom
- Servizio cloud hosted, backup automatici, scalabilità orizzontale

### Perché Svelte 5 e non React?

- Bundle molto più piccoli (l'admin dashboard pesa ~19KB, Supabase SDK ~213KB)
- Meno boilerplate — la reattività è nativa, non servono hook o dipendenze
- Performance migliori al primo caricamento e negli aggiornamenti

---

## Architettura

```
qr-menu/
├── src/
│   ├── components/
│   │   ├── astro/              # Componenti renderizzati lato server
│   │   │   └── Layout.astro     # HTML base, head, header, favicon
│   │   └── svelte/             # Componenti interattivi (client JavaScript)
│   │       ├── Cart.svelte          # Menu cliente + carrello + invio ordine
│   │       ├── Clock.svelte         # Orologio in tempo reale nelle dashboard
│   │       ├── WaiterDashboard.svelte # Dashboard cameriere (conferma/servi)
│   │       ├── KitchenDashboard.svelte # Dashboard cucina (prepara/pronto/stampa)
│   │       ├── AdminDashboard.svelte   # CRUD ristorante, piatti, tavoli, extra
│   │       ├── StaffManager.svelte    # Gestione staff (invita, ruoli, elimina)
│   │       ├── StatsBar.svelte        # Statistiche realtime (oggi, in attesa, incasso)
│   │       ├── StaffLogin.svelte      # Pagina di login staff
│   │       ├── OrderCard.svelte       # Card ordine riutilizzabile
│   │       └── LogoutButton.svelte    # Pulsante logout
│   ├── lib/
│   │   ├── supabase.ts          # Client Supabase (anon key)
│   │   ├── admin.server.ts      # Client Supabase admin (service_role key, solo server)
│   │   ├── orders.ts            # Funzioni createOrder, transitionOrderStatus, etc.
│   │   ├── cache.ts             # Cache lato client per il menu
│   │   └── types.ts             # TypeScript types
│   ├── pages/
│   │   ├── index.astro          # Root — redirect automatico al primo ristorante
│   │   ├── [tenant]/index.astro # Pagina menu cliente (dinamica per slug)
│   │   ├── staff/
│   │   │   ├── login.astro      # Login staff
│   │   │   ├── admin.astro      # Dashboard admin
│   │   │   ├── cameriere.astro  # Dashboard cameriere
│   │   │   └── cucina.astro     # Dashboard cucina
│   │   └── api/
│   │       └── staff.ts         # API per gestione staff (server-only)
│   └── styles/
│       └── global.css           # Tailwind base + font
├── supabase/
│   ├── setup.sql                # SCHEMA COMPLETO: tabelle, RLS, funzioni, seed
│   ├── migrations/
│   │   └── 00001_schema.sql     # Migration file (stessa roba, formato migration)
│   └── seed.sql                 # Seed dati di esempio (ridondante, usare setup.sql)
├── scripts/
│   └── fix-node-version.mjs     # Post-build script per runtime Node 22 su Vercel
├── tests/
│   ├── unit/
│   │   └── order-state.test.ts  # 12 test sulla macchina a stati degli ordini
│   └── e2e/
│       └── full-flow.spec.ts    # Test E2E con Playwright (scaffold)
└── public/
    └── favicon/                 # Favicon e icone (logo QR)
```

### Flusso di un ordine

```
Cliente                      Cameriere                   Cucina
   │                            │                          │
   ├─ Aggiunge piatti ──────────┤                          │
   ├─ Seleziona extra ──────────┤                          │
   ├─ Scrive note ──────────────┤                          │
   ├─ INVIA ORDINE ─────────────┤                          │
   │                            │                          │
   ▼                      ┌─────┴──────┐                   │
   "Inviato"              │  submitted  │                   │
                          └─────┬──────┘                   │
                                │                          │
                    ┌───────────┴───────────┐              │
                    │ (se conferma          │              │
                    │  cameriere attiva)    │              │
                    ▼                       ▼              │
           "Da confermare"          "Confermato"           │
           pending_waiter_review      confirmed            │
                    │                       │              │
                    └───────┬───────────────┘              │
                            │                              │
                            └──────────┬───────────────────┘
                                       │
                                       ▼
                                "In preparazione"
                                  in_kitchen
                                       │
                                       ▼
                                     "Pronto"
                                      ready
                                       │
                                       ▼
                                    "Servito"
                                     served
```

---

## Database

### Tabelle principali

| Tabella | Descrizione |
|---|---|
| `tenants` | Ristoranti (nome, slug, orari, conferma cameriere, mostra storico) |
| `tables` | Tavoli (label, qr_token univoco) |
| `staff` | Membri dello staff (auth_user_id, ruolo) con vincolo unico (tenant, user) |
| `menu_categories` | Categorie menu (nome, ordine) |
| `menu_items` | Piatti (nome, descrizione, prezzo, foto, kcal, allergeni, disponibile) |
| `item_modifiers` | Extra/modifiche per piatto (nome, sovrapprezzo) |
| `orders` | Ordini (stato, totale, timestamp) |
| `order_items` | Righe ordine (piatto, quantità, note, prezzo unitario) |
| `order_item_modifiers` | Extra selezionati per ogni riga ordine |

### Stati ordine

```
submitted → pending_waiter_review → confirmed → in_kitchen → ready → served
```

Ogni transizione è validata da una funzione PostgreSQL (`transition_order_status`) che controlla:
- Il ruolo di chi richiede la transizione (cameriere, cucina, admin)
- Lo stato attuale dell'ordine
- Se il ristorante richiede la conferma del cameriere

### RLS (Row Level Security)

Tutte le tabelle hanno policy RLS. Esempi:

- **tenants, tables, menu**: lettura pubblica (chiunque può vedere il menu)
- **staff**: ogni utente vede solo il proprio record
- **orders**: il personale vede solo gli ordini del proprio ristorante
- **menu_items, menu_categories, tables**: solo lo staff del ristorante può modificare
- **orders insert**: permesso a tutti (i clienti anonimi possono ordinare)

---

## Setup rapido (2 minuti)

### 1. Prerequisiti

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- Un progetto Supabase (gratuito su [supabase.com](https://supabase.com))

### 2. Setup automatico

```bash
git clone https://github.com/Gabriele06-local/scan2order.git
cd qr-menu
node scripts/setup.mjs
```

Lo script ti chiederà le chiavi del tuo progetto Supabase e farà tutto automaticamente:

1. Crea il file `.env` con le tue chiavi
2. Installa le dipendenze (`pnpm install`)
3. Esegue `setup.sql` sul database
4. Crea 3 account staff demo con password `demo1234`

### 3. Avvia

```bash
pnpm run dev
```

Apri `http://localhost:4321` — vedrai il menu del tuo ristorante dal Tavolo 1.
Vai su `http://localhost:4321/staff/login` per accedere alle dashboard.

### 4. Staff demo

| Ruolo | Email | Password |
|---|---|---|
| Amministrazione | `admin@demo.it` | `demo1234` |
| Cameriere | `cameriere@demo.it` | `demo1234` |
| Cucina | `cucina@demo.it` | `demo1234` |

### Manuale (se preferisci)

1. Crea un progetto su [supabase.com](https://supabase.com)
2. Copia `Project URL`, `anon key` e `service_role key` da **Project Settings → API**
3. Crea il file `.env`:

```env
PUBLIC_SUPABASE_URL=https://xxx.supabase.co
PUBLIC_SUPABASE_KEY=eyJ...    # anon key
PRIVATE_SUPABASE_SERVICE_KEY=eyJ...   # service_role key
```

4. Esegui `supabase/setup.sql` nel **SQL Editor** di Supabase
5. `pnpm install && pnpm run dev`

### 7. Deploy su Vercel

1. Fai il push del codice su GitHub
2. Vai su [vercel.com](https://vercel.com) → **Add New Project**
3. Importa il repository
4. Nelle impostazioni progetto, setta **Node.js Version → 22.x**
5. Aggiungi le 3 **Environment Variables** (PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_KEY, PRIVATE_SUPABASE_SERVICE_KEY)
6. Deploy!

---

## Rotte

| Route | Descrizione | Accesso |
|---|---|---|
| `/` | Redirect automatico al primo ristorante+tavolo | Pubblico |
| `/[slug]?table=[token]` | Menu cliente (es. `/mio-ristorante?table=tavolo-1`) | Pubblico |
| `/staff/login` | Login per personale | Pubblico |
| `/staff/admin` | Dashboard amministrazione | Staff admin |
| `/staff/cameriere` | Dashboard cameriere (conferma/servi) | Staff cameriere |
| `/staff/admin` | Dashboard cucina (prepara/pronto/stampa) | Staff cucina |

---

## Sicurezza

Questo progetto è stato progettato con la sicurezza come priorità.

### Chiavi e segreti

- **anon key** — Pubblica, va nel frontend, può essere esposta. RLS protegge i dati a livello database.
- **service_role key** — Mai esposta al client. Usata solo nelle API route server-side (Astro) e in script di amministrazione.
- **Password** — Memorizzate solo in Supabase Auth (hashate), mai nel codice.

### RLS (Row Level Security)

Ogni tabella ha policy che limitano l'accesso:

- **Lettura pubblica**: solo per menu, tavoli e ristoranti (serve per visualizzare il menu)
- **Scrittura anonima**: solo per creare ordini (chiunque al tavolo deve poter ordinare)
- **Staff**: ogni membro vede/modifica solo i dati del proprio ristorante
- **Admin**: solo gli admin possono gestire lo staff

### API staff

L'endpoint `/api/staff` è protetto:
- Richiede token JWT valido (estratto dall'header Authorization)
- Verifica che l'utente abbia ruolo "admin" nel database
- Usa la service_role key solo lato server per operazioni sensibili (creazione/eliminazione utenti auth)
- Le richieste non autorizzate ricevono 403

### Best practice

- `.env` è in `.gitignore` e non viene mai committato
- Le chiavi su Vercel vanno inserite manualmente nelle Environment Variables
- Rigenera periodicamente le chiavi Supabase se il progetto è pubblico
- Il vincolo `UNIQUE (tenant_id, auth_user_id)` sulla tabella staff previene duplicati

---

## Sviluppo

### Comandi

```bash
pnpm run dev          # Avvia server di sviluppo
pnpm run build        # Build di produzione
pnpm run preview      # Anteprima build locale
pnpm run test         # Test unitari (Vitest)
pnpm run lint         # Lint (ESLint)
pnpm run test:e2e     # Test E2E (Playwright)
node scripts/setup.mjs # Setup automatico Supabase + account demo
```

### Test

```bash
pnpm run test
```

12 test unitari che verificano la macchina a stati degli ordini:
- Transizioni valide e non valide per ogni ruolo
- Conferma cameriere obbligatoria/disabilitata
- Tentativi di accesso non autorizzati

Test E2E (Playwright) disponibili in `tests/e2e/` per testare il flusso completo
(cliente → ordine → cameriere conferma → cucina prepara → cameriere serve).

### Convenzioni di codice

- I componenti Svelte 5 usano `$state`, `$derived`, `$props()` (runes)
- I componenti sono in PascalCase (`Cart.svelte`, `WaiterDashboard.svelte`)
- Le API route sono in kebab-case (`staff.ts`)
- Le variabili di ambiente pubbliche iniziano con `PUBLIC_`
- Le variabili private (server-only) iniziano con `PRIVATE_`

---

## Problemi noti

- **Build locale su Windows**: l'adapter Vercel può fallire per symlink. Non è un problema di codice — fai il deploy direttamente da Vercel o usa WSL.
- **Node.js 24**: l'adapter `@astrojs/vercel@7` non riconosce Node 24 e forza Node 18. Il post-build script `scripts/fix-node-version.mjs` corregge il runtime generato.
- **WebSocket**: Node.js 20+ ha WebSocket nativo. Con Node 18 serve un polyfill (`ws`).

---

## Licenza

Progetto open source. Puoi usarlo, modificarlo e distribuirlo liberamente per uso personale o commerciale.

---

## Contribuire

Trovato un bug? Hai un'idea? Apri una issue su GitHub o fai una pull request.
