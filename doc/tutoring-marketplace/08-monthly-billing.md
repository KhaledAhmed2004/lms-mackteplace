# Monthly Billing System

## Overview

The **MonthlyBilling** module handles automated month-end billing for all students based on their completed sessions. This is a critical financial component that:

- Generates invoices for all active students at month-end
- Creates detailed line items for each completed session
- Calculates totals automatically (sessions, hours, amounts)
- Generates unique invoice numbers
- Integrates with Stripe for payment processing
- Prevents duplicate billings

## Business Logic

### Month-End Billing Flow

```
Month-End (Cron Job)
  ↓
For Each Active Subscription:
  1. Check if billing already exists (prevent duplicates)
  2. Fetch all completed sessions in billing period
  3. Create line items for each session
  4. Calculate totals (auto-calculated via pre-save hooks)
  5. Generate unique invoice number (INV-YYMM-RANDOM)
  6. Create billing record with PENDING status
  ↓
Stripe Integration:
  1. Create Stripe invoice
  2. Charge customer's payment method
  3. Webhook updates billing status to PAID
```

### Billing Period

- **Period**: Calendar month (1st to last day)
- **Trigger**: Cron job runs at month-end (e.g., 1st of next month at 2 AM)
- **Sessions Included**: All sessions with `status: COMPLETED` and `completedAt` within period

## Data Structure

### IMonthlyBilling Interface

```typescript
export type IMonthlyBilling = {
  studentId: Types.ObjectId;
  subscriptionId: Types.ObjectId;

  // Billing period
  billingMonth: number;        // 1-12
  billingYear: number;         // 2024
  periodStart: Date;           // First day of month
  periodEnd: Date;             // Last day of month

  // Sessions included
  lineItems: IBillingLineItem[];
  totalSessions: number;
  totalHours: number;          // Total hours taken

  // Pricing
  subscriptionTier: string;    // FLEXIBLE, REGULAR, LONG_TERM
  pricePerHour: number;        // 30, 28, or 25 EUR
  subtotal: number;            // Total before any adjustments
  tax: number;                 // VAT (if applicable)
  total: number;               // Final amount

  // Payment
  status: BILLING_STATUS;
  stripeInvoiceId?: string;
  stripePaymentIntentId?: string;
  paidAt?: Date;
  paymentMethod?: string;      // card, bank_transfer, etc.

  // Invoice
  invoiceUrl?: string;         // PDF invoice URL
  invoiceNumber: string;       // Unique invoice number

  // Metadata
  notes?: string;
  failureReason?: string;
};
```

### Billing Line Item

```typescript
export type IBillingLineItem = {
  sessionId: Types.ObjectId;
  subject: string;
  tutorName: string;
  date: Date;
  duration: number;            // minutes
  pricePerHour: number;        // EUR
  amount: number;              // EUR (calculated)
};
```

### Billing Status

```typescript
export enum BILLING_STATUS {
  PENDING = 'PENDING',         // Generated, not yet paid
  PAID = 'PAID',              // Payment successful
  FAILED = 'FAILED',          // Payment failed
  REFUNDED = 'REFUNDED',      // Payment refunded
}
```

## Mongoose Schema Features

### Unique Constraints

**Compound unique index** prevents duplicate billings:

```typescript
monthlyBillingSchema.index(
  { studentId: 1, billingYear: 1, billingMonth: 1 },
  { unique: true }
);
```

This ensures:
- One billing per student per month
- No duplicate charges
- Database-level integrity

### Auto-Generated Invoice Numbers

**Pre-save hook** generates unique invoice numbers:

```typescript
monthlyBillingSchema.pre('save', function (next) {
  if (this.isNew && !this.invoiceNumber) {
    const year = this.billingYear.toString().slice(-2); // Last 2 digits
    const month = this.billingMonth.toString().padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.invoiceNumber = `INV-${year}${month}-${random}`;
  }
  next();
});
```

**Format**: `INV-YYMM-RANDOM`

