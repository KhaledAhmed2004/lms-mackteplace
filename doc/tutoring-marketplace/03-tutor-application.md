# Phase 2: Tutor Application System

## Overview

3-phase tutor application workflow with document uploads, automatic role transitions, and admin review endpoints.

## Status: ✅ COMPLETED

## Module Structure

**Location:** `src/app/modules/tutorApplication/`

**Files:**
- `tutorApplication.interface.ts` - Types and enums
- `tutorApplication.model.ts` - Mongoose schema with hooks
- `tutorApplication.validation.ts` - Zod schemas
- `tutorApplication.service.ts` - 3-phase workflow logic
- `tutorApplication.controller.ts` - Request handlers
- `tutorApplication.route.ts` - Routes with detailed comments

## 3-Phase Workflow

```
Phase 1: SUBMITTED
   ↓ (Admin reviews documents)
Phase 2: DOCUMENTS_REVIEWED → INTERVIEW_SCHEDULED → INTERVIEW_DONE
   ↓ (Admin conducts interview)
Phase 3: APPROVED or REJECTED
```

## Application Status Enum

```typescript
export enum APPLICATION_STATUS {
  SUBMITTED = 'SUBMITTED',                   // Phase 1
  DOCUMENTS_REVIEWED = 'DOCUMENTS_REVIEWED', // Phase 2
  INTERVIEW_SCHEDULED = 'INTERVIEW_SCHEDULED', // Phase 2
  INTERVIEW_DONE = 'INTERVIEW_DONE',         // Phase 2
  APPROVED = 'APPROVED',                     // Phase 3
  REJECTED = 'REJECTED',                     // Terminal state
}
```

## Database Schema

```typescript
{
  _id: ObjectId;
  userId: ObjectId (ref: User);     // Unique - one application per user

  // Personal Information
  name: string;
  email: string;
  phone: string;
  address: string;
  birthDate: Date;

  // Teaching Subjects
  subjects: string[];               // ['Math', 'Physics']

  // Document URLs (Cloudinary/S3)
  cvUrl: string;                    // REQUIRED
  abiturCertificateUrl: string;     // REQUIRED (German education proof)
  educationProofUrls: string[];     // Optional additional certificates

  // Application Status
  status: APPLICATION_STATUS;
  phase: 1 | 2 | 3;                // Auto-updated by pre-save hook
  rejectionReason?: string;
  adminNotes?: string;

  // Timestamps
  submittedAt: Date;
  reviewedAt?: Date;
  approvedAt?: Date;
  rejectedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:**
- `userId` (unique) - Prevents duplicate applications
- `status + phase` - Admin filtering
- `submittedAt` - Chronological sorting
- `email` - Applicant lookup

## API Endpoints

### Applicant Routes

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/v1/applications` | STUDENT/TUTOR/APPLICANT | Submit application |
| GET | `/api/v1/applications/my-application` | APPLICANT | View own application status |

