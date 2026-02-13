# TASKS.md — Roadmap: от прототипа к production

> Generated: 2026-02-13
> Источники: сравнение PRODUCT_SCOPE.md (текущее состояние) и BLUEPRINT.md (целевое)

---

## Gap-анализ: PRODUCT_SCOPE vs BLUEPRINT

| Область | Прототип (SCOPE) | Цель (BLUEPRINT) | Дельта |
|---------|------------------|-------------------|--------|
| Backend | Отсутствует | FastAPI + SQLite | Создать с нуля |
| Auth | Форма без логики | JWT + TOTP | Полная реализация |
| DB | Хардкод в компонентах | 6 таблиц SQLite | Создать схему + миграции |
| API | 0 эндпоинтов | 22 эндпоинта | Создать все |
| Guacamole | Placeholder div | iframe + WebSocket | Интеграция |
| Telegram | Мок-текст | python-telegram-bot | Бот с нуля |
| Session dump | Нет | Chrome tabs + files + clipboard | Скрипт сбора |
| Real-time | Нет | WebSocket (slots, queue) | Добавить |
| Навигация | useState state-machine | URL-роуты | Рефакторинг |
| State management | Локальный useState | Глобальный (context/query) | Рефакторинг |
| Валидация форм | Нет | zod + react-hook-form | Добавить |
| Роли | Нет | admin/user | Добавить |
| Таймер сессии | Хардкод 00:14:32 | Реальный счётчик | Добавить |
| Docker | Нет | docker-compose (4 сервиса) | Создать |
| VPN мониторинг | Хардкод "Connected" | WireGuard status API | Интеграция |
| Тесты | 1 пустой | Покрытие ключевых путей | Написать |

---

## Sprint 0 — Фундамент (cleanup + backend skeleton)

> Цель: чистая кодовая база + backend, который отвечает на запросы + фронт подключён к API

### S0-1. Очистка frontend от мусора [DONE]

| | |
|---|---|
| **Приоритет** | P0 (блокер) |
| **Часы** | 2 |
| **Файлы** | `package.json`, `src/App.css`, `src/components/NavLink.tsx`, `src/components/ui/*`, `index.html`, `vite.config.ts` |

Что сделать:
- Удалить `src/App.css` (Vite boilerplate, не используется)
- Удалить `src/components/NavLink.tsx` (не используется)
- Удалить неиспользуемые shadcn/ui компоненты: `breadcrumb`, `carousel`, `chart`, `collapsible`, `command`, `context-menu`, `drawer`, `hover-card`, `menubar`, `navigation-menu`, `pagination`, `resizable`, `scroll-area`, `sheet`, `sidebar`, `skeleton`, `slider`, `toggle`, `toggle-group`
- Удалить неиспользуемые npm-пакеты: `next-themes`, `cmdk`, `embla-carousel-react`, `react-resizable-panels`, `vaul`, `@tailwindcss/typography`
- Обновить OG-теги в `index.html` (убрать Lovable branding)
- Убрать `lovable-tagger` из `vite.config.ts` и `package.json`

---

### S0-2. URL-навигация вместо useState [DONE]

| | |
|---|---|
| **Приоритет** | P0 (блокер) |
| **Часы** | 4 |
| **Файлы** | `src/App.tsx`, `src/pages/Index.tsx`, `src/pages/Dashboard.tsx` (new), `src/pages/Session.tsx` (new), `src/pages/Admin.tsx` (new), `src/pages/Profile.tsx` (new), `src/pages/Login.tsx` (new), `src/pages/Onboarding.tsx` (new) |

Что сделать:
- Заменить state-machine в `Index.tsx` на роуты в `App.tsx`
- Роуты: `/login`, `/onboarding`, `/dashboard`, `/session/:slotId`, `/session/:id/end`, `/admin`, `/profile`
- Добавить `ProtectedRoute` wrapper (redirect на `/login` если нет токена)
- Добавить `AdminRoute` wrapper (redirect на `/dashboard` если не admin)
- Использовать `useNavigate()` вместо `setScreen()`
- Передавать `slotId`/`sessionId` через URL params вместо props

