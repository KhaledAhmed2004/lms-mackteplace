# Architecture Documentation

**Project:** educoin-backend
**Type:** Node.js/Express REST API + WebSocket Server
**Last Updated:** 2025-11-08

---

## Table of Contents
1. [High-Level Architecture](#high-level-architecture)
2. [Module Map](#module-map)
3. [Data Flow Diagrams](#data-flow-diagrams)
4. [Database Collections](#database-collections)
5. [Key Files Reference](#key-files-reference)
6. [Critical Invariants](#critical-invariants)
7. [External Dependencies](#external-dependencies)

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                            │
│  (Web App, Mobile App, Third-party Services)                    │
└───────────────────┬─────────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
        ▼           ▼           ▼
    REST API   WebSocket    Webhooks
        │           │           │
        └───────────┼───────────┘
                    │
┌───────────────────▼─────────────────────────────────────────────┐
│                      APPLICATION LAYER                           │
│                                                                   │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                │
│  │   Auth     │  │  Payment   │  │    Chat    │                │
│  │  Module    │  │   Module   │  │   Module   │  ... 7 modules │
│  └────────────┘  └────────────┘  └────────────┘                │
│                                                                   │
│  ┌─────────────────────────────────────────────────────┐        │
│  │         Middleware Layer                             │        │
│  │  - Authentication (JWT)                              │        │
│  │  - Authorization (RBAC)                              │        │
│  │  - Validation (Zod)                                  │        │
│  │  - Error Handling                                    │        │
│  │  - Rate Limiting                                     │        │
│  │  - File Upload (Multer)                              │        │
│  └─────────────────────────────────────────────────────┘        │
│                                                                   │
│  ┌─────────────────────────────────────────────────────┐        │
│  │         Observability Layer                          │        │
│  │  - Auto-labeling (AsyncLocalStorage)                │        │
│  │  - OpenTelemetry Tracing                             │        │
│  │  - Winston Logging                                   │        │
│  │  - Prometheus Metrics                                │        │
│  │  - Request Context                                   │        │
│  └─────────────────────────────────────────────────────┘        │
└───────────────────┬─────────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
        ▼           ▼           ▼
    MongoDB    External APIs  File Storage
     (Mongoose)   (Stripe,    (Cloudinary,
                  Firebase,      AWS S3)
                  Google OAuth)
```

---

## Module Map

### Core Application Modules (`src/app/modules/`)

```
src/app/modules/
│
├── auth/                          # Authentication & Authorization
│   ├── auth.controller.ts         # Login, signup, OTP, refresh tokens
│   ├── auth.service.ts            # JWT generation, Google OAuth integration
│   ├── auth.validation.ts         # Zod schemas for auth requests
│   ├── auth.routes.ts             # Public auth routes
│   ├── auth.interface.ts          # Auth-related types
│   ├── config/passport.ts         # Passport strategies (Google OAuth)
│   └── README.md
│
├── user/                          # User Management
│   ├── user.controller.ts         # CRUD operations for users
│   ├── user.service.ts            # User business logic
│   ├── user.model.ts              # Mongoose User schema (bcrypt pre-save)
│   ├── user.validation.ts         # User input validation
│   ├── user.routes.ts             # Protected user routes
│   ├── user.interface.ts          # User types
│   ├── user.constant.ts           # USER_ROLES constants
│   └── README.md
│
├── payment/                       # Payment Processing & Escrow
│   ├── payment.controller.ts      # Payment initiation, capture, refund
│   ├── payment.service.ts         # Stripe integration, escrow logic
│   ├── payment.model.ts           # Payment & StripeAccount schemas
│   ├── payment.routes.ts          # Payment routes + webhook route
│   ├── webhook.controller.ts      # Stripe webhook event handlers (34 console.logs!)
│   ├── stripeConnect.service.ts   # Stripe Connect account management
│   ├── payment.validation.ts      # Payment request validation
│   ├── payment.interface.ts       # Payment types
│   ├── payment.constant.ts        # Payment statuses, currencies
│   └── README.md
│
├── chat/                          # Chat Room Management
│   ├── chat.controller.ts         # Create, list, get chat rooms
│   ├── chat.service.ts            # Chat business logic
│   ├── chat.model.ts              # Chat schema (participants, lastMessage)
│   ├── chat.routes.ts             # Chat CRUD routes
│   ├── chat.validation.ts         # Chat validation schemas
│   ├── chat.interface.ts          # Chat types
│   └── README.md
│
├── message/                       # Messaging System
│   ├── message.controller.ts      # Send, list, mark as read
│   ├── message.service.ts         # Message persistence & delivery
│   ├── message.model.ts           # Message schema (sender, content, status)
│   ├── message.routes.ts          # Message routes
│   ├── message.validation.ts      # Message validation
│   ├── message.interface.ts       # Message types
│   └── README.md
│
├── notification/                  # Push Notifications
│   ├── notification.controller.ts # Register device, send notification
│   ├── notification.service.ts    # Firebase Cloud Messaging integration
│   ├── notification.model.ts      # Device token storage
│   ├── notification.routes.ts     # Notification routes
│   ├── notification.validation.ts # Notification validation
│   └── notification.interface.ts  # Notification types
│
└── bookmark/                      # Bookmark Feature
    ├── bookmark.controller.ts     # Add, remove, list bookmarks
    ├── bookmark.service.ts        # Bookmark business logic
    ├── bookmark.model.ts          # Bookmark schema
    ├── bookmark.routes.ts         # Bookmark routes
    ├── bookmark.validation.ts     # Bookmark validation
    └── bookmark.interface.ts      # Bookmark types
```

### Infrastructure Layers

```
src/app/
│
├── builder/                       # Query & Data Builders
│   ├── QueryBuilder.ts            # Advanced MongoDB query builder
│   │                              # - Text search, regex search
│   │                              # - Geospatial queries (near, within)
│   │                              # - Date filtering (recently, weekly, monthly)
│   │                              # - Pagination with metadata
│   │                              # - Field selection, population, sorting
│   └── AggregationBuilder.ts      # MongoDB aggregation pipelines
│
├── logging/                       # Observability Infrastructure
│   ├── autoLabelBootstrap.ts      # Auto-labels controllers/services (MAGIC!)
│   ├── requestContext.ts          # AsyncLocalStorage for request context
│   ├── requestLogger.ts           # HTTP request/response logging
│   ├── corsLogger.ts              # CORS debugging (rate-limited)
│   ├── otelExpress.ts             # OpenTelemetry Express middleware
│   ├── mongooseMetrics.ts         # Database query metrics
│   ├── patchMongoose.ts           # Mongoose instrumentation
│   ├── patchSocketIO.ts           # Socket.IO instrumentation
│   └── opentelemetry.ts           # OpenTelemetry configuration
│
├── middlewares/                   # Express Middlewares
│   ├── auth.ts                    # JWT verification + RBAC
│   ├── validateRequest.ts         # Zod validation middleware
│   ├── globalErrorHandler.ts     # Centralized error handler
│   ├── fileUploadHandler.ts      # Multer file upload configuration
│   ├── rateLimit.ts              # Rate limiting (NodeCache-based)
│   └── notFound.ts               # 404 handler
│
├── helpers/                       # Application Helpers
│   └── (various utility functions)
│
└── shared/                        # Shared Application Utilities
    └── (shared across modules)
```

### Supporting Infrastructure

```
src/
│
├── config/                        # Configuration Management
│   └── index.ts                   # Environment variable loader (22 vars)
│
├── DB/                           # Database Utilities
│   └── index.ts                   # Database seeding scripts
│
├── errors/                       # Error Handling
│   ├── ApiError.ts                # Custom API error class
│   ├── handleCastError.ts         # MongoDB cast error handler
│   ├── handleDuplicateError.ts    # Duplicate key error handler
│   ├── handleValidationError.ts   # Mongoose validation error handler
│   └── handleZodError.ts          # Zod validation error handler
│
├── helpers/                      # Global Helpers
│   ├── socketHelper.ts            # Socket.IO event handlers
│   ├── presenceHelper.ts          # Online/offline presence tracking
│   ├── unreadHelper.ts            # Unread message counting
│   ├── fileHelper.ts              # File upload utilities
│   └── cacheHelper.ts             # NodeCache singleton
│
├── routes/                       # Route Aggregation
│   └── index.ts                   # Centralized route registration
│
├── shared/                       # Global Shared Utilities
│   ├── logger.ts                  # Winston success logger (Bangladesh TZ)
│   ├── errorLogger.ts             # Winston error logger
│   ├── catchAsync.ts              # Async error wrapper
│   ├── sendResponse.ts            # Standardized API response
│   └── pick.ts                    # Object key picker utility
│
├── types/                        # TypeScript Type Definitions
│   └── (global type definitions)
│
├── util/                         # Utility Functions
│   └── (various utilities)
│
├── app.ts                        # Express Application Setup
│   │                              # - Middleware registration
│   │                              # - CORS configuration
│   │                              # - Route mounting
│   │                              # - Error handling
│   │                              # - Swagger UI (/api/v1/docs)
│   └── (117 lines)
│
└── server.ts                     # Server Initialization
    │                              # - Database connection
    │                              # - HTTP server creation
    │                              # - Socket.IO initialization
    │                              # - Graceful shutdown
    └── (104 lines)
```

---

## Data Flow Diagrams

### 1. Authentication Flow (JWT)

```
┌─────────┐
│ Client  │
└────┬────┘
     │ POST /api/v1/auth/login
     │ { email, password, deviceToken }
     ▼
┌────────────────────────────────────┐
│  auth.controller.ts:login()        │
│  - validateRequest (Zod)           │
└────┬───────────────────────────────┘
     │
     ▼
┌────────────────────────────────────┐
│  auth.service.ts:loginUser()       │
│  1. Find user by email             │
│  2. Verify password (bcrypt)       │
│  3. Generate access token (JWT)    │
│  4. Generate refresh token (JWT)   │
│  5. Save device token (Firebase)   │
└────┬───────────────────────────────┘
     │
     ▼
┌────────────────────────────────────┐
│  Response with tokens              │
│  {                                 │
│    accessToken: 'jwt...',          │
│    refreshToken: 'jwt...',         │
│    user: { id, email, role }       │
│  }                                 │
│  Set-Cookie: refreshToken          │
└────────────────────────────────────┘
```

### 2. Payment Escrow Flow

```
┌─────────┐
│ Client  │ (Poster creates task, Tasker bids)
└────┬────┘
     │ POST /api/v1/payments/create-payment-intent
     │ { taskId, bidId, amount, posterId, freelancerId }
     ▼
┌────────────────────────────────────────────────────────┐
│  payment.service.ts:createPaymentIntent()              │
│  1. Validate task & bid exist                          │
│  2. Calculate platform fee (20%)                       │
│  3. Create Stripe PaymentIntent (manual capture)       │
│  4. Store payment record in MongoDB                    │
│     - status: 'pending'                                │
│     - escrowAmount = amount                            │
│     - platformFee = amount * 0.20                      │
└────┬───────────────────────────────────────────────────┘
     │
     │ Client confirms payment (Stripe.js)
     ▼
┌────────────────────────────────────────────────────────┐
│  Stripe Webhook: payment_intent.succeeded              │
│  webhook.controller.ts:handlePaymentIntentSucceeded()  │
│  1. Verify webhook signature                           │
│  2. Update payment status: 'captured'                  │
│  3. Funds held in escrow (not yet paid out)            │
└────┬───────────────────────────────────────────────────┘
     │
     │ Task completed, poster approves
     ▼
┌────────────────────────────────────────────────────────┐
│  payment.service.ts:releaseEscrowPayment()             │
│  1. Find payment record                                │
│  2. Calculate amounts:                                 │
│     - freelancerAmount = escrowAmount - platformFee    │
│     - platformFee (retained by platform)               │
│  3. Create Stripe Transfer to freelancer's account     │
│     (via Stripe Connect)                               │
│  4. Update payment status: 'completed'                 │
└────────────────────────────────────────────────────────┘
```

### 3. Real-time Chat Flow (Socket.IO)

```
┌─────────┐
│ Client  │ (User A)
└────┬────┘
     │ socket.connect() with JWT in auth header
     ▼
┌────────────────────────────────────────────────────────┐
│  socketHelper.ts:connection event                      │
│  1. Verify JWT token                                   │
│  2. Extract userId from token                          │
│  3. Join user-specific room: `user:{userId}`           │
│  4. Update presence: online                            │
│  5. Emit 'user:online' to contacts                     │
└────┬───────────────────────────────────────────────────┘
     │
     │ User A joins chat room
     │ socket.emit('join_chat', { chatId })
     ▼
┌────────────────────────────────────────────────────────┐
│  socketHelper.ts:join_chat handler                     │
│  1. Verify user is participant in chat                 │
│  2. Join Socket.IO room: `chat:{chatId}`               │
│  3. Fetch undelivered messages                         │
│  4. Emit messages to user                              │
│  5. Mark messages as delivered                         │
└────┬───────────────────────────────────────────────────┘
     │
     │ User A sends message
     │ socket.emit('send_message', { chatId, content })
     ▼
┌────────────────────────────────────────────────────────┐
│  socketHelper.ts:send_message handler                  │
│  1. Verify user is participant                         │
│  2. Save message to MongoDB (status: 'sent')           │
│  3. Get all participants in chat                       │
│  4. For each online participant:                       │
│     - Emit 'new_message' to their socket               │
│     - Mark as 'delivered'                              │
│  5. For offline participants:                          │
│     - Message stays 'sent' (delivered on next join)    │
└────────────────────────────────────────────────────────┘
```

### 4. Webhook Processing (Stripe)

```
┌─────────┐
│ Stripe  │ (External service)
└────┬────┘
     │ POST /api/v1/payments/webhook
     │ Headers: stripe-signature
     │ Body: raw JSON (event object)
     ▼
┌────────────────────────────────────────────────────────┐
│  app.ts: Raw body parser middleware                    │
│  express.raw({ type: 'application/json' })             │
│  (CRITICAL: Must parse as Buffer for signature verify) │
└────┬───────────────────────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────────────────────┐
│  webhook.controller.ts:handleStripeWebhook()           │
│  1. Extract stripe-signature header                    │
│  2. Verify signature:                                  │
│     stripe.webhooks.constructEvent(                    │
│       req.body,                                        │
│       signature,                                       │
│       webhookSecret                                    │
│     )                                                  │
│  3. Route to event-specific handler                    │
└────┬───────────────────────────────────────────────────┘
     │
     ├─ payment_intent.succeeded ────────────────────────┐
     │                                                    │
     │  handlePaymentIntentSucceeded()                   │
     │  - Update payment status: 'captured'              │
     │  - Send confirmation email                        │
     │                                                    │
     ├─ account.updated ─────────────────────────────────┤
     │                                                    │
     │  handleAccountUpdated()                           │
     │  - Update Stripe account verification status      │
     │                                                    │
     ├─ payout.paid ─────────────────────────────────────┤
     │                                                    │
     │  handlePayoutPaid()                               │
     │  - Record payout in database                      │
     │  - Send notification to freelancer                │
     │                                                    │
     └────────────────────────────────────────────────────┘
```

---

## Database Collections

### MongoDB Collections (Mongoose Models)

#### 1. **users** (User.model.ts)
```typescript
{
  _id: ObjectId,
  email: string (unique, indexed),
  name: string,
  password: string (hashed with bcrypt, select: false),
  role: 'SUPER_ADMIN' | 'POSTER' | 'TASKER' | 'GUEST',
  phone?: string,
  isPhoneVerified: boolean,
  isEmailVerified: boolean,
  deviceTokens: string[] (Firebase FCM tokens),
  profileImage?: string,
  createdAt: Date,
  updatedAt: Date
}

Indices:
- email: 1 (unique)
Pre-save hooks:
- Hash password with bcrypt (rounds: 12)
```

#### 2. **payments** (payment.model.ts)
```typescript
{
  _id: ObjectId,
  taskId: ObjectId (ref: 'Task'),
  posterId: ObjectId (ref: 'User'),
  freelancerId: ObjectId (ref: 'User'),
  bidId: ObjectId (ref: 'Bid'),
  amount: number,
  platformFee: number,
  escrowAmount: number,
  status: 'pending' | 'captured' | 'completed' | 'refunded' | 'failed',
  stripePaymentIntentId: string,
  stripeTransferId?: string,
  currency: string (default: 'usd'),
  description?: string,
  metadata?: object,
  createdAt: Date,
  updatedAt: Date
}

Indices:
- taskId: 1
- posterId: 1
- freelancerId: 1
- bidId: 1
- status: 1
- stripePaymentIntentId: 1
```

#### 3. **stripeaccounts** (payment.model.ts)
```typescript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'User', unique),
  stripeAccountId: string (unique),
  accountType: 'express' | 'standard',
  chargesEnabled: boolean,
  payoutsEnabled: boolean,
  detailsSubmitted: boolean,
  country: string,
  metadata?: object,
  createdAt: Date,
  updatedAt: Date
}

Indices:
- userId: 1
- stripeAccountId: 1
```

#### 4. **chats** (chat.model.ts)
```typescript
{
  _id: ObjectId,
  participants: ObjectId[] (ref: 'User', min: 2),
  lastMessage?: {
    content: string,
    senderId: ObjectId,
    timestamp: Date
  },
  unreadCount: Map<string, number>, // { userId: count }
  createdAt: Date,
  updatedAt: Date
}

Indices: ❌ MISSING (should have participants index)
```

#### 5. **messages** (message.model.ts)
```typescript
{
  _id: ObjectId,
  chatId: ObjectId (ref: 'Chat'),
  senderId: ObjectId (ref: 'User'),
  content: string,
  type: 'text' | 'image' | 'file',
  fileUrl?: string,
  status: 'sent' | 'delivered' | 'read',
  deliveredTo: ObjectId[] (ref: 'User'),
  readBy: ObjectId[] (ref: 'User'),
  createdAt: Date,
  updatedAt: Date
}

Indices: ❌ NOT VERIFIED (should have chatId + createdAt compound index)
```

#### 6. **notifications** (notification.model.ts)
```typescript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'User'),
  deviceToken: string,
  platform: 'ios' | 'android' | 'web',
  isActive: boolean,
  createdAt: Date,
  updatedAt: Date
}

Indices: ❌ NOT VERIFIED
```

#### 7. **bookmarks** (bookmark.model.ts)
```typescript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'User'),
  resourceId: ObjectId,
  resourceType: string (e.g., 'Task', 'Post'),
  createdAt: Date,
  updatedAt: Date
}

Indices: ❌ NOT VERIFIED
```

#### 8. **resettokens** (resetToken.model.ts)
```typescript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'User'),
  token: string,
  expiresAt: Date,
  createdAt: Date
}

