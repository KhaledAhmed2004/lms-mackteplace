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
exports.SessionReviewService = void 0;
const mongoose_1 = require("mongoose");
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const http_status_codes_1 = require("http-status-codes");
const sessionReview_model_1 = require("./sessionReview.model");
const session_model_1 = require("../session/session.model");
const session_interface_1 = require("../session/session.interface");
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
/**
 * Create a new session review
 */
const createReview = (studentId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    // Verify session exists and is completed
    const session = yield session_model_1.Session.findById(payload.sessionId);
    if (!session) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Session not found');
    }
    if (session.status !== session_interface_1.SESSION_STATUS.COMPLETED) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Can only review completed sessions');
    }
    // Verify student owns the session
    if (session.studentId.toString() !== studentId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You can only review your own sessions');
    }
    // Check if review already exists
    const existingReview = yield sessionReview_model_1.SessionReview.findOne({
        sessionId: payload.sessionId,
    });
    if (existingReview) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Review already exists for this session');
    }
    // Create review
    const review = yield sessionReview_model_1.SessionReview.create(Object.assign(Object.assign({}, payload), { studentId: new mongoose_1.Types.ObjectId(studentId), tutorId: session.tutorId }));
    return review;
});
/**
 * Get student's reviews
 */
const getMyReviews = (studentId, query) => __awaiter(void 0, void 0, void 0, function* () {
    const reviewQuery = new QueryBuilder_1.default(sessionReview_model_1.SessionReview.find({ studentId })
        .populate('sessionId', 'subject startTime endTime')
        .populate('tutorId', 'name email'), query)
        .filter()
        .sort()
        .paginate()
        .fields();
    const result = yield reviewQuery.modelQuery;
    const meta = yield reviewQuery.countTotal();
    return { data: result, meta };
});
/**
 * Get tutor's reviews (public only or all for admin)
 */
const getTutorReviews = (tutorId_1, query_1, ...args_1) => __awaiter(void 0, [tutorId_1, query_1, ...args_1], void 0, function* (tutorId, query, isAdmin = false) {
    const baseQuery = isAdmin
        ? { tutorId }
        : { tutorId, isPublic: true };
    const reviewQuery = new QueryBuilder_1.default(sessionReview_model_1.SessionReview.find(baseQuery)
        .populate('studentId', 'name')
        .populate('sessionId', 'subject startTime'), query)
        .filter()
        .sort()
        .paginate()
        .fields();
    const result = yield reviewQuery.modelQuery;
    const meta = yield reviewQuery.countTotal();
    return { data: result, meta };
});
/**
 * Get single review
 */
const getSingleReview = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const review = yield sessionReview_model_1.SessionReview.findById(id)
        .populate('studentId', 'name email')
        .populate('tutorId', 'name email')
        .populate('sessionId', 'subject startTime endTime');
    if (!review) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Review not found');
    }
    return review;
});
/**
 * Update review (only by student who created it)
 */
const updateReview = (id, studentId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const review = yield sessionReview_model_1.SessionReview.findById(id);
    if (!review) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Review not found');
    }
    // Verify ownership
    if (review.studentId.toString() !== studentId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You can only update your own reviews');
    }
    // Update fields
    Object.assign(review, payload);
    review.isEdited = true;
    review.editedAt = new Date();
    yield review.save();
    return review;
});
/**
 * Delete review (only by student who created it)
 */
const deleteReview = (id, studentId) => __awaiter(void 0, void 0, void 0, function* () {
    const review = yield sessionReview_model_1.SessionReview.findById(id);
    if (!review) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Review not found');
    }
    // Verify ownership
    if (review.studentId.toString() !== studentId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You can only delete your own reviews');
    }
    yield sessionReview_model_1.SessionReview.findByIdAndDelete(id);
    return review;
});
/**
 * Get tutor's review statistics
 */
const getTutorStats = (tutorId) => __awaiter(void 0, void 0, void 0, function* () {
    const reviews = yield sessionReview_model_1.SessionReview.find({ tutorId, isPublic: true });
    if (reviews.length === 0) {
        return {
            tutorId: new mongoose_1.Types.ObjectId(tutorId),
            totalReviews: 0,
            averageOverallRating: 0,
            averageTeachingQuality: 0,
            averageCommunication: 0,
            averagePunctuality: 0,
            averagePreparedness: 0,
            wouldRecommendPercentage: 0,
            ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        };
    }
    const totalReviews = reviews.length;
    // Calculate averages
    const averageOverallRating = reviews.reduce((sum, r) => sum + r.overallRating, 0) / totalReviews;
    const averageTeachingQuality = reviews.reduce((sum, r) => sum + r.teachingQuality, 0) / totalReviews;
    const averageCommunication = reviews.reduce((sum, r) => sum + r.communication, 0) / totalReviews;
    const averagePunctuality = reviews.reduce((sum, r) => sum + r.punctuality, 0) / totalReviews;
    const averagePreparedness = reviews.reduce((sum, r) => sum + r.preparedness, 0) / totalReviews;
    // Calculate recommendation percentage
    const wouldRecommendCount = reviews.filter(r => r.wouldRecommend).length;
    const wouldRecommendPercentage = (wouldRecommendCount / totalReviews) * 100;
    // Calculate rating distribution
    const ratingDistribution = reviews.reduce((dist, r) => {
        const rating = Math.floor(r.overallRating);
        dist[rating]++;
        return dist;
    }, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
    return {
        tutorId: new mongoose_1.Types.ObjectId(tutorId),
        totalReviews,
        averageOverallRating: Math.round(averageOverallRating * 10) / 10,
        averageTeachingQuality: Math.round(averageTeachingQuality * 10) / 10,
        averageCommunication: Math.round(averageCommunication * 10) / 10,
        averagePunctuality: Math.round(averagePunctuality * 10) / 10,
        averagePreparedness: Math.round(averagePreparedness * 10) / 10,
        wouldRecommendPercentage: Math.round(wouldRecommendPercentage),
        ratingDistribution,
    };
});
/**
 * Toggle review visibility (Admin only)
 */
const toggleVisibility = (id, isPublic) => __awaiter(void 0, void 0, void 0, function* () {
    const review = yield sessionReview_model_1.SessionReview.findById(id);
    if (!review) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Review not found');
    }
    review.isPublic = isPublic;
    yield review.save();
    return review;
});
exports.SessionReviewService = {
    createReview,
    getMyReviews,
    getTutorReviews,
    getSingleReview,
    updateReview,
    deleteReview,
    getTutorStats,
    toggleVisibility,
};
