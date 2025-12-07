import { model, Schema } from 'mongoose';
import { ISubject, SubjectModel } from './subject.interface';

const subjectSchema = new Schema<ISubject>(
  {
    name: {
      type: String,
      required: [true, 'Subject name is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, 'Subject slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    icon: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Index for faster queries
subjectSchema.index({ slug: 1 });
subjectSchema.index({ isActive: 1 });

export const Subject = model<ISubject, SubjectModel>('Subject', subjectSchema);
