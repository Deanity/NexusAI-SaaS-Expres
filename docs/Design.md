# NexusStream

Minimal, precise, zero-friction reference reading adapted from ThoughtStream for API documentation.

## Overview

NexusStream carries over ThoughtStream's contemplative, warm-neutral foundation generous white space, flat surfaces, a serif voice for headings but re-points every component at a different job: getting a developer from "what does this endpoint do" to "it works" as fast as possible. Where ThoughtStream optimizes for long-form reading flow, NexusStream optimizes for scanning: sidebar navigation, method badges, parameter tables, and request/response code blocks are first-class citizens instead of exceptions. The palette, restraint, and sharp-edge identity are unchanged this is the same design language, pointed at NexusAI's auth, chat, credit, subscription, and analytics endpoints instead of at prose.

## Colors

### Brand Palette

| Token     | Hex       | Role                                      |
|-----------|-----------|--------------------------------------------|
| Primary   | `#78716C` | Stone links, active nav item, focus ring |
| Secondary | `#A8A29E` | Sage dividers, muted icons, inactive nav |
| Tertiary  | `#1C1917` | Warm Black headings, emphasis            |

### Surface Palette

| Token          | Hex       | Role                                          |
|----------------|-----------|------------------------------------------------|
| Background     | `#FAFAF9` | Page background                                |
| Surface        | `#F5F5F4` | Sidebar, code block background, section panels |
| Surface Raised | `#EFEDEB` | Hover states, active sidebar item, callouts    |

### Content Palette

| Token          | Hex       | Role                                  |
|----------------|-----------|-----------------------------------------|
| Text Primary   | `#1C1917` | Body copy, headings, code text          |
| Text Secondary | `#57534E` | Field descriptions, bylines, captions   |
| Text Tertiary  | `#A8A29E` | Placeholders, disabled labels, punctuation in code |

### Border Palette

| Token         | Hex       |
|---------------|-----------|
| Border Subtle | `#E7E5E4` |
| Border Medium | `#D6D3D1` |
| Border Strong | `#A8A29E` |

### HTTP Method Colors

New for NexusStream every request method gets a fixed, low-saturation identity so the eye learns to scan for it. Same restrained tint-background + solid-text pairing as the existing semantic colors, never a loud fill.

| Method  | Background | Text      | Border    | Used for                          |
|---------|------------|-----------|-----------|------------------------------------|
| GET     | `#F0FDF4`  | `#166534` | `#BBF7D0` | `/auth`, `/conversation`, `/analytics` reads |
| POST    | `#EFF6FF`  | `#1D4ED8` | `#BFDBFE` | `/auth/register`, `/ai/chat`, `/apikey` create |
| PUT     | `#FFFBEB`  | `#B45309` | `#FDE68A` | `/user/profile`, `/subscription` updates |
| PATCH   | `#FAF5FF`  | `#7E22CE` | `#E9D5FF` | partial updates (e.g. conversation pin/rename) |
| DELETE  | `#FEF2F2`  | `#DC2626` | `#FECACA` | `/apikey/:id`, `/conversation/:id` remove |

### Semantic Colors (status codes and states)

| Token   | Hex       | Usage                                  |
|---------|-----------|------------------------------------------|
| Success | `#65A30D` | `2xx` status chip, "healthy" indicators  |
| Warning | `#CA8A04` | `4xx` status chip, rate-limit notices    |
| Error   | `#DC2626` | `5xx` status chip, auth failures         |
| Info    | `#78716C` | `3xx`, informational notes               |

## Typography

### Font Stack

| Role                    | Font                                              |
|--------------------------|-----------------------------------------------------|
| Display/Page titles      | Libre Baskerville, Georgia, 'Times New Roman', serif |
| UI/Body/Nav              | Inter, -apple-system, 'Segoe UI', Helvetica, sans-serif |
| Mono/Code/Endpoint paths | Source Code Pro, 'Fira Code', Consolas, monospace |

