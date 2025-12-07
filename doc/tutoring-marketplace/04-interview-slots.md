# Phase 2: Interview Scheduling Module

## Overview

Interview slot management system enabling admins to create availability slots and applicants to book interviews.

## Status: ✅ COMPLETED

## Module Structure

**Location:** `src/app/modules/interviewSlot/`

**Files:**
- `interviewSlot.interface.ts` - Types & INTERVIEW_SLOT_STATUS enum
- `interviewSlot.model.ts` - Mongoose schema with validation hooks
- `interviewSlot.validation.ts` - Zod schemas
- `interviewSlot.service.ts` - Business logic
- `interviewSlot.controller.ts` - Request handlers
- `interviewSlot.route.ts` - Express routes with detailed comments

## Database Schema

```typescript
{
  _id: ObjectId;
  adminId: ObjectId (ref: User);          // Admin who created slot
  applicantId?: ObjectId (ref: User);     // Applicant who booked
  applicationId?: ObjectId (ref: TutorApplication);
  startTime: Date;
  endTime: Date;
  status: INTERVIEW_SLOT_STATUS;
  googleMeetLink?: string;                // Google Meet link (placeholder)
  googleCalendarEventId?: string;         // Calendar event ID (placeholder)
  notes?: string;                         // Admin notes
  cancellationReason?: string;
  bookedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:**
- `adminId` - Admin's slots lookup
- `applicantId` - Applicant's bookings
- `applicationId` - Application's interview
- `status` - Filter by status
- `startTime + endTime` - Time-based queries

## Interview Slot Status

```typescript
export enum INTERVIEW_SLOT_STATUS {
  AVAILABLE = 'AVAILABLE',     // Created by admin, not booked
  BOOKED = 'BOOKED',          // Booked by applicant
  COMPLETED = 'COMPLETED',    // Interview done
  CANCELLED = 'CANCELLED',    // Cancelled by admin or applicant
}
```

## API Endpoints

### Applicant Routes

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/v1/interview-slots` | APPLICANT/ADMIN | List slots |
| GET | `/api/v1/interview-slots/:id` | APPLICANT/ADMIN | Get single slot |
| PATCH | `/api/v1/interview-slots/:id/book` | APPLICANT | Book slot |
| PATCH | `/api/v1/interview-slots/:id/cancel` | APPLICANT/ADMIN | Cancel slot |

### Admin Routes

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/v1/interview-slots` | ADMIN | Create slot |
| PATCH | `/api/v1/interview-slots/:id/complete` | ADMIN | Mark completed |
| PATCH | `/api/v1/interview-slots/:id` | ADMIN | Update slot |
| DELETE | `/api/v1/interview-slots/:id` | ADMIN | Delete slot |

## Key Features

### 1. Overlap Prevention

Pre-save hook prevents overlapping slots for same admin:

```typescript
interviewSlotSchema.pre('save', async function (next) {
  const overlapping = await InterviewSlot.findOne({
    adminId: this.adminId,
    _id: { $ne: this._id },
    status: { $in: [AVAILABLE, BOOKED] },
    $or: [
      {
        startTime: { $lt: this.endTime },
        endTime: { $gt: this.startTime },
      },
    ],
  });

  if (overlapping) {
    next(new Error('Time slot overlaps with existing slot'));
  }
  next();
});
```

### 2. Time Validation

```typescript
// Validates endTime > startTime
interviewSlotSchema.pre('save', function (next) {
  if (this.endTime <= this.startTime) {
    next(new Error('End time must be after start time'));
  }
  next();
});
```

### 3. Automatic Application Status Updates

**When slot booked:**
```typescript
// Application status → INTERVIEW_SCHEDULED
await TutorApplication.findByIdAndUpdate(applicationId, {
  status: APPLICATION_STATUS.INTERVIEW_SCHEDULED,
});
```

**When interview completed:**
```typescript
// Application status → INTERVIEW_DONE
await TutorApplication.findByIdAndUpdate(applicationId, {
  status: APPLICATION_STATUS.INTERVIEW_DONE,
});
```

**When cancelled:**
```typescript
// Application status → DOCUMENTS_REVIEWED (revert)
await TutorApplication.findByIdAndUpdate(applicationId, {
  status: APPLICATION_STATUS.DOCUMENTS_REVIEWED,
});
```

### 4. One Booking Per Applicant

```typescript
const existingBooking = await InterviewSlot.findOne({
  applicantId: new Types.ObjectId(applicantId),
  status: INTERVIEW_SLOT_STATUS.BOOKED,
});

