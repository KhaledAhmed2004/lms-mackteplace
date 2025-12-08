# Agora Video/Voice Call + Whiteboard Integration Plan

## সংক্ষিপ্ত বিবরণ

এই plan-এ আমরা **Agora RTC SDK** ব্যবহার করে Video/Voice Call এবং **Agora Interactive Whiteboard** feature implement করব।

---

## Architecture Decision

### Option 1: Agora Only (Recommended) ✅
- **Agora RTC** for Video/Voice calls
- **Agora Whiteboard** for collaborative whiteboard
- Backend generates tokens, frontend handles UI
- Simpler integration, same provider

### Option 2: Mixed Providers
- Agora for calls
- Third-party whiteboard (Excalidraw, tldraw)
- More complexity, but open-source options

**নির্বাচিত: Option 1** - Agora উভয় service প্রদান করে, তাই integration সহজ হবে।

---

## Phase 1: Setup & Configuration

### 1.1 Dependencies Install করুন
```bash
npm install agora-token
```

> ⚠️ **Note**: `agora-access-token` package টি deprecated। সবসময় `agora-token` ব্যবহার করুন।

### 1.2 Environment Variables যোগ করুন
`.env` ফাইলে:
```env
# Agora RTC (Video/Voice Calling)
AGORA_APP_ID=your_app_id
AGORA_APP_CERTIFICATE=your_app_certificate

# Agora Interactive Whiteboard
AGORA_WHITEBOARD_APP_ID=your_whiteboard_app_id
AGORA_WHITEBOARD_SDK_TOKEN=your_sdk_token
AGORA_WHITEBOARD_REGION=us-sv
```

### 1.3 Config File আপডেট
`src/config/index.ts` এ যোগ করুন:
```typescript
agora: {
  appId: process.env.AGORA_APP_ID,
  appCertificate: process.env.AGORA_APP_CERTIFICATE,
  whiteboard: {
    appId: process.env.AGORA_WHITEBOARD_APP_ID,
    sdkToken: process.env.AGORA_WHITEBOARD_SDK_TOKEN,
    region: process.env.AGORA_WHITEBOARD_REGION || 'us-sv',
  },
},
```

---

## Phase 2: Call Module তৈরি

### 2.1 Module Structure
```
src/app/modules/call/
├── call.interface.ts      # TypeScript types
├── call.model.ts          # Call history/records
├── call.controller.ts     # Request handlers
├── call.service.ts        # Business logic
├── call.route.ts          # Routes
├── call.validation.ts     # Zod schemas
└── agora.helper.ts        # Token generation
```

### 2.2 Database Schema (call.interface.ts)
```typescript
import { Model, Types } from 'mongoose';

export type CallType = 'video' | 'voice';
export type CallStatus = 'pending' | 'active' | 'ended' | 'missed' | 'rejected' | 'cancelled';

export interface ICall {
  _id: Types.ObjectId;
  channelName: string;           // Unique Agora channel identifier
  callType: CallType;
  participants: Types.ObjectId[];
  initiator: Types.ObjectId;     // যে call করেছে
  receiver: Types.ObjectId;      // যাকে call করা হয়েছে
  status: CallStatus;
  startTime?: Date;              // কল শুরু হওয়ার সময়
  endTime?: Date;                // কল শেষ হওয়ার সময়
  duration?: number;             // সেকেন্ডে duration
  chatId?: Types.ObjectId;       // Chat থেকে call হলে link
  whiteboardRoomUuid?: string;   // Whiteboard enabled হলে
  hasWhiteboard: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CallModel = Model<ICall>;
```

### 2.3 Call Model (call.model.ts)
```typescript
import { Schema, model } from 'mongoose';
import { ICall, CallModel } from './call.interface';

const callSchema = new Schema<ICall, CallModel>(
  {
    channelName: {
      type: String,
      required: true,
      unique: true,
    },
    callType: {
      type: String,
      enum: ['video', 'voice'],
      required: true,
    },
    participants: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    initiator: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'ended', 'missed', 'rejected', 'cancelled'],
      default: 'pending',
    },
    startTime: Date,
    endTime: Date,
    duration: Number,
    chatId: {
      type: Schema.Types.ObjectId,
      ref: 'Chat',
    },
    whiteboardRoomUuid: String,
    hasWhiteboard: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Index for faster queries
callSchema.index({ participants: 1 });
callSchema.index({ initiator: 1, createdAt: -1 });
callSchema.index({ status: 1 });

export const Call = model<ICall, CallModel>('Call', callSchema);
```

### 2.4 Agora Token Helper (agora.helper.ts)

> ⚠️ **CRITICAL**: নতুন `agora-token` package এ **dual expiry** parameters ব্যবহার হয়:
> - `tokenExpirationInSeconds`: Token কতক্ষণ valid থাকবে
> - `privilegeExpirationInSeconds`: Privileges (যেমন publish/subscribe) কতক্ষণ থাকবে

```typescript
import {
  RtcTokenBuilder,
  Role as RtcRole,  // ⚠️ 'RtcRole' নয়, 'Role' import করতে হবে
} from 'agora-token';
import config from '../../../config';
import { v4 as uuidv4 } from 'uuid';

/**
 * RTC Token Generate করে (Video/Voice Call এর জন্য)
 *
 * @param channelName - Agora channel name
 * @param uid - User এর Agora UID (number)
 * @param role - publisher (can send audio/video) or subscriber (only receive)
 * @param tokenExpirationInSeconds - Token validity (default: 1 hour)
 * @param privilegeExpirationInSeconds - Privilege validity (default: 1 hour)
 */
export const generateRtcToken = (
  channelName: string,
  uid: number,
  role: 'publisher' | 'subscriber' = 'publisher',
  tokenExpirationInSeconds: number = 3600,
  privilegeExpirationInSeconds: number = 3600
): string => {
  const appId = config.agora.appId!;
  const appCertificate = config.agora.appCertificate!;

  const rtcRole = role === 'publisher'
    ? RtcRole.PUBLISHER
    : RtcRole.SUBSCRIBER;

  // ⚠️ নতুন API: dual expiry parameters
  return RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCertificate,
    channelName,
    uid,
    rtcRole,
    tokenExpirationInSeconds,      // Token expiry
    privilegeExpirationInSeconds   // Privilege expiry
  );
};

/**
 * Unique Channel Name Generate করে
 */
export const generateChannelName = (): string => {
  return `call_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
};

/**
 * User ID থেকে Agora UID তৈরি করে
 * MongoDB ObjectId কে number এ convert করে
 */
export const userIdToAgoraUid = (userId: string): number => {
  // ObjectId এর শেষ 8 characters নিয়ে number বানাই
  const hex = userId.slice(-8);
  return parseInt(hex, 16) % 2147483647; // Max 32-bit signed integer
};
```

### 2.5 Call Service (call.service.ts)
```typescript
import { Types } from 'mongoose';
import { Call } from './call.model';
import { ICall, CallType, CallStatus } from './call.interface';
import {
  generateRtcToken,
  generateChannelName,
  userIdToAgoraUid,
} from './agora.helper';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';

/**
 * নতুন Call শুরু করে
 */
const initiateCall = async (
  initiatorId: string,
  receiverId: string,
  callType: CallType,
  chatId?: string
): Promise<{ call: ICall; token: string; channelName: string; uid: number }> => {
  const channelName = generateChannelName();
  const uid = userIdToAgoraUid(initiatorId);

  const call = await Call.create({
    channelName,
    callType,
    participants: [initiatorId, receiverId],
    initiator: initiatorId,
    receiver: receiverId,
    status: 'pending',
    chatId: chatId ? new Types.ObjectId(chatId) : undefined,
  });

  const token = generateRtcToken(channelName, uid);

  return { call, token, channelName, uid };
};

/**
 * Call Accept করলে token দেয়
 */
const acceptCall = async (
  callId: string,
  userId: string
): Promise<{ call: ICall; token: string; uid: number }> => {
  const call = await Call.findById(callId);

  if (!call) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Call not found');
  }

  if (call.receiver.toString() !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You cannot accept this call');
  }

  if (call.status !== 'pending') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Call is no longer pending');
  }

  call.status = 'active';
  call.startTime = new Date();
  await call.save();

  const uid = userIdToAgoraUid(userId);
  const token = generateRtcToken(call.channelName, uid);

  return { call, token, uid };
};

