import { Model, Types } from 'mongoose';

export type ISessionReview = {
  sessionId: Types.ObjectId;
  studentId: Types.ObjectId;
  tutorId: Types.ObjectId;

  // Ratings (1-5 scale)
  overallRating: number;        // Overall experience (required)
  teachingQuality: number;      // How well the tutor explained concepts
  communication: number;        // Clarity and responsiveness
  punctuality: number;          // On-time arrival
  preparedness: number;         // Tutor's preparation for session

  // Optional feedback
  comment?: string;             // Written review
  wouldRecommend: boolean;      // Would recommend this tutor

  // Metadata
  isPublic: boolean;            // Show publicly on tutor profile
  isEdited: boolean;            // Has been edited after submission
  editedAt?: Date;
};

export type SessionReviewModel = Model<ISessionReview>;

export type IReviewStats = {
  tutorId: Types.ObjectId;
  totalReviews: number;
  averageOverallRating: number;
  averageTeachingQuality: number;
  averageCommunication: number;
  averagePunctuality: number;
  averagePreparedness: number;
  wouldRecommendPercentage: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
};
