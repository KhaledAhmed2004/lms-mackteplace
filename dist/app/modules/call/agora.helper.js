"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userIdToAgoraUid = exports.generateChannelName = exports.generateRtcToken = void 0;
const agora_token_1 = require("agora-token");
const uuid_1 = require("uuid");
const config_1 = __importDefault(require("../../../config"));
/**
 * RTC Token Generate করে (Video/Voice Call এর জন্য)
 *
 * @param channelName - Agora channel name
 * @param uid - User এর Agora UID (number)
 * @param role - publisher (can send audio/video) or subscriber (only receive)
 * @param tokenExpirationInSeconds - Token validity (default: 1 hour)
 * @param privilegeExpirationInSeconds - Privilege validity (default: 1 hour)
 */
const generateRtcToken = (channelName, uid, role = 'publisher', tokenExpirationInSeconds = 3600, privilegeExpirationInSeconds = 3600) => {
    const appId = config_1.default.agora.appId;
    const appCertificate = config_1.default.agora.appCertificate;
    const rtcRole = role === 'publisher' ? agora_token_1.RtcRole.PUBLISHER : agora_token_1.RtcRole.SUBSCRIBER;
    return agora_token_1.RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, channelName, uid, rtcRole, tokenExpirationInSeconds, privilegeExpirationInSeconds);
};
exports.generateRtcToken = generateRtcToken;
// Unique Channel Name Generate করে
const generateChannelName = () => {
    return `call_${(0, uuid_1.v4)().replace(/-/g, '').substring(0, 16)}`;
};
exports.generateChannelName = generateChannelName;
/**
 * User ID থেকে Agora UID তৈরি করে
 * MongoDB ObjectId কে number এ convert করে
 */
const userIdToAgoraUid = (userId) => {
    // ObjectId এর শেষ 8 characters নিয়ে number বানাই
    const hex = userId.slice(-8);
    return parseInt(hex, 16) % 2147483647; // Max 32-bit signed integer
};
exports.userIdToAgoraUid = userIdToAgoraUid;
