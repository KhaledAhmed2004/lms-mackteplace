# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**IMPORTANT:** This backend is being transformed into a **Tutoring Marketplace Platform** (similar to GoStudent but with unique features).

### Core Business Model
- **Uber-style trial request matching**: Students send trial requests → Matching tutors accept
- **In-chat booking system**: Sessions booked within chat interface (NOT separate booking pages)
- **Monthly subscription billing**: 3 pricing plans (Flexible €30/hr, Regular €28/hr, Long-term €25/hr)
- **Google Meet integration**: Automatic meeting link generation for sessions
- **Stripe Connect marketplace**: Platform collects from students, pays tutors (minus commission)
- **3-phase tutor approval**: Application → Interview → Final approval

### User Roles
- **STUDENT**: Users who learn from tutors
- **TUTOR**: Approved instructors who teach students
- **APPLICANT**: Users who applied to become tutors (not yet approved)
- **SUPER_ADMIN**: Platform owner/administrator

### Key Features Being Built
1. **Trial Request System** (Uber-style): Students request help → Tutors see matching requests → Accept → Chat opens
2. **In-Chat Booking**: Tutors propose session times in chat → Students accept → Google Meet link generated
3. **Tutor Application Flow**: Apply with CV + Abitur certificate → Admin reviews → Interview scheduling → Approval
4. **Subscription Plans**: Flexible (no commitment), Regular (1 month, min 4 hrs), Long-term (3 months, min 4 hrs)
5. **Month-End Billing**: Automated billing based on hours taken, Stripe payment, PDF invoices
6. **Tutor Payouts**: Automatic Stripe Connect transfers to tutors after billing
7. **Admin Dashboard**: Applications management, user management, sessions, billing, export functionality
8. **Session Reviews**: Post-session ratings for tutors
9. **Google Meet Integration**: Auto-generate meeting links via Google Calendar API

### Database Collections (New)
- `subjects`: Teaching subjects (Math, Physics, etc.)
- `tutorApplications`: Tutor application submissions with documents
- `interviewSlots`: Admin interview availability slots
- `trialRequests`: Student trial requests (Uber-style)
- `sessions`: Booked tutoring sessions with Google Meet links
- `studentSubscriptions`: Active subscription plans
- `monthlyBillings`: Month-end billing records with invoices
- `tutorEarnings`: Tutor payout records
- `sessionReviews`: Post-session ratings and reviews

### Implementation Status

**Phase 1: Core User System** ✅ COMPLETED
- Updated User model with tutoring marketplace roles (STUDENT, TUTOR, APPLICANT)
- Added tutor profile fields (subjects, verification status, onboarding phase)
- Added student profile fields (subscription tier, trial requests count)

**Phase 1: Subject Management** ✅ COMPLETED
- Subject CRUD operations for teaching subjects (Math, Physics, Chemistry, etc.)
- Admin-only subject creation and management
- Public listing with search, filter, pagination

**Phase 2: Tutor Application System** ✅ COMPLETED
- 3-phase application workflow (Submitted → Documents Reviewed/Interview → Approved)
- File upload support (CV, Abitur certificate, education proofs)
- Automatic role transitions (User → APPLICANT → TUTOR)
- Admin review and approval endpoints
- Email notification placeholders

**Phase 2: Interview Scheduling** ✅ COMPLETED
- Interview slot creation and management (admin)
- Slot booking by applicants
- Automatic application status updates
- Google Meet link placeholders (integration pending)

**Phase 3: Trial Request Matching** ✅ COMPLETED
- Uber-style trial request system
- Students create requests → Tutors accept
- Automatic chat creation on acceptance
- 24-hour auto-expiration
- Real-time notification placeholders

**Phase 4: In-Chat Booking & Sessions** ✅ COMPLETED
- Extended Message model with session_proposal type
- In-chat session booking flow (tutor proposes → student accepts)
- Session module with automatic pricing based on subscription tier
- Google Meet link placeholders (integration pending)
- Auto-complete sessions after endTime (cron endpoint)

