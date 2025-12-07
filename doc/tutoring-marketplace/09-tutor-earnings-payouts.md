# Tutor Earnings & Payouts

## Overview

The **TutorEarnings** module handles automated payout calculations and Stripe Connect transfers to tutors. This module works in conjunction with MonthlyBilling to ensure tutors get paid for their teaching sessions.

**Key Features**:
- Automatic earnings calculation for all tutors at month-end
- Platform commission handling (20% default)
- Line-by-line session breakdown
- Stripe Connect integration for payouts
- Unique payout references
- Payout status tracking

## Business Logic

### Month-End Payout Flow

```
Month-End (After Billing Generation)
  ↓
For Each Tutor with Completed Sessions:
  1. Check if payout already exists (prevent duplicates)
  2. Fetch all completed sessions in payout period
  3. Create line items for each session
  4. Calculate gross earnings (total session prices)
  5. Calculate platform commission (e.g., 20%)
  6. Calculate net earnings (what tutor receives)
  7. Generate unique payout reference (PAYOUT-YYMM-RANDOM)
  8. Create earnings record with PENDING status
  ↓
Admin Initiates Payout:
  1. Admin reviews pending payouts
  2. Clicks "Initiate Payout"
  3. System creates Stripe Connect transfer
  4. Status changes to PROCESSING
  ↓
Stripe Webhook Confirms:
  1. Transfer succeeds → Status: PAID
  2. Transfer fails → Status: FAILED
```

### Commission Model

**Platform Revenue Model**:
- Student pays: Full session price (based on subscription tier)
- Platform keeps: 20% commission (configurable)
- Tutor receives: 80% of session price

**Example**:
- Session: 1 hour at €30 (FLEXIBLE tier)
- Student pays: €30 (via MonthlyBilling)
- Platform commission: €6 (20%)
- Tutor receives: €24 (80%)

## Data Structure

### ITutorEarnings Interface

```typescript
export type ITutorEarnings = {
  tutorId: Types.ObjectId;

  // Payout period
  payoutMonth: number;           // 1-12
  payoutYear: number;            // 2024
  periodStart: Date;             // First day of month
  periodEnd: Date;               // Last day of month

  // Sessions included
  lineItems: IEarningLineItem[];
  totalSessions: number;
  totalHours: number;            // Total hours taught

  // Earnings breakdown
  grossEarnings: number;         // Total session prices
  platformCommission: number;    // Platform's cut (e.g., 20%)
  commissionRate: number;        // 0.20 (20%)
  netEarnings: number;           // Amount tutor receives

  // Payout details
  status: PAYOUT_STATUS;
  stripeTransferId?: string;     // Stripe Connect transfer ID
  stripePayoutId?: string;       // Stripe payout ID
  paidAt?: Date;
  paymentMethod?: string;        // bank_account, etc.

  // Metadata
  notes?: string;
  failureReason?: string;
  payoutReference: string;       // Unique payout reference
};
```

### Earning Line Item

```typescript
export type IEarningLineItem = {
  sessionId: Types.ObjectId;
  studentName: string;
  subject: string;
  completedAt: Date;
  duration: number;              // minutes
  sessionPrice: number;          // EUR (full session price)
  tutorEarning: number;          // EUR (after platform commission)
};
```

### Payout Status

```typescript
export enum PAYOUT_STATUS {
  PENDING = 'PENDING',           // Earnings calculated, not yet paid
  PROCESSING = 'PROCESSING',     // Payout initiated in Stripe
  PAID = 'PAID',                 // Successfully transferred to tutor
  FAILED = 'FAILED',             // Payout failed
  REFUNDED = 'REFUNDED',         // Payment was refunded
}
```

## Mongoose Schema Features

### Unique Constraints

**Compound unique index** prevents duplicate payouts:

```typescript
tutorEarningsSchema.index(
  { tutorId: 1, payoutYear: 1, payoutMonth: 1 },
  { unique: true }
);
```

This ensures:
- One payout per tutor per month
- No duplicate payments
- Database-level integrity

### Auto-Generated Payout References

