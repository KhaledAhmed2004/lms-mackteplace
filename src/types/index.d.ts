import { JwtPayload } from 'jsonwebtoken';

export interface JwtUser extends JwtPayload {
  id?: string | null;
  email?: string | null;
  role: string;
}

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface User extends JwtUser {}

    interface Request {
      user?: JwtUser;
    }
  }
}