Indices: ❌ NOT VERIFIED (should have userId + expiresAt)
```

---

## Key Files Reference

### Entry Points
| File | Purpose | Lines | Critical? |
|------|---------|-------|-----------|
| `src/server.ts` | Server initialization, DB connection, Socket.IO setup | 104 | ✅ |
| `src/app.ts` | Express app configuration, middleware, routes | 117 | ✅ |

### Configuration
| File | Purpose | Critical? |
|------|---------|-----------|
| `src/config/index.ts` | Environment variables (22 vars) | ✅ |
| `tsconfig.json` | TypeScript configuration (strict mode) | ✅ |
| `vitest.config.ts` | Test configuration | ⚠️ No tests |
| `.eslintrc` | Linting rules (no-console violated) | ⚠️ |
| `.prettierrc` | Code formatting | ✅ |

### Core Business Logic
| File | Purpose | LOC | Critical? | Issues |
|------|---------|-----|-----------|--------|
| `src/app/modules/payment/payment.service.ts` | Payment escrow logic | ~700 | ✅ | 7 console.log |
| `src/app/modules/payment/webhook.controller.ts` | Stripe webhooks | ~400 | ✅ | 34 console.log! |
| `src/app/modules/auth/auth.service.ts` | Authentication logic | ~400 | ✅ | 1 console.log |
| `src/helpers/socketHelper.ts` | Socket.IO event handlers | ~400 | ✅ | None |
| `src/app/modules/payment/stripeConnect.service.ts` | Stripe Connect | ~300 | ✅ | None |

### Infrastructure
| File | Purpose | Critical? |
|------|---------|-----------|
| `src/app/logging/autoLabelBootstrap.ts` | Auto-labeling magic | ✅ |
| `src/app/builder/QueryBuilder.ts` | Advanced query builder | ✅ |
| `src/app/middlewares/auth.ts` | JWT verification + RBAC | ✅ |
| `src/app/middlewares/globalErrorHandler.ts` | Error handling | ✅ |
| `src/shared/logger.ts` | Winston logger (BD timezone) | ✅ |

### Security-Critical Files
| File | Purpose | Risk | Issues |
|------|---------|------|--------|
| `src/app/modules/payment/webhook.controller.ts` | Stripe signature verification | HIGH | Console.log violations |
| `src/app/middlewares/auth.ts` | JWT validation | HIGH | None |
| `src/app/modules/auth/auth.service.ts` | Token generation | HIGH | Weak JWT secrets |
| `src/config/index.ts` | Environment config | CRITICAL | Missing .env.example |

---

## Critical Invariants

### Business Logic Invariants

#### 1. Payment Escrow Integrity
```typescript
// INVARIANT: escrowAmount = amount (initial capture)
// INVARIANT: freelancerAmount + platformFee = escrowAmount (on release)
// INVARIANT: platformFee = amount * PLATFORM_FEE_PERCENTAGE (20%)