/**
 * Call Reject করে
 */
const rejectCall = async (callId: string, userId: string): Promise<ICall> => {
  const call = await Call.findById(callId);

  if (!call) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Call not found');
  }

  if (call.receiver.toString() !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You cannot reject this call');
  }

  call.status = 'rejected';
  call.endTime = new Date();
  await call.save();

  return call;
};

/**
 * Call End করে
 */
const endCall = async (callId: string, userId: string): Promise<ICall> => {
  const call = await Call.findById(callId);

  if (!call) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Call not found');
  }

  const isParticipant = call.participants.some(
    (p) => p.toString() === userId
  );

  if (!isParticipant) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You are not in this call');
  }

  call.status = 'ended';
  call.endTime = new Date();

  if (call.startTime) {
    call.duration = Math.floor(
      (call.endTime.getTime() - call.startTime.getTime()) / 1000
    );
  }

  await call.save();

  return call;
};

/**
 * Call Cancel করে (Initiator রিং হওয়ার আগে cancel করলে)
 */
const cancelCall = async (callId: string, userId: string): Promise<ICall> => {
  const call = await Call.findById(callId);

  if (!call) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Call not found');
  }

  if (call.initiator.toString() !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only initiator can cancel');
  }

  if (call.status !== 'pending') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Call cannot be cancelled');
  }

  call.status = 'cancelled';
  call.endTime = new Date();
  await call.save();

  return call;
};

/**
 * Token Refresh করে (Call চলাকালীন)
 */
const refreshToken = async (
  callId: string,
  userId: string
): Promise<{ token: string; uid: number }> => {
  const call = await Call.findById(callId);

  if (!call) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Call not found');
  }

  const isParticipant = call.participants.some(
    (p) => p.toString() === userId
  );

  if (!isParticipant) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You are not in this call');
  }

  if (call.status !== 'active') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Call is not active');
  }

  const uid = userIdToAgoraUid(userId);
  const token = generateRtcToken(call.channelName, uid);

  return { token, uid };
};

/**
 * User এর Call History
 */
const getCallHistory = async (
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ calls: ICall[]; total: number }> => {
  const skip = (page - 1) * limit;

  const [calls, total] = await Promise.all([
    Call.find({ participants: userId })
      .populate('participants', 'name profilePicture')
      .populate('initiator', 'name profilePicture')
      .populate('receiver', 'name profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Call.countDocuments({ participants: userId }),
  ]);

  return { calls, total };
};

/**
 * Single Call Details
 */
const getCallById = async (callId: string, userId: string): Promise<ICall> => {
  const call = await Call.findById(callId)
    .populate('participants', 'name profilePicture')
    .populate('initiator', 'name profilePicture')
    .populate('receiver', 'name profilePicture');

  if (!call) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Call not found');
  }

  const isParticipant = call.participants.some(
    (p: any) => p._id.toString() === userId
  );

  if (!isParticipant) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You cannot view this call');
  }

  return call;
};

export const CallService = {
  initiateCall,
  acceptCall,
  rejectCall,
  endCall,
  cancelCall,
  refreshToken,
  getCallHistory,
  getCallById,
};
```

### 2.6 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/calls/initiate` | নতুন call শুরু করে |
| `POST` | `/api/v1/calls/:callId/accept` | Call accept করে |
| `POST` | `/api/v1/calls/:callId/reject` | Call reject করে |
| `POST` | `/api/v1/calls/:callId/end` | Call শেষ করে |
| `POST` | `/api/v1/calls/:callId/cancel` | Call cancel করে |
| `POST` | `/api/v1/calls/:callId/refresh-token` | Token refresh করে |
| `GET` | `/api/v1/calls/history` | Call history দেখায় |
| `GET` | `/api/v1/calls/:callId` | Single call details |

---

## Phase 3: Whiteboard Module তৈরি

### 3.1 Module Structure
```
src/app/modules/whiteboard/
├── whiteboard.interface.ts
├── whiteboard.model.ts
├── whiteboard.controller.ts
├── whiteboard.service.ts
├── whiteboard.route.ts
└── whiteboard.helper.ts    # Agora Whiteboard API
```

### 3.2 Whiteboard Interface (whiteboard.interface.ts)
```typescript
import { Model, Types } from 'mongoose';

export type WhiteboardRole = 'admin' | 'writer' | 'reader';

export interface IWhiteboardRoom {
  _id: Types.ObjectId;
  uuid: string;              // Agora room UUID
  name: string;
  createdBy: Types.ObjectId;
  participants: Types.ObjectId[];
  callId?: Types.ObjectId;   // Call এর সাথে linked হলে
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type WhiteboardRoomModel = Model<IWhiteboardRoom>;
```

### 3.3 Whiteboard Helper (whiteboard.helper.ts)
```typescript
import axios from 'axios';
import config from '../../../config';

const WHITEBOARD_API = 'https://api.netless.link/v5';

const getHeaders = () => ({
  token: config.agora.whiteboard.sdkToken,
  'Content-Type': 'application/json',
  region: config.agora.whiteboard.region,
});

/**
 * নতুন Whiteboard Room তৈরি করে
 */
export const createAgoraWhiteboardRoom = async (
  name: string
): Promise<{ uuid: string }> => {
  const response = await axios.post(
    `${WHITEBOARD_API}/rooms`,
    {
      name,
      isRecord: false,
    },
    { headers: getHeaders() }
  );

  return { uuid: response.data.uuid };
};

/**
 * Room Token Generate করে
 */
export const generateWhiteboardRoomToken = async (
  roomUuid: string,
  role: 'admin' | 'writer' | 'reader' = 'writer',
  lifespan: number = 3600000 // 1 hour in ms
): Promise<string> => {
  const response = await axios.post(
    `${WHITEBOARD_API}/tokens/rooms/${roomUuid}`,
    { lifespan, role },
    { headers: getHeaders() }
  );

  return response.data;
};

/**
 * Room বন্ধ করে
 */
export const closeWhiteboardRoom = async (roomUuid: string): Promise<void> => {
  await axios.patch(
    `${WHITEBOARD_API}/rooms/${roomUuid}`,
    { isBan: true },
    { headers: getHeaders() }
  );
};
```

### 3.4 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/whiteboard/rooms` | নতুন room তৈরি |
| `POST` | `/api/v1/whiteboard/rooms/:roomId/token` | Room token নেয় |
| `GET` | `/api/v1/whiteboard/rooms` | User এর rooms |
| `DELETE` | `/api/v1/whiteboard/rooms/:roomId` | Room delete |

---

## Phase 4: Socket.IO Integration

### 4.1 নতুন Socket Events

`src/helpers/socketHelper.ts` এ যোগ করতে হবে:

```typescript
// ===========================
// 🔹 Call Events
// ===========================

// Call শুরু করার event
socket.on('CALL_INITIATE', async ({
  receiverId,
  callType,
  chatId,
}: {
  receiverId: string;
  callType: 'video' | 'voice';
  chatId?: string;
}) => {
  try {
    const { call, token, channelName, uid } = await CallService.initiateCall(
      userId,
      receiverId,
      callType,
      chatId
    );

    // Caller কে response
    socket.emit('CALL_INITIATED', {
      callId: call._id,
      channelName,
      token,
      uid,
      callType,
    });

    // Receiver কে incoming call notification
    io.to(USER_ROOM(receiverId)).emit('INCOMING_CALL', {
      callId: call._id,
      channelName,
      callType,
      caller: {
        id: userId,
        // populate করে name, image পাঠাতে হবে
      },
    });

    handleEventProcessed('CALL_INITIATE', `to: ${receiverId}, type: ${callType}`);
  } catch (err) {
    socket.emit('CALL_ERROR', { message: String(err) });
  }
});

// Call Accept
socket.on('CALL_ACCEPT', async ({ callId }: { callId: string }) => {
  try {
    const { call, token, uid } = await CallService.acceptCall(callId, userId);

    // Acceptor কে token
    socket.emit('CALL_ACCEPTED', {
      callId,
      channelName: call.channelName,
      token,
      uid,
    });

    // Caller কে notify
    io.to(USER_ROOM(call.initiator.toString())).emit('CALL_ACCEPTED_BY_RECEIVER', {
      callId,
    });

    handleEventProcessed('CALL_ACCEPT', `callId: ${callId}`);
  } catch (err) {
    socket.emit('CALL_ERROR', { message: String(err) });
  }
});

// Call Reject
socket.on('CALL_REJECT', async ({ callId }: { callId: string }) => {
  try {
    const call = await CallService.rejectCall(callId, userId);

    // Caller কে notify
    io.to(USER_ROOM(call.initiator.toString())).emit('CALL_REJECTED', {
      callId,
    });

    handleEventProcessed('CALL_REJECT', `callId: ${callId}`);
  } catch (err) {
    socket.emit('CALL_ERROR', { message: String(err) });
  }
});

// Call End
socket.on('CALL_END', async ({ callId }: { callId: string }) => {
  try {
    const call = await CallService.endCall(callId, userId);

    // উভয় participant কে notify
    call.participants.forEach((participantId) => {
      if (participantId.toString() !== userId) {
        io.to(USER_ROOM(participantId.toString())).emit('CALL_ENDED', {
          callId,
          duration: call.duration,
        });
      }
    });

    handleEventProcessed('CALL_END', `callId: ${callId}`);
  } catch (err) {
    socket.emit('CALL_ERROR', { message: String(err) });
  }
});

// Call Cancel (রিং হওয়ার আগে caller cancel করলে)
socket.on('CALL_CANCEL', async ({ callId }: { callId: string }) => {
  try {
    const call = await CallService.cancelCall(callId, userId);

    // Receiver কে notify
    io.to(USER_ROOM(call.receiver.toString())).emit('CALL_CANCELLED', {
      callId,
    });

    handleEventProcessed('CALL_CANCEL', `callId: ${callId}`);
  } catch (err) {
    socket.emit('CALL_ERROR', { message: String(err) });
  }
});
```

