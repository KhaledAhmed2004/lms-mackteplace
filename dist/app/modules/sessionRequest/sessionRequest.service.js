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
exports.SessionRequestService = void 0;
const http_status_codes_1 = require("http-status-codes");
const mongoose_1 = require("mongoose");
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const user_model_1 = require("../user/user.model");
const user_1 = require("../../../enums/user");
const chat_model_1 = require("../chat/chat.model");
const subject_model_1 = require("../subject/subject.model");
const trialRequest_model_1 = require("../trialRequest/trialRequest.model");
const trialRequest_interface_1 = require("../trialRequest/trialRequest.interface");
const sessionRequest_interface_1 = require("./sessionRequest.interface");
const sessionRequest_model_1 = require("./sessionRequest.model");
/**
 * Create session request (Returning Student only)
 * Must be logged in and have completed trial
 */
const createSessionRequest = (studentId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // Validate subject exists
    const subjectExists = yield subject_model_1.Subject.findById(payload.subject);
    if (!subjectExists) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Subject not found');
    }
    // Verify student exists and has completed trial
    const student = yield user_model_1.User.findById(studentId);
    if (!student) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Student not found');
    }
    if (student.role !== user_1.USER_ROLES.STUDENT) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only students can create session requests');
    }
    // Must have completed trial to create session request
    if (!((_a = student.studentProfile) === null || _a === void 0 ? void 0 : _a.hasCompletedTrial)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'You must complete a trial session before requesting more sessions. Please create a trial request first.');
    }
    // Check if student has pending session request
    const pendingSessionRequest = yield sessionRequest_model_1.SessionRequest.findOne({
        studentId: new mongoose_1.Types.ObjectId(studentId),
        status: sessionRequest_interface_1.SESSION_REQUEST_STATUS.PENDING,
    });
    if (pendingSessionRequest) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'You already have a pending session request. Please wait for a tutor to accept or cancel it.');
    }
    // Also check for pending trial request (can't have both)
    const pendingTrialRequest = yield trialRequest_model_1.TrialRequest.findOne({
        studentId: new mongoose_1.Types.ObjectId(studentId),
        status: trialRequest_interface_1.TRIAL_REQUEST_STATUS.PENDING,
    });
    if (pendingTrialRequest) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'You have a pending trial request. Please wait for it to be accepted or cancel it first.');
    }
    // Create session request
    const sessionRequest = yield sessionRequest_model_1.SessionRequest.create(Object.assign(Object.assign({}, payload), { studentId: new mongoose_1.Types.ObjectId(studentId), status: sessionRequest_interface_1.SESSION_REQUEST_STATUS.PENDING }));
    // Increment student session request count
    yield user_model_1.User.findByIdAndUpdate(studentId, {
        $inc: { 'studentProfile.sessionRequestsCount': 1 },
    });
    // TODO: Send real-time notification to matching tutors
    // TODO: Send confirmation email to student
    return sessionRequest;
});
/**
 * Get matching session requests for tutor
 * Shows PENDING requests in tutor's subjects
 */
const getMatchingSessionRequests = (tutorId, query) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    // Get tutor's subjects
    const tutor = yield user_model_1.User.findById(tutorId);
    if (!tutor || tutor.role !== user_1.USER_ROLES.TUTOR) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only tutors can view matching requests');
    }
    if (!((_a = tutor.tutorProfile) === null || _a === void 0 ? void 0 : _a.isVerified)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only verified tutors can view session requests');
    }
    const tutorSubjects = ((_b = tutor.tutorProfile) === null || _b === void 0 ? void 0 : _b.subjects) || [];
    // Find matching requests
    const requestQuery = new QueryBuilder_1.default(sessionRequest_model_1.SessionRequest.find({
        subject: { $in: tutorSubjects },
        status: sessionRequest_interface_1.SESSION_REQUEST_STATUS.PENDING,
        expiresAt: { $gt: new Date() }, // Not expired
    })
        .populate('studentId', 'name profilePicture studentProfile')
        .populate('subject', 'name icon'), query)
        .filter()
        .sort()
        .paginate()
        .fields();
    const result = yield requestQuery.modelQuery;
    const meta = yield requestQuery.getPaginationInfo();
    return {
        meta,
        data: result,
    };
});
/**
 * Get student's own session requests
 */
const getMySessionRequests = (studentId, query) => __awaiter(void 0, void 0, void 0, function* () {
    const requestQuery = new QueryBuilder_1.default(sessionRequest_model_1.SessionRequest.find({ studentId: new mongoose_1.Types.ObjectId(studentId) })
        .populate('acceptedTutorId', 'name profilePicture')
        .populate('subject', 'name icon')
        .populate('chatId'), query)
        .filter()
        .sort()
        .paginate()
        .fields();
    const result = yield requestQuery.modelQuery;
    const meta = yield requestQuery.getPaginationInfo();
    return {
        meta,
        data: result,
    };
});
/**
 * Get all session requests (Admin)
 */