---

### S0-3. Глобальное состояние (AuthContext + react-query) [DONE]

| | |
|---|---|
| **Приоритет** | P0 (блокер) |
| **Часы** | 4 |
| **Файлы** | `src/context/AuthContext.tsx` (new), `src/lib/api.ts` (new), `src/hooks/use-auth.ts` (new) |

Что сделать:
- Создать `AuthContext`: `user`, `token`, `isAdmin`, `login()`, `logout()`
- Persist token в `localStorage`
- Создать `src/lib/api.ts` — axios/fetch wrapper с base URL и auth header
- Начать использовать `@tanstack/react-query` (уже установлен, но не используется) для data fetching
- Убрать хардкод "Привет, Анна" — заменить на `user.name` из контекста

---

### S0-4. FastAPI backend — skeleton + auth [DONE]

| | |
|---|---|
| **Приоритет** | P0 (блокер) |
| **Часы** | 8 |
| **Файлы** | `backend/` (new directory): `main.py`, `auth.py`, `models.py`, `database.py`, `config.py`, `requirements.txt` |

Что сделать:
- Инициализировать FastAPI проект в `backend/`
- SQLite + SQLAlchemy (или Tortoise ORM): создать таблицы `users`, `slots`, `sessions`, `bookings`, `templates`, `template_slots`, `vm_status`
- `POST /auth/login` — проверка username + password (bcrypt) + TOTP (pyotp)
- `POST /auth/logout` — invalidate token
- `GET /auth/me` — текущий пользователь
- JWT tokens (python-jose)
- CORS middleware для dev (`localhost:8080`)
- Seed-скрипт: создать admin-пользователя + 10 слотов из BLUEPRINT
- `requirements.txt`: `fastapi`, `uvicorn`, `sqlalchemy`, `python-jose`, `pyotp`, `bcrypt`, `pydantic`

---

### S0-5. Подключить LoginScreen к реальному API [DONE]

| | |
|---|---|
| **Приоритет** | P0 (блокер) |
| **Часы** | 3 |
| **Файлы** | `src/components/LoginScreen.tsx`, `src/lib/api.ts`, `src/context/AuthContext.tsx` |

Что сделать:
- Вызывать `POST /auth/login` с `{username, password, totp_code}`
- Добавить валидацию: непустой логин, непустой пароль, OTP ровно 6 цифр
- Показывать ошибки (неверный логин/пароль, неверный OTP)
- При успехе: сохранить token → `AuthContext` → redirect на `/dashboard` (или `/onboarding` если `is_first_login`)
- Добавить loading state на кнопку "Войти"
- Удалить хардкод `firstLogin` из `Index.tsx` — брать из ответа API

---

### S0-6. API для слотов + подключить Dashboard [DONE]

| | |
|---|---|
| **Приоритет** | P1 (критический путь) |
| **Часы** | 6 |
| **Файлы** | `backend/slots.py` (new), `backend/models.py`, `src/components/DashboardScreen.tsx`, `src/lib/api.ts` |

Что сделать:
- Backend: `GET /slots` — вернуть слоты с реальным статусом (available/occupied)
- Backend: `POST /slots/{id}/occupy` — занять слот (создать session, вернуть заглушку guacamole URL)
- Backend: `POST /slots/{id}/release` — освободить слот (завершить session)
- Frontend: заменить хардкод `categories` в `DashboardScreen.tsx:34-75` на `useQuery("slots")`
- Frontend: заменить хардкод статистики `DashboardScreen.tsx:311-315` на данные из API
- Frontend: кнопка "Занять" → вызов API → при успехе navigate на `/session/:id`
- Удалить дублирующийся список сервисов из `ProfileScreen.tsx:8-18`

---

**Sprint 0 итого: ~27 часов**

