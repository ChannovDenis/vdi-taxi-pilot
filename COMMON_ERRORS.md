# База знаний: Частые ошибки и решения

> Обновлять при каждой новой ошибке. Формат: Симптом -> Причина -> Решение.

---

## 1. Unicode "абракадабра" в UI

**Симптом:** Русский текст показывается как `\u0430\u0431\u0440\u0430\u043a\u0430\u0434\u0430\u0431\u0440\u0430`

**Причина:** Write tool записывает unicode escapes вместо UTF-8

**Решение:**
```python
import re
def fix_unicode_escapes(text):
    return re.sub(r'\\u([0-9a-fA-F]{4})',
                   lambda m: chr(int(m.group(1), 16)), text)
```

---

## 2. Telegram "Conflict: terminated by other getUpdates"

**Симптом:** Бот не отправляет сообщения, в логах `Conflict: terminated by other getUpdates request`

**Причина:** 2+ uvicorn workers запускают `bot.start()` одновременно

**Решение:** `uvicorn --workers 1` (уже настроено в docker-compose.prod.yml)

**Коммит:** `cef732e`

---

## 3. Chrome "Blocked by your organization"

**Симптом:** Загрузки файлов в Neko/VDI блокируются

**Причина:** `DownloadRestrictions: 3` в chrome-policies.json

**Решение:** Установить `DownloadRestrictions: 0` в политиках Chrome внутри Neko контейнера

---

## 4. nginx "host not found in upstream guacamole"

**Симптом:** 502 Bad Gateway

**Причина:** Guacamole контейнер остановлен (удалён при миграции на Neko), но nginx.conf ссылается на него

**Решение:** Удалить `location /guacamole/ {}` блок из `nginx.conf` если Guacamole больше не используется

---

## 5. Read-only filesystem при записи в Neko

**Симптом:** `Cannot write to /home/neko/Downloads`

**Причина:** Mount volume с флагом `:ro`

**Решение:** Убрать `:ro` - использовать `:rw` или без флага:
```yaml
volumes:
  - neko-downloads-ppx1:/home/neko/Downloads  # без :ro!
```

---

## 6. "Double quotes" ошибки в JSON/Python

**Симптом:** `SyntaxError: invalid syntax`

**Причина:** Смешивание `'` и `"` или неэкранированные кавычки

**Решение:**
- Python строки: используй `f"..."` или `"..."`
- JSON: только двойные кавычки `""`
- Внутри строк: используй `\"` или `'`

---

## 7. SQLite "database is locked"

**Симптом:** `OperationalError: database is locked` в логах FastAPI

**Причина:** SQLite не поддерживает concurrent writes. При 2+ workers бывает конфликт

**Решение:** Production запускается с `--workers 1`. Если нужно масштабирование - мигрировать на PostgreSQL

---

## 8. Session dump не отправляется в Telegram

**Симптом:** Сессия завершается, но Telegram-уведомление не приходит

**Причины (проверять по порядку):**
1. `VDI_TELEGRAM_BOT_TOKEN` не задан в `.env`
2. Пользователь не привязал Telegram (`telegram_id` пустой в БД)
3. Бот заблокирован пользователем
4. SSH-подключение к серверу для сбора dump не работает

**Диагностика:**
```bash
docker logs vdi-taxi-api-1 --tail 100 | grep -i telegram
```

---

## 9. Frontend build не обновился после deploy

**Симптом:** Старый UI после deploy

**Причина:** Nginx кэширует static файлы из volume `frontend-build`

**Решение:**
```bash
# На сервере:
docker compose -f docker-compose.prod.yml --profile build run frontend-builder
docker compose -f docker-compose.prod.yml restart nginx
```

**У пользователя:** Hard refresh `Ctrl+Shift+R`

---

## 10. Guacamole auth token expires

**Симптом:** `401 Unauthorized` при попытке occupy слот (актуально если Guacamole ещё используется)

**Причина:** Guacamole auth token живёт ограниченное время

**Решение:** В коммите `bccc028` реализована логика fresh auth tokens при каждом occupy

---

## 11. .env не скопирован на сервер

**Симптом:** Backend стартует с дефолтными значениями (JWT secret = `change-me-in-production`)

**Решение:**
```bash
scp .env root@194.87.134.161:/opt/vdi-taxi/.env
docker compose -f docker-compose.prod.yml restart api
```

---

## 12. Port уже занят (локальная разработка)

**Симптом:** `Address already in use :8000` или `:5173`

**Решение:**
```bash
# Linux/Mac
lsof -i :8000
kill -9 <PID>

# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

---

## 13. Docker Compose - Guacamole initdb

**Симптом:** `guac-db` healthy, но Guacamole показывает ошибку базы

**Причина:** PostgreSQL для Guacamole нужен init-скрипт с таблицами

**Решение:** SQL-скрипт в `docker/guac-initdb/`. Если БД уже создана без скрипта:
```bash
docker compose down -v  # ВНИМАНИЕ: удалит данные!
docker compose up -d
```

---

## 14. Neko комнаты не стартуют

**Симптом:** Пользователь видит пустой экран вместо VDI

**Причины:**
- Контейнер упал (проверить `docker ps`)
- Порт занят другим контейнером
- Недостаточно RAM на VPS

**Диагностика:**
```bash
ssh root@194.87.134.161
docker ps -a | grep neko
docker logs vdi-taxi-neko-ppx-1 --tail 50
free -h
```

**Решение:** `docker compose -f docker-compose.prod.yml restart <container>`

---

## Шаблон для новых ошибок

```markdown
## N. Краткое описание

**Симптом:** Что видит пользователь/разработчик
**Причина:** Почему это происходит
**Диагностика:**
\```bash
команды для проверки
\```
**Решение:** Как починить
**Коммит:** `hash` (если есть фикс)
```
