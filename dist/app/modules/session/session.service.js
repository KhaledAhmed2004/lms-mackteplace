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
exports.SessionService = void 0;
const http_status_codes_1 = require("http-status-codes");
const mongoose_1 = require("mongoose");
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const user_model_1 = require("../user/user.model");
const chat_model_1 = require("../chat/chat.model");
const message_model_1 = require("../message/message.model");
const user_1 = require("../../../enums/user");
const session_interface_1 = require("./session.interface");
const session_model_1 = require("./session.model");
const tutorSessionFeedback_service_1 = require("../tutorSessionFeedback/tutorSessionFeedback.service");
const user_service_1 = require("../user/user.service");
const activityLog_service_1 = require("../activityLog/activityLog.service");
// import { generateGoogleMeetLink } from '../../../helpers/googleMeetHelper'; // Phase 8
/**
 * Propose session (Tutor sends proposal in chat)
 * Creates a message with type: 'session_proposal'
 */
const proposeSession = (tutorId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    // Verify tutor
    const tutor = yield user_model_1.User.findById(tutorId);
    if (!tutor || tutor.role !== user_1.USER_ROLES.TUTOR) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only tutors can propose sessions');
    }
    if (!((_a = tutor.tutorProfile) === null || _a === void 0 ? void 0 : _a.isVerified)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only verified tutors can propose sessions');
    }
    // Verify chat exists and tutor is participant
    const chat = yield chat_model_1.Chat.findById(payload.chatId);
    if (!chat) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Chat not found');
    }
    const isTutorParticipant = chat.participants.some((p) => p.toString() === tutorId);
    if (!isTutorParticipant) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You are not a participant in this chat');
    }
    // Get student from chat
    const studentId = chat.participants.find((p) => p.toString() !== tutorId);
    if (!studentId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'No student found in chat');
    }
    const student = yield user_model_1.User.findById(studentId);
    if (!student) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Student not found');
    }
    // Calculate duration
    const startTime = new Date(payload.startTime);
    const endTime = new Date(payload.endTime);
    const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60); // minutes
    // Get price based on student's subscription tier
    let pricePerHour = 30; // Default: Flexible
    if (((_b = student.studentProfile) === null || _b === void 0 ? void 0 : _b.currentPlan) === 'REGULAR') {
        pricePerHour = 28;
    }
    else if (((_c = student.studentProfile) === null || _c === void 0 ? void 0 : _c.currentPlan) === 'LONG_TERM') {
        pricePerHour = 25;
    }
    const totalPrice = (pricePerHour * duration) / 60;
    // Create session proposal message
    // expiresAt = startTime (proposal expires when session time passes)
    const message = yield message_model_1.Message.create({
        chatId: new mongoose_1.Types.ObjectId(payload.chatId),
        sender: new mongoose_1.Types.ObjectId(tutorId),
        type: 'session_proposal',
        text: `Session proposal: ${payload.subject}`,
        sessionProposal: {
            subject: payload.subject,
            startTime,
            endTime,
            duration,
            price: totalPrice,
            description: payload.description,
            status: 'PROPOSED',
            expiresAt: startTime, // Expires when session start time passes
        },
    });
    // TODO: Send real-time notification to student
    // io.to(studentId.toString()).emit('sessionProposal', {
    //   tutorName: tutor.name,
    //   subject: payload.subject,
    //   startTime,
    //   totalPrice,
    //   messageId: message._id
    // });
    return message;
});
/**
 * Accept session proposal (Student accepts)
 * Creates actual session and Google Meet link
 */
