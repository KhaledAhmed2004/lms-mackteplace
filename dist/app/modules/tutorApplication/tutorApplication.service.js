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
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const user_1 = require("../../../enums/user");
const user_model_1 = require("../user/user.model");
const tutorApplication_interface_1 = require("./tutorApplication.interface");
const tutorApplication_model_1 = require("./tutorApplication.model");
/**
 * Submit application (PUBLIC - creates user + application)
 * First-time registration for tutors
 */
const submitApplication = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    // 1. Check if email already exists
    const existingUser = yield user_model_1.User.findOne({ email: payload.email });
    if (existingUser) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.CONFLICT, 'Email already registered');
    }
    // Check if application with this email already exists
    const existingApplication = yield tutorApplication_model_1.TutorApplication.findOne({
        email: payload.email,
    });
    if (existingApplication) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.CONFLICT, 'An application with this email already exists');
    }
    // 2. Create new User with APPLICANT role
    // Note: Password will be hashed by User model's pre-save hook
    const newUser = yield user_model_1.User.create({
        name: payload.name,
        email: payload.email,
        password: payload.password,
        phone: payload.phone,
        role: user_1.USER_ROLES.APPLICANT,
        dateOfBirth: new Date(payload.birthDate),
        tutorProfile: {
            subjects: payload.subjects,
            cvUrl: payload.cv,
            abiturCertificateUrl: payload.abiturCertificate,
        },
    });
    // 4. Create TutorApplication
    const application = yield tutorApplication_model_1.TutorApplication.create({
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        birthDate: new Date(payload.birthDate),
        street: payload.street,
        houseNumber: payload.houseNumber,
        zipCode: payload.zipCode,
        city: payload.city,
        subjects: payload.subjects,
        cv: payload.cv,
        abiturCertificate: payload.abiturCertificate,
        officialIdDocument: payload.officialIdDocument,
        status: tutorApplication_interface_1.APPLICATION_STATUS.SUBMITTED,
        submittedAt: new Date(),
    });
    return { application, user: { _id: newUser._id, email: newUser.email } };
});
// Get my application (for logged in applicant)
const getMyApplication = (userEmail) => __awaiter(void 0, void 0, void 0, function* () {
    const application = yield tutorApplication_model_1.TutorApplication.findOne({
        email: userEmail,
    }).populate({ path: 'subjects', select: 'name -_id' });
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
    const applicationQuery = new QueryBuilder_1.default(tutorApplication_model_1.TutorApplication.find(), query)
        .search(['name', 'email', 'phone', 'city'])
        .filter()
        .sort()
        .paginate()
        .fields();
    // Add populate for subjects
    applicationQuery.modelQuery = applicationQuery.modelQuery.populate({
        path: 'subjects',
        select: 'name -_id',
    });
    // Execute query
    const result = yield applicationQuery.modelQuery;
    const meta = yield applicationQuery.getPaginationInfo();
    return {
        meta,
        data: result,
    };
});
// Get single application by ID (admin)
const getSingleApplication = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const application = yield tutorApplication_model_1.TutorApplication.findById(id).populate({
        path: 'subjects',
        select: 'name -_id',
    });
    if (!application) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Application not found');
    }
    return application;
});
/**
 * Select application for interview (admin only)
 * After initial review, admin selects candidate for interview
 */
const selectForInterview = (id, adminNotes) => __awaiter(void 0, void 0, void 0, function* () {
    const application = yield tutorApplication_model_1.TutorApplication.findById(id);
    if (!application) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Application not found');
    }
    if (application.status === tutorApplication_interface_1.APPLICATION_STATUS.SELECTED_FOR_INTERVIEW) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Application is already selected for interview');
    }
    if (application.status === tutorApplication_interface_1.APPLICATION_STATUS.APPROVED) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Application is already approved');
    }
    if (application.status === tutorApplication_interface_1.APPLICATION_STATUS.REJECTED) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Cannot select a rejected application for interview');
    }
    // Only SUBMITTED or REVISION status can be selected for interview
    if (application.status !== tutorApplication_interface_1.APPLICATION_STATUS.SUBMITTED &&
        application.status !== tutorApplication_interface_1.APPLICATION_STATUS.REVISION) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Only submitted or revision applications can be selected for interview');
    }
    // Update application status
    application.status = tutorApplication_interface_1.APPLICATION_STATUS.SELECTED_FOR_INTERVIEW;
    application.selectedForInterviewAt = new Date();
    if (adminNotes) {
        application.adminNotes = adminNotes;
    }
    yield application.save();
    // TODO: Send email notification to applicant about interview selection
    return application;
});
/**
 * Approve application (admin only)
 * Changes status to APPROVED and user role to TUTOR
 * Can only approve after interview (SELECTED_FOR_INTERVIEW status)
 */
const approveApplication = (id, adminNotes) => __awaiter(void 0, void 0, void 0, function* () {
    const application = yield tutorApplication_model_1.TutorApplication.findById(id);
    if (!application) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Application not found');
    }
    if (application.status === tutorApplication_interface_1.APPLICATION_STATUS.APPROVED) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Application is already approved');
    }
    if (application.status === tutorApplication_interface_1.APPLICATION_STATUS.REJECTED) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Cannot approve a rejected application');
    }
    // Must be SELECTED_FOR_INTERVIEW to approve (after interview)
    if (application.status !== tutorApplication_interface_1.APPLICATION_STATUS.SELECTED_FOR_INTERVIEW) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Application must be selected for interview before approval. Please select for interview first.');
    }
    // Update application status
    application.status = tutorApplication_interface_1.APPLICATION_STATUS.APPROVED;
    application.approvedAt = new Date();
    if (adminNotes) {
        application.adminNotes = adminNotes;
    }
    yield application.save();
    // Update user role to TUTOR
    yield user_model_1.User.findOneAndUpdate({ email: application.email }, {
        role: user_1.USER_ROLES.TUTOR,
        'tutorProfile.isVerified': true,
        'tutorProfile.verificationStatus': 'APPROVED',
    });
    return application;
});
/**
 * Reject application (admin only)
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
    return application;
});
/**
 * Send application for revision (admin only)
 * Admin requests the applicant to fix/update something
 */
const sendForRevision = (id, revisionNote) => __awaiter(void 0, void 0, void 0, function* () {
    const application = yield tutorApplication_model_1.TutorApplication.findById(id);
    if (!application) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Application not found');
    }
    if (application.status === tutorApplication_interface_1.APPLICATION_STATUS.APPROVED) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Cannot request revision for an approved application');
    }
    if (application.status === tutorApplication_interface_1.APPLICATION_STATUS.REJECTED) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Cannot request revision for a rejected application');
    }
    // Update application
    application.status = tutorApplication_interface_1.APPLICATION_STATUS.REVISION;
    application.revisionNote = revisionNote;
    application.revisionRequestedAt = new Date();
    yield application.save();
    // TODO: Send email notification to applicant about revision request
    return application;
});
/**
 * Delete application (admin only)
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
    selectForInterview,
    approveApplication,
    rejectApplication,
    sendForRevision,
    deleteApplication,
};
