# Tutoring Marketplace Implementation Guide

> **Note:** This documentation has been reorganized into smaller, focused files.
> See the `doc/tutoring-marketplace/` directory for detailed module documentation.

## Documentation Structure

```
doc/tutoring-marketplace/
├── 00-overview.md              - Project overview & tech stack
├── 01-user-system.md           - User roles & profile fields (Phase 1)
├── 02-subject-module.md        - Subject CRUD operations (Phase 1)
├── 03-tutor-application.md     - 3-phase application workflow (Phase 2)
├── 04-interview-slots.md       - Interview scheduling (Phase 2) [PENDING]
├── 05-trial-requests.md        - Uber-style matching (Phase 3) [PENDING]
├── 06-sessions.md              - Session booking & Google Meet (Phase 4) [PENDING]
├── 07-billing.md               - Subscriptions & payments (Phase 5) [PENDING]
├── 08-admin-dashboard.md       - Admin APIs & analytics (Phase 6) [PENDING]
└── 99-api-reference.md         - Quick API reference guide
```

## Quick Links

### Completed Modules ✅
- [User System](./tutoring-marketplace/01-user-system.md) - Roles, profiles, fields
- [Subject Module](./tutoring-marketplace/02-subject-module.md) - Teaching subjects CRUD
- [Tutor Application](./tutoring-marketplace/03-tutor-application.md) - Application workflow

### In Progress 🔄
- Interview Scheduling - Admin creates slots, applicants book

### Pending Modules 📋
- Trial Request Matching (Phase 3)
- Session Booking & Google Meet (Phase 4)
- Billing & Subscriptions (Phase 5)
- Admin Dashboard (Phase 6)
- Reviews & Automation (Phase 7)

## Overview

This platform is a **GoStudent-inspired tutoring marketplace** with unique features.

## Completed Modules

### Phase 1: Core User System ✅

#### User Roles Update

**Files Modified:**
- `src/enums/user.ts` - Updated USER_ROLES enum
- `src/app/modules/user/user.model.ts` - Added profile fields
- `src/app/modules/user/user.interface.ts` - Added TypeScript types

**Changes:**
1. **New Roles:**
   - `STUDENT`: Users who book and learn from tutors
   - `TUTOR`: Approved instructors who teach students
   - `APPLICANT`: Users in the tutor application process
   - `SUPER_ADMIN`: Platform administrator

2. **Tutor Profile Fields:**
   ```typescript
   tutorProfile: {
     subjects: string[];              // Teaching subjects
     isVerified: boolean;             // Admin verification status
     verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
     onboardingPhase: 1 | 2 | 3;     // Application progress
     address?: string;
     birthDate?: Date;
     cvUrl?: string;                  // Cloudinary/S3 URL
     abiturCertificateUrl?: string;   // MANDATORY for German tutors
     educationProofUrls?: string[];   // Additional certificates
   }
   ```

3. **Student Profile Fields:**
   ```typescript
   studentProfile: {
     subscriptionTier: 'FLEXIBLE' | 'REGULAR' | 'LONG_TERM' | null;
     trialRequestsCount: number;      // Track trial usage
   }
   ```

**Why These Changes:**
- Automatic role transitions during tutor onboarding flow
- Abitur certificate requirement validates German education credentials
- Subscription tier determines hourly rate (€30/€28/€25)
- Trial request tracking prevents abuse

---

### Phase 1: Subject Management ✅

#### Module Structure

**Location:** `src/app/modules/subject/`

**Files Created:**
- `subject.interface.ts` - TypeScript types
- `subject.model.ts` - Mongoose schema
- `subject.validation.ts` - Zod schemas
- `subject.service.ts` - Business logic
- `subject.controller.ts` - Request handlers
- `subject.route.ts` - Express routes

#### API Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/v1/subjects` | SUPER_ADMIN | Create new subject |
| GET | `/api/v1/subjects` | Public | List subjects (search, filter, paginate) |
| GET | `/api/v1/subjects/:id` | Public | Get single subject |
| PATCH | `/api/v1/subjects/:id` | SUPER_ADMIN | Update subject |
| DELETE | `/api/v1/subjects/:id` | SUPER_ADMIN | Delete subject |

#### Schema Design