**Example**: `INV-2401-A3B2C1` (January 2024)

### Auto-Calculated Totals

**Pre-save hook** calculates totals from line items:

```typescript
monthlyBillingSchema.pre('save', function (next) {
  if (this.lineItems && this.lineItems.length > 0) {
    this.totalSessions = this.lineItems.length;
    this.totalHours = this.lineItems.reduce((sum, item) => sum + item.duration / 60, 0);
    this.subtotal = this.lineItems.reduce((sum, item) => sum + item.amount, 0);
    this.total = this.subtotal + this.tax;
  }
  next();
});
```

This ensures:
- Consistent calculations
- No manual calculation errors
- Automatic updates on save

### Indexes

```typescript
monthlyBillingSchema.index({ studentId: 1, billingYear: -1, billingMonth: -1 });
monthlyBillingSchema.index({ status: 1 });
monthlyBillingSchema.index({ invoiceNumber: 1 });
monthlyBillingSchema.index({ stripeInvoiceId: 1 });
```

## Service Layer

### generateMonthlyBillings()

**Purpose**: Generate billings for all active students at month-end

**Algorithm**:

```typescript
const generateMonthlyBillings = async (month: number, year: number) => {
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0, 23, 59, 59);

  // Get all active subscriptions
  const activeSubscriptions = await StudentSubscription.find({
    status: SUBSCRIPTION_STATUS.ACTIVE,
  }).populate('studentId');

  for (const subscription of activeSubscriptions) {
    // Check if billing already exists
    const existingBilling = await MonthlyBilling.findOne({
      studentId: subscription.studentId,
      billingMonth: month,
      billingYear: year,
    });

    if (existingBilling) continue; // Skip if already billed

    // Get completed sessions
    const sessions = await Session.find({
      studentId: subscription.studentId,
      status: SESSION_STATUS.COMPLETED,
      completedAt: { $gte: periodStart, $lte: periodEnd },
    }).populate('tutorId', 'name');

    if (sessions.length === 0) continue; // Skip if no sessions

    // Build line items
    const lineItems = sessions.map(session => ({
      sessionId: session._id,
      subject: session.subject,
      tutorName: session.tutorId.name,
      date: session.completedAt,
      duration: session.duration,
      pricePerHour: session.pricePerHour,
      amount: session.totalPrice,
    }));

    // Create billing
    await MonthlyBilling.create({
      studentId: subscription.studentId,
      subscriptionId: subscription._id,
      billingMonth: month,
      billingYear: year,
      periodStart,
      periodEnd,
      lineItems,
      subscriptionTier: subscription.tier,
      pricePerHour: subscription.pricePerHour,
      status: BILLING_STATUS.PENDING,
    });
  }
};
```

**Key Features**:
- Skips students with no completed sessions
- Prevents duplicate billings
- Auto-calculates totals via pre-save hooks
- Generates unique invoice numbers

### Other Service Methods

- `getMyBillings(studentId, query)` - Student's billing history with pagination
- `getAllBillings(query)` - Admin view of all billings
- `getSingleBilling(id)` - View single billing details
- `markAsPaid(id, payload)` - Mark billing as paid (webhook/manual)
- `markAsFailed(id, reason)` - Mark billing as failed

## API Endpoints

### Student Endpoints

#### Get My Billings

```
GET /api/v1/billings/my-billings
Authorization: Bearer <student_token>
Query: ?status=PAID&page=1&limit=10&sort=-billingYear,-billingMonth
```