---

## Sprint 1 — Core функции (bookings, queue, favorites, profile)

> Цель: пользователь может бронировать, вставать в очередь, управлять избранным — всё через API

### S1-1. API + UI для избранных (favorites) [DONE]

| | |
|---|---|
| **Приоритет** | P1 |
| **Часы** | 4 |
| **Файлы** | `backend/profile.py` (new), `backend/models.py`, `src/components/DashboardScreen.tsx`, `src/components/ProfileScreen.tsx` |

Что сделать:
- Backend: `GET /profile` → `{ user, favorites: slotId[] }`
- Backend: `PUT /profile` → `{ telegram?, favorites?: slotId[] }`
- Frontend: единый источник favorites через `useQuery("profile")`
- Синхронизировать favorites между DashboardScreen и ProfileScreen (убрать два независимых `Set<string>`)
- Toggle "★" на Dashboard → `useMutation` → `PUT /profile`
- "Сохранить" на ProfileScreen → `useMutation` → `PUT /profile`

---

### S1-2. API + UI для бронирования (bookings) [DONE]

| | |
|---|---|
| **Приоритет** | P1 |
| **Часы** | 6 |
| **Файлы** | `backend/bookings.py` (new), `backend/models.py`, `src/components/DashboardScreen.tsx` |

Что сделать:
- Backend: `POST /bookings` → `{ slotId, date, startTime, durationMin }` → валидация конфликтов
- Backend: `GET /bookings` → мои брони
- Backend: `DELETE /bookings/{id}` → отмена
- Backend: cron/scheduler — автоотмена если не подключился за 15 мин
- Frontend: модалка бронирования → вызов API при "Забронировать"
- Frontend: валидация: дата не в прошлом, нет конфликтов
- Frontend: показать "Мои брони" на Dashboard или в Profile
- Задействовать `react-hook-form` + `zod` для валидации формы бронирования

---

### S1-3. API + UI для очереди (queue) [DONE]

| | |
|---|---|
| **Приоритет** | P1 |
| **Часы** | 5 |
| **Файлы** | `backend/queue.py` (new), `backend/models.py`, `src/components/DashboardScreen.tsx` |

Что сделать:
- Backend: `POST /slots/{id}/queue` → встать в очередь, вернуть позицию
- Backend: при `POST /slots/{id}/release` → уведомить первого в очереди (через Telegram, задача S2)
- Frontend: кнопка "В очередь" → вызов API → показать позицию в Toast
- Frontend: на карточке занятого слота показать "Очередь: N чел"
- Подготовить WebSocket эндпоинт `/ws/queue` (реализация уведомлений в Sprint 2)

---

### S1-4. API + UI для шаблонов (templates CRUD) [DONE]

| | |
|---|---|
| **Приоритет** | P2 |
| **Часы** | 5 |
| **Файлы** | `backend/templates.py` (new), `backend/models.py`, `src/components/DashboardScreen.tsx`, `src/components/AdminScreen.tsx` |

Что сделать:
- Backend: `GET /templates`, `POST /templates`, `PUT /templates/{id}`, `DELETE /templates/{id}`
- Backend: `POST /templates/{id}/launch` → занять все слоты шаблона → вернуть session
- Frontend Dashboard: заменить хардкод `templates` на `useQuery("templates")`
- Frontend Dashboard: исправить мёртвую кнопку "+ Создать шаблон" (`DashboardScreen.tsx:237`) — привязать к модалке
- Frontend Admin: "Шаблоны" вкладка — заменить хардкод `templateRows` на API
- Frontend Admin: "Создать шаблон" модалка — вызов API при создании, обновить таблицу

---

### S1-5. Реальный таймер сессии [DONE]

| | |
|---|---|
| **Приоритет** | P1 |
| **Часы** | 2 |
| **Файлы** | `src/components/SessionScreen.tsx` |

