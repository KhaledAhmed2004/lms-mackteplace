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
    if (((_b = student.studentProfile) === null || _b === void 0 ? void 0 : _b.subscriptionTier) === 'REGULAR') {
        pricePerHour = 28;
    }
    else if (((_c = student.studentProfile) === null || _c === void 0 ? void 0 : _c.subscriptionTier) === 'LONG_TERM') {
        pricePerHour = 25;
    }
    const totalPrice = (pricePerHour * duration) / 60;
    // Create session proposal message
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
    const meta = yield sessionQuery.countTotal();
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
exports.SessionService = {
    proposeSession,
    acceptSessionProposal,
    rejectSessionProposal,
    getAllSessions,
    getSingleSession,
    cancelSession,
    markAsCompleted,
    autoCompleteSessions,
};
