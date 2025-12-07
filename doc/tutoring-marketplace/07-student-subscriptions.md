# Phase 5: Student Subscriptions & Pricing Plans

## Overview

Three-tier subscription system (Flexible, Regular, Long-term) with automatic pricing, commitment tracking, and Stripe integration placeholders.

## Status: ✅ COMPLETED

## Module Structure

**Location:** `src/app/modules/studentSubscription/`

**Files:**
- `studentSubscription.interface.ts` - Types & enums
- `studentSubscription.model.ts` - Mongoose schema with auto-calculation
- `studentSubscription.validation.ts` - Zod schemas
- `studentSubscription.service.ts` - Subscription logic
- `studentSubscription.controller.ts` - Request handlers
- `studentSubscription.route.ts` - Express routes

## Database Schema

```typescript
{
  _id: ObjectId;
  studentId: ObjectId (ref: User);
  tier: SUBSCRIPTION_TIER;             // FLEXIBLE, REGULAR, LONG_TERM
  pricePerHour: number;                // 30, 28, or 25 EUR

  // Commitment
  commitmentMonths: number;            // 0, 1, or 3
  minimumHours: number;                // 0 or 4

  // Validity
  startDate: Date;
  endDate: Date;                       // Auto-calculated
  status: SUBSCRIPTION_STATUS;         // ACTIVE, EXPIRED, CANCELLED

  // Usage
  totalHoursTaken: number;             // Incremented per session

  // Stripe
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;

  // Cancellation
  cancellationReason?: string;
  cancelledAt?: Date;
}
```

**Indexes:**
- `studentId + status`
- `status + endDate` (expiration queries)
- `tier`

## Pricing Tiers

### FLEXIBLE

**Price:** €30/hour
**Commitment:** None
**Minimum Hours:** None
**Duration:** Unlimited (100 years)

**Best For:** Students trying out the platform or needing occasional help

```typescript
{
  tier: 'FLEXIBLE',
  pricePerHour: 30,
  commitmentMonths: 0,
  minimumHours: 0,
  endDate: startDate + 100 years
}
```

### REGULAR

**Price:** €28/hour (7% discount)
**Commitment:** 1 month
**Minimum Hours:** 4 hours
**Duration:** 1 month

**Best For:** Students needing consistent weekly tutoring

```typescript
{
  tier: 'REGULAR',
  pricePerHour: 28,
  commitmentMonths: 1,
  minimumHours: 4,
  endDate: startDate + 1 month
}
```

### LONG_TERM

**Price:** €25/hour (17% discount)
**Commitment:** 3 months
**Minimum Hours:** 4 hours
**Duration:** 3 months

**Best For:** Students preparing for exams or needing long-term support

```typescript
{
  tier: 'LONG_TERM',
  pricePerHour: 25,
  commitmentMonths: 3,
  minimumHours: 4,
  endDate: startDate + 3 months
}
```

## API Endpoints

### Student Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/subscriptions/subscribe` | Subscribe to plan |
| GET | `/api/v1/subscriptions/my-subscription` | Get active subscription |
| PATCH | `/api/v1/subscriptions/:id/cancel` | Cancel subscription |

### Admin Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/subscriptions` | List all subscriptions |
| GET | `/api/v1/subscriptions/:id` | Get single subscription |
| POST | `/api/v1/subscriptions/expire-old` | Cron job endpoint |

## Key Features

### 1. Auto-Calculation on Creation

Pre-save hook automatically sets pricing and dates:

```typescript
studentSubscriptionSchema.pre('save', function (next) {
  if (this.isNew) {
    // Set price based on tier
    if (this.tier === 'FLEXIBLE') {
      this.pricePerHour = 30;
      this.commitmentMonths = 0;
      this.minimumHours = 0;
      this.endDate = new Date(this.startDate);
      this.endDate.setFullYear(this.endDate.getFullYear() + 100);
    } else if (this.tier === 'REGULAR') {
      this.pricePerHour = 28;
      this.commitmentMonths = 1;
      this.minimumHours = 4;
      this.endDate = new Date(this.startDate);
      this.endDate.setMonth(this.endDate.getMonth() + 1);
    } else if (this.tier === 'LONG_TERM') {
      this.pricePerHour = 25;
      this.commitmentMonths = 3;
      this.minimumHours = 4;
      this.endDate = new Date(this.startDate);
      this.endDate.setMonth(this.endDate.getMonth() + 3);
    }
  }
  next();
});
```

