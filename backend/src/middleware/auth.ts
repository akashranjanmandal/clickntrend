import express, { Request, Response, NextFunction } from "express";
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  console.log('Auth header:', authHeader ? 'Present' : 'Missing');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('No bearer token');
    return res.status(401).json({ error: 'Unauthorized - No token provided' });
  }

  const token = authHeader.split(' ')[1];
  
  // For demo, accept any non-empty token
  // In production, validate with Supabase auth
  try {
    if (!token || token.trim() === '') {
      throw new Error('Invalid token');
    }
    
    // Simple check - accept admin-secret-token or any valid token
    if (token === 'admin-secret-token' || token.length > 10) {
      console.log('Token accepted');
      next();
    } else {
      throw new Error('Invalid token');
    }
  } catch (error: any) {
    console.log('Auth error:', error);
    return res.status(401).json({ error: 'Unauthorized - Invalid token' });
  }
};