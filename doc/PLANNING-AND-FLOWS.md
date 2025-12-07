# Planning and Flows Documentation

> Central documentation for all user flows, planning, and system designs.

---

## Quick Navigation

| # | Flow | Status | Description |
|---|------|--------|-------------|
| 1 | [Student Free Trial](#1-student-free-trial-flow) | Planned | Registration + Trial Request |
| 2 | [Tutor Application](#2-tutor-application-flow) | Planned | Registration + Application |
| 3 | [Interview Scheduling](#3-interview-scheduling-flow) | Planned | Slot booking + Interview |
| 4 | [Session Booking](#4-session-booking-flow) | Coming Soon | In-chat session booking |
| 5 | [Payment Flow](#5-payment-flow) | Coming Soon | Billing + Stripe |
| 6 | [Admin Dashboard](#6-admin-dashboard-pages) | Planned | 8 Pages: Overview, Students, Tutors, Sessions, Applications, Transactions, Meetings, Settings |
| 7 | [Student Dashboard](#7-student-dashboard-pages) | Planned | Sessions, Subscription Usage, Feedback/Rating |

---

# 1. Student Free Trial Flow

> **Button:** "Free Trial" | **Purpose:** Student registration with trial request

## 1.1 Quick Summary

| Scenario | User Type | What Happens |
|----------|-----------|--------------|
| **A** | New User (Not logged in) | Registration + Trial Request |
| **B** | Existing User (Logged in) | Trial Request only |

## 1.2 Entry Point Diagram

```
                    "Free Trial" Click
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
        ┌──────────┐              ┌──────────┐
        │ NOT      │              │ LOGGED   │
        │ LOGGED IN│              │ IN       │
        └────┬─────┘              └────┬─────┘
             │                         │
             ▼                         ▼
      ┌─────────────┐           ┌─────────────┐
      │  FLOW A     │           │  FLOW B     │
      │  Full Form  │           │  Short Form │
      │  3 Steps    │           │  1 Step     │
      └─────────────┘           └─────────────┘
```

---

## 1.3 FLOW A: New User Registration

### Form Steps

| Step | Name | Fields |
|------|------|--------|
| 1 | Trial Info | Subject*, Grade*, School Type*, Learning Goals, Documents |
| 2 | Personal Info | Name*, Email*, Password*, Date of Birth* |
| 3 | Guardian Info | Guardian Name*, Phone*, Email* *(only if age < 18)* |

### API Endpoint

```
POST /api/v1/auth/register-with-trial
```

**Request:**
```json
{
  "subject": "Mathematics",
  "grade": "10",
  "schoolType": "Gymnasium",
  "learningGoals": "Need help with algebra",
  "documents": ["url1", "url2"],
  "name": "Max Mustermann",
  "email": "max@example.com",
  "password": "SecurePass123!",
  "dateOfBirth": "2008-05-15",
  "guardianInfo": {
    "name": "Hans Mustermann",
    "phone": "+49123456789",
    "email": "hans@example.com"
  }
}
```

### What Gets Created

| # | Entity | Details |
|---|--------|---------|
| 1 | User | role: STUDENT, verified: false |
| 2 | studentProfile | grade, schoolType, guardianInfo |
| 3 | Trial Request | subject, learningGoals, documents, status: PENDING |
| 4 | Email OTP | Sent for verification |

---

## 1.4 FLOW B: Existing User

### Form Fields

| Field | Required |
|-------|----------|
| Subject | Yes |
| Learning Goals | No |
| Documents | No |

### API Endpoint

```
POST /api/v1/trial-requests
```

### Pre-check

```
hasUsedFreeTrial === true ? → Error: "Already used" : → Show form
```

---

## 1.5 Business Rules

| Rule | Description |
|------|-------------|
| Trial Limit | 1 free trial per user |
| Minor Check | Age < 18 requires guardian info |
| Expiry | Trial requests expire in 24 hours |
| Verification | Email OTP required after registration |

---

## 1.6 Data Models

**User.studentProfile:**
```typescript
{
  grade: string;              // "1" to "13"
  schoolType: string;         // Gymnasium, Realschule, etc.
  hasUsedFreeTrial: boolean;
  subjects?: string[];
  currentPlan?: 'FLEXIBLE' | 'REGULAR' | 'LONG_TERM';
}
```

**User.guardianInfo:**
```typescript
{
  name: string;
  phone: string;
  email: string;
  relationship?: string;      // Father, Mother, Legal Guardian
}
```

---

# 2. Tutor Application Flow

> **Button:** "Become a Tutor" | **Purpose:** Tutor registration with application

## 2.1 Quick Summary

| Scenario | User Type | What Happens |
|----------|-----------|--------------|
| **A** | New User (Not logged in) | Registration + Application |
| **B** | Existing User (Logged in) | Application only |

## 2.2 Entry Point Diagram

```
                "Become a Tutor" Click
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
        ┌──────────┐              ┌──────────┐
        │ NOT      │              │ LOGGED   │
        │ LOGGED IN│              │ IN       │
        └────┬─────┘              └────┬─────┘
             │                         │
             ▼                         ▼
      ┌─────────────┐           ┌─────────────┐
      │  FLOW A     │           │  FLOW B     │
      │  Full Form  │           │  Short Form │
      │  3 Steps    │           │             │
      └─────────────┘           └─────────────┘
```

---

## 2.3 FLOW A: New User Registration

### Form Steps

| Step | Name | Fields |
|------|------|--------|
| 1 | Teaching Info | Subjects* (multi), CV*, Abitur Certificate*, Official ID* |
| 2 | Personal Info | Name*, Date of Birth*, Email*, Password*, Phone* |
| 3 | Address Info | Street*, House Number*, ZIP Code*, City* |

### API Endpoint

```
POST /api/v1/auth/register-as-tutor
```

**Request:**
```json
{
  "subjects": ["Mathematics", "Physics"],
  "cvUrl": "https://...",
  "abiturCertificateUrl": "https://...",
  "officialIdUrl": "https://...",
  "name": "Max Mustermann",
  "dateOfBirth": "1995-05-15",
  "email": "max@example.com",
  "password": "SecurePass123!",
  "phone": "+49123456789",
  "address": {
    "street": "Hauptstraße",
    "houseNumber": "42",
    "zipCode": "10115",
    "city": "Berlin"
  }
}
```

### What Gets Created

| # | Entity | Details |
|---|--------|---------|
| 1 | User | role: APPLICANT, verified: false |
| 2 | tutorProfile | subjects |
| 3 | TutorApplication | status: SUBMITTED, phase: 1 |
| 4 | Email OTP | Sent for verification |

---

## 2.4 FLOW B: Existing User

### API Endpoint

```
POST /api/v1/applications
```

### Form Fields

| Field | Required |
|-------|----------|
| Subjects | Yes (multi) |
| CV | Yes |
| Abitur Certificate | Yes |
| Official ID | Yes |
| Address | Yes (object) |

---

## 2.5 3-Phase Approval Workflow

```
┌──────────────┐      ┌──────────────────────┐      ┌──────────────┐
│   PHASE 1    │      │       PHASE 2        │      │   PHASE 3    │
│  SUBMITTED   │ ───▶ │  DOCUMENTS_REVIEWED  │ ───▶ │   APPROVED   │
│              │      │  INTERVIEW_SCHEDULED │      │              │
│              │      │    INTERVIEW_DONE    │      │  Role: TUTOR │
└──────────────┘      └──────────────────────┘      └──────────────┘
       │                        │
       │    ┌───────────────────┘
       ▼    ▼
   ┌──────────┐
   │ REJECTED │  (Can happen at any phase)
   └──────────┘
```

---

## 2.6 Business Rules

| Rule | Description |
|------|-------------|
| Documents | CV + Abitur + Official ID required |
| Role Change | STUDENT/USER → APPLICANT on submit |
| Final Approval | APPLICANT → TUTOR on admin approval |
| One Application | User can only have one active application |

---

## 2.7 Data Models

**TutorApplication.address:**
```typescript
{
  street: string;
  houseNumber: string;
  zipCode: string;
  city: string;
}
```

**New Field:**
```typescript
officialIdUrl: string;  // ID document upload
```

---

# 3. Interview Scheduling Flow

> **Purpose:** Admin creates slots → Applicant books interview

## 3.1 Quick Summary

| Step | Who | Action |
|------|-----|--------|
| 1 | Admin | Reviews application → Approves for interview |
| 2 | Admin | Creates available time slots |
| 3 | Applicant | Books an available slot |
| 4 | Both | Interview happens |
| 5 | Admin | Marks complete → Final approval |

## 3.2 Complete Flow

```
┌────────────────────────────────────────────────────────────┐
│ STEP 1: Application Submitted                              │
│ Status: SUBMITTED                                          │
└─────────────────────────────┬──────────────────────────────┘
                              ▼
┌────────────────────────────────────────────────────────────┐
│ STEP 2: Admin Reviews                                      │
│ ├─ [Approve] → Status: DOCUMENTS_REVIEWED                 │
│ └─ [Reject] → Email sent, END                             │
└─────────────────────────────┬──────────────────────────────┘
                              ▼
┌────────────────────────────────────────────────────────────┐
│ STEP 3: Admin Creates Slots                                │
│ Multiple available time slots                              │
└─────────────────────────────┬──────────────────────────────┘
                              ▼
┌────────────────────────────────────────────────────────────┐
│ STEP 4: Applicant Receives Email                           │
│ "Please schedule your interview"                           │
└─────────────────────────────┬──────────────────────────────┘
                              ▼
┌────────────────────────────────────────────────────────────┐
│ STEP 5: Applicant Books Slot                               │
│ Status: INTERVIEW_SCHEDULED                                │
│ Google Meet link generated                                 │
└─────────────────────────────┬──────────────────────────────┘
                              ▼
┌────────────────────────────────────────────────────────────┐
│ STEP 6: Dashboard View                                     │
│ Shows: Date, Time, Google Meet Link                        │
│ Actions: [Reschedule] | [Cancel]                          │
└─────────────────────────────┬──────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
   ┌───────────┐       ┌───────────┐       ┌───────────┐
   │ Interview │       │ Reschedule│       │  Cancel   │
   │ Happens   │       │ New Slot  │       │ Reverts   │
   └─────┬─────┘       └───────────┘       └───────────┘
         ▼
┌────────────────────────────────────────────────────────────┐
│ STEP 7: Admin Marks Complete                               │
│ Status: INTERVIEW_DONE                                     │
└─────────────────────────────┬──────────────────────────────┘
                              ▼
┌────────────────────────────────────────────────────────────┐
│ STEP 8: Final Approval                                     │
│ ├─ [Approve] → Role: TUTOR, Stripe Connect                │
│ └─ [Reject] → Email sent, END                             │
└────────────────────────────────────────────────────────────┘
```

---

## 3.3 Reschedule & Cancel Rules

### Reschedule

| Rule | Value |
|------|-------|
| Who | Applicant only |
| When | > 1 hour before interview |
| Process | Old slot → AVAILABLE, New slot → BOOKED |

### Cancel

| Rule | Value |
|------|-------|
| Who | Applicant or Admin |
| When | Anytime |
| Requirement | Reason (10+ chars) |
| Effect | Status → DOCUMENTS_REVIEWED |

---

## 3.4 API Endpoints

### Existing

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/interview-slots` | Admin creates slot |
| GET | `/interview-slots` | List slots |
| PATCH | `/interview-slots/:id/book` | Book slot |
| PATCH | `/interview-slots/:id/cancel` | Cancel |
| PATCH | `/interview-slots/:id/complete` | Mark complete |
| DELETE | `/interview-slots/:id` | Delete slot |

### New

```
PATCH /api/v1/interview-slots/:id/reschedule
```
**Access:** APPLICANT only

**Request:**
```json
{
  "newSlotId": "ObjectId"
}
```

---

## 3.5 Email Templates

| Template | Trigger | To |
|----------|---------|-----|
| `docs-approved` | Admin approves docs | Applicant |
| `interview-booked` | Slot booked | Both |
| `interview-rescheduled` | Rescheduled | Both |
| `interview-cancelled` | Cancelled | Both |
| `tutor-approved` | Final approval | Tutor |
| `tutor-rejected` | Rejected | Applicant |

---

## 3.6 Stripe Connect (After Approval)

```
┌────────────────────────────────────────────────────────────┐
│ Tutor Dashboard                                            │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  ⚠ Connect Your Stripe Account                       │ │
│  │                                                      │ │
│  │  Required to receive payments                        │ │
│  │                                                      │ │
│  │  [Connect with Stripe]                               │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
                              │
                              ▼
         tutorProfile.stripeConnectAccountId: "acct_xxx"
         tutorProfile.stripeConnectStatus: "active"
```

---

# 4. Session Booking Flow

*Coming Soon*

---

# 5. Payment Flow

*Coming Soon*

---

# 6. Admin Dashboard Pages

> **Purpose:** Admin manages platform - 8 comprehensive pages for complete platform management

## 6.1 Quick Summary

| Page | Purpose | Key Features |
|------|---------|--------------|
| Overview | Dashboard home | Stats, Charts, Recent Activity |
| Students | Student management | List, View, Block/Unblock |
| Tutors | Tutor management | List, View, Block/Unblock |
| Sessions | Session management | List, View, Filter by status |
| Applications | Application management | List, View, Accept/Decline, Schedule |
| Transactions | Payment history | List, View, Filter, Export |
| Meetings | Interview meetings | List, View, Join, Mark Complete |
| Settings | Admin settings | Terms, Notifications, Profile |

---

## 6.2 Overview Page

### Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Admin Dashboard                                          [Export CSV]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │ Total       │ │ Total       │ │ Total       │ │ Total       │       │
│  │ Students    │ │ Tutors      │ │ Reviews     │ │ Revenue     │       │
│  │    1,250    │ │    85       │ │    3,420    │ │  €45,200    │       │
│  │ ↑ 12% ▲     │ │ ↑ 5% ▲      │ │ ↑ 8% ▲      │ │ ↑ 15% ▲     │       │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       │
│                                                                         │
│  ┌────────────────────────────────┐  ┌────────────────────────────────┐│
│  │  User Distribution             │  │  Recent Activity               ││
│  │                                │  │                                ││
│  │       [PIE CHART]              │  │  • Max M. registered (2m ago) ││
│  │                                │  │  • Anna K. booked session     ││
│  │   🟢 Students: 1,250 (85%)     │  │  • Tom B. completed session   ││
│  │   🔵 Tutors: 85 (6%)           │  │  • Lisa S. left review        ││
│  │   🟡 Applicants: 120 (8%)      │  │  • ...                        ││
│  │   🔴 Admins: 5 (1%)            │  │                                ││
│  │                                │  │  [View All Activity]          ││
│  └────────────────────────────────┘  └────────────────────────────────┘│
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  User Growth (Last 6 Months)                                      │  │
│  │                                                                   │  │
│  │  250 ┤                                              ╭────        │  │
│  │  200 ┤                                    ╭─────────╯            │  │
│  │  150 ┤                          ╭─────────╯                      │  │
│  │  100 ┤              ╭───────────╯                                │  │
│  │   50 ┤  ────────────╯                                            │  │
│  │    0 ┼──────┬──────┬──────┬──────┬──────┬──────                  │  │
│  │       Jun   Jul   Aug   Sep   Oct   Nov                          │  │
│  │                                                                   │  │
│  │  ── Students  ── Tutors  ── Total                                │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Stats Cards Data

| Card | Data Source | Calculation |
|------|-------------|-------------|
| Total Students | `users.role = STUDENT` | Count |
| Total Tutors | `users.role = TUTOR` | Count |
| Total Reviews | `sessionReviews` | Count |
| Total Revenue | `monthlyBillings.amount` | Sum (all time) |
| % Change | Compare with last month | `(current - prev) / prev * 100` |

### API Endpoint

```
GET /api/v1/admin/dashboard
```

**Response:**
```json
{
  "userStats": {
    "totalUsers": 1460,
    "totalStudents": 1250,
    "totalTutors": 85,
    "totalApplicants": 120,
    "newUsersThisMonth": 45
  },
  "reviewStats": {
    "totalReviews": 3420,
    "averageRating": 4.6
  },
  "revenueStats": {
    "allTimeRevenue": 45200,
    "thisMonthRevenue": 5600,
    "platformCommission": 9040
  },
  "userDistribution": {
    "students": 1250,
    "tutors": 85,
    "applicants": 120,
    "admins": 5
  },
  "recentActivity": [
    { "type": "registration", "user": "Max M.", "time": "2m ago" },
    { "type": "session_booked", "user": "Anna K.", "time": "15m ago" }
  ]
}
```

---

## 6.3 Students Page

### Students List Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Students                                    Total: 1,250   [Export]    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ 🔍 Search by name or email...          [Filter ▼] [Status ▼]     │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ Name          │ Email            │ Plan     │ Status │ Actions   │ │
│  ├───────────────┼──────────────────┼──────────┼────────┼───────────┤ │
│  │ Max Müller    │ max@email.com    │ Regular  │ 🟢 Active│[View][Block]│
│  │ Anna Klein    │ anna@email.com   │ Flexible │ 🟢 Active│[View][Block]│
│  │ Tom Braun     │ tom@email.com    │ Long-term│ 🔴 Blocked│[View][Unblock]│
│  │ Lisa Schmidt  │ lisa@email.com   │ -        │ 🟢 Active│[View][Block]│
│  │ ...           │ ...              │ ...      │ ...    │ ...       │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  Showing 1-20 of 1,250                    [← Prev] [1] [2] [3] [Next →]│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Student Detail View (Modal/Page)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Student Details                                              [✕ Close]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────┐  Max Müller                                              │
│  │  Avatar  │  max@email.com                                           │
│  │          │  Status: 🟢 Active                                       │
│  └──────────┘  Joined: 15 Oct 2024                                     │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  📊 Statistics                                                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │ Total Hours │ │ Total Spent │ │ Sessions    │ │ Reviews     │       │
│  │    24 hrs   │ │   €720      │ │    12       │ │    8        │       │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       │
│                                                                         │
│  📋 Profile Info                                                        │
│  ├─ Grade: 10                                                          │
│  ├─ School Type: Gymnasium                                             │
│  ├─ Current Plan: Regular (€28/hr)                                     │
│  ├─ Subscription Status: Active                                        │
│  └─ Guardian: Hans Müller (+49123456789)                               │
│                                                                         │
│  📅 Recent Sessions                                                     │
│  ├─ Math with Tutor A - 20 Nov 2024 - Completed                        │
│  ├─ Physics with Tutor B - 18 Nov 2024 - Completed                     │
│  └─ [View All Sessions]                                                │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│                                            [Block Student] [Close]      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Filter Options

| Filter | Options |
|--------|---------|
| Status | All, Active, Blocked |
| Plan | All, Flexible, Regular, Long-term, No Plan |
| Sort By | Name, Joined Date, Total Spent, Total Sessions |

### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/admin/students` | List students with filters |
| GET | `/api/v1/users/:id` | Get student details |
| PATCH | `/api/v1/users/:id/block` | Block student |
| PATCH | `/api/v1/users/:id/unblock` | Unblock student |

### NEW: List Students Endpoint

```
GET /api/v1/admin/students
```

**Query Parameters:**
```
?search=max          # Search name/email
&status=active       # Filter: active, blocked
&plan=regular        # Filter: flexible, regular, long-term
&sortBy=totalSpent   # Sort: name, joinedDate, totalSpent, totalSessions
&sortOrder=desc      # asc or desc
&page=1
&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "name": "Max Müller",
      "email": "max@email.com",
      "profilePicture": "https://...",
      "status": "ACTIVE",
      "createdAt": "2024-10-15T...",
      "studentProfile": {
        "grade": "10",
        "schoolType": "Gymnasium",
        "currentPlan": "REGULAR",
        "totalHoursTaken": 24,
        "totalSpent": 720,
        "hasUsedFreeTrial": true
      },
      "guardianInfo": {
        "name": "Hans Müller",
        "phone": "+49123456789"
      },
      "stats": {
        "totalSessions": 12,
        "reviewsGiven": 8
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1250,
    "totalPages": 63
  }
}
```

---

## 6.4 Tutors Page

### Tutors List Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Tutors                                       Total: 85     [Export]    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ 🔍 Search by name or email...    [Subject ▼] [Status ▼] [Rating ▼]│ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ Name          │ Subjects      │ Rating │ Status │ Actions        │ │
│  ├───────────────┼───────────────┼────────┼────────┼────────────────┤ │
│  │ Dr. Sarah W.  │ Math, Physics │ ⭐ 4.8 │ 🟢 Active│[View][Block]  │ │
│  │ Prof. Hans K. │ Chemistry     │ ⭐ 4.5 │ 🟢 Active│[View][Block]  │ │
│  │ Maria L.      │ English       │ ⭐ 4.9 │ 🔴 Blocked│[View][Unblock]│ │
│  │ Thomas B.     │ Biology       │ ⭐ 4.2 │ 🟢 Active│[View][Block]  │ │
│  │ ...           │ ...           │ ...    │ ...    │ ...            │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  Showing 1-20 of 85                       [← Prev] [1] [2] [3] [Next →]│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Tutor Detail View (Modal/Page)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Tutor Details                                                [✕ Close]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────┐  Dr. Sarah Weber           ⭐ 4.8 (156 reviews)          │
│  │  Avatar  │  sarah@email.com                                         │
│  │          │  Status: 🟢 Active  │  Stripe: ✅ Connected              │
│  └──────────┘  Joined: 10 Aug 2024                                     │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  📊 Statistics                                                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │ Total Hours │ │ Earnings    │ │ Sessions    │ │ Avg Rating  │       │
│  │   320 hrs   │ │  €8,960     │ │    156      │ │   ⭐ 4.8    │       │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       │
│                                                                         │
│  📋 Profile Info                                                        │
│  ├─ Subjects: Mathematics, Physics                                     │
│  ├─ Languages: German (Native), English (Fluent)                       │
│  ├─ Experience: 5 years                                                │
│  ├─ Hourly Rate: €28 (Platform rate)                                   │
│  └─ Verification: ✅ Verified                                          │
│                                                                         │
│  📄 Documents                                                           │
│  ├─ CV: [View PDF]                                                     │
│  ├─ Abitur Certificate: [View PDF]                                     │
│  └─ Official ID: [View PDF]                                            │
│                                                                         │
│  ⭐ Rating Breakdown                                                    │
│  ├─ ⭐⭐⭐⭐⭐ 5 stars: ████████████ 120 (77%)                          │
│  ├─ ⭐⭐⭐⭐  4 stars: ████ 28 (18%)                                    │
│  ├─ ⭐⭐⭐   3 stars: █ 5 (3%)                                          │
│  ├─ ⭐⭐    2 stars: ▏ 2 (1%)                                          │
│  └─ ⭐     1 star:  ▏ 1 (1%)                                           │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│                                             [Block Tutor] [Close]       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Filter Options

| Filter | Options |
|--------|---------|
| Status | All, Active, Blocked |
| Subject | All, Mathematics, Physics, Chemistry, etc. |
| Rating | All, 4+ stars, 4.5+ stars |
| Stripe | All, Connected, Not Connected |
| Sort By | Name, Rating, Total Sessions, Earnings |

### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/admin/tutors` | List tutors with filters |
| GET | `/api/v1/users/:id` | Get tutor details |
| GET | `/api/v1/session-reviews/tutor/:id/stats` | Get tutor review stats |
| PATCH | `/api/v1/users/:id/block` | Block tutor |
| PATCH | `/api/v1/users/:id/unblock` | Unblock tutor |

### NEW: List Tutors Endpoint

```
GET /api/v1/admin/tutors
```

**Query Parameters:**
```
?search=sarah        # Search name/email
&status=active       # Filter: active, blocked
&subject=math        # Filter by subject
&minRating=4         # Minimum rating
&stripeStatus=connected  # Filter: connected, not_connected
&sortBy=rating       # Sort: name, rating, totalSessions, earnings
&sortOrder=desc
&page=1
&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "name": "Dr. Sarah Weber",
      "email": "sarah@email.com",
      "profilePicture": "https://...",
      "status": "ACTIVE",
      "createdAt": "2024-08-10T...",
      "averageRating": 4.8,
      "ratingsCount": 156,
      "tutorProfile": {
        "subjects": ["Mathematics", "Physics"],
        "languages": ["German", "English"],
        "teachingExperience": 5,
        "isVerified": true,
        "stripeConnectStatus": "active",
        "cvUrl": "https://...",
        "abiturCertificateUrl": "https://...",
        "officialIdUrl": "https://..."
      },
      "stats": {
        "totalSessions": 156,
        "totalHours": 320,
        "totalEarnings": 8960
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 85,
    "totalPages": 5
  }
}
```

---

## 6.5 Block/Unblock Logic

### Block Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Admin clicks [Block]                                                   │
└──────────────────────────┬──────────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Confirmation Modal                                                     │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  ⚠️ Block User                                                    │ │
│  │                                                                   │ │
│  │  Are you sure you want to block Max Müller?                       │ │
│  │                                                                   │ │
│  │  Reason (required):                                               │ │
│  │  ┌─────────────────────────────────────────────────────────────┐ │ │
│  │  │ Policy violation...                                         │ │ │
│  │  └─────────────────────────────────────────────────────────────┘ │ │
│  │                                                                   │ │
│  │  This will:                                                       │ │
│  │  • Prevent user from logging in                                   │ │
│  │  • Cancel all upcoming sessions                                   │ │
│  │  • Hide profile from search (for tutors)                          │ │
│  │                                                                   │ │
│  │                                    [Cancel] [Block User]          │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  API Call: PATCH /api/v1/users/:id/block                                │
│  Body: { "reason": "Policy violation..." }                              │
│                                                                         │
│  Updates:                                                               │
│  ├─ user.status: ACTIVE → RESTRICTED                                   │
│  ├─ user.blockReason: "Policy violation..."                            │
│  ├─ user.blockedAt: Date                                               │
│  └─ Send notification email to user                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

### What Blocked Users Cannot Do

| User Type | Restrictions |
|-----------|--------------|
| **Student** | Cannot login, book sessions, make payments |
| **Tutor** | Cannot login, accept requests, conduct sessions |

### Unblock Flow

```
PATCH /api/v1/users/:id/unblock

Updates:
├─ user.status: RESTRICTED → ACTIVE
├─ user.blockReason: null
├─ user.unblockedAt: Date
└─ Send "Account Restored" email
```

---

## 6.6 Sessions Page

### Sessions List Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Sessions                                                    [Export]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │ Total       │ │ Pending     │ │ Completed   │ │ Cancelled   │       │
│  │ Sessions    │ │             │ │             │ │             │       │
│  │    456      │ │    12       │ │    420      │ │    24       │       │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ Tabs: [All] [Pending] [Scheduled] [Completed] [Cancelled]         │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ 🔍 Search...        [Date Range ▼] [Subject ▼] [Tutor ▼]          │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ Date       │ Time   │ Student     │ Tutor      │ Subject │Status │ │
│  ├────────────┼────────┼─────────────┼────────────┼─────────┼───────┤ │
│  │ 2024-11-28 │ 14:00  │ Max M.      │ Dr. Sarah  │ Math    │🟡 Pend│ │
│  │ 2024-11-27 │ 10:00  │ Anna K.     │ Prof. Hans │ Physics │🟢 Done│ │
│  │ 2024-11-26 │ 16:00  │ Tom B.      │ Maria L.   │ English │🟢 Done│ │
│  │ 2024-11-25 │ 11:00  │ Lisa S.     │ Thomas B.  │ Biology │🔴 Canc│ │
│  │ ...        │ ...    │ ...         │ ...        │ ...     │ ...   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  Actions: [View]                                                        │
│                                                                         │
│  Showing 1-20 of 456                      [← Prev] [1] [2] [3] [Next →]│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Session Detail View (Modal/Page)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Session Details                                              [✕ Close]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Session #12345                              Status: 🟢 Completed       │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  📅 Session Info                                                        │
│  ├─ Date: November 27, 2024                                            │
│  ├─ Time: 10:00 - 11:00 (1 hour)                                       │
│  ├─ Subject: Physics                                                   │
│  ├─ Google Meet: [View Link]                                           │
│  └─ Price: €28.00                                                      │
│                                                                         │
│  👤 Student                                                             │
│  ├─ Name: Anna Klein                                                   │
│  ├─ Email: anna@email.com                                              │
│  ├─ Plan: Regular                                                      │
│  └─ [View Profile]                                                     │
│                                                                         │
│  👨‍🏫 Tutor                                                              │
│  ├─ Name: Prof. Hans Klein                                             │
│  ├─ Email: hans@email.com                                              │
│  ├─ Rating: ⭐ 4.5                                                      │
│  └─ [View Profile]                                                     │
│                                                                         │
│  ⭐ Review (if completed)                                               │
│  ├─ Rating: ⭐⭐⭐⭐⭐ 5/5                                                │
│  ├─ Comment: "Great session, very helpful!"                            │
│  └─ Would Recommend: Yes                                               │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│                                                              [Close]    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Session Status Tabs

| Tab | Filter | Count |
|-----|--------|-------|
| All | All sessions | Total count |
| Pending | `status: PENDING` | Awaiting confirmation |
| Scheduled | `status: SCHEDULED` | Upcoming sessions |
| Completed | `status: COMPLETED` | Finished sessions |
| Cancelled | `status: CANCELLED` | Cancelled sessions |

### Filter Options

| Filter | Options |
|--------|---------|
| Date Range | Today, This Week, This Month, Custom |
| Subject | All, Mathematics, Physics, etc. |
| Tutor | Dropdown of all tutors |
| Student | Search by name |
| Status | Pending, Scheduled, Completed, Cancelled |

### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/admin/sessions` | List sessions with filters |
| GET | `/api/v1/sessions/:id` | Get session details |

### List Sessions Endpoint

```
GET /api/v1/admin/sessions
```

**Query Parameters:**
```
?status=completed     # Filter: pending, scheduled, completed, cancelled
&startDate=2024-11-01 # Date range start
&endDate=2024-11-30   # Date range end
&subject=math         # Filter by subject
&tutorId=xxx          # Filter by tutor
&studentId=xxx        # Filter by student
&search=anna          # Search student/tutor name
&sortBy=date          # Sort: date, duration, price
&sortOrder=desc
&page=1
&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "sessionNumber": "12345",
      "date": "2024-11-27",
      "startTime": "10:00",
      "endTime": "11:00",
      "duration": 60,
      "subject": "Physics",
      "status": "COMPLETED",
      "price": 28.00,
      "googleMeetLink": "https://meet.google.com/xxx",
      "student": {
        "_id": "...",
        "name": "Anna Klein",
        "email": "anna@email.com"
      },
      "tutor": {
        "_id": "...",
        "name": "Prof. Hans Klein",
        "email": "hans@email.com"
      },
      "review": {
        "rating": 5,
        "comment": "Great session!"
      }
    }
  ],
  "stats": {
    "total": 456,
    "pending": 12,
    "scheduled": 0,
    "completed": 420,
    "cancelled": 24
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 456,
    "totalPages": 23
  }
}
```

---

## 6.7 Applications Page

### Applications List Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Tutor Applications                                          [Export]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │ All         │ │ Pending     │ │ Accepted    │ │ Declined    │       │
│  │ Applications│ │             │ │             │ │             │       │
│  │    150      │ │    25       │ │    85       │ │    40       │       │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ Tabs: [All] [Submitted] [Docs Reviewed] [Interview] [Done]        │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ 🔍 Search by name/email...                      [Status ▼]        │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ Name        │ Email           │ Subjects    │ Status    │Actions │ │
│  ├─────────────┼─────────────────┼─────────────┼───────────┼────────┤ │
│  │ Max M.      │ max@email.com   │ Math, Phys  │🟡 Submitted│[View] │ │
│  │ Anna K.     │ anna@email.com  │ Chemistry   │🔵 Interview│[View] │ │
│  │ Tom B.      │ tom@email.com   │ English     │🟢 Approved │[View] │ │
│  │ Lisa S.     │ lisa@email.com  │ Biology     │🔴 Rejected │[View] │ │
│  │ ...         │ ...             │ ...         │ ...       │ ...    │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  Showing 1-20 of 150                      [← Prev] [1] [2] [3] [Next →]│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Application Detail View (Modal/Page)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Application Details                                          [✕ Close]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────┐  Max Mustermann                                          │
│  │  Avatar  │  max@email.com                                           │
│  │          │  Status: 🟡 SUBMITTED (Phase 1)                          │
│  └──────────┘  Applied: 20 Nov 2024                                    │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  📋 Personal Info                                                       │
│  ├─ Phone: +49 123 456 789                                             │
│  ├─ Date of Birth: 15 May 1995                                         │
│  └─ Address: Hauptstraße 42, 10115 Berlin                              │
│                                                                         │
│  📚 Teaching Info                                                       │
│  ├─ Subjects: Mathematics, Physics                                     │
│  ├─ Languages: German (Native), English (Fluent)                       │
│  └─ Experience: 3 years                                                │
│                                                                         │
│  📄 Documents                                                           │
│  ├─ CV: [📥 Download] [👁 View]                                         │
│  ├─ Abitur Certificate: [📥 Download] [👁 View]                         │
│  └─ Official ID: [📥 Download] [👁 View]                                │
│                                                                         │
│  📅 Interview (if scheduled)                                            │
│  ├─ Date: 25 Nov 2024                                                  │
│  ├─ Time: 14:00 - 14:30                                                │
│  ├─ Google Meet: [Join Link]                                           │
│  └─ Status: Scheduled                                                  │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  Actions (based on current status):                                     │
│                                                                         │
│  [If SUBMITTED:]                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  [✓ Accept for Interview]  [✗ Decline Application]             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  [If DOCUMENTS_REVIEWED:]                                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  [📅 Schedule Interview]                                        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  [If INTERVIEW_DONE:]                                                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  [✓ Approve as Tutor]  [✗ Reject Application]                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Accept for Interview Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Admin clicks [✓ Accept for Interview]                                  │
└──────────────────────────┬──────────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  API Call: PATCH /api/v1/applications/:id/approve-docs                  │
│                                                                         │
│  Updates:                                                               │
│  ├─ application.status: SUBMITTED → DOCUMENTS_REVIEWED                 │
│  ├─ application.phase: 1 → 2                                           │
│  └─ Send email to applicant: "Please schedule your interview"          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Decline Application Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Admin clicks [✗ Decline Application]                                   │
└──────────────────────────┬──────────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Decline Modal                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  ⚠️ Decline Application                                           │ │
│  │                                                                   │ │
│  │  Are you sure you want to decline Max Mustermann's application?   │ │
│  │                                                                   │ │
│  │  Reason (required):                                               │ │
│  │  ┌─────────────────────────────────────────────────────────────┐ │ │
│  │  │ Insufficient qualifications...                              │ │ │
│  │  └─────────────────────────────────────────────────────────────┘ │ │
│  │                                                                   │ │
│  │                               [Cancel] [Decline Application]      │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  API Call: PATCH /api/v1/applications/:id/reject                        │
│  Body: { "reason": "Insufficient qualifications..." }                   │
│                                                                         │
│  Updates:                                                               │
│  ├─ application.status: → REJECTED                                     │
│  ├─ application.rejectionReason: "..."                                 │
│  └─ Send rejection email to applicant                                  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Schedule Interview Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Admin clicks [📅 Schedule Interview]                                   │
└──────────────────────────┬──────────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Schedule Interview Modal                                               │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  📅 Schedule Interview for Max Mustermann                         │ │
│  │                                                                   │ │
│  │  Select Date:                                                     │ │
│  │  ┌─────────────────────────────────────────────────────────────┐ │ │
│  │  │  [Calendar Picker]                    Selected: 25 Nov 2024 │ │ │
│  │  └─────────────────────────────────────────────────────────────┘ │ │
│  │                                                                   │ │
│  │  Select Time:                                                     │ │
│  │  ┌─────────────────────────────────────────────────────────────┐ │ │
│  │  │  Start: [14:00 ▼]    End: [14:30 ▼]    Duration: 30 min    │ │ │
│  │  └─────────────────────────────────────────────────────────────┘ │ │
│  │                                                                   │ │
│  │  Notes (optional):                                                │ │
│  │  ┌─────────────────────────────────────────────────────────────┐ │ │
│  │  │ Interview notes...                                          │ │ │
│  │  └─────────────────────────────────────────────────────────────┘ │ │
│  │                                                                   │ │
│  │  ☑ Auto-generate Google Meet link                                │ │
│  │  ☑ Send email notification to applicant                          │ │
│  │                                                                   │ │
│  │                            [Cancel] [Schedule Interview]          │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  API Calls:                                                             │
│  1. POST /api/v1/interview-slots                                        │
│     Body: { "date": "2024-11-25", "startTime": "14:00", ... }          │
│                                                                         │
│  2. PATCH /api/v1/interview-slots/:id/book                              │
│     Assigns slot to applicant                                           │
│                                                                         │
│  Updates:                                                               │
│  ├─ Creates InterviewSlot with status: BOOKED                          │
│  ├─ application.status: → INTERVIEW_SCHEDULED                          │
│  ├─ Generate Google Meet link                                          │
│  └─ Send confirmation emails to both parties                           │
└─────────────────────────────────────────────────────────────────────────┘
```

### Application Status Tabs

| Tab | Status Filter | Description |
|-----|---------------|-------------|
| All | All statuses | All applications |
| Submitted | `SUBMITTED` | New applications, Phase 1 |
| Docs Reviewed | `DOCUMENTS_REVIEWED` | Ready for interview |
| Interview | `INTERVIEW_SCHEDULED` | Interview scheduled |
| Done | `INTERVIEW_DONE` | Interview completed, awaiting decision |
| Approved | `APPROVED` | Accepted as tutor |
| Rejected | `REJECTED` | Declined applications |

### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/admin/applications` | List applications with filters |
| GET | `/api/v1/applications/:id` | Get application details |
| PATCH | `/api/v1/applications/:id/approve-docs` | Accept for interview |
| PATCH | `/api/v1/applications/:id/reject` | Decline application |
| PATCH | `/api/v1/applications/:id/approve` | Final approval as tutor |
| POST | `/api/v1/interview-slots` | Create interview slot |
| PATCH | `/api/v1/interview-slots/:id/book` | Book slot for applicant |

### List Applications Endpoint

```
GET /api/v1/admin/applications
```

**Query Parameters:**
```
?status=submitted     # Filter: submitted, documents_reviewed, interview_scheduled, interview_done, approved, rejected
&search=max           # Search by name/email
&subject=math         # Filter by subject
&sortBy=createdAt     # Sort: createdAt, name
&sortOrder=desc
&page=1
&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "user": {
        "_id": "...",
        "name": "Max Mustermann",
        "email": "max@email.com",
        "phone": "+49123456789",
        "profilePicture": "https://..."
      },
      "subjects": ["Mathematics", "Physics"],
      "status": "SUBMITTED",
      "phase": 1,
      "documents": {
        "cvUrl": "https://...",
        "abiturCertificateUrl": "https://...",
        "officialIdUrl": "https://..."
      },
      "address": {
        "street": "Hauptstraße",
        "houseNumber": "42",
        "zipCode": "10115",
        "city": "Berlin"
      },
      "interviewSlot": null,
      "createdAt": "2024-11-20T..."
    }
  ],
  "stats": {
    "total": 150,
    "submitted": 25,
    "documentsReviewed": 10,
    "interviewScheduled": 5,
    "interviewDone": 5,
    "approved": 85,
    "rejected": 40
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

## 6.8 Transactions Page

### Transactions List Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Transactions                                                [Export]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │ Total       │ │ This Month  │ │ Pending     │ │ Platform    │       │
│  │ Revenue     │ │ Revenue     │ │ Payouts     │ │ Commission  │       │
│  │  €45,200    │ │  €5,600     │ │  €1,200     │ │  €9,040     │       │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ Tabs: [All] [Student Payments] [Tutor Payouts] [Refunds]          │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ 🔍 Search...     [Date Range ▼] [Type ▼] [Status ▼]               │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ Date       │ Type     │ User        │ Amount  │ Status  │Actions │ │
│  ├────────────┼──────────┼─────────────┼─────────┼─────────┼────────┤ │
│  │ 2024-11-28 │ Payment  │ Max M.      │ €84.00  │🟢 Paid  │[View]  │ │
│  │ 2024-11-27 │ Payout   │ Dr. Sarah   │ €67.20  │🟡 Pend  │[View]  │ │
│  │ 2024-11-26 │ Payment  │ Anna K.     │ €56.00  │🟢 Paid  │[View]  │ │
│  │ 2024-11-25 │ Refund   │ Tom B.      │ €28.00  │🔴 Refund│[View]  │ │
│  │ ...        │ ...      │ ...         │ ...     │ ...     │ ...    │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  Showing 1-20 of 1,250                    [← Prev] [1] [2] [3] [Next →]│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Transaction Detail View (Modal/Page)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Transaction Details                                          [✕ Close]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Transaction #TXN-20241128-001          Status: 🟢 Completed            │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  💰 Payment Info                                                        │
│  ├─ Type: Student Payment                                              │
│  ├─ Amount: €84.00                                                     │
│  ├─ Date: November 28, 2024, 14:30                                     │
│  ├─ Payment Method: Credit Card (****4242)                             │
│  └─ Stripe ID: pi_xxx...                                               │
│                                                                         │
│  👤 Student                                                             │
│  ├─ Name: Max Müller                                                   │
│  ├─ Email: max@email.com                                               │
│  ├─ Plan: Regular (€28/hr)                                             │
│  └─ [View Profile]                                                     │
│                                                                         │
│  📋 Billing Details                                                     │
│  ├─ Invoice #: INV-2411-ABC123                                         │
│  ├─ Billing Period: November 2024                                      │
│  ├─ Hours: 3 hours                                                     │
│  ├─ Rate: €28/hr                                                       │
│  ├─ Subtotal: €84.00                                                   │
│  └─ [Download Invoice PDF]                                             │
│                                                                         │
│  📊 Breakdown                                                           │
│  ├─ Platform Commission (20%): €16.80                                  │
│  └─ Tutor Payout: €67.20                                               │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│                                          [Download Receipt] [Close]     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Transaction Types

| Type | Description | Flow |
|------|-------------|------|
| **Payment** | Student pays for sessions | Student → Platform |
| **Payout** | Platform pays tutor | Platform → Tutor |
| **Refund** | Refund to student | Platform → Student |
| **Commission** | Platform fee | Auto-calculated (20%) |

### Transaction Status

| Status | Color | Description |
|--------|-------|-------------|
| Completed | 🟢 | Payment successful |
| Pending | 🟡 | Awaiting processing |
| Failed | 🔴 | Payment failed |
| Refunded | 🔵 | Amount refunded |

### Filter Options

| Filter | Options |
|--------|---------|
| Date Range | Today, This Week, This Month, Custom |
| Type | All, Payments, Payouts, Refunds |
| Status | All, Completed, Pending, Failed, Refunded |
| User | Search by name/email |

### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/admin/transactions` | List transactions |
| GET | `/api/v1/admin/transactions/:id` | Get transaction details |
| GET | `/api/v1/admin/transactions/export` | Export as CSV |

### List Transactions Endpoint

```
GET /api/v1/admin/transactions
```

**Query Parameters:**
```
?type=payment         # Filter: payment, payout, refund
&status=completed     # Filter: completed, pending, failed, refunded
&startDate=2024-11-01
&endDate=2024-11-30
&search=max           # Search user name/email
&sortBy=date
&sortOrder=desc
&page=1
&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "transactionId": "TXN-20241128-001",
      "type": "PAYMENT",
      "amount": 84.00,
      "currency": "EUR",
      "status": "COMPLETED",
      "user": {
        "_id": "...",
        "name": "Max Müller",
        "email": "max@email.com",
        "role": "STUDENT"
      },
      "billing": {
        "invoiceNumber": "INV-2411-ABC123",
        "period": "2024-11",
        "hours": 3
      },
      "breakdown": {
        "subtotal": 84.00,
        "platformCommission": 16.80,
        "tutorPayout": 67.20
      },
      "stripePaymentIntentId": "pi_xxx",
      "createdAt": "2024-11-28T14:30:00Z"
    }
  ],
  "stats": {
    "totalRevenue": 45200,
    "thisMonthRevenue": 5600,
    "pendingPayouts": 1200,
    "platformCommission": 9040
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1250,
    "totalPages": 63
  }
}
```

---

## 6.9 Meetings Page (Interview Slots)

### Meetings List Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Interview Meetings                                  [+ Create Slot]    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │ Total       │ │ Upcoming    │ │ Completed   │ │ Available   │       │
│  │ Meetings    │ │             │ │             │ │ Slots       │       │
│  │    85       │ │    5        │ │    72       │ │    8        │       │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ Tabs: [All] [Upcoming] [Available] [Completed] [Cancelled]        │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ 🔍 Search applicant...              [Date Range ▼] [Status ▼]     │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ Date       │ Time   │ Applicant    │ Status    │ Actions         │ │
│  ├────────────┼────────┼──────────────┼───────────┼─────────────────┤ │
│  │ 2024-11-29 │ 14:00  │ Max M.       │🔵 Upcoming│[Join][Complete] │ │
│  │ 2024-11-29 │ 15:00  │ -            │🟢 Available│[Edit][Delete]  │ │
│  │ 2024-11-28 │ 10:00  │ Anna K.      │✅ Done    │[View]           │ │
│  │ 2024-11-27 │ 11:00  │ Tom B.       │🔴 Cancelled│[View]          │ │
│  │ ...        │ ...    │ ...          │ ...       │ ...             │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  Showing 1-20 of 85                       [← Prev] [1] [2] [3] [Next →]│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Create Slot Modal

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Create Interview Slot                                        [✕ Close]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  📅 Slot Details                                                        │
│                                                                         │
│  Date:                                                                  │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  [Calendar Picker]                         Selected: 30 Nov 2024│   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Time:                                                                  │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Start: [14:00 ▼]    End: [14:30 ▼]       Duration: 30 min     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Notes (optional):                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Any notes for this slot...                                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ☐ Create recurring slots (weekly for 4 weeks)                         │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│                                        [Cancel] [Create Slot]           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Meeting Detail View

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Meeting Details                                              [✕ Close]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Interview Meeting                         Status: 🔵 Upcoming          │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  📅 Schedule                                                            │
│  ├─ Date: November 29, 2024                                            │
│  ├─ Time: 14:00 - 14:30 (30 min)                                       │
│  └─ Google Meet: [Join Meeting]                                        │
│                                                                         │
│  👤 Applicant                                                           │
│  ├─ Name: Max Mustermann                                               │
│  ├─ Email: max@email.com                                               │
│  ├─ Phone: +49 123 456 789                                             │
│  ├─ Applied for: Mathematics, Physics                                  │
│  └─ [View Application]                                                 │
│                                                                         │
│  📄 Documents                                                           │
│  ├─ CV: [View PDF]                                                     │
│  ├─ Abitur: [View PDF]                                                 │
│  └─ ID: [View PDF]                                                     │
│                                                                         │
│  📝 Notes                                                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Add interview notes here...                                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  [Cancel Meeting]        [Join Meeting]  [Mark as Completed]            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Meeting Status

| Status | Color | Description | Actions |
|--------|-------|-------------|---------|
| Available | 🟢 | Open for booking | Edit, Delete |
| Booked | 🔵 | Applicant booked | View, Cancel |
| Upcoming | 🔵 | Today/Tomorrow | Join, Complete, Cancel |
| Completed | ✅ | Interview done | View |
| Cancelled | 🔴 | Was cancelled | View |

### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/interview-slots` | List all slots |
| POST | `/api/v1/interview-slots` | Create new slot |
| PATCH | `/api/v1/interview-slots/:id` | Update slot |
| DELETE | `/api/v1/interview-slots/:id` | Delete available slot |
| PATCH | `/api/v1/interview-slots/:id/complete` | Mark as completed |
| PATCH | `/api/v1/interview-slots/:id/cancel` | Cancel meeting |

---

## 6.10 Settings Page

### Settings Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Admin Settings                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ Tabs: [Profile] [Terms & Conditions] [Notifications] [Platform]   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Profile Tab

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Profile Settings                                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐                                                       │
│  │              │  [Change Photo]                                       │
│  │   Avatar     │                                                       │
│  │              │                                                       │
│  └──────────────┘                                                       │
│                                                                         │
│  Name:                                                                  │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Admin Name                                                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Email:                                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ admin@platform.com                                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Phone:                                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ +49 123 456 789                                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  🔐 Change Password                                                     │
│                                                                         │
│  Current Password:                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ••••••••                                                        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  New Password:                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ••••••••                                                        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Confirm Password:                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ••••••••                                                        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│                                                     [Save Changes]      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Terms & Conditions Tab

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Terms & Conditions                                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  📋 Documents Management                                                │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ Document         │ Last Updated  │ Status    │ Actions            │ │
│  ├──────────────────┼───────────────┼───────────┼────────────────────┤ │
│  │ Terms of Service │ 15 Nov 2024   │ 🟢 Active │ [Edit] [Preview]  │ │
│  │ Privacy Policy   │ 10 Nov 2024   │ 🟢 Active │ [Edit] [Preview]  │ │
│  │ Tutor Agreement  │ 05 Nov 2024   │ 🟢 Active │ [Edit] [Preview]  │ │
│  │ Student Agreement│ 01 Nov 2024   │ 🟢 Active │ [Edit] [Preview]  │ │
│  │ Cookie Policy    │ 20 Oct 2024   │ 🟢 Active │ [Edit] [Preview]  │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  [+ Add New Document]                                                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Edit Terms Modal

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Edit: Terms of Service                                       [✕ Close]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Title:                                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Terms of Service                                                │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Content (Markdown supported):                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ # Terms of Service                                              │   │
│  │                                                                 │   │
│  │ ## 1. Introduction                                              │   │
│  │ Welcome to our tutoring platform...                             │   │
│  │                                                                 │   │
│  │ ## 2. User Accounts                                             │   │
│  │ ...                                                             │   │
│  │                                                                 │   │
│  │ [Rich Text Editor / Markdown Editor]                            │   │
│  │                                                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Version: v2.1                                                          │
│  Effective Date: [Date Picker]                                          │
│                                                                         │
│  ☐ Notify all users about this update                                  │
│                                                                         │
│                                        [Cancel] [Save & Publish]        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Notifications Tab

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Notification Settings                                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  📧 Email Notifications                                                 │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ Notification Type              │ Email │ Push │ In-App            │ │
│  ├────────────────────────────────┼───────┼──────┼───────────────────┤ │
│  │ New Student Registration       │  ☑    │  ☑   │   ☑               │ │
│  │ New Tutor Application          │  ☑    │  ☑   │   ☑               │ │
│  │ Session Completed              │  ☐    │  ☐   │   ☑               │ │
│  │ Payment Received               │  ☑    │  ☐   │   ☑               │ │
│  │ Review Posted                  │  ☐    │  ☐   │   ☑               │ │
│  │ Support Ticket                 │  ☑    │  ☑   │   ☑               │ │
│  │ System Alerts                  │  ☑    │  ☑   │   ☑               │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  📱 Push Notification Settings                                          │
│                                                                         │
│  ├─ Daily Summary: [Enabled ▼]                                         │
│  ├─ Weekly Report: [Enabled ▼]                                         │
│  └─ Quiet Hours: 22:00 - 08:00                                         │
│                                                                         │
│                                                     [Save Settings]     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Platform Settings Tab

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Platform Settings                                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  💰 Pricing                                                             │
│                                                                         │
│  Platform Commission:                                                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 20 %                                                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Hourly Rates by Plan:                                                  │
│  ├─ Flexible:  €30/hr                                                  │
│  ├─ Regular:   €28/hr                                                  │
│  └─ Long-term: €25/hr                                                  │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  ⏰ Trial Settings                                                      │
│                                                                         │
│  Trial Duration:                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 24 hours                                                        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Trials per User:                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 1                                                               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  📅 Interview Settings                                                  │
│                                                                         │
│  Default Duration:                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 30 minutes                                                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Reschedule Time Limit:                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 1 hour before                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│                                                     [Save Settings]     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Settings API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/admin/profile` | Get admin profile |
| PATCH | `/api/v1/admin/profile` | Update admin profile |
| PATCH | `/api/v1/auth/change-password` | Change password |
| GET | `/api/v1/admin/terms` | List all terms documents |
| POST | `/api/v1/admin/terms` | Create new terms document |
| PATCH | `/api/v1/admin/terms/:id` | Update terms document |
| GET | `/api/v1/admin/notifications/settings` | Get notification settings |
| PATCH | `/api/v1/admin/notifications/settings` | Update notification settings |
| GET | `/api/v1/admin/platform-settings` | Get platform settings |
| PATCH | `/api/v1/admin/platform-settings` | Update platform settings |

### Terms Document Model

```typescript
{
  _id: ObjectId;
  type: 'TERMS_OF_SERVICE' | 'PRIVACY_POLICY' | 'TUTOR_AGREEMENT' | 'STUDENT_AGREEMENT' | 'COOKIE_POLICY';
  title: string;
  content: string;           // Markdown content
  version: string;           // e.g., "v2.1"
  effectiveDate: Date;
  isActive: boolean;
  createdBy: ObjectId;       // Admin who created
  updatedBy: ObjectId;       // Admin who last updated
  createdAt: Date;
  updatedAt: Date;
}
```

### Platform Settings Model

```typescript
{
  _id: ObjectId;
  pricing: {
    platformCommission: number;    // 20 (percentage)
    flexibleRate: number;          // 30 (EUR)
    regularRate: number;           // 28 (EUR)
    longTermRate: number;          // 25 (EUR)
  };
  trial: {
    durationHours: number;         // 24
    maxTrialsPerUser: number;      // 1
  };
  interview: {
    defaultDurationMinutes: number; // 30
    rescheduleTimeLimit: number;    // 60 (minutes before)
  };
  updatedBy: ObjectId;
  updatedAt: Date;
}
```

---

## 6.11 Implementation Files

### New Files to Create

| File | Purpose |
|------|---------|
| `admin.service.ts` | Add `getStudents()`, `getTutors()` methods |
| `admin.controller.ts` | Add handlers |
| `admin.route.ts` | Add routes |
| `admin.validation.ts` | Add query validation |

### Existing Files to Modify

| File | Changes |
|------|---------|
| `user.model.ts` | Add `blockReason`, `blockedAt`, `unblockedAt` fields |
| `user.interface.ts` | Update types |
| `user.service.ts` | Update block/unblock with reason logging |

---

# 7. Student Dashboard Pages

> **Purpose:** Student-এর Dashboard - Sessions দেখা, Subscription Usage, Feedback/Rating দেওয়া

## 7.1 Quick Summary

| Page | Purpose | Key Features |
|------|---------|--------------|
| Sessions | Session management | Subscription Usage Bar, Upcoming Sessions, Completed Sessions, Give Feedback |

---

## 7.2 Sessions Page

### Sessions Page Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  My Sessions                                                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  📊 Subscription Usage - Regular Plan (€28/hr)                    │ │
│  │                                                                   │ │
│  │  Hours Used This Month: 6 / 10 hrs                               │ │
│  │  ████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  60%           │ │
│  │                                                                   │ │
│  │  Sessions: 3 completed │ Amount: €168 │ Remaining: 4 hrs         │ │
│  │                                                                   │ │
│  │  [View Billing Details]                         [Upgrade Plan →] │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  [Upcoming Sessions]  [Completed Sessions]                              │
│       ────────             ───────────────                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### 7.2.1 Subscription Usage Card

```
┌─────────────────────────────────────────────────────────────────────────┐
│  📊 Subscription Usage                                                  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Current Plan: REGULAR (€28/hr)                    [Change Plan]│   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Monthly Usage                                                   │   │
│  │                                                                  │   │
│  │  Hours Used:  ███████████████░░░░░░░░░░░░░░░  6 / 10 hrs (60%)  │   │
│  │                                                                  │   │
│  │  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐          │   │
│  │  │ Sessions      │ │ Amount Due    │ │ Remaining     │          │   │
│  │  │     3         │ │    €168       │ │   4 hrs       │          │   │
│  │  │  completed    │ │  this month   │ │  available    │          │   │
│  │  └───────────────┘ └───────────────┘ └───────────────┘          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Billing Cycle: Nov 1 - Nov 30, 2024        [View Billing History]     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Usage Calculation

| Field | Calculation |
|-------|-------------|
| Hours Used | Sum of `sessions.durationMinutes / 60` where `status = COMPLETED` |
| Sessions Count | Count of `sessions.status = COMPLETED` this month |
| Amount Due | `hoursUsed × planRate` (€28 for Regular) |
| Remaining | Based on subscription commitment (if any) |
| Progress % | `(hoursUsed / expectedHours) × 100` |

### Plan Comparison

| Plan | Rate | Minimum | Commitment |
|------|------|---------|------------|
| Flexible | €30/hr | None | None |
| Regular | €28/hr | 4 hrs/month | 1 month |
| Long-term | €25/hr | 4 hrs/month | 3 months |

---

### 7.2.2 Upcoming Sessions Tab

```
┌─────────────────────────────────────────────────────────────────────────┐
│  📅 Upcoming Sessions                                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  Today, Nov 27, 2024                                              │ │
│  │                                                                   │ │
│  │  ┌─────────────────────────────────────────────────────────────┐ │ │
│  │  │  📚 Mathematics                         14:00 - 15:00        │ │ │
│  │  │  👨‍🏫 Dr. Sarah Weber                    Duration: 1 hr      │ │ │
│  │  │  📍 Google Meet                         Status: SCHEDULED    │ │ │
│  │  │                                                              │ │ │
│  │  │  [Join Meeting]  [View Details]  [Cancel]                   │ │ │
│  │  └─────────────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  Tomorrow, Nov 28, 2024                                           │ │
│  │                                                                   │ │
│  │  ┌─────────────────────────────────────────────────────────────┐ │ │
│  │  │  📚 Physics                             10:00 - 11:00        │ │ │
│  │  │  👨‍🏫 Prof. Hans Klein                   Duration: 1 hr      │ │ │
│  │  │  📍 Google Meet                         Status: SCHEDULED    │ │ │
│  │  │                                                              │ │ │
│  │  │  [View Details]  [Reschedule]  [Cancel]                     │ │ │
│  │  └─────────────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  No more upcoming sessions                                              │
│  [Book New Session via Chat]                                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Session Card Data

| Field | Source |
|-------|--------|
| Subject | `session.subject` |
| Tutor Name | `session.tutor.name` |
| Date/Time | `session.startTime`, `session.endTime` |
| Duration | `session.durationMinutes` |
| Status | `session.status` |
| Meet Link | `session.googleMeetLink` |

### Actions

| Action | Condition | Result |
|--------|-----------|--------|
| Join Meeting | 15 min before to session end | Opens Google Meet link |
| View Details | Always | Shows session detail modal |
| Reschedule | > 24 hrs before | Opens reschedule flow |
| Cancel | > 24 hrs before | Cancels session |

---

### 7.2.3 Completed Sessions Tab

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ✅ Completed Sessions                            [Filter: This Month ▼]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  Nov 25, 2024                                                     │ │
│  │                                                                   │ │
│  │  ┌─────────────────────────────────────────────────────────────┐ │ │
│  │  │  📚 Mathematics                         14:00 - 16:00        │ │ │
│  │  │  👨‍🏫 Dr. Sarah Weber                    Duration: 2 hrs     │ │ │
│  │  │  💰 €56                                  Status: ✅ COMPLETED │ │ │
│  │  │                                                              │ │ │
│  │  │  ⚠️ You haven't reviewed this session yet                   │ │ │
│  │  │                                                              │ │ │
│  │  │  [Give Feedback ⭐]  [View Details]                         │ │ │
│  │  └─────────────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  Nov 20, 2024                                                     │ │
│  │                                                                   │ │
│  │  ┌─────────────────────────────────────────────────────────────┐ │ │
│  │  │  📚 Physics                             10:00 - 11:00        │ │ │
│  │  │  👨‍🏫 Prof. Hans Klein                   Duration: 1 hr      │ │ │
│  │  │  💰 €28                                  Status: ✅ COMPLETED │ │ │
│  │  │                                                              │ │ │
│  │  │  Your Rating: ⭐⭐⭐⭐⭐ (5.0)                                │ │ │
│  │  │                                                              │ │ │
│  │  │  [View Feedback]  [View Details]                            │ │ │
│  │  └─────────────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  Nov 15, 2024                                                     │ │
│  │                                                                   │ │
│  │  ┌─────────────────────────────────────────────────────────────┐ │ │
│  │  │  📚 Chemistry                           15:00 - 16:00        │ │ │
│  │  │  👨‍🏫 Maria Lang                         Duration: 1 hr      │ │ │
│  │  │  💰 €28                                  Status: ✅ COMPLETED │ │ │
│  │  │                                                              │ │ │
│  │  │  Your Rating: ⭐⭐⭐⭐ (4.0)                                  │ │ │
│  │  │                                                              │ │ │
│  │  │  [View Feedback]  [View Details]                            │ │ │
│  │  └─────────────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  Showing 1-10 of 15                        [← Prev] [1] [2] [Next →]   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Filter Options

| Filter | Options |
|--------|---------|
| Time Period | This Week, This Month, Last 3 Months, All Time |
| Subject | All, Mathematics, Physics, Chemistry, etc. |
| Tutor | All, [List of tutors] |
| Feedback Status | All, Reviewed, Not Reviewed |

---

### 7.2.4 Give Feedback Modal

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Rate Your Session                                            [✕ Close]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Session: Mathematics with Dr. Sarah Weber                              │
│  Date: Nov 25, 2024 • 14:00 - 16:00 (2 hrs)                            │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  📊 Rate the following (1-5 stars):                                    │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  Overall Experience                                               │ │
│  │  ☆ ☆ ☆ ☆ ☆                                                       │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  Teaching Quality                                                 │ │
│  │  ☆ ☆ ☆ ☆ ☆                                                       │ │
│  │  How well did the tutor explain concepts?                        │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  Communication                                                    │ │
│  │  ☆ ☆ ☆ ☆ ☆                                                       │ │
│  │  Was the tutor clear and responsive?                             │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  Punctuality                                                      │ │
│  │  ☆ ☆ ☆ ☆ ☆                                                       │ │
│  │  Did the session start and end on time?                          │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  Preparedness                                                     │ │
│  │  ☆ ☆ ☆ ☆ ☆                                                       │ │
│  │  Was the tutor well-prepared for the session?                    │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  💬 Additional Comments (Optional):                                    │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                                                                   │ │
│  │  Write your feedback here...                                     │ │
│  │                                                                   │ │
│  │                                                                   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ☐ I would recommend this tutor to others                              │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│                                              [Cancel]  [Submit Review]  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Rating Categories

| Category | Description | Required |
|----------|-------------|----------|
| Overall | General experience rating | ✅ Yes |
| Teaching Quality | How well tutor explained | ✅ Yes |
| Communication | Clarity and responsiveness | ✅ Yes |
| Punctuality | Session timing adherence | ✅ Yes |
| Preparedness | Tutor's preparation level | ✅ Yes |
| Comments | Additional text feedback | ❌ No |
| Would Recommend | Boolean checkbox | ❌ No |

---

## 7.3 API Endpoints

### Student Sessions

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/sessions/my-sessions` | Get student's sessions |
| GET | `/api/v1/sessions/:id` | Get session details |
| PATCH | `/api/v1/sessions/:id/cancel` | Cancel upcoming session |

### Subscription Usage

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/student-subscriptions/my-usage` | Get current subscription usage |
| GET | `/api/v1/student-subscriptions/me` | Get subscription details |

### Reviews (Already Exists)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/v1/session-reviews` | Create review for session |
| GET | `/api/v1/session-reviews/my-reviews` | Get student's reviews |
| GET | `/api/v1/session-reviews/session/:sessionId` | Get review for specific session |
| PATCH | `/api/v1/session-reviews/:id` | Update review |

---

## 7.4 New Endpoint: Subscription Usage

### GET `/api/v1/student-subscriptions/my-usage`

**Purpose:** Get student's current month subscription usage with progress

**Response:**
```json
{
  "success": true,
  "data": {
    "subscription": {
      "_id": "...",
      "plan": "REGULAR",
      "rate": 28,
      "status": "ACTIVE",
      "startDate": "2024-11-01T00:00:00Z",
      "endDate": "2024-11-30T23:59:59Z"
    },
    "usage": {
      "hoursUsed": 6,
      "hoursCommitted": 4,
      "sessionsCompleted": 3,
      "amountDue": 168,
      "progressPercentage": 60
    },
    "billingCycle": {
      "start": "2024-11-01",
      "end": "2024-11-30",
      "daysRemaining": 3
    },
    "sessions": {
      "upcoming": 2,
      "completed": 3,
      "cancelled": 0
    }
  }
}
```

---

## 7.5 New Endpoint: My Sessions

### GET `/api/v1/sessions/my-sessions`

**Purpose:** Get student's sessions with filters

**Query Parameters:**
```
?status=upcoming          # upcoming, completed, cancelled, all
&startDate=2024-11-01
&endDate=2024-11-30
&subject=Mathematics
&tutor=tutorId
&hasReview=false          # Filter by review status
&page=1
&limit=10
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "session123",
      "subject": "Mathematics",
      "tutor": {
        "_id": "tutor123",
        "name": "Dr. Sarah Weber",
        "profilePicture": "https://..."
      },
      "startTime": "2024-11-27T14:00:00Z",
      "endTime": "2024-11-27T15:00:00Z",
      "durationMinutes": 60,
      "status": "SCHEDULED",
      "googleMeetLink": "https://meet.google.com/xxx",
      "price": 28,
      "hasReview": false,
      "review": null
    },
    {
      "_id": "session456",
      "subject": "Physics",
      "tutor": {
        "_id": "tutor456",
        "name": "Prof. Hans Klein",
        "profilePicture": "https://..."
      },
      "startTime": "2024-11-25T10:00:00Z",
      "endTime": "2024-11-25T12:00:00Z",
      "durationMinutes": 120,
      "status": "COMPLETED",
      "googleMeetLink": "https://meet.google.com/yyy",
      "price": 56,
      "hasReview": true,
      "review": {
        "_id": "review123",
        "overallRating": 5,
        "createdAt": "2024-11-25T13:00:00Z"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 15,
    "totalPages": 2
  },
  "summary": {
    "upcoming": 2,
    "completed": 12,
    "cancelled": 1,
    "pendingReviews": 3
  }
}
```

---

## 7.6 Implementation Files

### New Files to Create

| File | Purpose |
|------|---------|
| `student-subscriptions.service.ts` | Add `getMyUsage()` method |
| `sessions.service.ts` | Add `getMySessionsAsStudent()` method |

### Existing Files to Modify

| File | Changes |
|------|---------|
| `session.route.ts` | Add `/my-sessions` route |
| `session.controller.ts` | Add `getMySessionsAsStudent` handler |
| `studentSubscription.route.ts` | Add `/my-usage` route |
| `studentSubscription.controller.ts` | Add `getMyUsage` handler |

---

# Appendix

## A. Client Confirmation Questions

### Student Flow Questions

| ID | Question | Options |
|----|----------|---------|
| S-1 | Documents upload location? | Cloudinary / AWS S3 / Local |
| S-2 | Guardian consent required? | Email verify / Just collect |
| S-3 | Trial visibility timing? | After registration / After email verify |

### Tutor Flow Questions

| ID | Question | Options |
|----|----------|---------|
| T-1 | Official ID types? | Personalausweis / Passport / Aufenthaltstitel / All |
| T-2 | File upload flow? | Direct / Pre-upload URLs |
| T-3 | Minimum age? | 18+ / 21+ / No restriction |
| T-4 | Update existing endpoint? | Yes / No |
| T-5 | Country field needed? | Yes (Germany default) / No |
| T-6 | Phone format? | German only / International / Any |
| T-7 | Subject selection? | Database predefined / Free text / Max limit? |
| T-8 | Document formats? | PDF only / PDF + Images / Max size? |

---

## B. Status Reference

### User Roles

| Role | Description |
|------|-------------|
| STUDENT | Learning users |
| APPLICANT | Applied to become tutor |
| TUTOR | Approved tutors |
| SUPER_ADMIN | Platform admin |

### Application Status

| Status | Phase | Description |
|--------|-------|-------------|
| SUBMITTED | 1 | Initial submission |
| DOCUMENTS_REVIEWED | 2 | Ready for interview |
| INTERVIEW_SCHEDULED | 2 | Interview booked |
| INTERVIEW_DONE | 2 | Interview completed |
| APPROVED | 3 | Final approval |
| REJECTED | - | Rejected |

### Interview Slot Status

| Status | Description |
|--------|-------------|
| AVAILABLE | Open for booking |
| BOOKED | Reserved |
| COMPLETED | Interview done |
| CANCELLED | Cancelled |

---

## C. Changelog

| Date | Change |
|------|--------|
| 2024-XX-XX | Initial Student Free Trial Flow |
| 2024-XX-XX | Added Tutor Application Flow |
| 2024-XX-XX | Added Interview Scheduling Flow |
| 2024-XX-XX | Reorganized document structure |
| 2024-XX-XX | Added Admin Dashboard Pages (Overview, Students, Tutors) |
| 2024-XX-XX | Added Sessions Page and Applications Page |
| 2024-11-27 | Added Transactions Page, Meetings Page, and Settings Page |
| 2024-11-27 | Added Student Dashboard Pages (Sessions, Subscription Usage, Feedback) |