### 2. One Active Subscription Per Student

```typescript
const activeSubscription = await StudentSubscription.findOne({
  studentId,
  status: 'ACTIVE'
});

if (activeSubscription) {
  throw new ApiError(
    StatusCodes.BAD_REQUEST,
    'You already have an active subscription'
  );
}
```

### 3. Usage Tracking

Hours incremented when session completes:

```typescript
const incrementHoursTaken = async (studentId: string, hours: number) => {
  const subscription = await StudentSubscription.findOne({
    studentId,
    status: 'ACTIVE'
  });

  if (subscription) {
    subscription.totalHoursTaken += hours;
    await subscription.save();
  }
};
```

Called after session completes:
```typescript
// In session completion logic
const duration = session.duration / 60; // Convert minutes to hours
await StudentSubscriptionService.incrementHoursTaken(studentId, duration);
```

### 4. User Profile Sync

Subscription tier stored in User model:

```typescript
// On subscribe
await User.findByIdAndUpdate(studentId, {
  'studentProfile.subscriptionTier': tier
});

// On cancel/expire
await User.findByIdAndUpdate(studentId, {
  'studentProfile.subscriptionTier': null
});
```

### 5. Auto-Expiration (Cron)

```typescript
const expireOldSubscriptions = async () => {
  const result = await StudentSubscription.updateMany(
    {
      status: 'ACTIVE',
      endDate: { $lt: new Date() }
    },
    {
      $set: { status: 'EXPIRED' }
    }
  );

  // Update user profiles
  const expiredSubs = await StudentSubscription.find({
    status: 'EXPIRED',
    endDate: { $lt: new Date() }
  });

  for (const sub of expiredSubs) {
    await User.findByIdAndUpdate(sub.studentId, {
      'studentProfile.subscriptionTier': null
    });
  }

  return result.modifiedCount;
};
```

## Workflow Examples

### Subscribe to Plan

**Request:**
```bash
POST /api/v1/subscriptions/subscribe
Authorization: Bearer STUDENT_TOKEN

{
  "tier": "REGULAR"
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Subscription created successfully",
  "data": {
    "_id": "sub123",
    "studentId": "student123",
    "tier": "REGULAR",
    "pricePerHour": 28,
    "commitmentMonths": 1,
    "minimumHours": 4,
    "startDate": "2024-01-15T00:00:00Z",
    "endDate": "2024-02-15T00:00:00Z",
    "status": "ACTIVE",
    "totalHoursTaken": 0
  }
}
```

**Side Effects:**
- Subscription created
- User's `studentProfile.subscriptionTier` → `'REGULAR'`
- (Future) Stripe customer created

### View Active Subscription

**Request:**
```bash
GET /api/v1/subscriptions/my-subscription
Authorization: Bearer STUDENT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Subscription retrieved successfully",
  "data": {
    "_id": "sub123",
    "tier": "REGULAR",
    "pricePerHour": 28,
    "startDate": "2024-01-15T00:00:00Z",
    "endDate": "2024-02-15T00:00:00Z",
    "status": "ACTIVE",
    "totalHoursTaken": 6.5,  // Hours used so far
    "commitmentMonths": 1,
    "minimumHours": 4
  }
}
```

### Cancel Subscription

**Request:**
```bash
PATCH /api/v1/subscriptions/sub123/cancel
Authorization: Bearer STUDENT_TOKEN

{
  "cancellationReason": "Found another tutor"
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Subscription cancelled successfully",
  "data": {
    "_id": "sub123",
    "status": "CANCELLED",
    "cancellationReason": "Found another tutor",
    "cancelledAt": "2024-01-20T10:30:00Z"
  }
}
```

**Side Effects:**
- Subscription status → `CANCELLED`
- User's `studentProfile.subscriptionTier` → `null`
- (Future) Stripe subscription cancelled

### Admin: List Subscriptions

