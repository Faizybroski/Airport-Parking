import mongoose, { Schema, Document, Types } from "mongoose";

export interface IAdmin extends Document {
  email: string;
  password: string;
  name: string;
  /** The business this admin belongs to. Scopes all data access. */
  businessId: Types.ObjectId;
  /** When true, this admin belongs to the compare site and can access any business. */
  isCompareAdmin: boolean;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AdminSchema = new Schema<IAdmin>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    isCompareAdmin: {
      type: Boolean,
      default: false,
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
    },
  },
  { timestamps: true },
);

export const Admin = mongoose.model<IAdmin>("Admin", AdminSchema);
