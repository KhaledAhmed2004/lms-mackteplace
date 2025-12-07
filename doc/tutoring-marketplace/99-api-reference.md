# API Reference - Quick Guide

## Base URL
```
http://localhost:5000/api/v1
```

## Authentication
All protected endpoints require JWT token:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

## Response Format

### Success Response
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation successful",
  "data": { ... },
  "meta": { ... }  // Optional (pagination)
}
```

### Error Response
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Error message",
  "errorMessages": [
    {
      "path": "field",
      "message": "Validation error"
    }
  ]
}
```

## Subjects API

### Create Subject (Admin)
```http
POST /subjects
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json

{
  "name": "Mathematics",
  "description": "Algebra, Geometry, Calculus",
  "isActive": true
}
```

### List Subjects (Public)
```http
GET /subjects?isActive=true&page=1&limit=10&searchTerm=math
```

### Get Single Subject (Public)
```http
GET /subjects/:id
```

### Update Subject (Admin)
```http
PATCH /subjects/:id
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json

{
  "description": "Updated description",
  "isActive": false
}
```

### Delete Subject (Admin)
```http
DELETE /subjects/:id
Authorization: Bearer ADMIN_TOKEN
```

## Tutor Applications API

### Submit Application (Applicant)
```http
POST /applications
Authorization: Bearer USER_TOKEN
Content-Type: application/json

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

### Get My Application (Applicant)
```http
GET /applications/my-application
Authorization: Bearer APPLICANT_TOKEN
```

### List All Applications (Admin)
```http
GET /applications?status=SUBMITTED&phase=1&page=1&limit=10&searchTerm=john
Authorization: Bearer ADMIN_TOKEN
```

### Get Single Application (Admin)
```http
GET /applications/:id
Authorization: Bearer ADMIN_TOKEN
```

### Approve to Phase 2 (Admin)
```http
PATCH /applications/:id/approve-phase2
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json

{
  "adminNotes": "Documents verified. Approved for interview."
}
```

### Reject Application (Admin)
```http
PATCH /applications/:id/reject
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json

{
  "rejectionReason": "Abitur certificate not valid."
}
```

### Mark as Tutor (Admin - Final Approval)
```http
PATCH /applications/:id/mark-as-tutor
Authorization: Bearer ADMIN_TOKEN
```

### Update Application Status (Admin)
```http
PATCH /applications/:id
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json

{
  "status": "INTERVIEW_SCHEDULED",
  "adminNotes": "Interview scheduled for tomorrow"
}
```

### Delete Application (Admin)
```http
DELETE /applications/:id
Authorization: Bearer ADMIN_TOKEN
```

## Query Parameters

### Pagination
```
?page=1&limit=10
```

### Search
```
?searchTerm=keyword
```

### Filter
```
?status=SUBMITTED&phase=1&isActive=true
```

### Sort
```
?sort=-createdAt      // Descending
?sort=name            // Ascending
```

### Field Selection
```
?fields=name,email,phone
```

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 500 | Internal Server Error |

## Common Error Scenarios

### 401 Unauthorized
```json
{
  "success": false,
  "statusCode": 401,
  "message": "You are not authorized"
}
```

### 400 Validation Error
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation Error",
  "errorMessages": [
    {
      "path": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### 404 Not Found
```json
{
  "success": false,
  "statusCode": 404,
  "message": "Application not found"
}
```

## Swagger Documentation

Interactive API documentation available at:
```
http://localhost:5000/api/v1/docs
```
