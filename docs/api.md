# Frontend API contract

Use `http://localhost:3000/api` as the local base URL. Protected endpoints
expect this header:

```http
Authorization: Bearer <accessToken>
```

Successful resources use `{ "data": ... }`. Paginated collections also include
`"meta": { "page": 1, "limit": 20, "total": 42 }`. Errors have this shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": []
  }
}
```

Validation strips surrounding whitespace where appropriate, normalizes email
addresses to lowercase and converts route IDs and pagination values to numbers.
Dates use `YYYY-MM-DD`. Decimal money values returned by the API remain strings.

## Authentication and profile

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/auth/login` | Public | Return an access token |
| `POST` | `/users` | Public | Register a user |
| `GET` | `/users/me` | Authenticated | Read the current profile |
| `PATCH` | `/users/me` | Authenticated | Update fullname, email or phone |
| `PATCH` | `/users/me/password` | Authenticated | Change the current password |

Login body:

```json
{ "username": "test-user", "password": "StrongPassword123!" }
```

## Rooms

`GET /rooms` accepts `page`, `limit`, `capacity`, `checkInDate` and
`checkOutDate`. Both dates must be supplied together. Results contain room type
capacity and nightly price so the frontend can render availability without a
second request.

| Method | Path | Access |
| --- | --- | --- |
| `GET` | `/rooms` | Customer, manager or admin |
| `GET` | `/rooms/:roomId` | Customer, manager or admin |
| `POST` | `/rooms` | Manager or admin |
| `PATCH` | `/rooms/:roomId` | Manager or admin |
| `DELETE` | `/rooms/:roomId` | Manager or admin |

## Bookings

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/bookings` | Customer | Create a booking for the authenticated user |
| `GET` | `/bookings/me` | Customer | List the current user's bookings |
| `GET` | `/bookings/me/:bookingId` | Customer | Read an owned booking |
| `DELETE` | `/bookings/me/:bookingId` | Customer | Cancel an owned active booking |
| `GET` | `/bookings/:bookingId` | Manager or admin | Read any booking |
| `PATCH` | `/bookings/:bookingId` | Manager or admin | Update any booking |
| `DELETE` | `/bookings/:bookingId` | Manager or admin | Soft-delete any booking |

Create body:

```json
{
  "roomId": 3,
  "checkInDate": "2030-01-10",
  "checkOutDate": "2030-01-12"
}
```

The API derives `userId` from the access token and rejects overlapping active
bookings.

## Payments

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/payments/me` | Customer | Create a payment for an owned booking |
| `GET` | `/payments/me` | Customer | List the current user's payments |
| `GET` | `/payments/me/:paymentId` | Customer | Read an owned payment |
| `POST` | `/payments` | Manager or admin | Create a payment with an explicit amount |
| `GET` | `/payments/:paymentId` | Manager or admin | Read any payment |

Customer payment body:

```json
{
  "bookingId": 8,
  "method": "card",
  "provider": "stripe",
  "idempotencyKey": "booking-8-attempt-1"
}
```

The customer endpoint never accepts `amount`. It calculates the total from the
stored nightly rate and booking duration. The idempotency key must be unique.

## Administration

Role CRUD and user-role assignment endpoints require `ADMIN`. User lookup by ID
requires `ADMIN` or `MANAGER`; user update and deactivation require `ADMIN`.

New registrations currently use `pending_verification`. Until an email
verification flow is added, frontend development needs an account whose status
is `active` and which has the `CUSTOMER` role.

