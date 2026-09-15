# Booking System API

REST API for the booking system. The server entrypoint wires the repositories,
services, controllers, validation, authentication, authorization and error
handling into one Express application.

## Run locally

1. Copy `.env.example` to `.env` and set `DATABASE_URL` and `JWT_SECRET`.
2. Apply the database migrations with `npm run migrate up`.
3. Start the API with `npm start`, or use `npm run dev` while developing.

The default API base URL is `http://localhost:3000/api`. The default allowed
frontend origin is `http://localhost:5173`. Check the running server with
`GET /api/health`.

Run all tests with:

```sh
npm test
```

The frontend-facing HTTP contract is documented in [docs/api.md](docs/api.md).