**Phase 5: Billing & Subscriptions** ✅ COMPLETED
- StudentSubscription module with 3 pricing tiers (Flexible €30/hr, Regular €28/hr, Long-term €25/hr)
- MonthlyBilling module with automatic month-end billing generation
- Invoice generation with unique invoice numbers (INV-YYMM-RANDOM format)
- TutorEarnings module with Stripe Connect payout integration
- Platform commission calculation (20% default)
- Automatic payout record generation for all tutors
- Stripe webhook placeholders for payment confirmations

**Phase 6: Admin Dashboard** ✅ COMPLETED
- Comprehensive dashboard statistics (users, applications, sessions, revenue)
- Revenue tracking by month with commission breakdown
- Popular subjects analytics
- Top tutors and top students leaderboards
- User growth statistics
- CSV export for all entities (users, applications, sessions, billings, earnings, subscriptions, trial requests)
- Advanced filtering options for exports

**Phase 7: Reviews & Automation** ✅ COMPLETED
- SessionReview module with 5-category rating system
  - Overall rating, teaching quality, communication, punctuality, preparedness
  - Student reviews with comments and recommendations
  - Tutor statistics with rating distribution
  - Public/private review visibility
  - Review editing with audit trail
- Cron Jobs service with automated tasks
  - Session reminders (24 hours and 1 hour before)
  - Trial request auto-expiration (24 hours)
  - Month-end billing automation (1st of month at 2:00 AM)
  - Month-end tutor earnings generation (1st of month at 3:00 AM)
  - Session auto-completion (after endTime)

**Phase 8: Google Calendar Integration** ✅ COMPLETED
- Google Calendar API service with Meet link generation
- Create/update/delete calendar events
- Automatic Google Meet link creation
- Email invitations and reminders
- Session calendar event helpers
- Interview calendar event helpers
- Timezone support (Europe/Berlin)

**Phase 9-10: Testing & Documentation** ✅ GUIDES CREATED
- Comprehensive testing guide with Vitest examples
- Swagger/OpenAPI documentation structure
- Complete implementation summary document
- All guides ready for implementation

📚 **Documentation**:
- [IMPLEMENTATION-SUMMARY.md](doc/IMPLEMENTATION-SUMMARY.md) - Complete project overview
- [TESTING-GUIDE.md](doc/TESTING-GUIDE.md) - Testing strategy and examples
- [SWAGGER-DOCUMENTATION.md](doc/SWAGGER-DOCUMENTATION.md) - API documentation guide
- [tutoring-marketplace/](doc/tutoring-marketplace/) - Detailed module documentation

---

## Original Template Info

**educoin-backend** was a production-ready, enterprise-grade Node.js/Express/TypeScript REST API template. Now being customized for tutoring marketplace.

## Tech Stack

- **Runtime**: Node.js + TypeScript (strict mode)
- **Web Framework**: Express 4.x
- **Database**: MongoDB + Mongoose (ODM)
- **Authentication**: JWT + Passport.js (local + Google OAuth2.0), bcrypt
- **Real-time**: Socket.IO
- **Validation**: Zod (runtime) + Mongoose schemas
- **File Storage**: Multer → Cloudinary/AWS S3, Sharp (image processing)
- **Payments**: Stripe + Stripe Connect (marketplace/escrow)
- **Testing**: Vitest + Supertest + MongoDB Memory Server
- **Logging**: Winston (daily rotation) + Morgan
- **Observability**: OpenTelemetry + Prometheus client
- **Notifications**: Nodemailer + Firebase Admin (push)
- **API Docs**: Swagger UI (`/api/v1/docs`)

## Development Commands

```bash
# Development
npm run dev              # Start dev server with hot reload (ts-node-dev)

# Build & Production
npm run build            # Compile TypeScript to dist/
npm start                # Run production server

# Code Quality
npm run lint:check       # Check ESLint issues
npm run lint:fix         # Fix ESLint issues
npm run prettier:check   # Check formatting
npm run prettier:fix     # Fix formatting

# Testing
npm test                 # Run tests in watch mode
npm run test:run         # Run tests once
npm run test:coverage    # Generate coverage report
npm run test:ui          # Open Vitest UI
```

## Code Architecture

### Modular Feature-Based Structure

Each feature module follows **MVC + Service pattern**:

