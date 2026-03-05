import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { GradeService } from './grade.service';

export const GradeController = {
  createGrade: catchAsync(async (req: Request, res: Response) => {
    const result = await GradeService.createGrade(req.body);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.CREATED,
      message: 'Grade created successfully',
      data: result,
    });
  }),

  getAllGrades: catchAsync(async (req: Request, res: Response) => {
    const result = await GradeService.getAllGrades(req.query);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Grades retrieved successfully',
      data: result.data,
      pagination: result.pagination,
    });
  }),

  getSingleGrade: catchAsync(async (req: Request, res: Response) => {
    const { gradeId } = req.params;
    const result = await GradeService.getSingleGrade(gradeId);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Grade retrieved successfully',
      data: result,
    });
  }),

  updateGrade: catchAsync(async (req: Request, res: Response) => {
    const { gradeId } = req.params;
    const result = await GradeService.updateGrade(gradeId, req.body);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Grade updated successfully',
      data: result,
    });
  }),

  deleteGrade: catchAsync(async (req: Request, res: Response) => {
    const { gradeId } = req.params;
    const result = await GradeService.deleteGrade(gradeId);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Grade deleted successfully',
      data: result,
    });
  }),

  getActiveGrades: catchAsync(async (_req: Request, res: Response) => {
    const result = await GradeService.getActiveGrades();

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Active grades retrieved successfully',
      data: result,
    });
  }),
};