Что сделать:
- Получать `startedAt` из API (ответ `POST /slots/{id}/occupy`)
- Заменить хардкод `00:14:32` на реальный `useEffect` + `setInterval`
- Формат: `HH:MM:SS`, обновляется каждую секунду
- При закрытии вкладки — сессия продолжается (не завершается, это VDI)

---

### S1-6. Валидация всех форм [DONE]

| | |
|---|---|
| **Приоритет** | P2 |
| **Часы** | 4 |
| **Файлы** | `src/components/LoginScreen.tsx`, `src/components/OnboardingScreen.tsx`, `src/components/DashboardScreen.tsx`, `src/components/admin/ServicesTab.tsx`, `src/components/ProfileScreen.tsx` |

Что сделать:
- Задействовать `react-hook-form` + `zod` (уже установлены)
- Login: email формат, пароль min 6, OTP ровно 6 цифр, все обязательные
- Onboarding: Telegram username формат `@[a-zA-Z0-9_]{5,32}`
- Бронирование: дата >= сегодня (перенести в S1-2)
- Admin: создание шаблона — обязательно выбрать хотя бы 1 слот
- Admin: ServicesTab — URL формат, обязательные поля
- Profile: Telegram формат

---

### S1-7. Admin: пользователи и загрузка из API [DONE]

| | |
|---|---|
| **Приоритет** | P2 |
| **Часы** | 4 |
| **Файлы** | `backend/admin.py` (new), `src/components/AdminScreen.tsx` |

Что сделать:
- Backend: `GET /admin/users` → список пользователей с сессиями за неделю
- Backend: `GET /admin/stats` → загрузка слотов (% за период)
- Frontend: заменить хардкод `users` в `AdminScreen.tsx:34-43` на `useQuery`
- Frontend: заменить хардкод `loadData` в `AdminScreen.tsx:21-32` на `useQuery`
- Добавить рекомендации по загрузке (> 70% → предложить доп. слот)

---

### S1-8. Admin: CRUD сервисов через API [DONE]

| | |
|---|---|
| **Приоритет** | P1 |
| **Часы** | 5 |
| **Файлы** | `backend/admin.py`, `backend/models.py`, `src/components/admin/ServicesTab.tsx` |

Что сделать:
- Backend: `GET /admin/slots` → все слоты с кредами (только для admin)
- Backend: `POST /admin/slots` → добавить слот
- Backend: `PUT /admin/slots/{id}` → изменить (имя, URL, логин, пароль зашифрованный, стоимость, active)
- Frontend: заменить хардкод `initialServices` в `ServicesTab.tsx:25-36` на `useQuery`
- Frontend: удалить пароли из исходного кода (КРИТИЧЕСКАЯ БЕЗОПАСНОСТЬ)
- Frontend: CRUD операции → `useMutation` → обновление таблицы

---

**Sprint 1 итого: ~35 часов**

---

## Sprint 2 — Интеграции (Guacamole, Telegram, Health)

> Цель: пользователь получает реальный VDI-доступ и Telegram-уведомления

### S2-1. Docker Compose: FastAPI + Guacamole + guacd [DONE]

| | |
|---|---|
| **Приоритет** | P0 (блокер для VDI) |
| **Часы** | 6 |
| **Файлы** | `docker-compose.yml` (new), `Dockerfile` (new), `backend/guacamole.py` (new) |

Что сделать:
- `docker-compose.yml`: FastAPI, guacamole, guacd, postgres (для Guacamole)
- Backend: `backend/guacamole.py` — клиент для Guacamole REST API
- Создание/удаление connections при occupy/release
- Генерация auth-token для iframe URL
- Настройка VNC/RDP connections к VM

---

### S2-2. SessionScreen: Guacamole iframe вместо placeholder [DONE]

| | |
|---|---|
| **Приоритет** | P0 (core feature) |
| **Часы** | 4 |
| **Файлы** | `src/components/SessionScreen.tsx` |

