# VDI Такси — Project Context

## Проект

Веб-портал бронирования AI-сервисов для команды 15 человек.
Модель "такси": сотрудник бронирует слот → получает VDI с залогиненным
сервисом → по завершении дамп сессии в Telegram.

## Стек

- Frontend: React 18 + Vite + TypeScript + Tailwind + shadcn/ui
- Backend: FastAPI + SQLAlchemy + SQLite
- Bot: python-telegram-bot
- VDI: Apache Guacamole (Docker)
- VPN: WireGuard
- Deploy: Docker Compose на Timeweb Cloud (Ubuntu 22.04, EU)
- CI/CD: GitHub Actions

## Ключевые файлы

- BLUEPRINT.md — целевая архитектура, модель данных, API
- TASKS.md — спринты и задачи (обновляй статусы)
- PRODUCT_SCOPE.md — аудит текущего кода

## Команды

- Frontend: cd frontend && npm run dev (port 5173)
- Backend: cd backend && uvicorn main:app --reload (port 8000)
- Tests: cd backend && pytest
- Lint: cd frontend && npm run lint

## Что Claude часто делает неправильно в этом проекте

- Забывает обновлять TASKS.md после завершения задачи
- Создаёт дубли списка сервисов вместо единого источника
- Не добавляет типы TypeScript для новых API-ответов
- Забывает CORS-заголовки при добавлении новых эндпоинтов
- Не находит npm на Windows — использовать bun как fallback
- Валидация форм срабатывает до ввода (mode: onSubmit вместо onTouched)
- Seed-юзеры без TOTP-секрета блокируют логин если 2FA обязательный
- HTTPBearer возвращает 401 (не 403) когда нет токена — учитывать в тестах
- sonner.tsx зависит от next-themes которого нет — использовать theme="dark" напрямую
- docker healthcheck: curl нет в python:slim, использовать python urllib