// Location: src/app/modules/payment/payment.service.ts
const platformFee = amount * 0.20;
const escrowAmount = amount;
const freelancerAmount = escrowAmount - platformFee;

// MUST HOLD: freelancerAmount + platformFee === escrowAmount
```

**Verification Required:**
- [ ] Test platform fee calculation
- [ ] Test escrow release math
- [ ] Test refund calculations

#### 2. JWT Token Pairing
```typescript
// INVARIANT: Every access token has a corresponding refresh token
// INVARIANT: Refresh token TTL > Access token TTL
// INVARIANT: User ID in token must match database user ID

// Location: src/app/modules/auth/auth.service.ts
const accessToken = createToken(payload, JWT_SECRET, JWT_EXPIRE_IN);  // 1d
const refreshToken = createToken(payload, JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRE_IN); // 365d

// MUST HOLD: JWT_REFRESH_EXPIRE_IN > JWT_EXPIRE_IN
```

#### 3. Message Delivery Status Progression
```typescript
// INVARIANT: Message status must progress: sent → delivered → read
// INVARIANT: Cannot mark as read without being delivered
// INVARIANT: deliveredTo.length <= chat.participants.length
// INVARIANT: readBy.length <= deliveredTo.length

// Location: src/helpers/socketHelper.ts
enum MessageStatus {
  SENT = 'sent',        // Created but not delivered
  DELIVERED = 'delivered', // Received by recipient's device
  READ = 'read'         // Opened by recipient
}

