# Phase 4: Sessions & In-Chat Booking

## Overview

In-chat booking system where tutors propose sessions within chat messages and students accept/reject, creating scheduled sessions with automatic pricing.

## Status: ✅ COMPLETED

## Part 1: Message Model Extensions

**Modified Files:**
- `src/app/modules/message/message.interface.ts`
- `src/app/modules/message/message.model.ts`

### New Message Type: `session_proposal`

Added session proposal capability to messages:

```typescript
export type ISessionProposal = {
  subject: string;
  startTime: Date;
  endTime: Date;
  duration: number;                     // minutes
  price: number;                        // EUR (calculated)
  description?: string;
  status: 'PROPOSED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  sessionId?: Types.ObjectId;           // Created session when accepted
  rejectionReason?: string;
  expiresAt: Date;                      // 24-hour expiration
};

export type IMessage = {
  // ... existing fields
  type: 'text' | 'image' | 'media' | 'doc' | 'mixed' | 'session_proposal';
  sessionProposal?: ISessionProposal;
};
```

**Auto-Expiration:** Proposals expire after 24 hours (pre-save hook)

---

## Part 2: Session Module

**Location:** `src/app/modules/session/`

**Files Created:**
- `session.interface.ts` - Types & SESSION_STATUS enum
- `session.model.ts` - Mongoose schema with auto-pricing
- `session.validation.ts` - Zod schemas
- `session.service.ts` - Booking logic & price calculation
- `session.controller.ts` - Request handlers
- `session.route.ts` - Express routes

### Database Schema

```typescript
{
  _id: ObjectId;
  studentId: ObjectId (ref: User);
  tutorId: ObjectId (ref: User);
  subject: string;
  description?: string;

  // Timing
  startTime: Date;
  endTime: Date;
  duration: number;                    // minutes

  // Pricing (auto-calculated based on student's subscription)
  pricePerHour: number;                // 30, 28, or 25 EUR
  totalPrice: number;                  // duration * pricePerHour

  // Google Meet
  googleMeetLink?: string;             // Placeholder
  googleCalendarEventId?: string;      // Placeholder

  // Status
  status: SESSION_STATUS;              // SCHEDULED, IN_PROGRESS, COMPLETED, etc.

  // References
  messageId?: ObjectId;                // Proposal message
  chatId?: ObjectId;
  reviewId?: ObjectId;

  // Timestamps
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
}
```

**Indexes:**
- `studentId + createdAt`
- `tutorId + createdAt`
- `status + startTime` (upcoming sessions)
- `chatId`

### Session Status Flow

```
SCHEDULED → IN_PROGRESS → COMPLETED
    ↓
CANCELLED (by student/tutor)
    ↓
NO_SHOW (student didn't attend)
```

### Automatic Price Calculation

Price determined by student's active subscription tier:

```typescript
// FLEXIBLE tier
pricePerHour = 30 EUR

// REGULAR tier
pricePerHour = 28 EUR

// LONG_TERM tier
pricePerHour = 25 EUR

// Total price
totalPrice = (pricePerHour * duration) / 60
```

**Example:** 90-minute session for REGULAR tier student:
- `pricePerHour = 28`
- `duration = 90`
- `totalPrice = (28 * 90) / 60 = 42 EUR`

---

## API Endpoints

### Tutor Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/sessions/propose` | Propose session in chat |

**Propose Session Example:**
```bash
POST /api/v1/sessions/propose
Authorization: Bearer TUTOR_TOKEN

{
  "chatId": "chat123",
  "subject": "Mathematics",
  "startTime": "2024-01-25T15:00:00Z",
  "endTime": "2024-01-25T16:30:00Z",
  "description": "Calculus derivatives and integration"
}
```

**Response:**
- Creates message with `type: 'session_proposal'`
- Price auto-calculated based on student's subscription
- Proposal expires in 24 hours

### Student Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/sessions/proposals/:messageId/accept` | Accept proposal |
| POST | `/api/v1/sessions/proposals/:messageId/reject` | Reject proposal |

