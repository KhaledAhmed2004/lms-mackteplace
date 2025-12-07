import { Model, Types } from 'mongoose';

export type AttachmentType = 'image' | 'audio' | 'video' | 'file';

export type IMessageAttachment = {
  type: AttachmentType;
  url: string;
  name?: string;
  size?: number;
  mime?: string;
  width?: number;
  height?: number;
  duration?: number; // for audio/video
};

// Session proposal data (in-chat booking)
export type ISessionProposal = {
  subject: string;                      // Session subject
  startTime: Date;                      // Proposed start time
  endTime: Date;                        // Proposed end time
  duration: number;                     // Duration in minutes
  price: number;                        // Price in EUR
  description?: string;                 // Session description
  status: 'PROPOSED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  sessionId?: Types.ObjectId;           // Created session (when accepted)
  rejectionReason?: string;             // Why rejected
  expiresAt: Date;                      // Proposal expiration (24 hours)
};

export type IMessage = {
  chatId: Types.ObjectId;
  sender: Types.ObjectId;
  text?: string;
  type: 'text' | 'image' | 'media' | 'doc' | 'mixed' | 'session_proposal';
  attachments?: IMessageAttachment[]; // unified attachment system

  // In-chat booking (tutoring marketplace)
  sessionProposal?: ISessionProposal;   // Session proposal data

  deliveredTo?: Types.ObjectId[];
  readBy?: Types.ObjectId[];
  status?: 'sent' | 'delivered' | 'seen';
  editedAt?: Date;
};

export type MessageModel = Model<IMessage>;