const getAllSessionRequests = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const requestQuery = new QueryBuilder_1.default(sessionRequest_model_1.SessionRequest.find()
        .populate('studentId', 'name email profilePicture studentProfile')
        .populate('acceptedTutorId', 'name email profilePicture')
        .populate('subject', 'name icon')
        .populate('chatId'), query)
        .search(['description'])
        .filter()
        .sort()
        .paginate()
        .fields();
    const result = yield requestQuery.modelQuery;
    const meta = yield requestQuery.getPaginationInfo();
    return {
        meta,
        data: result,
    };
});
/**
 * Get single session request
 */
const getSingleSessionRequest = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const request = yield sessionRequest_model_1.SessionRequest.findById(id)
        .populate('studentId', 'name email profilePicture phone studentProfile')
        .populate('acceptedTutorId', 'name email profilePicture phone')
        .populate('subject', 'name icon description')
        .populate('chatId');
    if (!request) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Session request not found');
    }
    return request;
});
/**
 * Accept session request (Tutor)
 * Creates chat and connects student with tutor
 */
const acceptSessionRequest = (requestId, tutorId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    // Verify request exists and is pending
    const request = yield sessionRequest_model_1.SessionRequest.findById(requestId).populate('subject', 'name');
    if (!request) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Session request not found');
    }
    if (request.status !== sessionRequest_interface_1.SESSION_REQUEST_STATUS.PENDING) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'This session request is no longer available');
    }
    // Check if expired
    if (new Date() > request.expiresAt) {
        request.status = sessionRequest_interface_1.SESSION_REQUEST_STATUS.EXPIRED;
        yield request.save();
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'This session request has expired');
    }
    // Verify tutor
    const tutor = yield user_model_1.User.findById(tutorId);
    if (!tutor || tutor.role !== user_1.USER_ROLES.TUTOR) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only tutors can accept requests');
    }
    if (!((_a = tutor.tutorProfile) === null || _a === void 0 ? void 0 : _a.isVerified)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only verified tutors can accept requests');
    }
    // Verify tutor teaches this subject (compare ObjectId)
    const tutorSubjectIds = ((_c = (_b = tutor.tutorProfile) === null || _b === void 0 ? void 0 : _b.subjects) === null || _c === void 0 ? void 0 : _c.map(s => s.toString())) || [];
    if (!tutorSubjectIds.includes(request.subject.toString())) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'You do not teach this subject');
    }
    // Create chat between student and tutor
    const chat = yield chat_model_1.Chat.create({
        participants: [request.studentId, new mongoose_1.Types.ObjectId(tutorId)],
        sessionRequestId: request._id, // Link chat to session request
    });
    // Update session request
    request.status = sessionRequest_interface_1.SESSION_REQUEST_STATUS.ACCEPTED;
    request.acceptedTutorId = new mongoose_1.Types.ObjectId(tutorId);
    request.chatId = chat._id;
    request.acceptedAt = new Date();
    yield request.save();
    // TODO: Send real-time notification to student
    // TODO: Send email to student
    return request;
});
/**
 * Cancel session request (Student)
 */
const cancelSessionRequest = (requestId, studentId, cancellationReason) => __awaiter(void 0, void 0, void 0, function* () {
    const request = yield sessionRequest_model_1.SessionRequest.findById(requestId);
    if (!request) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Session request not found');
    }
    // Verify ownership
    if (request.studentId.toString() !== studentId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You can only cancel your own session requests');
    }
    // Can only cancel PENDING requests
    if (request.status !== sessionRequest_interface_1.SESSION_REQUEST_STATUS.PENDING) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Only pending session requests can be cancelled');
    }
    // Update request
    request.status = sessionRequest_interface_1.SESSION_REQUEST_STATUS.CANCELLED;
    request.cancellationReason = cancellationReason;
    request.cancelledAt = new Date();
    yield request.save();
    return request;
});
/**
 * Auto-expire session requests (Cron job)
 * Should be called periodically to expire old requests
 */
const expireOldRequests = () => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield sessionRequest_model_1.SessionRequest.updateMany({
        status: sessionRequest_interface_1.SESSION_REQUEST_STATUS.PENDING,
        expiresAt: { $lt: new Date() },
    }, {
        $set: { status: sessionRequest_interface_1.SESSION_REQUEST_STATUS.EXPIRED },
    });
    return result.modifiedCount;
});
exports.SessionRequestService = {
    createSessionRequest,
    getMatchingSessionRequests,
    getMySessionRequests,
    getAllSessionRequests,
    getSingleSessionRequest,
    acceptSessionRequest,
    cancelSessionRequest,
    expireOldRequests,
};