Что сделать:
- Получать `guacamoleUrl` из ответа `POST /slots/{id}/occupy`
- Заменить placeholder (`SessionScreen.tsx:37-41`) на `<iframe src={guacamoleUrl}>`
- Fullscreen mode для iframe
- Обработка disconnect (WebSocket close → показать reconnect dialog)
- Мобильная адаптация (touch events для VDI)

---

### S2-3. SessionEndScreen: реальные данные сессии [DONE]

| | |
|---|---|
| **Приоритет** | P1 |
| **Часы** | 3 |
| **Файлы** | `src/components/SessionEndScreen.tsx`, `backend/sessions.py` |

Что сделать:
- Backend: `POST /slots/{id}/release` → собрать артефакты (tabs, files) → вернуть summary
- Backend: `GET /sessions/{id}/summary` → данные для SessionEndScreen
- Frontend: заменить хардкод "13:42–14:18 (36 мин)", "4 вкладки", "1 файл" на реальные данные из API
- Frontend: показывать реальное Telegram-сообщение (или статус "Отправлено" / "Ошибка")

---

### S2-4. Session Dump скрипт [DONE — UNBLOCKED]

| | |
|---|---|
| **Приоритет** | P1 |
| **Часы** | 8 |
| **Файлы** | `backend/dump.py` (new), `scripts/collect_dump.sh` (new) |

Что сделать:
- Скрипт на VM: собрать Chrome History (SQLite), открытые вкладки, downloads, clipboard (xclip), screenshot (scrot)
- Упаковать в `session_{id}_dump.tar.gz`
- Передать на backend через SSH/SCP
- Backend: сохранить путь в `sessions.dump_path`
- Retention: 14 дней, cron для очистки

---

### S2-5. Telegram Bot: базовый [DONE — UNBLOCKED]

| | |
|---|---|
| **Приоритет** | P1 |
| **Часы** | 8 |
| **Файлы** | `backend/telegram_bot.py` (new), `backend/config.py` |

Что сделать:
- `python-telegram-bot` бот с командами: `/start`, `/status`, `/help`
- Привязка пользователя: `/start` → сохранить `chat_id` в `users.telegram_id`
- Уведомления юзеру:
  - Session dump (файл + summary текст)
  - "Слот освободился" (при выходе из очереди)
  - "Бронь через 5 минут"
- Webhook mode для production

---

### S2-6. Telegram Bot: admin-команды [DONE — UNBLOCKED]

| | |
|---|---|
| **Приоритет** | P2 |
| **Часы** | 4 |
| **Файлы** | `backend/telegram_bot.py` |

Что сделать:
- Команды admin: `/health`, `/kick {user}`, `/reboot {vm_id}`, `/stats`
- Алерты админу: VM down, cookie expired, подписка истекает через 3 дня
- Еженедельный отчёт загрузки (cron → формат Telegram message)

---

### S2-7. Admin Health: реальные данные VM и сервисов [DONE — UNBLOCKED]

| | |
|---|---|
| **Приоритет** | P2 |
| **Часы** | 6 |
| **Файлы** | `backend/health.py` (new), `src/components/admin/HealthTab.tsx` |

Что сделать:
- Backend: `GET /admin/health` → опрос VM по SSH (uptime, load, disk)
- Backend: `POST /admin/vm/{id}/reboot` → SSH reboot
- Backend: VPN статус (WireGuard `wg show`)
- Backend: проверка cookies сервисов (curl + check auth)
- Frontend: заменить хардкод `vms` в `HealthTab.tsx:6-11` на `useQuery`
- Frontend: заменить хардкод `services` в `HealthTab.tsx:13-24` на `useQuery`
- Frontend: заменить хардкод VPN в `HealthTab.tsx:71-79` на `useQuery`
- Frontend: кнопка "Перезагрузить" → `useMutation` → реальный вызов

---

### S2-8. WebSocket: real-time статус слотов [DONE]

