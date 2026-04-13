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
VITE_API_URL="http://localhost:3000"
VITE_CONTACT_ADMIN_URL="mailto:support@example.com"
```

`VITE_CONTACT_ADMIN_URL` controls the login page "Contact administrator"
link. You can use a `mailto:` link, a support URL, or leave it blank to hide
the link.

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