The serif is dialed back from ThoughtStream's role. In a blog it carries most of the reading experience; here it is reserved for the page-level module title only (e.g. "Conversation history"), so the docs still feel warm and authored rather than generated, without competing with the density of endpoint content below it.

### Type Scale

| Level          | Font              | Size   | Weight | Line Height | Letter Spacing | Usage                              |
|----------------|-------------------|--------|--------|-------------|----------------|--------------------------------------|
| Display        | Libre Baskerville | 32px   | 700    | 1.25        | -0.015em       | Doc landing page title only          |
| Module Title   | Libre Baskerville | 24px   | 700    | 1.3         | -0.01em        | One per module: "Auth", "AI chat"    |
| Endpoint Title | Source Code Pro   | 16px   | 500    | 1.5         | 0              | `POST /v1/ai/chat`                   |
| Subhead        | Inter             | 15px   | 600    | 1.4         | 0              | "Path parameters", "Response body"   |
| Body           | Inter             | 15px   | 400    | 1.75        | 0              | Endpoint descriptions, field notes   |
| Body Small     | Inter             | 13px   | 400    | 1.6         | 0              | Table cells, nav labels              |
| Caption        | Inter             | 12px   | 400    | 1.5         | 0.01em         | Field type hints, last-updated dates |
| Overline       | Inter             | 11px   | 600    | 1.4         | 0.08em         | Module eyebrows in sidebar           |
| Code           | Source Code Pro   | 13px   | 400    | 1.7         | 0              | Request/response blocks, inline code |

## Spacing

Unchanged base unit from ThoughtStream, reapplied to a denser layout docs don't get the 120px desktop section gaps a blog does, since scanning benefits from tighter, table-like rhythm.

| Property                     | Value   |
|-------------------------------|---------|
| Base unit                     | 12px    |
| Scale                         | 12, 24, 36, 48, 60, 72 |
| Component padding small     | 12px    |
| Component padding medium    | 24px    |
| Component padding large     | 36px    |
| Endpoint block spacing        | 48px    |
| Section spacing mobile      | 36px    |
| Section spacing desktop     | 60px    |
| Sidebar width desktop       | 240px   |
| Content max width             | 720px   |
| Right-rail (code panel) width | 380px   |

## Border Radius

Identical philosophy to ThoughtStream: sharp everywhere, no exceptions carved out for docs-specific chrome like badges or code blocks.

| Token  | Value  | Usage         |
|--------|--------|----------------|
| None   | 0px    | All elements default |
| Full   | 9999px | Avatars only (contributor/author credit, if shown) |

## Shadows

Still completely flat. Code blocks and sidebar are separated from the page by border and background-tint alone, never elevation.

| Level   | CSS Value | Usage |
|---------|-----------|-------|
| Subtle  | `none`    | |
| Medium  | `none`    | |
| Large   | `none`    | |

**Focus Ring:** `0 0 0 2px #FAFAF9, 0 0 0 4px #78716C` unchanged, used on nav items, inputs, and the "try it" button.

## Components

### Sidebar Navigation

New for NexusStream. Fixed left column, `Surface` background, `Border Subtle` right edge.

- Module group label: Overline style, `Text Tertiary`, margin-bottom 8px
- Nav item: Body Small, `Text Secondary`, padding 8px 12px, no radius
- Active item: background `Surface Raised`, text `Text Primary`, weight 600, 2px left border in `Primary`
- Hover: background `Surface Raised`
- Groups, in doc order: Auth · User · AI chat · Conversation · Credit · API keys · Subscription · Analytics · Admin

### Method Badge

- Padding: 3px 8px
- Font: Source Code Pro, 12px, weight 600, uppercase
- Radius: 0px
- Background/text/border: see HTTP Method Colors table
- Always paired immediately to the left of the endpoint path, never used alone without the path

### Endpoint Path

- Font: Source Code Pro, 16px, weight 500
- Color: `Text Primary`
- Path parameters (`:id`, `{conversationId}`) rendered in `Primary` to distinguish from static segments

