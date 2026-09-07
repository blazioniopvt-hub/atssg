# SkillSync Authentication System

## Overview

This document describes the Phase 3 authentication and identity system for SkillSync, implemented with secure, production-oriented practices.

## Architecture

### Technology Stack

- **Password Hashing**: Argon2id (memory-hard, resistant to GPU attacks)
- **Session Management**: JWT tokens stored in HttpOnly cookies
- **Session Storage**: PostgreSQL database (sessions table)
- **Framework**: Hono (API), Next.js 14 (Frontend)
- **Validation**: Zod schemas

### Security Principles

1. **No plaintext passwords** - All passwords hashed with Argon2id
2. **HttpOnly cookies** - Session tokens inaccessible to JavaScript
3. **Secure cookies in production** - Only transmitted over HTTPS
4. **SameSite=Lax** - CSRF protection
5. **Generic error messages** - No account enumeration
6. **Rate limiting** - 20 requests per 15 minutes on auth endpoints
7. **Session expiration** - 7-day session lifetime
8. **Session invalidation on logout** - Server-side session deletion

## Database Schema

### Session Model

```prisma
model Session {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([token])
  @@index([expiresAt])
  @@map("sessions")
}
```

### User Model (Extended)

```prisma
model User {
  // ... existing fields
  passwordHash  String?      // Argon2id hash
  status        UserStatus   @default(PENDING_VERIFICATION)
  lastLoginAt   DateTime?
  sessions      Session[]

  @@map("users")
}
```

## API Endpoints

### POST /auth/register

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecurePass123!",
  "displayName": "John Doe"
}
```

**Validation:**
- Email: Valid email format, normalized to lowercase
- Username: Optional, 3-30 chars, alphanumeric + underscore + hyphen
- Password: Min 8 chars, requires uppercase, lowercase, number, special char
- Display name: Optional, max 100 chars

**Response (201):**
```json
{
  "user": {
    "id": "cuid",
    "email": "user@example.com",
    "username": "johndoe",
    "status": "ACTIVE",
    "displayName": "John Doe"
  }
}
```

**Errors:**
- 409: Email or username already exists
- 400: Validation errors
- 500: Server configuration error

### POST /auth/login

Authenticate user and create session.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "cuid",
    "email": "user@example.com",
    "username": "johndoe",
    "status": "ACTIVE",
    "displayName": "John Doe"
  }
}
```

**Errors:**
- 401: Invalid credentials (generic message)
- 403: Account not active
- 500: Server configuration error

### POST /auth/logout

Invalidate current session.

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

### GET /auth/me

Get current authenticated user.

**Response (200):**
```json
{
  "user": {
    "id": "cuid",
    "email": "user@example.com",
    "username": "johndoe",
    "status": "ACTIVE",
    "displayName": "John Doe"
  }
}
```

**Errors:**
- 401: Not authenticated or session expired
- 403: Account not active

## Session Management

### Token Flow

1. User registers/logs in
2. Server generates random session token (32 bytes)
3. Server stores session in database with 7-day expiration
3. Server creates JWT containing `{ userId, token }` signed with AUTH_SECRET
4. JWT sent as HttpOnly cookie (`skillsync_session`)
5. On subsequent requests, cookie sent automatically
6. Middleware verifies JWT, looks up session in database
7. If valid, user attached to request context

### Cookie Configuration

```typescript
{
  httpOnly: true,           // No JavaScript access
  secure: isProduction,     // HTTPS only in production
  sameSite: 'lax',          // CSRF protection
  path: '/',                // All routes
  maxAge: 604800            // 7 days
}
```

### Session Invalidation

- **Logout**: Session deleted from database, cookie cleared
- **Expiration**: Middleware checks `expiresAt` before allowing access
- **Revocation**: Session record deleted on logout

## Frontend Implementation

### Auth Context

Located at `apps/web/src/context/AuthContext.tsx`

Provides:
- `user` - Current user object or null
- `isLoading` - Loading state
- `isAuthenticated` - Boolean
- `login(email, password)` - Login function
- `register(data)` - Register function
- `logout()` - Logout function
- `refreshUser()` - Refresh user data

### Protected Routes

Dashboard route (`/dashboard`) checks authentication:
- Shows loading spinner while checking auth
- Redirects to `/auth/login` if not authenticated
- Displays user info and navigation when authenticated

### Pages

- `/auth/login` - Login form with validation
- `/auth/register` - Registration form with validation
- `/dashboard` - Protected dashboard

### Components

- `LoginForm` - Email/password with error handling
- `RegisterForm` - Full registration with confirm password

## Environment Variables

```env
# Authentication (Phase 3)
AUTH_SECRET=your-super-secret-auth-key-change-in-production
SESSION_COOKIE_NAME=skillsync_session
SESSION_COOKIE_MAX_AGE=604800
```

### Development Setup

1. Generate a secure secret:
   ```bash
   openssl rand -base64 32
   ```

2. Add to `.env`:
   ```env
   AUTH_SECRET=your-generated-secret
   ```

## Rate Limiting

- **Window**: 15 minutes
- **Limit**: 20 requests per window
- **Applied to**: All `/auth/*` routes
- **Key**: IP address (x-forwarded-for or x-real-ip)

## Password Policy

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character
- Maximum 128 characters

## Error Handling

### API Error Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR` - Input validation failed
- `UNAUTHORIZED` - Invalid credentials or session
- `FORBIDDEN` - Account not active
- `CONFLICT` - Email/username already exists
- `SERVER_ERROR` - Configuration or internal error

## Security Checklist

- [x] Argon2id password hashing
- [x] HttpOnly session cookies
- [x] Secure cookies in production
- [x] SameSite=Lax
- [x] Generic auth errors (no enumeration)
- [x] Rate limiting on auth endpoints
- [x] Session expiration (7 days)
- [x] Server-side session invalidation on logout
- [x] Last login timestamp tracking
- [x] Account status checking (ACTIVE/INACTIVE/SUSPENDED)
- [x] Password strength requirements
- [x] Input validation with Zod
- [x] No sensitive data in responses
- [x] Credentials never logged

## Development Instructions

1. Start database:
   ```bash
   docker compose -f infrastructure/docker/docker-compose.yml up -d
   ```

2. Run migrations:
   ```bash
   npm run db:migrate:deploy
   ```

3. Seed development data:
   ```bash
   npm run db:seed
   ```

4. Start API:
   ```bash
   npm run dev --workspace=@skillsync/api
   ```

5. Start frontend:
   ```bash
   npm run dev --workspace=@skillsync/web
   ```

6. Test flow:
   - Visit http://localhost:3000
   - Click "Create account"
   - Register with email, username, password
   - Verify redirect to dashboard
   - Sign out and sign in again
   - Verify protected route access

## Known Limitations

1. **No email verification** - Phase 3 restriction
2. **No password reset** - Phase 3 restriction
3. **No MFA** - Phase 3 restriction
4. **No OAuth providers** - Phase 3 restriction
5. **In-memory rate limiter** - Will need Redis for multi-instance deployment
6. **JWT secret rotation not implemented** - Consider for production
7. **Session cleanup job not implemented** - Expired sessions accumulate in DB

## Future Enhancements (Phase 4+)

- Email verification flow
- Password reset via email
- OAuth providers (Google, GitHub)
- Multi-factor authentication (TOTP)
- Session management UI (view/revoke sessions)
- Redis-backed rate limiting
- Automatic session cleanup job
- JWT secret rotation
- Device fingerprinting
- Suspicious activity detection