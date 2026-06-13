import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.config import settings
from app.migrations import run_schema_migrations
from app.routers import appointments, auth, catalog, clients, integrations, intelligence, services, users, reviews, moderation, support, messages
from app.services.notifications import reminder_scheduler_loop


@asynccontextmanager
async def lifespan(_app: FastAPI):
    run_schema_migrations()
    asyncio.create_task(reminder_scheduler_loop())
    yield


app = FastAPI(
    title="WAVY CRM API",
    version="0.1.0",
    description="REST API для мобильного CRM мастера (Freemium, Smart Retention, модерация).",
    lifespan=lifespan,
)

origins = ["*"] if settings.cors_origins.strip() == "*" else [o.strip() for o in settings.cors_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(clients.router)
app.include_router(appointments.router)
app.include_router(services.router)
app.include_router(catalog.router)
app.include_router(intelligence.router)
app.include_router(integrations.router)
app.include_router(reviews.router)
app.include_router(moderation.router)
app.include_router(support.router)
app.include_router(messages.router)

# Ensure the static directory exists and mount it
os.makedirs("static/avatars", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/seed")
def run_seed():
    try:
        from app.seed_mock_data import seed_data
        seed_data()
        return {"status": "success", "message": "База данных успешно заполнена!"}
    except Exception as e:
        import traceback
        return {"status": "error", "error": str(e), "trace": traceback.format_exc()}


