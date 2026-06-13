import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db_tool import db
from app.models import Appointment

appts = db.query(Appointment).all()
print("\n=== APPOINTMENTS ===")
for a in appts:
    print(f"ID: {a.id} | Title: {a.title} | Starts: {a.starts_at} | Ends: {a.ends_at} | Status: {a.status}")
print("====================\n")