### 4.2 Call Flow Diagram

```
┌─────────────┐                  ┌─────────────┐                  ┌─────────────┐
│   Caller    │                  │   Server    │                  │  Receiver   │
└──────┬──────┘                  └──────┬──────┘                  └──────┬──────┘
       │                                │                                │
       │  CALL_INITIATE                 │                                │
       │  {receiverId, callType}        │                                │
       │───────────────────────────────>│                                │
       │                                │                                │
       │  CALL_INITIATED                │  INCOMING_CALL                 │
       │  {callId, token, channelName}  │  {callId, caller, callType}    │
       │<───────────────────────────────│───────────────────────────────>│
       │                                │                                │
       │                                │  CALL_ACCEPT {callId}          │
       │                                │<───────────────────────────────│
       │                                │                                │
       │  CALL_ACCEPTED_BY_RECEIVER     │  CALL_ACCEPTED                 │
       │  {callId}                      │  {callId, token, channelName}  │
       │<───────────────────────────────│───────────────────────────────>│
       │                                │                                │
       │                                │                                │
       │  ══════════════════════════════════════════════════════════════ │
       │            Both join Agora channel with their tokens            │
       │  ══════════════════════════════════════════════════════════════ │
       │                                │                                │
       │  CALL_END {callId}             │                                │
       │───────────────────────────────>│                                │
       │                                │  CALL_ENDED {callId, duration} │
       │                                │───────────────────────────────>│
       │                                │                                │
```

---

## Phase 5: File Structure (Final)

```
src/
├── app/
│   └── modules/
│       ├── call/
│       │   ├── call.interface.ts     ✨ NEW
│       │   ├── call.model.ts         ✨ NEW
│       │   ├── call.controller.ts    ✨ NEW
│       │   ├── call.service.ts       ✨ NEW
│       │   ├── call.route.ts         ✨ NEW
│       │   ├── call.validation.ts    ✨ NEW
│       │   └── agora.helper.ts       ✨ NEW
│       │
│       └── whiteboard/
│           ├── whiteboard.interface.ts    ✨ NEW
│           ├── whiteboard.model.ts        ✨ NEW
│           ├── whiteboard.controller.ts   ✨ NEW
│           ├── whiteboard.service.ts      ✨ NEW
│           ├── whiteboard.route.ts        ✨ NEW
│           └── whiteboard.helper.ts       ✨ NEW
│
├── config/
│   └── index.ts              📝 UPDATE (Agora config add)
│
├── helpers/
│   └── socketHelper.ts       📝 UPDATE (Call events add)
│
└── routes/
    └── index.ts              📝 UPDATE (New routes register)
```

---

## Agora Console Setup

### Step 1: Account তৈরি
1. যান: https://console.agora.io/
2. Sign up করুন (Free tier আছে)

### Step 2: Project তৈরি
1. "Create New Project" ক্লিক করুন
2. Project name দিন
3. **App ID** কপি করুন

### Step 3: App Certificate Enable
1. Project settings এ যান
2. "App Certificate" enable করুন
3. Certificate কপি করুন

### Step 4: Whiteboard Enable
1. "Extensions" tab এ যান
2. "Interactive Whiteboard" খুঁজুন
3. "Enable" করুন
4. **Whiteboard App ID** এবং **SDK Token** কপি করুন

---

## Environment Variables (Complete)

```env
# Agora RTC (Video/Voice Calling)
AGORA_APP_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AGORA_APP_CERTIFICATE=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Agora Interactive Whiteboard
AGORA_WHITEBOARD_APP_ID=xxxxxxxxxxxxxxxx
AGORA_WHITEBOARD_SDK_TOKEN=NETLESSSDK_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AGORA_WHITEBOARD_REGION=us-sv
# Available regions: us-sv, cn-hz, sg, in-mum, eu
```

---

## Frontend Requirements

Frontend এ এই packages লাগবে:

```bash
# Video/Voice Calling
npm install agora-rtc-sdk-ng

# Whiteboard (choose one)
npm install @netless/fastboard  # Easy, prebuilt UI
# OR
npm install white-web-sdk       # Full customization
```

---

## User Requirements (Confirmed)

| Feature | Status | Notes |
|---------|--------|-------|
| **Session Type** | ✅ Scheduled | Teacher-Student scheduled meeting |
| **Payment** | ❌ No | কোন payment নেই |
| **Scheduling** | ✅ Yes | দুজনে মিলে time fix করবে |
| **Video/Voice Call** | ✅ Yes | Agora RTC |
| **Whiteboard** | ✅ Yes | Agora Interactive Whiteboard |
| **Whiteboard Persistence** | ✅ Yes | Content save করতে হবে |
| **Participant Tracking** | ✅ Yes | কে কে join করেছে track করা |
| **Reminder Notification** | ✅ Yes | Session time এর আগে notify |
| **Recording** | ❓ TBD | - |
| **Screen Sharing** | ❓ TBD | - |

---

## System Architecture (Updated)

### Session Flow Diagram

```
┌─────────────┐                                      ┌─────────────┐
│   Teacher   │                                      │   Student   │
└──────┬──────┘                                      └──────┬──────┘
       │                                                    │
       │  ══════════════════════════════════════════════════│
       │           PHASE 1: SCHEDULING                      │
       │  ══════════════════════════════════════════════════│
       │                                                    │
       │  1. Chat এ time নিয়ে আলোচনা করে                   │
       │<──────────────────────────────────────────────────>│
       │                                                    │
       │  2. CREATE_SESSION                                 │
       │     {studentId, date, time, duration}              │
       │─────────────────────┬─────────────────────────────>│
       │                     │                              │
       │               ┌─────▼─────┐                        │
       │               │  Server   │                        │
       │               │  Creates  │                        │
       │               │  Session  │                        │
       │               └─────┬─────┘                        │
       │                     │                              │
       │  SESSION_CREATED    │    SESSION_INVITE            │
       │<────────────────────┴─────────────────────────────>│
       │                                                    │
       │  ══════════════════════════════════════════════════│
       │           PHASE 2: REMINDER                        │
       │  ══════════════════════════════════════════════════│
       │                                                    │
       │  ⏰ 15 min আগে REMINDER notification               │
       │<──────────────────────────────────────────────────>│
       │                                                    │
       │  ══════════════════════════════════════════════════│
       │           PHASE 3: JOIN SESSION                    │
       │  ══════════════════════════════════════════════════│
       │                                                    │
       │  Time হলে JOIN_SESSION                             │
       │─────────────────────┬─────────────────────────────>│
       │                     │                              │
       │               ┌─────▼─────┐                        │
       │               │  Agora    │                        │
       │               │  Channel  │                        │
       │               │  + Token  │                        │
       │               └─────┬─────┘                        │
       │                     │                              │
       │  Token + Channel    │    Token + Channel           │
       │<────────────────────┴─────────────────────────────>│
       │                                                    │
       │  ═══════════ VIDEO + WHITEBOARD SESSION ══════════ │
       │<─────────────────────────────────────────────────->│
       │                                                    │
       │  ══════════════════════════════════════════════════│
       │           PHASE 4: END SESSION                     │
       │  ══════════════════════════════════════════════════│
       │                                                    │
       │  END_SESSION                                       │
       │─────────────────────┬─────────────────────────────>│
       │                     │                              │
       │               ┌─────▼─────┐                        │
       │               │  Save     │                        │
       │               │  - Notes  │                        │
       │               │  - Duration│                       │
       │               └───────────┘                        │
       │                                                    │
```

