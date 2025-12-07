# Tutoring Marketplace - Project Overview

## Business Model

This platform is a **GoStudent-inspired tutoring marketplace** with unique features:

### Core Features
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

### Implementation Phases

**Phase 1: Core User System & Subjects** ✅ COMPLETED
- User roles and profile fields
- Subject management module

**Phase 2: Tutor Onboarding** 🔄 IN PROGRESS
- Tutor application system ✅
- Interview scheduling (in progress)

**Phase 3: Trial Request Matching** 🔄 PENDING
- Uber-style request system

**Phase 4: In-Chat Booking & Sessions** 🔄 PENDING
- Message model extensions
- Session module with Google Meet

**Phase 5: Billing & Payments** 🔄 PENDING
- Student subscriptions
- Monthly billing automation
- Tutor earnings & payouts

**Phase 6: Admin Dashboard** 🔄 PENDING
- Stats and analytics
- CSV export functionality

**Phase 7: Reviews & Automation** 🔄 PENDING
- Session reviews
- Cron jobs (reminders, billing, auto-complete)

**Phase 8: External Integrations** 🔄 PENDING
- Google Calendar API

**Phase 9-10: Testing & Documentation** 🔄 PENDING
- Vitest tests
- Swagger documentation

### Database Collections

**Completed:**
- `subjects`: Teaching subjects (Math, Physics, etc.)
- `tutorApplications`: Tutor application submissions with documents

**Pending:**
- `interviewSlots`: Admin interview availability slots
- `trialRequests`: Student trial requests (Uber-style)
- `sessions`: Booked tutoring sessions with Google Meet links
- `studentSubscriptions`: Active subscription plans
- `monthlyBillings`: Month-end billing records with invoices
- `tutorEarnings`: Tutor payout records
- `sessionReviews`: Post-session ratings and reviews

### Documentation Structure

```
doc/tutoring-marketplace/
├── 00-overview.md (this file)
├── 01-user-system.md
├── 02-subject-module.md
├── 03-tutor-application.md
├── 04-interview-slots.md (pending)
├── 05-trial-requests.md (pending)
├── 06-sessions.md (pending)
├── 07-billing.md (pending)
├── 08-admin-dashboard.md (pending)
└── 99-api-reference.md
```

### Tech Stack

- **Runtime**: Node.js + TypeScript (strict mode)
- **Web Framework**: Express 4.x
- **Database**: MongoDB + Mongoose (ODM)
- **Authentication**: JWT + Passport.js (local + Google OAuth2.0)
- **Real-time**: Socket.IO
- **Validation**: Zod (runtime) + Mongoose schemas
- **File Storage**: Multer → Cloudinary/AWS S3
- **Payments**: Stripe + Stripe Connect (marketplace)
- **Testing**: Vitest + Supertest + MongoDB Memory Server
- **Video Calls**: Google Meet via Google Calendar API

### Architecture Patterns

1. **MVC + Service Layer**: Route → Controller → Service → Model
2. **Dual Validation**: Zod (runtime) + Mongoose (schema)
3. **Role-Based Access Control (RBAC)**: Auth middleware with USER_ROLES
4. **State Machine**: Application status transitions with pre-save hooks
5. **Builder Pattern**: QueryBuilder for advanced queries
6. **Repository Pattern**: Service layer encapsulates business logic

### Quick Start

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your credentials

# Run development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
npm start
```

### API Documentation

- **Swagger UI**: `http://localhost:5000/api/v1/docs`
- **Base URL**: `http://localhost:5000/api/v1`
- **Authentication**: JWT Bearer token in Authorization header

### Environment Variables

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

# Google Calendar (Phase 2+)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/v1/auth/google/callback

# Stripe (Phase 5+)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_CLIENT_ID=ca_...

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
ADMIN_EMAIL=admin@example.com
```

### Contributors & Maintenance

**Initial Implementation:** Phase 1-2
**Framework:** educoin-backend template customized for tutoring marketplace
**Last Updated:** Phase 2 - Tutor Application System completion

### References

- [Main Project README](../../CLAUDE.md)
- [Module Documentation](./01-user-system.md)
- [API Reference](./99-api-reference.md)