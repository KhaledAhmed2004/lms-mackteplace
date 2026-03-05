import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { SupportTicketController } from './supportTicket.controller';
import { SupportTicketValidation } from './supportTicket.validation';

const router = express.Router();

// Get all ticket categories for dropdown
router.get('/categories', SupportTicketController.getTicketCategories);

// Create a new support ticket
router.post(
  '/',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR),
  validateRequest(SupportTicketValidation.createSupportTicketZodSchema),
  SupportTicketController.createSupportTicket,
);

// Get all tickets for logged-in user
router.get(
  '/my-tickets',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR),
  SupportTicketController.getMyTickets,
);

// Get single ticket by ID (user's own ticket only)
router.get(
  '/my-tickets/:ticketId',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR),
  SupportTicketController.getMyTicketById,
);

// Get ticket statistics for admin dashboard
router.get(
  '/admin/stats',
  auth(USER_ROLES.SUPER_ADMIN),
  SupportTicketController.getTicketStats,
);

// Get all tickets (admin view)
router.get(
  '/admin',
  auth(USER_ROLES.SUPER_ADMIN),
  SupportTicketController.getAllTickets,
);

// Get single ticket by ID (admin view)
router.get(
  '/admin/:ticketId',
  auth(USER_ROLES.SUPER_ADMIN),
  SupportTicketController.getTicketById,
);

// Update ticket status
router.patch(
  '/admin/:ticketId/status',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(SupportTicketValidation.updateTicketStatusZodSchema),
  SupportTicketController.updateTicketStatus,
);

// Update ticket priority
router.patch(
  '/admin/:ticketId/priority',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(SupportTicketValidation.updateTicketPriorityZodSchema),
  SupportTicketController.updateTicketPriority,
);

// Add admin notes to ticket
router.patch(
  '/admin/:ticketId/notes',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(SupportTicketValidation.addAdminNoteZodSchema),
  SupportTicketController.addAdminNotes,
);

export const SupportTicketRoutes = router;