---

## NEW: Session Module (Replaces Call Module)

### Module Structure

```
src/app/modules/session/
├── session.interface.ts      # TypeScript types
├── session.model.ts          # Mongoose schema
├── session.controller.ts     # Request handlers
├── session.service.ts        # Business logic
├── session.route.ts          # Routes
├── session.validation.ts     # Zod schemas
└── agora.helper.ts           # Token generation
```

### Session Schema

```typescript
import { Model, Types } from 'mongoose';

export type SessionStatus =
  | 'scheduled'      // সময় fix হয়েছে
  | 'active'         // চলছে
  | 'completed'      // শেষ হয়েছে
  | 'cancelled'      // বাতিল
  | 'missed';        // কেউ join করেনি

export interface ISessionParticipant {
  userId: Types.ObjectId;     // User এর MongoDB ObjectId
  agoraUid: number;           // User এর Agora UID (number)
  role: 'teacher' | 'student';
  joinedAt?: Date;            // কখন join করেছে
  leftAt?: Date;              // কখন leave করেছে
  duration?: number;          // কতক্ষণ ছিল (seconds)
}

export interface ISession {
  _id: Types.ObjectId;

  // Participants
  teacher: Types.ObjectId;
  student: Types.ObjectId;

  // Schedule
  scheduledAt: Date;           // কখন হবে
  duration: number;            // মিনিটে (30, 60, 90, 120)

  // Agora
  channelName: string;
  whiteboardRoomUuid?: string;

  // Status & Tracking
  status: SessionStatus;
  actualStartTime?: Date;      // আসলে কখন শুরু হয়েছে
  actualEndTime?: Date;
  actualDuration?: number;     // আসলে কতক্ষণ হয়েছে (seconds)

  // Participant Sessions
  participantSessions: ISessionParticipant[];

  // Whiteboard
  whiteboardSnapshots: {
    url: string;
    takenAt: Date;
  }[];
  whiteboardState?: string;    // JSON

  // Metadata
  title?: string;              // Optional session title
  notes?: string;              // Teacher এর notes
  chatId?: Types.ObjectId;     // যদি chat থেকে create হয়

  // Reminders
  remindersSent: {
    type: '1hour' | '15min' | '5min';
    sentAt: Date;
  }[];

  createdAt: Date;
  updatedAt: Date;
}
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/sessions` | নতুন session schedule করে |
| `GET` | `/api/v1/sessions` | User এর সব sessions |
| `GET` | `/api/v1/sessions/:id` | Single session details |
| `GET` | `/api/v1/sessions/upcoming` | আসন্ন sessions |
| `POST` | `/api/v1/sessions/:id/join` | Session এ join করে (token পায়) |
| `POST` | `/api/v1/sessions/:id/end` | Session শেষ করে |
| `POST` | `/api/v1/sessions/:id/cancel` | Session cancel করে |
| `PATCH` | `/api/v1/sessions/:id/reschedule` | সময় পরিবর্তন |
| `GET` | `/api/v1/sessions/:id/whiteboard` | Whiteboard data |

### Socket Events

```typescript
// ===========================
// 🔹 Session Events
// ===========================

// Session তৈরি হলে
'SESSION_CREATED'        // Creator পায়
'SESSION_INVITE'         // Invitee পায়

// Reminder
'SESSION_REMINDER'       // { sessionId, startsIn: '15 minutes' }

// Join/Leave
'SESSION_USER_JOINED'    // কেউ join করলে
'SESSION_USER_LEFT'      // কেউ leave করলে
'SESSION_BOTH_JOINED'    // দুজনেই join করলে
'SESSION_STARTED'        // Session officially শুরু

// End
'SESSION_ENDED'          // Session শেষ
'SESSION_CANCELLED'      // Cancel হলে

// Whiteboard
'WHITEBOARD_ENABLED'     // Whiteboard চালু
'WHITEBOARD_SAVED'       // Save হলে
```

### Reminder System (JobBuilder Integration)

```typescript
// Session create হলে reminder jobs schedule করে
const scheduleSessionReminders = async (session: ISession) => {
  const sessionTime = new Date(session.scheduledAt);

  // 1 hour আগে
  const oneHourBefore = new Date(sessionTime.getTime() - 60 * 60 * 1000);
  await JobBuilder.create('session-reminder')
    .data({ sessionId: session._id, type: '1hour' })
    .schedule(oneHourBefore)
    .save();

  // 15 min আগে
  const fifteenMinBefore = new Date(sessionTime.getTime() - 15 * 60 * 1000);
  await JobBuilder.create('session-reminder')
    .data({ sessionId: session._id, type: '15min' })
    .schedule(fifteenMinBefore)
    .save();

  // 5 min আগে
  const fiveMinBefore = new Date(sessionTime.getTime() - 5 * 60 * 1000);
  await JobBuilder.create('session-reminder')
    .data({ sessionId: session._id, type: '5min' })
    .schedule(fiveMinBefore)
    .save();
};
```

---

## Phase 7: Session Participant Tracking (NEW)

### 7.1 Updated Call Schema

```typescript
export interface ICallParticipant {
  userId: Types.ObjectId;   // User এর MongoDB ObjectId
  agoraUid: number;         // User এর Agora UID
  joinedAt: Date;
  leftAt?: Date;
  duration?: number;        // seconds
  connectionQuality?: 'excellent' | 'good' | 'poor' | 'unknown';
}

export interface ICall {
  // ... existing fields ...

  // 🆕 Participant tracking
  participantSessions: ICallParticipant[];
  maxConcurrentParticipants: number;  // সর্বোচ্চ কতজন একসাথে ছিল
}
```

### 7.2 Call Model Update

```typescript
const callParticipantSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  agoraUid: {
    type: Number,
    required: true,
  },
  joinedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  leftAt: Date,
  duration: Number,
  connectionQuality: {
    type: String,
    enum: ['excellent', 'good', 'poor', 'unknown'],
  },
}, { _id: false });

// Call schema তে যোগ করুন
participantSessions: [callParticipantSchema],
maxConcurrentParticipants: {
  type: Number,
  default: 0,
},
```

### 7.3 New Socket Events