**Response**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Billing history retrieved successfully",
  "data": [
    {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "studentId": "65a1b2c3d4e5f6g7h8i9j0k2",
      "subscriptionId": "65a1b2c3d4e5f6g7h8i9j0k3",
      "billingMonth": 1,
      "billingYear": 2024,
      "periodStart": "2024-01-01T00:00:00.000Z",
      "periodEnd": "2024-01-31T23:59:59.999Z",
      "lineItems": [
        {
          "sessionId": "65a1b2c3d4e5f6g7h8i9j0k4",
          "subject": "Mathematics",
          "tutorName": "John Doe",
          "date": "2024-01-15T10:00:00.000Z",
          "duration": 60,
          "pricePerHour": 30,
          "amount": 30
        }
      ],
      "totalSessions": 4,
      "totalHours": 4,
      "subscriptionTier": "FLEXIBLE",
      "pricePerHour": 30,
      "subtotal": 120,
      "tax": 0,
      "total": 120,
      "status": "PAID",
      "invoiceNumber": "INV-2401-A3B2C1",
      "paidAt": "2024-02-01T12:00:00.000Z",
      "createdAt": "2024-02-01T02:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 12
  }
}
```

#### Get Single Billing

```
GET /api/v1/billings/:id
Authorization: Bearer <student_token>
```

### Admin Endpoints

#### Generate Monthly Billings (Cron Job)

```
POST /api/v1/billings/generate
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "month": 1,
  "year": 2024
}
```

**Response**:

```json
{
  "success": true,
  "statusCode": 201,
  "message": "45 monthly billings generated successfully",
  "data": {
    "count": 45,
    "billings": [...]
  }
}
```

#### Get All Billings

```
GET /api/v1/billings
Authorization: Bearer <admin_token>
Query: ?status=PENDING&month=1&year=2024&searchTerm=INV&page=1&limit=10
```

#### Mark Billing as Paid

```
PATCH /api/v1/billings/:id/mark-paid
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "stripePaymentIntentId": "pi_1234567890",
  "paymentMethod": "card"
}
```

#### Mark Billing as Failed

```
PATCH /api/v1/billings/:id/mark-failed
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "failureReason": "Insufficient funds"
}
```

## Stripe Integration

### Creating Stripe Invoice

**TODO**: Implement in `generateMonthlyBillings()`:

```typescript
// After creating billing record
const stripeInvoice = await stripe.invoices.create({
  customer: student.stripeCustomerId,
  auto_advance: true, // Auto-finalize and charge
  metadata: {
    billingId: billing._id.toString(),
    billingMonth: month,
    billingYear: year,
  },
});

// Add line items
for (const item of billing.lineItems) {
  await stripe.invoiceItems.create({
    customer: student.stripeCustomerId,
    invoice: stripeInvoice.id,
    amount: Math.round(item.amount * 100), // Convert to cents
    currency: 'eur',
    description: `${item.subject} session with ${item.tutorName} (${item.duration} min)`,
  });
}

// Finalize and charge
await stripe.invoices.finalizeInvoice(stripeInvoice.id);

// Update billing with Stripe IDs
billing.stripeInvoiceId = stripeInvoice.id;
await billing.save();
```

### Webhook Handling

**Listen for**: `invoice.payment_succeeded`, `invoice.payment_failed`

```typescript
router.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

  if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object;
    const billingId = invoice.metadata.billingId;

    await MonthlyBillingService.markAsPaid(billingId, {
      stripePaymentIntentId: invoice.payment_intent,
      paymentMethod: invoice.payment_settings.payment_method_types[0],
    });
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object;
    const billingId = invoice.metadata.billingId;

    await MonthlyBillingService.markAsFailed(
      billingId,
      invoice.last_finalization_error?.message || 'Payment failed'
    );
  }

  res.json({ received: true });
});
```

## Cron Job Setup

**Schedule**: Run at 2:00 AM on 1st of every month

```typescript
// Using node-cron
import cron from 'node-cron';

