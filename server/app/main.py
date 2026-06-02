from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.migrations import run_schema_migrations
from app.routers import appointments, auth, catalog, clients, integrations, intelligence, services, users


@asynccontextmanager
async def lifespan(_app: FastAPI):
    run_schema_migrations()
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


@app.get("/health")
def health():
    return {"status": "ok"}
