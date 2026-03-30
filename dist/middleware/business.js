"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachBusinessId = void 0;
const attachBusinessId = (req, res, next) => {
    const businessId = req.headers["x-business-id"];
    if (!businessId) {
        return res.status(400).json({
            success: false,
            message: "X-Business-Id header missing",
        });
    }
    // attach to request
    req.businessId = businessId;
    next();
};
exports.attachBusinessId = attachBusinessId;
//# sourceMappingURL=business.js.map