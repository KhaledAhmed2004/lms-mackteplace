"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FAQRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const faq_controller_1 = require("./faq.controller");
const faq_validation_1 = require("./faq.validation");
const router = express_1.default.Router();
// ============ PUBLIC ROUTES ============
// Get all active FAQs sorted by order (for support page)
router.get('/active', faq_controller_1.FAQController.getActiveFAQs);
// Get all FAQs with filtering, searching, pagination
router.get('/', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), faq_controller_1.FAQController.getAllFAQs);
// ============ ADMIN ONLY ROUTES ============
// Create new FAQ
router.post('/', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(faq_validation_1.FAQValidation.createFAQZodSchema), faq_controller_1.FAQController.createFAQ);
// Update FAQ
router.patch('/:faqId', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(faq_validation_1.FAQValidation.updateFAQZodSchema), faq_controller_1.FAQController.updateFAQ);
// Delete FAQ
router.delete('/:faqId', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), faq_controller_1.FAQController.deleteFAQ);
exports.FAQRoutes = router;
