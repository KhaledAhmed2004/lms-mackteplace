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
exports.InterviewSlotService = void 0;
const http_status_codes_1 = require("http-status-codes");
const mongoose_1 = require("mongoose");
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const user_model_1 = require("../user/user.model");
const tutorApplication_model_1 = require("../tutorApplication/tutorApplication.model");
const tutorApplication_interface_1 = require("../tutorApplication/tutorApplication.interface");
const interviewSlot_interface_1 = require("./interviewSlot.interface");
const interviewSlot_model_1 = require("./interviewSlot.model");
// import { generateGoogleMeetLink } from '../../../helpers/googleMeetHelper'; // Will implement later
/**
 * Create interview slot (Admin only)
 */
const createInterviewSlot = (adminId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    // Verify admin exists
    const admin = yield user_model_1.User.findById(adminId);
    if (!admin) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Admin not found');
    }
    // Create slot
    const slotData = Object.assign(Object.assign({}, payload), { adminId: new mongoose_1.Types.ObjectId(adminId), status: interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.AVAILABLE });
    const slot = yield interviewSlot_model_1.InterviewSlot.create(slotData);
    return slot;
});
/**
 * Get all interview slots with filtering
 * Admin: See all slots
 * Applicant: See only available slots
 */
const getAllInterviewSlots = (query, userId, userRole) => __awaiter(void 0, void 0, void 0, function* () {
    let filter = {};
    // If applicant or tutor, only show available slots
    if (userRole === 'APPLICANT' || userRole === 'TUTOR') {
        filter = { status: interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.AVAILABLE };
    }
    const slotQuery = new QueryBuilder_1.default(interviewSlot_model_1.InterviewSlot.find(filter), query)
        .filter()
        .sort()
        .paginate()
        .fields();
    const result = yield slotQuery.modelQuery;
    const meta = yield slotQuery.getPaginationInfo();
    return {
        meta,
        data: result,
    };
});
/**
 * Get single interview slot by ID
 */
const getSingleInterviewSlot = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const slot = yield interviewSlot_model_1.InterviewSlot.findById(id)
        .populate('adminId', 'name email')
        .populate('applicantId', 'name email')
        .populate('applicationId');
    if (!slot) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Interview slot not found');
    }
    return slot;
});
/**
 * Book interview slot (Applicant)
 */
const bookInterviewSlot = (slotId, applicantId, applicationId) => __awaiter(void 0, void 0, void 0, function* () {
    // Verify slot exists and is available
    const slot = yield interviewSlot_model_1.InterviewSlot.findById(slotId);
    if (!slot) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Interview slot not found');
    }
    if (slot.status !== interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.AVAILABLE) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Interview slot is not available');
    }
    // Verify application exists and belongs to applicant
    const application = yield tutorApplication_model_1.TutorApplication.findById(applicationId);
    if (!application) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Application not found');
    }
    // Get user to check email match
    const user = yield user_model_1.User.findById(applicantId);
    if (!user || application.email !== user.email) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'This application does not belong to you');
    }
    // Check if application is in correct status (SUBMITTED or REVISION can book)
    if (application.status !== tutorApplication_interface_1.APPLICATION_STATUS.SUBMITTED &&
        application.status !== tutorApplication_interface_1.APPLICATION_STATUS.REVISION) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Application must be in SUBMITTED or REVISION status to book interview');
    }
    // Check if applicant already has a booked slot
    const existingBooking = yield interviewSlot_model_1.InterviewSlot.findOne({
        applicantId: new mongoose_1.Types.ObjectId(applicantId),
        status: interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.BOOKED,
    });
    if (existingBooking) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'You already have a booked interview slot. Cancel it first to book a new one.');
    }
    // Update slot
    slot.status = interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.BOOKED;
    slot.applicantId = new mongoose_1.Types.ObjectId(applicantId);
    slot.applicationId = new mongoose_1.Types.ObjectId(applicationId);
    slot.bookedAt = new Date();
    // TODO: Generate Google Meet link
    // slot.googleMeetLink = await generateGoogleMeetLink({
    //   summary: 'Tutor Application Interview',
    //   description: `Interview for ${application.name}`,
    //   startTime: slot.startTime,
    //   endTime: slot.endTime,
    //   attendees: [application.email, admin.email]
    // });
    yield slot.save();
    // TODO: Send email notification to applicant with meeting details
    // await sendEmail({
    //   to: application.email,
    //   subject: 'Interview Scheduled - Tutor Application',
    //   template: 'interview-scheduled',
    //   data: {
    //     name: application.name,
    //     meetLink: slot.googleMeetLink,
    //     startTime: slot.startTime,
    //     endTime: slot.endTime
    //   }
    // });
    return slot;
});
/**
 * Cancel interview slot
 * Admin or Applicant can cancel (must be at least 1 hour before interview)
 */
