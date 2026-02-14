# Локальная разработка — VDI Такси

## Требования

| Инструмент | Версия | Для чего |
|------------|--------|----------|
| Node.js | >= 20 | Frontend (React + Vite) |
| Python | >= 3.11 | Backend (FastAPI) |
| Docker + Docker Compose | Latest | Guacamole, PostgreSQL, Neko |
| Git | Latest | Версионирование |

## Быстрый старт

### 1. Клонировать репозиторий

```bash
git clone https://github.com/ChannovDenis/vdi-taxi-pilot.git
cd vdi-taxi-pilot
```

### 2. Настроить environment

```bash
cp .env.example .env
# Заполнить обязательные переменные (см. раздел Environment Variables)
```

### 3. Запустить backend

```bash
cd backend
pip install -r requirements.txt
cd ..

# Создать базу + seed-данные
python -m backend.seed

# Запустить FastAPI dev-сервер
python -m backend.main
# или
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend будет доступен на `http://localhost:8000`.
API docs (Swagger): `http://localhost:8000/docs`

### 4. Запустить frontend

```bash
npm install
npm run dev
```

Frontend будет доступен на `http://localhost:8080`.

### 5. (Опционально) Запустить через Docker Compose

```bash
# Dev compose (с Guacamole)
docker compose up -d

# Проверить
docker compose ps
curl http://localhost:8000/api/health
```

## Environment Variables

| Переменная | Обязательная | По умолчанию | Описание |
|------------|:---:|-------------|----------|
| `VDI_DATABASE_URL` | Нет | `sqlite:///./vdi_taxi.db` | SQLite connection string |
| `VDI_JWT_SECRET` | **Да** (prod) | `change-me-...` | Секрет для JWT-токенов. В production: `openssl rand -hex 32` |
| `VDI_JWT_EXPIRE_MINUTES` | Нет | `480` | Время жизни JWT (8 часов) |
| `VDI_GUACAMOLE_URL` | Нет | `http://localhost:8085/guacamole` | URL Guacamole web client |
| `VDI_GUACAMOLE_ADMIN_USER` | Нет | `guacadmin` | Guacamole admin логин |
| `VDI_GUACAMOLE_ADMIN_PASS` | Нет | `guacadmin` | Guacamole admin пароль |
| `VDI_TELEGRAM_BOT_TOKEN` | Нет | `""` | Telegram Bot API token (от @BotFather) |
| `VDI_TELEGRAM_ADMIN_CHAT_ID` | Нет | `""` | Chat ID админа для алертов |
| `VDI_TIMEWEB_HOST` | Нет | `""` | IP production-сервера |
| `VDI_TIMEWEB_SSH_USER` | Нет | `root` | SSH-пользователь для deploy |
| `VDI_TIMEWEB_SSH_PASSWORD` | Нет | `""` | SSH-пароль (для deploy скрипта) |

### Prefix

Все переменные имеют prefix `VDI_` (настроено в `backend/config.py` через pydantic-settings).

## Структура проекта

```
vdi-taxi-pilot/
├── backend/                  # FastAPI backend
│   ├── main.py               # Entry point, routers, lifespan
│   ├── auth.py               # JWT + TOTP аутентификация
│   ├── slots.py              # GET/POST слоты
│   ├── bookings.py           # CRUD бронирования
│   ├── queue.py              # Очереди на слоты
│   ├── templates.py          # CRUD шаблонов
│   ├── sessions.py           # Управление сессиями
│   ├── profile.py            # Профиль + избранные
│   ├── admin.py              # Admin endpoints
│   ├── health.py             # Health checks, VM status
│   ├── websocket.py          # WS /api/ws/slots
│   ├── telegram_bot.py       # Telegram bot
│   ├── guacamole.py          # Guacamole REST API client
│   ├── dump.py               # Session dump manager
│   ├── seed.py               # DB seed script
│   ├── models.py             # SQLAlchemy models
│   ├── database.py           # DB engine + session
│   ├── config.py             # Pydantic Settings
│   ├── requirements.txt      # Python dependencies
│   └── tests/                # pytest tests (54 tests)
├── src/                      # React frontend
│   ├── components/           # UI компоненты
│   │   ├── admin/            # Admin-панель вкладки
│   │   ├── ui/               # shadcn/ui компоненты
│   │   ├── DashboardScreen.tsx
│   │   ├── LoginScreen.tsx
│   │   ├── SessionScreen.tsx
│   │   └── ...
│   ├── context/              # AuthContext
│   ├── hooks/                # Custom hooks
│   ├── lib/                  # Утилиты (api.ts, utils.ts)
│   └── pages/                # Route pages
├── ansible/                  # Ansible playbooks для VM
│   ├── inventory.yml
│   └── playbooks/
├── deploy/                   # Deploy scripts
│   └── add_vdi_station.sh    # Скрипт добавления VDI-станции
├── docker/                   # Docker configs
│   └── guac-initdb/          # Guacamole PostgreSQL init SQL
├── scripts/                  # Utility scripts
│   ├── deploy.sh             # Deploy на Timeweb
│   └── collect_dump.sh       # Сбор session dump
├── docker-compose.yml        # Dev compose
├── docker-compose.prod.yml   # Production compose
├── Dockerfile                # Python backend image
├── nginx.conf                # Nginx reverse proxy config
├── package.json              # Frontend deps
├── vite.config.ts            # Vite config (port 8080)
└── vitest.config.ts          # Test config
```

## Запуск тестов

### Backend

```bash
# Все тесты
python -m pytest backend/tests/ -v

# Только auth
python -m pytest backend/tests/test_auth.py -v
```

### Frontend

```bash
# Все тесты
npm test

# Watch mode
npm run test:watch
```

## API эндпоинты (сводка)

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| POST | `/api/auth/login` | Логин (username, password, totp_code) |
| POST | `/api/auth/logout` | Выход |
| GET | `/api/auth/me` | Текущий пользователь |
| GET | `/api/slots` | Список слотов с статусами |
| POST | `/api/slots/{id}/occupy` | Занять слот |
| POST | `/api/slots/{id}/release` | Освободить слот |
| POST | `/api/slots/{id}/queue` | Встать в очередь |
| GET | `/api/bookings` | Мои бронирования |
| POST | `/api/bookings` | Создать бронь |
| DELETE | `/api/bookings/{id}` | Отменить бронь |
| GET | `/api/templates` | Список шаблонов |
| POST | `/api/templates` | Создать шаблон |
| POST | `/api/templates/{id}/launch` | Запустить шаблон |
| GET | `/api/profile` | Мой профиль + избранные |
| PUT | `/api/profile` | Обновить профиль |
| GET | `/api/admin/users` | Список пользователей (admin) |
| GET | `/api/admin/stats` | Статистика загрузки (admin) |
| GET | `/api/admin/health` | Здоровье VM/VPN/сервисов (admin) |
| POST | `/api/admin/vm/{id}/reboot` | Перезагрузить VM (admin) |
| WS | `/api/ws/slots` | Real-time статус слотов |
| GET | `/api/health` | Health check |

Полная документация: `http://localhost:8000/docs` (Swagger UI)

## Git workflow

```
feature-branch → main → deploy на сервер
```

1. Создай ветку: `git checkout -b feature/my-change`
2. Делай изменения, коммить
3. Push + PR в main
4. После merge — deploy через `scripts/deploy.sh`

**Формат коммитов:**
- Задачи: `S{sprint}-{task}: описание` (пример: `S4-3: Admin Health tab - manual refresh`)
- Fixes: `fix: описание`
- Features: `feat: описание`
