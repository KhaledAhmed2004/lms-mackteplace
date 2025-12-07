import { Model } from 'mongoose';

export type ISubject = {
  name: string; // e.g., "Mathematics"
  slug: string; // e.g., "mathematics"
  icon?: string; // Icon URL (optional)
  description?: string;
  isActive: boolean;
};

export type SubjectModel = Model<ISubject>;