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
exports.TrialRequestService = void 0;
const http_status_codes_1 = require("http-status-codes");
const mongoose_1 = require("mongoose");
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const user_model_1 = require("../user/user.model");
const user_1 = require("../../../enums/user");
const chat_model_1 = require("../chat/chat.model");
const subject_model_1 = require("../subject/subject.model");
const trialRequest_interface_1 = require("./trialRequest.interface");
const trialRequest_model_1 = require("./trialRequest.model");
const sessionRequest_model_1 = require("../sessionRequest/sessionRequest.model");
const sessionRequest_interface_1 = require("../sessionRequest/sessionRequest.interface");
// NOTE: getMatchingTrialRequests, getMyTrialRequests, getAllTrialRequests removed
// Use /session-requests endpoints instead (unified view with requestType filter)
/**
 * Create trial request (First-time Student or Guest ONLY)
 * For returning students, use SessionRequest module instead
 * Automatically creates User account when trial request is created
 */
const createTrialRequest = (studentId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    // Validate subject exists
    const subjectExists = yield subject_model_1.Subject.findById(payload.subject);
    if (!subjectExists) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Subject not found');
    }
    // Validate based on age
    // Under 18: guardian info required
    // 18+: student email/password required
    if ((_a = payload.studentInfo) === null || _a === void 0 ? void 0 : _a.isUnder18) {
        if (!((_b = payload.studentInfo) === null || _b === void 0 ? void 0 : _b.guardianInfo)) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Guardian information is required for students under 18');
        }
    }
    else {
        if (!((_c = payload.studentInfo) === null || _c === void 0 ? void 0 : _c.email)) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Email is required for students 18 and above');
        }
        if (!((_d = payload.studentInfo) === null || _d === void 0 ? void 0 : _d.password)) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Password is required for students 18 and above');
        }
    }
    // If logged-in student, verify and check eligibility
    if (studentId) {
        const student = yield user_model_1.User.findById(studentId);
        if (!student) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Student not found');
        }
        if (student.role !== user_1.USER_ROLES.STUDENT) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only students can create trial requests');
        }
        // Returning students should use SessionRequest, not TrialRequest
        if ((_e = student.studentProfile) === null || _e === void 0 ? void 0 : _e.hasCompletedTrial) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'You have already completed a trial. Please use the session request feature for additional tutoring sessions.');
        }
        // Check if student has pending trial request
        const pendingTrialRequest = yield trialRequest_model_1.TrialRequest.findOne({
            studentId: new mongoose_1.Types.ObjectId(studentId),
            status: trialRequest_interface_1.TRIAL_REQUEST_STATUS.PENDING,
        });
        if (pendingTrialRequest) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'You already have a pending trial request. Please wait for a tutor to accept or cancel it.');
        }
        // Also check for pending session request
        const pendingSessionRequest = yield sessionRequest_model_1.SessionRequest.findOne({
            studentId: new mongoose_1.Types.ObjectId(studentId),
            status: sessionRequest_interface_1.SESSION_REQUEST_STATUS.PENDING,
        });
        if (pendingSessionRequest) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'You have a pending session request. Please wait for it to be accepted or cancel it first.');
        }
    }
    else {
        // Guest user - check by email for previous trials and pending requests
        const emailToCheck = ((_f = payload.studentInfo) === null || _f === void 0 ? void 0 : _f.isUnder18)
            ? (_h = (_g = payload.studentInfo) === null || _g === void 0 ? void 0 : _g.guardianInfo) === null || _h === void 0 ? void 0 : _h.email
            : (_j = payload.studentInfo) === null || _j === void 0 ? void 0 : _j.email;
        if (emailToCheck) {
            // Check if user already exists with this email
            const existingUser = yield user_model_1.User.findOne({ email: emailToCheck.toLowerCase() });
            if (existingUser) {
                throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'An account with this email already exists. Please log in to create a trial request.');
            }
            // Check if guest has already completed a trial
            const previousAcceptedTrial = yield trialRequest_model_1.TrialRequest.findOne({
                $or: [
                    { 'studentInfo.email': emailToCheck },
                    { 'studentInfo.guardianInfo.email': emailToCheck },
                ],
                status: trialRequest_interface_1.TRIAL_REQUEST_STATUS.ACCEPTED,
            });
            if (previousAcceptedTrial) {
                throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'You have already completed a trial with this email. Please log in to request more sessions.');
            }
            // Check for pending requests
            const pendingRequest = yield trialRequest_model_1.TrialRequest.findOne({
                $or: [
                    { 'studentInfo.email': emailToCheck },
                    { 'studentInfo.guardianInfo.email': emailToCheck },
                ],
                status: trialRequest_interface_1.TRIAL_REQUEST_STATUS.PENDING,
            });
            if (pendingRequest) {
                throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'A pending trial request already exists for this email. Please wait for a tutor to accept or cancel it.');
            }
        }
    }
    // Auto-create User account for guest users when trial request is created
    let createdStudentId = studentId;
    if (!studentId && payload.studentInfo) {
        // Determine email and password based on age
        // For under 18: use guardian's email/password (guardian becomes the account holder)
        // For 18+: use student's email/password
        const isUnder18 = payload.studentInfo.isUnder18;
        const email = isUnder18
            ? (_k = payload.studentInfo.guardianInfo) === null || _k === void 0 ? void 0 : _k.email
            : payload.studentInfo.email;
        const password = isUnder18
            ? (_l = payload.studentInfo.guardianInfo) === null || _l === void 0 ? void 0 : _l.password
            : payload.studentInfo.password;
        const name = isUnder18
            ? ((_m = payload.studentInfo.guardianInfo) === null || _m === void 0 ? void 0 : _m.name) || payload.studentInfo.firstName + ' ' + payload.studentInfo.lastName
            : payload.studentInfo.firstName + ' ' + payload.studentInfo.lastName;
        const phone = isUnder18
            ? (_o = payload.studentInfo.guardianInfo) === null || _o === void 0 ? void 0 : _o.phone
            : undefined;
        if (email && password) {
            // Create new User account
            const newUser = yield user_model_1.User.create({
                name: name,
                email: email.toLowerCase(),
                password: password,
                phone: phone,
                role: user_1.USER_ROLES.STUDENT,
                studentProfile: {
                    hasCompletedTrial: false,
                    trialRequestsCount: 1,
                    sessionRequestsCount: 0,
                },
            });
            createdStudentId = newUser._id.toString();
        }
    }
    // Create trial request
    const trialRequest = yield trialRequest_model_1.TrialRequest.create(Object.assign(Object.assign({}, payload), { studentId: createdStudentId ? new mongoose_1.Types.ObjectId(createdStudentId) : undefined, status: trialRequest_interface_1.TRIAL_REQUEST_STATUS.PENDING }));
    // Increment student trial request count if logged in (existing user)
    if (studentId) {
        yield user_model_1.User.findByIdAndUpdate(studentId, {
            $inc: { 'studentProfile.trialRequestsCount': 1 },
        });
    }
    // TODO: Send real-time notification to matching tutors
    // TODO: Send email notification to admin
    // TODO: Send confirmation email to student
    return trialRequest;
});
/**
 * Get single trial request
 */