const cancelInterviewSlot = (slotId, userId, cancellationReason) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const slot = yield interviewSlot_model_1.InterviewSlot.findById(slotId);
    if (!slot) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Interview slot not found');
    }
    if (slot.status !== interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.BOOKED) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Only booked slots can be cancelled');
    }
    // Verify user is either admin or applicant of this slot
    const user = yield user_model_1.User.findById(userId);
    const isAdmin = (user === null || user === void 0 ? void 0 : user.role) === 'SUPER_ADMIN';
    const isSlotOwner = ((_a = slot.applicantId) === null || _a === void 0 ? void 0 : _a.toString()) === userId;
    if (!isAdmin && !isSlotOwner) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You are not authorized to cancel this slot');
    }
    // Check if cancellation is at least 1 hour before interview (for applicants only)
    if (!isAdmin) {
        const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
        if (slot.startTime <= oneHourFromNow) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Cannot cancel interview less than 1 hour before the scheduled time');
        }
    }
    // Save applicationId before clearing
    const savedApplicationId = slot.applicationId;
    // Update slot - make it available again for others to book
    slot.status = interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.AVAILABLE;
    slot.applicantId = undefined;
    slot.applicationId = undefined;
    slot.bookedAt = undefined;
    yield slot.save();
    // Update application status back to SUBMITTED (so they can book again)
    if (savedApplicationId) {
        yield tutorApplication_model_1.TutorApplication.findByIdAndUpdate(savedApplicationId, {
            status: tutorApplication_interface_1.APPLICATION_STATUS.SUBMITTED,
        });
    }
    // TODO: Send cancellation email
    // await sendEmail({
    //   to: application.email,
    //   subject: 'Interview Cancelled',
    //   template: 'interview-cancelled',
    //   data: { reason: cancellationReason, startTime: slot.startTime }
    // });
    return slot;
});
/**
 * Mark interview as completed (Admin only)
 * After completion, admin can approve/reject the application separately
 */
const markAsCompleted = (slotId) => __awaiter(void 0, void 0, void 0, function* () {
    const slot = yield interviewSlot_model_1.InterviewSlot.findById(slotId);
    if (!slot) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Interview slot not found');
    }
    if (slot.status !== interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.BOOKED) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Only booked slots can be marked as completed');
    }
    // Update slot
    slot.status = interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.COMPLETED;
    slot.completedAt = new Date();
    yield slot.save();
    // Application status remains SUBMITTED - admin will approve/reject separately
    return slot;
});
/**
 * Reschedule interview slot (Applicant)
 * Cancel current booking and book a new slot in one action
 */
const rescheduleInterviewSlot = (currentSlotId, newSlotId, applicantId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // Get current slot
    const currentSlot = yield interviewSlot_model_1.InterviewSlot.findById(currentSlotId);
    if (!currentSlot) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Current interview slot not found');
    }
    // Verify applicant owns this slot
    if (((_a = currentSlot.applicantId) === null || _a === void 0 ? void 0 : _a.toString()) !== applicantId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You are not authorized to reschedule this slot');
    }
    if (currentSlot.status !== interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.BOOKED) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Only booked slots can be rescheduled');
    }
    // Check if reschedule is at least 1 hour before current interview
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
    if (currentSlot.startTime <= oneHourFromNow) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Cannot reschedule interview less than 1 hour before the scheduled time');
    }
    // Get new slot
    const newSlot = yield interviewSlot_model_1.InterviewSlot.findById(newSlotId);
    if (!newSlot) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'New interview slot not found');
    }
    if (newSlot.status !== interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.AVAILABLE) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'New slot is not available');
    }
    // Save applicant and application IDs before clearing
    const savedApplicantId = currentSlot.applicantId;
    const savedApplicationId = currentSlot.applicationId;
    // Cancel current slot (make it available again)
    currentSlot.status = interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.AVAILABLE;
    currentSlot.applicantId = undefined;
    currentSlot.applicationId = undefined;
    currentSlot.bookedAt = undefined;
    yield currentSlot.save();
    // Book new slot
    newSlot.status = interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.BOOKED;
    newSlot.applicantId = savedApplicantId;
    newSlot.applicationId = savedApplicationId;
    newSlot.bookedAt = new Date();
    yield newSlot.save();
    // TODO: Send reschedule email notification
    // await sendEmail({
    //   to: applicant.email,
    //   subject: 'Interview Rescheduled',
    //   template: 'interview-rescheduled',
    //   data: {
    //     oldTime: currentSlot.startTime,
    //     newTime: newSlot.startTime,
    //     meetLink: newSlot.googleMeetLink
    //   }
    // });
    return newSlot;
});
/**
 * Update interview slot (Admin only)
 */
const updateInterviewSlot = (id, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const slot = yield interviewSlot_model_1.InterviewSlot.findById(id);
    if (!slot) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Interview slot not found');
    }
    // Don't allow updating booked/completed/cancelled slots
    if (slot.status !== interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.AVAILABLE) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Cannot update slot that is not available');
    }
    const updated = yield interviewSlot_model_1.InterviewSlot.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
    });
    return updated;
});
/**
 * Delete interview slot (Admin only)
 */
const deleteInterviewSlot = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const slot = yield interviewSlot_model_1.InterviewSlot.findById(id);
    if (!slot) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Interview slot not found');
    }
    // Don't allow deleting booked slots
    if (slot.status === interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.BOOKED) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Cannot delete booked slot. Cancel it first.');
    }
    const result = yield interviewSlot_model_1.InterviewSlot.findByIdAndDelete(id);
    return result;
});
exports.InterviewSlotService = {
    createInterviewSlot,
    getAllInterviewSlots,
    getSingleInterviewSlot,
    bookInterviewSlot,
    cancelInterviewSlot,
    rescheduleInterviewSlot,
    markAsCompleted,
    updateInterviewSlot,
    deleteInterviewSlot,
};
