# Phase 1: Core User System

## Overview

Updated the User model to support tutoring marketplace roles and profile fields.

## Status: ✅ COMPLETED

## Files Modified

- `src/enums/user.ts` - Updated USER_ROLES enum
- `src/app/modules/user/user.model.ts` - Added profile fields
- `src/app/modules/user/user.interface.ts` - Added TypeScript types

## User Roles

### New Roles

```typescript
export enum USER_ROLES {
  STUDENT = 'STUDENT',       // Users who book and learn from tutors
  TUTOR = 'TUTOR',           // Approved instructors who teach students
  APPLICANT = 'APPLICANT',   // Users in tutor application process
  SUPER_ADMIN = 'SUPER_ADMIN' // Platform administrator
}
```

### Role Transitions

```
New User (default: STUDENT)
    ↓
    Apply to become tutor
    ↓
APPLICANT (during application process)
    ↓
    Admin approves application
    ↓
TUTOR (can teach students)
```

## Tutor Profile Fields

```typescript
tutorProfile: {
  subjects: string[];              // Teaching subjects (e.g., ['Math', 'Physics'])
  isVerified: boolean;             // Admin verification status
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  onboardingPhase: 1 | 2 | 3;     // Application progress (Phase 1/2/3)
  address?: string;                // Location
  birthDate?: Date;                // Date of birth
  cvUrl?: string;                  // Cloudinary/S3 URL for CV
  abiturCertificateUrl?: string;   // MANDATORY for German tutors
  educationProofUrls?: string[];   // Additional certificates
}
```

### Field Explanations

**subjects**: Array of teaching subjects (populated from Subject collection)

**isVerified**: `true` when admin approves tutor application

**verificationStatus**:
- `PENDING`: Application not yet reviewed
- `APPROVED`: Tutor verified and can teach
- `REJECTED`: Application rejected

**onboardingPhase**:
- `1`: Application submitted
- `2`: Documents reviewed, interview phase
- `3`: Approved as tutor

**abiturCertificateUrl**: German high school diploma proof (required for platform credibility)

## Student Profile Fields

```typescript
studentProfile: {
  subscriptionTier: 'FLEXIBLE' | 'REGULAR' | 'LONG_TERM' | null;
  trialRequestsCount: number;      // Track trial usage (prevent abuse)
}
```

### Subscription Tiers

| Tier | Price/hr | Commitment | Min Hours |
|------|----------|------------|-----------|
| FLEXIBLE | €30 | None | None |
| REGULAR | €28 | 1 month | 4 hours |
| LONG_TERM | €25 | 3 months | 4 hours |

**trialRequestsCount**: Incremented each time student sends trial request (limit to prevent spam)

## Why These Changes?

### Automatic Role Transitions
- Users can apply to become tutors
- System automatically changes role during application process
- Clear separation between applicants and approved tutors

### Abitur Certificate Requirement
- Validates German education credentials
- Legal compliance for tutoring services in Germany
- Platform credibility and quality assurance

### Subscription Tier in Profile
- Determines pricing for each session
- Enables month-end billing based on tier
- Easy access to student's current plan

### Trial Request Tracking
- Prevents abuse of free trial system
- Can implement limits (e.g., max 3 trials per student)
- Analytics on trial-to-conversion rates

## Database Schema

```typescript
{
  _id: ObjectId;
  name: string;
  email: string;
  password: string;  // bcrypt hashed
  role: USER_ROLES;
  profilePicture?: string;

  tutorProfile?: {
    subjects: string[];
    isVerified: boolean;
    verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
    onboardingPhase: 1 | 2 | 3;
    address?: string;
    birthDate?: Date;
    cvUrl?: string;
    abiturCertificateUrl?: string;
    educationProofUrls?: string[];
  };

  studentProfile?: {
    subscriptionTier: 'FLEXIBLE' | 'REGULAR' | 'LONG_TERM' | null;
    trialRequestsCount: number;
  };

  createdAt: Date;
  updatedAt: Date;
}
```

## Usage Examples

### Get Current User Profile

```typescript
const user = await User.findById(userId);
console.log(user.role); // 'STUDENT', 'TUTOR', 'APPLICANT', 'SUPER_ADMIN'

// Check if tutor
if (user.role === USER_ROLES.TUTOR) {
  console.log('Teaching subjects:', user.tutorProfile?.subjects);
  console.log('Verified:', user.tutorProfile?.isVerified);
}

// Check if student
if (user.role === USER_ROLES.STUDENT) {
  console.log('Subscription:', user.studentProfile?.subscriptionTier);
  console.log('Trial requests:', user.studentProfile?.trialRequestsCount);
}
```

### Update User During Application Submission

```typescript
// When user submits tutor application
await User.findByIdAndUpdate(userId, {
  role: USER_ROLES.APPLICANT,
  'tutorProfile.subjects': ['Math', 'Physics'],
  'tutorProfile.verificationStatus': 'PENDING',
  'tutorProfile.onboardingPhase': 1,
  'tutorProfile.cvUrl': 'https://cloudinary.com/cv.pdf',
  'tutorProfile.abiturCertificateUrl': 'https://cloudinary.com/abitur.pdf'
});
```

### Update User After Application Approval

```typescript
// When admin approves tutor application
await User.findByIdAndUpdate(userId, {
  role: USER_ROLES.TUTOR,
  'tutorProfile.isVerified': true,
  'tutorProfile.verificationStatus': 'APPROVED',
  'tutorProfile.onboardingPhase': 3
});
```

## Migration Guide

If updating an existing system:

```typescript
// Migration script to add new fields to existing users
await User.updateMany(
  {},
  {
    $set: {
      'studentProfile.subscriptionTier': null,
      'studentProfile.trialRequestsCount': 0,
      'tutorProfile.isVerified': false,
      'tutorProfile.verificationStatus': 'PENDING',
      'tutorProfile.onboardingPhase': 1
    }
  }
);
```

## Security Considerations

- Tutor profile fields only accessible to tutors/applicants
- Student profile fields only accessible to students
- Admin can view all profile types
- Role changes logged for audit trail

## Next Steps

This user system supports:
- Subject module (completed)
- Tutor application flow (completed)
- Interview scheduling (in progress)
- Trial request matching (pending)
- Session booking (pending)
- Subscription management (pending)