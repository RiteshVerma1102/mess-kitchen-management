import { Schema, model, models, type Model, type Types } from 'mongoose';

export interface IDiningHallConfig {
  id: string;
  name: string;
  capacity: number;
  active: boolean;
}

export interface IInstitution {
  name: string;
  code: string;
  slug: string;
  timezone: string;
  contactEmail: string;
  currency: string;
  diningHalls: IDiningHallConfig[];
  active: boolean;
  isSynthetic?: boolean;
}

export type InstitutionDoc = IInstitution & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const diningHallSchema = new Schema<IDiningHallConfig>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    capacity: { type: Number, required: true, min: 1 },
    active: { type: Boolean, default: true },
  },
  { _id: false },
);

const institutionSchema = new Schema<IInstitution>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    timezone: { type: String, default: 'Asia/Kolkata' },
    contactEmail: { type: String, required: true, lowercase: true, trim: true },
    currency: { type: String, default: 'INR' },
    diningHalls: { type: [diningHallSchema], default: [] },
    active: { type: Boolean, default: true },
    isSynthetic: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const InstitutionModel: Model<IInstitution> =
  (models.Institution as Model<IInstitution>) || model<IInstitution>('Institution', institutionSchema);
