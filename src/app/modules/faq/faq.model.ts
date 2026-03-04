import { model, Schema } from 'mongoose';
import { IFAQ, FAQModel } from './faq.interface';

const faqSchema = new Schema<IFAQ>(
  {
    question: {
      type: String,
      required: [true, 'Question is required'],
      trim: true,
    },
    answer: {
      type: String,
      required: [true, 'Answer is required'],
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

faqSchema.index({ isActive: 1 });

export const FAQ = model<IFAQ, FAQModel>('FAQ', faqSchema);
