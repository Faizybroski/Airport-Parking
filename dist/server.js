"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const config_1 = require("./config");
const database_1 = require("./config/database");
const errorHandler_1 = require("./middleware/errorHandler");
const booking_routes_1 = __importDefault(require("./routes/booking.routes"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const app = (0, express_1.default)();
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: config_1.config.frontendUrl,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "x-business-id"],
}));
app.use((0, morgan_1.default)("dev"));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
// Routes
app.use("/api/bookings", booking_routes_1.default);
app.use("/api/admin", auth_routes_1.default);
app.use("/api/admin", admin_routes_1.default);
// Health check
app.get("/api/health", (_req, res) => {
    res.json({ success: true, message: "ParkPro API is running" });
});
// 404 handler
app.use((_req, res) => {
    res.status(404).json({ success: false, message: "Route not found" });
});
// Error handler
app.use(errorHandler_1.errorHandler);
// Start server
const startServer = async () => {
    await (0, database_1.connectDB)();
    app.listen(config_1.config.port, () => {
        console.log(`\n🚀 ParkPro API running on http://localhost:${config_1.config.port}`);
        console.log(`📊 Health check: http://localhost:${config_1.config.port}/api/health\n`);
    });
};
startServer().catch(console.error);
exports.default = app;
//# sourceMappingURL=server.js.map