const getSingleTrialRequest = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const request = yield trialRequest_model_1.TrialRequest.findById(id)
        .populate('studentId', 'name email profilePicture phone')
        .populate('acceptedTutorId', 'name email profilePicture phone')
        .populate('subject', 'name icon description')
        .populate('chatId');
    if (!request) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Trial request not found');
    }
    return request;
});
/**
 * Accept trial request (Tutor)
 * Creates chat and connects student with tutor
 * Marks student as having completed trial
 */
const acceptTrialRequest = (requestId, tutorId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    // Verify request exists and is pending
    const request = yield trialRequest_model_1.TrialRequest.findById(requestId).populate('subject', 'name');
    if (!request) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Trial request not found');
    }
    if (request.status !== trialRequest_interface_1.TRIAL_REQUEST_STATUS.PENDING) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'This trial request is no longer available');
    }
    // Check if expired
    if (new Date() > request.expiresAt) {
        request.status = trialRequest_interface_1.TRIAL_REQUEST_STATUS.EXPIRED;
        yield request.save();
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'This trial request has expired');
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
    // Prepare chat participants
    // If studentId exists (logged-in user), use it; otherwise, create chat with tutor only for now
    const chatParticipants = request.studentId
        ? [request.studentId, new mongoose_1.Types.ObjectId(tutorId)]
        : [new mongoose_1.Types.ObjectId(tutorId)];
    // Create chat between student and tutor
    const chat = yield chat_model_1.Chat.create({
        participants: chatParticipants,
        trialRequestId: request._id, // Link chat to trial request
    });
    // Update trial request
    request.status = trialRequest_interface_1.TRIAL_REQUEST_STATUS.ACCEPTED;
    request.acceptedTutorId = new mongoose_1.Types.ObjectId(tutorId);
    request.chatId = chat._id;
    request.acceptedAt = new Date();
    yield request.save();
    // Mark student as having completed trial (so they use SessionRequest next time)
    if (request.studentId) {
        yield user_model_1.User.findByIdAndUpdate(request.studentId, {
            $set: { 'studentProfile.hasCompletedTrial': true },
        });
    }
    // TODO: Send real-time notification to student
    // TODO: Send email to student
    return request;
});
/**
 * Cancel trial request (Student)
 * Can be cancelled by studentId (logged-in) or by email (guest)
 */
