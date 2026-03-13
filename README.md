# Condo Management App

Full-stack condo management system built with React, NestJS, Prisma,
PostgreSQL, and Docker.


------------------------------------------------------------------------

## Setup

Create the environment file:

``` bash
touch .env
```

Edit `.env` if needed.

Example `.env`:

``` env
DATABASE_URL="postgresql://postgres:postgres@db:5432/condo_db?schema=public"
JWT_SECRET="password"
JWT_EXPIRES_IN="7d"
```

------------------------------------------------------------------------

## First Run

Build and start all containers:

``` bash
docker compose up -d --build
docker compose exec server npx prisma migrate deploy
```

Backend API will be available at:

http://localhost:3000

Frontend will be available at:

http://localhost:5173

------------------------------------------------------------------------

## Normal Development Runs

Start containers:

``` bash
docker compose up
```

Stop containers:

``` bash
docker compose down
```