// MUST HOLD: readBy ⊆ deliveredTo ⊆ participants
```

#### 4. Chat Participant Validation
```typescript
// INVARIANT: All participants in a chat must exist as users
// INVARIANT: Minimum 2 participants per chat
// INVARIANT: Only participants can send/receive messages in chat
// INVARIANT: Socket.IO room membership matches chat participants

// Location: src/app/modules/chat/chat.model.ts
participants: {
  type: [Schema.Types.ObjectId],
  ref: 'User',
  required: true,
  validate: {
    validator: (v: ObjectId[]) => v.length >= 2,
    message: 'Chat must have at least 2 participants'
  }
}
```

#### 5. Webhook Signature Verification
```typescript
// INVARIANT: ALL webhook requests MUST be signature-verified
// INVARIANT: Raw body must be preserved for signature calculation
// INVARIANT: Webhook secret must never be exposed

// Location: src/app/modules/payment/webhook.controller.ts:38
const event = stripe.webhooks.constructEvent(
  req.body,           // MUST be raw Buffer, not parsed JSON
  signature,          // From stripe-signature header
  webhookSecret       // From environment variable
);

// MUST HOLD: If signature invalid, reject request immediately
```

#### 6. Role-Based Access Control
```typescript
// INVARIANT: Protected routes require valid JWT
// INVARIANT: Admin routes require SUPER_ADMIN role
// INVARIANT: Guest role has read-only access
// INVARIANT: User cannot elevate their own role

