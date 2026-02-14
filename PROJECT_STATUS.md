# VDI Такси - Статус Проекта

## Текущая версия: v4.0 (Neko WebRTC)

**Дата:** 14 февраля 2026
**Production:** http://194.87.134.161:8088

## Что работает

- **Neko WebRTC (10 комнат)** — основная VDI платформа (заменила Guacamole)
- **Session Dump → Telegram** — автоматический дамп при завершении сессии
- **Бронирование слотов** — календарь + выбор времени + длительности
- **Очереди** — пользователь встаёт в очередь на занятый слот
- **Профили пользователей** — Telegram привязка, избранные, история сессий
- **Админ-панель** — 5 вкладок: загрузка, сервисы, пользователи, шаблоны, здоровье
- **JWT + TOTP аутентификация** — двухфакторная авторизация
- **WebSocket** — real-time обновление статусов слотов
- **Telegram Bot** — уведомления юзерам + admin-команды
- **PWA** — Service Worker + manifest для установки на телефон

## Удалено/Отключено

- **Guacamole** (profiles: legacy) — заменён на Neko WebRTC, экономия ~700MB RAM
- **Lovable branding** — убраны OG-теги и lovable-tagger

## Архитектура

```
┌─────────────────────────────────────────────────────────┐
│                    Nginx (порт 8088)                     │
│  / → Frontend (React SPA)                                │
│  /api/* → FastAPI backend                                │
│  /neko/* → Neko WebRTC rooms                             │
└──────┬────────────────────┬──────────────────┬───────────┘
       │                    │                  │
  ┌────▼─────┐     ┌───────▼──────┐    ┌──────▼──────┐
  │ Frontend  │     │   FastAPI    │    │ Neko WebRTC │
  │ React+Vite│     │ + SQLite     │    │ 10 rooms    │
  │ Tailwind  │     │ + Telegram   │    │ Chromium    │
  │ shadcn/ui │     │   Bot        │    │             │
  └───────────┘     └──────────────┘    └─────────────┘
```

| Component | Technology |
|-----------|------------|
| Frontend | React 18 + Vite 5 + Tailwind CSS + shadcn/ui |
| Backend | FastAPI + SQLAlchemy + SQLite |
| Auth | JWT (python-jose) + TOTP (pyotp) + bcrypt |
| VDI | Neko WebRTC containers (m1k1o/neko:chromium) |
| Real-time | WebSocket (FastAPI native) |
| Telegram | python-telegram-bot >= 21.0 |
| Deploy | Docker Compose на Timeweb Cloud VPS |
| Reverse Proxy | Nginx Alpine |
| Passwords | Vaultwarden (Bitwarden-compatible) |

## Метрики

| Метрика | Значение |
|---------|----------|
| RAM usage | [TODO: замерить после миграции на Neko] |
| Активных пользователей | ~15 сотрудников |
| Слотов в системе | 10 |
| VDI-станций | 1 provisioned + скрипт для 2-5 |
| Backend тестов | 54 passing |

## Слоты (сервисы)

| ID | Сервис | Стоимость/мес |
|----|--------|---------------|
| ppx-1, ppx-2, ppx-3 | Perplexity Max | $200 x3 |
| gem-dt | Gemini Ultra Deep Think | $250 |
| gem-veo | Gemini Ultra Veo+Flow | $250 |
| nbp | Nano Banana Pro | $200 |
| nb-drive | NotebookLM + Drive | $250 |
| gpt-1 | ChatGPT Pro | $200 |
| hf-1 | Higgsfield Ultimate | $50 |
| lov-1 | Lovable Team | $50 |

## Важные ссылки

| Что | Где |
|-----|-----|
| GitHub Repo | https://github.com/ChannovDenis/vdi-taxi-pilot |
| Production | http://194.87.134.161:8088 |
| Admin панель | /admin |
| Vaultwarden | http://194.87.134.161:8443 |

## Пройденные спринты

| Sprint | Задач | Статус |
|--------|-------|--------|
| S0 — Фундамент | 6 | DONE |
| S1 — Core функции | 8 | DONE |
| S2 — Интеграции | 8 | DONE |
| S3 — Polish + Deploy | 8 | DONE |
| S4 — UX Polish | 8 | DONE |

Полный roadmap: [TASKS.md](TASKS.md)