### Admin Routes

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/v1/applications` | SUPER_ADMIN | List all applications |
| GET | `/api/v1/applications/:id` | SUPER_ADMIN | Get single application |
| PATCH | `/api/v1/applications/:id/approve-phase2` | SUPER_ADMIN | Approve to interview |
| PATCH | `/api/v1/applications/:id/reject` | SUPER_ADMIN | Reject application |
| PATCH | `/api/v1/applications/:id/mark-as-tutor` | SUPER_ADMIN | Final approval |
| PATCH | `/api/v1/applications/:id` | SUPER_ADMIN | Generic status update |
| DELETE | `/api/v1/applications/:id` | SUPER_ADMIN | Delete application |

## Key Features

### 1. Automatic Role Transitions

**On Application Submission:**
```typescript
// User role changed from STUDENT to APPLICANT
await User.findByIdAndUpdate(userId, {
  role: USER_ROLES.APPLICANT,
  'tutorProfile.subjects': payload.subjects,
  'tutorProfile.cvUrl': payload.cvUrl,
  'tutorProfile.abiturCertificateUrl': payload.abiturCertificateUrl,
  'tutorProfile.onboardingPhase': 1
});
```

**On Final Approval:**
```typescript
// User role changed from APPLICANT to TUTOR
await User.findByIdAndUpdate(application.userId, {
  role: USER_ROLES.TUTOR,
  'tutorProfile.isVerified': true,
  'tutorProfile.verificationStatus': 'APPROVED',
  'tutorProfile.onboardingPhase': 3
});
```

### 2. Pre-Save Hook for Phase Management

```typescript
tutorApplicationSchema.pre('save', function (next) {
  // Automatically sync phase with status
  if (this.status === APPLICATION_STATUS.APPROVED) {
    this.phase = 3;
  } else if (
    this.status === APPLICATION_STATUS.INTERVIEW_SCHEDULED ||
    this.status === APPLICATION_STATUS.INTERVIEW_DONE
  ) {
    this.phase = 2;
  } else {
    this.phase = 1;
  }
  next();
});
```

### 3. Duplicate Prevention

```typescript
const existingApplication = await TutorApplication.findOne({ userId });
if (existingApplication) {
  throw new ApiError(
    StatusCodes.BAD_REQUEST,
    'You have already submitted an application'
  );
}
```

### 4. Document Validation

**Required Documents:**
- CV (cvUrl) - REQUIRED
- Abitur Certificate (abiturCertificateUrl) - REQUIRED
- Education Proofs (educationProofUrls) - Optional

**Validation:**
- Zod: URL format validation
- Mongoose: Required field validation

### 5. Admin Query Features

```typescript
// Search by name, email, phone
GET /api/v1/applications?searchTerm=john

// Filter by status and phase
GET /api/v1/applications?status=SUBMITTED&phase=1

// Pagination
GET /api/v1/applications?page=1&limit=10

// Sort by submission date
GET /api/v1/applications?sort=-submittedAt
```

## Workflow Example

### Step 1: Submit Application

**Request:**
```bash
POST /api/v1/applications
Authorization: Bearer USER_JWT_TOKEN