**Pre-save hook** generates unique payout references:

```typescript
tutorEarningsSchema.pre('save', function (next) {
  if (this.isNew && !this.payoutReference) {
    const year = this.payoutYear.toString().slice(-2);
    const month = this.payoutMonth.toString().padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.payoutReference = `PAYOUT-${year}${month}-${random}`;
  }
  next();
});
```

**Format**: `PAYOUT-YYMM-RANDOM`

**Example**: `PAYOUT-2401-K9L3M7` (January 2024)

### Auto-Calculated Earnings

**Pre-save hook** calculates earnings from line items:

```typescript
tutorEarningsSchema.pre('save', function (next) {
  if (this.lineItems && this.lineItems.length > 0) {
    this.totalSessions = this.lineItems.length;
    this.totalHours = this.lineItems.reduce(
      (sum, item) => sum + item.duration / 60,
      0
    );
    this.grossEarnings = this.lineItems.reduce(
      (sum, item) => sum + item.sessionPrice,
      0
    );
    this.platformCommission = this.grossEarnings * this.commissionRate;
    this.netEarnings = this.grossEarnings - this.platformCommission;
  }
  next();
});
```

This ensures:
- Consistent calculations
- Automatic commission calculation
- No manual calculation errors

### Indexes

```typescript
tutorEarningsSchema.index({ tutorId: 1, payoutYear: -1, payoutMonth: -1 });
tutorEarningsSchema.index({ status: 1 });
tutorEarningsSchema.index({ payoutReference: 1 });
tutorEarningsSchema.index({ stripeTransferId: 1 });
```

## Service Layer

### generateTutorEarnings()

**Purpose**: Generate earnings for all tutors at month-end (called after billing generation)

**Algorithm**:

```typescript
const generateTutorEarnings = async (
  month: number,
  year: number,
  commissionRate: number = 0.2
) => {
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0, 23, 59, 59);

  // Get all active tutors
  const tutors = await User.find({ role: USER_ROLES.TUTOR });

  for (const tutor of tutors) {
    // Check if payout already exists
    const existingPayout = await TutorEarnings.findOne({
      tutorId: tutor._id,
      payoutMonth: month,
      payoutYear: year,
    });

    if (existingPayout) continue; // Skip if already generated

    // Get completed sessions for this tutor
    const sessions = await Session.find({
      tutorId: tutor._id,
      status: SESSION_STATUS.COMPLETED,
      completedAt: { $gte: periodStart, $lte: periodEnd },
    }).populate('studentId', 'name');

    if (sessions.length === 0) continue; // Skip tutors with no sessions

    // Build line items
    const lineItems = sessions.map(session => ({
      sessionId: session._id,
      studentName: session.studentId.name,
      subject: session.subject,
      completedAt: session.completedAt,
      duration: session.duration,
      sessionPrice: session.totalPrice,
      tutorEarning: session.totalPrice * (1 - commissionRate),
    }));

    // Create earnings record
    await TutorEarnings.create({
      tutorId: tutor._id,
      payoutMonth: month,
      payoutYear: year,
      periodStart,
      periodEnd,
      lineItems,
      commissionRate,
      status: PAYOUT_STATUS.PENDING,
    });
  }
};
```

**Key Features**:
- Skips tutors with no completed sessions
- Prevents duplicate payouts
- Auto-calculates earnings via pre-save hooks
- Configurable commission rate

### initiatePayout()

**Purpose**: Create Stripe Connect transfer to tutor's account

