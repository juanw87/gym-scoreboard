# Gym Scoreboard MVP

MVP full-stack para boxes de crossfit y entrenamiento funcional. El proyecto usa `Next.js` en el frontend, `Node + Express` en el backend y `PostgreSQL` como base de datos.

## Que resuelve

- Publica el WOD del dia y su leaderboard.
- Guarda resultados historicos por atleta.
- Muestra una vista de progreso individual con insights.
- Permite cargar un nuevo WOD manualmente desde una interfaz de admin.

## Stack

- Frontend: `Next.js` + `React` + `TypeScript`
- Backend: `Node.js` + `Express` + `TypeScript`
- Base de datos: `PostgreSQL`
- Orquestacion local: `docker-compose`

## Estructura

- `app/page.tsx`: dashboard principal
- `app/athletes/[id]/page.tsx`: perfil del atleta
- `server/src/index.ts`: API Express
- `server/sql/schema.sql`: esquema PostgreSQL
- `server/sql/seed.sql`: datos de ejemplo

## Variables de entorno

Copiar `.env.example` a `.env`.

## Levantar el proyecto

```bash
docker compose up -d db
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

La web queda en `http://localhost:3000` y la API en `http://localhost:4000`.
La base de datos del contenedor escucha en `localhost:55432`.

## Endpoints del MVP

- `GET /api/health`
- `GET /api/dashboard`
- `GET /api/athletes`
- `GET /api/athletes/:id`
- `POST /api/workouts`

## Flujo del MVP

1. El admin crea un WOD con fecha, formato y scores.
2. El backend calcula y guarda el ranking diario.
3. El frontend muestra leaderboard, atletas destacados y workouts recientes.
4. Cada atleta tiene una pagina con historial, benchmarks y sugerencias.