const acceptSessionProposal = (messageId, studentId) => __awaiter(void 0, void 0, void 0, function* () {
    // Get proposal message
    const message = yield message_model_1.Message.findById(messageId).populate('chatId');
    if (!message) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Session proposal not found');
    }
    if (message.type !== 'session_proposal' || !message.sessionProposal) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'This is not a session proposal');
    }
    // Verify student is participant
    const chat = message.chatId;
    const isStudentParticipant = chat.participants.some((p) => p.toString() === studentId);
    if (!isStudentParticipant) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You are not a participant in this chat');
    }
    // Check if proposal is still valid
    if (message.sessionProposal.status !== 'PROPOSED') {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, `Session proposal is already ${message.sessionProposal.status.toLowerCase()}`);
    }
    // Check if expired
    if (new Date() > message.sessionProposal.expiresAt) {
        message.sessionProposal.status = 'EXPIRED';
        yield message.save();
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Session proposal has expired');
    }
    // Get tutor ID (sender of proposal)
    const tutorId = message.sender;
    // Check if this is a trial session (chat linked to a trial request)
    const trialRequestId = chat.trialRequestId;
    const isTrial = !!trialRequestId;
    // Create session
    const session = yield session_model_1.Session.create({
        studentId: new mongoose_1.Types.ObjectId(studentId),
        tutorId,
        subject: message.sessionProposal.subject,
        description: message.sessionProposal.description,
        startTime: message.sessionProposal.startTime,
        endTime: message.sessionProposal.endTime,
        duration: message.sessionProposal.duration,
        pricePerHour: message.sessionProposal.price / (message.sessionProposal.duration / 60),
        totalPrice: message.sessionProposal.price,
        status: session_interface_1.SESSION_STATUS.SCHEDULED,
        messageId: message._id,
        chatId: message.chatId,
        isTrial,
        trialRequestId,
    });
    // TODO: Generate Google Meet link
    // session.googleMeetLink = await generateGoogleMeetLink({
    //   summary: `Tutoring Session: ${session.subject}`,
    //   description: session.description,
    //   startTime: session.startTime,
    //   endTime: session.endTime,
    //   attendees: [student.email, tutor.email]
    // });
    // await session.save();
    // Update proposal message
    message.sessionProposal.status = 'ACCEPTED';
    message.sessionProposal.sessionId = session._id;
    yield message.save();
    // Log activity - Session scheduled
    const student = yield user_model_1.User.findById(studentId);
    activityLog_service_1.ActivityLogService.logActivity({
        userId: new mongoose_1.Types.ObjectId(studentId),
        actionType: 'SESSION_SCHEDULED',
        title: 'Session Scheduled',
        description: `${(student === null || student === void 0 ? void 0 : student.name) || 'Student'} scheduled a ${session.subject} session`,
        entityType: 'SESSION',
        entityId: session._id,
        status: 'success',
    });
    // TODO: Send notifications
    // io.to(tutorId.toString()).emit('sessionAccepted', {
    //   studentName: student.name,
    //   sessionId: session._id,
    //   meetLink: session.googleMeetLink
    // });
    return session;
});
/**
 * Reject session proposal (Student rejects)
 */
const rejectSessionProposal = (messageId, studentId, rejectionReason) => __awaiter(void 0, void 0, void 0, function* () {
    const message = yield message_model_1.Message.findById(messageId).populate('chatId');
    if (!message) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Session proposal not found');
    }
    if (message.type !== 'session_proposal' || !message.sessionProposal) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'This is not a session proposal');
    }
    // Verify student is participant
    const chat = message.chatId;
    const isStudentParticipant = chat.participants.some((p) => p.toString() === studentId);
    if (!isStudentParticipant) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You are not a participant in this chat');
    }
    // Check if proposal can be rejected
    if (message.sessionProposal.status !== 'PROPOSED') {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, `Session proposal is already ${message.sessionProposal.status.toLowerCase()}`);
    }
    // Update proposal
    message.sessionProposal.status = 'REJECTED';
    message.sessionProposal.rejectionReason = rejectionReason;
    yield message.save();
    // TODO: Notify tutor
    // io.to(message.sender.toString()).emit('sessionRejected', {
    //   rejectionReason
    // });
    return message;
});
/**
 * Get all sessions with filtering
 */
