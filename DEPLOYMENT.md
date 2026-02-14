# Процедура деплоя на Production

## Серверы

| Параметр | Значение |
|----------|----------|
| Production | 194.87.134.161:8088 |
| SSH | root@194.87.134.161 |
| Путь | /opt/vdi-taxi/ |
| Хостинг | Timeweb Cloud VPS |
| OS | Ubuntu (Docker host) |

## Текущий стек на сервере

```
Nginx (порт 8088)
  / .............. Frontend static (React build)
  /api/* ......... FastAPI (порт 8000)
  /neko/* ........ Neko WebRTC rooms
  /vault/* ....... Vaultwarden (порт 80)

Docker Compose services:
  nginx           (nginx:alpine)
  api             (python:3.11-slim + FastAPI)
  neko-ppx-1..3   (m1k1o/neko:chromium) x10
  vaultwarden     (vaultwarden/server:latest)
```

---

## Automated Deploy (рекомендуемый)

### Через deploy script:

```bash
# Локально (из репозитория)
./scripts/deploy.sh
```

Скрипт делает:
1. SSH в сервер
2. `cd /opt/vdi-taxi`
3. `git pull origin main`
4. `docker compose -f docker-compose.prod.yml down`
5. `docker compose -f docker-compose.prod.yml --profile build run frontend-builder`
6. `docker compose -f docker-compose.prod.yml up -d`

---

## Manual Deploy (только если automated не работает)

### 1. SSH в сервер

```bash
ssh root@194.87.134.161
cd /opt/vdi-taxi
```

### 2. Backup текущей версии

```bash
# Создать backup tag
git tag backup-$(date +%Y%m%d-%H%M)
```

### 3. Pull изменений

```bash
git pull origin main
```

### 4. Rebuild и restart

```bash
# Остановить
docker compose -f docker-compose.prod.yml down

# Rebuild frontend (если были изменения в src/)
docker compose -f docker-compose.prod.yml --profile build run frontend-builder

# Restart с новым кодом
docker compose -f docker-compose.prod.yml up -d
```

### 5. Проверка

```bash
# Логи
docker compose -f docker-compose.prod.yml logs -f api

# Здоровье
curl http://localhost:8088/api/health

# Веб-интерфейс
open http://194.87.134.161:8088
```

---

## Rollback (откат)

Если что-то сломалось:

```bash
# Найти последний рабочий backup tag
git tag | grep backup

# Откат к tag
git checkout backup-20260214-1830

# Restart
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

---

## Чеклист перед деплоем

- [ ] Все изменения закоммичены в main
- [ ] Локально протестировано (`pytest backend/tests/ -v && npm test`)
- [ ] CHANGELOG.md обновлён
- [ ] .env переменные проверены (нет новых незаданных)
- [ ] Создан backup tag на сервере
- [ ] Уведомить пользователей (если breaking changes)

---

## Мониторинг

### Health check

```bash
# API health
curl http://194.87.134.161:8088/api/health

# Docker статус
ssh root@194.87.134.161 "docker compose -f /opt/vdi-taxi/docker-compose.prod.yml ps"

# RAM
ssh root@194.87.134.161 "free -h"
```

### Логи

```bash
ssh root@194.87.134.161

# Все сервисы
docker compose -f /opt/vdi-taxi/docker-compose.prod.yml logs --tail 50

# Только API
docker compose -f /opt/vdi-taxi/docker-compose.prod.yml logs api --tail 100

# Neko комнаты
docker logs vdi-taxi-neko-ppx-1 --tail 50
```

### Telegram Admin-команды

Бот поддерживает:
- `/health` - статус VM и сервисов
- `/stats` - загрузка за неделю
- `/kick {user}` - выкинуть пользователя из сессии
- `/reboot {vm_id}` - перезагрузить VM

---

## Частые проблемы при deploy

### Frontend не обновился
**Причина:** Браузер кэширует старые файлы
**Решение:** Hard refresh (Ctrl+Shift+R) или очистить cache

### Backend показывает старый код
**Причина:** uvicorn не перезагрузился
**Решение:**
```bash
docker compose -f docker-compose.prod.yml restart api
```

### Neko комнаты не стартуют
**Причина:** Нехватка памяти или порты заняты
**Решение:**
```bash
docker ps -a | grep neko
docker logs vdi-taxi-neko-ppx-1 --tail 50
free -h
```

### .env не скопирован
**Симптом:** JWT secret = `change-me-in-production`
**Решение:**
```bash
scp .env root@194.87.134.161:/opt/vdi-taxi/.env
```

---

## Правила deploy

1. **Все изменения через git** - не редактировать файлы на сервере напрямую
2. **Один коммит = одна задача** - формат: `type(scope): описание`
3. **Push после каждого коммита** - не накапливать
4. **Тесты перед deploy** - `pytest backend/tests/ -v && npm test`
5. **Backup перед deploy** - `git tag backup-$(date +%Y%m%d-%H%M)`
6. **Бэкап БД перед миграциями** - `scp root@server:/opt/vdi-taxi/data/vdi_taxi.db ./backup/`
