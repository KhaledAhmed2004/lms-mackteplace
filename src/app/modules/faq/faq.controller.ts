import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { FAQService } from './faq.service';

const createFAQ = catchAsync(async (req: Request, res: Response) => {
  const result = await FAQService.createFAQ(req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'FAQ created successfully',
    data: result,
  });
});

const getAllFAQs = catchAsync(async (req: Request, res: Response) => {
  const result = await FAQService.getAllFAQs(req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'FAQs retrieved successfully',
    data: result.data,
    pagination: result.pagination,
  });
});

const getActiveFAQs = catchAsync(async (_req: Request, res: Response) => {
  const result = await FAQService.getActiveFAQs();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Active FAQs retrieved successfully',
    data: result,
  });
});

const updateFAQ = catchAsync(async (req: Request, res: Response) => {
  const { faqId } = req.params;
  const result = await FAQService.updateFAQ(faqId, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'FAQ updated successfully',
    data: result,
  });
});

const deleteFAQ = catchAsync(async (req: Request, res: Response) => {
  const { faqId } = req.params;
  const result = await FAQService.deleteFAQ(faqId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'FAQ deleted successfully',
    data: result,
  });
});

export const FAQController = {
  createFAQ,
  getAllFAQs,
  getActiveFAQs,
  updateFAQ,
  deleteFAQ,
};