const getAllSessions = (query, userId, userRole) => __awaiter(void 0, void 0, void 0, function* () {
    let filter = {};
    // Filter based on role
    if (userRole === user_1.USER_ROLES.STUDENT) {
        filter = { studentId: new mongoose_1.Types.ObjectId(userId) };
    }
    else if (userRole === user_1.USER_ROLES.TUTOR) {
        filter = { tutorId: new mongoose_1.Types.ObjectId(userId) };
    }
    // SUPER_ADMIN sees all
    const sessionQuery = new QueryBuilder_1.default(session_model_1.Session.find(filter)
        .populate('studentId', 'name email profilePicture')
        .populate('tutorId', 'name email profilePicture'), query)
        .filter()
        .sort()
        .paginate()
        .fields();
    const result = yield sessionQuery.modelQuery;
    const meta = yield sessionQuery.getPaginationInfo();
    return {
        meta,
        data: result,
    };
});
/**
 * Get single session
 */
const getSingleSession = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield session_model_1.Session.findById(id)
        .populate('studentId', 'name email profilePicture phone')
        .populate('tutorId', 'name email profilePicture phone')
        .populate('chatId')
        .populate('messageId')
        .populate('reviewId');
    if (!session) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Session not found');
    }
    return session;
});
/**
 * Cancel session (Student or Tutor)
 */
const cancelSession = (sessionId, userId, cancellationReason) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield session_model_1.Session.findById(sessionId);
    if (!session) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Session not found');
    }
    // Verify user is student or tutor
    if (session.studentId.toString() !== userId &&
        session.tutorId.toString() !== userId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You are not authorized to cancel this session');
    }
    // Can only cancel SCHEDULED sessions
    if (session.status !== session_interface_1.SESSION_STATUS.SCHEDULED) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, `Cannot cancel session with status: ${session.status}`);
    }
    // Update session
    session.status = session_interface_1.SESSION_STATUS.CANCELLED;
    session.cancellationReason = cancellationReason;
    session.cancelledBy = new mongoose_1.Types.ObjectId(userId);
    session.cancelledAt = new Date();
    yield session.save();
    // Log activity - Session cancelled
    const cancellingUser = yield user_model_1.User.findById(userId);
    activityLog_service_1.ActivityLogService.logActivity({
        userId: new mongoose_1.Types.ObjectId(userId),
        actionType: 'SESSION_CANCELLED',
        title: 'Session Cancelled',
        description: `${(cancellingUser === null || cancellingUser === void 0 ? void 0 : cancellingUser.name) || 'User'} cancelled a ${session.subject} session`,
        entityType: 'SESSION',
        entityId: session._id,
        status: 'warning',
    });
    // TODO: Send notifications
    // TODO: Cancel Google Calendar event
    return session;
});
/**
 * Mark session as completed (Manual - for testing, cron job automates this)
 */
const markAsCompleted = (sessionId) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield session_model_1.Session.findById(sessionId);
    if (!session) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Session not found');
    }
    if (session.status === session_interface_1.SESSION_STATUS.COMPLETED) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Session is already completed');
    }
    // Update session
    session.status = session_interface_1.SESSION_STATUS.COMPLETED;
    session.completedAt = new Date();
    yield session.save();
    // TODO: Send review request email to student
    return session;
});
/**
 * Auto-complete sessions (Cron job)
 * Marks sessions as COMPLETED after endTime passes
 */
const autoCompleteSessions = () => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield session_model_1.Session.updateMany({
        status: session_interface_1.SESSION_STATUS.SCHEDULED,
        endTime: { $lt: new Date() },
    }, {
        $set: {
            status: session_interface_1.SESSION_STATUS.COMPLETED,
            completedAt: new Date(),
        },
    });
    return result.modifiedCount;
});
/**
 * Get upcoming sessions for user
 * Includes: SCHEDULED, STARTING_SOON, IN_PROGRESS, AWAITING_RESPONSE, RESCHEDULE_REQUESTED
 */
