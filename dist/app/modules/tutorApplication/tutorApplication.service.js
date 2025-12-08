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
exports.TutorApplicationService = void 0;
const http_status_codes_1 = require("http-status-codes");
const mongoose_1 = require("mongoose");
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const user_1 = require("../../../enums/user");
const user_model_1 = require("../user/user.model");
const tutorApplication_interface_1 = require("./tutorApplication.interface");
const tutorApplication_model_1 = require("./tutorApplication.model");
// import { sendEmail } from '../../../helpers/emailHelper'; // Will implement later
/**
 * Submit tutor application
 * User must be APPLICANT role
 */
const submitApplication = (userId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    // Check if user exists
    const user = yield user_model_1.User.findById(userId);
    if (!user) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'User not found');
    }
    // Check if user already has an application
    const existingApplication = yield tutorApplication_model_1.TutorApplication.findOne({ userId });
    if (existingApplication) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'You have already submitted an application');
    }
    // Create application
    const applicationData = Object.assign(Object.assign({}, payload), { userId: new mongoose_1.Types.ObjectId(userId), status: tutorApplication_interface_1.APPLICATION_STATUS.SUBMITTED, phase: 1, submittedAt: new Date() });
    const application = yield tutorApplication_model_1.TutorApplication.create(applicationData);
    // Update user role to APPLICANT
    yield user_model_1.User.findByIdAndUpdate(userId, {
        role: user_1.USER_ROLES.APPLICANT,
        'tutorProfile.subjects': payload.subjects,
        'tutorProfile.address': payload.address,
        'tutorProfile.birthDate': payload.birthDate,
        'tutorProfile.cvUrl': payload.cvUrl,
        'tutorProfile.abiturCertificateUrl': payload.abiturCertificateUrl,
        'tutorProfile.educationProofUrls': payload.educationProofUrls,
    });
    // TODO: Send email notification to admin
    // await sendEmail({
    //   to: ADMIN_EMAIL,
    //   subject: 'New Tutor Application Received',
    //   template: 'new-application',
    //   data: { applicantName: payload.name }
    // });
    return application;
});
/**
 * Get my application (applicant)
 */
const getMyApplication = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const application = yield tutorApplication_model_1.TutorApplication.findOne({ userId }).populate('userId', 'name email profilePicture');
    if (!application) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'No application found');
    }
    return application;
});
/**
 * Get all applications (admin)
 * With filtering, searching, pagination
 */
const getAllApplications = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const applicationQuery = new QueryBuilder_1.default(tutorApplication_model_1.TutorApplication.find().populate('userId', 'name email profilePicture phone'), query)
        .search(['name', 'email', 'phone']) // Search by name, email, phone
        .filter() // Filter by status, phase, etc.
        .sort() // Sort
        .paginate() // Pagination
        .fields(); // Field selection
    const result = yield applicationQuery.modelQuery;
    const meta = yield applicationQuery.countTotal();
    return {
        meta,
        data: result,
    };
});
/**
 * Get single application by ID (admin)
 */
const getSingleApplication = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const application = yield tutorApplication_model_1.TutorApplication.findById(id).populate('userId', 'name email profilePicture phone status');
    if (!application) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Application not found');
    }
    return application;
});
/**
 * Approve application to Phase 2 (Interview scheduling)
 * Admin only
 */
const approveToPhase2 = (id, adminNotes) => __awaiter(void 0, void 0, void 0, function* () {
    const application = yield tutorApplication_model_1.TutorApplication.findById(id);
    if (!application) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Application not found');
    }
    if (application.status !== tutorApplication_interface_1.APPLICATION_STATUS.SUBMITTED) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Application must be in SUBMITTED status');
    }
    // Update application
    application.status = tutorApplication_interface_1.APPLICATION_STATUS.DOCUMENTS_REVIEWED;
    application.phase = 2;
    application.reviewedAt = new Date();
    if (adminNotes) {
        application.adminNotes = adminNotes;
    }
    yield application.save();
    // TODO: Send email to applicant with interview scheduling link
    // await sendEmail({
    //   to: application.email,
    //   subject: 'Application Approved - Schedule Interview',
    //   template: 'interview-invitation',
    //   data: { name: application.name, interviewLink: INTERVIEW_LINK }
    // });
    return application;
});
/**
 * Reject application
 * Admin only
 */
const rejectApplication = (id, rejectionReason) => __awaiter(void 0, void 0, void 0, function* () {
    const application = yield tutorApplication_model_1.TutorApplication.findById(id);
    if (!application) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Application not found');
    }
    if (application.status === tutorApplication_interface_1.APPLICATION_STATUS.APPROVED) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Cannot reject an approved application');
    }
    // Update application
    application.status = tutorApplication_interface_1.APPLICATION_STATUS.REJECTED;
    application.rejectionReason = rejectionReason;
    application.rejectedAt = new Date();
    yield application.save();
    // TODO: Send rejection email
    // await sendEmail({
    //   to: application.email,
    //   subject: 'Application Update',
    //   template: 'application-rejected',
    //   data: { name: application.name, reason: rejectionReason }
    // });
    return application;
});
/**
 * Mark as tutor (Final approval - Phase 3)
 * Admin only
 * Changes user role from APPLICANT to TUTOR
 */
const markAsTutor = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const application = yield tutorApplication_model_1.TutorApplication.findById(id);
    if (!application) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Application not found');
    }
    if (application.status === tutorApplication_interface_1.APPLICATION_STATUS.REJECTED) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Cannot approve a rejected application');
    }
    // Update application
    application.status = tutorApplication_interface_1.APPLICATION_STATUS.APPROVED;
    application.phase = 3;
    application.approvedAt = new Date();
    yield application.save();
    // Update user role to TUTOR
    yield user_model_1.User.findByIdAndUpdate(application.userId, {
        role: user_1.USER_ROLES.TUTOR,
        'tutorProfile.isVerified': true,
        'tutorProfile.verificationStatus': 'APPROVED',
        'tutorProfile.onboardingPhase': 3,
    });
    // TODO: Send welcome email
    // await sendEmail({
    //   to: application.email,
    //   subject: 'Welcome to Our Platform!',
    //   template: 'tutor-approved',
    //   data: { name: application.name }
    // });
    return application;
});
/**
 * Update application status (admin only)
 * Generic update function
 */
const updateApplicationStatus = (id, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const application = yield tutorApplication_model_1.TutorApplication.findById(id);
    if (!application) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Application not found');
    }
    const updated = yield tutorApplication_model_1.TutorApplication.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
    });
    return updated;
});
/**
 * Delete application (admin only)
 * Hard delete
 */
const deleteApplication = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const application = yield tutorApplication_model_1.TutorApplication.findById(id);
    if (!application) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Application not found');
    }
    const result = yield tutorApplication_model_1.TutorApplication.findByIdAndDelete(id);
    return result;
});
exports.TutorApplicationService = {
    submitApplication,
    getMyApplication,
    getAllApplications,
    getSingleApplication,
    approveToPhase2,
    rejectApplication,
    markAsTutor,
    updateApplicationStatus,
    deleteApplication,
};