```typescript
{
  name: string;           // e.g., "Mathematics", "Physics"
  description: string;    // Subject details
  isActive: boolean;      // Enable/disable subject
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:**
- `name` (unique, text index for search)
- `isActive` (filter active subjects)

#### Key Features

1. **Admin-Only Creation**: Only SUPER_ADMIN can create/update subjects
2. **Public Listing**: Anyone can view subjects (for trial requests)
3. **Search Support**: Full-text search on subject name/description
4. **Soft Enable/Disable**: `isActive` flag instead of deletion
5. **QueryBuilder Integration**: Advanced filtering, pagination, sorting

**Why This Design:**
- Centralized subject management ensures consistency
- Public access allows students to browse available subjects
- Text indexes enable fast search for subject matching
- isActive flag preserves historical data when disabling subjects

---

### Phase 2: Tutor Application System ✅

#### Module Structure

**Location:** `src/app/modules/tutorApplication/`

**Files Created:**
- `tutorApplication.interface.ts` - Types and enums
- `tutorApplication.model.ts` - Mongoose schema with hooks
- `tutorApplication.validation.ts` - Zod schemas
- `tutorApplication.service.ts` - 3-phase workflow logic
- `tutorApplication.controller.ts` - Request handlers
- `tutorApplication.route.ts` - Routes with detailed comments

#### 3-Phase Application Workflow

```
Phase 1: SUBMITTED
   ↓ (Admin reviews documents)
Phase 2: DOCUMENTS_REVIEWED → INTERVIEW_SCHEDULED → INTERVIEW_DONE
   ↓ (Admin conducts interview)
Phase 3: APPROVED or REJECTED
```

#### Application Status Enum

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

#### Schema Design

```typescript
{
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
}
```

**Indexes:**
- `userId` (unique, prevents duplicate applications)
- `status + phase` (admin filtering)
- `submittedAt` (chronological sorting)
- `email` (applicant lookup)

#### API Endpoints

**Applicant Routes:**

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/v1/applications` | STUDENT/TUTOR/APPLICANT | Submit application |
| GET | `/api/v1/applications/my-application` | APPLICANT | View own application status |

**Admin Routes:**

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/v1/applications` | SUPER_ADMIN | List all applications (filter, search, paginate) |
| GET | `/api/v1/applications/:id` | SUPER_ADMIN | Get single application |
| PATCH | `/api/v1/applications/:id/approve-phase2` | SUPER_ADMIN | Approve to interview phase |
| PATCH | `/api/v1/applications/:id/reject` | SUPER_ADMIN | Reject application |
| PATCH | `/api/v1/applications/:id/mark-as-tutor` | SUPER_ADMIN | Final approval (APPLICANT → TUTOR) |
| PATCH | `/api/v1/applications/:id` | SUPER_ADMIN | Generic status update |
| DELETE | `/api/v1/applications/:id` | SUPER_ADMIN | Delete application (hard delete) |

#### Key Features

**1. Automatic Role Transitions**

```typescript
// On application submission
await User.findByIdAndUpdate(userId, {
  role: USER_ROLES.APPLICANT,
  'tutorProfile.subjects': payload.subjects,
  'tutorProfile.cvUrl': payload.cvUrl,
  'tutorProfile.abiturCertificateUrl': payload.abiturCertificateUrl,
  // ... other profile fields
});