const getUpcomingSessions = (userId, userRole, query) => __awaiter(void 0, void 0, void 0, function* () {
    const now = new Date();
    const filterField = userRole === user_1.USER_ROLES.STUDENT ? 'studentId' : 'tutorId';
    const sessionQuery = new QueryBuilder_1.default(session_model_1.Session.find({
        [filterField]: new mongoose_1.Types.ObjectId(userId),
        status: {
            $in: [
                session_interface_1.SESSION_STATUS.SCHEDULED,
                session_interface_1.SESSION_STATUS.STARTING_SOON,
                session_interface_1.SESSION_STATUS.IN_PROGRESS,
                session_interface_1.SESSION_STATUS.AWAITING_RESPONSE,
                session_interface_1.SESSION_STATUS.RESCHEDULE_REQUESTED,
            ],
        },
        startTime: { $gte: now },
    })
        .populate('studentId', 'name email profilePicture')
        .populate('tutorId', 'name email profilePicture averageRating')
        .populate('reviewId')
        .populate('tutorFeedbackId'), query)
        .sort()
        .paginate()
        .fields();
    const result = yield sessionQuery.modelQuery;
    const meta = yield sessionQuery.getPaginationInfo();
    return { data: result, meta };
});
/**
 * Get completed sessions for user
 * Includes: COMPLETED, CANCELLED, EXPIRED, NO_SHOW
 * Also includes review status information
 */
const getCompletedSessions = (userId, userRole, query) => __awaiter(void 0, void 0, void 0, function* () {
    const filterField = userRole === user_1.USER_ROLES.STUDENT ? 'studentId' : 'tutorId';
    const sessionQuery = new QueryBuilder_1.default(session_model_1.Session.find({
        [filterField]: new mongoose_1.Types.ObjectId(userId),
        status: {
            $in: [
                session_interface_1.SESSION_STATUS.COMPLETED,
                session_interface_1.SESSION_STATUS.CANCELLED,
                session_interface_1.SESSION_STATUS.EXPIRED,
                session_interface_1.SESSION_STATUS.NO_SHOW,
            ],
        },
    })
        .populate('studentId', 'name email profilePicture')
        .populate('tutorId', 'name email profilePicture averageRating')
        .populate('reviewId')
        .populate('tutorFeedbackId'), query)
        .sort()
        .paginate()
        .fields();
    const result = yield sessionQuery.modelQuery;
    const meta = yield sessionQuery.getPaginationInfo();
    // Add review status flags
    const sessionsWithReviewStatus = result.map((session) => {
        const sessionObj = session.toObject();
        return Object.assign(Object.assign({}, sessionObj), { studentReviewStatus: session.reviewId ? 'COMPLETED' : 'PENDING', tutorFeedbackStatus: session.tutorFeedbackId ? 'COMPLETED' : 'PENDING' });
    });
    return { data: sessionsWithReviewStatus, meta };
});
/**
 * Request session reschedule
 * Can be requested by student or tutor up to 10 minutes before start
 */
const requestReschedule = (sessionId, userId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield session_model_1.Session.findById(sessionId);
    if (!session) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Session not found');
    }
    // Verify user is student or tutor
    const isStudent = session.studentId.toString() === userId;
    const isTutor = session.tutorId.toString() === userId;
    if (!isStudent && !isTutor) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You are not authorized to reschedule this session');
    }
    // Check if session can be rescheduled
    if (session.status !== session_interface_1.SESSION_STATUS.SCHEDULED &&
        session.status !== session_interface_1.SESSION_STATUS.STARTING_SOON) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, `Cannot reschedule session with status: ${session.status}`);
    }
    // Check if already has pending reschedule request
    if (session.rescheduleRequest &&
        session.rescheduleRequest.status === session_interface_1.RESCHEDULE_STATUS.PENDING) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'This session already has a pending reschedule request');
    }
    // Check if within 10 minutes of start
    const now = new Date();
    const tenMinutesBefore = new Date(session.startTime.getTime() - 10 * 60 * 1000);
    if (now >= tenMinutesBefore) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Cannot reschedule within 10 minutes of session start');
    }
    // Calculate new end time (maintain same duration)
    const newStartTime = new Date(payload.newStartTime);
    const newEndTime = new Date(newStartTime.getTime() + session.duration * 60 * 1000);
    // Validate new time is in future
    if (newStartTime <= now) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'New start time must be in the future');
    }
    // Store previous times
    session.previousStartTime = session.startTime;
    session.previousEndTime = session.endTime;
    // Create reschedule request
    session.rescheduleRequest = {
        requestedBy: new mongoose_1.Types.ObjectId(userId),
        requestedAt: now,
        newStartTime,
        newEndTime,
        reason: payload.reason,
        status: session_interface_1.RESCHEDULE_STATUS.PENDING,
    };
    session.status = session_interface_1.SESSION_STATUS.RESCHEDULE_REQUESTED;
    yield session.save();
    // TODO: Send notification to other party
    // const otherPartyId = isStudent ? session.tutorId : session.studentId;
    // io.to(otherPartyId.toString()).emit('rescheduleRequested', {...});
    return session;
});
/**
 * Approve reschedule request
 */
