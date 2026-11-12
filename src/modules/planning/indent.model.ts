import { Schema, model, models, type Model, type Types } from 'mongoose';

export interface IIndentItem {
  ingredientId: Types.ObjectId;
  ingredientName: string;
  requestedQuantity: number;
  issuedQuantity: number;
  unit: string;
  unitCostPaise: number; // integer paise
  totalCostPaise: number; // integer paise
}

export interface IIndent {
  institutionId: string;
  indentNumber: string; // e.g. IND-202611-001
  messHallId: string;
  targetDate: string; // YYYY-MM-DD IST
  supplierId?: Types.ObjectId;
  items: IIndentItem[];
  totalAmountPaise: number; // integer paise
  status: 'draft' | 'submitted' | 'approved' | 'fulfilled' | 'cancelled';
  requestedBy: string;
  approvedBy?: string;
  notes?: string;
  isSynthetic?: boolean;
}

export type IndentDoc = IIndent & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const indentItemSchema = new Schema<IIndentItem>(
  {
    ingredientId: { type: Schema.Types.ObjectId, ref: 'Ingredient', required: true },
    ingredientName: { type: String, required: true, trim: true },
    requestedQuantity: { type: Number, required: true, min: 0.01 },
    issuedQuantity: { type: Number, default: 0, min: 0 },
    unit: { type: String, required: true, trim: true },
    unitCostPaise: { type: Number, required: true, min: 0, validate: Number.isInteger },
    totalCostPaise: { type: Number, required: true, min: 0, validate: Number.isInteger },
  },
  { _id: false },
);

const indentSchema = new Schema<IIndent>(
  {
    institutionId: { type: String, required: true, index: true },
    indentNumber: { type: String, required: true, trim: true },
    messHallId: { type: String, required: true, index: true },
    targetDate: { type: String, required: true, index: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier' },
    items: { type: [indentItemSchema], default: [] },
    totalAmountPaise: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isInteger,
    },
    status: {
      type: String,
      required: true,
      enum: ['draft', 'submitted', 'approved', 'fulfilled', 'cancelled'],
      default: 'draft',
      index: true,
    },
    requestedBy: { type: String, required: true, trim: true },
    approvedBy: { type: String, trim: true },
    notes: { type: String, trim: true },
    isSynthetic: { type: Boolean, default: false },
  },
  { timestamps: true },
);

indentSchema.index({ institutionId: 1, indentNumber: 1 }, { unique: true });
indentSchema.index({ institutionId: 1, targetDate: 1 });
indentSchema.index({ institutionId: 1, messHallId: 1, targetDate: 1 });

export const IndentModel: Model<IIndent> =
  (models.Indent as Model<IIndent>) || model<IIndent>('Indent', indentSchema);
