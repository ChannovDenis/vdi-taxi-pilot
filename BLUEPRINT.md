# VDI «Такси» — Blueprint v4.0

## Что строим

Веб-портал, через который 15 сотрудников бронируют AI-сервисы
(Perplexity, Gemini, ChatGPT и др.), получают удалённый рабочий стол
с залогиненным аккаунтом, а по завершении — автоматический дамп сессии
в Telegram.

## Стек

- Frontend: React + Vite + Tailwind + shadcn/ui (уже есть из Lovable)
- Backend: FastAPI + SQLite (нужно создать)
- Telegram Bot: python-telegram-bot
- VDI Gateway: Apache Guacamole (Docker)
- VPN: WireGuard
- Deploy: Docker Compose на Timeweb Cloud VPS
- Синхронизация VM: Ansible

## Модель данных

### users

- id, name, telegram_id, totp_secret, is_admin, password_hash

### slots

- id (ppx-1, gem-1...), service_name, tier, category,
  chrome_profile, monthly_cost, login_encrypted,
  password_encrypted, is_active, url

### sessions

- id, user_id, slot_id, vm_id, started_at, ended_at,
  end_reason (manual/timeout/disconnect), dump_path, dump_sent

### vm_status

- vm_id, is_healthy, active_user, active_slot, updated_at

### bookings

- id, user_id, slot_id, date, start_time, duration_min,
  status (active/cancelled/expired)

### templates

- id, name, icon, slot_ids (JSON array), url, created_by

## API эндпоинты

### Auth

- POST /auth/login {username, password, totp_code} → {token}
- POST /auth/logout

### Slots

- GET /slots → список с реалтайм-статусами
- POST /slots/{id}/occupy → {vm_id, guacamole_url}
- POST /slots/{id}/release → {session_id, dump_url}
- POST /slots/{id}/queue → встать в очередь

### Bookings

- GET /bookings → мои брони
- POST /bookings → создать бронь
- DELETE /bookings/{id} → отменить

### Admin

- GET /admin/stats → загрузка, очереди, рекомендации
- GET /admin/slots → все слоты с кредами
- POST /admin/slots → добавить слот
- PUT /admin/slots/{id} → изменить (логин/пароль/вкл-выкл)
- GET /admin/health → статус VM, VPN, cookies
- POST /admin/vm/{id}/reboot

### Profile

- GET /profile → мои данные, избранные, история
- PUT /profile → обновить telegram, избранные
- GET /profile/sessions → история сессий с дампами

### Templates

- GET /templates
- POST /templates → создать
- POST /templates/{id}/launch → запустить (мультислот)

## Слоты (начальная конфигурация)

- ppx-1, ppx-2, ppx-3: Perplexity Max ($200 x3)
- gem-dt: Gemini Ultra Deep Think ($250)
- gem-veo: Gemini Ultra Veo+Flow ($250)
- nbp: Nano Banana Pro ($200)
- nb-drive: NotebookLM + Drive ($250)
- gpt-1: ChatGPT Pro ($200)
- hf-1: Higgsfield Ultimate ($50)
- lov-1: Lovable Team ($50)

## Session Dump (при завершении)

Собирает: tabs (Chrome History SQLite), chat_export (Chrome extension),
downloads, clipboard (xclip), screenshot (scrot), metadata.
Отправляет в Telegram юзера. Хранение 14 дней на file server.

## Telegram Bot

Юзеру: дамп сессии, уведомление об очереди, напоминание о брони.
Админу: алерты (VM down, cookie expired, подписка истекает),
еженедельный отчёт загрузки.
Команды: /status, /health, /kick {user}, /reboot {vm_id}