| | |
|---|---|
| **Приоритет** | P2 |
| **Часы** | 5 |
| **Файлы** | `backend/websocket.py` (new), `src/hooks/use-slots-ws.ts` (new), `src/components/DashboardScreen.tsx` |

Что сделать:
- Backend: `WS /ws/slots` → broadcast при occupy/release/queue change
- Frontend: хук `useSlotsWebSocket()` → обновлять react-query cache при получении WS message
- Dashboard: статусы "Свободен/Занят" обновляются без перезагрузки
- Fallback: polling каждые 30 сек если WS не подключился

---

**Sprint 2 итого: ~44 часа**

---

## Sprint 3 — Polish, Deploy, Testing

> Цель: production-ready деплой на Timeweb, покрытие тестами, PWA

### S3-1. Onboarding: реальная привязка Telegram [DONE]

| | |
|---|---|
| **Приоритет** | P1 |
| **Часы** | 3 |
| **Файлы** | `src/components/OnboardingScreen.tsx`, `backend/auth.py` |

Что сделать:
- Шаг 1: ввод `@username` → `PUT /profile { telegram: "@username" }` → backend отправляет confirmation через бот
- Шаг 2: placeholder скриншота → вставить реальное изображение PWA-инструкции
- Шаг 3: placeholder видео → вставить реальное видео или убрать шаг
- Backend: `PUT /auth/onboarding-complete` → `is_first_login = false`

---

### S3-2. Profile: история сессий [DONE]

| | |
|---|---|
| **Приоритет** | P2 |
| **Часы** | 4 |
| **Файлы** | `src/components/ProfileScreen.tsx`, `backend/profile.py` |

Что сделать:
- Backend: `GET /profile/sessions` → история сессий с dump ссылками
- Frontend: новая секция в ProfileScreen — таблица "Мои сессии"
- Ссылка на dump файл (если ещё не истёк 14-дневный срок)

---

### S3-3. Ansible playbooks для VM [DONE]

| | |
|---|---|
| **Приоритет** | P2 |
| **Часы** | 6 |
| **Файлы** | `ansible/` (new directory): `inventory.yml`, `playbooks/setup_vm.yml`, `playbooks/update_chrome.yml` |

Что сделать:
- Playbook: установить Chrome + профили для каждого сервиса
- Playbook: обновить cookies/логины
- Playbook: установить dump-скрипт
- Inventory: 5 VM

---

### S3-4. Docker Compose: полный production стек [DONE]

| | |
|---|---|
| **Приоритет** | P1 |
| **Часы** | 6 |
| **Файлы** | `docker-compose.yml`, `docker-compose.prod.yml` (new), `Dockerfile`, `nginx.conf` (new) |

Что сделать:
- Production compose: FastAPI (gunicorn), Nginx (static + reverse proxy), Guacamole + guacd, SQLite volume
- Nginx: serve frontend build + proxy `/api/*` → FastAPI + proxy `/guacamole/*`
- Health checks для всех сервисов
- Environment variables: `.env.example`
- SSL: Let's Encrypt (certbot)

---

### S3-5. Frontend тесты [DONE]

| | |
|---|---|
| **Приоритет** | P2 |
| **Часы** | 6 |
| **Файлы** | `src/test/` (multiple new files) |

Что сделать:
- Заменить `example.test.ts` реальными тестами
- Тесты навигации: login → dashboard → session → sessionEnd → dashboard
- Тесты LoginScreen: валидация, ошибки API, успешный вход
- Тесты DashboardScreen: рендер слотов, toggle favorites, book
- Тесты AdminScreen: рендер вкладок, CRUD операции

---

### S3-6. Backend тесты [DONE]

| | |
|---|---|
| **Приоритет** | P2 |
| **Часы** | 6 |
| **Файлы** | `backend/tests/` (new): `test_auth.py`, `test_slots.py`, `test_bookings.py`, `test_admin.py` |

