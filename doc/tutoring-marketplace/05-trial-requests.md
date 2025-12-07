# Phase 3: Trial Request Module (Uber-Style Matching)

## Overview

Uber-style trial request matching system where students send help requests and tutors accept them, creating instant chat connections.

## Status: ✅ COMPLETED

## Module Structure

**Location:** `src/app/modules/trialRequest/`

**Files:**
- `trialRequest.interface.ts` - Types & TRIAL_REQUEST_STATUS enum
- `trialRequest.model.ts` - Mongoose schema with auto-expiration
- `trialRequest.validation.ts` - Zod schemas
- `trialRequest.service.ts` - Matching logic & chat creation
- `trialRequest.controller.ts` - Request handlers
- `trialRequest.route.ts` - Express routes with detailed comments

## Database Schema

```typescript
{
  _id: ObjectId;
  studentId: ObjectId (ref: User);
  subject: string;                       // Subject name (Math, Physics, etc.)
  description: string;                   // What student needs help with
  preferredLanguage: 'ENGLISH' | 'GERMAN';
  preferredDateTime?: Date;              // Optional: When student wants trial
  status: TRIAL_REQUEST_STATUS;

  // Matching details
  acceptedTutorId?: ObjectId (ref: User);
  chatId?: ObjectId (ref: Chat);

  // Auto-expiration
  expiresAt: Date;                       // 24 hours from creation

  // Timestamps
  bookedAt?: Date;
  acceptedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;

  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:**
- `studentId` - Student's requests
- `subject` - Subject filtering
- `status` - Status filtering
- `expiresAt` - Expiration queries
- `acceptedTutorId` - Tutor's accepted requests
- `createdAt` (desc) - Latest first
- **Compound:** `status + subject + expiresAt` (tutor matching queries)

## Trial Request Status

```typescript
export enum TRIAL_REQUEST_STATUS {
  PENDING = 'PENDING',       // Waiting for tutor to accept
  ACCEPTED = 'ACCEPTED',     // Tutor accepted, chat created
  EXPIRED = 'EXPIRED',       // No tutor accepted within 24 hours
  CANCELLED = 'CANCELLED',   // Student cancelled before acceptance
}
```

## API Endpoints

### Student Routes

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/v1/trial-requests` | STUDENT | Create trial request |
| GET | `/api/v1/trial-requests/my-requests` | STUDENT | View own requests |
| PATCH | `/api/v1/trial-requests/:id/cancel` | STUDENT | Cancel request |

### Tutor Routes

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/v1/trial-requests/matching` | TUTOR | View matching requests |
| PATCH | `/api/v1/trial-requests/:id/accept` | TUTOR | Accept request |

### Shared Routes

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/v1/trial-requests/:id` | STUDENT/TUTOR/ADMIN | Get single request |

### Admin Routes

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/v1/trial-requests` | ADMIN | List all requests |
| POST | `/api/v1/trial-requests/expire-old` | ADMIN | Expire old requests (cron) |

## Key Features

### 1. Uber-Style Matching Logic

**Students create requests:**
```typescript
POST /api/v1/trial-requests
{
  "subject": "Mathematics",
  "description": "Need help with calculus derivatives",
  "preferredLanguage": "ENGLISH",
  "preferredDateTime": "2024-01-21T15:00:00Z"
}
```

**Tutors see matching requests:**
```typescript
// Tutor teaches Math and Physics
GET /api/v1/trial-requests/matching

// Returns only:
// - PENDING requests
// - In tutor's subjects (Math, Physics)
// - Not expired
```

**Tutor accepts:**
```typescript
PATCH /api/v1/trial-requests/123/accept

// System creates:
// - Chat between student and tutor
// - Updates request status to ACCEPTED
// - Notifies student
```

### 2. Auto-Expiration (24 Hours)

Pre-save hook sets expiration:

```typescript
interviewSlotSchema.pre('save', function (next) {
  if (this.isNew && !this.expiresAt) {
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() + 24);
    this.expiresAt = expirationDate;
  }
  next();
});
```

Cron job expires old requests:

```typescript
// Run periodically (e.g., every hour)
POST /api/v1/trial-requests/expire-old

// Updates PENDING requests past expiresAt to EXPIRED
```

### 3. One Pending Request Per Student

```typescript
const pendingRequest = await TrialRequest.findOne({
  studentId: new Types.ObjectId(studentId),
  status: TRIAL_REQUEST_STATUS.PENDING,
});

if (pendingRequest) {
  throw new ApiError(
    StatusCodes.BAD_REQUEST,
    'You already have a pending trial request'
  );
}
```

### 4. Automatic Chat Creation

```typescript
// When tutor accepts request
const chat = await Chat.create({
  participants: [request.studentId, new Types.ObjectId(tutorId)],
});

