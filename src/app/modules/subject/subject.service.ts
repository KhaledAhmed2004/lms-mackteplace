import { StatusCodes } from 'http-status-codes';
import QueryBuilder from '../../builder/QueryBuilder';
import ApiError from '../../../errors/ApiError';
import { ISubject } from './subject.interface';
import { Subject } from './subject.model';

const createSubject = async (payload: ISubject): Promise<ISubject> => {
  // Check if subject with the same name already exists
  const existingSubject = await Subject.findOne({ name: payload.name });
  if (existingSubject) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Subject with this same name already exists'
    );
  }

  const result = await Subject.create(payload);
  return result;
};

// Get all subjects with filtering, searching, pagination
const getAllSubjects = async (query: Record<string, unknown>) => {
  const subjectQuery = new QueryBuilder(Subject.find(), query)
    .search(['name'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const data = await subjectQuery.modelQuery;
  const pagination = await subjectQuery.getPaginationInfo();

  return {
    data,
    pagination,
  };
};

// Get single subject by ID
const getSingleSubject = async (id: string): Promise<ISubject | null> => {
  const result = await Subject.findById(id);

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Subject not found');
  }

  return result;
};

// Update subject
const updateSubject = async (
  id: string,
  payload: Partial<ISubject>
): Promise<ISubject | null> => {
  // Check if subject exists
  const subject = await Subject.findById(id);
  if (!subject) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Subject not found');
  }

  // If updating name, check for uniqueness
  if (payload.name && payload.name !== subject.name) {
    const existingSubject = await Subject.findOne({ name: payload.name });
    if (existingSubject) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Subject with this name already exists'
      );
    }
  }

  const result = await Subject.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  return result;
};

// Delete subject (soft delete by setting isActive to false)
const deleteSubject = async (id: string): Promise<ISubject | null> => {
  const subject = await Subject.findById(id);
  if (!subject) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Subject not found');
  }

  // Soft delete
  const result = await Subject.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  );

  return result;
};

const getActiveSubjects = async (): Promise<ISubject[]> => {
  const result = await Subject.find({ isActive: true })
    .sort({ name: 1 })
    .lean();
  return result;
};

export const SubjectService = {
  createSubject,
  getAllSubjects,
  getSingleSubject,
  updateSubject,
  deleteSubject,
  getActiveSubjects,
};