```typescript
const initiatePayout = async (id: string, payload: { notes?: string }) => {
  const earning = await TutorEarnings.findById(id).populate('tutorId');

  if (earning.status !== PAYOUT_STATUS.PENDING) {
    throw new ApiError(400, `Cannot initiate payout. Current status: ${earning.status}`);
  }

  if (earning.netEarnings <= 0) {
    throw new ApiError(400, 'Cannot initiate payout with zero or negative earnings');
  }

  // TODO: Integrate Stripe Connect transfer
  const tutor = earning.tutorId;
  const transfer = await stripe.transfers.create({
    amount: Math.round(earning.netEarnings * 100), // Convert to cents
    currency: 'eur',
    destination: tutor.stripeConnectAccountId,
    transfer_group: earning.payoutReference,
    metadata: {
      tutorId: tutor._id.toString(),
      payoutMonth: earning.payoutMonth,
      payoutYear: earning.payoutYear,
    },
  });

  earning.stripeTransferId = transfer.id;
  earning.status = PAYOUT_STATUS.PROCESSING;
  if (payload.notes) earning.notes = payload.notes;

  await earning.save();
  return earning;
};
```

### Other Service Methods

- `getMyEarnings(tutorId, query)` - Tutor's earnings history with pagination
- `getAllEarnings(query)` - Admin view of all earnings
- `getSingleEarning(id)` - View single earnings record
- `markAsPaid(id, payload)` - Mark payout as paid (webhook/manual)
- `markAsFailed(id, reason)` - Mark payout as failed

## API Endpoints

### Tutor Endpoints

#### Get My Earnings

```
GET /api/v1/earnings/my-earnings
Authorization: Bearer <tutor_token>
Query: ?status=PAID&page=1&limit=10&sort=-payoutYear,-payoutMonth
```

**Response**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Earnings history retrieved successfully",
  "data": [
    {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "tutorId": "65a1b2c3d4e5f6g7h8i9j0k2",
      "payoutMonth": 1,
      "payoutYear": 2024,
      "periodStart": "2024-01-01T00:00:00.000Z",
      "periodEnd": "2024-01-31T23:59:59.999Z",
      "lineItems": [
        {
          "sessionId": "65a1b2c3d4e5f6g7h8i9j0k4",
          "studentName": "Anna Schmidt",
          "subject": "Mathematics",
          "completedAt": "2024-01-15T10:00:00.000Z",
          "duration": 60,
          "sessionPrice": 30,
          "tutorEarning": 24
        }
      ],
      "totalSessions": 8,
      "totalHours": 10,
      "grossEarnings": 300,
      "platformCommission": 60,
      "commissionRate": 0.2,
      "netEarnings": 240,
      "status": "PAID",
      "payoutReference": "PAYOUT-2401-K9L3M7",
      "paidAt": "2024-02-05T12:00:00.000Z",
      "createdAt": "2024-02-01T03:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 6
  }
}
```

#### Get Single Earnings Record

```
GET /api/v1/earnings/:id
Authorization: Bearer <tutor_token>
```

### Admin Endpoints

#### Generate Tutor Earnings (Cron Job)

```
POST /api/v1/earnings/generate
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "month": 1,
  "year": 2024,
  "commissionRate": 0.2
}
```

**Response**:

```json
{
  "success": true,
  "statusCode": 201,
  "message": "23 tutor earnings generated successfully",
  "data": {
    "count": 23,
    "earnings": [...]
  }
}
```

#### Get All Earnings

```
GET /api/v1/earnings
Authorization: Bearer <admin_token>
Query: ?status=PENDING&month=1&year=2024&searchTerm=PAYOUT&page=1&limit=10
```

#### Initiate Payout

```
PATCH /api/v1/earnings/:id/initiate-payout
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "notes": "Monthly payout for January 2024"
}
```

**Response**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Payout initiated successfully",
  "data": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "status": "PROCESSING",
    "stripeTransferId": "tr_1234567890",
    "notes": "Monthly payout for January 2024"
  }
}
```

#### Mark Payout as Paid

```
PATCH /api/v1/earnings/:id/mark-paid
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "stripePayoutId": "po_1234567890",
  "paymentMethod": "bank_account"
}
```

#### Mark Payout as Failed

```
PATCH /api/v1/earnings/:id/mark-failed
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "failureReason": "Insufficient funds in platform account"
}
```

## Stripe Connect Integration

### Setting Up Tutor Stripe Connect Account

**When tutor is approved**:

```typescript
const createConnectAccount = async (tutorId: string) => {
  const tutor = await User.findById(tutorId);

  const account = await stripe.accounts.create({
    type: 'express', // Or 'standard'
    country: 'DE', // Germany
    email: tutor.email,
    capabilities: {
      transfers: { requested: true },
    },
    metadata: {
      tutorId: tutor._id.toString(),
    },
  });

  tutor.stripeConnectAccountId = account.id;
  await tutor.save();

  // Generate onboarding link
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${process.env.FRONTEND_URL}/tutor/settings`,
    return_url: `${process.env.FRONTEND_URL}/tutor/dashboard`,
    type: 'account_onboarding',
  });

  return accountLink.url; // Send to tutor via email
};
```

### Creating Stripe Transfer

**In `initiatePayout()` service**:

```typescript
const transfer = await stripe.transfers.create({
  amount: Math.round(earning.netEarnings * 100), // €240 → 24000 cents
  currency: 'eur',
  destination: tutor.stripeConnectAccountId, // Tutor's Connect account
  transfer_group: earning.payoutReference, // For reconciliation
  description: `Payout for ${earning.payoutMonth}/${earning.payoutYear}`,
  metadata: {
    tutorId: tutor._id.toString(),
    earningsId: earning._id.toString(),
    payoutMonth: earning.payoutMonth,
    payoutYear: earning.payoutYear,
  },
});

earning.stripeTransferId = transfer.id;
earning.status = PAYOUT_STATUS.PROCESSING;
await earning.save();
```

### Webhook Handling

**Listen for**: `transfer.created`, `payout.paid`, `payout.failed`

```typescript
router.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

  if (event.type === 'payout.paid') {
    const payout = event.data.object;
    const earningsId = payout.metadata.earningsId;

    await TutorEarningsService.markAsPaid(earningsId, {
      stripePayoutId: payout.id,
      paymentMethod: payout.method,
    });
  }

  if (event.type === 'payout.failed') {
    const payout = event.data.object;
    const earningsId = payout.metadata.earningsId;

    await TutorEarningsService.markAsFailed(
      earningsId,
      payout.failure_message || 'Payout failed'
    );
  }

  res.json({ received: true });
});
```

## Cron Job Setup

**Schedule**: Run at 3:00 AM on 1st of every month (after billing generation at 2:00 AM)

```typescript
import cron from 'node-cron';

cron.schedule('0 3 1 * *', async () => {
  const now = new Date();
  const lastMonth = now.getMonth(); // 0-11
  const year = lastMonth === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const month = lastMonth === 0 ? 12 : lastMonth;

  try {
    const result = await TutorEarningsService.generateTutorEarnings(month, year, 0.2);
    logger.info(`Generated ${result.length} tutor earnings for ${year}-${month}`);
  } catch (error) {
    errorLogger.error('Failed to generate tutor earnings', { error, month, year });
  }
});
```

## Example Scenario

### Scenario: John's January 2024 Earnings

**Background**:
- John is a tutor teaching Math and Physics
- Platform commission: 20%
- He taught 8 sessions in January 2024

**Sessions**:

| Date | Student | Subject | Duration | Session Price | Tutor Earning |
|------|---------|---------|----------|---------------|---------------|
| Jan 5 | Anna | Math | 60 min | €30 | €24 |
| Jan 10 | Anna | Math | 90 min | €45 | €36 |
| Jan 15 | Ben | Physics | 60 min | €28 | €22.40 |
| Jan 20 | Clara | Math | 120 min | €60 | €48 |
| Jan 22 | Anna | Math | 60 min | €30 | €24 |
| Jan 25 | Ben | Physics | 60 min | €28 | €22.40 |
| Jan 27 | David | Math | 60 min | €25 | €20 |
| Jan 30 | Clara | Math | 90 min | €45 | €36 |

**Generated Earnings**:

```json
{
  "tutorId": "john_id",
  "payoutMonth": 1,
  "payoutYear": 2024,
  "periodStart": "2024-01-01T00:00:00.000Z",
  "periodEnd": "2024-01-31T23:59:59.999Z",
  "lineItems": [
    {
      "sessionId": "session_1",
      "studentName": "Anna Schmidt",
      "subject": "Mathematics",
      "completedAt": "2024-01-05T10:00:00.000Z",
      "duration": 60,
      "sessionPrice": 30,
      "tutorEarning": 24
    },
    // ... 7 more items
  ],
  "totalSessions": 8,
  "totalHours": 10,
  "grossEarnings": 291,
  "platformCommission": 58.2,
  "commissionRate": 0.2,
  "netEarnings": 232.8,
  "status": "PENDING",
  "payoutReference": "PAYOUT-2401-K9L3M7"
}
```

**Payout Flow**:
1. Admin reviews pending payouts
2. Admin clicks "Initiate Payout" → Stripe transfer created (€232.80)
3. Status changes to `PROCESSING`
4. Stripe webhook confirms success → Status: `PAID`
5. John receives €232.80 in his bank account

## Commission Calculation

### Formula

```
Gross Earnings = Σ(Session Prices)
Platform Commission = Gross Earnings × Commission Rate
Net Earnings = Gross Earnings - Platform Commission
```

### Example Calculations

**Scenario 1**: 10 hours at €30/hr, 20% commission
- Gross: €300
- Commission: €60 (20%)
- Net: €240

**Scenario 2**: 8 hours at €28/hr, 15% commission
- Gross: €224
- Commission: €33.60 (15%)
- Net: €190.40

## Error Handling

### Duplicate Payout Prevention

```typescript
// Unique index prevents duplicates at database level
tutorEarningsSchema.index(
  { tutorId: 1, payoutYear: 1, payoutMonth: 1 },
  { unique: true }
);