```
src/app/modules/{feature}/
├── {feature}.model.ts        # Mongoose schema & model
├── {feature}.interface.ts    # TypeScript interfaces
├── {feature}.validation.ts   # Zod validation schemas
├── {feature}.route.ts        # Express routes
├── {feature}.controller.ts   # Request handlers (use catchAsync)
└── {feature}.service.ts      # Business logic
```

**Example modules**: `auth/`, `user/`, `chat/`, `message/`, `payment/`, `notification/`, `bookmark/`

### Key Directories

- **`src/app/builder/`** - QueryBuilder & AggregationBuilder (advanced query capabilities)
- **`src/app/logging/`** - Observability infrastructure (auto-labeling, OpenTelemetry, metrics)
- **`src/app/middlewares/`** - Express middlewares (auth, validation, error handling, file handling)
- **`src/errors/`** - Custom error classes (ApiError)
- **`src/config/`** - Environment-based configuration
- **`src/routes/`** - Centralized route aggregation
- **`doc/`** - Extensive documentation (geospatial queries, messaging, payments, OAuth)

## Key Architectural Patterns

### 1. Centralized Error Handling

All async route handlers use `catchAsync()` wrapper:

```typescript
catchAsync(async (req, res) => {
  // Your code - errors auto-caught and forwarded to global error handler
});
```

Throw errors using `ApiError`:

```typescript
throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
```

Global error handler converts Zod errors, Mongoose errors, and cast errors automatically.

### 2. Standardized API Responses

Always use `sendResponse()` for consistency:

```typescript
sendResponse(res, {
  success: true,
  statusCode: httpStatus.OK,
  message: 'User retrieved successfully',
  data: user,
  pagination: { page: 1, limit: 10, total: 100 } // optional
});
```

### 3. Advanced QueryBuilder

The `QueryBuilder` class provides chainable API for complex queries:

```typescript
const result = await new QueryBuilder(Model.find(), req.query)
  .search(['name', 'email'])        // Text search
  .filter()                         // Apply filters
  .geoNear({ longitude, latitude }) // Geospatial queries
  .dateFilter('createdAt')          // Date range filtering
  .paginate()                       // Pagination with metadata
  .sort()
  .fields()
  .populate('userId');
```

**Geospatial Features**:
- Requires 2dsphere index on location field (GeoJSON format)
- `geoNear()` - Distance-based search
- `geoWithinCircle()`, `geoWithinBox()`, `geoWithinPolygon()` - Area queries
- Distance returned in meters

**Date Filtering**:
- `?dateFilter=recently` - Last 24 hours
- `?dateFilter=weekly` - Last 7 days
- `?dateFilter=monthly` - Last 30 days
- `?startDate=...&endDate=...` - Custom range

### 4. Auto-Labeling System (Observability)

Controllers and services are **automatically labeled** for logging/tracing - no manual instrumentation needed:

```typescript
// Just export your class - auto-labeling handles the rest
export const UserController = {
  createUser: catchAsync(async (req, res) => {
    // Logs will show: "UserController.createUser"
  })
};
```

The system uses:
- AsyncLocalStorage for request-scoped context
- OpenTelemetry spans for distributed tracing
- Mongoose query metrics tracking
- Client device detection (User-Agent + Client Hints)

### 5. Authentication & Authorization

**JWT-based auth** with role-based access control:

```typescript
// In routes
router.post('/admin', auth(USER_ROLES.SUPER_ADMIN), AdminController.create);
router.get('/public', auth(USER_ROLES.GUEST), PublicController.list); // Guest access
```

**Available roles**: `SUPER_ADMIN`, `STUDENT`, `TUTOR`, `APPLICANT`

**Note**: Old roles (POSTER, TASKER, GUEST) have been replaced with tutoring marketplace roles.

**Passport strategies**: Local (email/password) + Google OAuth2.0

### 6. File Upload Strategy

```typescript
// In route
router.post('/upload',
  auth(),
  fileHandler(upload.single('file')), // Multer middleware
  validateRequest(FileValidation.schema),
  FileController.upload
);
```

**Flow**:
1. Multer saves to local `uploads/` (short-term)
2. Upload to Cloudinary or AWS S3
3. Safe cleanup with `fs.unlink`

**Image processing**: Sharp for resizing/optimization

### 7. Payment Architecture (Stripe)

