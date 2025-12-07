# Swagger API Documentation Guide

## Overview

This guide covers updating Swagger/OpenAPI documentation for all new endpoints in the tutoring marketplace platform.

**Current Status**: Swagger UI available at `/api/v1/docs`

---

## Swagger Setup

### Installation

```bash
npm install swagger-ui-express swagger-jsdoc
npm install -D @types/swagger-ui-express @types/swagger-jsdoc
```

### Configuration

```typescript
// src/config/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Tutoring Marketplace API',
      version: '1.0.0',
      description: 'GoStudent-style tutoring marketplace platform with Uber-style matching, in-chat booking, and automated billing',
      contact: {
        name: 'API Support',
        email: 'support@tutoring-marketplace.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000/api/v1',
        description: 'Development server',
      },
      {
        url: 'https://api.tutoring-marketplace.com/api/v1',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/app/modules/**/*.route.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
```

---

## Documentation Examples

### Subject Endpoints

```typescript
/**
 * @swagger
 * /subjects:
 *   get:
 *     summary: Get all subjects
 *     description: Retrieve list of all teaching subjects with pagination and search
 *     tags: [Subjects]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: searchTerm
 *         schema:
 *           type: string
 *         description: Search by subject name
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Subjects retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Subjects retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Subject'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Subject:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         _id:
 *           type: string
 *           description: Subject ID
 *         name:
 *           type: string
 *           description: Subject name
 *           example: Mathematics
 *         description:
 *           type: string
 *           description: Subject description
 *           example: Advanced mathematics tutoring
 *         icon:
 *           type: string
 *           description: Subject icon URL
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
```

### Session Endpoints

```typescript
/**
 * @swagger
 * /sessions:
 *   post:
 *     summary: Create a new session
 *     description: Student creates a tutoring session (from accepted proposal)
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tutorId
 *               - subject
 *               - startTime
 *               - endTime
 *             properties:
 *               tutorId:
 *                 type: string
 *                 description: Tutor's user ID
 *               subject:
 *                 type: string
 *                 example: Mathematics
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 statusCode:
 *                   type: integer
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Session'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Session:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         studentId:
 *           type: string
 *         tutorId:
 *           type: string
 *         subject:
 *           type: string
 *           example: Mathematics
 *         startTime:
 *           type: string
 *           format: date-time
 *         endTime:
 *           type: string
 *           format: date-time
 *         duration:
 *           type: number
 *           description: Duration in minutes
 *           example: 60
 *         pricePerHour:
 *           type: number
 *           description: Price per hour in EUR
 *           example: 30
 *         totalPrice:
 *           type: number
 *           description: Total session price in EUR
 *           example: 30
 *         status:
 *           type: string
 *           enum: [SCHEDULED, COMPLETED, CANCELLED]
 *         googleMeetLink:
 *           type: string
 *           example: https://meet.google.com/abc-defg-hij
 *         createdAt:
 *           type: string
 *           format: date-time
 */
```

### Review Endpoints

```typescript
/**
 * @swagger
 * /reviews:
 *   post:
 *     summary: Create a session review
 *     description: Student reviews a completed session
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *               - overallRating
 *               - teachingQuality
 *               - communication
 *               - punctuality
 *               - preparedness
 *               - wouldRecommend
 *             properties:
 *               sessionId:
 *                 type: string
 *                 description: Session ID to review
 *               overallRating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               teachingQuality:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               communication:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 4
 *               punctuality:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               preparedness:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               comment:
 *                 type: string
 *                 maxLength: 1000
 *                 example: Excellent tutor! Very patient and knowledgeable.
 *               wouldRecommend:
 *                 type: boolean
 *                 example: true
 *               isPublic:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Review created successfully
 *       400:
 *         description: Bad request (e.g., session not completed, duplicate review)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not your session)
 */

/**
 * @swagger
 * /reviews/tutor/{tutorId}/stats:
 *   get:
 *     summary: Get tutor review statistics
 *     description: Get aggregated statistics for a tutor's reviews
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tutorId
 *         required: true
 *         schema:
 *           type: string
 *         description: Tutor's user ID
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalReviews:
 *                       type: number
 *                       example: 45
 *                     averageOverallRating:
 *                       type: number
 *                       example: 4.7
 *                     averageTeachingQuality:
 *                       type: number
 *                       example: 4.8
 *                     averageCommunication:
 *                       type: number
 *                       example: 4.6
 *                     averagePunctuality:
 *                       type: number
 *                       example: 4.9
 *                     averagePreparedness:
 *                       type: number
 *                       example: 4.7
 *                     wouldRecommendPercentage:
 *                       type: number
 *                       example: 95
 *                     ratingDistribution:
 *                       type: object
 *                       properties:
 *                         1:
 *                           type: number
 *                           example: 0
 *                         2:
 *                           type: number
 *                           example: 1
 *                         3:
 *                           type: number
 *                           example: 3
 *                         4:
 *                           type: number
 *                           example: 15
 *                         5:
 *                           type: number
 *                           example: 26
 */
```

### Billing Endpoints

