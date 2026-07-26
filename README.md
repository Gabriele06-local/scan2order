# scan2order — QR Menu per ristoranti

**I clienti inquadrano il QR sul tavolo e ordinano dal telefono. Zero carta, zero app.**

Piatti con foto, calorie e allergeni. Extra e note per ogni ordine. Le comande arrivano in tempo reale in cucina e al cameriere. Tutto gratis, open source.

```
Cliente → QR → Menu → Ordine → Cameriere conferma → Cucina prepara → Servito
```

## Demo live

**Menu:** https://scan2order-o6z3vpo9r-gabrieles-projects-e9de886d.vercel.app
**Staff:** https://scan2order-o6z3vpo9r-gabrieles-projects-e9de886d.vercel.app/staff/login

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

### Cliente (il menu digitale)

- **Navigazione per categorie** — Piatti organizzati in sezioni (Antipasti, Primi, Pizze, Bevande...)
- **Dettagli completi** — Nome, descrizione, prezzo, foto, calorie (kcal) e allergeni per ogni piatto
- **Foto dei piatti** — Basta un URL immagine nell'admin e compare direttamente nel menu
- **Extra e modifiche** — Mozzarella extra, aggiunta di ingredienti, scelta della taglia — ogni modifica può avere un sovrapprezzo
- **Note personalizzate** — "Senza cipolla", "Ben cotta", "Olive in più" — ogni piatto nel carrello ha un campo note
- **Carrello intelligente** — Aumenta/diminuisci quantità, rimuovi piatti, vedi il totale sempre aggiornato
- **Riepilogo prima dell'invio** — Il carrello mostra tutti i piatti con quantità, extra selezionati, note, e il totale
- **Conferma di invio** — Dopo l'ordine compare un messaggio di successo, il carrello si svuota, e si può continuare a ordinare
- **Storico ordini** — Se abilitato dall'admin, mostra l'elenco degli ordini precedenti per il tavolo (utile per ricordarsi cosa si è preso)
- **Orari di apertura** — Se il ristorante è chiuso, il menu lo mostra e blocca l'invio di nuovi ordini
- **Stato ordine in tempo reale** — (opzionale) il cliente può vedere se l'ordine è stato preso in carico, in preparazione o pronto

### Cameriere

- **Dashboard in tempo reale** — Gli ordini arrivano istantaneamente senza ricaricare la pagina (Supabase Realtime)
- **Due colonne: da confermare / da servire** — Ordini appena arrivati e ordini pronti da portare al tavolo
- **Conferma ordine** — Se il ristorante ha la conferma cameriere obbligatoria, l'ordine passa da "inviato" a "in attesa di conferma" a "confermato"
- **Servito** — Un click per segnare che l'ordine è stato portato al tavolo

### Cucina

- **Dashboard in tempo reale** — Nuovi ordini confermati compaiono immediatamente
- **Due colonne: nuovi / in preparazione** — Accoda e gestisci il flusso di lavoro
- **Prepara e pronto** — Dal confermato all'in-preparazione al pronto
- **Stampa ordini** — Un pulsante che apre una finestra di stampa ottimizzata per la cucina (comanda chiara, formato carta)

### Admin

- **Tutto in una pagina** — Ristorante, categorie, piatti, extra, tavoli, staff, orari e impostazioni
- **Nome e slug del ristorante** — Il nome appare nel menu cliente, lo slug è l'URL (es. `/mio-ristorante?table=1`)
- **Orari di apertura** — Editor visuale giorno per giorno, fasce orarie multiple (es. pranzo 12:00-15:00, cena 19:00-23:00), attiva/disattiva con un click
- **Categorie** — Aggiungi, modifica, elimina con un click (es. "Pizze", "Bevande", "Dolci")
- **Piatti** — Nome, descrizione, prezzo, foto (URL), kcal, allergeni, disponibile/nascosto
- **Extra / Modifiche** — Associa a ogni piatto degli extra con sovrapprezzo (es. Mozzarella extra +2.00€)
- **Tavoli** — Aggiungi, modifica nome, copia il link QR da stampare
- **Staff** — Invita nuovi membri (admin, cameriere, cucina), cambia ruolo, elimina
- **Statistiche in tempo reale** — Ordini oggi, in attesa, incasso odierno — si aggiornano da soli
- **Mostra/nascondi storico ordini** — Decidi tu se i clienti possono vedere gli ordini passati
- **Conferma cameriere obbligatoria** — Attiva se vuoi che un cameriere riveda l'ordine prima che arrivi in cucina

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