// On final approval
await User.findByIdAndUpdate(application.userId, {
  role: USER_ROLES.TUTOR,
  'tutorProfile.isVerified': true,
  'tutorProfile.verificationStatus': 'APPROVED',
  'tutorProfile.onboardingPhase': 3,
});
```

**2. Pre-Save Hook for Phase Management**

```typescript
tutorApplicationSchema.pre('save', function (next) {
  // Automatically update phase based on status
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

**3. Document Validation**

- **Zod Layer**: Validates URLs and required fields at request time
- **Mongoose Layer**: Schema-level validation with required constraints
- **Mandatory Abitur Certificate**: German education credential requirement

**4. Duplicate Prevention**

```typescript
const existingApplication = await TutorApplication.findOne({ userId });
if (existingApplication) {
  throw new ApiError(
    StatusCodes.BAD_REQUEST,
    'You have already submitted an application'
  );
}
```

**5. Email Notification Placeholders**

```typescript
// TODO: Send email notification to admin
// await sendEmail({
//   to: ADMIN_EMAIL,
//   subject: 'New Tutor Application Received',
//   template: 'new-application',
//   data: { applicantName: payload.name }
// });
```

**6. Admin Query Builder Integration**

```typescript
const applicationQuery = new QueryBuilder(
  TutorApplication.find().populate('userId', 'name email profilePicture phone'),
  query
)
  .search(['name', 'email', 'phone'])
  .filter()  // Filter by status, phase, etc.
  .sort()
  .paginate()
  .fields();
```

#### Workflow Example

**Student Applies to Become Tutor:**

1. **Submit Application (POST /api/v1/applications)**
   ```json
   {
     "subjects": ["Math", "Physics"],
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
   - Application created with `status: SUBMITTED`, `phase: 1`
   - User role changed from STUDENT to APPLICANT
   - Tutor profile fields populated

2. **Admin Reviews Documents (PATCH /api/v1/applications/:id/approve-phase2)**
   ```json
   {
     "adminNotes": "Documents verified. Approved for interview."
   }
   ```
   - Status changed to `DOCUMENTS_REVIEWED`
   - Phase auto-updated to 2 (via pre-save hook)
   - `reviewedAt` timestamp set
   - (Future: Email sent to applicant with interview scheduling link)

3. **Interview Scheduled (Admin updates status manually)**
   - Status: `INTERVIEW_SCHEDULED`
   - Phase: 2 (maintained)

4. **Interview Completed (Admin updates status manually)**
   - Status: `INTERVIEW_DONE`
   - Phase: 2 (maintained)

5. **Final Approval (PATCH /api/v1/applications/:id/mark-as-tutor)**
   - Status changed to `APPROVED`
   - Phase auto-updated to 3
   - `approvedAt` timestamp set
   - User role changed from APPLICANT to TUTOR
   - `tutorProfile.isVerified` set to true
   - (Future: Welcome email sent to new tutor)

**Alternative: Rejection (PATCH /api/v1/applications/:id/reject)**
```json
{
  "rejectionReason": "Abitur certificate not valid. Please resubmit with correct documents."
}
```
- Status changed to `REJECTED`
- `rejectedAt` timestamp set
- (Future: Rejection email sent to applicant)

#### Design Decisions

**Why Unique Application Constraint?**
- Prevents spam applications
- Simplifies applicant tracking
- Enforces one active application per user

**Why Pre-Save Hook for Phase?**
- Automatic phase synchronization with status
- Prevents manual phase management errors
- Single source of truth (status drives phase)

**Why Separate Approve Endpoints?**
- Clear intent for each admin action
- Easier to add role-specific logic (emails, notifications)
- Better API documentation and usability

**Why Abitur Certificate Requirement?**
- Validates German education credentials
- Business requirement for platform credibility
- Legal compliance for tutoring services in Germany

**Why Email Placeholders?**
- Module functional without email service
- Easier to implement and test core logic first
- Email service integration planned for later phase

---

## File Upload Strategy

### Current Implementation

Applications use **file-first, then submit** approach:

1. **Upload Files** (via existing file upload endpoint)
   ```
   POST /api/v1/upload
   → Returns: { cvUrl, abiturCertificateUrl, educationProofUrls[] }
   ```

2. **Submit Application** (with file URLs)
   ```
   POST /api/v1/applications
   Body: { ..., cvUrl, abiturCertificateUrl, educationProofUrls }
   ```

### File Storage Flow

```
Multer → Local uploads/ → Cloudinary/S3 → URL returned → Safe cleanup
```

- **Multer**: Handles multipart form-data
- **Sharp**: Image processing (resize, optimize)
- **Cloudinary/S3**: Permanent storage
- **URL Validation**: Zod ensures valid URLs in application

---

## Route Documentation Standards

All routes include detailed JSDoc-style comments per user request:

```typescript
/**
 * @route   POST /api/v1/applications
 * @desc    Submit tutor application
 * @access  Any authenticated user
 * @body    { subjects[], name, email, phone, address, birthDate, cvUrl, abiturCertificateUrl, educationProofUrls[]? }
 * @note    Files must be uploaded first via file upload endpoint
 * @note    User role will be changed to APPLICANT after submission
 */
router.post(
  '/',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR, USER_ROLES.APPLICANT),
  validateRequest(TutorApplicationValidation.createApplicationZodSchema),
  TutorApplicationController.submitApplication
);
```

**Tags Used:**
- `@route`: HTTP method + endpoint path
- `@desc`: Human-readable description
- `@access`: Who can access (roles or "Public")
- `@body`: Request body structure
- `@query`: Query parameters (for GET requests)
- `@note`: Important implementation details

**Benefits:**
- Self-documenting code
- Easier onboarding for new developers
- Clear understanding of each endpoint's purpose
- Facilitates Swagger documentation generation

---

## Testing Strategy

### Framework: Vitest

**Current Status:** Module structure ready, tests pending Phase 9

**Planned Test Coverage:**

1. **Unit Tests (Service Layer)**
   - Application submission with valid data
   - Duplicate application prevention
   - Role transitions (User → APPLICANT → TUTOR)
   - Phase auto-update logic
   - Document validation

2. **Integration Tests (API Endpoints)**
   - POST /applications (success, duplicate, missing fields)
   - GET /applications (pagination, filtering, search)
   - PATCH /applications/:id/approve-phase2 (status changes)
   - PATCH /applications/:id/reject (rejection flow)
   - PATCH /applications/:id/mark-as-tutor (final approval)

3. **Edge Cases**
   - Application with invalid status transitions
   - Approving already-rejected application
   - Rejecting already-approved application
   - Non-existent application ID

**Test Setup:**
- MongoDB Memory Server (isolated test DB)
- Supertest (API endpoint testing)
- 10s timeout for async operations

---

## Next Steps

### Phase 2: Interview Scheduling Module 🔄

**Objective:** Admin creates interview slots → Applicants book slots → Google Meet link generated

**Key Features:**
- Admin availability management
- Slot booking by applicants
- Google Calendar API integration
- Automatic Google Meet link generation
- Email notifications (slot confirmation, reminders)

**Database Schema:**
```typescript
{
  adminId: ObjectId (ref: User);
  applicantId?: ObjectId (ref: User);
  applicationId: ObjectId (ref: TutorApplication);
  startTime: Date;
  endTime: Date;
  status: 'AVAILABLE' | 'BOOKED' | 'COMPLETED' | 'CANCELLED';
  googleMeetLink?: string;
  googleCalendarEventId?: string;
}
```

**API Endpoints:**
- POST /interview-slots (Admin: Create slot)
- GET /interview-slots (Admin: View all slots, Applicant: View available slots)
- PATCH /interview-slots/:id/book (Applicant: Book slot)
- PATCH /interview-slots/:id/cancel (Admin/Applicant: Cancel booking)

---

## Architectural Patterns Used

### 1. State Machine Pattern
- Application status transitions follow defined rules
- Pre-save hooks enforce phase consistency
- Prevents invalid state transitions

### 2. Role-Based Access Control (RBAC)
- Different endpoints for applicants vs admins
- Auth middleware enforces role requirements
- Clear separation of concerns

### 3. Dual-Layer Validation
- Zod: Runtime validation at request time
- Mongoose: Schema-level validation at database time
- Comprehensive error messages

### 4. Repository Pattern
- Service layer handles business logic
- Controller layer handles HTTP concerns
- Clear separation improves testability

### 5. Builder Pattern
- QueryBuilder provides chainable API
- Flexible filtering, pagination, sorting
- Reusable across modules

---

## Code Quality Standards

### TypeScript
- Strict mode enabled
- Explicit type definitions
- No `any` types (use `unknown` if needed)

### Validation
- All user inputs validated (Zod + Mongoose)
- Enum validation for status fields
- URL validation for file uploads

### Error Handling
- ApiError for business logic errors
- Global error handler converts Mongoose/Zod errors
- Consistent HTTP status codes

### Response Format
- All responses use `sendResponse()` utility
- Standardized success/error structure
- Pagination metadata included when applicable

### Logging
- Winston logger (NO console.log)
- Structured logging with context
- Error stack traces in error logs

---

## Environment Variables

### Required for Tutor Application Module

```env
# Database
MONGODB_URI=mongodb://localhost:27017/lms-backend

# JWT
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d

# File Upload
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email (Future)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
ADMIN_EMAIL=admin@example.com
```

### Future Requirements

```env
# Google Calendar/Meet (Phase 2+)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/v1/auth/google/callback

# Stripe (Phase 5)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_CLIENT_ID=ca_...
```

---

## Troubleshooting

### Common Issues

**Issue: "You have already submitted an application"**
- **Cause:** Duplicate application for same userId
- **Solution:** Check existing application with GET /applications/my-application

**Issue: "Application must be in SUBMITTED status"**
- **Cause:** Trying to approve application with wrong status
- **Solution:** Verify current status, use correct approval endpoint

**Issue: "Cannot reject an approved application"**
- **Cause:** Business rule prevents rejecting approved tutors
- **Solution:** Use different endpoint for status updates or delete application

**Issue: "CV must be a valid URL"**
- **Cause:** Invalid file URL format
- **Solution:** Upload file first via file upload endpoint, use returned URL

---

## Migration Guide (If Updating Existing System)

### Step 1: Backup Database
```bash
mongodump --uri="mongodb://localhost:27017/lms-backend" --out=./backup
```

### Step 2: Update User Model
- Add new roles to USER_ROLES enum
- Add tutorProfile and studentProfile fields
- Run migration script (if needed)

### Step 3: Create Subject Collection
```bash
# Import initial subjects
mongoimport --db lms-backend --collection subjects --file subjects.json
```

### Step 4: Deploy TutorApplication Module
- No data migration needed (new collection)
- Register routes in `src/routes/index.ts`
- Update Swagger documentation

### Step 5: Test Application Flow
1. Create test user
2. Submit application
3. Verify role change to APPLICANT
4. Admin approves to Phase 2
5. Admin marks as TUTOR
6. Verify final role change

---

## API Examples

### Submit Application (cURL)

```bash
curl -X POST http://localhost:5000/api/v1/applications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "subjects": ["Mathematics", "Physics"],
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+49123456789",
    "address": "Berlin, Germany",
    "birthDate": "1995-05-15",
    "cvUrl": "https://res.cloudinary.com/demo/cv.pdf",
    "abiturCertificateUrl": "https://res.cloudinary.com/demo/abitur.pdf",
    "educationProofUrls": ["https://res.cloudinary.com/demo/degree.pdf"]
  }'
