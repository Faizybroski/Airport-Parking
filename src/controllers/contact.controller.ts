import { contactEmailService } from "../services/mail.service";
import { Request, Response, NextFunction } from "express";

export const contactController = async (req: Request, res: Response) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ message: "All fields required" });
    }

    await contactEmailService.sendContactEmail(name, email, message);

    return res.status(200).json({ message: "Email sent successfully" });
  } catch (error) {
    console.error("Contact Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
