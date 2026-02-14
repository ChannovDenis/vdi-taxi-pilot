# Known Issues & Частые ошибки — VDI Такси

> База знаний по проблемам, с которыми сталкивались при разработке и эксплуатации.

---

## Production Issues

### 1. GitHub и Production рассинхронизированы

**Проблема:** Изменения на сервере (миграция Guacamole → Neko, конфиги) сделаны через SSH/SCP и не закоммичены в GitHub.

**Влияние:** Откат через git невозможен; новый разработчик не может воспроизвести production среду из репозитория.

**Решение:** Синхронизировать production код с GitHub. Все изменения делать через git → push → deploy, не через прямое редактирование на сервере.

---

### 2. Neko WebRTC комнаты не стартуют

**Симптом:** Пользователь видит пустой экран вместо VDI.

**Возможные причины:**
- Контейнер Neko упал (проверить `docker ps`)
- Порт занят другим контейнером
- Недостаточно RAM на VPS

**Диагностика:**
```bash
ssh root@194.87.134.161
docker compose -f docker-compose.prod.yml ps
docker logs <neko-container-name> --tail 50
free -h
```

**Решение:** `docker compose -f docker-compose.prod.yml restart <container>`

---

### 3. Guacamole auth token expires

**Симптом:** `401 Unauthorized` при попытке occupy слот.

**Причина:** Guacamole auth token живёт ограниченное время. Backend получает token при каждом запросе, но если Guacamole перезагрузился — cached session протухает.

**Решение:** В коммите `bccc028` реализована логика fresh auth tokens при каждом occupy. Если проблема повторяется — проверить что Guacamole контейнер здоров.

---

### 4. SQLite lock при параллельных запросах

**Симптом:** `database is locked` в логах FastAPI.

**Причина:** SQLite не поддерживает concurrent writes. При 2+ workers uvicorn может быть конфликт.

**Решение:** Production compose использует `--workers 1`. Если нужно масштабирование — мигрировать на PostgreSQL.

---

### 5. Session dump не отправляется в Telegram

**Симптом:** Сессия завершается, но Telegram-уведомление не приходит.

**Возможные причины:**
- `VDI_TELEGRAM_BOT_TOKEN` не задан в `.env`
- Пользователь не привязал Telegram (`telegram_id` пустой в БД)
- Бот заблокирован пользователем
- SSH-подключение к серверу для сбора dump не работает

**Диагностика:**
```bash
docker logs <api-container> --tail 100 | grep -i telegram
```

---

## Development Issues

### 6. Login form — пустые поля проходят валидацию

**Статус:** Исправлено в `e43210f`

**Было:** Кнопка "Войти" работала с пустыми полями.
**Стало:** zod-схема валидирует: email формат, пароль >= 6 символов, OTP ровно 6 цифр.

---

### 7. Favorites не синхронизируются между Dashboard и Profile

**Статус:** Исправлено в `c7d4bd9` (S1-1)

**Было:** Два независимых `Set<string>` в DashboardScreen и ProfileScreen.
**Стало:** Единый источник через `useQuery("profile")` + react-query cache.

---

### 8. Tooltip dependency mismatch

**Статус:** Исправлено в `192d595`

**Было:** Ошибка при рендере tooltip из-за несовпадения версий Radix UI.
**Стало:** Обновлены зависимости.

---

### 9. Docker Compose — Guacamole не стартует (initdb)

**Симптом:** `guac-db` контейнер healthy, но Guacamole показывает ошибку базы.

**Причина:** PostgreSQL для Guacamole нужен init-скрипт с таблицами.

**Решение:** SQL-скрипт лежит в `docker/guac-initdb/`. При первом запуске он автоматически создаёт таблицы. Если БД уже создана без скрипта — нужно пересоздать volume:
```bash
docker compose down -v  # ВНИМАНИЕ: удалит данные!
docker compose up -d
```

---

### 10. Frontend build — shadcn/ui компоненты не найдены

**Симптом:** `Module not found: @/components/ui/...`

**Причина:** Path alias `@` → `./src` настроен в `vite.config.ts` и `tsconfig.json`. Если один из файлов повреждён — импорты ломаются.

**Решение:** Проверить `vite.config.ts` содержит `resolve.alias` и `tsconfig.json` содержит `paths`.

---

## Типичные ошибки при deploy

### 11. .env не скопирован на сервер

**Симптом:** Backend стартует с дефолтными значениями (JWT secret = `change-me-in-production`).

**Решение:** Убедиться что `scripts/deploy.sh` шаг 3 выполнился. Или вручную:
```bash
scp .env root@194.87.134.161:/opt/vdi-taxi/.env
```

---

### 12. Frontend build не обновился

**Симптом:** Старый UI после deploy.

**Причина:** Nginx кэширует static файлы из volume `frontend-build`.

**Решение:**
```bash
docker compose -f docker-compose.prod.yml --profile build up frontend-builder
docker compose -f docker-compose.prod.yml restart nginx
```

---

## Шаблон для новых issues

```markdown
### N. Краткое описание

**Симптом:** Что видит пользователь/разработчик
**Причина:** Почему это происходит
**Диагностика:**
\```bash
команды для проверки
\```
**Решение:** Как починить
**Статус:** Активная / Исправлено в `commit-hash`
```
