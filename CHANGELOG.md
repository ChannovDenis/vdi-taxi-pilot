# Changelog — VDI Такси

Все заметные изменения проекта документируются здесь.

Формат коммитов: `S{sprint}-{task}: Описание`

---

## [Unreleased] — Production (не в GitHub)

### Миграция на Neko WebRTC (v4.0)
- Замена Guacamole на Neko WebRTC (m1k1o/neko:chromium) — 10 комнат
- Экономия ~700MB RAM
- [TODO] Синхронизировать production код с GitHub

---

## [v3.0] — 2026-02-14 (последний коммит в GitHub)

### Guacamole Integration
- `bccc028` — Per-slot Guacamole connections, fresh auth tokens, admin force-release
- `b4e2175` — VDI Station 1 setup + Guacamole integration + cloning script
- `abfa9c4` — Friendly error overlay when Guacamole connection fails

### Sprint 4 — UX Polish
- `83aecd6` S4-8: Login validation contrast — brighter errors on dark background
- `1a66a72` S4-7: Mobile adaptation — single column cards, larger Release button
- `7e822fb` S4-6: Onboarding screen — icons + progress bar stepper
- `5d8f286` S4-5: Profile Telegram field — success indicator badge
- `e5ceb7d` S4-4: Admin services — text labels to Edit and Toggle buttons
- `bdde6df` S4-3: Admin Health tab — manual refresh button + timestamp
- `e10de4d` S4-2: Create Template modal on Dashboard
- `f0d94af` S4-1: Booking modal — show calendar icon on all slots

### Sprint 3 — Polish + Deploy
- `da2fbdc` S3-8: Deploy to Timeweb Cloud (194.87.134.161:8088)
- `35e6d0c` S3-7: PWA Service Worker + updated manifest
- `12e2fc8` S3-5+S3-6: Backend tests (54 passing) + frontend tests
- `5c4f352` S3-4: Production Docker Compose + Nginx + deploy script
- `d92f5e5` S3-3: Ansible playbooks for VDI VM provisioning
- `f311c35` S3-2: Session history in profile page
- `9649bcf` S3-1: Real Telegram onboarding + onboarding-complete API

### Sprint 2 — Integrations
- `89ee5c3` S2-8: WebSocket real-time slot status updates
- `589f544` S2-7: Admin health monitoring API + HealthTab from API
- `3e1446b` S2-5+S2-6: Telegram bot with user + admin commands
- `1acda23` S2-4: Session dump script + backend dump manager
- `7727e8f` S2-3: Session summary API + real data in SessionEndScreen
- `c51ec56` S2-2: Guacamole iframe replaces SessionScreen placeholder
- `92fa9b5` S2-1: Docker Compose + Guacamole REST API client
- `cef732e` S2-unblock: Telegram bot + SSH fully configured
- `8e1b6f1` chore: add .env and .db to .gitignore (security)

### Sprint 1 — Core Functions
- `e5bffc2` S1-8: Admin services CRUD via API, remove hardcoded passwords
- `5c2273d` S1-7: Admin users & stats API endpoints
- `2a69d07` S1-6: Form validation (zod + react-hook-form + inline)
- `b3823f8` S1-5: Real session timer + release via API
- `d5bfb9b` S1-4: Templates CRUD API + connect Dashboard and Admin
- `053e0d9` S1-3: Queue API + connect Dashboard queue buttons
- `58cc19c` S1-2: Bookings API + connect booking modal to real API
- `c7d4bd9` S1-1: Favorites API + sync between Dashboard and Profile

### Sprint 0 — Foundation
- `06b767c` S0-6: Slots API + connect Dashboard and Profile to real data
- `49dffef` S0-5: Connect LoginScreen to real auth API
- `010c577` S0-4: FastAPI backend skeleton + auth
- `8359343` S0-3: AuthContext, API layer, role-based UI
- `783b9b9` S0-2: Replace useState navigation with URL routes
- `0dd5f39` S0-1: Cleanup — remove unused deps, components, Lovable branding

## [v1.0] — Initial Prototype (Lovable)

- `499285d` Product scope audit, blueprint, sprint roadmap
- `ce51b18` Onboarding + Health/Admin screens
- `bf41252` Dashboard overhaul
- `9276571` Admin panel UI
- `b331aa1` Template: Vite + React + shadcn/ui + TypeScript