request.chatId = chat._id as Types.ObjectId;
request.status = TRIAL_REQUEST_STATUS.ACCEPTED;
request.acceptedTutorId = new Types.ObjectId(tutorId);
```

### 5. Subject Verification

**Tutor must teach requested subject:**
```typescript
const tutor = await User.findById(tutorId);

if (!tutor.tutorProfile?.subjects?.includes(request.subject)) {
  throw new ApiError(
    StatusCodes.BAD_REQUEST,
    'You do not teach this subject'
  );
}
```

### 6. Trial Request Counter

Tracks student's trial usage:

```typescript
// Incremented on creation
await User.findByIdAndUpdate(studentId, {
  $inc: { 'studentProfile.trialRequestsCount': 1 },
});

// Can implement limits (e.g., max 3 trials per student)
```

## Workflow Example

### Step 1: Student Creates Trial Request

**Request:**
```bash
POST /api/v1/trial-requests
Authorization: Bearer STUDENT_TOKEN

{
  "subject": "Mathematics",
  "description": "Need help with calculus derivatives and integration",
  "preferredLanguage": "ENGLISH",
  "preferredDateTime": "2024-01-21T15:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Trial request created successfully. Matching tutors will be notified.",
  "data": {
    "_id": "req123",
    "studentId": "student123",
    "subject": "Mathematics",
    "description": "Need help with calculus derivatives and integration",
    "preferredLanguage": "ENGLISH",
    "status": "PENDING",
    "expiresAt": "2024-01-16T14:30:00Z"
  }
}
```

**Side Effects:**
- `studentProfile.trialRequestsCount` incremented
- (Future: Real-time notification to matching tutors)
- (Future: Email to admin about new request)

### Step 2: Tutor Views Matching Requests

**Request:**
```bash
GET /api/v1/trial-requests/matching?sort=-createdAt
Authorization: Bearer TUTOR_TOKEN
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Matching trial requests retrieved successfully",
  "data": [
    {
      "_id": "req123",
      "studentId": {
        "name": "John Doe",
        "profilePicture": "https://..."
      },
      "subject": "Mathematics",
      "description": "Need help with calculus derivatives and integration",
      "preferredLanguage": "ENGLISH",
      "preferredDateTime": "2024-01-21T15:00:00Z",
      "status": "PENDING",
      "expiresAt": "2024-01-16T14:30:00Z",
      "createdAt": "2024-01-15T14:30:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 10, "total": 3 }
}
```

**Matching Logic:**
- Tutor teaches "Mathematics" (from `tutorProfile.subjects`)
- Request is PENDING
- Not expired (expiresAt > now)
- Tutor is verified

### Step 3: Tutor Accepts Request

**Request:**
```bash
PATCH /api/v1/trial-requests/req123/accept
Authorization: Bearer TUTOR_TOKEN
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Trial request accepted successfully. Chat created with student.",
  "data": {
    "_id": "req123",
    "status": "ACCEPTED",
    "acceptedTutorId": "tutor123",
    "chatId": "chat456",
    "acceptedAt": "2024-01-15T15:00:00Z"
  }
}
```

**Side Effects:**
- Chat created with participants: [student123, tutor123]
- Request status → `ACCEPTED`
- `acceptedAt` timestamp set
- (Future: Real-time notification to student)
- (Future: Email to student: "Your trial request was accepted!")

### Step 4: Student and Tutor Chat

Student receives notification → Opens chat → Discusses needs → Books session

### Alternative: Student Cancels Request

**Request:**
```bash
PATCH /api/v1/trial-requests/req123/cancel
Authorization: Bearer STUDENT_TOKEN

{
  "cancellationReason": "Found help elsewhere"
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Trial request cancelled successfully",
  "data": {
    "_id": "req123",
    "status": "CANCELLED",
    "cancellationReason": "Found help elsewhere",
    "cancelledAt": "2024-01-15T16:00:00Z"
  }
}
```

### Alternative: Request Expires

**Cron Job (runs hourly):**
```bash
POST /api/v1/trial-requests/expire-old
Authorization: Bearer ADMIN_TOKEN
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "5 trial requests expired successfully",
  "data": { "expiredCount": 5 }
}
```

**What happens:**
- PENDING requests past `expiresAt` → EXPIRED
- Student can create new request
- (Future: Email to student: "No tutor accepted, please try again")

## Real-Time Notifications (Placeholder)

### Current Implementation

```typescript
// TODO in service layer:
// io.to(matchingTutors.map(t => t._id.toString())).emit('newTrialRequest', trialRequest);
// io.to(request.studentId.toString()).emit('trialAccepted', { tutorName, chatId });
```

### Future Implementation (Phase 7)

```typescript
import { io } from '../../app';

// After trial request created
const matchingTutors = await User.find({
  role: USER_ROLES.TUTOR,
  'tutorProfile.subjects': payload.subject,
  'tutorProfile.isVerified': true
});