```typescript
// ===========================
// 🔹 Participant Tracking Events
// ===========================

// User Agora channel এ join করলে frontend থেকে emit করবে
socket.on('CALL_USER_JOINED_CHANNEL', async ({
  callId,
  agoraUid,
}: {
  callId: string;
  agoraUid: number;
}) => {
  try {
    const call = await Call.findById(callId);
    if (!call) return;

    // Add participant session
    const session: ICallParticipant = {
      userId: new Types.ObjectId(userId),
      agoraUid,
      joinedAt: new Date(),
    };

    call.participantSessions.push(session);

    // Calculate current concurrent count
    const activeCount = call.participantSessions.filter(
      (p) => p.joinedAt && !p.leftAt
    ).length;

    if (activeCount > call.maxConcurrentParticipants) {
      call.maxConcurrentParticipants = activeCount;
    }

    await call.save();

    // Notify all participants
    call.participants.forEach((pId) => {
      io.to(USER_ROOM(pId.toString())).emit('CALL_PARTICIPANT_JOINED', {
        callId,
        odId: userId,  // Fixed: odId variable -> userId
        agoraUid,
        activeParticipants: activeCount,
      });
    });

    handleEventProcessed('CALL_USER_JOINED_CHANNEL', `callId: ${callId}, odId: ${userId}`);
  } catch (err) {
    socket.emit('CALL_ERROR', { message: String(err) });
  }
});

// User Agora channel থেকে leave করলে
socket.on('CALL_USER_LEFT_CHANNEL', async ({
  callId,
  agoraUid,
}: {
  callId: string;
  agoraUid: number;
}) => {
  try {
    const call = await Call.findById(callId);
    if (!call) return;

    // Find and update participant session
    const session = call.participantSessions.find(
      (p) => p.userId.toString() === userId && !p.leftAt
    );

    if (session) {
      session.leftAt = new Date();
      session.duration = Math.floor(
        (session.leftAt.getTime() - session.joinedAt.getTime()) / 1000
      );
    }

    await call.save();

    // Calculate current active count
    const activeCount = call.participantSessions.filter(
      (p) => p.joinedAt && !p.leftAt
    ).length;

    // Notify remaining participants
    call.participants.forEach((pId) => {
      io.to(USER_ROOM(pId.toString())).emit('CALL_PARTICIPANT_LEFT', {
        callId,
        userId,  // Fixed: odId -> userId
        activeParticipants: activeCount,
      });
    });

    // If no one left, auto-end call
    if (activeCount === 0 && call.status === 'active') {
      call.status = 'ended';
      call.endTime = new Date();
      if (call.startTime) {
        call.duration = Math.floor(
          (call.endTime.getTime() - call.startTime.getTime()) / 1000
        );
      }
      await call.save();
    }

    handleEventProcessed('CALL_USER_LEFT_CHANNEL', `callId: ${callId}, odId: ${userId}`);
  } catch (err) {
    socket.emit('CALL_ERROR', { message: String(err) });
  }
});
```

### 7.4 API Endpoints for Tracking

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/calls/:callId/participants` | বর্তমান participants দেখায় |
| `GET` | `/api/v1/calls/:callId/sessions` | সব join/leave history |

### 7.5 Call Service Updates

```typescript
/**
 * Call এর active participants দেখায়
 */
const getActiveParticipants = async (callId: string): Promise<{
  count: number;
  participants: any[];
}> => {
  const call = await Call.findById(callId)
    .populate('participantSessions.userId', 'name profilePicture');

  if (!call) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Call not found');
  }

  const activeParticipants = call.participantSessions
    .filter((p) => p.joinedAt && !p.leftAt)
    .map((p) => ({
      user: p.userId,  // Fixed: odId -> userId
      agoraUid: p.agoraUid,
      joinedAt: p.joinedAt,
    }));

  return {
    count: activeParticipants.length,
    participants: activeParticipants,
  };
};

/**
 * Call এর পুরো session history
 */
const getSessionHistory = async (callId: string): Promise<any[]> => {
  const call = await Call.findById(callId)
    .populate('participantSessions.userId', 'name profilePicture');

  if (!call) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Call not found');
  }

  return call.participantSessions.map((session) => ({
    user: session.userId,  // Fixed: odId -> userId
    agoraUid: session.agoraUid,
    joinedAt: session.joinedAt,
    leftAt: session.leftAt,
    duration: session.duration,
    connectionQuality: session.connectionQuality,
  }));
};
```

### 7.6 Frontend Integration Flow

```
┌─────────────┐                  ┌─────────────┐                  ┌─────────────┐
│  Frontend   │                  │   Backend   │                  │    Agora    │
└──────┬──────┘                  └──────┬──────┘                  └──────┬──────┘
       │                                │                                │
       │  Join Agora Channel            │                                │
       │────────────────────────────────────────────────────────────────>│
       │                                │                                │
       │  onUserJoined callback         │                                │
       │<────────────────────────────────────────────────────────────────│
       │                                │                                │
       │  CALL_USER_JOINED_CHANNEL      │                                │
       │  {callId, agoraUid}            │                                │
       │───────────────────────────────>│                                │
       │                                │  (Save to DB)                  │
       │                                │                                │
       │  CALL_PARTICIPANT_JOINED       │                                │
       │  {callId, activeCount}         │                                │
       │<───────────────────────────────│                                │
       │                                │                                │
```

### 7.7 Check Both Users Joined

```typescript
/**
 * দুজনেই join করেছে কিনা check করে
 */
const areBothParticipantsJoined = async (callId: string): Promise<boolean> => {
  const call = await Call.findById(callId);
  if (!call) return false;

  const activeCount = call.participantSessions.filter(
    (p) => p.joinedAt && !p.leftAt
  ).length;

  return activeCount >= 2; // 1-to-1 call এ 2 জন
};

// Socket event এ use করুন
socket.on('CALL_USER_JOINED_CHANNEL', async ({ callId, agoraUid }) => {
  // ... existing code ...

  // Both joined হলে notify করুন
  if (await areBothParticipantsJoined(callId)) {
    call.participants.forEach((pId) => {
      io.to(USER_ROOM(pId.toString())).emit('CALL_BOTH_CONNECTED', {
        callId,
        message: 'Both participants are now connected',
      });
    });
  }
});
```

---

## Phase 6: Whiteboard Persistence (NEW)

### 6.1 Whiteboard Snapshot/Export Strategy

Agora Whiteboard এ content save করার ৩টি উপায় আছে:

#### Option A: Scene Snapshot (Screenshot) ✅ Recommended
```typescript
// Whiteboard এর current state এর image snapshot নেয়
export const takeWhiteboardSnapshot = async (
  roomUuid: string,
  scenePath: string = '/init'
): Promise<string> => {
  const response = await axios.post(
    `${WHITEBOARD_API}/rooms/${roomUuid}/screenshots`,
    {
      width: 1920,
      height: 1080,
      scenePath,
    },
    { headers: getHeaders() }
  );
  return response.data.url; // PNG image URL
};
```

#### Option B: Room State Export (JSON)
```typescript
// Whiteboard এর সব drawing data JSON এ export করে
export const exportWhiteboardState = async (
  roomUuid: string
): Promise<any> => {
  const response = await axios.get(
    `${WHITEBOARD_API}/rooms/${roomUuid}/state`,
    { headers: getHeaders() }
  );
  return response.data; // Full room state JSON
};
```

#### Option C: Recording (Video)
- Agora Cloud Recording ব্যবহার করে whiteboard session record করা যায়
- Extra cost involved

### 6.2 Updated Whiteboard Schema

```typescript
export interface IWhiteboardRoom {
  _id: Types.ObjectId;
  uuid: string;                    // Agora room UUID
  name: string;
  createdBy: Types.ObjectId;
  participants: Types.ObjectId[];
  callId?: Types.ObjectId;
  isActive: boolean;

  // 🆕 Persistence fields
  snapshots: {
    url: string;                   // S3/Cloudinary URL
    takenAt: Date;
    takenBy: Types.ObjectId;
  }[];
  exportedState?: string;          // JSON string of room state
  lastSavedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}
```

### 6.3 New API Endpoints (Persistence)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/whiteboard/rooms/:roomId/snapshot` | Screenshot নেয় এবং save করে |
| `POST` | `/api/v1/whiteboard/rooms/:roomId/export` | Full state export করে |
| `GET` | `/api/v1/whiteboard/rooms/:roomId/snapshots` | সব snapshots দেখায় |
| `POST` | `/api/v1/whiteboard/rooms/:roomId/restore` | Previous state restore করে |

### 6.4 Auto-Save Feature

```typescript
// Call শেষ হলে automatically whiteboard save করবে
const onCallEnd = async (callId: string) => {
  const call = await Call.findById(callId);

  if (call?.whiteboardRoomUuid) {
    // Take final snapshot
    const snapshotUrl = await takeWhiteboardSnapshot(call.whiteboardRoomUuid);

    // Export full state
    const state = await exportWhiteboardState(call.whiteboardRoomUuid);

    // Save to database
    await WhiteboardRoom.findOneAndUpdate(
      { uuid: call.whiteboardRoomUuid },
      {
        $push: {
          snapshots: {
            url: snapshotUrl,
            takenAt: new Date(),
            takenBy: call.initiator,
          },
        },
        exportedState: JSON.stringify(state),
        lastSavedAt: new Date(),
      }
    );
  }
};
```

### 6.5 Storage Options

| Storage | Pros | Cons |
|---------|------|------|
| **MongoDB** | Simple, same DB | Large files slow |
| **S3** ✅ | Scalable, CDN | Extra setup |
| **Cloudinary** | Image optimization | Cost for large files |

**Recommended**: S3 for snapshots, MongoDB for state JSON

---

## Implementation Order

