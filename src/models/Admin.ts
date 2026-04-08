import mongoose, { Schema, Document, Types } from "mongoose";

export interface IAdmin extends Document {
  email: string;
  password: string;
  name: string;
  /** The business this admin belongs to. Scopes all data access. */
  businessId: Types.ObjectId;
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
  },
  { timestamps: true },
);

export const Admin = mongoose.model<IAdmin>("Admin", AdminSchema);
