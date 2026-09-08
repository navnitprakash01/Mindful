import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';

interface AuthenticatedRequest extends Request {
  user?: { id: string; email?: string };
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {

  if (req.method === "OPTIONS") {
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.substring(7);

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = { id: user.id, email: user.email ?? undefined };
    next();
  } catch {
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

export type { AuthenticatedRequest };