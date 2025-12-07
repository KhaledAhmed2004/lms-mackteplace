# Testing Guide - Tutoring Marketplace Platform

## Overview

This guide covers testing strategy and implementation for all modules in the tutoring marketplace platform.

**Testing Stack**:
- **Vitest** - Fast unit test framework
- **Supertest** - HTTP assertion library
- **MongoDB Memory Server** - In-memory database for tests
- **Faker** - Test data generation

---

## Test Structure

```
tests/
├── setup/
│   └── vitest.setup.ts          # Global test setup
├── unit/
│   ├── services/
│   │   ├── subject.service.test.ts
│   │   ├── tutorApplication.service.test.ts
│   │   ├── session.service.test.ts
│   │   ├── monthlyBilling.service.test.ts
│   │   └── sessionReview.service.test.ts
│   └── utils/
│       └── helpers.test.ts
└── integration/
    ├── auth.test.ts
    ├── subject.test.ts
    ├── tutorApplication.test.ts
    ├── trialRequest.test.ts
    ├── session.test.ts
    ├── subscription.test.ts
    ├── billing.test.ts
    ├── earnings.test.ts
    ├── admin.test.ts
    └── review.test.ts
```

---

## Setup Configuration

### vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup/vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        'src/config/',
        'src/server.ts',
        'src/app.ts',
        'src/DB/',
      ],
    },
    testTimeout: 10000,
  },
});
```

### tests/setup/vitest.setup.ts

```typescript
import { beforeAll, afterAll, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  // Clear all collections after each test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});
```

---

## Test Helpers

### tests/helpers/auth.helper.ts

```typescript
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import config from '../../src/config';

export const generateAuthToken = (
  userId: string,
  role: string = 'STUDENT'
): string => {
  return jwt.sign(
    { id: userId, role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

export const createTestUser = async (role: string = 'STUDENT') => {
  const User = (await import('../../src/app/modules/user/user.model')).User;

  const user = await User.create({
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
    password: 'password123',
    role,
    isEmailVerified: true,
  });

  const token = generateAuthToken(user._id.toString(), role);

  return { user, token };
};
```

### tests/helpers/testData.helper.ts

```typescript
import { Types } from 'mongoose';

export const createTestSubject = () => ({
  name: 'Mathematics',
  description: 'Advanced mathematics tutoring',
  icon: 'math-icon.png',
});

export const createTestSession = (studentId: string, tutorId: string) => ({
  studentId: new Types.ObjectId(studentId),
  tutorId: new Types.ObjectId(tutorId),
  subject: 'Mathematics',
  startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
  endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
  duration: 60,
  pricePerHour: 30,
  totalPrice: 30,
  status: 'SCHEDULED',
});

export const createTestReview = (sessionId: string, studentId: string, tutorId: string) => ({
  sessionId: new Types.ObjectId(sessionId),
  studentId: new Types.ObjectId(studentId),
  tutorId: new Types.ObjectId(tutorId),
  overallRating: 5,
  teachingQuality: 5,
  communication: 5,
  punctuality: 5,
  preparedness: 5,
  comment: 'Excellent tutor!',
  wouldRecommend: true,
  isPublic: true,
});
```

---

## Example Test Cases

### Unit Test Example: Subject Service

```typescript
// tests/unit/services/subject.service.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { SubjectService } from '../../../src/app/modules/subject/subject.service';
import { Subject } from '../../../src/app/modules/subject/subject.model';
import { createTestSubject } from '../../helpers/testData.helper';

describe('SubjectService', () => {
  describe('createSubject', () => {
    it('should create a new subject', async () => {
      const subjectData = createTestSubject();
      const result = await SubjectService.createSubject(subjectData);

      expect(result).toBeDefined();
      expect(result.name).toBe(subjectData.name);
      expect(result.description).toBe(subjectData.description);
    });

    it('should throw error for duplicate subject name', async () => {
      const subjectData = createTestSubject();
      await SubjectService.createSubject(subjectData);

      await expect(
        SubjectService.createSubject(subjectData)
      ).rejects.toThrow();
    });
  });

  describe('getAllSubjects', () => {
    beforeEach(async () => {
      await Subject.create(createTestSubject());
      await Subject.create({ ...createTestSubject(), name: 'Physics' });
    });

    it('should return all subjects', async () => {
      const result = await SubjectService.getAllSubjects({});

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });

    it('should filter subjects by search term', async () => {
      const result = await SubjectService.getAllSubjects({
        searchTerm: 'Math',
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Mathematics');
    });
  });
});
```

### Integration Test Example: Session API

```typescript
// tests/integration/session.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { createTestUser } from '../helpers/auth.helper';
import { createTestSession } from '../helpers/testData.helper';

describe('Session API', () => {
  let studentToken: string;
  let tutorToken: string;
  let studentId: string;
  let tutorId: string;

  beforeEach(async () => {
    const student = await createTestUser('STUDENT');
    const tutor = await createTestUser('TUTOR');

    studentToken = student.token;
    tutorToken = tutor.token;
    studentId = student.user._id.toString();
    tutorId = tutor.user._id.toString();
  });

  describe('POST /api/v1/sessions', () => {
    it('should create a new session', async () => {
      const sessionData = {
        tutorId,
        subject: 'Mathematics',
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
      };

      const response = await request(app)
        .post('/api/v1/sessions')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(sessionData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.subject).toBe('Mathematics');
    });

    it('should reject unauthorized requests', async () => {
      const response = await request(app)
        .post('/api/v1/sessions')
        .send({});

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/sessions/my-sessions', () => {
    beforeEach(async () => {
      const Session = (await import('../../src/app/modules/session/session.model')).Session;
      await Session.create(createTestSession(studentId, tutorId));
    });

    it('should return student sessions', async () => {
      const response = await request(app)
        .get('/api/v1/sessions/my-sessions')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });
  });
});
```

### Integration Test Example: Review API

```typescript
// tests/integration/review.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { createTestUser } from '../helpers/auth.helper';
import { Session } from '../../src/app/modules/session/session.model';

describe('Review API', () => {
  let studentToken: string;
  let studentId: string;
  let tutorId: string;
  let sessionId: string;

  beforeEach(async () => {
    const student = await createTestUser('STUDENT');
    const tutor = await createTestUser('TUTOR');

    studentToken = student.token;
    studentId = student.user._id.toString();
    tutorId = tutor.user._id.toString();

    // Create completed session
    const session = await Session.create({
      studentId,
      tutorId,
      subject: 'Mathematics',
      startTime: new Date(),
      endTime: new Date(),
      duration: 60,
      pricePerHour: 30,
      totalPrice: 30,
      status: 'COMPLETED',
      completedAt: new Date(),
    });

    sessionId = session._id.toString();
  });

  describe('POST /api/v1/reviews', () => {
    it('should create a review for completed session', async () => {
      const reviewData = {
        sessionId,
        overallRating: 5,
        teachingQuality: 5,
        communication: 5,
        punctuality: 5,
        preparedness: 5,
        comment: 'Excellent tutor!',
        wouldRecommend: true,
      };

      const response = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(reviewData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.overallRating).toBe(5);
    });

    it('should reject duplicate reviews', async () => {
      const reviewData = {
        sessionId,
        overallRating: 5,
        teachingQuality: 5,
        communication: 5,
        punctuality: 5,
        preparedness: 5,
        wouldRecommend: true,
      };

      await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(reviewData);

      const response = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(reviewData);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/reviews/tutor/:tutorId/stats', () => {
    beforeEach(async () => {
      const SessionReview = (await import('../../src/app/modules/sessionReview/sessionReview.model')).SessionReview;

      await SessionReview.create({
        sessionId,
        studentId,
        tutorId,
        overallRating: 5,
        teachingQuality: 5,
        communication: 4,
        punctuality: 5,
        preparedness: 5,
        wouldRecommend: true,
        isPublic: true,
      });
    });

    it('should return tutor statistics', async () => {
      const response = await request(app)
        .get(`/api/v1/reviews/tutor/${tutorId}/stats`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.totalReviews).toBe(1);
      expect(response.body.data.averageOverallRating).toBe(5);
      expect(response.body.data.wouldRecommendPercentage).toBe(100);
    });
  });
});
```

---

## Test Coverage Goals

### Minimum Coverage Targets

- **Services**: 80% coverage
- **Controllers**: 70% coverage
- **Routes**: 90% coverage
- **Overall**: 75% coverage

### Priority Areas

**High Priority** (Must have 90%+ coverage):
- Authentication & authorization
- Billing calculations
- Payout calculations
- Review statistics
- Duplicate prevention logic

**Medium Priority** (70%+ coverage):
- CRUD operations
- Search and filtering
- Pagination
- Status transitions

**Low Priority** (50%+ coverage):
- Simple getters
- Formatting utilities
- Placeholder integrations

---

## Running Tests

### All Tests

```bash
npm test
```

### Single Test File

```bash
npm test -- tests/integration/session.test.ts
```

### Watch Mode

```bash
npm test
```

### Coverage Report

```bash
npm run test:coverage
```

### UI Mode

```bash
npm run test:ui
```

---

## Mocking External Services

### Stripe Mock

```typescript
// tests/mocks/stripe.mock.ts
import { vi } from 'vitest';

export const stripeMock = {
  invoices: {
    create: vi.fn().mockResolvedValue({
      id: 'inv_test123',
      status: 'paid',
    }),
    finalizeInvoice: vi.fn().mockResolvedValue({}),
  },
  transfers: {
    create: vi.fn().mockResolvedValue({
      id: 'tr_test123',
      amount: 24000,
    }),
  },
};

vi.mock('stripe', () => ({
  default: vi.fn(() => stripeMock),
}));
```

### Google Calendar Mock

```typescript
// tests/mocks/googleCalendar.mock.ts
import { vi } from 'vitest';

vi.mock('../../src/app/services/googleCalendar.service', () => ({
  GoogleCalendarService: {
    createSessionCalendarEvent: vi.fn().mockResolvedValue({
      eventId: 'event_test123',
      meetLink: 'https://meet.google.com/test-link',
      htmlLink: 'https://calendar.google.com/test',
      status: 'confirmed',
    }),
  },
}));
```

---

## Test Data Management

### Factory Functions

```typescript
// tests/factories/user.factory.ts
export const createUserFactory = (overrides = {}) => ({
  name: 'Test User',
  email: `test-${Date.now()}@example.com`,
  password: 'password123',
  role: 'STUDENT',
  isEmailVerified: true,
  ...overrides,
});

// tests/factories/subscription.factory.ts
export const createSubscriptionFactory = (studentId: string, overrides = {}) => ({
  studentId,
  tier: 'FLEXIBLE',
  pricePerHour: 30,
  status: 'ACTIVE',
  startDate: new Date(),
  ...overrides,
});
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test:run

      - name: Generate coverage
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Use `afterEach` to clear test data
3. **Descriptive Names**: Test names should describe what they test
4. **AAA Pattern**: Arrange, Act, Assert
5. **Mock External Services**: Don't hit real APIs in tests
6. **Test Edge Cases**: Not just happy paths
7. **Fast Tests**: Keep tests under 10 seconds each
8. **Readable Assertions**: Use clear expect statements

---

## Common Test Scenarios

### Testing Authentication

```typescript
it('should reject requests without token', async () => {
  const response = await request(app).get('/api/v1/protected');
  expect(response.status).toBe(401);
});

it('should reject requests with invalid token', async () => {
  const response = await request(app)
    .get('/api/v1/protected')
    .set('Authorization', 'Bearer invalid_token');
  expect(response.status).toBe(401);
});

it('should reject requests with wrong role', async () => {
  const { token } = await createTestUser('STUDENT');
  const response = await request(app)
    .get('/api/v1/admin/dashboard')
    .set('Authorization', `Bearer ${token}`);
  expect(response.status).toBe(403);
});
```

### Testing Validation

```typescript
it('should reject invalid email format', async () => {
  const response = await request(app)
    .post('/api/v1/users')
    .send({ email: 'invalid-email' });
  expect(response.status).toBe(400);
  expect(response.body.message).toContain('email');
});

it('should reject rating outside 1-5 range', async () => {
  const response = await request(app)
    .post('/api/v1/reviews')
    .set('Authorization', `Bearer ${studentToken}`)
    .send({ overallRating: 6 });
  expect(response.status).toBe(400);
});
```

### Testing Pagination

```typescript
it('should paginate results correctly', async () => {
  // Create 15 test records
  for (let i = 0; i < 15; i++) {
    await Subject.create({ name: `Subject ${i}` });
  }

  const response = await request(app)
    .get('/api/v1/subjects?page=2&limit=10');

  expect(response.body.data).toHaveLength(5);
  expect(response.body.meta.page).toBe(2);
  expect(response.body.meta.total).toBe(15);
});
```

---

## Debugging Tests

### Enable Detailed Logs

```typescript
// Add to specific test
import logger from '../../src/shared/logger';
logger.level = 'debug';
```

### Run Single Test in Debug Mode

```bash
node --inspect-brk ./node_modules/vitest/vitest.mjs run tests/integration/session.test.ts
```

### View Test Output

```bash
npm test -- --reporter=verbose
```

---

## Next Steps

1. Implement unit tests for all services
2. Implement integration tests for all endpoints
3. Add edge case testing
4. Set up CI/CD pipeline
5. Monitor coverage reports
6. Fix failing tests before deployment

---

**Testing is critical for production readiness!** Aim for 80%+ coverage before deploying to production.
