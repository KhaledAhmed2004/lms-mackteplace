import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { AdminService } from './admin.service';

/**
 * Get comprehensive dashboard statistics
 */
const getDashboardStats = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getDashboardStats();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Dashboard statistics retrieved successfully',
    data: result,
  });
});

/**
 * Get revenue statistics by month
 */
const getRevenueByMonth = catchAsync(async (req: Request, res: Response) => {
  const { year, months } = req.query;
  const yearNumber = year ? parseInt(year as string) : new Date().getFullYear();
  const monthsArray = months
    ? (months as string).split(',').map(m => parseInt(m))
    : undefined;

  const result = await AdminService.getRevenueByMonth(yearNumber, monthsArray);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Revenue statistics retrieved successfully',
    data: result,
  });
});

/**
 * Get popular subjects
 */
const getPopularSubjects = catchAsync(async (req: Request, res: Response) => {
  const { limit } = req.query;
  const limitNumber = limit ? parseInt(limit as string) : 10;

  const result = await AdminService.getPopularSubjects(limitNumber);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Popular subjects retrieved successfully',
    data: result,
  });
});

/**
 * Get top tutors
 */
const getTopTutors = catchAsync(async (req: Request, res: Response) => {
  const { limit, sortBy } = req.query;
  const limitNumber = limit ? parseInt(limit as string) : 10;
  const sortByValue = (sortBy as 'sessions' | 'earnings') || 'sessions';

  const result = await AdminService.getTopTutors(limitNumber, sortByValue);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Top tutors retrieved successfully',
    data: result,
  });
});

/**
 * Get top students
 */
const getTopStudents = catchAsync(async (req: Request, res: Response) => {
  const { limit, sortBy } = req.query;
  const limitNumber = limit ? parseInt(limit as string) : 10;
  const sortByValue = (sortBy as 'spending' | 'sessions') || 'spending';

  const result = await AdminService.getTopStudents(limitNumber, sortByValue);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Top students retrieved successfully',
    data: result,
  });
});

/**
 * Get user growth statistics
 */
const getUserGrowth = catchAsync(async (req: Request, res: Response) => {
  const { year, months } = req.query;
  const yearNumber = year ? parseInt(year as string) : new Date().getFullYear();
  const monthsArray = months
    ? (months as string).split(',').map(m => parseInt(m))
    : undefined;

  const result = await AdminService.getUserGrowth(yearNumber, monthsArray);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'User growth statistics retrieved successfully',
    data: result,
  });
});

export const AdminController = {
  getDashboardStats,
  getRevenueByMonth,
  getPopularSubjects,
  getTopTutors,
  getTopStudents,
  getUserGrowth,
};
