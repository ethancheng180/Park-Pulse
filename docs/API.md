# ParkPulse API Documentation

Base URL: `http://localhost:8000`

All endpoints except `/auth/*` require authentication via JWT Bearer token.

## Authentication

### POST `/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "role": "driver" | "pulser" | "both"
}
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOi...",
  "token_type": "bearer"
}
```

### POST `/auth/login`

Login and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOi...",
  "token_type": "bearer"
}
```

---

## Spots (Pulser Endpoints)

### POST `/spots`

Report a new parking spot.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "latitude": 34.0522,
  "longitude": -118.2437,
  "address": "123 Main St, Los Angeles",
  "photo_url": "optional-photo-url"
}
```

**Response:**
```json
{
  "id": 1,
  "pulser_id": 2,
  "latitude": 34.0522,
  "longitude": -118.2437,
  "address": "123 Main St, Los Angeles",
  "photo_url": null,
  "reported_at": "2026-02-03T20:00:00Z",
  "expires_at": "2026-02-03T20:04:00Z",
  "status": "available"
}
```

### GET `/spots`

Get all spots reported by current user.

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "id": 1,
    "pulser_id": 2,
    "latitude": 34.0522,
    "longitude": -118.2437,
    "address": "123 Main St",
    "photo_url": null,
    "reported_at": "2026-02-03T20:00:00Z",
    "expires_at": "2026-02-03T20:04:00Z",
    "status": "available"
  }
]
```

---

## Requests (Driver Endpoints)

### POST `/requests`

Create a parking request and find best match.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "destination_latitude": 34.0522,
  "destination_longitude": -118.2437,
  "destination_address": "Downtown LA",
  "radius_meters": 500,
  "max_price": 10.00
}
```

**Response (Match Found):**
```json
{
  "id": 1,
  "status": "matched",
  "match": {
    "id": 1,
    "spot_id": 1,
    "distance_meters": 245.5,
    "amount": 4.50,
    "spot": {
      "id": 1,
      "pulser_id": 2,
      "latitude": 34.0522,
      "longitude": -118.2437,
      "address": "123 Main St",
      "photo_url": null,
      "reported_at": "2026-02-03T20:00:00Z",
      "expires_at": "2026-02-03T20:04:00Z",
      "status": "matched"
    },
    "stripe_client_secret": "pi_xxx_secret_yyy"
  },
  "created_at": "2026-02-03T20:01:00Z"
}
```

**Response (No Match):**
```json
{
  "id": 1,
  "status": "failed",
  "match": null,
  "created_at": "2026-02-03T20:01:00Z"
}
```

### POST `/requests/verify`

Verify if parking spot was found or not.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "match_id": 1,
  "found": true,
  "notes": "Spot was exactly where shown"
}
```

**Response:**
```json
{
  "id": 1,
  "match_id": 1,
  "found": true,
  "created_at": "2026-02-03T20:05:00Z"
}
```

**Effects:**
- If `found: true`: Payment captured, pulser paid, reputation increased
- If `found: false`: Payment refunded, reputation decreased

---

## User Endpoints

### GET `/users/me`

Get current user profile.

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "role": "both",
  "balance": 25.00,
  "reputation": {
    "rating": 4.8,
    "successful_reports": 10,
    "failed_reports": 1,
    "total_earnings": 50.00
  },
  "created_at": "2026-02-01T10:00:00Z"
}
```

### GET `/users/history`

Get transaction history.

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "items": [
    {
      "id": 1,
      "type": "payout",
      "amount": 4.00,
      "status": "completed",
      "created_at": "2026-02-03T20:05:00Z",
      "details": {
        "platform_fee": "1.00"
      }
    },
    {
      "id": 2,
      "type": "spot",
      "amount": null,
      "status": "verified",
      "created_at": "2026-02-03T20:00:00Z"
    }
  ]
}
```

---

## Admin Endpoints

### POST `/admin/refund`

Manually refund a match.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "match_id": 1,
  "reason": "Customer complained spot was incorrect"
}
```

**Response:**
```json
{
  "success": true,
  "match_id": 1,
  "reason": "Customer complained spot was incorrect"
}
```

### POST `/admin/ban`

Ban a user from the platform.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "user_id": 5,
  "reason": "Multiple fraud reports"
}
```

**Response:**
```json
{
  "success": true,
  "user_id": 5,
  "reason": "Multiple fraud reports"
}
```

---

## Error Responses

All endpoints may return error responses in this format:

```json
{
  "detail": "Error message here"
}
```

### Common Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## cURL Examples

### Register
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "role": "both"
  }'
```

### Login
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Report Spot
```bash
curl -X POST http://localhost:8000/spots \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 34.0522,
    "longitude": -118.2437,
    "address": "Downtown LA"
  }'
```

### Request Parking
```bash
curl -X POST http://localhost:8000/requests \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "destination_latitude": 34.0522,
    "destination_longitude": -118.2437,
    "radius_meters": 500,
    "max_price": 10
  }'
```

### Verify Spot
```bash
curl -X POST http://localhost:8000/requests/verify \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "match_id": 1,
    "found": true
  }'
```

### Get Profile
```bash
curl http://localhost:8000/users/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Interactive Documentation

When the server is running, visit:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

These provide interactive API testing and detailed schema information.