const approveReschedule = (sessionId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield session_model_1.Session.findById(sessionId);
    if (!session) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Session not found');
    }
    // Verify user is the OTHER party (not the one who requested)
    const isStudent = session.studentId.toString() === userId;
    const isTutor = session.tutorId.toString() === userId;
    if (!isStudent && !isTutor) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You are not authorized to approve this reschedule');
    }
    if (!session.rescheduleRequest) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'No reschedule request found');
    }
    if (session.rescheduleRequest.status !== session_interface_1.RESCHEDULE_STATUS.PENDING) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, `Reschedule request is already ${session.rescheduleRequest.status.toLowerCase()}`);
    }
    // Verify approver is NOT the requester
    if (session.rescheduleRequest.requestedBy.toString() === userId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You cannot approve your own reschedule request');
    }
    // Update session times
    session.startTime = session.rescheduleRequest.newStartTime;
    session.endTime = session.rescheduleRequest.newEndTime;
    // Update reschedule request
    session.rescheduleRequest.status = session_interface_1.RESCHEDULE_STATUS.APPROVED;
    session.rescheduleRequest.respondedAt = new Date();
    session.rescheduleRequest.respondedBy = new mongoose_1.Types.ObjectId(userId);
    // Reset status to SCHEDULED
    session.status = session_interface_1.SESSION_STATUS.SCHEDULED;
    yield session.save();
    // TODO: Update Google Calendar event
    // TODO: Send notification to requester
    return session;
});
/**
 * Reject reschedule request
 */
const rejectReschedule = (sessionId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield session_model_1.Session.findById(sessionId);
    if (!session) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Session not found');
    }
    // Verify user is the OTHER party
    const isStudent = session.studentId.toString() === userId;
    const isTutor = session.tutorId.toString() === userId;
    if (!isStudent && !isTutor) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You are not authorized to reject this reschedule');
    }
    if (!session.rescheduleRequest) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'No reschedule request found');
    }
    if (session.rescheduleRequest.status !== session_interface_1.RESCHEDULE_STATUS.PENDING) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, `Reschedule request is already ${session.rescheduleRequest.status.toLowerCase()}`);
    }
    // Verify rejector is NOT the requester
    if (session.rescheduleRequest.requestedBy.toString() === userId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You cannot reject your own reschedule request');
    }
    // Update reschedule request
    session.rescheduleRequest.status = session_interface_1.RESCHEDULE_STATUS.REJECTED;
    session.rescheduleRequest.respondedAt = new Date();
    session.rescheduleRequest.respondedBy = new mongoose_1.Types.ObjectId(userId);
    // Reset status to SCHEDULED (keep original times)
    session.status = session_interface_1.SESSION_STATUS.SCHEDULED;
    yield session.save();
    // TODO: Send notification to requester
    return session;
});
/**
 * Session status auto-transitions (Cron job)
 * SCHEDULED -> STARTING_SOON (10 min before)
 * STARTING_SOON -> IN_PROGRESS (at start time)
 * IN_PROGRESS -> EXPIRED (at end time if not completed)
 */