// Location: src/app/middlewares/auth.ts:57-62
if (requiredRoles.length && !requiredRoles.includes(user.role)) {
  throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
}

// MUST HOLD: Role in token === Role in database
```

### Data Integrity Invariants

#### 7. Password Security
```typescript
// INVARIANT: Passwords NEVER stored in plain text
// INVARIANT: Password hash uses bcrypt with rounds >= 12
// INVARIANT: Password field has select: false by default
// INVARIANT: Password comparison uses timing-safe compare (bcrypt.compare)

// Location: src/app/modules/user/user.model.ts:140-144
userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, Number(BCRYPT_SALT_ROUNDS));
  }
  next();
});

// MUST HOLD: No password ever visible in API responses
```

#### 8. File Upload Cleanup
```typescript
// INVARIANT (CURRENTLY VIOLATED): Local files deleted after cloud upload
// INVARIANT: Upload fails if file exceeds size limit
// INVARIANT: Only allowed MIME types accepted

// Location: src/app/middlewares/fileUploadHandler.ts
// ⚠️ MISSING: fs.unlink() cleanup after cloud upload
// TODO: Implement cleanup in controller after successful cloud upload
```

#### 9. Stripe Account Linking
```typescript
// INVARIANT: One Stripe account per user (userId unique)
// INVARIANT: One user per Stripe account (stripeAccountId unique)
// INVARIANT: Cannot create payment to user without Stripe account

