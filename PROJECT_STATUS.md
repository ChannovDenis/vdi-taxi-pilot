# VDI Такси - Статус Проекта

## Текущая версия: v4.0 (Neko WebRTC)

**Дата:** 14 февраля 2026
**Production:** http://194.87.134.161:8088

## Что работает

- Neko WebRTC (10 комнат) - основная VDI платформа
- Session Dump -> Telegram
- Бронирование слотов
- Очереди
- Профили пользователей
- JWT + TOTP аутентификация
- WebSocket real-time обновления
- Telegram Bot (юзер + admin команды)
- PWA (Service Worker + manifest)
- Админ-панель (5 вкладок)
- Vaultwarden (менеджер паролей)

## Удалено/Отключено

- Guacamole (profiles: legacy) - экономия ~700MB RAM
- Lovable branding - убраны OG-теги и lovable-tagger

## Архитектура

```
                    Nginx (порт 8088)
  / .............. Frontend (React SPA)
  /api/* ......... FastAPI backend
  /neko/* ........ Neko WebRTC rooms
  /vault/* ....... Vaultwarden

  +-----------+   +----------------+   +-------------+
  | Frontend  |   |   FastAPI      |   | Neko WebRTC |
  | React+Vite|   | + SQLite       |   | 10 rooms    |
  | Tailwind  |   | + Telegram Bot |   | Chromium    |
  | shadcn/ui |   |                |   |             |
  +-----------+   +----------------+   +-------------+
```

| Component | Technology |
|-----------|------------|
| Frontend | React 18 + Vite 5 + Tailwind CSS + shadcn/ui |
| Backend | FastAPI + SQLAlchemy + SQLite |
| Auth | JWT (python-jose) + TOTP (pyotp) + bcrypt |
| VDI | Neko WebRTC containers (m1k1o/neko:chromium) |
| Real-time | WebSocket (FastAPI native) |
| Telegram | python-telegram-bot >= 21.0 |
| Deploy | Docker Compose on Timeweb Cloud VPS |
| Reverse Proxy | Nginx Alpine |
| Passwords | Vaultwarden (Bitwarden-compatible) |

## Метрики

| Метрика | Значение |
|---------|----------|
| RAM usage | ~2.5 GB (до оптимизации с Guacamole было ~3.2 GB) |
| Активных пользователей | ~15 сотрудников |
| Слотов в системе | 10 |
| Neko WebRTC комнат | 10 (каждый слот = отдельный контейнер) |
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
| S0 - Фундамент | 6 | DONE |
| S1 - Core функции | 8 | DONE |
| S2 - Интеграции | 8 | DONE |
| S3 - Polish + Deploy | 8 | DONE |
| S4 - UX Polish | 8 | DONE |

Полный roadmap: [TASKS.md](TASKS.md)