if (existingBooking) {
  throw new ApiError(
    StatusCodes.BAD_REQUEST,
    'You already have a booked interview slot'
  );
}
```

### 5. Application Verification

```typescript
// Must be in DOCUMENTS_REVIEWED status to book
if (application.status !== APPLICATION_STATUS.DOCUMENTS_REVIEWED) {
  throw new ApiError(
    StatusCodes.BAD_REQUEST,
    'Application must be in DOCUMENTS_REVIEWED status to book interview'
  );
}
```

### 6. Slot Protection

**Cannot update booked slots:**
```typescript
if (slot.status !== INTERVIEW_SLOT_STATUS.AVAILABLE) {
  throw new ApiError(
    StatusCodes.BAD_REQUEST,
    'Cannot update slot that is not available'
  );
}
```

**Cannot delete booked slots:**
```typescript
if (slot.status === INTERVIEW_SLOT_STATUS.BOOKED) {
  throw new ApiError(
    StatusCodes.BAD_REQUEST,
    'Cannot delete booked slot. Cancel it first.'
  );
}
```

## Workflow Example

### Step 1: Admin Creates Slot

**Request:**
```bash
POST /api/v1/interview-slots
Authorization: Bearer ADMIN_TOKEN

{
  "startTime": "2024-01-20T10:00:00Z",
  "endTime": "2024-01-20T11:00:00Z",
  "notes": "Available for interviews"
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Interview slot created successfully",
  "data": {
    "_id": "slot123",
    "adminId": "admin123",
    "startTime": "2024-01-20T10:00:00Z",
    "endTime": "2024-01-20T11:00:00Z",
    "status": "AVAILABLE"
  }
}
```

### Step 2: Applicant Views Available Slots

**Request:**
```bash
GET /api/v1/interview-slots?status=AVAILABLE&sort=startTime
Authorization: Bearer APPLICANT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Interview slots retrieved successfully",
  "data": [
    {
      "_id": "slot123",
      "adminId": { "name": "Admin Name", "email": "admin@example.com" },
      "startTime": "2024-01-20T10:00:00Z",
      "endTime": "2024-01-20T11:00:00Z",
      "status": "AVAILABLE"
    }
  ],
  "meta": { "page": 1, "limit": 10, "total": 5 }
}
```

### Step 3: Applicant Books Slot

**Request:**
```bash
PATCH /api/v1/interview-slots/slot123/book
Authorization: Bearer APPLICANT_TOKEN

{
  "applicationId": "app123"
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Interview slot booked successfully",
  "data": {
    "_id": "slot123",
    "status": "BOOKED",
    "applicantId": "applicant123",
    "applicationId": "app123",
    "bookedAt": "2024-01-15T14:30:00Z",
    "googleMeetLink": null
  }
}
```

**Side Effects:**
- Application status → `INTERVIEW_SCHEDULED`
- `bookedAt` timestamp set
- (Future: Google Meet link generated)
- (Future: Email sent to applicant & admin)

### Step 4: Interview Happens

(Tutor and applicant meet via Google Meet)

### Step 5: Admin Marks as Completed

**Request:**
```bash
PATCH /api/v1/interview-slots/slot123/complete
Authorization: Bearer ADMIN_TOKEN
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Interview marked as completed successfully",
  "data": {
    "_id": "slot123",
    "status": "COMPLETED",
    "completedAt": "2024-01-20T11:00:00Z"
  }
}
```

**Side Effects:**
- Application status → `INTERVIEW_DONE`
- Admin can now approve/reject application

### Alternative: Cancellation

**Request:**
```bash
PATCH /api/v1/interview-slots/slot123/cancel
Authorization: Bearer APPLICANT_TOKEN

{
  "cancellationReason": "Emergency, need to reschedule"
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Interview slot cancelled successfully",
  "data": {
    "_id": "slot123",
    "status": "CANCELLED",
    "cancellationReason": "Emergency, need to reschedule",
    "cancelledAt": "2024-01-18T09:00:00Z"
  }
}
```

**Side Effects:**
- Application status → `DOCUMENTS_REVIEWED` (reverted)
- Applicant can book another slot
- (Future: Cancellation email sent)

## Google Meet Integration (Placeholder)

### Current Implementation

```typescript
// Placeholder fields in schema
googleMeetLink?: string;
googleCalendarEventId?: string;

