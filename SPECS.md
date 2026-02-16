# **FHIR Patient Manager - Project Specification**

## **Project Overview**
Build a production-ready web application for managing FHIR R4 Patient resources with full CRUD capabilities, advanced search, monitoring dashboard, and cloud deployment support.

## **Core Requirements**

### **1. Technical Stack**
- **Framework**: Next.js 16.1+ (App Router, Turbopack, React Server Components)
- **UI Library**: MUI 7.3+, MUI X DataGrid, MUI X Date Pickers
- **Language**: TypeScript 5 (strict mode)
- **Runtime**: Node.js 20+
- **Styling**: MUI Emotion + responsive design
- **Deployment**: Docker (multi-stage Alpine build)

### **2. FHIR Integration**
- **Default Server**: `https://fhir-bootcamp.medblocks.com/fhir`
- **Configurable via**: `NEXT_PUBLIC_FHIR_SERVER_URL` environment variable
- **FHIR Version**: R4
- **Resource Type**: Patient only
- **Operations**: GET (search/read), POST (create), PUT (update), DELETE

### **3. Data Model**

#### **FHIR Patient Fields (mapped to UI)**
| UI Field | FHIR Path | Type | Required | Validation |
|----------|-----------|------|----------|------------|
| Given Name | `name[0].given[]` | string | Yes | Non-empty |
| Family Name | `name[0].family` | string | Yes | Non-empty |
| Gender | `gender` | enum | Yes | `male \| female \| other \| unknown` |
| Birth Date | `birthDate` | date | Yes | YYYY-MM-DD format |
| Phone | `telecom[system=phone].value` | string | Yes | Digits, spaces, `-`, `+`, `()` only |

#### **Conversion Logic**
- **FHIR → UI**: Extract `official` name, fallback to first name, join given names with spaces
- **UI → FHIR**: Create `official` name with `use: 'official'`, split given name by spaces
- **Phone**: Always use `system: 'phone'`, `use: 'mobile'`

### **4. Features**

#### **A. Patient List (DataGrid)**
- **Search**:
  - Quick search bar with auto-detection (name vs phone)
  - Phone detection: regex `/^[\d\s\-+()]+$/`
  - FHIR params: `name=<term>` or `telecom=<term>`
  - Search button + Enter key support
  - Clear button when search active
  - Display active search term

- **Sorting**:
  - Server-side via FHIR `_sort` parameter
  - All columns sortable
  - Descending: prefix with `-` (e.g., `-birthdate`)
  - Multi-column support

- **Pagination**:
  - Server-side with `_count`, `_offset`, `_total=accurate`
  - Page sizes: 5, 10, 25
  - Default: 10 items per page
  - Persist state in URL query params

- **Columns**:
  - ID (320px, non-sortable)
  - Name (200px, sortable)
  - Gender (120px, sortable, singleSelect filter)
  - Birth Date (140px, sortable)
  - Phone (160px, sortable)
  - Actions (flex, right-aligned: Edit, Delete)

- **Interactions**:
  - Row click → navigate to detail view
  - Edit icon → navigate to edit form
  - Delete icon → confirmation dialog → API call
  - Refresh button in header
  - Create button in header

#### **B. Patient Detail View**
- Read-only display of all fields
- Back button to list
- Edit button to edit form
- Delete button with confirmation

#### **C. Patient Create Form**
- Fields: Given Name, Family Name, Gender (select), Birth Date (date picker), Phone
- Client-side validation matching server validation
- Submit → POST to `/Patient`
- Success → navigate to detail view
- Error → display error message
- Cancel button → navigate to list

#### **D. Patient Edit Form**
- Pre-load existing patient data via GET `/Patient/:id`
- Same form fields as create
- Submit → PUT to `/Patient/:id` with full resource merge
- Merge strategy: Fetch existing resource, merge changes, send complete resource
- Success → navigate to detail view
- Cancel button → navigate to detail view

#### **E. API Monitoring Dashboard**
- **Purpose**: Track ALL FHIR API requests for debugging/transparency
- **Data Captured**: Method, URL, Status, Status Text, OK flag, Duration (ms), Operation name, Timestamp
- **Display**: MUI DataGrid with columns for all fields
- **Features**:
  - Sort by timestamp (newest first)
  - Filter by method, status, operation
  - Color-coded status (green for 2xx, red for errors)
  - Duration display in milliseconds
  - Clear log button
  - Auto-refresh on new API calls
- **Implementation**: Module-level singleton store with React `useSyncExternalStore`

### **5. Validation**

#### **Client-Side (before API calls)**
- All fields required
- Gender: must be one of `male`, `female`, `other`, `unknown`
- Birth Date: must match `/^\d{4}-\d{2}-\d{2}$/`
- Phone: must match `/^[\d\s\-+()]+$/`
- Display field-level errors

#### **Server-Side (FHIR server)**
- Rely on FHIR server validation
- Display OperationOutcome errors to user

### **6. Project Structure**