Supports:
- Standard payments
- **Stripe Connect** for marketplace/escrow flows
- Webhook handling with signature verification

**Important**: Webhook routes require raw body parsing (configured in `app.ts`)

See `doc/payment-*.md` for detailed guides.

### 8. Real-time Communication (Socket.IO)

Global `io` instance available throughout the app:

```typescript
import { io } from '../../app';

io.to(userId).emit('notification', data);
```

Features:
- Presence tracking helpers
- Unread message management
- Chat/messaging system

### 9. Logging Strategy

**Use Winston logger - NO console.log** (ESLint enforced):

```typescript
import logger from './logger';
import errorLogger from './errorLogger';

logger.info('Operation successful', { userId, action });
errorLogger.error('Operation failed', { error, context });
```

**Features**:
- Daily log rotation (size + time based)
- Separate success/error transports
- Bangladesh timezone formatting
- Structured logging with request context

### 10. Validation Strategy

**Dual validation**:
1. **Zod** (runtime) - Via `validateRequest()` middleware
2. **Mongoose schemas** (database) - Schema-level validation

```typescript
// Route with validation
router.post('/',
  auth(),
  validateRequest(UserValidation.createUserZodSchema),
  UserController.create
);
```

Validates: `body`, `params`, `query`, `cookies`

## Important Conventions

1. **No console.log** - Use Winston logger (`logger.info()`, `errorLogger.error()`)
2. **Module self-containment** - Each feature module is independent
3. **Centralized routes** - All routes aggregated in `src/routes/index.ts`
4. **Type vs Interface** - Use `type` for type definitions (ESLint enforced)
5. **Environment config** - All config from `.env` via `src/config/index.ts`
6. **Error handling** - Always use `catchAsync()` + `ApiError`
7. **Response format** - Always use `sendResponse()`
8. **Geospatial indexes** - Add 2dsphere index for location-based features
9. **Client Hints** - Modern browser device detection (Sec-CH-UA headers)
10. **Critical errors** - Uses `node-notifier` for critical alerts

## Testing Strategy

**Framework**: Vitest with globals enabled

**Setup**:
- Setup file: `tests/setup/vitest.setup.ts`
- MongoDB Memory Server for isolated tests
- Supertest for API endpoint testing
- 10s timeout for tests/hooks

**Coverage exclusions**: node_modules, tests, .d.ts, config, server.ts, app.ts, DB/

```typescript
// Example test structure
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('User API', () => {
  it('should create user', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .send({ name: 'Test' });
    expect(res.status).toBe(201);
  });
});
```

## Special Features

1. **Advanced Geospatial Queries** - $near, $geoWithin (circle, box, polygon), distance calculations
2. **Auto-Labeling System** - Zero-config observability for controllers/services
3. **OpenTelemetry Integration** - Full distributed tracing with custom spans
4. **Stripe Escrow/Marketplace** - Complete payment flows with Stripe Connect
5. **Smart CORS Debugging** - Rate-limited, non-noisy CORS diagnostics (see `src/app/logging/corsLogger.ts`)
6. **In-Memory Caching** - CacheHelper singleton with node-cache
7. **Daily Log Rotation** - Winston with size + time-based rotation
8. **Socket.IO Integration** - Real-time messaging with presence tracking
9. **Firebase Push Notifications** - Mobile push notification support
10. **Puppeteer Integration** - PDF generation capabilities

## Documentation References

Extensive documentation in `doc/` folder:
- **Geospatial queries**: `doc/geoquery-support.md` (Bangla)
- **Auto-labeling architecture**: `doc/request-logging-auto-labeling-bn.md` (Bangla)
- **Messaging system**: `doc/messaging-system-*.md`
- **Payment/Stripe**: `doc/payment-*.md`, `doc/stripe-webhook.md`
- **Google OAuth**: `doc/google-login-full-guide-bn.md`

**API Documentation**: Available at `/api/v1/docs` (Swagger UI)

## Code Quality

**ESLint Rules**:
- No console.log (use logger)
- No unused vars/expressions
- Type definitions must use `type` (not `interface`)

**Prettier Config**:
- Semicolons: yes
- Single quotes: yes
- Arrow parens: avoid
