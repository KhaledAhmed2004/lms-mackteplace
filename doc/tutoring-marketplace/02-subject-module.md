# Phase 1: Subject Management Module

## Overview

CRUD operations for teaching subjects (Math, Physics, Chemistry, etc.). Admin-only creation, public listing.

## Status: ✅ COMPLETED

## Module Structure

**Location:** `src/app/modules/subject/`

**Files:**
- `subject.interface.ts` - TypeScript types
- `subject.model.ts` - Mongoose schema
- `subject.validation.ts` - Zod schemas
- `subject.service.ts` - Business logic
- `subject.controller.ts` - Request handlers
- `subject.route.ts` - Express routes

## API Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/v1/subjects` | SUPER_ADMIN | Create new subject |
| GET | `/api/v1/subjects` | Public | List subjects (search, filter, paginate) |
| GET | `/api/v1/subjects/:id` | Public | Get single subject |
| PATCH | `/api/v1/subjects/:id` | SUPER_ADMIN | Update subject |
| DELETE | `/api/v1/subjects/:id` | SUPER_ADMIN | Delete subject |

## Database Schema

```typescript
{
  _id: ObjectId;
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

## Validation

### Create Subject (Zod)

```typescript
{
  name: string (min 2 chars, required),
  description: string (min 10 chars, required),
  isActive: boolean (optional, default true)
}
```

### Update Subject (Zod)

```typescript
{
  name?: string (min 2 chars),
  description?: string (min 10 chars),
  isActive?: boolean
}
```

## Key Features

### 1. Admin-Only Creation
Only SUPER_ADMIN can create/update/delete subjects

### 2. Public Listing
Anyone can view subjects (needed for trial request forms)

### 3. Search Support
Full-text search on subject name and description

```typescript
GET /api/v1/subjects?searchTerm=math
```

### 4. Soft Enable/Disable
Use `isActive` flag instead of deletion to preserve historical data

```typescript
// Disable subject
PATCH /api/v1/subjects/:id
{ "isActive": false }
```

### 5. QueryBuilder Integration
Advanced filtering, pagination, sorting

```typescript
GET /api/v1/subjects?isActive=true&page=1&limit=10&sort=-createdAt
```

## API Examples

### Create Subject (Admin)

```bash
curl -X POST http://localhost:5000/api/v1/subjects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -d '{
    "name": "Mathematics",
    "description": "Algebra, Geometry, Calculus, and more",
    "isActive": true
  }'
```

**Response:**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Subject created successfully",
  "data": {
    "_id": "64a1b2c3d4e5f6g7h8i9j0k1",
    "name": "Mathematics",
    "description": "Algebra, Geometry, Calculus, and more",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### List Subjects (Public)

```bash
curl -X GET "http://localhost:5000/api/v1/subjects?isActive=true&page=1&limit=10"
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Subjects retrieved successfully",
  "data": [
    {
      "_id": "64a1b2c3d4e5f6g7h8i9j0k1",
      "name": "Mathematics",
      "description": "Algebra, Geometry, Calculus, and more",
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "_id": "64b2c3d4e5f6g7h8i9j0k1l2",
      "name": "Physics",
      "description": "Mechanics, Thermodynamics, Electromagnetism",
      "isActive": true,
      "createdAt": "2024-01-15T11:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 15,
    "totalPages": 2
  }
}
```

### Search Subjects

```bash
curl -X GET "http://localhost:5000/api/v1/subjects?searchTerm=physics"
```

### Update Subject (Admin)

```bash
curl -X PATCH http://localhost:5000/api/v1/subjects/64a1b2c3d4e5f6g7h8i9j0k1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -d '{
    "description": "Updated: Algebra, Geometry, Calculus, Statistics",
    "isActive": true
  }'
```

### Disable Subject (Admin)

```bash
curl -X PATCH http://localhost:5000/api/v1/subjects/64a1b2c3d4e5f6g7h8i9j0k1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -d '{
    "isActive": false
  }'
