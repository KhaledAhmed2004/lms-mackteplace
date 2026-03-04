import { StatusCodes } from 'http-status-codes';
import QueryBuilder from '../../builder/QueryBuilder';
import ApiError from '../../../errors/ApiError';
import { IFAQ } from './faq.interface';
import { FAQ } from './faq.model';

const createFAQ = async (payload: IFAQ): Promise<IFAQ> => {
  const existingFAQ = await FAQ.findOne({ question: payload.question });
  if (existingFAQ) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'FAQ with this same question already exists'
    );
  }

  const result = await FAQ.create(payload);
  return result;
};

const getAllFAQs = async (query: Record<string, unknown>) => {
  const faqQuery = new QueryBuilder(FAQ.find(), query)
    .search(['question', 'answer'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const data = await faqQuery.modelQuery;
  const pagination = await faqQuery.getPaginationInfo();

  return {
    data,
    pagination,
  };
};

const getActiveFAQs = async (): Promise<IFAQ[]> => {
  const result = await FAQ.find({ isActive: true })
    .sort({ createdAt: -1 })
    .lean();
  return result;
};

const updateFAQ = async (
  id: string,
  payload: Partial<IFAQ>
): Promise<IFAQ | null> => {
  const faq = await FAQ.findById(id);
  if (!faq) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'FAQ not found');
  }

  if (payload.question && payload.question !== faq.question) {
    const existingFAQ = await FAQ.findOne({ question: payload.question });
    if (existingFAQ) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'FAQ with this question already exists'
      );
    }
  }

  const result = await FAQ.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  return result;
};

const deleteFAQ = async (id: string): Promise<IFAQ | null> => {
  const faq = await FAQ.findById(id);
  if (!faq) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'FAQ not found');
  }

  const result = await FAQ.findByIdAndDelete(id);
  return result;
};

export const FAQService = {
  createFAQ,
  getAllFAQs,
  getActiveFAQs,
  updateFAQ,
  deleteFAQ,
};
