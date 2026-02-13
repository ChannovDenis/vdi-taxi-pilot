"""Telegram Bot for VDI Taxi — user notifications + admin commands.

User commands:
  /start — link Telegram account to VDI user
  /status — show current session and slot info
  /help — list commands

Admin commands:
  /health — VM and service health summary
  /kick {user} — force-release a user's slot
  /reboot {vm_id} — reboot a VM
  /stats — weekly utilization stats

Notifications:
  - Session dump (file + summary)
  - "Slot available" (queue notification)
  - "Booking in 5 minutes" reminder
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Lazy import — only import telegram when bot is actually started
_bot_app = None


def get_token() -> str:
    """Get bot token from settings or env."""
    from backend.config import settings
    token = settings.telegram_bot_token
    if not token:
        token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    if not token:
        raise RuntimeError(
            "TELEGRAM_BOT_TOKEN not set. Get one from @BotFather."
        )
    return token


async def start_bot() -> None:
    """Initialize and start the Telegram bot (polling mode for dev)."""
    from telegram import Update, BotCommand
    from telegram.ext import (
        ApplicationBuilder,
        CommandHandler,
        ContextTypes,
    )

    global _bot_app

    token = get_token()
    _bot_app = ApplicationBuilder().token(token).build()

    # Register handlers
    _bot_app.add_handler(CommandHandler("start", _cmd_start))
    _bot_app.add_handler(CommandHandler("status", _cmd_status))
    _bot_app.add_handler(CommandHandler("help", _cmd_help))
    _bot_app.add_handler(CommandHandler("health", _cmd_health))
    _bot_app.add_handler(CommandHandler("kick", _cmd_kick))
    _bot_app.add_handler(CommandHandler("reboot", _cmd_reboot))
    _bot_app.add_handler(CommandHandler("stats", _cmd_stats))

    # Set commands menu
    await _bot_app.bot.set_my_commands([
        BotCommand("start", "Привязать аккаунт"),
        BotCommand("status", "Мой статус"),
        BotCommand("help", "Список команд"),
        BotCommand("health", "Здоровье системы (admin)"),
        BotCommand("stats", "Статистика (admin)"),
    ])

    logger.info("Telegram bot started (polling mode)")
    await _bot_app.initialize()
    await _bot_app.start()
    await _bot_app.updater.start_polling()


async def stop_bot() -> None:
    """Stop the Telegram bot gracefully."""
    global _bot_app
    if _bot_app:
        await _bot_app.updater.stop()
        await _bot_app.stop()
        await _bot_app.shutdown()
        _bot_app = None


# ── User Commands ──────────────────────────────────────────


async def _cmd_start(update, context) -> None:
    """Link Telegram to VDI account. User sends /start <username>."""
    chat_id = str(update.effective_chat.id)
    args = context.args

    if not args:
        await update.message.reply_text(
            "👋 Привет! Чтобы привязать аккаунт VDI Такси, отправь:\n"
            "/start <твой_логин>\n\n"
            "Пример: /start anna"
        )
        return

    username = args[0]

    # Link chat_id to user in DB
    from backend.database import SessionLocal
    from backend.models import User

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        if not user:
            await update.message.reply_text(
                f"❌ Пользователь '{username}' не найден в системе."
            )
            return

        user.telegram_id = chat_id
        db.commit()
        await update.message.reply_text(
            f"✅ Аккаунт привязан!\n"
            f"Имя: {user.name}\n"
            f"Chat ID: {chat_id}\n\n"
            f"Теперь вы будете получать дампы сессий и уведомления."
        )
    finally:
        db.close()


async def _cmd_status(update, context) -> None:
    """Show current session status."""
    chat_id = str(update.effective_chat.id)

    from backend.database import SessionLocal
    from backend.models import User, Session

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.telegram_id == chat_id).first()
        if not user:
            await update.message.reply_text(
                "❓ Аккаунт не привязан. Отправь /start <логин>"
            )
            return

        active = (
            db.query(Session)
            .filter(Session.user_id == user.id, Session.ended_at == None)
            .first()
        )

        if active:
            elapsed = datetime.now(timezone.utc) - active.started_at.replace(
                tzinfo=timezone.utc
            )
            minutes = int(elapsed.total_seconds() / 60)
            await update.message.reply_text(
                f"🟢 Активная сессия\n"
                f"Слот: {active.slot_id}\n"
                f"Время: {minutes} мин\n"
            )
        else:
            await update.message.reply_text(
                f"😴 Нет активных сессий.\n"
                f"Откройте дашборд чтобы занять слот."
            )
    finally:
        db.close()


async def _cmd_help(update, context) -> None:
    """List available commands."""
    text = (
        "📖 Команды VDI Такси:\n\n"
        "/start <логин> — привязать аккаунт\n"
        "/status — текущая сессия\n"
        "/help — эта справка\n"
    )

    # Check if admin
    chat_id = str(update.effective_chat.id)
    from backend.database import SessionLocal
    from backend.models import User

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.telegram_id == chat_id).first()
        if user and user.is_admin:
            text += (
                "\n🔑 Админ-команды:\n"
                "/health — здоровье VM и сервисов\n"
                "/kick <user> — отключить пользователя\n"
                "/reboot <vm_id> — перезагрузить VM\n"
                "/stats — статистика за неделю\n"
            )
    finally:
        db.close()

    await update.message.reply_text(text)


# ── Admin Commands (S2-6) ──────────────────────────────────


async def _require_admin(update) -> bool:
    """Check if sender is admin. Returns True if admin."""
    chat_id = str(update.effective_chat.id)

    from backend.database import SessionLocal
    from backend.models import User

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.telegram_id == chat_id).first()
        if not user or not user.is_admin:
            await update.message.reply_text("⛔ Только для администраторов.")
            return False
        return True
    finally:
        db.close()


async def _cmd_health(update, context) -> None:
    """VM and service health summary (admin only)."""
    if not await _require_admin(update):
        return

    from backend.database import SessionLocal
    from backend.models import VmStatus, Slot

    db = SessionLocal()
    try:
        vms = db.query(VmStatus).all()
        slots = db.query(Slot).filter(Slot.is_active == True).all()

        lines = ["🏥 Здоровье системы\n"]

        if vms:
            lines.append("📟 Виртуальные машины:")
            for vm in vms:
                status = "🟢" if vm.is_healthy else "🔴"
                user_info = f" ({vm.active_user})" if vm.active_user else ""
                lines.append(f"  {status} {vm.vm_id}{user_info}")
        else:
            lines.append("📟 VM: нет данных")

        lines.append(f"\n💾 Слотов активно: {len(slots)}")

        await update.message.reply_text("\n".join(lines))
    finally:
        db.close()


async def _cmd_kick(update, context) -> None:
    """Force-release a user's slot (admin only)."""
    if not await _require_admin(update):
        return

    args = context.args
    if not args:
        await update.message.reply_text("Использование: /kick <username>")
        return

    username = args[0]

    from backend.database import SessionLocal
    from backend.models import User, Session

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        if not user:
            await update.message.reply_text(f"❌ Пользователь '{username}' не найден.")
            return

        active = (
            db.query(Session)
            .filter(Session.user_id == user.id, Session.ended_at == None)
            .first()
        )
        if not active:
            await update.message.reply_text(
                f"ℹ️ У {username} нет активных сессий."
            )
            return

        active.ended_at = datetime.now(timezone.utc)
        active.end_reason = "kicked"
        db.commit()

        await update.message.reply_text(
            f"✅ Пользователь {username} отключён от слота {active.slot_id}."
        )
    finally:
        db.close()


