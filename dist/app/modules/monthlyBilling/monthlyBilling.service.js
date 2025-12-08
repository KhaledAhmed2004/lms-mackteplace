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
exports.MonthlyBillingService = void 0;
const http_status_codes_1 = require("http-status-codes");
const mongoose_1 = require("mongoose");
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const session_model_1 = require("../session/session.model");
const studentSubscription_model_1 = require("../studentSubscription/studentSubscription.model");
const session_interface_1 = require("../session/session.interface");
const studentSubscription_interface_1 = require("../studentSubscription/studentSubscription.interface");
const monthlyBilling_interface_1 = require("./monthlyBilling.interface");
const monthlyBilling_model_1 = require("./monthlyBilling.model");
// import Stripe from 'stripe';
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
/**
 * Generate monthly billing for all active students
 * Called by cron job at month-end
 */
const generateMonthlyBillings = (month, year) => __awaiter(void 0, void 0, void 0, function* () {
    // Get period dates
    const periodStart = new Date(year, month - 1, 1); // First day of month
    const periodEnd = new Date(year, month, 0, 23, 59, 59); // Last day of month
    // Find all active subscriptions
    const activeSubscriptions = yield studentSubscription_model_1.StudentSubscription.find({
        status: studentSubscription_interface_1.SUBSCRIPTION_STATUS.ACTIVE,
    }).populate('studentId');
    const billings = [];
    for (const subscription of activeSubscriptions) {
        try {
            // Check if billing already exists
            const existingBilling = yield monthlyBilling_model_1.MonthlyBilling.findOne({
                studentId: subscription.studentId,
                billingMonth: month,
                billingYear: year,
            });
            if (existingBilling) {
                continue; // Skip if already billed
            }
            // Get completed sessions for this student in billing period
            const sessions = yield session_model_1.Session.find({
                studentId: subscription.studentId,
                status: session_interface_1.SESSION_STATUS.COMPLETED,
                completedAt: {
                    $gte: periodStart,
                    $lte: periodEnd,
                },
            }).populate('tutorId', 'name');
            if (sessions.length === 0) {
                continue; // Skip if no sessions
            }
            // Build line items
            const lineItems = sessions.map(session => ({
                sessionId: session._id,
                subject: session.subject,
                tutorName: session.tutorId.name,
                date: session.completedAt,
                duration: session.duration,
                pricePerHour: session.pricePerHour,
                amount: session.totalPrice,
            }));
            // Create billing
            const billing = yield monthlyBilling_model_1.MonthlyBilling.create({
                studentId: subscription.studentId,
                subscriptionId: subscription._id,
                billingMonth: month,
                billingYear: year,
                periodStart,
                periodEnd,
                lineItems,
                subscriptionTier: subscription.tier,
                pricePerHour: subscription.pricePerHour,
                status: monthlyBilling_interface_1.BILLING_STATUS.PENDING,
            });
            billings.push(billing);
            // TODO: Create Stripe invoice
            // const student = subscription.studentId as any;
            // if (subscription.stripeCustomerId) {
            //   const invoice = await stripe.invoices.create({
            //     customer: subscription.stripeCustomerId,
            //     auto_advance: false,
            //     description: `Tutoring sessions for ${month}/${year}`,
            //     metadata: {
            //       billingId: billing._id.toString(),
            //       studentId: student._id.toString()
            //     }
            //   });
            //
            //   billing.stripeInvoiceId = invoice.id;
            //   await billing.save();
            // }
            // TODO: Send invoice email
            // await sendEmail({
            //   to: student.email,
            //   subject: `Your Invoice for ${month}/${year}`,
            //   template: 'monthly-invoice',
            //   data: { billing, student }
            // });
        }
        catch (error) {
            // Log error but continue with other billings
            console.error(`Error generating billing for student ${subscription.studentId}:`, error.message);
        }
    }
    return billings;
});
/**
 * Get student's billing history
 */
const getMyBillings = (studentId, query) => __awaiter(void 0, void 0, void 0, function* () {
    const billingQuery = new QueryBuilder_1.default(monthlyBilling_model_1.MonthlyBilling.find({ studentId: new mongoose_1.Types.ObjectId(studentId) }), query)
        .filter()
        .sort()
        .paginate()
        .fields();
    const result = yield billingQuery.modelQuery;
    const meta = yield billingQuery.countTotal();
    return {
        meta,
        data: result,
    };
});
/**
 * Get all billings (Admin)
 */
const getAllBillings = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const billingQuery = new QueryBuilder_1.default(monthlyBilling_model_1.MonthlyBilling.find().populate('studentId', 'name email profilePicture'), query)
        .search(['invoiceNumber'])
        .filter()
        .sort()
        .paginate()
        .fields();
    const result = yield billingQuery.modelQuery;
    const meta = yield billingQuery.countTotal();
    return {
        meta,
        data: result,
    };
});
/**
 * Get single billing
 */
const getSingleBilling = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const billing = yield monthlyBilling_model_1.MonthlyBilling.findById(id)
        .populate('studentId', 'name email profilePicture phone')
        .populate('subscriptionId');
    if (!billing) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Billing not found');
    }
    return billing;
});
/**
 * Mark billing as paid (Webhook handler or manual)
 */
const markAsPaid = (billingId, paymentDetails) => __awaiter(void 0, void 0, void 0, function* () {
    const billing = yield monthlyBilling_model_1.MonthlyBilling.findById(billingId);
    if (!billing) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Billing not found');
    }
    if (billing.status === monthlyBilling_interface_1.BILLING_STATUS.PAID) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Billing is already paid');
    }
    billing.status = monthlyBilling_interface_1.BILLING_STATUS.PAID;
    billing.paidAt = new Date();
    if (paymentDetails) {
        billing.stripePaymentIntentId = paymentDetails.stripePaymentIntentId;
        billing.paymentMethod = paymentDetails.paymentMethod;
    }
    yield billing.save();
    // TODO: Send payment confirmation email
    // await sendEmail({
    //   to: student.email,
    //   subject: 'Payment Received',
    //   template: 'payment-confirmation',
    //   data: { billing }
    // });
    return billing;
});
/**
 * Mark billing as failed
 */
const markAsFailed = (billingId, failureReason) => __awaiter(void 0, void 0, void 0, function* () {
    const billing = yield monthlyBilling_model_1.MonthlyBilling.findById(billingId);
    if (!billing) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Billing not found');
    }
    billing.status = monthlyBilling_interface_1.BILLING_STATUS.FAILED;
    billing.failureReason = failureReason;
    yield billing.save();
    // TODO: Send payment failure email
    // await sendEmail({
    //   to: student.email,
    //   subject: 'Payment Failed',
    //   template: 'payment-failed',
    //   data: { billing, failureReason }
    // });
    return billing;
});
exports.MonthlyBillingService = {
    generateMonthlyBillings,
    getMyBillings,
    getAllBillings,
    getSingleBilling,
    markAsPaid,
    markAsFailed,
};
