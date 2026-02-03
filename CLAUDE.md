# Obsidian Tracker

Een minimale, Things-geïnspireerde tracker webapp die een Obsidian vault als database gebruikt.

## Twee Modes

| Mode | Bron | Beschrijving |
|------|------|--------------|
| **Tickets** | `{VAULT_PATH}/{project}/backlog/*.md` | Gestructureerde tickets met YAML frontmatter |
| **Todos** | Alle `*.md` in vault (behalve backlog folders) | Inline `- [ ]` items met metadata parsing |

Switch tussen modes met `m` toets of via de toggle in de sidebar.

## Vault Structuur

De vault bevat project folders in de root. Elk project kan optioneel een `backlog/` folder hebben voor tickets.

```
vault/
├── inviplay/              # Project folder
│   ├── backlog/           # Tickets voor dit project
│   │   ├── archive/       # Gearchiveerde tickets
│   │   └── *.md           # Ticket files
│   ├── meetings/          # Andere folders (worden gescand voor todos)
│   └── notes/
├── trigion/               # Ander project
│   ├── backlog/
│   └── docs/
└── personal/              # Project zonder backlog (alleen todos)
    └── *.md
```

- **Projecten met backlogs** worden automatisch gedetecteerd en verschijnen in de backlog switcher
- **Tickets** worden geladen uit `{project}/backlog/*.md`
- **Archive** staat binnen de backlog: `{project}/backlog/archive/`
- **Todos** worden gescand uit alle project folders, behalve `backlog/` subfolders

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
│   │   ├── Sidebar.tsx     # Navigatie sidebar + mode toggle
│   │   ├── ModeToggle.tsx  # Switch tussen Tickets/Todos modes
│   │   ├── TicketList.tsx  # Hoofd ticket lijst
│   │   ├── TicketItem.tsx  # Enkele ticket row
│   │   ├── TicketDetail.tsx # Detail panel (slide-over)
│   │   ├── BoardView.tsx   # Kanban board view
│   │   ├── CreateTicket.tsx # Quick-add form
│   │   ├── TodoList.tsx    # Todo lijst component
│   │   ├── TodoItem.tsx    # Enkele todo row met subtasks
│   │   ├── SearchBar.tsx   # Zoekbalk met Cmd+K
│   │   ├── SortDropdown.tsx # Sorteer opties
│   │   ├── ViewToggle.tsx  # List/Board toggle
│   │   └── TagFilter.tsx   # Tag filtering
│   ├── hooks/
│   │   ├── useTickets.ts   # Data fetching + polling (tickets & todos)
│   │   └── useKeyboard.ts  # Keyboard shortcuts
│   ├── stores/
│   │   └── ticketStore.ts  # Zustand state management
│   ├── types/
│   │   ├── ticket.ts       # Ticket TypeScript types
│   │   └── todo.ts         # Todo TypeScript types
│   └── lib/
│       ├── api.ts          # REST API client
│       └── tagColors.ts    # Tag kleur configuratie
├── server/                 # Backend
│   ├── index.ts            # Express server entry
│   ├── routes/
│   │   ├── tickets.ts      # Ticket REST API routes
│   │   └── todos.ts        # Todo REST API routes
│   └── lib/
│       ├── markdown.ts     # Markdown + frontmatter parsing
│       ├── todoParser.ts   # Todo extractie uit markdown files
│       └── watcher.ts      # File system watcher
└── vault/                  # Default vault (dev only)
    └── backlog/            # Ticket markdown files
