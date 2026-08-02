# PRD NexusAI Documentation Website

> This document is the product requirements document for the NexusAI documentation website.
> Design rules follow the **NexusStream** design system defined in `Design.md`.
> Read both files before starting any UI work.

---

## 1. Project Overview

- **Name**: NexusAI Docs
- **Description**: A standalone static documentation website for the NexusAI REST API covering authentication, AI chat, conversation history, credit system, API key management, subscription plans, and usage analytics.
- **Goal**: Give developers a single, fast, scannable reference to understand every endpoint, request shape, response schema, and error code without switching context.
- **Target Users**:
  - **Developers** integrating NexusAI into their own apps via API key
  - **Startups** evaluating the platform before subscribing
  - **Businesses** onboarding new team members to the API
- **Version**: v1.0.0
- **Status**: Active development

---

## 2. Tech Stack

| Concern          | Choice                             | Notes                                               |
|------------------|------------------------------------|-----------------------------------------------------|
| Language         | HTML + Vanilla CSS + Vanilla JS    | No framework static site, zero build step         |
| Fonts            | Google Fonts CDN                   | Libre Baskerville, Inter, Source Code Pro           |
| Syntax Highlight | Highlight.js (CDN)                 | For JSON request/response code blocks               |
| Icons            | Lucide Icons (CDN / SVG sprite)    | Consistent with NexusStream's flat aesthetic        |
| Search           | Client-side JS filter              | Keyboard-navigable (`⌘K`)                           |
| Deployment       | GitHub Pages / Vercel (static)     | Serve from `/docs/` folder in the repo          |
| Package Manager  | None no build pipeline           | All assets inlined or loaded via CDN               |

> **No React, no Tailwind, no bundler.** This site is intentionally zero-build so it can be opened directly from the filesystem during development. CDN links are pinned to specific versions.

---

## 3. File Structure

```
docs/
├── index.html              # Landing page overview + quick start
├── css/
│   ├── tokens.css          # CSS custom properties (colors, spacing, type)
│   ├── base.css            # Reset, body, global typography
│   ├── layout.css          # Sidebar + content + right-rail grid
│   └── components.css      # Badge, chip, code block, param table, search
├── js/
│   ├── nav.js              # Sidebar active-state, mobile drawer toggle
│   ├── search.js           # Keyboard shortcut (⌘K), filter logic
│   └── copy.js             # Copy-to-clipboard for code blocks
├── pages/
│   ├── auth.html           # Auth module
│   ├── user.html           # User profile module
│   ├── ai.html             # AI chat module
│   ├── conversation.html   # Conversation history module
│   ├── credit.html         # Credit system module
│   ├── api-keys.html       # API key management module
│   ├── subscription.html   # Subscription plans module
│   ├── analytics.html      # Usage analytics module
│   └── admin.html          # Admin endpoints module
├── assets/
│   └── favicon.svg         # Stone (#78716C) wordmark or logo mark
└── README.md               # How to run locally and deploy
```

**File placement rules:**
- All CSS variables → `css/tokens.css` only, never hardcode hex values elsewhere
- All component styles → `css/components.css`, never inline styles
- One HTML page per API module never combine multiple modules into one page
- Do not create new top-level folders without confirmation

---

## 4. Pages & Content Plan

### 4.1 Landing Page (`index.html`)

**Sections (top to bottom):**

1. **Top navigation bar** logo left, "GitHub" ghost link right
2. **Hero** Display-level serif title ("NexusAI API Reference"), one-line subtitle, two buttons: Primary ("Get started") → `pages/auth.html`, Ghost ("View on GitHub") → repo URL
3. **Quick Start** Three-step inline code walkthrough: register → get token → first chat call. Each step has an Overline label and a code block with a `curl` example.
4. **Module grid** 3×3 card grid, one card per module (Auth, User, AI Chat, Conversation, Credit, API Keys, Subscription, Analytics, Admin). Each card: module name as Subhead, one-line description as Body Small, method badge previews (e.g. `POST GET DELETE`) at the bottom.
5. **Base URL callout** `Surface` panel showing `https://api.nexusai.dev/api/v1` with copy button.
6. **Footer** text: "NexusAI · v1.0.0 · MIT License", links to GitHub and the backend repo.

---

### 4.2 Auth Module (`pages/auth.html`)

**Module title (serif H1):** Authentication

**Endpoints:**

| Method   | Path                         | Description                          |
|----------|------------------------------|--------------------------------------|
| `POST`   | `/auth/register`             | Register a new user account          |
| `POST`   | `/auth/login`                | Log in and receive tokens            |
| `POST`   | `/auth/refresh`              | Rotate access + refresh tokens       |
| `POST`   | `/auth/logout`               | Revoke current session               |
| `POST`   | `/auth/logout-all`           | Revoke all sessions for user         |
| `POST`   | `/auth/verify-email`         | Verify email with token              |
| `POST`   | `/auth/resend-verification`  | Re-send verification email           |
| `POST`   | `/auth/forgot-password`      | Request password reset               |
| `POST`   | `/auth/reset-password`       | Submit new password with token       |