```typescript
/**
 * @swagger
 * /billings/generate:
 *   post:
 *     summary: Generate monthly billings
 *     description: Admin endpoint to generate monthly billings for all students (cron job)
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - month
 *               - year
 *             properties:
 *               month:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 12
 *                 example: 1
 *               year:
 *                 type: number
 *                 minimum: 2020
 *                 example: 2024
 *     responses:
 *       201:
 *         description: Billings generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: 45 monthly billings generated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: number
 *                     billings:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/MonthlyBilling'
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     MonthlyBilling:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         studentId:
 *           type: string
 *         subscriptionId:
 *           type: string
 *         billingMonth:
 *           type: number
 *           example: 1
 *         billingYear:
 *           type: number
 *           example: 2024
 *         invoiceNumber:
 *           type: string
 *           example: INV-2401-A3B2C1
 *         totalSessions:
 *           type: number
 *           example: 8
 *         totalHours:
 *           type: number
 *           example: 10
 *         total:
 *           type: number
 *           description: Total amount in EUR
 *           example: 300
 *         status:
 *           type: string
 *           enum: [PENDING, PAID, FAILED, REFUNDED]
 *         paidAt:
 *           type: string
 *           format: date-time
 */
```

### Admin Endpoints

```typescript
/**
 * @swagger
 * /admin/dashboard:
 *   get:
 *     summary: Get dashboard statistics
 *     description: Get comprehensive platform statistics for admin dashboard
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: object
 *                       properties:
 *                         totalUsers:
 *                           type: number
 *                         totalStudents:
 *                           type: number
 *                         totalTutors:
 *                           type: number
 *                         activeStudents:
 *                           type: number
 *                     sessions:
 *                       type: object
 *                       properties:
 *                         totalSessions:
 *                           type: number
 *                         completedSessions:
 *                           type: number
 *                         upcomingSessions:
 *                           type: number
 *                     revenue:
 *                       type: object
 *                       properties:
 *                         totalRevenue:
 *                           type: number
 *                         revenueThisMonth:
 *                           type: number
 *                         platformCommissionThisMonth:
 *                           type: number
 */

/**
 * @swagger
 * /admin/export/users:
 *   get:
 *     summary: Export users to CSV
 *     description: Download CSV file with user data
 *     tags: [Admin - Export]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [STUDENT, TUTOR, APPLICANT, SUPER_ADMIN]
 *         description: Filter by user role
 *     responses:
 *       200:
 *         description: CSV file download
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 */
```

---

## Tags Organization

```typescript
/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Authentication endpoints
 *   - name: Users
 *     description: User management
 *   - name: Subjects
 *     description: Teaching subjects
 *   - name: Applications
 *     description: Tutor applications
 *   - name: Interview Slots
 *     description: Interview scheduling
 *   - name: Trial Requests
 *     description: Uber-style trial matching
 *   - name: Sessions
 *     description: Tutoring sessions
 *   - name: Subscriptions
 *     description: Student subscription plans
 *   - name: Billing
 *     description: Monthly billing
 *   - name: Earnings
 *     description: Tutor earnings & payouts
 *   - name: Reviews
 *     description: Session reviews & ratings
 *   - name: Admin
 *     description: Admin dashboard & analytics
 *   - name: Admin - Export
 *     description: CSV data exports
 */
```

---

## Common Response Schemas

```typescript
/**
 * @swagger
 * components:
 *   schemas:
 *     SuccessResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         statusCode:
 *           type: integer
 *           example: 200
 *         message:
 *           type: string
 *         data:
 *           type: object
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         statusCode:
 *           type: integer
 *           example: 400
 *         message:
 *           type: string
 *         errorMessages:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               path:
 *                 type: string
 *               message:
 *                 type: string
 *
 *     PaginationMeta:
 *       type: object
 *       properties:
 *         page:
 *           type: integer
 *           example: 1
 *         limit:
 *           type: integer
 *           example: 10
 *         total:
 *           type: integer
 *           example: 100
 */
```

---

## Complete Module Documentation Checklist

### For Each Module:

- [ ] **Schemas**: Define all data models
- [ ] **Endpoints**: Document all routes
- [ ] **Request Bodies**: Define required/optional fields
- [ ] **Parameters**: Document query params, path params
- [ ] **Responses**: Define success and error responses
- [ ] **Examples**: Provide realistic examples
- [ ] **Security**: Specify authentication requirements
- [ ] **Tags**: Organize by module

---

## Modules to Document

1. ✅ Subject
2. ✅ TutorApplication
3. ✅ InterviewSlot
4. ✅ TrialRequest
5. ✅ Session
6. ✅ StudentSubscription
7. ✅ MonthlyBilling
8. ✅ TutorEarnings
9. ✅ SessionReview
10. ✅ Admin Dashboard
11. ✅ Admin Exports

---

## Accessing Swagger UI

Once documentation is added:

1. Start the server: `npm run dev`
2. Navigate to: `http://localhost:5000/api/v1/docs`
3. Explore and test all endpoints interactively

---

## Benefits of Swagger Documentation

1. **Interactive Testing**: Test endpoints directly from browser
2. **Clear Contracts**: Frontend knows exact API structure
3. **Code Generation**: Can generate client SDKs
4. **Validation**: Ensures API matches documentation
5. **Onboarding**: New developers understand API quickly

---

**Next Steps**: Add Swagger comments to all route files following the examples above.
