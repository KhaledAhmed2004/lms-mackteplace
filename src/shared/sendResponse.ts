import { Response } from 'express';

type IPagination = {
  page: number;
  limit: number;
  totalPage: number;
  total: number;
};

type IData<T> = {
  success: boolean;
  statusCode: number;
  message?: string;
  pagination?: IPagination;
  data?: T;
};

const sendResponse = <T>(res: Response, data: IData<T>) => {
  // 👇 store full response data for logger middleware
  res.locals.responsePayload = data;

  const resData = {
    success: data.success,
    message: data.message,
    pagination: data.pagination,
    data: data.data,
  };

  res.status(data.statusCode).json(resData);
};

export default sendResponse;