```

### List Applications with Filters (Admin)

```bash
curl -X GET "http://localhost:5000/api/v1/applications?status=SUBMITTED&phase=1&page=1&limit=10&searchTerm=john" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

### Approve to Phase 2

```bash
curl -X PATCH http://localhost:5000/api/v1/applications/64a1b2c3d4e5f6g7h8i9j0k1/approve-phase2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -d '{
    "adminNotes": "Documents verified. Proceeding to interview."
  }'
```

### Mark as Tutor (Final Approval)

```bash
curl -X PATCH http://localhost:5000/api/v1/applications/64a1b2c3d4e5f6g7h8i9j0k1/mark-as-tutor \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

---

## Performance Considerations

### Database Indexes
- `userId` (unique): Fast applicant lookup
- `status + phase`: Efficient admin filtering
- `submittedAt`: Chronological sorting
- `email`: Applicant search

### Query Optimization
- Populate only required fields: `'name email profilePicture'`
- Pagination limits result sets
- Text indexes for search queries

### Caching Strategy (Future)
- Cache active subjects (rarely change)
- Cache application counts for dashboard
- Redis for session management

---

## Security Considerations

### Authentication
- JWT-based authentication required for all endpoints
- Token expiry enforced
- Refresh token mechanism (existing)

### Authorization
- Role-based access control (RBAC)
- Admin-only endpoints properly protected
- Applicants can only view own application

### Data Validation
- Dual-layer validation (Zod + Mongoose)
- URL validation prevents XSS via file fields
- Input sanitization for text fields

### File Upload
- File type validation (PDF, images only)
- File size limits enforced
- Virus scanning (recommended for production)

---

## Monitoring & Observability

### Auto-Labeling System
- Controllers and services automatically labeled
- Request-scoped context tracking
- OpenTelemetry spans for distributed tracing

### Metrics to Track
- Application submission rate
- Approval/rejection ratios
- Average time per phase
- Document upload success rate

### Logging Examples

```typescript
logger.info('Application submitted', {
  userId,
  applicationId,
  subjects: payload.subjects
});