// Service layer checks before creation
const existingPayout = await TutorEarnings.findOne({
  tutorId: tutor._id,
  payoutMonth: month,
  payoutYear: year,
});

if (existingPayout) {
  continue; // Skip this tutor
}
```

### No Sessions = No Payout

```typescript
const sessions = await Session.find({...});

if (sessions.length === 0) {
  continue; // Skip tutors with no completed sessions
}
```

### Zero/Negative Earnings

```typescript
if (earning.netEarnings <= 0) {
  throw new ApiError(400, 'Cannot initiate payout with zero or negative earnings');
}
```

### Missing Stripe Connect Account

```typescript
if (!tutor.stripeConnectAccountId) {
  throw new ApiError(400, 'Tutor has not completed Stripe Connect onboarding');
}
```

## Testing Checklist

- [ ] Generate earnings for tutors with completed sessions
- [ ] Verify duplicate payout prevention (unique index)
- [ ] Verify payout reference format (PAYOUT-YYMM-RANDOM)
- [ ] Verify auto-calculated earnings (gross, commission, net)
- [ ] Verify commission rate is applied correctly
- [ ] Verify line items contain correct session details
- [ ] Test tutor earnings history pagination
- [ ] Test admin earnings list with filters
- [ ] Test initiate payout endpoint
- [ ] Test mark as paid endpoint
- [ ] Test mark as failed endpoint
- [ ] Test Stripe Connect transfer creation
- [ ] Test Stripe webhook integration
- [ ] Test cron job execution at month-end
- [ ] Verify no payout for tutors with zero sessions
- [ ] Verify error when tutor missing Stripe Connect account

## Future Enhancements

1. **Variable Commission Rates**: Different rates for different tutors/subjects
2. **Bonus Payments**: Performance-based bonuses
3. **Referral Commissions**: Tutor referral program
4. **Tax Withholding**: Automatic tax calculation and withholding
5. **Multi-Currency Payouts**: Support for currencies other than EUR
6. **Instant Payouts**: Stripe Instant Payouts for faster transfers
7. **Detailed Analytics**: Earnings trends, top subjects, etc.
8. **CSV Export**: Export earnings data for accounting

## Related Modules

- **MonthlyBilling**: Generates student billings (source of platform revenue)
- **Session**: Source of completed sessions for earnings calculation
- **User**: Stores tutor's Stripe Connect account ID
- **Stripe Connect**: Payment infrastructure for marketplace payouts
