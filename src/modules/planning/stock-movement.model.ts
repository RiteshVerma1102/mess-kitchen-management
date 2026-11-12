import { Schema, model, models, type Model, type Types } from 'mongoose';

export type MovementType = 'inward_indent' | 'outward_kitchen' | 'adjustment' | 'spoilage_writeoff';

export interface IStockMovement {
  institutionId: string;
  ingredientId: Types.ObjectId;
  ingredientName: string;
  movementType: MovementType;
  quantity: number; // positive = added, negative = deducted
  balanceAfter: number;
  unit: string;
  referenceId?: string; // indentNumber, planId, or adjustment reason
  referenceType?: 'indent' | 'preparation_plan' | 'audit_adjustment' | 'waste';
  recordedBy: string;
  recordedAt: Date;
  notes?: string;
  isSynthetic?: boolean;
}

export type StockMovementDoc = IStockMovement & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const stockMovementSchema = new Schema<IStockMovement>(
  {
    institutionId: { type: String, required: true, index: true },
    ingredientId: { type: Schema.Types.ObjectId, ref: 'Ingredient', required: true, index: true },
    ingredientName: { type: String, required: true, trim: true },
    movementType: {
      type: String,
      required: true,
      enum: ['inward_indent', 'outward_kitchen', 'adjustment', 'spoilage_writeoff'],
      index: true,
    },
    quantity: { type: Number, required: true },
    balanceAfter: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, trim: true },
    referenceId: { type: String, trim: true },
    referenceType: {
      type: String,
      enum: ['indent', 'preparation_plan', 'audit_adjustment', 'waste'],
    },
    recordedBy: { type: String, required: true, trim: true },
    recordedAt: { type: Date, default: () => new Date() },
    notes: { type: String, trim: true },
    isSynthetic: { type: Boolean, default: false },
  },
  { timestamps: true },
);

stockMovementSchema.index({ institutionId: 1, ingredientId: 1, recordedAt: -1 });
stockMovementSchema.index({ institutionId: 1, movementType: 1, recordedAt: -1 });

export const StockMovementModel: Model<IStockMovement> =
  (models.StockMovement as Model<IStockMovement>) ||
  model<IStockMovement>('StockMovement', stockMovementSchema);
