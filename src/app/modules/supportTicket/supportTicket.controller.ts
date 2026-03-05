import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { SupportTicketService } from './supportTicket.service';

export const SupportTicketController = {
  createSupportTicket: catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id!;
    const userRole = req.user!.role === 'STUDENT' ? 'STUDENT' : 'TUTOR';

    const result = await SupportTicketService.createSupportTicket(
      userId,
      userRole,
      req.body,
    );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.CREATED,
      message: 'Support ticket created successfully',
      data: result,
    });
  }),

  getMyTickets: catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id!;
    const result = await SupportTicketService.getMyTickets(userId, req.query);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Tickets retrieved successfully',
      data: result.data,
      pagination: result.pagination,
    });
  }),

  getMyTicketById: catchAsync(async (req: Request, res: Response) => {
    const { ticketId } = req.params;
    const userId = req.user!.id!;

    const result = await SupportTicketService.getMyTicketById(ticketId, userId);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Ticket retrieved successfully',
      data: result,
    });
  }),

  getTicketCategories: catchAsync(async (_req: Request, res: Response) => {
    const result = SupportTicketService.getTicketCategories();

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Categories retrieved successfully',
      data: result,
    });
  }),

  // Get all tickets (admin only)
  getAllTickets: catchAsync(async (req: Request, res: Response) => {
    const result = await SupportTicketService.getAllTickets(req.query);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'All tickets retrieved successfully',
      data: result.data,
      pagination: result.pagination,
    });
  }),

  // Get single ticket by ID (admin only)
  getTicketById: catchAsync(async (req: Request, res: Response) => {
    const { ticketId } = req.params;
    const result = await SupportTicketService.getTicketById(ticketId);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Ticket retrieved successfully',
      data: result,
    });
  }),

  // Update ticket status (admin only)
  updateTicketStatus: catchAsync(async (req: Request, res: Response) => {
    const { ticketId } = req.params;
    const { status, adminNotes } = req.body;

    const result = await SupportTicketService.updateTicketStatus(
      ticketId,
      status,
      adminNotes,
    );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Ticket status updated successfully',
      data: result,
    });
  }),

  // Update ticket priority (admin only)
  updateTicketPriority: catchAsync(async (req: Request, res: Response) => {
    const { ticketId } = req.params;
    const { priority } = req.body;

    const result = await SupportTicketService.updateTicketPriority(
      ticketId,
      priority,
    );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Ticket priority updated successfully',
      data: result,
    });
  }),

  // Add admin notes
  addAdminNotes: catchAsync(async (req: Request, res: Response) => {
    const { ticketId } = req.params;
    const { adminNotes } = req.body;

    const result = await SupportTicketService.addAdminNotes(ticketId, adminNotes);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Admin notes added successfully',
      data: result,
    });
  }),

  // Get ticket statistics (admin dashboard)
  getTicketStats: catchAsync(async (_req: Request, res: Response) => {
    const result = await SupportTicketService.getTicketStats();

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Ticket statistics retrieved successfully',
      data: result,
    });
  }),
};