// TODO in service layer
// slot.googleMeetLink = await generateGoogleMeetLink({
//   summary: 'Tutor Application Interview',
//   description: `Interview for ${application.name}`,
//   startTime: slot.startTime,
//   endTime: slot.endTime,
//   attendees: [application.email, admin.email]
// });
```

### Future Implementation (Phase 8)

```typescript
import { google } from 'googleapis';

const generateGoogleMeetLink = async (params) => {
  const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

  const event = await calendar.events.insert({
    calendarId: 'primary',
    conferenceDataVersion: 1,
    requestBody: {
      summary: params.summary,
      description: params.description,
      start: { dateTime: params.startTime },
      end: { dateTime: params.endTime },
      attendees: params.attendees.map(email => ({ email })),
      conferenceData: {
        createRequest: { requestId: uuidv4() }
      }
    }
  });

  return {
    meetLink: event.data.hangoutLink,
    eventId: event.data.id
  };
};
```

## Email Notifications (Planned)

```typescript
// After booking
await sendEmail({
  to: [application.email, admin.email],
  subject: 'Interview Scheduled',
  template: 'interview-scheduled',
  data: {
    applicantName: application.name,
    startTime: slot.startTime,
    meetLink: slot.googleMeetLink
  }
});

// Reminder (1 hour before)
await sendEmail({
  to: [application.email, admin.email],
  subject: 'Interview Reminder - Starting in 1 Hour',
  template: 'interview-reminder',
  data: { startTime: slot.startTime, meetLink: slot.googleMeetLink }
});

// After cancellation
await sendEmail({
  to: [application.email, admin.email],
  subject: 'Interview Cancelled',
  template: 'interview-cancelled',
  data: { reason: slot.cancellationReason }
});
```

## Design Decisions

### Why Overlap Prevention?
- Prevents double-booking admin's time
- Ensures admin can conduct one interview at a time
- Better time management

### Why One Booking Per Applicant?
- Prevents booking multiple slots
- Encourages commitment to chosen time
- Simplifies scheduling logic

### Why Revert Application Status on Cancel?
- Allows applicant to book another slot
- Maintains correct application workflow
- Clear state transitions

### Why Prevent Deleting Booked Slots?
- Preserves booking history
- Forces proper cancellation flow
- Data integrity

### Why Application Verification?
- Only applicants in correct phase can book
- Prevents booking before documents reviewed
- Enforces workflow order

## Query Examples

### List Available Slots (Upcoming Only)

```bash
GET /api/v1/interview-slots?status=AVAILABLE&sort=startTime&startTime[$gte]=2024-01-20
```

### Admin's All Slots

```bash
GET /api/v1/interview-slots?adminId=admin123&sort=-createdAt
```

### Applicant's Booked Slot

```bash
GET /api/v1/interview-slots?applicantId=applicant123&status=BOOKED
```

## Testing (Planned - Phase 9)

### Unit Tests
- Overlap prevention logic
- Time validation
- Application status updates
- One booking per applicant enforcement

### Integration Tests
- POST /interview-slots (create slot)
- GET /interview-slots (list with filters)
- PATCH /:id/book (booking flow)
- PATCH /:id/cancel (cancellation flow)
- PATCH /:id/complete (completion flow)

### Edge Cases
- Booking expired slot
- Booking already booked slot
- Cancelling completed slot
- Deleting booked slot
- Overlapping slot creation

## Performance Considerations

### Indexes
- Compound index on `status + startTime` for filtering available upcoming slots
- `applicantId` for user's bookings lookup
- `applicationId` for application's interview lookup

### Query Optimization
- Populate only required fields: `'name email'`
- Filter expired slots client-side or with expiry cron job

## Next Steps

This module integrates with:
- ✅ TutorApplication (status updates)
- 🔄 Google Calendar API (Phase 8 - Meet link generation)
- 🔄 Email notifications (Phase 7 - reminders, confirmations)
- 🔄 Cron jobs (Phase 7 - interview reminders)
