# Angular to React Migration Guide

## Overview
This document outlines the migration strategy for converting the Angular 20 application to React.

## Current Application Analysis

### Tech Stack (Angular)
- **Framework**: Angular 20.3.0 (standalone components)
- **State Management**: Angular Signals
- **HTTP Client**: Angular HttpClient
- **Routing**: Angular Router
- **Styling**: Component-scoped CSS
- **Build Tool**: Angular CLI

### Key Features to Migrate
1. **Books Component** - Main library interface
   - Search functionality (title/author)
   - Genre filter with dropdown
   - Letter filter (A-Z, #)
   - Infinite scroll pagination
   - Download menu (EPUB/PDF)
   - API status banner
   - Loading states and error handling

2. **API Integration**
   - `/api/books` - Paginated book list
   - `/api/genres` - Genre taxonomy
   - `/api/books/:id/download` - EPUB download
   - `/api/books/:id/pdf` - PDF download

3. **State Management**
   - Search query (with debounce)
   - Genre filter
   - Letter filter
   - Current page tracking
   - Visible books cache
   - Loading states
   - API status

## Migration Strategy

### Phase 1: Project Setup
1. Create new React project with Vite + TypeScript
2. Set up project structure
3. Install dependencies:
   - `react`, `react-dom`
   - `react-router-dom` (if routing needed)
   - `axios` or use native `fetch`
   - TypeScript types

### Phase 2: Component Migration

#### Angular → React Mappings

| Angular Concept | React Equivalent |
|----------------|-----------------|
| `@Component` | Functional Component |
| `signal()` | `useState()` or `useReducer()` |
| `computed()` | `useMemo()` |
| `@ViewChild` | `useRef()` |
| `ngAfterViewInit` | `useEffect(() => {}, [])` |
| `ngOnDestroy` | `useEffect(() => { return cleanup })` |
| `*ngIf` | `{condition && <Component />}` |
| `*ngFor` | `{items.map(item => <Component key={...} />)}` |
| `[value]` | `value={state}` |
| `(input)` | `onChange={handler}` |
| `HttpClient` | `fetch()` or `axios` |

### Phase 3: State Management Conversion

**Angular Signals → React Hooks:**

```typescript
// Angular
const search = signal<string>('');
const total = signal(0);
const visibleBooks = computed(() => { ... });

// React
const [search, setSearch] = useState<string>('');
const [total, setTotal] = useState(0);
const visibleBooks = useMemo(() => { ... }, [dependencies]);
```

### Phase 4: API Service Migration

**Angular HttpClient → Fetch/Axios:**

```typescript
// Angular
this.http.get<Page<Book>>(url, { params })

// React
fetch(url + '?' + new URLSearchParams(params))
  .then(res => res.json())
```

### Phase 5: Lifecycle & Effects

**Angular Lifecycle → React useEffect:**

- `ngAfterViewInit` → `useEffect(() => {}, [])` (empty deps)
- `ngOnDestroy` → `useEffect(() => { return cleanup }, [])`
- Scroll listeners → `useEffect` with cleanup
- IntersectionObserver → `useEffect` with cleanup

### Phase 6: Template Conversion

**Angular Template → JSX:**

```html
<!-- Angular -->
<div *ngIf="loading()">Loading...</div>
<button (click)="handleClick()">Click</button>
<input [value]="search()" (input)="onInput($event)">

<!-- React -->
{loading && <div>Loading...</div>}
<button onClick={handleClick}>Click</button>
<input value={search} onChange={(e) => onInput(e.target.value)} />
```

## Project Structure

```
react-biblioteca/
├── src/
│   ├── components/
│   │   └── Books/
│   │       ├── Books.tsx
│   │       ├── Books.module.css (or styled-components)
│   │       └── types.ts
│   ├── services/
│   │   └── api.ts
│   ├── hooks/
│   │   ├── useBooks.ts
│   │   ├── useInfiniteScroll.ts
│   │   └── useDebounce.ts
│   ├── utils/
│   │   └── constants.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── public/
│   └── assets/
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Key Migration Challenges

1. **Infinite Scroll**: 
   - Convert IntersectionObserver setup to React hooks
   - Manage scroll position and cache in React state

2. **Debounced Search**:
   - Use `useDebounce` hook or `useEffect` with timeout

3. **Portal for Download Menu**:
   - Use React Portal (`createPortal`) instead of direct DOM manipulation

4. **Event Listeners**:
   - Properly cleanup in `useEffect` return function

5. **LocalStorage Caching**:
   - Convert to React hook or utility function

## Dependencies to Install

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
```

## Next Steps

1. ✅ Review this guide
2. Set up React project structure
3. Start migrating components one by one
4. Test each feature as it's migrated
5. Ensure API integration works correctly
6. Test infinite scroll and pagination
7. Verify download functionality
8. Test responsive design

## Notes

- Keep the Angular app running during migration for comparison
- Migrate incrementally - one feature at a time
- Maintain the same API contract
- Preserve all existing functionality
- Keep the same styling/design

