"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FAQService = void 0;
const http_status_codes_1 = require("http-status-codes");
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const faq_model_1 = require("./faq.model");
const createFAQ = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const existingFAQ = yield faq_model_1.FAQ.findOne({ question: payload.question });
    if (existingFAQ) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'FAQ with this same question already exists');
    }
    const result = yield faq_model_1.FAQ.create(payload);
    return result;
});
const getAllFAQs = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const faqQuery = new QueryBuilder_1.default(faq_model_1.FAQ.find(), query)
        .search(['question', 'answer'])
        .filter()
        .sort()
        .paginate()
        .fields();
    const data = yield faqQuery.modelQuery;
    const pagination = yield faqQuery.getPaginationInfo();
    return {
        data,
        pagination,
    };
});
const getActiveFAQs = () => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield faq_model_1.FAQ.find({ isActive: true })
        .sort({ createdAt: -1 })
        .lean();
    return result;
});
const updateFAQ = (id, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const faq = yield faq_model_1.FAQ.findById(id);
    if (!faq) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'FAQ not found');
    }
    if (payload.question && payload.question !== faq.question) {
        const existingFAQ = yield faq_model_1.FAQ.findOne({ question: payload.question });
        if (existingFAQ) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'FAQ with this question already exists');
        }
    }
    const result = yield faq_model_1.FAQ.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
    });
    return result;
});
const deleteFAQ = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const faq = yield faq_model_1.FAQ.findById(id);
    if (!faq) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'FAQ not found');
    }
    const result = yield faq_model_1.FAQ.findByIdAndDelete(id);
    return result;
});
exports.FAQService = {
    createFAQ,
    getAllFAQs,
    getActiveFAQs,
    updateFAQ,
    deleteFAQ,
};