**Request:**
```bash
GET /api/v1/subscriptions?status=ACTIVE&tier=LONG_TERM&page=1&limit=10
Authorization: Bearer ADMIN_TOKEN
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Subscriptions retrieved successfully",
  "data": [
    {
      "_id": "sub456",
      "studentId": {
        "name": "Jane Doe",
        "email": "jane@example.com",
        "profilePicture": "https://..."
      },
      "tier": "LONG_TERM",
      "pricePerHour": 25,
      "totalHoursTaken": 12,
      "minimumHours": 4,
      "endDate": "2024-04-15T00:00:00Z",
      "status": "ACTIVE"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 47,
    "totalPages": 5
  }
}
```

## Stripe Integration (Placeholder)

### Current Implementation

```typescript
// Fields ready in schema
stripeCustomerId?: string;
stripeSubscriptionId?: string;

// TODO comments in service
// const customer = await stripe.customers.create({
//   email: student.email,
//   name: student.name,
//   metadata: { userId: studentId }
// });
// subscription.stripeCustomerId = customer.id;
```

### Future Implementation (Phase 5 - MonthlyBilling)

Will integrate Stripe for:
1. **Customer Creation:** Create Stripe customer on first subscription
2. **Payment Methods:** Store payment method for recurring billing
3. **Invoicing:** Generate monthly invoices based on hours used
4. **Charges:** Charge student at month-end for actual usage
5. **Receipts:** Send PDF receipts via email

**Billing Flow:**
```
Month 1:
  - Student subscribes to REGULAR plan (€28/hr)
  - Takes 5 hours of sessions
  - Month-end: Charged €140 (5 * €28)

Month 2:
  - Takes 3 hours of sessions
  - Month-end: Charged €84 (3 * €28)
  - Meets minimum: ✓ (4 hours over 1 month)
```

## Design Decisions

### Why Three Tiers?

- **Flexible:** Low-risk entry point for new students
- **Regular:** Sweet spot for most students (best value)
- **Long-term:** Maximum discount for committed students

### Why Auto-Calculation?

- Prevents pricing errors
- Ensures consistency
- Simplifies subscription creation
- Single source of truth

### Why Track Hours in Subscription?

- Easy to check if student met minimum commitment
- Analytics on subscription utilization
- Basis for month-end billing

### Why One Active Subscription?

- Simpler billing logic
- Clear pricing for each session
- Prevents subscription confusion

### Why Sync with User Profile?

- Quick access to pricing during session proposal
- No need to query subscription table for every session
- Cached in user object

## Integration with Other Modules

### Session Module

Sessions use subscription pricing:

```typescript
// In session.service.ts (proposeSession)
const student = await User.findById(studentId);
let pricePerHour = 30; // Default

if (student.studentProfile?.subscriptionTier === 'REGULAR') {
  pricePerHour = 28;
} else if (student.studentProfile?.subscriptionTier === 'LONG_TERM') {
  pricePerHour = 25;
}

const totalPrice = (pricePerHour * duration) / 60;
```

### MonthlyBilling Module (Phase 5 - Pending)

Will use subscription data for:
- Calculating monthly charges
- Checking minimum hour commitments
- Generating invoices

### User Module

User profile stores current tier:

```typescript
studentProfile: {
  subscriptionTier: 'FLEXIBLE' | 'REGULAR' | 'LONG_TERM' | null;
  trialRequestsCount: number;
}
```

## Testing (Planned - Phase 9)

### Unit Tests
- Auto-calculation logic
- Price setting by tier
- End date calculation
- One active subscription enforcement

### Integration Tests
- POST /subscribe (all tiers)
- GET /my-subscription
- PATCH /cancel
- POST /expire-old (cron)

### Edge Cases
- Subscribe with existing active subscription
- Cancel already cancelled subscription
- Expire subscription at exact endDate
- Increment hours for non-existent subscription

## Next Steps

This module integrates with:
- ✅ User module (subscription tier sync)
- ✅ Session module (pricing calculation)
- 🔄 MonthlyBilling module (Phase 5 - next)
- 🔄 TutorEarnings module (Phase 5 - commission calculation)
- 🔄 Stripe integration (Phase 5 - payment processing)
