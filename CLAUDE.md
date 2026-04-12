# MeetingRunner

## Project Overview

MeetingRunner is a Trello-like kanban board application built for running meeting agendas and tracking action items. It is simpler than Trello but purpose-built for meetings, with user management for small teams (<20 concurrent users).

## Requirements

### Board Model
- One board per meeting type (e.g., Staff Meeting, All Hands, MOR)
- Each board has customizable columns (lists)
- Users can create multiple boards
- Board creators and admins can manage board membership

### Card Features
- Title + rich-text description (TipTap/ProseMirror, stored as JSON)
- Due dates with color coding: green (>3 days), yellow (1-3 days), red (overdue)
- Assignees (one or more board members per card)
- Threaded comments (parent_id for replies)
- File attachments via S3-compatible presigned URLs (max 25MB)
- NO checklists (keep simple)
- Drag-and-drop between columns and within columns for reordering

### Board Features
- Drag-and-drop cards between lists using @dnd-kit
- Sort/filter controls: filter by assignee, sort by due date within columns
- Real-time updates via Socket.IO (room-per-board design)

### User Management
- Simple roles: Admin (manages boards/users) and Member (uses boards)
- Email + password authentication (bcrypt + JWT with access/refresh tokens)
- Admin can invite users (generates temporary password)
- JWT access tokens expire in 15 minutes, refresh tokens in 7 days
- Refresh token rotation (old tokens invalidated on use)

### Notifications
- In-app notification bell only (no email)
- Triggers: card assignment, comments on assigned cards, due date approaching (24h), overdue
- Due date checker runs every 15 minutes via setInterval

### User Manual
- Built-in /help route with searchable documentation pages
- Contextual tooltips for onboarding (dismissed state in localStorage)
- Content: boards, cards, DnD, filtering, collaboration, user management

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | React 18 + TypeScript + Vite + TailwindCSS |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Real-time | Socket.IO |
| Rich Text | TipTap (ProseMirror) |
| File Storage | S3-compatible (Cloudflare R2 / AWS S3) |
| Auth | bcrypt + JWT |
| State Mgmt | Zustand |
| DnD | @dnd-kit/core + @dnd-kit/sortable |
| Monorepo | npm workspaces |
| Deployment | Railway (single service) |

## Architecture

- Monorepo: `packages/shared`, `packages/server`, `packages/client`
- Single Railway service: Express serves Vite build + REST API + WebSocket
- Database: PostgreSQL (Railway-managed)
- File storage: S3-compatible with presigned URLs for direct browser upload

### Database Tables
`users`, `refresh_tokens`, `boards`, `board_members`, `lists`, `cards`, `card_assignees`, `comments`, `attachments`, `notifications`

### API Routes (all prefixed `/api/v1`)
- Auth: login, refresh, logout
- Users: list, me, invite (admin), update
- Boards: CRUD, members management
- Lists: create (under boards), update, delete, reorder
- Cards: create (under lists), get detail, update, delete, move, reorder, assignees
- Comments: list (under cards), create, update, delete
- Attachments: presign, confirm, delete, download URL
- Notifications: list, unread count, mark read, mark all read

### WebSocket Events
- Board room: `board:{boardId}` — card/list/comment CRUD events
- User room: `user:{userId}` — notification events
- JWT auth on socket handshake

## Parallel Work Units

The codebase is decomposed into 8 independent units:
0. Scaffolding + shared types (prerequisite)
1. Auth & User Management
2. Board & List CRUD
3. Card CRUD & Drag-and-Drop
4. Card Detail Modal
5. Comments & Attachments
6. Real-Time WebSocket Layer
7. Notifications System
8. Help System & Onboarding

## Testing Strategy

- Unit tests: Vitest for all packages
- Integration tests: Supertest against test Postgres
- Security tests: auth boundaries, injection attempts, IDOR, rate limiting
- E2E tests: Playwright for critical flows
- Dependency audit: `npm audit --audit-level=high`
- Coverage threshold: 80% on server and shared

## Deployment

- Platform: Railway
- Single service serves API + static React build
- Railway-managed PostgreSQL
- Cloudflare R2 for file storage (free egress)
- Env vars: `DATABASE_URL`, `JWT_SECRET`, `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `PORT`, `CLIENT_URL`
- Dockerfile: build shared -> client -> server, copy client dist, run migrations on start

## Tax Calculator (Legacy)

The `tax-calculator/` directory contains a 2024 income tax calculator (separate project).
- To update for a new tax year: add new JSON files under `tax-calculator/data/{year}/` with updated federal brackets and state taxes
- Federal brackets are in `tax-calculator/data/2024/federal-brackets.json` — update the bracket amounts, rates, and standard deductions per filing status
- State taxes are in `tax-calculator/data/2024/state-taxes.json` — update flat rates or progressive brackets per state
- The calculator logic in `tax-calculator/js/calculator.js` is year-agnostic; only the data files need updating