// Location: src/app/modules/payment/payment.model.ts:134-135
StripeAccountSchema.index({ userId: 1 }, { unique: true });
StripeAccountSchema.index({ stripeAccountId: 1 }, { unique: true });
```

---

## External Dependencies

### Payment Services
| Service | Purpose | Configuration |
|---------|---------|---------------|
| **Stripe** | Payment processing | Secret key in .env |
| **Stripe Connect** | Marketplace payouts | Connected accounts per user |
| **Stripe Webhooks** | Payment events | Webhook secret, signature verification |

### Authentication Services
| Service | Purpose | Configuration |
|---------|---------|---------------|
| **Google OAuth 2.0** | Social login | Client ID + Secret |
| **JWT** | Token-based auth | Secret keys (weak!) |

### Cloud Services
| Service | Purpose | Status |
|---------|---------|--------|
| **Firebase Admin** | Push notifications | Service account key (base64) |
| **Cloudinary** | Image storage | ⚠️ Configured but not fully integrated |
| **AWS S3** | File storage | ⚠️ SDK installed but not used |

### Email Service
| Service | Purpose | Status |
|---------|---------|--------|
| **Nodemailer** | Transactional emails | ⚠️ Security vulnerability (6.10.1) |
| **Handlebars** | Email templates | ✅ Configured |

### Observability
| Service | Purpose | Status |
|---------|---------|--------|
| **OpenTelemetry** | Distributed tracing | ⚠️ Major version behind |
| **Prometheus** | Metrics collection | ✅ Client configured |
| **Winston** | Logging | ✅ Excellent setup |

---

## Missing Components

### Critical Missing Infrastructure
1. ❌ **Health Check Endpoint** - No `/health` or `/status` route
2. ❌ **Database Migrations** - No migration system (manual schema changes)
3. ❌ **Backup Strategy** - No automated database backups
4. ❌ **Rate Limiting on Webhooks** - Vulnerable to abuse
5. ❌ **Error Monitoring** - No Sentry or similar service
6. ❌ **API Versioning Strategy** - Currently `/api/v1` but no versioning plan

### Missing Indices (Performance Risk)
1. ❌ `chats.participants` - Slow chat lookups
2. ❌ `messages.chatId + createdAt` - Slow message pagination
3. ❌ `notifications.userId` - Slow notification queries
4. ❌ `bookmarks.userId + resourceType` - Slow bookmark queries

### Missing Tests
1. ❌ Unit tests for payment service
2. ❌ Integration tests for webhook handling
3. ❌ E2E tests for authentication flows
4. ❌ Load tests for Socket.IO

---

## Architecture Strengths

✅ **Modular Design** - Clean separation of concerns
✅ **Centralized Error Handling** - Consistent error responses
✅ **Auto-labeling System** - Zero-config observability
✅ **Advanced QueryBuilder** - DRY query logic
✅ **Type Safety** - TypeScript strict mode
✅ **Real-time Capabilities** - Well-implemented Socket.IO
✅ **Payment Security** - Proper webhook verification

---

## Architecture Weaknesses

⚠️ **No Caching Layer** - All queries hit database
⚠️ **In-Memory Rate Limiting** - Won't scale across multiple servers
⚠️ **No Database Sharding Strategy** - Single MongoDB instance
⚠️ **No Message Queue** - Synchronous webhook processing
⚠️ **File Storage Incomplete** - Local uploads not cleaned up
⚠️ **No API Gateway** - No centralized rate limiting/throttling

---

**Last Updated:** 2025-11-08
**Next Review:** After P0 remediation