{
  "subjects": ["Mathematics", "Physics"],
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+49123456789",
  "address": "Berlin, Germany",
  "birthDate": "1995-05-15",
  "cvUrl": "https://cloudinary.com/cv.pdf",
  "abiturCertificateUrl": "https://cloudinary.com/abitur.pdf",
  "educationProofUrls": ["https://cloudinary.com/degree.pdf"]
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Application submitted successfully",
  "data": {
    "_id": "64a1b2c3d4e5f6g7h8i9j0k1",
    "userId": "64x1y2z3...",
    "status": "SUBMITTED",
    "phase": 1,
    "submittedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Side Effects:**
- User role → APPLICANT
- tutorProfile populated
- Application created in DB

### Step 2: Admin Reviews Documents

**Request:**
```bash
PATCH /api/v1/applications/64a1b2c3d4e5f6g7h8i9j0k1/approve-phase2
Authorization: Bearer ADMIN_JWT_TOKEN

{
  "adminNotes": "Documents verified. Approved for interview."
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Application approved for interview",
  "data": {
    "_id": "64a1b2c3d4e5f6g7h8i9j0k1",
    "status": "DOCUMENTS_REVIEWED",
    "phase": 2,
    "reviewedAt": "2024-01-16T09:15:00.000Z",
    "adminNotes": "Documents verified. Approved for interview."
  }
}
```

**Side Effects:**
- Phase auto-updated to 2 (pre-save hook)
- reviewedAt timestamp set
- (Future: Email sent to applicant)

### Step 3: Final Approval

**Request:**
```bash
PATCH /api/v1/applications/64a1b2c3d4e5f6g7h8i9j0k1/mark-as-tutor
Authorization: Bearer ADMIN_JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Applicant approved as tutor successfully",
  "data": {
    "_id": "64a1b2c3d4e5f6g7h8i9j0k1",
    "status": "APPROVED",
    "phase": 3,
    "approvedAt": "2024-01-20T14:00:00.000Z"
  }
}
```

**Side Effects:**
- User role → TUTOR
- tutorProfile.isVerified → true
- Phase → 3
- (Future: Welcome email sent)

### Alternative: Rejection

**Request:**
```bash
PATCH /api/v1/applications/64a1b2c3d4e5f6g7h8i9j0k1/reject
Authorization: Bearer ADMIN_JWT_TOKEN

{
  "rejectionReason": "Abitur certificate not valid. Please resubmit."
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Application rejected",
  "data": {
    "_id": "64a1b2c3d4e5f6g7h8i9j0k1",
    "status": "REJECTED",
    "rejectionReason": "Abitur certificate not valid. Please resubmit.",
    "rejectedAt": "2024-01-17T11:30:00.000Z"
  }
}
```

## File Upload Strategy

### 1. Upload Files First

```bash
POST /api/v1/upload
Content-Type: multipart/form-data

Form Data:
- file: cv.pdf
- file: abitur.pdf
- file: degree.pdf
```

**Response:**
```json
{
  "cvUrl": "https://res.cloudinary.com/demo/cv.pdf",
  "abiturCertificateUrl": "https://res.cloudinary.com/demo/abitur.pdf",
  "educationProofUrls": ["https://res.cloudinary.com/demo/degree.pdf"]
}
```

### 2. Submit Application with URLs

```bash
POST /api/v1/applications
{
  "cvUrl": "https://res.cloudinary.com/demo/cv.pdf",
  "abiturCertificateUrl": "https://res.cloudinary.com/demo/abitur.pdf",
  // ... other fields
}
```

## Design Decisions

### Why Unique Application Constraint?
- Prevents spam applications
- Simplifies tracking
- One active application per user

### Why Pre-Save Hook for Phase?
- Automatic synchronization
- Single source of truth (status drives phase)
- Prevents manual errors

### Why Separate Approve Endpoints?
- Clear intent for each action
- Easier to add emails/notifications
- Better API documentation

### Why Abitur Certificate Required?
- German education credential validation
- Platform credibility
- Legal compliance

### Why Email Placeholders?
- Module functional without email service
- Core logic tested independently
- Email integration planned later

## Email Notifications (Planned)

```typescript
// After submission
await sendEmail({
  to: ADMIN_EMAIL,
  subject: 'New Tutor Application',
  template: 'new-application',
  data: { applicantName }
});

// After approval to Phase 2
await sendEmail({
  to: application.email,
  subject: 'Application Approved - Schedule Interview',
  template: 'interview-invitation',
  data: { name, interviewLink }
});

// After rejection
await sendEmail({
  to: application.email,
  subject: 'Application Update',
  template: 'application-rejected',
  data: { name, rejectionReason }
});

// After final approval
await sendEmail({
  to: application.email,
  subject: 'Welcome to Our Platform!',
  template: 'tutor-approved',
  data: { name }
});
```

## Testing (Planned - Phase 9)

### Unit Tests
- Application submission with valid data
- Duplicate prevention
- Role transitions
- Phase auto-update
- Document validation

### Integration Tests
- POST /applications (success, duplicate, missing fields)
- GET /applications (pagination, filtering, search)
- PATCH approve-phase2 (status changes)
- PATCH reject (rejection flow)
- PATCH mark-as-tutor (final approval)

### Edge Cases
- Invalid status transitions
- Approving rejected application
- Rejecting approved application
- Non-existent application ID

## Next Steps

This module supports:
- ✅ Tutor application submissions
- 🔄 Interview scheduling (next module)
- 🔄 Trial request matching (requires verified tutors)
- 🔄 Session booking (requires approved tutors)