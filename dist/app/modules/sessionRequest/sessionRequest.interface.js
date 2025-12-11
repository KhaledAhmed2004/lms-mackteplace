"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GRADE_LEVEL = exports.SCHOOL_TYPE = exports.SESSION_REQUEST_STATUS = void 0;
var SESSION_REQUEST_STATUS;
(function (SESSION_REQUEST_STATUS) {
    SESSION_REQUEST_STATUS["PENDING"] = "PENDING";
    SESSION_REQUEST_STATUS["ACCEPTED"] = "ACCEPTED";
    SESSION_REQUEST_STATUS["EXPIRED"] = "EXPIRED";
    SESSION_REQUEST_STATUS["CANCELLED"] = "CANCELLED";
})(SESSION_REQUEST_STATUS || (exports.SESSION_REQUEST_STATUS = SESSION_REQUEST_STATUS = {}));
// Reuse enums from trialRequest for consistency
var trialRequest_interface_1 = require("../trialRequest/trialRequest.interface");
Object.defineProperty(exports, "SCHOOL_TYPE", { enumerable: true, get: function () { return trialRequest_interface_1.SCHOOL_TYPE; } });
Object.defineProperty(exports, "GRADE_LEVEL", { enumerable: true, get: function () { return trialRequest_interface_1.GRADE_LEVEL; } });