**Accept Proposal:**
```bash
POST /api/v1/sessions/proposals/msg123/accept
Authorization: Bearer STUDENT_TOKEN
```

**Side Effects:**
- Session created with `status: SCHEDULED`
- Proposal message status: `ACCEPTED`
- Google Meet link generated (placeholder)
- Both parties notified (placeholder)

**Reject Proposal:**
```bash
POST /api/v1/sessions/proposals/msg123/reject
Authorization: Bearer STUDENT_TOKEN

{
  "rejectionReason": "Not available at that time"
}
```

### Shared Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/sessions` | List sessions (role-filtered) |
| GET | `/api/v1/sessions/:id` | Get single session |
| PATCH | `/api/v1/sessions/:id/cancel` | Cancel session |

**List Sessions:**
```bash
# Student sees own sessions
GET /api/v1/sessions?status=SCHEDULED&sort=-startTime
Authorization: Bearer STUDENT_TOKEN

# Tutor sees own sessions
GET /api/v1/sessions?status=COMPLETED
Authorization: Bearer TUTOR_TOKEN

# Admin sees all sessions
GET /api/v1/sessions?page=1&limit=20
Authorization: Bearer ADMIN_TOKEN
```

### Admin Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| PATCH | `/api/v1/sessions/:id/complete` | Manually complete |
| POST | `/api/v1/sessions/auto-complete` | Cron job endpoint |

**Auto-Complete (Cron):**
```bash
POST /api/v1/sessions/auto-complete
Authorization: Bearer ADMIN_TOKEN
```

Marks all SCHEDULED sessions past `endTime` as COMPLETED.

---

## Workflow Example

### Complete Booking Flow

**1. Tutor Proposes Session in Chat**

```
Tutor: "Would you like a session tomorrow at 3 PM?"

[Tutor clicks "Propose Session" button in chat]

POST /sessions/propose
{
  chatId: "chat123",
  subject: "Mathematics",
  startTime: "2024-01-25T15:00:00Z",
  endTime: "2024-01-25T16:00:00Z"
}

→ Message created in chat:
  type: 'session_proposal'
  sessionProposal: {
    subject: "Mathematics",
    duration: 60,
    price: 28,  // Student has REGULAR tier
    status: 'PROPOSED',
    expiresAt: "2024-01-26T10:00:00Z"  // 24 hours
  }
```

**2. Student Sees Proposal in Chat UI**

```
Chat UI shows proposal card:
┌─────────────────────────────────┐
│ Session Proposal from TutorName │
├─────────────────────────────────┤
│ Subject: Mathematics            │
│ Time: Jan 25, 3:00 PM (60 min) │
│ Price: €28.00                   │
│                                 │
│ [Accept]  [Reject]              │
└─────────────────────────────────┘
```

**3. Student Accepts**

```
POST /sessions/proposals/msg123/accept

→ Session created:
  {
    studentId, tutorId,
    subject: "Mathematics",
    startTime: "2024-01-25T15:00:00Z",
    endTime: "2024-01-25T16:00:00Z",
    duration: 60,
    pricePerHour: 28,
    totalPrice: 28,
    status: 'SCHEDULED',
    messageId: "msg123",
    chatId: "chat123"
  }

→ Proposal message updated:
  sessionProposal.status = 'ACCEPTED'
  sessionProposal.sessionId = session._id

→ (Future) Google Meet link generated
→ (Future) Calendar invites sent
```

**4. Session Day Arrives**

```
# Tutor and student join Google Meet at scheduled time
# (Meet link in session details)
```

**5. Auto-Complete After Session Ends**

```
# Cron job runs hourly
POST /sessions/auto-complete

→ Sessions past endTime marked COMPLETED
→ (Future) Review request email sent to student
```

---

## Key Features

### 1. In-Chat Proposals

Sessions proposed directly in chat (not separate booking page):

