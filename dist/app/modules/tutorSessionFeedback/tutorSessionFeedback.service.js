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
exports.TutorSessionFeedbackService = void 0;
const http_status_codes_1 = require("http-status-codes");
const mongoose_1 = require("mongoose");
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const session_model_1 = require("../session/session.model");
const session_interface_1 = require("../session/session.interface");
const user_model_1 = require("../user/user.model");
const tutorSessionFeedback_model_1 = require("./tutorSessionFeedback.model");
const tutorSessionFeedback_interface_1 = require("./tutorSessionFeedback.interface");
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
// Helper to calculate due date (3rd of next month)
const calculateDueDate = (sessionDate) => {
    const dueDate = new Date(sessionDate);
    dueDate.setMonth(dueDate.getMonth() + 1);
    dueDate.setDate(3);
    dueDate.setHours(23, 59, 59, 999); // End of day
    return dueDate;
};
// Create feedback record when session is completed
const createPendingFeedback = (sessionId, tutorId, studentId, sessionCompletedAt) => __awaiter(void 0, void 0, void 0, function* () {
    // Check if feedback already exists
    const existingFeedback = yield tutorSessionFeedback_model_1.TutorSessionFeedback.findOne({ sessionId });
    if (existingFeedback) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Feedback record already exists for this session');
    }
    const dueDate = calculateDueDate(sessionCompletedAt);
    const feedback = yield tutorSessionFeedback_model_1.TutorSessionFeedback.create({
        sessionId,
        tutorId,
        studentId,
        dueDate,
        status: tutorSessionFeedback_interface_1.FEEDBACK_STATUS.PENDING,
        rating: 0, // Will be set when tutor submits
        feedbackType: tutorSessionFeedback_interface_1.FEEDBACK_TYPE.TEXT, // Default, will be set when tutor submits
    });
    // Increment tutor's pending feedback count
    yield user_model_1.User.findByIdAndUpdate(tutorId, {
        $inc: { 'tutorProfile.pendingFeedbackCount': 1 },
    });
    return feedback;
});
// Submit feedback (tutor action)
const submitFeedback = (tutorId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const { sessionId, rating, feedbackType, feedbackText, feedbackAudioUrl, audioDuration } = payload;
    // Verify session exists and is completed
    const session = yield session_model_1.Session.findById(sessionId);
    if (!session) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Session not found');
    }
    if (session.status !== session_interface_1.SESSION_STATUS.COMPLETED) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Can only submit feedback for completed sessions');
    }
    // Verify tutor owns this session
    if (session.tutorId.toString() !== tutorId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You can only submit feedback for your own sessions');
    }
    // Check if feedback already exists
    let feedback = yield tutorSessionFeedback_model_1.TutorSessionFeedback.findOne({ sessionId });
    const now = new Date();
    const dueDate = (feedback === null || feedback === void 0 ? void 0 : feedback.dueDate) || calculateDueDate(session.completedAt || now);
    const isLate = now > dueDate;
    if (feedback) {
        // Update existing feedback record
        if (feedback.status === tutorSessionFeedback_interface_1.FEEDBACK_STATUS.SUBMITTED) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Feedback already submitted');
        }
        feedback.rating = rating;
        feedback.feedbackType = feedbackType;
        feedback.feedbackText = feedbackText;
        feedback.feedbackAudioUrl = feedbackAudioUrl;
        feedback.audioDuration = audioDuration;
        feedback.submittedAt = now;
        feedback.isLate = isLate;
        feedback.status = tutorSessionFeedback_interface_1.FEEDBACK_STATUS.SUBMITTED;
        yield feedback.save();
    }
    else {
        // Create new feedback record
        feedback = yield tutorSessionFeedback_model_1.TutorSessionFeedback.create({
            sessionId,
            tutorId,
            studentId: session.studentId,
            rating,
            feedbackType,
            feedbackText,
            feedbackAudioUrl,
            audioDuration,
            dueDate,
            submittedAt: now,
            isLate,
            status: tutorSessionFeedback_interface_1.FEEDBACK_STATUS.SUBMITTED,
        });
    }
    // Update session with feedback reference
    yield session_model_1.Session.findByIdAndUpdate(sessionId, {
        tutorFeedbackId: feedback._id,
    });
    // Decrement tutor's pending feedback count
    yield user_model_1.User.findByIdAndUpdate(tutorId, {
        $inc: { 'tutorProfile.pendingFeedbackCount': -1 },
    });
    // Update tutor's average rating
    yield updateTutorRating(tutorId);
    return feedback;
});
// Update tutor's average rating based on their feedback ratings
const updateTutorRating = (tutorId) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield tutorSessionFeedback_model_1.TutorSessionFeedback.aggregate([
        {
            $match: {
                tutorId: new mongoose_1.Types.ObjectId(tutorId),
                status: tutorSessionFeedback_interface_1.FEEDBACK_STATUS.SUBMITTED,
            },
        },
        {
            $group: {
                _id: null,
                averageRating: { $avg: '$rating' },
                count: { $sum: 1 },
            },
        },
    ]);
    if (result.length > 0) {
        yield user_model_1.User.findByIdAndUpdate(tutorId, {
            averageRating: Math.round(result[0].averageRating * 10) / 10, // Round to 1 decimal
            ratingsCount: result[0].count,
        });
    }
});
// Get pending feedbacks for a tutor
const getPendingFeedbacks = (tutorId, query) => __awaiter(void 0, void 0, void 0, function* () {
    const feedbackQuery = new QueryBuilder_1.default(tutorSessionFeedback_model_1.TutorSessionFeedback.find({
        tutorId: new mongoose_1.Types.ObjectId(tutorId),
        status: tutorSessionFeedback_interface_1.FEEDBACK_STATUS.PENDING,
    })
        .populate('sessionId', 'subject startTime endTime studentId')
        .populate('studentId', 'name email profilePicture'), query)
        .sort()
        .paginate()
        .fields();
    const data = yield feedbackQuery.modelQuery;
    const meta = yield feedbackQuery.getPaginationInfo();
    return { data, meta };
});
// Get all feedbacks for a tutor (submitted)
const getTutorFeedbacks = (tutorId, query) => __awaiter(void 0, void 0, void 0, function* () {
    const feedbackQuery = new QueryBuilder_1.default(tutorSessionFeedback_model_1.TutorSessionFeedback.find({
        tutorId: new mongoose_1.Types.ObjectId(tutorId),
        status: tutorSessionFeedback_interface_1.FEEDBACK_STATUS.SUBMITTED,
    })
        .populate('sessionId', 'subject startTime endTime')
        .populate('studentId', 'name email profilePicture'), query)
        .sort()
        .paginate()
        .fields();
    const data = yield feedbackQuery.modelQuery;
    const meta = yield feedbackQuery.getPaginationInfo();
    return { data, meta };
});
// Get feedback for a specific session
const getFeedbackBySession = (sessionId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const feedback = yield tutorSessionFeedback_model_1.TutorSessionFeedback.findOne({ sessionId })
        .populate('sessionId', 'subject startTime endTime tutorId studentId')
        .populate('studentId', 'name email profilePicture')
        .populate('tutorId', 'name email profilePicture');
    if (!feedback) {
        return null;
    }
    // Verify user is either the tutor or student of this session
    const session = yield session_model_1.Session.findById(sessionId);
    if (!session) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Session not found');
    }
    const isAuthorized = session.tutorId.toString() === userId || session.studentId.toString() === userId;
    if (!isAuthorized) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You are not authorized to view this feedback');
    }
    return feedback;
});
// Get feedbacks received by a student
const getStudentFeedbacks = (studentId, query) => __awaiter(void 0, void 0, void 0, function* () {
    const feedbackQuery = new QueryBuilder_1.default(tutorSessionFeedback_model_1.TutorSessionFeedback.find({
        studentId: new mongoose_1.Types.ObjectId(studentId),
        status: tutorSessionFeedback_interface_1.FEEDBACK_STATUS.SUBMITTED,
    })
        .populate('sessionId', 'subject startTime endTime')
        .populate('tutorId', 'name email profilePicture'), query)
        .sort()
        .paginate()
        .fields();
    const data = yield feedbackQuery.modelQuery;
    const meta = yield feedbackQuery.getPaginationInfo();
    return { data, meta };
});
// Get feedbacks due soon (for reminder cron job)
const getFeedbacksDueSoon = (daysUntilDue) => __awaiter(void 0, void 0, void 0, function* () {
    const now = new Date();
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + daysUntilDue);
    return tutorSessionFeedback_model_1.TutorSessionFeedback.find({
        status: tutorSessionFeedback_interface_1.FEEDBACK_STATUS.PENDING,
        dueDate: { $lte: targetDate },
    })
        .populate('tutorId', 'name email')
        .populate('sessionId', 'subject startTime')
        .populate('studentId', 'name');
});
// Get overdue feedbacks
const getOverdueFeedbacks = () => __awaiter(void 0, void 0, void 0, function* () {
    const now = new Date();
    return tutorSessionFeedback_model_1.TutorSessionFeedback.find({
        status: tutorSessionFeedback_interface_1.FEEDBACK_STATUS.PENDING,
        dueDate: { $lt: now },
    })
        .populate('tutorId', 'name email')
        .populate('sessionId', 'subject startTime')
        .populate('studentId', 'name');
});
exports.TutorSessionFeedbackService = {
    createPendingFeedback,
    submitFeedback,
    updateTutorRating,
    getPendingFeedbacks,
    getTutorFeedbacks,
    getFeedbackBySession,
    getStudentFeedbacks,
    getFeedbacksDueSoon,
    getOverdueFeedbacks,
};