**Each endpoint block contains:**
- Method badge + endpoint path (Endpoint Title style)
- One-line description (Body)
- Collapsible sections: Request headers, Path params, Query params, Request body, Response body, Error responses
- Parameter table (4-column: name / type / required / description)
- Code block right rail: `curl` request + JSON response (stacked, request first)
- Status code chips: `200 OK`, `201 Created`, `400`, `401`, `422` etc.

**Special component Auth Key Display:**
Used in the login response section to show the `accessToken` example with masked middle characters and a reveal/copy button pair.

---

### 4.3 User Module (`pages/user.html`)

**Module title (serif H1):** User

| Method   | Path                  | Description             |
|----------|-----------------------|-------------------------|
| `GET`    | `/users/me`           | Get own profile         |
| `PATCH`  | `/users/me`           | Update own profile      |
| `PATCH`  | `/users/me/password`  | Change password         |
| `DELETE` | `/users/me`           | Request account deletion|

---

### 4.4 AI Chat Module (`pages/ai.html`)

**Module title (serif H1):** AI Chat

| Method | Path       | Description                             |
|--------|------------|-----------------------------------------|
| `POST` | `/ai/chat` | Send a message and receive AI response  |

**Extra sections for this module:**
- **Supported models** table listing `gemini-1.5-pro`, `gemini-1.5-flash` with credit cost per 1K tokens
- **Streaming** section explaining SSE (`stream: true`), with `text/event-stream` response example
- **Error codes** `MODEL_NOT_AVAILABLE` (422), insufficient credits (422), provider error (503)
- **Credit deduction flow** numbered list (not an endpoint; explanatory prose describing pre-check → call → deduct → log)

---

### 4.5 Conversation Module (`pages/conversation.html`)

**Module title (serif H1):** Conversation History

| Method   | Path                             | Description                        |
|----------|----------------------------------|------------------------------------|
| `GET`    | `/conversations`                 | List conversations (paginated)     |
| `POST`   | `/conversations`                 | Create empty conversation          |
| `GET`    | `/conversations/:id`             | Get single conversation            |
| `PATCH`  | `/conversations/:id`             | Update title / pin / system prompt |
| `DELETE` | `/conversations/:id`             | Archive conversation (soft delete) |
| `GET`    | `/conversations/:id/messages`    | Get paginated messages             |
| `DELETE` | `/conversations/:id/messages`    | Clear all messages                 |

**Pagination note:** callout block explaining `?page=1&limit=20&sort=-createdAt` query params and the `meta` shape in the response.

---

### 4.6 Credit Module (`pages/credit.html`)

**Module title (serif H1):** Credits

| Method | Path                | Description               |
|--------|---------------------|---------------------------|
| `GET`  | `/credits/balance`  | Current balance           |
| `GET`  | `/credits/history`  | Paginated ledger entries  |
| `POST` | `/credits/purchase` | Initiate credit purchase  |

**Extra sections:**
- **CreditAction enum** table of all enum values (`purchase`, `subscription_grant`, `ai_usage`, `refund`, `admin_adjustment`, `welcome_bonus`) with descriptions
- **Deduction logic** prose explanation of the atomic MongoDB transaction flow (check-and-deduct pattern)
- **Welcome bonus** callout noting 100 credits granted on first email verification

---

### 4.7 API Keys Module (`pages/api-keys.html`)

**Module title (serif H1):** API Keys

| Method   | Path                       | Description                              |
|----------|----------------------------|------------------------------------------|
| `GET`    | `/api-keys`                | List all keys (prefix shown, never full) |
| `POST`   | `/api-keys`                | Create new key                           |
| `PATCH`  | `/api-keys/:id`            | Update name, scopes, IP whitelist, expiry|
| `DELETE` | `/api-keys/:id`            | Revoke key                               |
| `POST`   | `/api-keys/:id/rotate`     | Rotate key value (same settings)         |

**Extra sections:**
- **Key format** `nxai_` + 40 base62 chars; Auth Key Display component showing masked format
- **Available scopes** table of `ApiKeyScope` enum values (`chat:write`, `history:read`, `history:delete`, `analytics:read`, `credits:read`)
- **Auth flow** numbered list of how `x-api-key` header is verified server-side
- **Security callout** full key shown ONCE on creation only; only `keyPrefix` stored in DB

---

### 4.8 Subscription Module (`pages/subscription.html`)

**Module title (serif H1):** Subscriptions

