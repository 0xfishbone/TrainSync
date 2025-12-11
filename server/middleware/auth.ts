import { Request, Response, NextFunction } from "express";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
  };
}

/**
 * Middleware that requires a valid session to access protected routes.
 * Checks for req.session.userId and returns 401 if not authenticated.
 */
export function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  // Attach user info to request for downstream handlers
  req.user = {
    id: req.session.userId,
    username: "", // Can be populated from DB if needed
  };

  next();
}