```

## Configuratie

De vault path wordt geconfigureerd via `.env`:

```env
VAULT_PATH=/Users/lennert/Documents/Obsidian/inviplay
```

De vault path wijst naar de root folder die project subfolders bevat. Tickets worden gelezen uit `{VAULT_PATH}/{project}/backlog/*.md` voor elk project dat een backlog folder heeft.

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

### Tickets
| Method | Endpoint | Beschrijving |
|--------|----------|--------------|
| GET | `/api/tickets/backlogs` | Lijst alle vault projecten met backlogs |
| GET | `/api/tickets?backlog=X` | Lijst tickets voor specifieke backlog |
| GET | `/api/tickets/:id` | Enkel ticket |
| POST | `/api/tickets` | Nieuw ticket aanmaken (vereist `backlog` in body) |
| PUT | `/api/tickets/:id` | Ticket updaten |
| DELETE | `/api/tickets/:id` | Ticket verwijderen (archiveert in `{backlog}/backlog/archive/`) |
| GET | `/api/tags?backlog=X` | Lijst unieke tags (optioneel per backlog) |
| GET | `/api/projects?backlog=X` | Lijst unieke projecten (optioneel per backlog) |

### Todos
| Method | Endpoint | Beschrijving |
|--------|----------|--------------|
| GET | `/api/todos` | Lijst alle todos uit vault |
| PUT | `/api/todos/:id` | Toggle todo completion |
| GET | `/api/todos/projects` | Lijst unieke folders met todos |

## Keyboard Shortcuts

### Globaal
| Toets | Actie |
|-------|-------|
| `m` | Switch tussen Tickets en Todos mode |
| `⌘K` | Focus zoekbalk |
| `Escape` | Sluit detail panel / clear search |

### Ticket Mode
| Toets | Actie |
|-------|-------|
| `n` | Nieuwe ticket (focust input, switcht naar list view indien nodig) |
| `j` / `↓` | Volgende ticket |
| `k` / `↑` | Vorige ticket |
| `v` | Toggle list/board view |

### Todo Mode
| Toets | Actie |
|-------|-------|
| `j` / `↓` | Volgende todo |
| `k` / `↑` | Vorige todo |
| `o` | Open geselecteerde todo in Obsidian |

## State Management

De Zustand store (`ticketStore.ts`) beheert:

### Mode
- `mode` - 'tickets' of 'todos'

### Ticket State
- `backlogs` - Beschikbare vault projecten met backlogs
- `selectedBacklog` - Huidig geselecteerde backlog (null = geen)
- `tickets` - Alle geladen tickets voor geselecteerde backlog
- `tags` - Unieke tags voor filtering
- `projects` - Unieke projectnamen binnen tickets
- `selectedTicketId` - Huidig geselecteerde ticket
- `activeView` - all/inbox/today/backlog/done
- `displayMode` - list/board
- `searchQuery` - Zoekterm
- `sortBy` - Sorteer optie (manual/priority/updated/created/title/dueDate)
- `selectedTags` - Actieve tag filters
- `selectedProject` - Actief project filter (null = alle, "" = loose tickets)

### Todo State
- `todos` - Alle geladen todos
- `todoProjects` - Unieke folders met todos
- `selectedTodoId` - Huidig geselecteerde todo
- `activeTodoView` - all/today/upcoming/someday/done
- `selectedTodoProject` - Actief folder filter
- `todoSearchQuery` - Zoekterm voor todos

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

### Drag & Drop naar Projecten
Tickets kunnen naar projecten in de sidebar gesleept worden om ze aan een project toe te wijzen. Sleep naar Inbox om het project te verwijderen. Drop targets krijgen een blauwe highlight tijdens het slepen. De `DragDropContext` staat in `App.tsx` om cross-component drag & drop mogelijk te maken.

### Tag Sortering
Tags worden altijd alfabetisch gesorteerd. Dit gebeurt in `server/lib/markdown.ts` bij het parsen, aanmaken en updaten van tickets.

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

### Filtering (Tickets)
Zowel list view als board view ondersteunen filtering op:
- Zoekterm (titel, beschrijving, tags)
- Tags (via sidebar)
- Project (via sidebar)

### Filtering (Todos)
Todo mode ondersteunt filtering op:
- Zoekterm (tekst, bestandsnaam, tags)
- Folder/project (via sidebar)

## Views

### Ticket Views
- **All Tickets** - Alle tickets
- **Inbox** - Tickets zonder project (nog te triagen)
- **In Progress** - Tickets met status "in-progress"
- **Backlog** - Alle todo tickets
- **Done** - Afgeronde tickets

### Todo Views
- **All Todos** - Alle open todos
- **Today** - Todos die vandaag of eerder due zijn
- **Upcoming** - Todos die binnen 7 dagen due zijn
- **Someday** - Todos zonder due date
- **Done** - Afgeronde todos

## Projects

Tickets kunnen optioneel aan een project gekoppeld worden via het `project` veld in frontmatter. Projecten worden dynamisch afgeleid uit tickets - er zijn geen aparte project files.

- Projecten verschijnen in de sidebar met ticket counts
- Bij aanmaken van een ticket binnen een project-filter wordt dat project automatisch overgenomen
- Project kan bewerkt worden in de detail view (Enter of blur om op te slaan, Escape om te annuleren)
- Sleep een ticket naar een project in de sidebar om het toe te wijzen
- Sleep een ticket naar Inbox om het project te verwijderen

## Todo Mode

De app heeft twee modes: Tickets en Todos. Todo mode scant alle `- [ ]` items uit de hele Obsidian vault.

### Todo Data Model

```typescript
interface Todo {
  id: string              // Hash van filepath + line number
  text: string            // Todo tekst zonder checkbox en metadata
  rawText: string         // Originele tekst
  completed: boolean      // [ ] vs [x]
  filePath: string        // Relatief pad naar note
  fileName: string        // Note naam (zonder .md)
  lineNumber: number      // Regel in bestand
  indentLevel: number     // 0 = top-level, 1+ = genest
  parentId?: string       // ID van parent todo (voor subtasks)
  project?: string        // Afgeleid van folder structuur
  dueDate?: string        // Geparsed uit (YYYY-MM-DD)
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  tags?: string[]         // Inline #tags
  created?: string        // File mtime als fallback
}
```

### Todo Bronnen
Todos worden gescand uit alle `.md` files in de vault, behalve:
- `.obsidian/`
- `templates/`
- `archive/`
- `backlog/` (tickets, op elk niveau)
- `node_modules/`
- `.git/`
- `.trash/`

Todos worden project-overstijgend geladen. Het `project` veld van een todo wordt afgeleid van de eerste folder in het pad (bijv. `inviplay/meetings/standup.md` -> project "inviplay").

### Todo Inline Metadata
Todos kunnen metadata bevatten in de regel zelf:

```markdown
- [ ] Bel Marc #werk !high (2026-02-03)
```

Wordt geparsed als:
- **text**: "Bel Marc"
- **tags**: ["werk"]
- **priority**: "high"
- **dueDate**: "2026-02-03"

Ondersteunde patterns:
- **Dates**: `(YYYY-MM-DD)` - ISO formaat tussen haakjes
- **Priority**: `!urgent`, `!high`, `!medium`, `!low`
- **Tags**: `#tag-naam`

### Subtask Hierarchie
Geneste todos worden bepaald door indentatie:

```markdown
- [ ] Hoofdtaak
  - [ ] Subtaak 1
    - [ ] Sub-subtaak
  - [ ] Subtaak 2
```

Subtasks worden visueel ingesprongen weergegeven onder hun parent.

### Todo Projecten
Anders dan tickets worden todo projecten afgeleid van de folder structuur. Een todo in `werk/meetings.md` krijgt project "werk".

### Obsidian Deeplinks
Click op de bestandsnaam naast een todo om de note in Obsidian te openen via deeplink. De vault naam is momenteel hardcoded als "inviplay" in:
- `src/components/TodoItem.tsx`
- `src/hooks/useKeyboard.ts`

### Todo Parser Details
De parser in `server/lib/todoParser.ts`:
- Skipt code blocks (``` ... ```)
- Skipt YAML frontmatter (--- ... ---)
- Herkent indentatie (2 spaties of 1 tab = 1 level)
- Genereert unieke ID's via MD5 hash van filepath + line number
- Sorteert tags alfabetisch

## Dev Commands

```bash
npm run dev          # Start frontend + backend concurrent
npm run dev:client   # Alleen frontend (Vite)
npm run dev:server   # Alleen backend (tsx watch)
npm run build        # Production build
```
