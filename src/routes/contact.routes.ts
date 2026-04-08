import express from "express";
import { contactController } from "../controllers/contact.controller";
import { attachBusinessId } from "../middleware/business";

const router = express.Router();

router.post("/contact", attachBusinessId, contactController);

export default router;
