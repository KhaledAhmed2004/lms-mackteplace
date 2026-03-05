import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { UserService } from './user.service';
import { USER_STATUS } from '../../../enums/user';
import { JwtPayload } from 'jsonwebtoken';

export const UserController = {
  createUser: catchAsync(async (req: Request, res: Response) => {
    const { ...userData } = req.body;
    const result = await UserService.createUserToDB(userData);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.CREATED,
      message: 'User created successfully',
      data: result,
    });
  }),

  getUserProfile: catchAsync(async (req: Request, res: Response) => {
    const user = req.user;
    const result = await UserService.getUserProfileFromDB(user as JwtPayload);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Profile data retrieved successfully',
      data: result,
    });
  }),

  updateProfile: catchAsync(async (req: Request, res: Response) => {
    const user = req.user;

    // All files + text data are in req.body
    const payload = { ...req.body };

    const result = await UserService.updateProfileToDB(
      user as JwtPayload,
      payload,
    );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Profile updated successfully',
      data: result,
    });
  }),

  getAllUsers: catchAsync(async (req: Request, res: Response) => {
    const result = await UserService.getAllUsers(req.query);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Users retrieved successfully',
      pagination: result.pagination,
      data: result.data,
    });
  }),

  blockUser: catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await UserService.updateUserStatus(id, USER_STATUS.RESTRICTED);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'User blocked successfully',
      data: result,
    });
  }),

  unblockUser: catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await UserService.updateUserStatus(id, USER_STATUS.ACTIVE);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'User unblocked successfully',
      data: result,
    });
  }),

  getUserById: catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await UserService.getUserById(id);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'User data retrieved successfully',
      data: result,
    });
  }),

  getUserDetailsById: catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await UserService.getUserDetailsById(id);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'User details retrieved successfully',
      data: result,
    });
  }),

  // Admin: Student Management
  getAllStudents: catchAsync(async (req: Request, res: Response) => {
    const result = await UserService.getAllStudents(req.query);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Students retrieved successfully',
      pagination: result.pagination,
      data: result.data,
    });
  }),

  blockStudent: catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await UserService.blockStudent(id);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Student blocked successfully',
      data: result,
    });
  }),

  unblockStudent: catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await UserService.unblockStudent(id);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Student unblocked successfully',
      data: result,
    });
  }),

  adminUpdateStudentProfile: catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await UserService.adminUpdateStudentProfile(id, req.body);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Student profile updated successfully',
      data: result,
    });
  }),

  // Admin: Tutor Management
  getAllTutors: catchAsync(async (req: Request, res: Response) => {
    const result = await UserService.getAllTutors(req.query);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Tutors retrieved successfully',
      pagination: result.pagination,
      data: result.data,
    });
  }),

  blockTutor: catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await UserService.blockTutor(id);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Tutor blocked successfully',
      data: result,
    });
  }),

  unblockTutor: catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await UserService.unblockTutor(id);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Tutor unblocked successfully',
      data: result,
    });
  }),

  updateTutorSubjects: catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { subjects } = req.body;
    const result = await UserService.updateTutorSubjects(id, subjects);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Tutor subjects updated successfully',
      data: result,
    });
  }),

  adminUpdateTutorProfile: catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await UserService.adminUpdateTutorProfile(id, req.body);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Tutor profile updated successfully',
      data: result,
    });
  }),

  // Tutor: Statistics
  getTutorStatistics: catchAsync(async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;
    const result = await UserService.getTutorStatistics(user.id);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Tutor statistics retrieved successfully',
      data: result,
    });
  }),
};