errorLogger.error('Application approval failed', {
  applicationId,
  error: error.message,
  stack: error.stack
});
```

---

## Future Enhancements

### Phase 2+
- Google Meet integration for interviews
- Automated interview reminders
- Calendar synchronization

### Phase 3+
- Multi-language support (German/English)
- Document OCR for certificate validation
- AI-powered application screening

### Phase 4+
- Video interview recordings
- Interview feedback forms
- Tutor portfolio pages

### Phase 5+
- Background check integration
- Teaching certification verification
- Automated contract generation

---

## Contributors & Maintenance

**Initial Implementation:** Phase 1-2 completed
**Framework:** educoin-backend template customized for tutoring marketplace
**Documentation Standard:** All modules follow this format

**Maintenance Notes:**
- Update this document when adding new features
- Include migration guides for breaking changes
- Keep API examples up-to-date
- Document all environment variables

---

## References

- [CLAUDE.md](../CLAUDE.md) - Project architecture overview
- [Stripe Connect Guide](./payment-stripe-connect.md) - Payment integration (future)
- [Google OAuth Guide](./google-login-full-guide-bn.md) - OAuth implementation
- [QueryBuilder Documentation](./geoquery-support.md) - Advanced queries

---

**Last Updated:** Phase 2 - Tutor Application System completion
**Next Review:** After Interview Slot module implementation