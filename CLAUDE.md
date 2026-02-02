# Obsidian Ticket Tracker

Een minimale, Things-geïnspireerde ticket management webapp die een Obsidian vault als database gebruikt.

## Quick Start

```bash
npm install
npm run dev
```

Frontend draait op http://localhost:5173, backend op http://localhost:3001.

## Tech Stack

- **Frontend:** Vite + React 18 + TypeScript + Tailwind CSS + Zustand
- **Backend:** Express.js + TypeScript
- **Data:** Markdown files met YAML frontmatter
- **Drag & Drop:** @hello-pangea/dnd
- **Animaties:** framer-motion
- **Markdown parsing:** gray-matter

## Project Structuur

```
├── src/                    # Frontend
│   ├── components/         # React components
│   │   ├── Sidebar.tsx     # Navigatie sidebar
│   │   ├── TicketList.tsx  # Hoofd ticket lijst
│   │   ├── TicketItem.tsx  # Enkele ticket row
│   │   ├── TicketDetail.tsx # Detail panel (slide-over)
│   │   ├── BoardView.tsx   # Kanban board view
│   │   ├── CreateTicket.tsx # Quick-add form
│   │   ├── SearchBar.tsx   # Zoekbalk met Cmd+K
│   │   ├── SortDropdown.tsx # Sorteer opties
│   │   ├── ViewToggle.tsx  # List/Board toggle
│   │   └── TagFilter.tsx   # Tag filtering
│   ├── hooks/
│   │   ├── useTickets.ts   # Data fetching + polling
│   │   └── useKeyboard.ts  # Keyboard shortcuts
│   ├── stores/
│   │   └── ticketStore.ts  # Zustand state management
│   ├── types/
│   │   └── ticket.ts       # TypeScript types
│   └── lib/
│       ├── api.ts          # REST API client
│       └── tagColors.ts    # Tag kleur configuratie
├── server/                 # Backend
│   ├── index.ts            # Express server entry
│   ├── routes/
│   │   └── tickets.ts      # REST API routes
│   └── lib/
│       ├── markdown.ts     # Markdown + frontmatter parsing
│       └── watcher.ts      # File system watcher
└── vault/                  # Default vault (dev only)
    └── backlog/            # Ticket markdown files
```

## Configuratie

De vault path wordt geconfigureerd via `.env`:

```env
VAULT_PATH=/Users/lennert/Documents/Obsidian/inviplay
```

Tickets worden gelezen uit `{VAULT_PATH}/backlog/*.md`.

## Ticket Markdown Format

```markdown
---
status: todo | in-progress | done
priority: low | medium | high | urgent
tags:
  - app
  - backend
created: '2026-02-02T12:00:00.000Z'
updated: '2026-02-02T14:30:00.000Z'
dueDate: '2026-02-10'        # optioneel
project: ProjectNaam         # optioneel
order: 1.5                   # optioneel, voor manual sorting
---

# Ticket Titel

**Bron:** Waar het ticket vandaan komt

## Beschrijving
Uitleg van wat er moet gebeuren.

## Acceptatiecriteria
- [ ] Criterium 1
- [ ] Criterium 2
```

## API Endpoints

| Method | Endpoint | Beschrijving |
|--------|----------|--------------|
| GET | `/api/tickets` | Lijst alle tickets |
| GET | `/api/tickets/:id` | Enkel ticket |
| POST | `/api/tickets` | Nieuw ticket aanmaken |
| PUT | `/api/tickets/:id` | Ticket updaten |
| DELETE | `/api/tickets/:id` | Ticket verwijderen |
| GET | `/api/tags` | Lijst unieke tags |
| GET | `/api/projects` | Lijst unieke projecten |

## Keyboard Shortcuts

| Toets | Actie |
|-------|-------|
| `n` | Nieuwe ticket (focust input, switcht naar list view indien nodig) |
| `j` / `↓` | Volgende ticket |
| `k` / `↑` | Vorige ticket |
| `v` | Toggle list/board view |
| `⌘K` | Focus zoekbalk |
| `Escape` | Sluit detail panel / clear search |