async def _cmd_reboot(update, context) -> None:
    """Reboot a VM via SSH (admin only)."""
    if not await _require_admin(update):
        return

    args = context.args
    if not args:
        await update.message.reply_text("Использование: /reboot <vm_id>")
        return

    vm_id = args[0]
    await update.message.reply_text(f"⏳ Перезагрузка {vm_id}...")

    from backend.config import settings
    if not settings.timeweb_host:
        await update.message.reply_text("❌ SSH не настроен (TIMEWEB_HOST пуст)")
        return

    try:
        import paramiko
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(
            settings.timeweb_host,
            username=settings.timeweb_ssh_user,
            password=settings.timeweb_ssh_password,
        )
        ssh.exec_command(f"docker restart {vm_id}")
        ssh.close()
        await update.message.reply_text(f"✅ {vm_id} перезагружается.")
    except Exception as e:
        await update.message.reply_text(f"❌ Ошибка: {e}")


async def _cmd_stats(update, context) -> None:
    """Weekly utilization stats (admin only)."""
    if not await _require_admin(update):
        return

    from backend.database import SessionLocal
    from backend.models import Session, Slot
    from datetime import timedelta

    db = SessionLocal()
    try:
        week_ago = datetime.now(timezone.utc) - timedelta(days=7)
        sessions = (
            db.query(Session)
            .filter(Session.started_at >= week_ago)
            .all()
        )
        slots = db.query(Slot).filter(Slot.is_active == True).all()

        total_minutes = 0
        for s in sessions:
            if s.ended_at:
                started = s.started_at.replace(tzinfo=timezone.utc)
                ended = s.ended_at.replace(tzinfo=timezone.utc)
                total_minutes += int((ended - started).total_seconds() / 60)

        total_hours = total_minutes / 60
        avg_per_day = total_hours / 7

        lines = [
            "📊 Статистика за неделю\n",
            f"Всего сессий: {len(sessions)}",
            f"Общее время: {total_hours:.1f} ч",
            f"Среднее/день: {avg_per_day:.1f} ч",
            f"Активных слотов: {len(slots)}",
        ]

        # Per-slot breakdown
        slot_usage: dict[str, int] = {}
        for s in sessions:
            slot_usage[s.slot_id] = slot_usage.get(s.slot_id, 0) + 1

        if slot_usage:
            lines.append("\n📈 По слотам:")
            for sid, count in sorted(slot_usage.items(), key=lambda x: -x[1]):
                lines.append(f"  {sid}: {count} сессий")

        await update.message.reply_text("\n".join(lines))
    finally:
        db.close()