| Phase | কাজ | আনুমানিক সময় |
|-------|------|---------------|
| 1 | Config + Dependencies | 15 min |
| 2 | Call Module (Basic) | 1-2 hours |
| 3 | Socket.IO Events | 1 hour |
| 4 | Whiteboard Module | 1 hour |
| 5 | Testing + Fixes | 1 hour |

**Total: ~4-5 hours**

---

## Sources

- [Agora Video SDK Documentation](https://docs.agora.io/en/)
- [Building Token Server with Node.js](https://www.agora.io/en/blog/how-to-build-a-token-server-for-agora-applications-using-nodejs/)
- [Agora Interactive Whiteboard SDK](https://docs.agora.io/en/interactive-whiteboard/get-started/get-started-sdk)
- [Agora Whiteboard Product Page](https://www.agora.io/en/products/interactive-whiteboard/)
- [GitHub: video-sdk-samples-js](https://github.com/AgoraIO/video-sdk-samples-js)

---

## ⚠️ Critical Fixes Summary (Context7 Verification)

**তারিখ**: 2025-12-05

Agora official documentation verify করে নিম্নলিখিত critical issues fix করা হয়েছে:

### Fix 1: Package Name Change
| আগে (ভুল) | এখন (সঠিক) |
|-----------|------------|
| `agora-access-token` | `agora-token` |

**কারণ**: `agora-access-token` package deprecated। Agora officially `agora-token` recommend করে।

### Fix 2: Token Generation API Update
| বিষয় | আগে | এখন |
|-------|-----|-----|
| Import | `RtcRole` | `Role as RtcRole` |
| Expiry Parameters | Single (`privilegeExpiredTs`) | Dual (`tokenExpiration`, `privilegeExpiration`) |

**আগের কোড (ভুল):**
```typescript
RtcTokenBuilder.buildTokenWithUid(
  appId, appCertificate, channelName, uid, rtcRole,
  privilegeExpiredTs  // ❌ Single expiry
);
```

**এখনকার কোড (সঠিক):**
```typescript
RtcTokenBuilder.buildTokenWithUid(
  appId, appCertificate, channelName, uid, rtcRole,
  tokenExpirationInSeconds,      // ✅ Token expiry
  privilegeExpirationInSeconds   // ✅ Privilege expiry
);
```

### Fix 3: Interface Typo Fix
| আগে (ভুল) | এখন (সঠিক) |
|-----------|------------|
| `odId: Types.ObjectId` | `userId: Types.ObjectId` |
| `odId: number` (duplicate!) | `agoraUid: number` |

**Affected Interfaces:**
- `ISessionParticipant`
- `ICallParticipant`

---

**Verification Source**: Agora Official Documentation (https://docs.agora.io/en/) via Context7

---

## 🎨 Frontend Integration Guide (React/Next.js)

এই section এ frontend এ কিভাবে Agora Video Call এবং Whiteboard implement করবে তার complete guide দেওয়া হলো।

### F1. Dependencies Install করুন

```bash
# Video/Voice Calling SDK
npm install agora-rtc-sdk-ng

# Whiteboard SDK (choose one)
npm install @netless/fastboard    # ✅ Recommended - Easy, prebuilt UI
# OR
npm install white-web-sdk         # Full customization needed
```

### F2. Environment Variables (Frontend)

`.env.local` ফাইলে:
```env
# শুধু App ID frontend এ রাখুন (Certificate NEVER রাখবেন না!)
NEXT_PUBLIC_AGORA_APP_ID=your_app_id
```

> ⚠️ **SECURITY WARNING**: `AGORA_APP_CERTIFICATE` কখনোই frontend এ রাখবেন না! Token সবসময় backend থেকে নিতে হবে।

---

### F3. Video/Voice Call Implementation

#### F3.1 Agora Client Setup (hooks/useAgora.ts)

```typescript
import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
} from 'agora-rtc-sdk-ng';
import { useState, useEffect, useCallback } from 'react';

// Client instance (singleton)
let client: IAgoraRTCClient | null = null;

export interface UseAgoraOptions {
  appId: string;
  channel: string;
  token: string;
  uid: number;
}

export interface UseAgoraReturn {
  // State
  localAudioTrack: IMicrophoneAudioTrack | null;
  localVideoTrack: ICameraVideoTrack | null;
  remoteUsers: IAgoraRTCRemoteUser[];
  isJoined: boolean;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;

  // Actions
  join: () => Promise<void>;
  leave: () => Promise<void>;
  toggleAudio: () => void;
  toggleVideo: () => void;
}

export const useAgora = (options: UseAgoraOptions): UseAgoraReturn => {
  const { appId, channel, token, uid } = options;

  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [isJoined, setIsJoined] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  // Initialize client once
  useEffect(() => {
    if (!client) {
      client = AgoraRTC.createClient({
        mode: 'rtc',      // 'rtc' for video call, 'live' for streaming
        codec: 'vp8'      // 'vp8' or 'h264'
      });
    }

    // Event listeners
    const handleUserPublished = async (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
      await client!.subscribe(user, mediaType);

      if (mediaType === 'video') {
        setRemoteUsers(prev => {
          // Remove if exists, then add
          const filtered = prev.filter(u => u.uid !== user.uid);
          return [...filtered, user];
        });
      }

      if (mediaType === 'audio') {
        user.audioTrack?.play();
      }
    };

    const handleUserUnpublished = (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
      if (mediaType === 'video') {
        setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
      }
    };

    const handleUserLeft = (user: IAgoraRTCRemoteUser) => {
      setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
    };

    client.on('user-published', handleUserPublished);
    client.on('user-unpublished', handleUserUnpublished);
    client.on('user-left', handleUserLeft);

    return () => {
      client?.off('user-published', handleUserPublished);
      client?.off('user-unpublished', handleUserUnpublished);
      client?.off('user-left', handleUserLeft);
    };
  }, []);

  // Join channel
  const join = useCallback(async () => {
    if (!client || isJoined) return;

    try {
      // Join the channel
      await client.join(appId, channel, token, uid);

      // Create local tracks
      const [audioTrack, videoTrack] = await Promise.all([
        AgoraRTC.createMicrophoneAudioTrack(),
        AgoraRTC.createCameraVideoTrack(),
      ]);

      setLocalAudioTrack(audioTrack);
      setLocalVideoTrack(videoTrack);

      // Publish tracks
      await client.publish([audioTrack, videoTrack]);

      setIsJoined(true);
      console.log('✅ Joined channel:', channel);
    } catch (error) {
      console.error('❌ Failed to join:', error);
      throw error;
    }
  }, [appId, channel, token, uid, isJoined]);

  // Leave channel
  const leave = useCallback(async () => {
    if (!client || !isJoined) return;

    // Close local tracks
    localAudioTrack?.close();
    localVideoTrack?.close();

    setLocalAudioTrack(null);
    setLocalVideoTrack(null);
    setRemoteUsers([]);

    await client.leave();
    setIsJoined(false);
    console.log('👋 Left channel');
  }, [isJoined, localAudioTrack, localVideoTrack]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localAudioTrack) {
      localAudioTrack.setEnabled(!isAudioEnabled);
      setIsAudioEnabled(!isAudioEnabled);
    }
  }, [localAudioTrack, isAudioEnabled]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localVideoTrack) {
      localVideoTrack.setEnabled(!isVideoEnabled);
      setIsVideoEnabled(!isVideoEnabled);
    }
  }, [localVideoTrack, isVideoEnabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isJoined) {
        leave();
      }
    };
  }, []);

  return {
    localAudioTrack,
    localVideoTrack,
    remoteUsers,
    isJoined,
    isAudioEnabled,
    isVideoEnabled,
    join,
    leave,
    toggleAudio,
    toggleVideo,
  };
};
```

#### F3.2 Video Player Component (components/VideoPlayer.tsx)

```tsx
import { useEffect, useRef } from 'react';
import { ICameraVideoTrack, IRemoteVideoTrack } from 'agora-rtc-sdk-ng';

interface VideoPlayerProps {
  videoTrack: ICameraVideoTrack | IRemoteVideoTrack | null;
  isLocal?: boolean;
  userName?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoTrack,
  isLocal = false,
  userName = 'User',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (videoTrack && containerRef.current) {
      videoTrack.play(containerRef.current);
    }

    return () => {
      videoTrack?.stop();
    };
  }, [videoTrack]);

  return (
    <div className="relative rounded-lg overflow-hidden bg-gray-900">
      <div
        ref={containerRef}
        className="w-full h-full min-h-[200px]"
      />
      <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-white text-sm">
        {isLocal ? 'You' : userName}
      </div>
    </div>
  );
};
```

#### F3.3 Session Room Page (pages/session/[sessionId].tsx)

```tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useSocket } from '@/hooks/useSocket';
import { useAgora } from '@/hooks/useAgora';
import { VideoPlayer } from '@/components/VideoPlayer';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff,
  Users, MessageSquare
} from 'lucide-react';

interface SessionData {
  channelName: string;
  token: string;
  uid: number;
  sessionId: string;
  otherUser: {
    name: string;
    profilePicture: string;
  };
}

export default function SessionRoom() {
  const router = useRouter();
  const { sessionId } = router.query;
  const socket = useSocket();

  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bothJoined, setBothJoined] = useState(false);

  // Backend থেকে session data fetch করুন
  useEffect(() => {
    if (!sessionId) return;

    const fetchSessionData = async () => {
      try {
        const res = await fetch(`/api/v1/sessions/${sessionId}/join`, {
          method: 'POST',
          credentials: 'include',
        });

        if (!res.ok) throw new Error('Failed to join session');

        const data = await res.json();
        setSessionData(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessionData();
  }, [sessionId]);

  // Agora hook
  const {
    localVideoTrack,
    remoteUsers,
    isJoined,
    isAudioEnabled,
    isVideoEnabled,
    join,
    leave,
    toggleAudio,
    toggleVideo,
  } = useAgora({
    appId: process.env.NEXT_PUBLIC_AGORA_APP_ID!,
    channel: sessionData?.channelName || '',
    token: sessionData?.token || '',
    uid: sessionData?.uid || 0,
  });

  // Session data পেলে join করুন
  useEffect(() => {
    if (sessionData && !isJoined) {
      join();

      // Backend কে জানান যে join করেছেন
      socket?.emit('SESSION_USER_JOINED', {
        sessionId: sessionData.sessionId,
        agoraUid: sessionData.uid,
      });
    }
  }, [sessionData, isJoined, join, socket]);

  // Socket events listen করুন
  useEffect(() => {
    if (!socket) return;

    socket.on('SESSION_BOTH_JOINED', () => {
      setBothJoined(true);
    });

    socket.on('SESSION_USER_LEFT', () => {
      setBothJoined(false);
    });

    socket.on('SESSION_ENDED', () => {
      router.push('/sessions');
    });

    return () => {
      socket.off('SESSION_BOTH_JOINED');
      socket.off('SESSION_USER_LEFT');
      socket.off('SESSION_ENDED');
    };
  }, [socket, router]);

  // End session
  const handleEndSession = async () => {
    await leave();
    socket?.emit('SESSION_END', { sessionId });
    router.push('/sessions');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Status Bar */}
      <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <Users className="w-5 h-5" />
          <span>{bothJoined ? '২ জন connected' : 'Waiting for other user...'}</span>
        </div>
        <div className="text-gray-400 text-sm">
          Session ID: {sessionId}
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Local Video */}
        <VideoPlayer
          videoTrack={localVideoTrack}
          isLocal={true}
        />

        {/* Remote Video */}
        {remoteUsers.map(user => (
          <VideoPlayer
            key={user.uid}
            videoTrack={user.videoTrack}
            userName={sessionData?.otherUser.name}
          />
        ))}

        {/* Waiting placeholder */}
        {remoteUsers.length === 0 && (
          <div className="flex items-center justify-center bg-gray-800 rounded-lg">
            <div className="text-center text-gray-400">
              <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>অপেক্ষা করছি...</p>
              <p className="text-sm">{sessionData?.otherUser.name} এখনো join করেনি</p>
            </div>
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="bg-gray-800 px-4 py-4">
        <div className="flex items-center justify-center gap-4">
          {/* Mic Toggle */}
          <button
            onClick={toggleAudio}
            className={`p-4 rounded-full ${
              isAudioEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-500 hover:bg-red-600'
            }`}
          >
            {isAudioEnabled ? (
              <Mic className="w-6 h-6 text-white" />
            ) : (
              <MicOff className="w-6 h-6 text-white" />
            )}
          </button>

          {/* Video Toggle */}
          <button
            onClick={toggleVideo}
            className={`p-4 rounded-full ${
              isVideoEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-500 hover:bg-red-600'
            }`}
          >
            {isVideoEnabled ? (
              <Video className="w-6 h-6 text-white" />
            ) : (
              <VideoOff className="w-6 h-6 text-white" />
            )}
          </button>

          {/* End Call */}
          <button
            onClick={handleEndSession}
            className="p-4 rounded-full bg-red-500 hover:bg-red-600"
          >
            <PhoneOff className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

### F4. Whiteboard Implementation

#### F4.1 Whiteboard Hook (hooks/useWhiteboard.ts)

```typescript
import { useState, useCallback, useRef } from 'react';

// Fastboard ব্যবহার করলে
import { createFastboard, FastboardApp } from '@netless/fastboard';

// অথবা white-web-sdk ব্যবহার করলে
// import { WhiteWebSdk, Room } from 'white-web-sdk';

export interface UseWhiteboardOptions {
  appIdentifier: string;
  roomUuid: string;
  roomToken: string;
  uid: string;
  region?: string;
}

export interface UseWhiteboardReturn {
  app: FastboardApp | null;
  isReady: boolean;
  error: string | null;
  mountWhiteboard: (container: HTMLDivElement) => Promise<void>;
  unmountWhiteboard: () => void;
}

export const useWhiteboard = (options: UseWhiteboardOptions): UseWhiteboardReturn => {
  const { appIdentifier, roomUuid, roomToken, uid, region = 'us-sv' } = options;

  const [app, setApp] = useState<FastboardApp | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const mountWhiteboard = useCallback(async (container: HTMLDivElement) => {
    if (!container) return;
    containerRef.current = container;

    try {
      // Fastboard দিয়ে (সহজ)
      const fastboardApp = await createFastboard({
        sdkConfig: {
          appIdentifier,
          region,
        },
        joinRoom: {
          uid,
          uuid: roomUuid,
          roomToken,
        },
        managerConfig: {
          cursor: true,  // অন্যদের cursor দেখাবে
        },
      });

      // Container এ mount করুন
      fastboardApp.manager.mount(container);

      setApp(fastboardApp);
      setIsReady(true);
      console.log('✅ Whiteboard ready');
    } catch (err) {
      console.error('❌ Whiteboard error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [appIdentifier, roomUuid, roomToken, uid, region]);

  const unmountWhiteboard = useCallback(() => {
    if (app) {
      app.destroy();
      setApp(null);
      setIsReady(false);
    }
  }, [app]);

  return {
    app,
    isReady,
    error,
    mountWhiteboard,
    unmountWhiteboard,
  };
};
```

#### F4.2 Whiteboard Component (components/Whiteboard.tsx)

```tsx
import { useEffect, useRef } from 'react';
import { useWhiteboard } from '@/hooks/useWhiteboard';

interface WhiteboardProps {
  roomUuid: string;
  roomToken: string;
  uid: string;
  onReady?: () => void;
}

export const Whiteboard: React.FC<WhiteboardProps> = ({
  roomUuid,
  roomToken,
  uid,
  onReady,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const { isReady, error, mountWhiteboard, unmountWhiteboard } = useWhiteboard({
    appIdentifier: process.env.NEXT_PUBLIC_AGORA_WHITEBOARD_APP_ID!,
    roomUuid,
    roomToken,
    uid,
  });

  useEffect(() => {
    if (containerRef.current) {
      mountWhiteboard(containerRef.current);
    }

    return () => {
      unmountWhiteboard();
    };
  }, [mountWhiteboard, unmountWhiteboard]);

  useEffect(() => {
    if (isReady && onReady) {
      onReady();
    }
  }, [isReady, onReady]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <div className="text-red-500">Whiteboard Error: {error}</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[400px] bg-white"
      style={{ touchAction: 'none' }}
    />
  );
};
```

#### F4.3 Session Room with Whiteboard (Updated)

```tsx
// pages/session/[sessionId].tsx এ যোগ করুন

import { Whiteboard } from '@/components/Whiteboard';
import { useState } from 'react';
import { PenTool } from 'lucide-react';

// State যোগ করুন
const [showWhiteboard, setShowWhiteboard] = useState(false);
const [whiteboardData, setWhiteboardData] = useState<{
  roomUuid: string;
  roomToken: string;
} | null>(null);

// Whiteboard enable করার function
const enableWhiteboard = async () => {
  try {
    const res = await fetch(`/api/v1/sessions/${sessionId}/whiteboard`, {
      method: 'POST',
      credentials: 'include',
    });

    const data = await res.json();
    setWhiteboardData({
      roomUuid: data.data.roomUuid,
      roomToken: data.data.roomToken,
    });
    setShowWhiteboard(true);
  } catch (err) {
    console.error('Failed to enable whiteboard:', err);
  }
};

// Control Bar এ Whiteboard button যোগ করুন
<button
  onClick={() => showWhiteboard ? setShowWhiteboard(false) : enableWhiteboard()}
  className={`p-4 rounded-full ${
    showWhiteboard ? 'bg-blue-500' : 'bg-gray-700 hover:bg-gray-600'
  }`}
>
  <PenTool className="w-6 h-6 text-white" />
</button>

// Video Grid এ Whiteboard render করুন (conditionally)
{showWhiteboard && whiteboardData && (
  <div className="col-span-2 h-[400px]">
    <Whiteboard
      roomUuid={whiteboardData.roomUuid}
      roomToken={whiteboardData.roomToken}
      uid={sessionData?.uid.toString() || '0'}
    />
  </div>
)}
```

---

### F5. Socket.IO Integration (Frontend)

#### F5.1 Socket Hook (hooks/useSocket.ts)

```typescript
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!socket) {
      socket = io(process.env.NEXT_PUBLIC_API_URL!, {
        withCredentials: true,
        transports: ['websocket'],
      });
    }

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('🔌 Socket connected');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('🔌 Socket disconnected');
    });

    return () => {
      socket?.off('connect');
      socket?.off('disconnect');
    };
  }, []);

  return socket;
};
```

#### F5.2 Session Socket Events

```typescript
// Session page এ ব্যবহার করুন

useEffect(() => {
  if (!socket) return;

  // Reminder events
  socket.on('SESSION_REMINDER', (data: { sessionId: string; startsIn: string }) => {
    toast.info(`Session ${data.startsIn} পরে শুরু হবে!`);
  });

  // User joined
  socket.on('SESSION_USER_JOINED', (data: { userId: string; role: string }) => {
    toast.success(`${data.role === 'teacher' ? 'Teacher' : 'Student'} joined!`);
  });

  // Both joined
  socket.on('SESSION_BOTH_JOINED', () => {
    setBothJoined(true);
    toast.success('দুজনেই connected! Session শুরু হচ্ছে...');
  });

  // Session ended
  socket.on('SESSION_ENDED', (data: { duration: number }) => {
    toast.info(`Session শেষ। Duration: ${Math.floor(data.duration / 60)} minutes`);
    router.push('/sessions');
  });

  // Whiteboard events
  socket.on('WHITEBOARD_ENABLED', (data: { roomUuid: string; roomToken: string }) => {
    setWhiteboardData(data);
    toast.info('Whiteboard enabled!');
  });

  return () => {
    socket.off('SESSION_REMINDER');
    socket.off('SESSION_USER_JOINED');
    socket.off('SESSION_BOTH_JOINED');
    socket.off('SESSION_ENDED');
    socket.off('WHITEBOARD_ENABLED');
  };
}, [socket]);
```

---

### F6. Complete Session Flow Diagram (Frontend)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND FLOW                                 │
└─────────────────────────────────────────────────────────────────────┘

1️⃣ SESSION LIST PAGE (/sessions)
   │
   │  User clicks "Join Session"
   │
   ▼
2️⃣ FETCH SESSION DATA
   │
   │  POST /api/v1/sessions/:id/join
   │  ← Receives: { channelName, token, uid, whiteboardRoomUuid }
   │
   ▼
3️⃣ AGORA JOIN
   │
   │  client.join(appId, channelName, token, uid)
   │  AgoraRTC.createMicrophoneAudioTrack()
   │  AgoraRTC.createCameraVideoTrack()
   │  client.publish([audioTrack, videoTrack])
   │
   ▼
4️⃣ SOCKET EMIT
   │
   │  socket.emit('SESSION_USER_JOINED', { sessionId, agoraUid })
   │
   ▼
5️⃣ WAIT FOR REMOTE USER
   │
   │  client.on('user-published') → Subscribe & Display
   │  socket.on('SESSION_BOTH_JOINED') → Session officially started
   │
   ▼
6️⃣ WHITEBOARD (OPTIONAL)
   │
   │  POST /api/v1/sessions/:id/whiteboard
   │  ← Receives: { roomUuid, roomToken }
   │  createFastboard() → Mount to container
   │
   ▼
7️⃣ END SESSION
   │
   │  localAudioTrack.close()
   │  localVideoTrack.close()
   │  client.leave()
   │  socket.emit('SESSION_END', { sessionId })
   │
   ▼
8️⃣ REDIRECT TO SESSION LIST

```

---

### F7. Error Handling & Edge Cases

#### F7.1 Common Errors

| Error | কারণ | Solution |
|-------|------|----------|
| `INVALID_TOKEN` | Token expired বা ভুল | Backend থেকে নতুন token নিন |
| `PERMISSION_DENIED` | Camera/Mic access denied | User কে permission দিতে বলুন |
| `DEVICE_NOT_FOUND` | Camera/Mic নেই | Fallback UI দেখান |
| `NETWORK_ERROR` | Internet সমস্যা | Reconnect logic implement করুন |

#### F7.2 Permission Handling

```typescript
// Check device permissions
const checkPermissions = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    stream.getTracks().forEach(track => track.stop());
    return { video: true, audio: true };
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === 'NotAllowedError') {
        return { video: false, audio: false, error: 'Permission denied' };
      }
      if (err.name === 'NotFoundError') {
        return { video: false, audio: false, error: 'Device not found' };
      }
    }
    return { video: false, audio: false, error: 'Unknown error' };
  }
};
```

#### F7.3 Reconnection Logic

```typescript
// Auto-reconnect on disconnect
useEffect(() => {
  if (!client) return;

  client.on('connection-state-change', (curState, prevState) => {
    console.log(`Connection state: ${prevState} → ${curState}`);

    if (curState === 'DISCONNECTED' && prevState === 'CONNECTED') {
      // Try to reconnect
      setTimeout(() => {
        join().catch(console.error);
      }, 3000);
    }
  });
}, [client, join]);
```

---

### F8. Production Checklist

#### Before Deploy:

- [ ] Environment variables সঠিকভাবে set করা হয়েছে
- [ ] HTTPS enabled (WebRTC requires HTTPS)
- [ ] CORS properly configured
- [ ] Error boundaries implemented
- [ ] Loading states added
- [ ] Mobile responsive design
- [ ] Browser compatibility tested (Chrome, Firefox, Safari, Edge)
- [ ] Permission request UI added
- [ ] Network error handling
- [ ] Session timeout handling

#### Performance:

- [ ] Video quality adaptive (based on network)
- [ ] Lazy load Agora SDK
- [ ] Cleanup tracks on unmount
- [ ] Debounce toggle buttons

---

### F9. Troubleshooting

#### Issue: Video না দেখাচ্ছে

```typescript
// Debug steps
console.log('Local track:', localVideoTrack);
console.log('Track state:', localVideoTrack?.enabled);
console.log('Container:', containerRef.current);

// Solution: Ensure container has dimensions
<div style={{ width: '640px', height: '480px' }} ref={containerRef} />
```

#### Issue: Audio শোনা যাচ্ছে না

```typescript
// Check if audio track is playing
console.log('Audio track:', user.audioTrack);
console.log('Is playing:', user.audioTrack?.isPlaying);

// Manual play (autoplay policy)
user.audioTrack?.play();
```

#### Issue: Token expired

```typescript
// Refresh token before expiry
client.on('token-privilege-will-expire', async () => {
  const newToken = await fetch('/api/v1/sessions/:id/refresh-token').then(r => r.json());
  await client.renewToken(newToken);
});
```

---

**Frontend Guide শেষ।** এই guide follow করলে complete Video Call + Whiteboard feature frontend এ implement করতে পারবেন।