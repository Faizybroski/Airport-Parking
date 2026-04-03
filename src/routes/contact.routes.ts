import express from "express";
import { contactController } from "../controllers/contact.controller";

const router = express.Router();

router.post("/contact", contactController);

export default router;
