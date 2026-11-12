import { Schema, model, models, type Model, type Types } from 'mongoose';

export interface ISupplier {
  institutionId: string;
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  address: string;
  category: 'produce' | 'dairy' | 'groceries' | 'poultry' | 'gas_fuel' | 'general';
  gstin?: string;
  paymentTermsDays: number;
  active: boolean;
  isSynthetic?: boolean;
}

export type SupplierDoc = ISupplier & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const supplierSchema = new Schema<ISupplier>(
  {
    institutionId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 150 },
    contactPerson: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    address: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: ['produce', 'dairy', 'groceries', 'poultry', 'gas_fuel', 'general'],
    },
    gstin: { type: String, uppercase: true, trim: true },
    paymentTermsDays: { type: Number, default: 30, min: 0 },
    active: { type: Boolean, default: true },
    isSynthetic: { type: Boolean, default: false },
  },
  { timestamps: true },
);

supplierSchema.index({ institutionId: 1, name: 1 }, { unique: true });

export const SupplierModel: Model<ISupplier> =
  (models.Supplier as Model<ISupplier>) || model<ISupplier>('Supplier', supplierSchema);