Что сделать:
- pytest + httpx (AsyncClient)
- Тесты auth: login, logout, invalid credentials, TOTP
- Тесты slots: occupy, release, queue
- Тесты bookings: create, conflict, cancel, expire
- Тесты admin: CRUD services, users list, health

---

### S3-7. PWA: Service Worker + push [DONE]

| | |
|---|---|
| **Приоритет** | P3 |
| **Часы** | 4 |
| **Файлы** | `public/sw.js` (new), `public/manifest.json`, `src/main.tsx` |

Что сделать:
- Service Worker: кэширование static assets, offline fallback
- Обновить `manifest.json`: иконки 192x192 и 512x512, theme_color
- Регистрация SW в `main.tsx`
- Push-уведомления (Web Push API) как дополнение к Telegram

---

### S3-8. Deploy на Timeweb Cloud [DONE]

| | |
|---|---|
| **Приоритет** | P1 |
| **Часы** | 4 |
| **Файлы** | `docker-compose.prod.yml`, документация |

Что сделать:
- Создать VPS на Timeweb Cloud
- Docker Compose up (prod)
- Настроить DNS
- SSL сертификат
- Smoke test: логин → dashboard → occupy → session → release
- Мониторинг: uptime check

---

**Sprint 3 итого: ~39 часов**

---

## Sprint 4 — UX Polish & Доработки

> Цель: полировка UI/UX — модалки, мобильная адаптация, контраст, онбординг

### S4-1. Модалка бронирования — 📅 на всех слотах [DONE]

| | |
|---|---|
| **Приоритет** | P1 |
| **Часы** | 2 |
| **Файлы** | `src/components/DashboardScreen.tsx` |

Что сделать:
- При клике на 📅 открывать модалку с выбором даты, времени, длительности
- Разрешить бронирование и для занятых слотов (на будущее время)
- Сохранять через POST /bookings
- ✅ Базовая модалка уже реализована в S1-2, доработка: показывать 📅 на всех слотах (не только свободных)

---

### S4-2. Модалка "Создать шаблон" на Dashboard [DONE]

| | |
|---|---|
| **Приоритет** | P1 |
| **Часы** | 3 |
| **Файлы** | `src/components/DashboardScreen.tsx` |

Что сделать:
- При клике "+ Создать шаблон" открывать форму: название, иконка, выбор слотов, URL
- Сохранять через POST /templates
- Обновлять список шаблонов после создания

---

### S4-3. Админ — вкладка "Здоровье" — cookie статусы [DONE]

| | |
|---|---|
| **Приоритет** | P2 |
| **Часы** | 1 |
| **Файлы** | `src/components/admin/HealthTab.tsx` |

Что сделать:
- Статусы 5 VM (online/offline) — ✅ уже есть
- VPN статус — ✅ уже есть
- Статусы cookie каждого сервиса — ✅ уже есть
- Данные из GET /admin/health — ✅ уже подключено
- Доработка: добавить кнопку "Обновить cookies" + индикатор auto-refresh

---

### S4-4. Админ — редактирование сервисов [DONE]

| | |
|---|---|
| **Приоритет** | P1 |
| **Часы** | 1 |
| **Файлы** | `src/components/admin/ServicesTab.tsx` |

Что сделать:
- Кнопки "Редактировать" и "Вкл/Выкл" — ✅ уже есть
- Модалка с полями: логин, пароль (показать/скрыть), стоимость, тоггл активности — ✅ уже есть
- Доработка: добавить текстовые лейблы к кнопкам для ясности

---

### S4-5. Профиль — поле Telegram @username [DONE]

| | |
|---|---|
| **Приоритет** | P2 |
| **Часы** | 1 |
| **Файлы** | `src/components/ProfileScreen.tsx` |

Что сделать:
- Поле Telegram @username с валидацией — ✅ уже есть
- Сохранение через PUT /profile — ✅ уже есть
- Доработка: добавить индикатор успешной привязки

---

### S4-6. Экран онбординга — улучшения [DONE]

