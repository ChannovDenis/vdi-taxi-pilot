# Commit Message Format

## Структура

```
<type>(<scope>): <subject>

<body>

<footer>
```

## Types

| Type | Описание |
|------|----------|
| `feat` | Новая фича |
| `fix` | Исправление бага |
| `docs` | Только документация |
| `style` | Форматирование (не влияет на код) |
| `refactor` | Рефакторинг (не фича, не фикс) |
| `perf` | Улучшение производительности |
| `test` | Добавление тестов |
| `chore` | Изменения build/CI/конфигов |

## Scopes (по модулям)

| Scope | Что покрывает |
|-------|--------------|
| `auth` | Аутентификация, JWT, TOTP |
| `slots` | Слоты, occupy/release |
| `bookings` | Бронирование |
| `queue` | Очереди |
| `templates` | Шаблоны задач |
| `session-dump` | Session dump + Telegram delivery |
| `telegram` | Telegram bot |
| `admin` | Админ-панель |
| `health` | Мониторинг VM/сервисов |
| `neko` | Neko WebRTC контейнеры |
| `deploy` | Docker, Nginx, deploy scripts |
| `frontend` | Общие фронтенд-изменения |
| `backend` | Общие бэкенд-изменения |

## Примеры

### Feature

```
feat(session-dump): add Telegram delivery v2

- Split files small (<20MB) and large (>20MB)
- Send files individually to avoid rate limits
- Provide folder link for large files
- Remove tar.gz compression

Closes #45
```

### Bug fix

```
fix(telegram): resolve worker conflict

Change uvicorn workers from 2 to 1 to avoid
"Conflict: terminated by other getUpdates" error.

Related: COMMON_ERRORS.md #2
```

### Documentation

```
docs: add deployment checklist and rollback procedure
```

### Chore

```
chore(deploy): update docker-compose for Neko WebRTC migration
```

## Sprint tasks (legacy format)

Для задач из TASKS.md допустим формат:

```
S{sprint}-{task}: описание
```

Пример:
```
S4-3: Admin Health tab - manual refresh button
```

## Правила

1. **Subject** - до 72 символов, начинается с маленькой буквы, без точки в конце
2. **Body** - через пустую строку от subject, объясняет "зачем" а не "что"
3. **Footer** - ссылки на issues, COMMON_ERRORS.md
4. **Один коммит = одно логическое изменение**
5. **Push после каждого коммита** - не накапливать