### Status Code Chip

- Padding: 4px 12px
- Font: Inter, 11px, weight 600, uppercase
- Radius: 0px
- `2xx`: background `#F0FDF4`, text `#166534`, border `1px solid #BBF7D0`
- `4xx`: background `#FEFCE8`, text `#CA8A04`, border `1px solid #FEF08A`
- `5xx`: background `#FEF2F2`, text `#DC2626`, border `1px solid #FECACA`

### Code Block

- Background: `Surface` (`#F5F5F4`)
- Border: `1px solid Border Subtle`
- Radius: 0px
- Padding: 16px
- Font: Source Code Pro, 13px, line-height 1.7
- Language/tab label: Overline style, top-right, `Text Tertiary`
- Copy affordance: Ghost button, 13px, appears top-right on hover, no icon-only without `aria-label`
- Request and response blocks stack vertically in the right rail, separated by 24px, each with its own Overline label ("request", "response")

### Parameter Table

Replaces the generic list-style rows from ThoughtStream with a structured table suited to path/query/body parameters.

- Row padding: 10px 0
- Border bottom: `1px solid Border Subtle` (no border on last row)
- Column 1 name: Source Code Pro, 13px, `Text Primary`
- Column 2 type: Inter, 13px, `Text Tertiary`, e.g. `string`, `integer`, `boolean`
- Column 3 required: Inter, 12px, weight 600 "required" in `Warning`, "optional" in `Text Tertiary`
- Column 4 description: Inter, 13px, `Text Secondary`, right-aligned on desktop, stacks below on mobile

### Buttons

Unchanged from ThoughtStream Primary / Secondary / Ghost / Destructive, all 0px radius, 1px borders, Inter 15px weight 600. Destructive reserved for actions the docs describe as destructive (revoke API key, delete conversation), never for navigation.

### Auth Key Display

New for NexusStream for showing example API keys, bearer tokens, or the user's own generated key.

- Background: `Surface`
- Border: `1px solid Border Medium`
- Padding: 10px 14px
- Font: Source Code Pro, 13px
- Masked state: middle characters replaced with `••••`, `Text Tertiary`
- Reveal/copy: two Ghost buttons, right-aligned, 13px, icon + label

### Search

- Height: 40px
- Background: `Background`
- Border: `1px solid Border Medium`
- Radius: 0px
- Placeholder: "search endpoints" real, lowercase, no "e.g."
- Keyboard shortcut hint (`⌘K`): Caption style, right-aligned inside the field, `Text Tertiary`, own 1px-border 0-radius keycap chip

### Chips, Lists, Checkboxes, Radio Buttons, Tooltips

Carried over from ThoughtStream unchanged see original spec. They apply as-is to filter controls (e.g. filtering endpoints by module or method) and settings screens (e.g. an account or API-key management page) without modification.

## Do's and Don'ts

1. **Do** keep the serif to one title per page it is a signature, not a system voice, in a docs context.
2. **Do** pair every method badge with its path; never show a bare badge or a bare path in navigable content.
3. **Do** use the same method colors everywhere the method appears (badge, sidebar hover preview, search results) so color becomes a learned shortcut.
4. **Don't** add a colored left border to non-active nav items reserve it for the current page only.
5. **Don't** put request and response code side-by-side on mobile stack them, request first.
6. **Do** keep parameter tables to four columns maximum; push anything else (defaults, enum values) into the description cell.
7. **Don't** use rounded corners anywhere, including on the method badge and status chip sharp edges stay the identity across both the blog and docs contexts.
8. **Do** cap body content at 720px so code-heavy pages don't sprawl past a comfortable scan width.
9. **Don't** rely on method or status color alone the text label (GET, POST, 404) is always present alongside the color.
10. **Do** use `Border Subtle` hairlines to separate endpoints within a module, matching ThoughtStream's no-shadow philosophy.