const autoTransitionSessionStatuses = () => __awaiter(void 0, void 0, void 0, function* () {
    const now = new Date();
    const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);
    // SCHEDULED -> STARTING_SOON (10 minutes before start)
    const startingSoonResult = yield session_model_1.Session.updateMany({
        status: session_interface_1.SESSION_STATUS.SCHEDULED,
        startTime: { $lte: tenMinutesFromNow, $gt: now },
    }, { $set: { status: session_interface_1.SESSION_STATUS.STARTING_SOON } });
    // STARTING_SOON/SCHEDULED -> IN_PROGRESS (at start time)
    const inProgressResult = yield session_model_1.Session.updateMany({
        status: { $in: [session_interface_1.SESSION_STATUS.SCHEDULED, session_interface_1.SESSION_STATUS.STARTING_SOON] },
        startTime: { $lte: now },
        endTime: { $gt: now },
    }, {
        $set: {
            status: session_interface_1.SESSION_STATUS.IN_PROGRESS,
            startedAt: now,
        },
    });
    // IN_PROGRESS -> EXPIRED (at end time if not manually completed)
    const expiredResult = yield session_model_1.Session.updateMany({
        status: session_interface_1.SESSION_STATUS.IN_PROGRESS,
        endTime: { $lte: now },
    }, {
        $set: {
            status: session_interface_1.SESSION_STATUS.EXPIRED,
            expiredAt: now,
        },
    });
    return {
        startingSoon: startingSoonResult.modifiedCount,
        inProgress: inProgressResult.modifiedCount,
        expired: expiredResult.modifiedCount,
    };
});
/**
 * Mark session as completed (Enhanced - with tutor feedback creation)
 */
const markAsCompletedEnhanced = (sessionId) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield session_model_1.Session.findById(sessionId);
    if (!session) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Session not found');
    }
    if (session.status === session_interface_1.SESSION_STATUS.COMPLETED) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Session is already completed');
    }
    // Update session
    session.status = session_interface_1.SESSION_STATUS.COMPLETED;
    session.completedAt = new Date();
    yield session.save();
    // Create pending tutor feedback record
    try {
        yield tutorSessionFeedback_service_1.TutorSessionFeedbackService.createPendingFeedback(sessionId, session.tutorId.toString(), session.studentId.toString(), session.completedAt);
    }
    catch (_a) {
        // Feedback creation failed, but session is still completed
        // Log error but don't fail the completion
    }
    // Update tutor level after session completion
    try {
        yield user_service_1.UserService.updateTutorLevelAfterSession(session.tutorId.toString());
    }
    catch (_b) {
        // Level update failed, but session is still completed
        // Log error but don't fail the completion
    }
    // Log activity - Session completed
    const tutor = yield user_model_1.User.findById(session.tutorId);
    const student = yield user_model_1.User.findById(session.studentId);
    activityLog_service_1.ActivityLogService.logActivity({
        userId: session.studentId,
        actionType: 'SESSION_COMPLETED',
        title: 'Session Completed',
        description: `${(student === null || student === void 0 ? void 0 : student.name) || 'Student'} completed a ${session.subject} session with ${(tutor === null || tutor === void 0 ? void 0 : tutor.name) || 'Tutor'}`,
        entityType: 'SESSION',
        entityId: session._id,
        status: 'success',
    });
    // TODO: Send review request email to student
    // TODO: Send feedback reminder to tutor
    return session;
});
exports.SessionService = {
    proposeSession,
    acceptSessionProposal,
    rejectSessionProposal,
    getAllSessions,
    getSingleSession,
    cancelSession,
    markAsCompleted,
    autoCompleteSessions,
    getUpcomingSessions,
    getCompletedSessions,
    requestReschedule,
    approveReschedule,
    rejectReschedule,
    autoTransitionSessionStatuses,
    markAsCompletedEnhanced,
};
