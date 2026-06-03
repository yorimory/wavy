import sys
import os
import urllib.parse
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Добавляем путь к app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.config import settings
from app.models import User, Message

# Обычный URL
db_url = settings.database_url
local_fallback_url = "mysql+pymysql://wavy:wavy_secret@127.0.0.1:13306/wavy_crm?charset=utf8mb4"

# Флаг локальной бд
use_local = "--local" in sys.argv
if use_local:
    sys.argv.remove("--local")
    db_url = local_fallback_url

if not use_local and "ssl_ca=/etc/ssl" in db_url and os.name == "nt":
    try:
        import certifi
        db_url = db_url.split("?")[0] + "?ssl_ca=" + urllib.parse.quote(certifi.where())
        print("[Windows SSL CA] Путь заменён на локальный пакет certifi.")
    except ImportError:
        print("Внимание: установите certifi ('pip install certifi') для поддержки SSL соединений на Windows.")

try:
    engine = create_engine(db_url)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    # Тестовый запрос для проверки подключения
    db.execute(SessionLocal().bind.execute("SELECT 1"))
except Exception as e:
    if not use_local:
        print(f"Ошибка подключения к основному облаку TiDB: {e}")
        print(f"Попытка автоматического переключения на локальную базу данных Docker (порт 13306)...")
        db_url = local_fallback_url
        engine = create_engine(db_url)
        SessionLocal = sessionmaker(bind=engine)
        db = SessionLocal()
        print("Успешно переключено на локальную базу данных!")
    else:
        print(f"Ошибка подключения к локальной базе данных: {e}")
        sys.exit(1)

def show_users():
    users = db.query(User).all()
    print("\n=== СПИСОК ПОЛЬЗОВАТЕЛЕЙ ===")
    if not users:
        print("Пользователей нет.")
    for u in users:
        print(f"ID: {u.id} | Email: {u.email} | ФИО: {u.full_name} | Роль: {u.role} | Бан: {u.is_banned}")
    print("============================\n")

def make_moderator(email):
    user = db.query(User).filter(User.email == email.strip()).first()
    if not user:
        print(f"Пользователь с email {email} не найден.")
        return
    user.role = "moderator"
    db.commit()
    print(f"Пользователь {email} назначен модератором (role='moderator')!")

def send_test_msg(sender_email, receiver_email, text):
    sender = db.query(User).filter(User.email == sender_email.strip()).first()
    receiver = db.query(User).filter(User.email == receiver_email.strip()).first()
    if not sender or not receiver:
        print("Ошибка: отправитель или получатель не найден в базе данных.")
        return
    msg = Message(sender_id=sender.id, receiver_id=receiver.id, body=text)
    db.add(msg)
    db.commit()
    print(f"Сообщение от {sender_email} к {receiver_email} успешно отправлено!")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Доступные команды:")
        print("  python db_tool.py list                  - Список всех пользователей")
        print("  python db_tool.py promote <email>       - Сделать пользователя модератором")
        print("  python db_tool.py send <sender_email> <recv_email> <text> - Отправить тестовое сообщение")
        print("\nОпции:")
        print("  Добавьте --local в конец команды, чтобы принудительно использовать локальную БД в Docker.")
        sys.exit(1)
        
    cmd = sys.argv[1]
    if cmd == "list":
        show_users()
    elif cmd == "promote" and len(sys.argv) == 3:
        make_moderator(sys.argv[2])
    elif cmd == "send" and len(sys.argv) == 5:
        send_test_msg(sys.argv[2], sys.argv[3], sys.argv[4])
    else:
        print("Неверный синтаксис команды.")
