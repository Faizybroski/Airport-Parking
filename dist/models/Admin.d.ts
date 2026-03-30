import mongoose, { Document } from 'mongoose';
export interface IAdmin extends Document {
    email: string;
    password: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Admin: mongoose.Model<IAdmin, {}, {}, {}, mongoose.Document<unknown, {}, IAdmin, {}, {}> & IAdmin & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Admin.d.ts.map