const cancelTrialRequest = (requestId, studentIdOrEmail, cancellationReason) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const request = yield trialRequest_model_1.TrialRequest.findById(requestId);
    if (!request) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Trial request not found');
    }
    // Verify ownership - check both studentId and studentInfo.email
    const isOwnerByStudentId = request.studentId && request.studentId.toString() === studentIdOrEmail;
    const isOwnerByEmail = ((_b = (_a = request.studentInfo) === null || _a === void 0 ? void 0 : _a.email) === null || _b === void 0 ? void 0 : _b.toLowerCase()) === studentIdOrEmail.toLowerCase();
    if (!isOwnerByStudentId && !isOwnerByEmail) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You can only cancel your own trial requests');
    }
    // Can only cancel PENDING requests
    if (request.status !== trialRequest_interface_1.TRIAL_REQUEST_STATUS.PENDING) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Only pending trial requests can be cancelled');
    }
    // Update request
    request.status = trialRequest_interface_1.TRIAL_REQUEST_STATUS.CANCELLED;
    request.cancellationReason = cancellationReason;
    request.cancelledAt = new Date();
    yield request.save();
    return request;
});
/**
 * Extend trial request (Student)
 * Adds 7 more days to expiration (max 1 extension)
 */
const extendTrialRequest = (requestId, studentIdOrEmail) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    const request = yield trialRequest_model_1.TrialRequest.findById(requestId);
    if (!request) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Trial request not found');
    }
    // Verify ownership
    const isOwnerByStudentId = request.studentId && request.studentId.toString() === studentIdOrEmail;
    const isOwnerByEmail = ((_b = (_a = request.studentInfo) === null || _a === void 0 ? void 0 : _a.email) === null || _b === void 0 ? void 0 : _b.toLowerCase()) === studentIdOrEmail.toLowerCase();
    const isOwnerByGuardianEmail = ((_e = (_d = (_c = request.studentInfo) === null || _c === void 0 ? void 0 : _c.guardianInfo) === null || _d === void 0 ? void 0 : _d.email) === null || _e === void 0 ? void 0 : _e.toLowerCase()) === studentIdOrEmail.toLowerCase();
    if (!isOwnerByStudentId && !isOwnerByEmail && !isOwnerByGuardianEmail) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You can only extend your own trial requests');
    }
    // Can only extend PENDING requests
    if (request.status !== trialRequest_interface_1.TRIAL_REQUEST_STATUS.PENDING) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Only pending trial requests can be extended');
    }
    // Check extension limit (max 1)
    if (request.extensionCount && request.extensionCount >= 1) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Trial request can only be extended once');
    }
    // Extend by 7 days
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);
    request.expiresAt = newExpiresAt;
    request.isExtended = true;
    request.extensionCount = (request.extensionCount || 0) + 1;
    request.finalExpiresAt = undefined; // Reset final deadline
    request.reminderSentAt = undefined; // Reset reminder
    yield request.save();
    // TODO: Send confirmation email
    return request;
});
/**
 * Send reminders for expiring requests (Cron job)
 * Finds requests where expiresAt has passed but no reminder sent yet
 * Sets finalExpiresAt to 3 days from now
 */