| Method | Path                       | Description                     |
|--------|----------------------------|---------------------------------|
| `GET`  | `/plans`                   | List all active plans (public)  |
| `GET`  | `/plans/:slug`             | Get single plan                 |
| `POST` | `/subscriptions`           | Subscribe to a plan             |
| `GET`  | `/subscriptions/current`   | Get my current subscription     |
| `POST` | `/subscriptions/cancel`    | Cancel at period end            |

**Extra sections:**
- **Plan comparison table** Free / Starter / Pro / Enterprise; columns: price, credits/cycle, max API keys, max conversations, priority queue, analytics retention
- **Subscription lifecycle** state diagram as plain-text flow: `register → Free → upgrade → ACTIVE → cancel → CANCELLED → EXPIRED`
- **SubscriptionStatus enum** table of `active`, `trialing`, `past_due`, `cancelled`, `expired`

---

### 4.9 Analytics Module (`pages/analytics.html`)

**Module title (serif H1):** Analytics

| Method | Path                       | Description             |
|--------|----------------------------|-------------------------|
| `GET`  | `/analytics/overview`      | Total usage summary     |
| `GET`  | `/analytics/daily`         | Daily breakdown         |
| `GET`  | `/analytics/models`        | Breakdown by model      |
| `GET`  | `/analytics/api-keys`      | Per-key usage stats     |

**Extra sections:**
- **Query params** `?from=YYYY-MM-DD`, `?to=YYYY-MM-DD`, `?granularity=day|week|month`
- **Response example** `overview` shape in right-rail code block

---

### 4.10 Admin Module (`pages/admin.html`)

**Module title (serif H1):** Admin

> **Note:** All endpoints in this module require `role: admin`. Non-admin requests return `403 Forbidden`.

| Method  | Path                              | Description               |
|---------|-----------------------------------|---------------------------|
| `GET`   | `/admin/users`                    | List all users (paginated)|
| `GET`   | `/admin/users/:id`                | Get single user           |
| `PATCH` | `/admin/users/:id/ban`            | Ban user                  |
| `PATCH` | `/admin/users/:id/unban`          | Unban user                |
| `POST`  | `/admin/credits/adjust`           | Manual credit adjustment  |
| `POST`  | `/admin/plans`                    | Create plan               |
| `PATCH` | `/admin/plans/:id`                | Update plan               |
| `GET`   | `/admin/analytics/overview`       | Platform-wide stats       |
| `GET`   | `/admin/analytics/users`          | Per-user breakdown        |

---

## 5. UI Layout Specification

### 5.1 Three-column layout (desktop ≥ 1024px)

```
┌──────────────────────────────────────────────────────────────────┐
│  [240px Sidebar]   │  [720px Content]    │  [380px Right Rail]   │
│                    │                     │                        │
│  LOGO + SEARCH     │  Module Title       │  Request:              │
│                    │  ──────────────     │  ┌────────────────┐   │
│  AUTH              │  POST /auth/login   │  │  curl example  │   │
│    register        │                     │  └────────────────┘   │
│    login ◀─active  │  Description...     │                        │
│    refresh         │                     │  Response:             │
│  ────────────────  │  Request body       │  ┌────────────────┐   │
│  USER              │  ┌──────────────┐  │  │  JSON example  │   │
│    me              │  │ param table  │  │  └────────────────┘   │
│  ────────────────  │  └──────────────┘  │                        │
│  AI CHAT           │                     │                        │
│    chat            │  Response body      │                        │
│  ────────────────  │  ┌──────────────┐  │                        │
│  CONVERSATION      │  │ param table  │  │                        │
│  CREDIT            │  └──────────────┘  │                        │
│  API KEYS          │                     │                        │
│  SUBSCRIPTION      │  ────────────── ← Border Subtle hairline    │
│  ANALYTICS         │  Next endpoint      │                        │
│  ADMIN             │                     │                        │
└──────────────────────────────────────────────────────────────────┘
```

### 5.2 Mobile layout (< 768px)

- Sidebar collapses to a hamburger drawer (slides in from left)
- Right rail (code blocks) stacks **below** content request first, then response
- Parameter table: columns 1–3 inline, column 4 (description) wraps below on its own line
- No side-by-side code panels always single column

### 5.3 Tablet layout (768px – 1023px)

- Sidebar visible at narrower width (200px)
- Right rail collapses code blocks inline below each endpoint
- Content area expands to fill remaining width

---

## 6. Component Specifications

> All visual rules come from `Design.md`. This section maps components to pages.

### 6.1 CSS Tokens (`css/tokens.css`)

