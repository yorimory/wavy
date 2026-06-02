# 🐳 Запуск через Docker

## Требования

- **Docker Desktop** — скачать с [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/)
- После установки запустить Docker Desktop и подождать пока иконка в трее перестанет крутиться (станет зелёной)

---

## Быстрый старт

```powershell
# 1. Перейти в папку проекта
cd "d:\ПРЕДДИПЛОМНАЯ ПРАКТИКА\ДИПЛОМ\прога\wavy_crm_fullstack"

# 2. Собрать и запустить все сервисы
docker compose up --build -d

# 3. Подождать ~30 секунд пока MySQL запустится, затем открыть:
#    Фронтенд:  http://localhost:3080
#    API docs:  http://localhost:8000/docs
```

## Остановка

```powershell
docker compose down          # остановить (данные сохранятся)
docker compose down -v       # остановить + удалить БД (полный сброс)
```

## Что запускается

| Сервис | URL | Описание |
|--------|-----|----------|
| `web` | http://localhost:3080 | React фронтенд |
| `api` | http://localhost:8000 | FastAPI бэкенд |
| `api docs` | http://localhost:8000/docs | Swagger UI |
| `mysql` | localhost:13306 | MySQL (для DBeaver и т.д.) |

## Подключение к БД через DBeaver

- Host: `localhost`
- Port: `13306`
- Database: `wavy_crm`
- User: `wavy`
- Password: `wavy_secret`

---

## Запуск без Docker (для разработки)

### Бэкенд

```powershell
cd server
pip install -r requirements.txt
# По умолчанию использует SQLite (файл wavy.db в папке server)
uvicorn app.main:app --reload --port 8000
```

### Фронтенд

```powershell
cd web
npm install
npm run dev
# Открыть http://localhost:5173
```

> API запросы проксируются через Vite на `http://localhost:8000`

---

## Если Docker не запускается

Ошибка `cannot connect to Docker daemon` — убедитесь что **Docker Desktop запущен**.

Ошибка `port already in use` — измените порты в `docker-compose.yml`:
- `3080:80` → `3081:80` (фронтенд)
- `8000:8000` → `8001:8000` (API)
