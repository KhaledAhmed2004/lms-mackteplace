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
    // If applicant, only show available slots
    if (userRole === 'APPLICANT') {
        filter = { status: interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.AVAILABLE };
    }
    const slotQuery = new QueryBuilder_1.default(interviewSlot_model_1.InterviewSlot.find(filter).populate('adminId', 'name email').populate('applicantId', 'name email'), query)
        .filter()
        .sort()
        .paginate()
        .fields();
    const result = yield slotQuery.modelQuery;
    const meta = yield slotQuery.countTotal();
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
    if (application.userId.toString() !== applicantId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'This application does not belong to you');
    }
    // Check if application is in correct status
    if (application.status !== tutorApplication_interface_1.APPLICATION_STATUS.DOCUMENTS_REVIEWED) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Application must be in DOCUMENTS_REVIEWED status to book interview');
    }
    // Check if applicant already has a booked slot
    const existingBooking = yield interviewSlot_model_1.InterviewSlot.findOne({
        applicantId: new mongoose_1.Types.ObjectId(applicantId),
        status: interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.BOOKED,
    });
    if (existingBooking) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'You already have a booked interview slot');
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
    // Update application status to INTERVIEW_SCHEDULED
    yield tutorApplication_model_1.TutorApplication.findByIdAndUpdate(applicationId, {
        status: tutorApplication_interface_1.APPLICATION_STATUS.INTERVIEW_SCHEDULED,
    });
    // TODO: Send email notification to applicant and admin
    // await sendEmail({
    //   to: application.email,
    //   subject: 'Interview Scheduled',
    //   template: 'interview-scheduled',
    //   data: { name: application.name, meetLink: slot.googleMeetLink, startTime: slot.startTime }
    // });
    return slot;
});
/**
 * Cancel interview slot
 * Admin or Applicant can cancel
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
    if (slot.adminId.toString() !== userId &&
        ((_a = slot.applicantId) === null || _a === void 0 ? void 0 : _a.toString()) !== userId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You are not authorized to cancel this slot');
    }
    // Update slot
    slot.status = interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.CANCELLED;
    slot.cancellationReason = cancellationReason;
    slot.cancelledAt = new Date();
    yield slot.save();
    // Update application status back to DOCUMENTS_REVIEWED
    if (slot.applicationId) {
        yield tutorApplication_model_1.TutorApplication.findByIdAndUpdate(slot.applicationId, {
            status: tutorApplication_interface_1.APPLICATION_STATUS.DOCUMENTS_REVIEWED,
        });
    }
    // TODO: Send cancellation email
    // await sendEmail({
    //   to: [applicant.email, admin.email],
    //   subject: 'Interview Cancelled',
    //   template: 'interview-cancelled',
    //   data: { reason: cancellationReason }
    // });
    return slot;
});
/**
 * Mark interview as completed (Admin only)
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
    // Update application status to INTERVIEW_DONE
    if (slot.applicationId) {
        yield tutorApplication_model_1.TutorApplication.findByIdAndUpdate(slot.applicationId, {
            status: tutorApplication_interface_1.APPLICATION_STATUS.INTERVIEW_DONE,
        });
    }
    return slot;
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
    markAsCompleted,
    updateInterviewSlot,
    deleteInterviewSlot,
};
