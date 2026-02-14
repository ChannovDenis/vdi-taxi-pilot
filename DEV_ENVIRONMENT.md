# Локальная разработка vdi-taxi-pilot

## Требования

- Docker Desktop
- Node.js 20+ (для frontend dev)
- Python 3.11+ (для backend dev)
- Git

## Быстрый старт

### 1. Clone репозитория

```bash
git clone https://github.com/ChannovDenis/vdi-taxi-pilot.git
cd vdi-taxi-pilot
```

### 2. Настройка .env

```bash
cp .env.example .env
```

Заполни `.env`:
```
VDI_DATABASE_URL=sqlite:////app/data/vdi_taxi.db
VDI_JWT_SECRET=local-dev-secret-change-me
VDI_NEKO_USER_PASSWORD=vdipass123
VDI_NEKO_ADMIN_PASSWORD=vdiadmin123
VDI_TELEGRAM_BOT_TOKEN=your_token_here
VDI_TELEGRAM_ADMIN_CHAT_ID=your_chat_id
```

### 3. Локальный Backend (FastAPI)

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..

# Создать базу + seed-данные
python -m backend.seed

# Запустить dev-сервер
uvicorn backend.main:app --reload --port 8000
```

API доступен: http://localhost:8000
Swagger UI: http://localhost:8000/docs

### 4. Локальный Frontend (Vite)

```bash
npm install
npm run dev
```

Frontend доступен: http://localhost:5173 (или http://localhost:8080)

### 5. Docker Compose (полный стек)

```bash
# Dev режим (без Nginx, с Guacamole)
docker compose up

# Production режим (с Nginx)
docker compose -f docker-compose.prod.yml up
```

---

## Workflow разработки

### 1. Создай feature branch

```bash
git checkout -b feature/название-фичи
```

### 2. Делай изменения

- **Backend:** `backend/` - FastAPI перезагрузится автоматически (--reload)
- **Frontend:** `src/` - Vite hot reload

### 3. Тестируй локально

```bash
# Backend тесты
python -m pytest backend/tests/ -v

# Frontend тесты
npm test

# Ручное тестирование
# http://localhost:5173 (frontend dev server)
# http://localhost:8000 (backend API)
# http://localhost:8000/docs (Swagger)
```

### 4. Коммит и push

```bash
git add .
git commit -m "feat(scope): описание изменения"
git push origin feature/название-фичи
```

### 5. Деплой на production

См. [DEPLOYMENT.md](DEPLOYMENT.md)

---

## Environment Variables

| Переменная | Обязательная | По умолчанию | Описание |
|------------|:---:|-------------|----------|
| `VDI_DATABASE_URL` | Нет | `sqlite:///./vdi_taxi.db` | SQLite connection string |
| `VDI_JWT_SECRET` | **Да** (prod) | `change-me-...` | Секрет для JWT. Production: `openssl rand -hex 32` |
| `VDI_JWT_EXPIRE_MINUTES` | Нет | `480` | Время жизни JWT (8 часов) |
| `VDI_GUACAMOLE_URL` | Нет | `http://localhost:8085/guacamole` | URL Guacamole (legacy) |
| `VDI_GUACAMOLE_ADMIN_USER` | Нет | `guacadmin` | Guacamole admin (legacy) |
| `VDI_GUACAMOLE_ADMIN_PASS` | Нет | `guacadmin` | Guacamole пароль (legacy) |
| `VDI_NEKO_USER_PASSWORD` | Нет | - | Пароль для Neko WebRTC юзеров |
| `VDI_NEKO_ADMIN_PASSWORD` | Нет | - | Пароль для Neko WebRTC админа |
| `VDI_TELEGRAM_BOT_TOKEN` | Нет | `""` | Telegram Bot API token |
| `VDI_TELEGRAM_ADMIN_CHAT_ID` | Нет | `""` | Chat ID админа для алертов |
| `VDI_TIMEWEB_HOST` | Нет | `""` | IP production-сервера |
| `VDI_TIMEWEB_SSH_USER` | Нет | `root` | SSH-пользователь |
| `VDI_TIMEWEB_SSH_PASSWORD` | Нет | `""` | SSH-пароль |

Все переменные имеют prefix `VDI_` (настроено в `backend/config.py` через pydantic-settings).

---

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
│   ├── guacamole.py          # Guacamole REST API client (legacy)
│   ├── dump.py               # Session dump manager
│   ├── seed.py               # DB seed script
│   ├── models.py             # SQLAlchemy models
│   ├── database.py           # DB engine + session
│   ├── config.py             # Pydantic Settings
│   ├── requirements.txt      # Python dependencies
│   └── tests/                # pytest (54 tests)
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
├── deploy/                   # Deploy scripts
│   └── add_vdi_station.sh    # Скрипт добавления VDI-станции
├── docker/                   # Docker configs
│   └── guac-initdb/          # Guacamole init SQL (legacy)
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

---

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

Полная документация: http://localhost:8000/docs (Swagger UI)

---

## Частые проблемы

### Port уже занят

```bash
# Linux/Mac
lsof -i :8000  # или :5173
kill -9 PID

# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### Docker volumes (сброс данных)

```bash
docker compose down -v  # удалит все volumes!
```

### pip install ошибки

```bash
# Убедись что venv активирован
which python  # должно показывать путь к venv
pip install --upgrade pip
pip install -r requirements.txt
```

### Frontend не компилируется

```bash
# Проверить node версию
node --version  # >= 20

# Пересоздать node_modules
rm -rf node_modules package-lock.json
npm install
```