cron.schedule('0 2 1 * *', async () => {
  const now = new Date();
  const lastMonth = now.getMonth(); // 0-11
  const year = lastMonth === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const month = lastMonth === 0 ? 12 : lastMonth;

  try {
    const result = await MonthlyBillingService.generateMonthlyBillings(month, year);
    logger.info(`Generated ${result.length} monthly billings for ${year}-${month}`);
  } catch (error) {
    errorLogger.error('Failed to generate monthly billings', { error, month, year });
  }
});
```

## Example Scenario

### Scenario: Anna's January 2024 Billing

**Background**:
- Anna has REGULAR subscription (€28/hr)
- She took 5 sessions in January 2024

**Sessions**:

| Date | Tutor | Subject | Duration | Price/hr | Amount |
|------|-------|---------|----------|----------|--------|
| Jan 5 | John Doe | Math | 60 min | €28 | €28 |
| Jan 10 | Jane Smith | Physics | 90 min | €28 | €42 |
| Jan 15 | John Doe | Math | 60 min | €28 | €28 |
| Jan 22 | Mike Brown | Chemistry | 120 min | €28 | €56 |
| Jan 28 | John Doe | Math | 60 min | €28 | €28 |

**Generated Billing**:

```json
{
  "studentId": "anna_id",
  "subscriptionId": "anna_subscription_id",
  "billingMonth": 1,
  "billingYear": 2024,
  "periodStart": "2024-01-01T00:00:00.000Z",
  "periodEnd": "2024-01-31T23:59:59.999Z",
  "lineItems": [
    {
      "sessionId": "session_1",
      "subject": "Mathematics",
      "tutorName": "John Doe",
      "date": "2024-01-05T10:00:00.000Z",
      "duration": 60,
      "pricePerHour": 28,
      "amount": 28
    },
    // ... 4 more items
  ],
  "totalSessions": 5,
  "totalHours": 6.5,
  "subscriptionTier": "REGULAR",
  "pricePerHour": 28,
  "subtotal": 182,
  "tax": 0,
  "total": 182,
  "status": "PENDING",
  "invoiceNumber": "INV-2401-X7Y2Z9"
}
```

**Stripe charges €182** → Billing status becomes `PAID`

## Error Handling

### Duplicate Billing Prevention

```typescript
// Unique index prevents duplicates at database level
monthlyBillingSchema.index(
  { studentId: 1, billingYear: 1, billingMonth: 1 },
  { unique: true }
);

// Service layer checks before creation
const existingBilling = await MonthlyBilling.findOne({
  studentId: subscription.studentId,
  billingMonth: month,
  billingYear: year,
});

if (existingBilling) {
  continue; // Skip this student
}
```

### No Sessions = No Billing

```typescript
const sessions = await Session.find({...});

if (sessions.length === 0) {
  continue; // Skip students with no completed sessions
}
```

### Stripe Payment Failures

- Webhook updates billing status to `FAILED`
- `failureReason` field stores error message
- Admin can retry payment or contact student

## Testing Checklist

- [ ] Generate billings for students with completed sessions
- [ ] Verify duplicate billing prevention (unique index)
- [ ] Verify invoice number format (INV-YYMM-RANDOM)
- [ ] Verify auto-calculated totals (sessions, hours, amounts)
- [ ] Verify line items contain correct session details
- [ ] Test student billing history pagination
- [ ] Test admin billing list with filters
- [ ] Test mark as paid endpoint
- [ ] Test mark as failed endpoint
- [ ] Test Stripe webhook integration
- [ ] Test cron job execution at month-end
- [ ] Verify no billing for students with zero sessions

## Future Enhancements

1. **PDF Invoice Generation**: Use Puppeteer to generate PDF invoices
2. **Email Notifications**: Send invoice emails to students
3. **Payment Reminders**: Automated reminders for unpaid billings
4. **Refund Handling**: Support for partial/full refunds
5. **Tax Calculation**: VAT calculation based on student location
6. **Multi-Currency Support**: Support for currencies other than EUR
7. **Payment Plans**: Allow students to split large bills
8. **Invoice Customization**: Branded invoices with logo

## Related Modules

- **StudentSubscription**: Determines pricing tier and active status
- **Session**: Source of completed sessions for billing
- **TutorEarnings**: Generated after billing (platform takes commission)
- **Stripe Integration**: Payment processing and webhooks