```typescript
// Tutor creates proposal
const message = await Message.create({
  chatId,
  sender: tutorId,
  type: 'session_proposal',
  text: `Session proposal: ${subject}`,
  sessionProposal: {
    subject,
    startTime,
    endTime,
    duration,
    price: calculatedPrice,
    status: 'PROPOSED'
  }
});
```

### 2. Automatic Price Calculation

Price based on student's active subscription:

```typescript
const student = await User.findById(studentId);
let pricePerHour = 30; // Default: Flexible

if (student.studentProfile?.subscriptionTier === 'REGULAR') {
  pricePerHour = 28;
} else if (student.studentProfile?.subscriptionTier === 'LONG_TERM') {
  pricePerHour = 25;
}

const totalPrice = (pricePerHour * duration) / 60;
```

### 3. 24-Hour Expiration

```typescript
messageSchema.pre('save', function (next) {
  if (this.type === 'session_proposal' && this.isNew) {
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() + 24);
    this.sessionProposal.expiresAt = expirationDate;
  }
  next();
});
```

### 4. Session Protection

```typescript
// Cannot cancel completed sessions
if (session.status !== SESSION_STATUS.SCHEDULED) {
  throw new ApiError(
    StatusCodes.BAD_REQUEST,
    'Cannot cancel session with status: ' + session.status
  );
}
```

### 5. Role-Based Filtering

```typescript
// Students see own sessions
if (userRole === USER_ROLES.STUDENT) {
  filter = { studentId: userId };
}

// Tutors see own sessions
if (userRole === USER_ROLES.TUTOR) {
  filter = { tutorId: userId };
}

// Admin sees all
```

---

## Google Meet Integration (Placeholder)

### Current State

```typescript
// Fields ready in schema
googleMeetLink?: string;
googleCalendarEventId?: string;

// TODO comment in service
// session.googleMeetLink = await generateGoogleMeetLink({
//   summary: `Tutoring Session: ${session.subject}`,
//   startTime: session.startTime,
//   endTime: session.endTime,
//   attendees: [student.email, tutor.email]
// });
```

### Future Implementation (Phase 8)

Will use Google Calendar API to:
1. Create calendar event
2. Enable Google Meet for event
3. Get Meet link
4. Store `googleMeetLink` and `googleCalendarEventId`
5. Send calendar invites to both parties

---

## Design Decisions

### Why In-Chat Booking?

- Keeps conversation context
- No need to switch between chat and booking page
- Natural flow after trial session
- Better UX for mobile users

### Why Message-Based Proposals?

- Proposals are part of chat history
- Easy to reference later
- Student can review proposal details
- Automatic expiration (24 hours)

### Why Auto-Complete?

- Prevents manual completion burden
- Ensures sessions are billed
- Triggers review requests automatically
- Maintains accurate session status

### Why Pricing from Subscription?

- Single source of truth
- No price manipulation
- Consistent with student's plan
- Simplifies billing calculations

---

## Testing (Planned - Phase 9)

### Unit Tests
- Price calculation logic
- Auto-expiration logic
- Status validations
- Pre-save hooks

### Integration Tests
- POST /propose (create proposal)
- POST /:messageId/accept (acceptance flow)
- POST /:messageId/reject (rejection flow)
- GET /sessions (role-based filtering)
- PATCH /:id/cancel (cancellation)
- POST /auto-complete (cron job)

### Edge Cases
- Accepting expired proposal
- Accepting already-accepted proposal
- Cancelling completed session
- Proposing in chat where not participant
- Student without subscription

---

## Next Steps

This module integrates with:
- ✅ Message module (extended)
- ✅ User module (subscription tier)
- ✅ Chat module (in-chat proposals)
- 🔄 StudentSubscription module (pricing)
- 🔄 MonthlyBilling module (Phase 5 - session billing)
- 🔄 SessionReview module (Phase 7 - post-session reviews)
- 🔄 Google Calendar API (Phase 8 - Meet links)
