import supabase from '../config/supabase.js';
import { UnauthorizedError } from '../errors/index.js';

export const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }

    const token = authHeader.slice(7);

    if (!token) {
      throw new UnauthorizedError('Token is required');
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new UnauthorizedError('Invalid or expired token');
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    next(error);
  }
};