matchingTutors.forEach(tutor => {
  io.to(tutor._id.toString()).emit('newTrialRequest', {
    requestId: trialRequest._id,
    subject: trialRequest.subject,
    description: trialRequest.description,
    studentName: student.name
  });
});

// After tutor accepts
io.to(request.studentId.toString()).emit('trialAccepted', {
  tutorId: tutor._id,
  tutorName: tutor.name,
  tutorPicture: tutor.profilePicture,
  chatId: chat._id
});
```

## Email Notifications (Planned)

```typescript
// After request created
await sendEmail({
  to: ADMIN_EMAIL,
  subject: 'New Trial Request',
  template: 'new-trial-request',
  data: { studentName, subject, description }
});

// After tutor accepts
await sendEmail({
  to: student.email,
  subject: 'Your Trial Request Was Accepted!',
  template: 'trial-accepted',
  data: {
    studentName: student.name,
    tutorName: tutor.name,
    subject: request.subject,
    chatLink: `${CLIENT_URL}/chats/${chat._id}`
  }
});

// After expiration
await sendEmail({
  to: student.email,
  subject: 'Trial Request Expired',
  template: 'trial-expired',
  data: {
    subject: request.subject,
    expiresAt: request.expiresAt
  }
});
```

## Design Decisions

### Why 24-Hour Expiration?
- Creates urgency for tutors to respond
- Prevents old stale requests
- Students get timely help or can resubmit

### Why One Pending Request?
- Prevents spam requests
- Encourages focused help-seeking
- Simplifies tutor matching logic

### Why Auto Chat Creation?
- Instant connection between student and tutor
- Seamless transition from request to conversation
- No manual chat creation needed

### Why Subject Verification?
- Ensures tutor is qualified
- Maintains platform quality
- Prevents mismatched connections

### Why Track Trial Count?
- Analytics on trial usage
- Can implement limits to prevent abuse
- Future: Trial-to-paid conversion tracking

### Why Preferred Language?
- Important for German tutoring platform
- Matches student with tutors speaking preferred language
- Better learning experience

## Query Examples

### Tutor: View Matching Requests (Subject Filter)

```bash
GET /api/v1/trial-requests/matching?subject=Mathematics&sort=-createdAt
```

### Student: View Request History

```bash
GET /api/v1/trial-requests/my-requests?sort=-createdAt
```

### Admin: View All Pending Requests

```bash
GET /api/v1/trial-requests?status=PENDING&page=1&limit=20
```

### Admin: Search Requests

```bash
GET /api/v1/trial-requests?searchTerm=calculus&subject=Mathematics
```

## Testing (Planned - Phase 9)

### Unit Tests
- Auto-expiration date calculation
- One pending request enforcement
- Subject verification logic
- Chat creation on acceptance

### Integration Tests
- POST /trial-requests (create request)
- GET /matching (tutor matching logic)
- PATCH /:id/accept (acceptance flow)
- PATCH /:id/cancel (cancellation)
- POST /expire-old (expiration cron)

### Edge Cases
- Accepting expired request
- Accepting already accepted request
- Tutor accepting request for subject they don't teach
- Creating request when one is pending
- Cancelling accepted request

## Performance Considerations

### Indexes
- Compound index `status + subject + expiresAt` optimizes tutor matching queries
- `studentId` for fast student request lookup
- `createdAt` (desc) for latest-first sorting

### Query Optimization
- Tutor matching filters at database level (not application)
- Populate only required fields: `'name profilePicture'`
- Pagination prevents large result sets

### Caching Strategy (Future)
- Cache matching tutor IDs per subject
- Redis for real-time notification queues

## Integration with Other Modules

### With Chat Module
- Auto-creates chat on acceptance
- Chat has participants: [studentId, tutorId]

### With User Module
- Increments `studentProfile.trialRequestsCount`
- Uses `tutorProfile.subjects` for matching
- Verifies `tutorProfile.isVerified`

### With Subject Module
- Validates subject exists (optional future enhancement)
- Subject used for matching logic

### Future: With Session Module
- After trial, student can book paid sessions
- Trial experience influences session booking

## Cron Job Setup (Planned - Phase 7)

```typescript
// cron/expireTrialRequests.ts
import cron from 'node-cron';
import { TrialRequestService } from '../app/modules/trialRequest/trialRequest.service';
import logger from '../shared/logger';

// Run every hour
cron.schedule('0 * * * *', async () => {
  try {
    const count = await TrialRequestService.expireOldRequests();
    logger.info(`Expired ${count} trial requests`);
  } catch (error) {
    logger.error('Error expiring trial requests:', error);
  }
});
```

## Next Steps

This module enables:
- ✅ Uber-style student-tutor matching
- 🔄 In-chat booking (Phase 4 - next)
- 🔄 Session scheduling (Phase 4)
- 🔄 Real-time notifications (Phase 7)
- 🔄 Cron job automation (Phase 7)