```css
:root {
  /* Brand */
  --color-primary:   #78716C;
  --color-secondary: #A8A29E;
  --color-tertiary:  #1C1917;

  /* Surfaces */
  --color-bg:             #FAFAF9;
  --color-surface:        #F5F5F4;
  --color-surface-raised: #EFEDEB;

  /* Text */
  --color-text-primary:   #1C1917;
  --color-text-secondary: #57534E;
  --color-text-tertiary:  #A8A29E;

  /* Borders */
  --color-border-subtle: #E7E5E4;
  --color-border-medium: #D6D3D1;
  --color-border-strong: #A8A29E;

  /* HTTP Methods */
  --method-get-bg:      #F0FDF4; --method-get-text:     #166534; --method-get-border:     #BBF7D0;
  --method-post-bg:     #EFF6FF; --method-post-text:    #1D4ED8; --method-post-border:    #BFDBFE;
  --method-put-bg:      #FFFBEB; --method-put-text:     #B45309; --method-put-border:     #FDE68A;
  --method-patch-bg:    #FAF5FF; --method-patch-text:   #7E22CE; --method-patch-border:   #E9D5FF;
  --method-delete-bg:   #FEF2F2; --method-delete-text:  #DC2626; --method-delete-border:  #FECACA;

  /* Semantic */
  --color-success: #65A30D;
  --color-warning: #CA8A04;
  --color-error:   #DC2626;
  --color-info:    #78716C;

  /* Spacing scale */
  --space-1: 12px;
  --space-2: 24px;
  --space-3: 36px;
  --space-4: 48px;
  --space-5: 60px;
  --space-6: 72px;

  /* Layout */
  --sidebar-width: 240px;
  --content-max:   720px;
  --rail-width:    380px;

  /* Typography */
  --font-serif: 'Libre Baskerville', Georgia, 'Times New Roman', serif;
  --font-sans:  'Inter', -apple-system, 'Segoe UI', Helvetica, sans-serif;
  --font-mono:  'Source Code Pro', 'Fira Code', Consolas, monospace;

  /* Radius always 0 except avatars */
  --radius:      0px;
  --radius-full: 9999px;
}
```

### 6.2 Components Used Per Page

| Component          | Landing | Module pages |
|--------------------|---------|--------------|
| Sidebar Nav        | ✗       | ✓            |
| Method Badge       | ✓ (cards)| ✓           |
| Endpoint Path      | ✗       | ✓            |
| Status Code Chip   | ✗       | ✓            |
| Code Block         | ✓ (quick start) | ✓ (right rail) |
| Parameter Table    | ✗       | ✓            |
| Auth Key Display   | ✗       | ✓ (auth, api-keys) |
| Search             | ✓ (top nav) | ✓ (sidebar) |
| Buttons            | ✓       | ✓ (copy, reveal) |

---

## 7. Sidebar Navigation Groups

Order and labels exactly as specified in `Design.md`:

```
OVERVIEW
  Getting started

AUTH
  register
  login
  refresh
  logout
  verify email
  forgot password
  reset password

USER
  profile

AI CHAT
  chat

CONVERSATION
  list
  create
  get
  update
  archive
  messages

CREDIT
  balance
  history
  purchase

API KEYS
  list
  create
  update
  revoke
  rotate

SUBSCRIPTION
  plans
  subscribe
  current
  cancel

ANALYTICS
  overview
  daily
  models
  api keys

ADMIN
  users
  credits
  plans
  analytics
```

**Styling rules (from `Design.md`):**
- Group labels: Overline `Inter 11px weight 600 letter-spacing 0.08em`, color `Text Tertiary`, margin-bottom 8px
- Nav items: Body Small `Inter 13px`, color `Text Secondary`, padding `8px 12px`
- Active item: background `Surface Raised`, color `Text Primary`, `weight 600`, `2px left border` in `Primary (#78716C)`
- Hover: background `Surface Raised` only no left border
- No colored left border on non-active items (non-negotiable rule from `Design.md`)

---

## 8. Accessibility Requirements

- All interactive elements keyboard-navigable (`Tab`, `Enter`, `Space`)
- Focus ring: `0 0 0 2px #FAFAF9, 0 0 0 4px #78716C` on all focusable elements
- Code copy buttons: `aria-label="Copy to clipboard"`, `aria-live="polite"` on success feedback
- Auth Key Display reveal button: `aria-label="Reveal API key"`
- Method badges: visually hidden text alongside color (e.g. `<span class="sr-only">GET</span>`)
- Mobile drawer: `aria-expanded`, `aria-controls`, `role="dialog"` on sidebar overlay
- Minimum contrast ratio: 4.5:1 for all body text against their backgrounds

---

## 9. Search Specification

- **Trigger**: search box in sidebar top (height 40px) + `⌘K` / `Ctrl+K` keyboard shortcut
- **Scope**: endpoint paths, HTTP methods, module names, parameter names
- **Implementation**: client-side JS filter over a hand-maintained `search-index.json` manifest
- **Result item**: `[METHOD BADGE] /path` + module name in Caption style
- **No-result state**: Body Small "no endpoints match" in `Text Tertiary`
- **Keyboard nav**: `↑↓` to move through results, `Enter` to navigate, `Escape` to close

