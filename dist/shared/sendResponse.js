"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sendResponse = (res, data) => {
    // 👇 store full response data for logger middleware
    res.locals.responsePayload = data;
    // Support both 'pagination' and 'meta' for flexibility
    const paginationData = data.pagination || data.meta;
    const resData = {
        success: data.success,
        message: data.message,
        pagination: paginationData,
        data: data.data,
    };
    res.status(data.statusCode).json(resData);
};
exports.default = sendResponse;