| | |
|---|---|
| **Приоритет** | P2 |
| **Часы** | 2 |
| **Файлы** | `src/components/OnboardingScreen.tsx` |

Что сделать:
- 3 шага: Telegram, PWA install, видео-тур — ✅ уже есть
- Доработка: добавить иконки к шагам, улучшить визуальное оформление
- Улучшить step indicator (прогресс-бар вместо точек)

---

### S4-7. Мобильная адаптация [DONE]

| | |
|---|---|
| **Приоритет** | P1 |
| **Часы** | 4 |
| **Файлы** | `src/components/DashboardScreen.tsx`, `src/components/SessionScreen.tsx`, `src/index.css` |

Что сделать:
- Карточки слотов в колонку до 768px (1 колонка вместо 2-3)
- Бургер-меню — ✅ уже есть
- Кнопка "Освободить" крупнее на мобилках
- Отступы и spacing для мобилок

---

### S4-8. Светлая тема логина + контраст ошибок [DONE]

| | |
|---|---|
| **Приоритет** | P1 |
| **Часы** | 2 |
| **Файлы** | `src/components/LoginScreen.tsx`, `src/index.css` |

Что сделать:
- Улучшить контраст ошибок валидации на тёмном фоне
- Сделать фон карточки логина светлее для контраста
- Ошибки валидации: больший шрифт, яркий фон для заметности

---

**Sprint 4 итого: ~16 часов**

---

## Сводка

| Sprint | Фокус | Задач | Часов | Результат |
|--------|-------|-------|-------|-----------|
| **S0** | Фундамент | 6 | ~27 | Чистый фронт + backend skeleton + auth + слоты из API |
| **S1** | Core функции | 8 | ~35 | Бронирование, очередь, избранные, шаблоны, admin — всё через API |
| **S2** | Интеграции | 8 | ~44 | Guacamole VDI, Telegram bot, session dump, real-time WS |
| **S3** | Polish + Deploy | 8 | ~39 | Тесты, PWA, Ansible, Docker prod, Timeweb deploy |
| **S4** | UX Polish | 8 | ~16 | Модалки, мобильная адаптация, контраст, онбординг |
| **Всего** | | **38** | **~161** | Production-ready VDI Такси + UX polish |

---

## Зависимости между задачами

```
S0-1 (cleanup) ──┐
S0-2 (routing) ──┼──→ S0-3 (auth context) ──→ S0-4 (backend) ──→ S0-5 (login API) ──→ S0-6 (slots API)
                 │                                                        │
                 │                                                        ↓
                 │                                    ┌──── S1-1 (favorites)
                 │                                    ├──── S1-2 (bookings)
                 │                                    ├──── S1-3 (queue)
                 │                                    ├──── S1-4 (templates)
                 │                                    ├──── S1-5 (timer)
                 │                                    ├──── S1-6 (validation)
                 │                                    ├──── S1-7 (admin users/stats)
                 │                                    └──── S1-8 (admin services)
                 │                                                │
                 │                                                ↓
                 │                              S2-1 (docker) ──→ S2-2 (guacamole iframe)
                 │                                    │
                 │                                    ├──→ S2-3 (session end) ──→ S2-4 (dump script)
                 │                                    │
                 │                              S2-5 (tg bot basic) ──→ S2-6 (tg admin)
                 │                                    │
                 │                              S2-7 (health API)
                 │                              S2-8 (websocket)
                 │                                                │
                 │                                                ↓
                 │                              S3-1 (onboarding real)
                 │                              S3-2 (session history)
                 │                              S3-3 (ansible)
                 │                              S3-4 (docker prod) ──→ S3-8 (deploy)
                 │                              S3-5 (frontend tests)
                 │                              S3-6 (backend tests)
                 └──────────────────────────── S3-7 (PWA)
```

**Критический путь**: S0-4 → S0-5 → S0-6 → S1-2 → S2-1 → S2-2 → S3-4 → S3-8
