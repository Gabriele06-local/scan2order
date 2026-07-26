# QR Menu — Ordina dal tavolo con il tuo smartphone

Sistema di ordinazione via QR code per ristoranti. I clienti inquadrano il QR sul tavolo, visualizzano il menu, personalizzano i piatti con extra e note, e inviano l'ordine direttamente in cucina.

**Stack:** Astro 4 + Svelte 5 + Tailwind CSS + Supabase (PostgreSQL + Auth + Realtime)

## Funzionalità

### Cliente
- Menu digitale con categorie, descrizioni, prezzi, kcal e allergeni
- Foto dei piatti
- Extra / modifiche con sovrapprezzo (es. mozzarella extra)
- Note per ogni piatto (es. "senza cipolla")
- Carrello con riepilogo prima dell'invio
- Storico ordini recenti (attivabile dall'admin)
- Ristorante chiuso → blocca l'ordinazione

### Staff
- **Cameriere:** conferma ordini, segna come servito, dashboard realtime
- **Cucina:** accetta ordini, segna in preparazione/pronto, **stampa ordini**
- **Admin:** gestione completa di menu, orari, tavoli, extra e staff
- Statistiche in tempo reale (ordini oggi, in attesa, incasso)

### Admin
- Rinomina ristorante e slug URL
- Orari apertura giornalieri (editor visuale, fasce orarie multiple)
- Categorie, piatti (CRUD + toggle disponibilità)
- Extra / modifiche per ogni piatto
- Tavoli (aggiungi, modifica, copia link QR)
- Staff (invita, cambia ruolo, elimina)
- Mostra/nascondi storico ordini al cliente
- Conferma cameriere obbligatoria on/off

## Screenshot

_(aggiungi screenshot qui)_

## Requisiti

- Node.js 18+
- pnpm
- Un progetto Supabase (gratuito)

## Setup

### 1. Clona e installa

```bash
git clone <repo>
cd qr-menu
pnpm install
```

### 2. Crea il progetto Supabase

1. Vai su [supabase.com](https://supabase.com) e crea un nuovo progetto
2. Vai in **Project Settings → API** e copia:
   - `Project URL` (es. `https://xxx.supabase.co`)
   - `anon public key`
   - `service_role key` (attenzione: solo lato server)
3. Vai in **Authentication → Settings** e disabilita "Confirm email" (per sviluppo) o configura SMTP
4. Vai in **SQL Editor**, incolla e lancia il contenuto di `supabase/setup.sql`

### 3. Configura .env

```bash
cp .env.example .env
```

Modifica `.env` con i tuoi dati:

```env
PUBLIC_SUPABASE_URL=https://xxx.supabase.co
PUBLIC_SUPABASE_KEY=eyJhbG...  # anon public key
PRIVATE_SUPABASE_SERVICE_KEY=eyJhbG...  # service_role key
```

### 4. Crea gli account staff (demo)

Nel SQL Editor Supabase (o via API), crea gli utenti auth:

| Email | Password | Ruolo |
|---|---|---|
| admin@demo.it | demo1234 | Admin |
| cameriere@demo.it | demo1234 | Cameriere |
| cucina@demo.it | demo1234 | Cucina |

Poi aggiorna gli UUID in `supabase/setup.sql` (sezione 6) con i reali `auth_user_id` generati da Supabase, e riesegui la parte del seed.

In alternativa, usa il comando curl:
```bash
curl -X POST https://<project>.supabase.co/auth/v1/admin/users \
  -H "apikey: <service_role_key>" \
  -H "Authorization: Bearer <service_role_key>" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.it","password":"demo1234","email_confirm":true}'
```

### 5. Avvia

```bash
pnpm run dev
```

Apri `http://localhost:4321` — vedrai il menu demo.

**Staff:** `http://localhost:4321/staff/login`

## Rotte

| Route | Descrizione |
|---|---|
| `/` | Redirect al menu demo |
| `/demo?table=demo-tavolo-1` | Menu cliente |
| `/staff/login` | Login staff |
| `/staff/admin` | Dashboard amministrazione |
| `/staff/cameriere` | Dashboard cameriere |
| `/staff/cucina` | Dashboard cucina |

## Architettura

```
qr-menu/
├── src/
│   ├── components/
│   │   ├── astro/          # Componenti Astro (Layout)
│   │   └── svelte/         # Componenti Svelte 5 interattivi
│   ├── lib/                # Logica condivisa
│   ├── pages/
│   │   ├── [tenant]/       # Pagina menu cliente (dinamica)
│   │   ├── staff/          # Dashboard staff
│   │   └── api/            # Endpoint API
│   └── styles/
├── supabase/
│   ├── setup.sql           # Schema + RLS + Funzioni + Seed (esegui su Supabase)
│   └── migrations/         # Migration file
└── tests/
    └── unit/               # Test unitari (Vitest)
```

## Database

Stato ordini:

```
submitted → pending_waiter_review → confirmed → in_kitchen → ready → served
```

Ogni transizione è validata da un RPC PostgreSQL che controlla il ruolo e lo stato attuale.

## Sicurezza

- **RLS (Row Level Security)** attivo su tutte le tabelle
- API staff protetta: solo utenti con ruolo `admin` possono gestire lo staff
- Service role key usata solo lato server (API route Astro), mai esposta al client
- Le chiavi Supabase vanno nel `.env` (escluso da git)

## Test

```bash
pnpm run test
```

Test unitari per la logica di transizione degli stati ordine.

## Deploy su Vercel

1. `pnpm run build` (controlla che non dia errori)
2. Collega il repo a Vercel
3. Imposta le 3 variabili d'ambiente nel dashboard Vercel
4. Deploy!

Nota: su Windows il build locale può fallire per symlink dell'adapter Vercel — non è un problema di codice, fai il deploy direttamente da Vercel.
