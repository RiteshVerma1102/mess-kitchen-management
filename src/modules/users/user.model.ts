import { Schema, model, models, type Model, type Types } from 'mongoose';
import { ROLES, type Role } from '@/core/rbac/policy';

export interface IUser {
  institutionId: string;
  email: string;
  hashedPassword: string;
  fullName: string;
  role: Role;
  hallIds: string[]; // assigned dining halls for kitchen_staff / attendance operators
  active: boolean;
  isEmailVerified?: boolean;
  verificationCode?: string;
  verificationCodeExpiresAt?: Date;
  resetPasswordToken?: string;
  resetPasswordExpiresAt?: Date;
  lastLoginAt?: Date;
  passwordChangedAt?: Date;
  isSynthetic?: boolean;
}

export type UserDoc = IUser & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

// Safe user type without sensitive password fields
export type SafeUser = Omit<UserDoc, 'hashedPassword'>;

const userSchema = new Schema<IUser>(
  {
    institutionId: { type: String, required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    hashedPassword: { type: String, required: true },
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    role: {
      type: String,
      required: true,
      enum: ROLES,
      default: 'student',
    },
    hallIds: { type: [String], default: [] },
    active: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },
    verificationCode: { type: String, select: false },
    verificationCodeExpiresAt: { type: Date, select: false },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpiresAt: { type: Date, select: false },
    lastLoginAt: { type: Date },
    passwordChangedAt: { type: Date },
    isSynthetic: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// One email per institution (multi-tenant safe)
userSchema.index({ institutionId: 1, email: 1 }, { unique: true });
userSchema.index({ institutionId: 1, role: 1 });

export const UserModel: Model<IUser> =
  (models.User as Model<IUser>) || model<IUser>('User', userSchema);