# ── Notification Functions ─────────────────────────────────


async def send_session_dump(
    chat_id: str,
    session_id: int,
    slot_id: str,
    duration_min: int,
    tabs_count: int = 0,
    files_count: int = 0,
    dump_path: str | None = None,
) -> bool:
    """Send session dump notification to user."""
    if not _bot_app:
        logger.warning("Bot not started — cannot send dump notification")
        return False

    text = (
        f"🔚 Сессия завершена\n"
        f"Слот: {slot_id}\n"
        f"Длительность: {duration_min} мин\n"
    )
    if tabs_count:
        text += f"📎 Вкладок: {tabs_count}\n"
    if files_count:
        text += f"📁 Файлов: {files_count}\n"

    try:
        await _bot_app.bot.send_message(chat_id=chat_id, text=text)

        # Send dump file if available
        if dump_path and os.path.exists(dump_path):
            with open(dump_path, "rb") as f:
                await _bot_app.bot.send_document(
                    chat_id=chat_id,
                    document=f,
                    filename=os.path.basename(dump_path),
                    caption="📦 Артефакты сессии",
                )
        return True
    except Exception as e:
        logger.error("Failed to send dump to %s: %s", chat_id, e)
        return False


async def notify_slot_available(chat_id: str, slot_id: str) -> bool:
    """Notify user that their queued slot is now available."""
    if not _bot_app:
        return False

    try:
        await _bot_app.bot.send_message(
            chat_id=chat_id,
            text=(
                f"🟢 Слот освободился!\n"
                f"Слот: {slot_id}\n"
                f"Перейдите в дашборд чтобы занять."
            ),
        )
        return True
    except Exception as e:
        logger.error("Failed to notify slot available to %s: %s", chat_id, e)
        return False


async def notify_booking_reminder(
    chat_id: str, slot_id: str, start_time: str
) -> bool:
    """Remind user about upcoming booking (5 min before)."""
    if not _bot_app:
        return False

    try:
        await _bot_app.bot.send_message(
            chat_id=chat_id,
            text=(
                f"⏰ Напоминание о бронировании\n"
                f"Слот: {slot_id}\n"
                f"Время: {start_time}\n"
                f"Бронь через 5 минут!"
            ),
        )
        return True
    except Exception as e:
        logger.error("Failed to send booking reminder to %s: %s", chat_id, e)
        return False


async def send_admin_alert(message: str) -> None:
    """Send alert to all admin users."""
    if not _bot_app:
        return

    from backend.database import SessionLocal
    from backend.models import User

    db = SessionLocal()
    try:
        admins = (
            db.query(User)
            .filter(User.is_admin == True, User.telegram_id.isnot(None))
            .all()
        )
        for admin in admins:
            try:
                await _bot_app.bot.send_message(
                    chat_id=admin.telegram_id,
                    text=f"🚨 Алерт\n{message}",
                )
            except Exception as e:
                logger.error("Failed to alert admin %s: %s", admin.username, e)
    finally:
        db.close()
