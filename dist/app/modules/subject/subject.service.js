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
exports.SubjectService = void 0;
const http_status_codes_1 = require("http-status-codes");
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const subject_model_1 = require("./subject.model");
const createSubject = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    // Check if subject with the same name already exists
    const existingSubject = yield subject_model_1.Subject.findOne({ name: payload.name });
    if (existingSubject) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Subject with this same name already exists');
    }
    const result = yield subject_model_1.Subject.create(payload);
    return result;
});
// Get all subjects with filtering, searching, pagination
const getAllSubjects = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const subjectQuery = new QueryBuilder_1.default(subject_model_1.Subject.find(), query)
        .search(['name'])
        .filter()
        .sort()
        .paginate()
        .fields();
    const data = yield subjectQuery.modelQuery.lean();
    const pagination = yield subjectQuery.getPaginationInfo();
    return {
        data,
        pagination,
    };
});
// Get single subject by ID
const getSingleSubject = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield subject_model_1.Subject.findById(id);
    if (!result) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Subject not found');
    }
    return result;
});
// Update subject
const updateSubject = (id, payload) => __awaiter(void 0, void 0, void 0, function* () {
    // Check if subject exists
    const subject = yield subject_model_1.Subject.findById(id);
    if (!subject) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Subject not found');
    }
    // If updating name, check for uniqueness
    if (payload.name && payload.name !== subject.name) {
        const existingSubject = yield subject_model_1.Subject.findOne({ name: payload.name });
        if (existingSubject) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Subject with this name already exists');
        }
    }
    const result = yield subject_model_1.Subject.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
    });
    return result;
});
// Delete subject (soft delete by setting isActive to false)
const deleteSubject = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const subject = yield subject_model_1.Subject.findById(id);
    if (!subject) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Subject not found');
    }
    // Soft delete
    const result = yield subject_model_1.Subject.findByIdAndUpdate(id, { isActive: false }, { new: true });
    return result;
});
const getActiveSubjects = () => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield subject_model_1.Subject.find({ isActive: true })
        .sort({ name: 1 })
        .lean();
    return result;
});
exports.SubjectService = {
    createSubject,
    getAllSubjects,
    getSingleSubject,
    updateSubject,
    deleteSubject,
    getActiveSubjects,
};