```

### Delete Subject (Admin)

```bash
curl -X DELETE http://localhost:5000/api/v1/subjects/64a1b2c3d4e5f6g7h8i9j0k1 \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

## Usage in Other Modules

### Tutor Application

```typescript
// When tutor applies, they select subjects
{
  "subjects": ["Mathematics", "Physics"],
  // ... other fields
}

// Stored in User.tutorProfile.subjects
// Also stored in TutorApplication.subjects
```

### Trial Request (Future)

```typescript
// When student requests trial
{
  "subject": "Mathematics",  // Must exist in Subject collection
  // ... other fields
}
```

### Session Booking (Future)

```typescript
// When booking session
{
  "subject": "Physics",  // Used for matching and display
  // ... other fields
}
```

## Design Decisions

### Why Public Access?
- Students need to see available subjects when requesting trials
- Tutors need to see subjects when applying
- No sensitive data in subject list

### Why Soft Delete (isActive)?
- Preserves historical data
- Applications/sessions may reference old subjects
- Can reactivate if needed

### Why Text Index?
- Fast search for subject autocomplete
- Better UX for subject selection forms
- Efficient filtering

### Why Admin-Only Creation?
- Maintains quality and consistency
- Prevents duplicate subjects (Math vs Mathematics)
- Centralized control over subject taxonomy

## Performance Considerations

### Indexes
- `name` (unique): Prevents duplicates, fast lookup
- `isActive`: Efficient filtering
- Text index: Fast search

### Caching Strategy
Subjects rarely change → Good candidate for caching

```typescript
// Future enhancement: Redis cache
const cachedSubjects = await redis.get('subjects:active');
if (cachedSubjects) {
  return JSON.parse(cachedSubjects);
}

const subjects = await Subject.find({ isActive: true });
await redis.setex('subjects:active', 3600, JSON.stringify(subjects));
```

## Testing

### Unit Tests (Planned - Phase 9)

```typescript
describe('Subject Service', () => {
  it('should create subject with valid data');
  it('should prevent duplicate subject names');
  it('should search subjects by name');
  it('should filter active subjects');
  it('should soft delete subject (isActive: false)');
});
```

### Integration Tests (Planned - Phase 9)

```typescript
describe('Subject API', () => {
  it('POST /subjects - should create subject (admin only)');
  it('GET /subjects - should list subjects (public)');
  it('GET /subjects?searchTerm=math - should search subjects');
  it('PATCH /subjects/:id - should update subject (admin only)');
  it('DELETE /subjects/:id - should delete subject (admin only)');
  it('POST /subjects - should fail for non-admin');
});
```

## Initial Subject Seed Data

```typescript
const initialSubjects = [
  { name: 'Mathematics', description: 'Algebra, Geometry, Calculus, Statistics', isActive: true },
  { name: 'Physics', description: 'Mechanics, Thermodynamics, Electromagnetism, Optics', isActive: true },
  { name: 'Chemistry', description: 'Organic, Inorganic, Physical Chemistry', isActive: true },
  { name: 'Biology', description: 'Cell Biology, Genetics, Ecology, Human Anatomy', isActive: true },
  { name: 'English', description: 'Grammar, Literature, Writing, Conversation', isActive: true },
  { name: 'German', description: 'Grammar, Literature, Conversation (Native/Foreign)', isActive: true },
  { name: 'Computer Science', description: 'Programming, Algorithms, Data Structures', isActive: true },
  { name: 'Economics', description: 'Microeconomics, Macroeconomics, Business Studies', isActive: true },
  { name: 'History', description: 'World History, European History, German History', isActive: true },
  { name: 'Geography', description: 'Physical Geography, Human Geography, GIS', isActive: true },
];
```

## Next Steps

Subject module is used by:
- ✅ Tutor Application (subjects field)
- 🔄 Interview Slots (optional: filter tutors by subject)
- 🔄 Trial Requests (subject selection)
- 🔄 Session Booking (subject display)
- 🔄 Admin Dashboard (subject analytics)