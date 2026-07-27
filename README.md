# scan2order — QR Menu for Restaurants

**Customers scan the QR code on their table and order from their phone. Zero paper, zero apps.**

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Stack](https://img.shields.io/badge/stack-Astro_Svelte_Supabase-8B5CF6)

Dishes with photos, calories, allergens. Extras and notes per order. Orders arrive in real-time to kitchen and waiters. Free, open source.

```
Customer → QR → Menu → Order → Waiter confirms → Kitchen prepares → Served
```

## Live Demo

**Menu:** https://scan2order-alpha.vercel.app
**Staff:** https://scan2order-alpha.vercel.app/staff/login

| Role | Email | Password |
|---|---|---|
| Admin | `admin@demo.it` | `demo1234` |
| Waiter | `cameriere@demo.it` | `demo1234` |
| Kitchen | `cucina@demo.it` | `demo1234` |

---

## Features

### Customer

- **Digital Menu** — Categories, photos, descriptions, prices, calories, allergens
- **Extras & Notes** — Customize every dish with modifiers (+price) and text notes
- **Cart** — Summary before sending, adjust quantities, remove items
- **Opening Hours** — Blocks ordering when restaurant is closed
- **Order History** — View recent orders (toggle in admin)
- **PWA** — Menu works offline, installable on home screen
- **Offline Queue** — Orders queued locally, sent automatically when back online
- **i18n** — Interface available in Italian and English (auto-detected)

### Staff (waiter, kitchen, admin)

- **Order for Tables** — Staff can open the menu and order on behalf of customers
- **All Details** — Every order card shows items with quantities, extras, and notes
- **Smart Notifications** — Sound + vibration + floating red badge + document title
- **Realtime** — Dashboards update instantly via Supabase Realtime

### Waiter Dashboard

- **Confirm Orders** — See who ordered what, confirm or mark as served
- **Columns** — To confirm / To serve

### Kitchen Dashboard

- **Cook & Ready** — Manage the flow: confirmed → cooking → ready
- **Print Orders** — Opens a browser-optimized print window (items, extras, notes)
  - *⚠️ Does not support ESC/POS thermal printers. For that, you need an additional layer (e.g. a local server with `node-escpos` or a cloud print service).*

### Admin Dashboard

- **Restaurant** — Name, URL slug, opening hours (visual day-by-day editor)
- **Categories & Items** — Full CRUD, dish photo upload (Supabase Storage), kcal, allergens, availability
- **Modifiers** — Extras with surcharge per item
- **Tables** — Add, edit, **download QR code as PNG**, copy QR link
- **Staff** — Invite members (admin, waiter, kitchen), change roles, delete
- **Statistics** — Orders today, pending, revenue (realtime)
- **Export / Import Menu** — Download menu as JSON or upload to replace it
- **Waiter Confirmation** — Toggle on/off
- **Order History** — Show/hide to customers

### Self-Serve Onboarding

- **Create your restaurant** — Visit `/staff/register`, fill in restaurant name, slug, and admin account. No SQL editor needed.
- Automatic setup: creates tenant, menu categories (Antipasti, Primi, Secondi, Dolci) and 4 sample tables.

---

## Stack

| What | Why |
|---|---|
| **Astro 4** | Fast web framework, SSR, multi-framework support |
| **Svelte 5** | Interactive client components, native reactivity ($state, $derived), tiny bundles |
| **Tailwind CSS 3** | Utility-first CSS, responsive design without custom CSS |
| **Supabase** | Full backend: PostgreSQL, Auth, RLS, Realtime, Storage, REST API |
| **Vercel** | Serverless hosting, auto-deploy from GitHub, global CDN, free tier |
| **pnpm** | Fast, disk-efficient package manager |
| **Vitest** | Fast unit tests, Vite-compatible |
| **Playwright** | E2E tests for real user simulation |

### Why Supabase?

- Zero server management — database, auth, storage and API in one shot
- RLS (Row Level Security) — every row has a policy defining access
- Realtime — orders stream to kitchen/waiter without custom WebSockets
- Storage — dish images uploaded directly to Supabase Storage

### Why Svelte 5?

- Much smaller bundles (AdminDashboard ~25KB, Supabase SDK ~213KB)
- Less boilerplate — reactivity is native, no hooks or deps
- Better first-load and update performance

---

## Architecture

```
qr-menu/
├── src/
│   ├── components/
│   │   ├── astro/                   # Server-rendered components
│   │   │   └── Layout.astro          # HTML base, head, header
│   │   └── svelte/                  # Interactive client components
│   │       ├── Cart.svelte               # Customer menu + cart + order
│   │       ├── Clock.svelte              # Realtime clock
│   │       ├── WaiterDashboard.svelte     # Waiter confirm/serve
│   │       ├── KitchenDashboard.svelte    # Kitchen cook/ready/print
│   │       ├── AdminDashboard.svelte      # Full CRUD + upload + QR
│   │       ├── StaffManager.svelte        # Staff invite/roles/delete
│   │       ├── StatsBar.svelte            # Realtime stats
│   │       ├── StaffLogin.svelte          # Staff login page
│   │       ├── StaffOrder.svelte          # Staff order-for-table
│   │       ├── RegisterWizard.svelte      # Self-serve restaurant creation
│   │       ├── LangToggle.svelte          # Language switcher (IT/EN)
│   │       ├── OrderCard.svelte           # Reusable order card
│   │       └── LogoutButton.svelte        # Logout button
│   ├── lib/
│   │   ├── i18n/                    # Translation files (it.json, en.json)
│   │   │   └── index.svelte.ts      # Locale store + t() function
│   │   ├── supabase.ts              # Supabase client (anon key)
│   │   ├── admin.server.ts          # Supabase client (service_role, server)
│   │   ├── orders.ts                # createOrder, transitionOrderStatus, etc.
│   │   ├── cache.ts                 # Client-side menu cache
│   │   └── types.ts                 # TypeScript type definitions
│   ├── pages/
│   │   ├── index.astro              # Root — auto-redirect to first restaurant
│   │   ├── [tenant]/index.astro     # Customer menu page (dynamic slug)
│   │   ├── [tenant]/carrello.astro  # Legacy cart page
│   │   ├── staff/
│   │   │   ├── login.astro          # Staff login
│   │   │   ├── register.astro       # Self-serve restaurant registration
│   │   │   ├── admin.astro          # Admin dashboard
│   │   │   ├── cameriere.astro      # Waiter dashboard
│   │   │   ├── cucina.astro         # Kitchen dashboard
│   │   │   └── ordina.astro         # Staff order page
│   │   └── api/
│   │       ├── staff.ts             # Staff management API (server-only)
│   │       └── qr/[tableId].png.ts  # QR code PNG generator
│   └── styles/
│       └── global.css               # Tailwind base + font
├── supabase/
│   ├── setup.sql                    # FULL SCHEMA: tables, RLS, functions, seed, storage
│   └── migrations/
│       └── 00001_schema.sql         # Migration copy
├── scripts/
│   ├── setup.mjs                    # Cross-platform setup script
│   └── fix-node-version.mjs         # Post-build Node.js version fix
├── tests/
│   ├── unit/
│   │   └── order-state.test.ts      # 12 state machine tests
│   └── e2e/
│       └── full-flow.spec.ts        # E2E test scaffold
└── public/
    ├── sw.js                        # Service worker for PWA
    └── favicon/                     # Icons and manifest
```

### Order Flow

```
Customer                     Waiter                      Kitchen
   │                            │                          │
   ├─ Adds items ──────────────┤                          │
   ├─ Selects extras ──────────┤                          │
   ├─ Writes notes ────────────┤                          │
   ├─ SENDS ORDER ─────────────┤                          │
   │                            │                          │
   ▼                      ┌─────┴──────┐                   │
   "Submitted"            │  submitted  │                   │
                          └─────┬──────┘                   │
                                │                          │
                    ┌───────────┴───────────┐              │
                    │ (if waiter           │              │
                    │  confirmation on)    │              │
                    ▼                       ▼              │
           "Pending Review"         "Confirmed"            │
           pending_waiter_review      confirmed            │
                    │                       │              │
                    └───────┬───────────────┘              │
                            │                              │
                            └──────────┬───────────────────┘
                                       │
                                       ▼
                                "In Kitchen"
                                  in_kitchen
                                       │
                                       ▼
                                     "Ready"
                                      ready
                                       │
                                       ▼
                                    "Served"
                                     served
```

---

## Database

### Tables

| Table | Description |
|---|---|
| `tenants` | Restaurants (name, slug, hours, waiter confirm, show history) |
| `tables` | Tables (label, unique qr_token) |
| `staff` | Staff members (auth_user_id, role) with unique (tenant, user) constraint |
| `menu_categories` | Menu categories (name, sort order) |
| `menu_items` | Menu items (name, description, price, photo, kcal, allergens, available) |
| `item_modifiers` | Extras per item (name, surcharge) |
| `orders` | Orders (status, total, timestamps) |
| `order_items` | Order lines (item, quantity, notes, unit price) |
| `order_item_modifiers` | Selected extras per order line |

### Order States

```
submitted → pending_waiter_review → confirmed → in_kitchen → ready → served
```

Every transition is validated by a PostgreSQL function (`transition_order_status`) that checks:
- The role of the requester (waiter, kitchen, admin)
- The current order state
- Whether the restaurant requires waiter confirmation

### RLS (Row Level Security)

All tables have RLS policies:
- **tenants, tables, menu**: public read (anyone can see the menu)
- **staff**: each user sees only their own record
- **orders**: staff see only their restaurant's orders
- **menu_items, menu_categories, tables**: only staff can modify
- **orders insert**: allowed for all (anonymous customers can order)

---

## Quick Setup (2 minutes)

### 1. Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- A Supabase project (free at [supabase.com](https://supabase.com))

### 2. Automatic Setup

```bash
git clone https://github.com/Gabriele06-local/scan2order.git
cd qr-menu
node scripts/setup.mjs
```

The script will prompt for your Supabase keys and do everything automatically:
1. Create `.env` with your keys
2. Install dependencies (`pnpm install`)
3. Run `setup.sql` on the database
4. Create 3 demo staff accounts with password `demo1234`

### 3. Start

```bash
pnpm run dev
```

Open `http://localhost:4321` — you'll see the menu for Table 1.
Go to `http://localhost:4321/staff/login` to access dashboards.

### 4. Demo Staff

| Role | Email | Password |
|---|---|---|
| Administration | `admin@demo.it` | `demo1234` |
| Waiter | `cameriere@demo.it` | `demo1234` |
| Kitchen | `cucina@demo.it` | `demo1234` |

### Manual Setup

1. Create a project on [supabase.com](https://supabase.com)
2. Copy `Project URL`, `anon key`, and `service_role key` from **Project Settings → API**
3. Create `.env`:
```env
PUBLIC_SUPABASE_URL=https://xxx.supabase.co
PUBLIC_SUPABASE_KEY=eyJ...    # anon key
PRIVATE_SUPABASE_SERVICE_KEY=eyJ...   # service_role key
```
4. Run `supabase/setup.sql` in Supabase **SQL Editor**
5. `pnpm install && pnpm run dev`

### Deploy to Vercel

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New Project**
3. Import the repository
4. Set **Node.js Version → 22.x** in project settings
5. Add 3 **Environment Variables** (PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_KEY, PRIVATE_SUPABASE_SERVICE_KEY)
6. Deploy!

---

## Routes

| Route | Description | Access |
|---|---|---|
| `/` | Auto-redirect to first restaurant+table | Public |
| `/[slug]?table=[token]` | Customer menu (e.g. `/my-restaurant?table=table-1`) | Public |
| `/staff/login` | Staff login | Public |
| `/staff/register` | Self-serve restaurant creation | Public |
| `/staff/admin` | Administration dashboard | Staff admin |
| `/staff/cameriere` | Waiter dashboard (confirm/serve) | Staff waiter |
| `/staff/cucina` | Kitchen dashboard (cook/ready/print) | Staff kitchen |
| `/staff/ordina` | Order for a table | Staff any |
| `/api/qr/[tableId].png` | Download QR code PNG | Any (linked from admin) |

---

## Security

This project was designed with security as a priority.

### Keys & Secrets

- **anon key** — Public, used in frontend, safe to expose. RLS protects data at the database level.
- **service_role key** — Never exposed to the client. Used only in server-side API routes and admin scripts.
- **Passwords** — Stored only in Supabase Auth (hashed), never in code.

### RLS

Every table has policies limiting access:
- **Public read**: only menu, tables, and restaurant info
- **Anonymous write**: only for creating orders (anyone at the table must be able to order)
- **Staff**: each member sees/modifies only their restaurant's data
- **Admin**: only admins can manage staff

### Staff API

The `/api/staff` endpoint is protected:
- Requires valid JWT token
- Verifies the user has "admin" role in the database
- Uses service_role key server-side only for sensitive operations
- Unauthorized requests receive 403

---

## Development

### Commands

```bash
pnpm run dev          # Start dev server
pnpm run build        # Production build
pnpm run preview      # Preview local build
pnpm run test         # Unit tests (Vitest)
pnpm run lint         # Lint (ESLint)
pnpm run test:e2e     # E2E tests (Playwright)
node scripts/setup.mjs # Automatic Supabase + demo setup
```

### Tests

```bash
pnpm run test
```

12 unit tests verifying the order state machine:
- Valid and invalid transitions for each role
- Waiter confirmation enabled/disabled
- Unauthorized access attempts

E2E tests (Playwright) available in `tests/e2e/`.

### Code Conventions

- Svelte 5 components use `$state`, `$derived`, `$props()` (runes)
- Components are PascalCase (`Cart.svelte`)
- API routes are kebab-case (`staff.ts`)
- Public env vars start with `PUBLIC_`
- Private (server-only) env vars start with `PRIVATE_`

---

## Known Issues

- **Local Windows build**: The Vercel adapter can fail due to symlink restrictions. This is not a code issue — deploy directly from Vercel or use WSL.
- **Node.js 24**: `@astrojs/vercel@7` doesn't recognize Node 24 and defaults to Node 18. The post-build script `scripts/fix-node-version.mjs` fixes the generated runtime.
- **Thermal printers**: The kitchen print feature opens a browser print dialog. It does NOT support ESC/POS thermal printers directly. For real thermal printing, you need an additional layer (local server with `node-escpos`, or a cloud print service like PrintNode).

---

## License

Open source (MIT). You can freely use, modify, and distribute it for personal or commercial use.

---

## Contributing

Found a bug? Have an idea? Open an issue on GitHub or submit a pull request.

---

## 🇮🇹 Versione Italiana

# scan2order — QR Menu per Ristoranti

**I clienti inquadrano il QR sul tavolo e ordinano dal telefono. Zero carta, zero app.**

Piatti con foto, calorie e allergeni. Extra e note per ogni ordine. Le comande arrivano in tempo reale in cucina e al cameriere. Interfaccia in italiano e inglese. Gratuito, open source.

### Demo

**Menu:** https://scan2order-alpha.vercel.app
**Staff:** https://scan2order-alpha.vercel.app/staff/login

### Nuove funzionalità (v0.1.0)

- **QR scaricabile** — Nell'admin, ogni tavolo ha un pulsante "Scarica QR" che genera un PNG pronto per la stampa
- **Carica foto** — I ristoratori possono caricare foto dei piatti direttamente dal telefono (Supabase Storage), non serve un URL
- **Registrazione self-serve** — Vai su `/staff/register` e crea il tuo ristorante in 2 passi, senza toccare SQL
- **i18n italiano/inglese** — L'interfaccia rileva automaticamente la lingua del browser e si adatta. Pulsante per cambiare manualmente
- **Stampa cucina** — La stampa funziona via browser. *Nota: non supporta stampanti termiche ESC/POS* (serve un layer aggiuntivo)

### Setup rapido

```bash
git clone https://github.com/Gabriele06-local/scan2order.git
cd qr-menu
node scripts/setup.mjs   # ← ti guida passo passo
pnpm run dev
```

Serve solo un progetto Supabase gratuito (supabase.com).

---

*Built with ❤️ for restaurants that want to go digital without breaking the bank.*
