# Deployment Guide — VDI Такси

## Production Environment

| Параметр | Значение |
|----------|----------|
| Хостинг | Timeweb Cloud VPS |
| IP | 194.87.134.161 |
| Порт | 8088 (Nginx) |
| OS | Ubuntu (Docker host) |
| Deploy path | `/opt/vdi-taxi` |

## Текущий стек на сервере

```
Nginx (порт 8088)
  ├── / → Frontend static (React build)
  ├── /api/* → FastAPI (порт 8000)
  ├── /guacamole/* → Guacamole (порт 8080)
  └── /vault/* → Vaultwarden (порт 80)

Docker Compose services:
  ├── nginx          (nginx:alpine)
  ├── api            (python:3.11-slim + FastAPI)
  ├── guacamole      (guacamole/guacamole:1.5.5)
  ├── guacd          (guacamole/guacd:1.5.5)
  ├── guac-db        (postgres:16-alpine)
  └── vaultwarden    (vaultwarden/server:latest)
```

## Deploy через скрипт (рекомендуемый способ)

### Предварительные условия

1. `.env` файл в корне проекта с production-значениями
2. SSH-доступ к серверу (ключ или пароль в `.env`)
3. Node.js >= 20 (для сборки frontend)
4. rsync установлен

### Выполнение

```bash
./scripts/deploy.sh
```

Скрипт выполняет:
1. **Build frontend** локально (`npm ci && npm run build`)
2. **Sync файлов** на сервер через rsync (исключая node_modules, .git, .env, *.db)
3. **Copy .env** на сервер
4. **Copy frontend build** (`dist/`) на сервер
5. **Restart services** через `docker compose up -d --build`
6. **Health check** — `curl /api/health`

## Ручной deploy

### 1. Собрать frontend

```bash
npm ci
npm run build
```

### 2. Скопировать файлы на сервер

```bash
rsync -avz --delete \
  --exclude node_modules \
  --exclude .git \
  --exclude .env \
  --exclude "*.db" \
  --exclude dumps/ \
  ./ root@194.87.134.161:/opt/vdi-taxi/

scp .env root@194.87.134.161:/opt/vdi-taxi/.env
rsync -avz dist/ root@194.87.134.161:/opt/vdi-taxi/dist/
```

### 3. Перезапустить на сервере

```bash
ssh root@194.87.134.161

cd /opt/vdi-taxi

# Build frontend в Docker volume
docker compose -f docker-compose.prod.yml --profile build up frontend-builder

# Rebuild и запустить все сервисы
docker compose -f docker-compose.prod.yml up -d --build

# Проверить
docker compose -f docker-compose.prod.yml ps
curl -sf http://localhost/api/health && echo " OK" || echo " FAILED"
```

## Добавление VDI-станции

Для добавления станций 2-5 (станция 1 уже настроена):

```bash
./deploy/add_vdi_station.sh <номер_станции>
# Пример: ./deploy/add_vdi_station.sh 2
```

Скрипт создаёт:
- Пользователя `vdiuserN` на сервере
- xrdp-инстанс на уникальном порту (3389 + N)
- Guacamole RDP connection

## Docker Compose файлы

| Файл | Назначение |
|------|-----------|
| `docker-compose.yml` | Dev: FastAPI + Guacamole + guacd + PostgreSQL |
| `docker-compose.prod.yml` | Prod: + Nginx + frontend-builder + Vaultwarden + dump-storage |

## Volumes

| Volume | Данные |
|--------|--------|
| `sqlite-data` | SQLite база (`vdi_taxi.db`) |
| `guac-pg-data` | PostgreSQL для Guacamole |
| `frontend-build` | Собранный frontend (`dist/`) |
| `dump-storage` | Session dumps (14 дней retention) |
| `vaultwarden-data` | Vaultwarden data |

## Мониторинг

### Health check

```bash
# API health
curl http://194.87.134.161:8088/api/health

# Docker статус
ssh root@194.87.134.161 "docker compose -f /opt/vdi-taxi/docker-compose.prod.yml ps"
```

### Логи

```bash
ssh root@194.87.134.161

# Все сервисы
docker compose -f /opt/vdi-taxi/docker-compose.prod.yml logs --tail 50

# Только API
docker compose -f /opt/vdi-taxi/docker-compose.prod.yml logs api --tail 100

# Только Nginx
docker compose -f /opt/vdi-taxi/docker-compose.prod.yml logs nginx --tail 50
```

### Telegram Admin-команды

Бот поддерживает admin-команды:
- `/health` — статус VM и сервисов
- `/stats` — загрузка за неделю
- `/kick {user}` — выкинуть пользователя из сессии
- `/reboot {vm_id}` — перезагрузить VM

## Rollback

### Откат backend

```bash
ssh root@194.87.134.161
cd /opt/vdi-taxi

# Просмотреть history
git log --oneline -10

# Откатить к конкретному коммиту
git checkout <commit-hash>

# Пересобрать
docker compose -f docker-compose.prod.yml up -d --build
```

### Откат frontend

```bash
# Пересобрать из нужного коммита
git checkout <commit-hash>
npm ci && npm run build

# Скопировать на сервер
rsync -avz dist/ root@194.87.134.161:/opt/vdi-taxi/dist/

# Перезапустить nginx
ssh root@194.87.134.161 "docker compose -f /opt/vdi-taxi/docker-compose.prod.yml restart nginx"
```

## Правила deploy

1. **Все изменения через git** — не редактировать файлы на сервере напрямую
2. **Один коммит = одна задача** — формат `S{sprint}-{task}: описание`
3. **Push после каждого коммита** — не накапливать
4. **Тесты перед deploy** — `pytest backend/tests/ -v && npm test`
5. **Бэкап БД перед миграциями** — `scp root@server:/opt/vdi-taxi/data/vdi_taxi.db ./backup/`