```
src/
├── app/
│   ├── layout.tsx                    # Root layout with theme provider
│   ├── page.tsx                      # Home page (redirect to /patients)
│   ├── patients/
│   │   ├── layout.tsx                # Dashboard layout wrapper
│   │   ├── page.tsx                  # Patient list route
│   │   ├── new/
│   │   │   └── page.tsx              # Create patient route
│   │   └── [id]/
│   │       ├── page.tsx              # Patient detail route
│   │       └── edit/
│   │           └── page.tsx          # Edit patient route
│   └── monitoring/
│       ├── layout.tsx                # Dashboard layout wrapper
│       └── page.tsx                  # Monitoring dashboard route
├── components/
│   ├── DashboardLayout.tsx           # Sidebar + header layout
│   ├── DashboardHeader.tsx           # Top navigation bar
│   ├── DashboardSidebar*.tsx         # Sidebar components
│   ├── PageContainer.tsx             # Page wrapper with breadcrumbs
│   ├── ThemeSwitcher.tsx             # Light/dark mode toggle
│   ├── PatientList.tsx               # DataGrid with search/sort/pagination
│   ├── PatientShow.tsx               # Detail view component
│   ├── PatientForm.tsx               # Shared form with validation
│   └── MonitoringDashboard.tsx       # API log viewer
├── data/
│   ├── patients.ts                   # FHIR API layer + validation
│   └── apiLog.ts                     # API log singleton store
├── hooks/
│   ├── useDialogs/                   # Confirmation dialog hook
│   └── useNotifications/             # Toast notification hook
├── context/
│   └── DashboardSidebarContext.ts    # Sidebar state management
└── shared-theme/
    └── themePrimitives.ts            # MUI theme customization
```

### **7. Error Handling**
- Display user-friendly error messages for all API failures
- Show HTTP status + status text
- Use MUI Alert component for errors in lists
- Use notifications for transient errors (create/update/delete)
- Validate before API calls to minimize server errors

### **8. State Management**
- **URL State**: Pagination, sorting, filtering, search (via query params)
- **Server State**: Patient data (fetched per route, no global cache)
- **Client State**: Form inputs, loading states, errors
- **Singleton Store**: API log (module-level with React `useSyncExternalStore`)
- **Context**: Sidebar open/close state

### **9. Navigation Flow**
```
/ (Home)
  → /patients (List)
      → /patients/new (Create)
          → [Success] → /patients/:id (Detail)
      → /patients/:id (Detail)
          → /patients/:id/edit (Edit)
              → [Success] → /patients/:id (Detail)
  → /monitoring (API Log Dashboard)
```

### **10. Docker & Deployment**

#### **Dockerfile Requirements**
- Multi-stage build (deps → builder → runner)
- Base: `node:20-alpine`
- Build args: `NEXT_PUBLIC_FHIR_SERVER_URL`
- Expose port: 3000
- Run as non-root user (`nextjs`)
- Standalone output for minimal image size

#### **docker-compose.yml**
- Single service: `fhirclient`
- Port mapping: `3000:3000`
- Build args support

#### **Cloud Deployment Guides**
Include setup instructions for:
- **Google Cloud Run**: Build with Cloud Build, deploy from Artifact Registry
- **AWS ECS/Fargate**: ECR push, task definition, load balancer
- **Azure Container Apps**: Direct source deployment

### **11. Developer Experience**

#### **Scripts**
- `npm run dev`: Development server with hot reload
- `npm run build`: Production build
- `npm start`: Production server
- `npm run lint`: ESLint

#### **Environment Variables**
- `.env.example` with `NEXT_PUBLIC_FHIR_SERVER_URL`
- `.env.local` for local development
- Build-time variable (requires rebuild on change)

#### **Documentation**
- `README.md`: Getting started, deployment guides, project structure
- Inline code comments for complex FHIR mappings
- TypeScript types for all data structures

### **12. UI/UX Requirements**
- **Responsive**: Desktop-first, mobile-friendly
- **Theme**: Light/dark mode toggle (persisted)
- **Loading States**: Circular progress in DataGrid
- **Confirmation Dialogs**: Delete actions
- **Toast Notifications**: Success/error feedback
- **Breadcrumbs**: Show current page hierarchy
- **Sidebar**: Collapsible navigation with icons
- **Form UX**: Auto-focus first field, Enter to submit, escape to cancel

### **13. Non-Functional Requirements**
- **Performance**: Server-side operations (sort/filter/paginate)
- **Type Safety**: Strict TypeScript, no `any` types
- **Code Quality**: ESLint configured, consistent formatting
- **Accessibility**: Semantic HTML, ARIA labels, keyboard navigation
- **Security**: No sensitive data logging, CORS-aware
- **License**: MIT

### **14. Testing Considerations** (Future)
- Unit tests for FHIR conversion functions
- Integration tests for API layer
- E2E tests for critical paths (create/edit/delete)

### **15. Known Constraints**
- FHIR server must support: `_count`, `_offset`, `_total=accurate`, `_sort`
- Search by name uses partial match (server-dependent)
- Phone search uses exact `telecom` match
- No authentication/authorization (assumes open FHIR server)
- No offline support
- No optimistic updates

---

## **Implementation Notes for Agentic Coding**

### **Start Here**
1. Set up Next.js 16 project with TypeScript
2. Install MUI 7 + MUI X DataGrid + Date Pickers
3. Create basic layout with sidebar navigation
4. Implement `src/data/patients.ts` with FHIR conversion logic
5. Build patient list with DataGrid + server-side features
6. Add create/edit/detail views
7. Implement API monitoring dashboard
8. Add Docker support
9. Write deployment guides

### **Key Decision Points**
- Use **App Router** (not Pages Router)
- Use **Server Components** where possible, Client Components for interactivity
- Keep FHIR logic in `src/data/patients.ts`, separate from UI
- Use **controlled components** for all forms
- Persist DataGrid state in **URL query params** for shareable links
- Use **MUI's built-in theming** for dark mode

### **Code Style**
- Functional components with hooks
- Explicit return types for functions
- Named exports for components
- Co-locate types with implementation
- Use `React.useCallback` for event handlers
- Use `React.useMemo` for expensive computations

---

This specification provides all the context needed for an AI agent to build the project from scratch while making consistent architectural decisions aligned with the original implementation.