---

## 10. Features Checklist

```
# Phase 1 Foundation
- [ ] css/tokens.css all CSS custom properties
- [ ] css/base.css reset + global typography
- [ ] css/layout.css 3-column grid, responsive breakpoints
- [ ] css/components.css all component styles
- [ ] Google Fonts import (Libre Baskerville, Inter, Source Code Pro)
- [ ] js/nav.js sidebar active state + mobile drawer
- [ ] assets/favicon.svg

# Phase 2 Landing Page
- [ ] index.html hero + quick start + module grid + base URL callout + footer
- [ ] Copy button for base URL callout
- [ ] Quick start curl code blocks with Highlight.js

# Phase 3 Module Pages
- [ ] pages/auth.html all 9 endpoints
- [ ] pages/user.html all 4 endpoints
- [ ] pages/ai.html chat endpoint + models table + streaming section
- [ ] pages/conversation.html all 7 endpoints
- [ ] pages/credit.html all 3 endpoints + CreditAction enum table
- [ ] pages/api-keys.html all 5 endpoints + scopes table + key format section
- [ ] pages/subscription.html all 5 endpoints + plan comparison table + lifecycle diagram
- [ ] pages/analytics.html all 4 endpoints + query params section
- [ ] pages/admin.html all 9 endpoints

# Phase 4 Polish & Deploy
- [ ] js/search.js ⌘K shortcut + client-side filter
- [ ] js/copy.js copy-to-clipboard for all code blocks
- [ ] Auth Key Display component (masked + reveal)
- [ ] Responsive audit: mobile (<768px), tablet (768–1023px), desktop (≥1024px)
- [ ] Accessibility audit: keyboard flow, aria attributes, color contrast
- [ ] search-index.json manifest
- [ ] README.md with local setup and deploy instructions
- [ ] Deploy to GitHub Pages
```

---

## 11. Design Rules Summary (from `Design.md`)

> Full specification in `Design.md`. These are the non-negotiables violating any of these breaks the NexusStream identity.

| # | Rule |
|---|------|
| 1 | **Zero rounded corners** `border-radius: 0` everywhere. No exceptions on badges, chips, code blocks, inputs, drawers. |
| 2 | **Zero shadows** No `box-shadow` for elevation. Use `border` and background tint to separate surfaces. |
| 3 | **Serif only for module `<h1>`** `Libre Baskerville` on the page-level module title only. All other headings use `Inter`. |
| 4 | **Method badge always paired with path** Never render a bare badge. Never render a bare path without a badge in navigable content. |
| 5 | **Method colors are consistent everywhere** Same hex values for GET/POST/PATCH/PUT/DELETE in badges, sidebar previews, search results. |
| 6 | **Colored left border only on the active nav item** No decoration on inactive or hover-only items. |
| 7 | **Mobile: stack code blocks vertically** Request block first, response block below. Never side-by-side. |
| 8 | **Parameter tables: 4 columns max** name / type / required / description. Extra info (defaults, enums) goes into the description cell. |
| 9 | **Color is never the only signal** Text labels (GET, 404, "required") always present alongside any color indicator. |
| 10 | **Content max-width: 720px** Content area is capped. Right rail is 380px. Sidebar is 240px. |

---

## 12. Do Not

```
# Structure
- Do not add a build step or bundler without confirmation
- Do not install npm packages CDN links only
- Do not create new folders outside the defined structure
- Do not combine multiple API modules into one HTML page

# Design
- Do not use rounded corners on any element (only avatars get border-radius: 9999px)
- Do not add box-shadow to any element
- Do not use Libre Baskerville for anything other than the module <h1>
- Do not hardcode hex color values always use CSS custom properties from tokens.css
- Do not add a colored left border to non-active nav items
- Do not place request and response code blocks side-by-side on any viewport
- Do not use inline styles for anything that can be expressed via CSS classes

# Content
- Do not document endpoints not defined in GEMINI.md
- Do not show full API key values in examples always mask the middle characters
- Do not expose internal implementation details (MongoDB query internals, Redis key names, etc.)
```

---

## 13. References

