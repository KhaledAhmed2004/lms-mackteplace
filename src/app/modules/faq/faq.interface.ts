import { Model } from 'mongoose';

export type IFAQ = {
  question: string;
  answer: string;
  isActive: boolean;
};

export type FAQModel = Model<IFAQ>;
