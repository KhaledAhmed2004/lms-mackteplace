# Tutoring Marketplace Documentation

## Overview

This directory contains focused documentation for each module of the tutoring marketplace platform.

## Documentation Files

### Getting Started
- **[00-overview.md](./00-overview.md)** - Project overview, tech stack, architecture patterns, environment setup

### Completed Modules ✅

- **[01-user-system.md](./01-user-system.md)** - User roles (STUDENT, TUTOR, APPLICANT, ADMIN), profile fields, role transitions
- **[02-subject-module.md](./02-subject-module.md)** - Subject CRUD operations, admin management, public listing
- **[03-tutor-application.md](./03-tutor-application.md)** - 3-phase application workflow, document uploads, auto role transitions
- **[04-interview-slots.md](./04-interview-slots.md)** - Interview scheduling, slot booking, Google Meet placeholders
- **[05-trial-requests.md](./05-trial-requests.md)** - Uber-style trial request matching, auto chat creation
- **[06-sessions-in-chat-booking.md](./06-sessions-in-chat-booking.md)** - In-chat booking, session proposals, auto pricing
- **[07-student-subscriptions.md](./07-student-subscriptions.md)** - 3 pricing tiers, usage tracking, Stripe placeholders
- **[08-monthly-billing.md](./08-monthly-billing.md)** - Month-end billing automation, invoice generation, Stripe integration
- **[09-tutor-earnings-payouts.md](./09-tutor-earnings-payouts.md)** - Stripe Connect payouts, commission calculation, payout management

### In Progress 🔄

- None currently

### Pending Modules 📋

- **10-admin-dashboard.md** - Admin APIs, analytics, CSV export
- **11-session-reviews.md** - Post-session ratings and reviews

### Reference

- **[99-api-reference.md](./99-api-reference.md)** - Quick API reference with examples

## Quick Navigation

### By Phase

**Phase 1: Foundation** ✅
- User System → [01-user-system.md](./01-user-system.md)
- Subjects → [02-subject-module.md](./02-subject-module.md)

**Phase 2: Tutor Onboarding** ✅
- Applications → [03-tutor-application.md](./03-tutor-application.md)
- Interview Scheduling → [04-interview-slots.md](./04-interview-slots.md)

**Phase 3: Trial Matching** ✅
- Trial Requests → [05-trial-requests.md](./05-trial-requests.md)

**Phase 4: Bookings** ✅
- Sessions → [06-sessions-in-chat-booking.md](./06-sessions-in-chat-booking.md)

**Phase 5: Payments** ✅
- Subscriptions → [07-student-subscriptions.md](./07-student-subscriptions.md)
- Monthly Billing → [08-monthly-billing.md](./08-monthly-billing.md)
- Tutor Earnings → [09-tutor-earnings-payouts.md](./09-tutor-earnings-payouts.md)

**Phase 6-7: Admin & Automation** 📋
- Dashboard → 08-admin-dashboard.md (pending)

### By Topic

**User Management**
- Roles & Profiles → [01-user-system.md](./01-user-system.md)
- Tutor Applications → [03-tutor-application.md](./03-tutor-application.md)

**Content Management**
- Subjects → [02-subject-module.md](./02-subject-module.md)

**API Reference**
- Quick Guide → [99-api-reference.md](./99-api-reference.md)

**Architecture**
- Tech Stack → [00-overview.md](./00-overview.md#tech-stack)
- Patterns → [00-overview.md](./00-overview.md#architecture-patterns)

## File Naming Convention

- `00-` - Overview and setup
- `01-09` - Module documentation (by phase)
- `99-` - Reference and utilities

## Each Module Document Includes

- **Overview**: What the module does
- **Status**: Completed/In Progress/Pending
- **Files**: Module structure and locations
- **Schema**: Database design
- **API**: Endpoints with examples
- **Features**: Key functionality
- **Examples**: Code snippets and cURL commands
- **Design Decisions**: Why certain choices were made
- **Testing**: Test strategy (when applicable)
- **Next Steps**: Dependencies and future work

## Contributing

When creating new module documentation:
1. Use the next available number (e.g., `04-interview-slots.md`)
2. Follow the same structure as existing docs
3. Include practical examples and code snippets
4. Document design decisions and rationale
5. Update this README with the new file

## Main Project Documentation

- **[../../CLAUDE.md](../../CLAUDE.md)** - Main project instructions
- **[../tutoring-marketplace-implementation.md](../tutoring-marketplace-implementation.md)** - Legacy single-file documentation (now index)