const sendExpirationReminders = () => __awaiter(void 0, void 0, void 0, function* () {
    const now = new Date();
    // Find expired requests that haven't received reminder
    const expiredRequests = yield trialRequest_model_1.TrialRequest.find({
        status: trialRequest_interface_1.TRIAL_REQUEST_STATUS.PENDING,
        expiresAt: { $lt: now },
        reminderSentAt: { $exists: false },
    });
    let reminderCount = 0;
    for (const request of expiredRequests) {
        // Set reminder sent and final deadline (3 days)
        const finalDeadline = new Date();
        finalDeadline.setDate(finalDeadline.getDate() + 3);
        request.reminderSentAt = now;
        request.finalExpiresAt = finalDeadline;
        yield request.save();
        // TODO: Send email notification
        // const email = request.studentInfo?.isUnder18
        //   ? request.studentInfo?.guardianInfo?.email
        //   : request.studentInfo?.email;
        // await sendEmail({
        //   to: email,
        //   subject: 'Your Trial Request is Expiring',
        //   template: 'trial-request-expiring',
        //   data: {
        //     name: request.studentInfo?.name,
        //     expiresAt: finalDeadline,
        //     extendUrl: `${FRONTEND_URL}/trial-requests/${request._id}/extend`,
        //     cancelUrl: `${FRONTEND_URL}/trial-requests/${request._id}/cancel`,
        //   }
        // });
        reminderCount++;
    }
    return reminderCount;
});
/**
 * Auto-delete requests after final deadline (Cron job)
 * Deletes requests where finalExpiresAt has passed with no response
 */
const autoDeleteExpiredRequests = () => __awaiter(void 0, void 0, void 0, function* () {
    const now = new Date();
    const result = yield trialRequest_model_1.TrialRequest.deleteMany({
        status: trialRequest_interface_1.TRIAL_REQUEST_STATUS.PENDING,
        finalExpiresAt: { $lt: now },
    });
    return result.deletedCount;
});
/**
 * Auto-expire trial requests (Cron job - legacy)
 * Marks as EXPIRED instead of delete (for records)
 */
const expireOldRequests = () => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield trialRequest_model_1.TrialRequest.updateMany({
        status: trialRequest_interface_1.TRIAL_REQUEST_STATUS.PENDING,
        finalExpiresAt: { $lt: new Date() },
    }, {
        $set: { status: trialRequest_interface_1.TRIAL_REQUEST_STATUS.EXPIRED },
    });
    return result.modifiedCount;
});
exports.TrialRequestService = {
    createTrialRequest,
    getSingleTrialRequest,
    acceptTrialRequest,
    cancelTrialRequest,
    extendTrialRequest,
    sendExpirationReminders,
    autoDeleteExpiredRequests,
    expireOldRequests,
};