| Resource | Location |
|---|---|
| Backend API spec (all endpoints, request/response shapes, business rules) | `GEMINI.md` sections 9.1 – 9.8 |
| Design system (color, typography, spacing, components, do/don'ts) | `Design.md` |
| Swagger UI (interactive API explorer, auto-generated) | `/api/v1/docs` when backend is running |
| Base API URL | `https://api.nexusai.dev/api/v1` |

---

_Update this PRD when new endpoints are added to the backend or when the design system is revised. Keep the Features Checklist in sync with actual implementation progress._

---

## 2. Tech Stack

- Language : [TypeScript / JavaScript / Python / Go / dll]
- Framework : [Next.js / React / Express / Laravel / dll]
- Styling : [Tailwind CSS / CSS Modules / Styled Components / dll]
- UI Library : [shadcn/ui / MUI / Ant Design / dll]
- Database : [PostgreSQL / MySQL / MongoDB / SQLite / dll]
- ORM : [Prisma / Drizzle / TypeORM / Eloquent / dll]
- Auth : [NextAuth / Better Auth / Passport.js / dll]
- State Management: [Zustand / Redux / Pinia / Jotai / dll]
- Data Fetching : [SWR / React Query / Axios / fetch / dll]
- Package Manager : [npm / yarn / pnpm / bun]
- Deployment : [Vercel / Railway / VPS / AWS / dll]

---

## 3. Commands

```bash
# Development
[pm] run dev          # Jalankan dev server
[pm] run build        # Build untuk production
[pm] run start        # Jalankan production build
[pm] run lint         # Jalankan linter
[pm] run format       # Format kode

# Package Management
[pm] add [package]    # Install package baru

# Testing
[pm] run test         # Jalankan semua test
[pm] run test:unit    # Jalankan unit test saja
[pm] run test:e2e     # Jalankan e2e test saja

# Database
[pm] run db:migrate   # Jalankan migrasi
[pm] run db:seed      # Seed data awal
[pm] run db:reset     # Reset database
```

> [pm] = package manager yang kamu pakai: npm / yarn / pnpm / bun
> Jika ada package manager yang TIDAK boleh dipakai, tulis juga di sini.
> Contoh: Never use npm always use bun.

---

## 4. Project Structure

Architecture: [clean architecture / by feature / MVC / dll]

```
[root]/
  src/
    [folder-1]/    # [Untuk apa folder ini, boleh isi apa saja]
    [folder-2]/    # [Untuk apa folder ini, boleh isi apa saja]
    [folder-3]/    # [Untuk apa folder ini, boleh isi apa saja]
  public/          # Static assets yang bisa diakses publik
  [config-files]   # File konfigurasi project
```

Aturan penempatan file:

- Komponen UI baru selalu di [folder]
- Logic bisnis selalu di [folder]
- Tipe TypeScript selalu di [folder]
- Helper dan utility selalu di [folder]
- Jangan buat folder baru tanpa konfirmasi terlebih dahulu

---

## 5. Naming Conventions

```
# File dan Folder
- Komponen      : PascalCase    contoh: UserCard.tsx
- Non-komponen  : camelCase     contoh: useAuth.ts, getUserById.ts
- Folder        : kebab-case    contoh: user-profile/
- Halaman       : page.tsx atau index.tsx
- Layout        : layout.tsx
- Test file     : [nama].test.ts atau [nama].spec.ts

# Di dalam Kode
- Variabel      : camelCase     contoh: userData, isLoading
- Konstanta     : UPPER_SNAKE   contoh: MAX_RETRY, BASE_URL
- Fungsi        : camelCase     contoh: getUserById, formatDate
- Tipe/Interface: PascalCase    contoh: UserType, ApiResponse
- Enum          : PascalCase    contoh: UserRole, OrderStatus
- CSS Class     : kebab-case    contoh: user-card, nav-item

# Git Branch
- Fitur baru    : feat/[nama-fitur]
- Bug fix       : fix/[nama-bug]
- Hotfix        : hotfix/[nama]
- Refactor      : refactor/[nama]
```

---

## 6. Code Conventions

```
# Pendekatan Coding
- Terapkan prinsip [clean code / DRY / SOLID / dll]
- Hindari duplikasi kode, jadikan function jika dipakai lebih dari sekali
- Tulis kode yang mudah dibaca, bukan yang paling singkat

# TypeScript (jika pakai TypeScript)
- Gunakan strict mode
- Tidak boleh menggunakan tipe 'any'
- Selalu tulis tipe return function secara eksplisit
- Gunakan interface untuk object, type untuk union atau intersection

# Urutan Import
1. Library eksternal (React, Next.js, dll)
2. Internal absolut (@/components, @/utils, dll)
3. Internal relatif (./Component, ../utils)
4. Tipe dan Interface
5. Assets dan styles

# Export Pattern
- Gunakan named export untuk komponen dan fungsi
- Gunakan default export hanya untuk page.tsx dan layout.tsx

# Error Handling
- Selalu gunakan try-catch untuk async function
- Jangan biarkan error tanpa penanganan
- Tulis pesan error yang informatif dan spesifik
```

---

## 7. Component Rules

```
# Urutan Penulisan dalam Satu Komponen
1. Import
2. Tipe atau Interface props
3. Definisi komponen
4. Hooks (useState, useEffect, dll)
5. Handler dan fungsi lokal
6. Return JSX
7. Export

# Aturan Props
- Selalu tulis tipe props secara eksplisit
- Gunakan default value untuk props yang opsional
- Maksimal [angka] props per komponen

# Server vs Client Component (untuk Next.js)
- Default: gunakan Server Component
- Gunakan 'use client' hanya jika butuh:
    useState / useEffect / hooks lainnya
    Event listener (onClick, onChange, dll)
    Browser API (localStorage, window, dll)
    Library yang tidak support SSR

# Komponen Kecil
- Pisah ke file sendiri jika dipakai lebih dari satu tempat
- Boleh digabung dalam satu file jika hanya dipakai di satu komponen
```

---

## 8. Styling Rules

```
# Pendekatan Styling
- Gunakan [Tailwind CSS / CSS Modules / Styled Components / dll]
- Jangan gunakan inline style kecuali untuk nilai yang benar-benar dinamis
- Jangan gunakan !important

# Tailwind CSS (jika pakai Tailwind)
- Gunakan utility class langsung di JSX
- Gunakan clsx atau cn untuk conditional class
- Ekstrak ke komponen jika class yang sama dipakai lebih dari sekali
- Urutan class: layout > spacing > sizing > color > typography > state

# Responsive Design
- Pendekatan mobile-first
- Breakpoint: sm (640px) / md (768px) / lg (1024px) / xl (1280px)

# Dark Mode
- Gunakan [dark: prefix Tailwind / CSS variables / dll]
- Selalu test tampilan di dark mode setelah membuat komponen baru

# Design Tokens
- Gunakan CSS variables untuk warna, spacing, dan typography
- Jangan hardcode nilai warna langsung
- Gunakan variabel yang sudah didefinisikan di [file config]
```

---

## 9. API & Data Fetching Rules

```
# Kapan Pakai Server vs Client Fetch
- Server fetch  : data yang tidak butuh interaksi user (halaman awal)
- Client fetch  : data yang berubah setelah interaksi user
- Gunakan [SWR / React Query] untuk client-side data fetching
- Jangan gunakan useEffect untuk fetching data

# Format Response API
- Selalu kembalikan format yang konsisten di semua endpoint:
  { success: boolean, data: T | null, message: string }

# Error Handling di API
- Selalu tangani error dengan try-catch
- Kembalikan status code yang tepat (200, 400, 401, 404, 500)
- Jangan expose detail error ke client di production

# Lokasi Fetch Function
- Semua fungsi fetch disimpan di folder [services / api / lib]
- Jangan tulis fungsi fetch langsung di dalam komponen

# Environment
- Gunakan environment variable untuk semua URL dan API key
- Jangan hardcode URL atau secret apapun langsung di kode
```

---

## 10. State Management Rules

```
# Hierarki State (gunakan dari yang paling sederhana dulu)
1. Local state (useState)   : hanya dipakai 1 komponen
2. Lifted state             : dipakai 2-3 komponen yang berdekatan
3. Global state             : dipakai banyak komponen di banyak tempat

# Kapan Pakai Global State
- Data user atau auth yang dibutuhkan banyak komponen
- UI state global (tema, bahasa, layout toggle)
- Data yang perlu persist antar halaman

# Aturan [Zustand / Redux / Pinia / dll]
- Buat store per domain atau fitur, jangan satu store untuk semuanya
- Jangan simpan data yang bisa dihitung dari data lain
- Gunakan selector untuk mengambil data spesifik dari store
- [Tambahkan aturan spesifik state manager yang kamu pakai]

# Kapan Pakai Context
- Untuk data yang jarang berubah (tema, locale, config global)
- Jangan gunakan Context untuk state yang sering berubah
```

---

## 11. Performance Rules

```
# Code Splitting
- Gunakan dynamic import untuk komponen besar yang tidak langsung terlihat
- Lazy load halaman dan komponen yang jarang diakses

# Image Optimization
- Selalu gunakan komponen Image dari framework (next/image, dll)
- Tentukan width dan height untuk setiap gambar
- Gunakan format WebP atau AVIF untuk gambar baru
- Jangan gunakan tag img HTML biasa

# Re-render Optimization
- Gunakan useMemo untuk kalkulasi yang berat
- Gunakan useCallback untuk fungsi yang dikirim sebagai props
- Jangan overuse memo, lakukan profiling dulu sebelum optimize

# Bundle Size
- Import hanya yang dibutuhkan, bukan seluruh library
  Benar : import { debounce } from 'lodash'
  Salah : import _ from 'lodash'

# SSR dan SSG (Next.js)
- Default ke Server Component untuk mengurangi JavaScript di client
- Gunakan Static Generation untuk halaman yang datanya jarang berubah
- Gunakan ISR untuk halaman yang butuh revalidasi berkala
```

---

## 12. Git Rules

Setiap kali Claude Code selesai membuat perubahan atau penambahan kode,
langsung commit ke GitHub sebelum melanjutkan ke task berikutnya.
Ini penting supaya kamu bisa membandingkan kode lama dan kode baru,
dan melakukan undo jika hasilnya tidak sesuai ekspektasi.

```
# Format Commit Message
feat     : [deskripsi fitur baru]
fix      : [deskripsi bug yang diperbaiki]
refactor : [deskripsi perubahan refactor]
style    : [perubahan styling atau formatting]
docs     : [perubahan dokumentasi]
test     : [penambahan atau perubahan test]
chore    : [perubahan konfigurasi atau tooling]

# Contoh
feat: add user authentication with Google OAuth
fix: resolve infinite scroll not triggering on mobile
refactor: extract user card into reusable component

# Aturan Tambahan
- Jangan commit file .env atau file yang berisi secret apapun
- Satu commit untuk satu perubahan yang spesifik
- Jangan gabungkan banyak perubahan yang tidak berkaitan dalam satu commit
```

---

## 13. Features

```
# Sudah selesai dan berjalan
- [x] [Nama fitur 1]
- [x] [Nama fitur 2]
- [x] [Nama fitur 3]

# Sedang dikerjakan jangan diubah tanpa konfirmasi
- [ ] [Nama fitur yang sedang in-progress]
- [ ] [Nama fitur yang sedang in-progress]

# Belum dimulai
- [ ] [Nama fitur yang direncanakan]
- [ ] [Nama fitur yang direncanakan]
```

---

## 14. Testing

```
# Pendekatan Testing
- Jenis testing  : [Unit / Integration / E2E / Manual]
- Framework      : [Jest / Vitest / Playwright / Cypress / dll]

# Yang Perlu Di-test
- Semua fungsi utility dan helper
- Logic bisnis yang kompleks
- API endpoint (happy path dan error case)
- Komponen kritis yang sering dipakai banyak halaman

# Yang Tidak Perlu Di-test
- Komponen presentational yang sangat sederhana
- Third-party library (sudah di-test oleh pembuatnya)
- File konfigurasi

# Aturan Penulisan Test
- Satu test file per satu file yang di-test
- Nama test harus deskriptif:
  'should [expected behavior] when [condition]'
- Gunakan pola AAA: Arrange, Act, Assert

# Coverage Target
- Minimum coverage : [angka]%
- Prioritas        : fungsi bisnis > API > komponen UI
```

---

## 15. Do Not

Jika instruksi atau prompt kamu ambigu, TANYA DULU sebelum mulai coding.
Jangan berasumsi dan langsung mengerjakan tanpa konfirmasi.

```
# Struktur dan File
- Jangan buat folder baru tanpa konfirmasi
- Jangan hapus file tanpa konfirmasi
- Jangan pindahkan file tanpa konfirmasi
- Jangan ubah struktur folder yang sudah ada

# Kode
- Jangan gunakan tipe 'any' di TypeScript
- Jangan hardcode nilai yang seharusnya dari environment variable
- Jangan commit file .env atau file yang berisi secret
- Jangan install package baru tanpa konfirmasi
- Jangan hapus atau ubah fitur yang sudah berjalan tanpa instruksi jelas

# Pattern yang Dilarang
- Jangan gunakan [package atau pattern yang tidak boleh dipakai]
- Jangan gunakan useEffect untuk data fetching
- Jangan gunakan inline style untuk nilai yang bisa pakai utility class

# Database
- Jangan jalankan perintah yang mengubah atau menghapus data production
- Jangan buat migrasi database tanpa konfirmasi
- Jangan expose credential database ke sisi client

# Keamanan
- Jangan expose API key atau secret apapun ke client
- Jangan bypass validasi input dari user
- Jangan skip error handling di API routes
```

---

## 16. Environment Variables

```
# Setup
- Copy .env.example ke .env.local untuk development lokal
- Jangan pernah commit file .env atau .env.local ke repository

# Public Variables aman dipakai di sisi client
NEXT_PUBLIC_[NAMA]      # [Deskripsi variabel ini untuk apa]
NEXT_PUBLIC_[NAMA]      # [Deskripsi variabel ini untuk apa]

# Server-only Variables JANGAN pernah expose ke client
[DATABASE_URL]          # [Deskripsi]
[SECRET_KEY]            # [Deskripsi]
[API_KEY]               # [Deskripsi]
[SMTP_PASSWORD]         # [Deskripsi]

# Auth Variables
[AUTH_SECRET]           # Secret untuk JWT signing
[AUTH_URL]              # Base URL aplikasi
[OAUTH_CLIENT_ID]       # OAuth client ID
[OAUTH_CLIENT_SECRET]   # OAuth client secret server only
```

---

_Template ini adalah titik awal. Semakin detail kamu mengisi setiap bagian sesuai kondisi project kamu, semakin baik hasil yang akan diberikan Claude Code. Update CLAUDE.md secara berkala seiring project kamu berkembang._