## State Management

De Zustand store (`ticketStore.ts`) beheert:
- `tickets` - Alle geladen tickets
- `tags` - Unieke tags voor filtering
- `projects` - Unieke projectnamen
- `selectedTicketId` - Huidig geselecteerde ticket
- `activeView` - all/inbox/today/backlog/done
- `displayMode` - list/board
- `searchQuery` - Zoekterm
- `sortBy` - Sorteer optie (manual/priority/updated/created/title/dueDate)
- `selectedTags` - Actieve tag filters
- `selectedProject` - Actief project filter (null = alle, "" = loose tickets)

## Belangrijke Patronen

### Optimistic Updates
Updates worden direct in de UI doorgevoerd voordat de API response binnenkomt. Bij errors wordt gerollback.

### Frontmatter Migratie
Bestaande markdown files zonder frontmatter krijgen automatisch default frontmatter toegevoegd bij eerste load.

### YAML Serialization
Let op: `undefined` values mogen niet in frontmatter objects - YAML kan deze niet serializen. Check altijd of optionele velden bestaan voordat je ze toevoegt.

### Timestamps
`created` en `updated` worden opgeslagen als ISO 8601 timestamps (bijv. `2026-02-02T14:30:00.000Z`). In de UI wordt `updated` getoond als relatieve tijd ("2m ago", "1h ago", "yesterday", etc.) via de `formatRelativeTime()` helper in TicketItem en BoardView.

### Polling en Lokale State
De app pollt elke 5 seconden voor updates. In `TicketDetail.tsx` wordt lokale form state (title, description, project, etc.) alleen gereset bij verandering van `selectedTicketId`, niet bij elke ticket update. Dit voorkomt dat de state wordt overschreven terwijl de gebruiker aan het typen is.

### Drag & Drop Sorting
Tickets kunnen handmatig gesorteerd worden via drag & drop in zowel list view als board view. Dit werkt alleen wanneer "Manual" sorting is geselecteerd in de dropdown. De volgorde wordt gepersisteerd via een `order` float in de frontmatter van elke ticket. Bij tussenvoeging wordt het gemiddelde van de buren berekend (bijv. 1.5 tussen 1 en 2). In board view kan je ook tickets tussen kolommen slepen om de status te wijzigen.

### Tag Kleuren
Tags krijgen automatisch kleuren op basis van hun naam. De mapping staat in `src/lib/tagColors.ts`:

| Tag | Kleur |
|-----|-------|
| bug, fix | Rood |
| feature | Groen |
| enhancement, improvement | Blauw |
| urgent | Oranje |
| backend | Paars |
| frontend | Cyaan |
| app | Indigo |
| web | Teal |
| api | Violet |
| docs | Geel |
| test | Roze |
| refactor | Grijs |

Onbekende tags krijgen een neutrale grijze kleur. Nieuwe tags kunnen worden toegevoegd in `tagColors.ts`.

### Filtering
Zowel list view als board view ondersteunen filtering op:
- Zoekterm (titel, beschrijving, tags)
- Tags (via sidebar)
- Project (via sidebar)

## Views

- **All Tickets** - Alle tickets
- **Inbox** - Tickets zonder project (nog te triagen)
- **In Progress** - Tickets met status "in-progress"
- **Backlog** - Alle todo tickets
- **Done** - Afgeronde tickets

## Projects

Tickets kunnen optioneel aan een project gekoppeld worden via het `project` veld in frontmatter. Projecten worden dynamisch afgeleid uit tickets - er zijn geen aparte project files.

- Projecten verschijnen in de sidebar met ticket counts
- Bij aanmaken van een ticket binnen een project-filter wordt dat project automatisch overgenomen
- Project kan bewerkt worden in de detail view (Enter of blur om op te slaan, Escape om te annuleren)

## Dev Commands

```bash
npm run dev          # Start frontend + backend concurrent
npm run dev:client   # Alleen frontend (Vite)
npm run dev:server   # Alleen backend (tsx watch)
npm run build        # Production build
```
