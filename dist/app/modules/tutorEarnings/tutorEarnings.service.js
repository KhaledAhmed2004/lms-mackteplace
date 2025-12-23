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
exports.TutorEarningsService = void 0;
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const http_status_codes_1 = require("http-status-codes");
const tutorEarnings_model_1 = require("./tutorEarnings.model");
const tutorEarnings_interface_1 = require("./tutorEarnings.interface");
const session_model_1 = require("../session/session.model");
const session_interface_1 = require("../session/session.interface");
const user_model_1 = require("../user/user.model");
const user_1 = require("../../../enums/user");
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
/**
 * Generate tutor earnings for all tutors (called at month-end after billing)
 */
const generateTutorEarnings = (month_1, year_1, ...args_1) => __awaiter(void 0, [month_1, year_1, ...args_1], void 0, function* (month, year, commissionRate = 0.2) {
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0, 23, 59, 59);
    // Get all active tutors
    const tutors = yield user_model_1.User.find({ role: user_1.USER_ROLES.TUTOR });
    const earnings = [];
    for (const tutor of tutors) {
        // Check if payout already exists
        const existingPayout = yield tutorEarnings_model_1.TutorEarnings.findOne({
            tutorId: tutor._id,
            payoutMonth: month,
            payoutYear: year,
        });
        if (existingPayout) {
            continue; // Skip if already generated
        }
        // Get completed sessions for this tutor in billing period
        const sessions = yield session_model_1.Session.find({
            tutorId: tutor._id,
            status: session_interface_1.SESSION_STATUS.COMPLETED,
            completedAt: { $gte: periodStart, $lte: periodEnd },
        }).populate('studentId', 'name');
        if (sessions.length === 0) {
            continue; // Skip tutors with no sessions
        }
        // Build line items
        const lineItems = sessions.map(session => ({
            sessionId: session._id,
            studentName: session.studentId.name,
            subject: session.subject,
            completedAt: session.completedAt,
            duration: session.duration,
            sessionPrice: session.totalPrice,
            tutorEarning: session.totalPrice * (1 - commissionRate),
        }));
        // Create earnings record
        const earning = yield tutorEarnings_model_1.TutorEarnings.create({
            tutorId: tutor._id,
            payoutMonth: month,
            payoutYear: year,
            periodStart,
            periodEnd,
            lineItems,
            commissionRate,
            status: tutorEarnings_interface_1.PAYOUT_STATUS.PENDING,
        });
        earnings.push(earning);
    }
    return earnings;
});
/**
 * Get tutor's earnings history
 */
const getMyEarnings = (tutorId, query) => __awaiter(void 0, void 0, void 0, function* () {
    const earningsQuery = new QueryBuilder_1.default(tutorEarnings_model_1.TutorEarnings.find({ tutorId }), query)
        .filter()
        .sort()
        .paginate()
        .fields();
    const result = yield earningsQuery.modelQuery;
    const meta = yield earningsQuery.getPaginationInfo();
    return { data: result, meta };
});
/**
 * Get all earnings (Admin)
 */
const getAllEarnings = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const earningsQuery = new QueryBuilder_1.default(tutorEarnings_model_1.TutorEarnings.find().populate('tutorId', 'name email'), query)
        .search(['payoutReference'])
        .filter()
        .sort()
        .paginate()
        .fields();
    const result = yield earningsQuery.modelQuery;
    const meta = yield earningsQuery.getPaginationInfo();
    return { data: result, meta };
});
/**
 * Get single earnings record
 */
const getSingleEarning = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const earning = yield tutorEarnings_model_1.TutorEarnings.findById(id)
        .populate('tutorId', 'name email')
        .populate('lineItems.sessionId');
    if (!earning) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Earnings record not found');
    }
    return earning;
});
/**
 * Initiate payout to tutor (Stripe Connect transfer)
 */
const initiatePayout = (id, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const earning = yield tutorEarnings_model_1.TutorEarnings.findById(id).populate('tutorId');
    if (!earning) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Earnings record not found');
    }
    if (earning.status !== tutorEarnings_interface_1.PAYOUT_STATUS.PENDING) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, `Cannot initiate payout. Current status: ${earning.status}`);
    }
    if (earning.netEarnings <= 0) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Cannot initiate payout with zero or negative earnings');
    }
    // TODO: Integrate Stripe Connect transfer
    // const tutor = earning.tutorId as any;
    // const transfer = await stripe.transfers.create({
    //   amount: Math.round(earning.netEarnings * 100), // Convert to cents
    //   currency: 'eur',
    //   destination: tutor.stripeConnectAccountId,
    //   transfer_group: earning.payoutReference,
    //   metadata: {
    //     tutorId: tutor._id.toString(),
    //     payoutMonth: earning.payoutMonth,
    //     payoutYear: earning.payoutYear,
    //   },
    // });
    // earning.stripeTransferId = transfer.id;
    earning.status = tutorEarnings_interface_1.PAYOUT_STATUS.PROCESSING;
    if (payload.notes) {
        earning.notes = payload.notes;
    }
    yield earning.save();
    return earning;
});
/**
 * Mark payout as completed (Called by Stripe webhook or manual)
 */
const markAsPaid = (id, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const earning = yield tutorEarnings_model_1.TutorEarnings.findById(id);
    if (!earning) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Earnings record not found');
    }
    earning.status = tutorEarnings_interface_1.PAYOUT_STATUS.PAID;
    earning.paidAt = new Date();
    if (payload.stripePayoutId) {
        earning.stripePayoutId = payload.stripePayoutId;
    }
    if (payload.paymentMethod) {
        earning.paymentMethod = payload.paymentMethod;
    }
    yield earning.save();
    // TODO: Send email notification to tutor
    // await sendEmail({
    //   to: tutor.email,
    //   subject: 'Payout Completed',
    //   template: 'payout-completed',
    //   data: { earning },
    // });
    return earning;
});
/**
 * Mark payout as failed
 */
const markAsFailed = (id, failureReason) => __awaiter(void 0, void 0, void 0, function* () {
    const earning = yield tutorEarnings_model_1.TutorEarnings.findById(id);
    if (!earning) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Earnings record not found');
    }
    earning.status = tutorEarnings_interface_1.PAYOUT_STATUS.FAILED;
    earning.failureReason = failureReason;
    yield earning.save();
    // TODO: Send email notification to tutor
    // await sendEmail({
    //   to: tutor.email,
    //   subject: 'Payout Failed',
    //   template: 'payout-failed',
    //   data: { earning, failureReason },
    // });
    return earning;
});
exports.TutorEarningsService = {
    generateTutorEarnings,
    getMyEarnings,
    getAllEarnings,
    getSingleEarning,
    initiatePayout,
    markAsPaid,
    markAsFailed,
};
