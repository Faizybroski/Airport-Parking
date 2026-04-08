import { contactEmailService } from "../services/mail.service";
import { Request, Response } from "express";

export const contactController = async (req: Request, res: Response) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ message: "All fields required" });
    }

    // businessId is attached by attachBusinessId middleware on this route
    const businessId = req.businessId!;

    await contactEmailService.sendContactEmail(name, email, message, businessId);

    return res.status(200).json({ message: "Email sent successfully" });
  } catch (error) {
    console.error("Contact Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
