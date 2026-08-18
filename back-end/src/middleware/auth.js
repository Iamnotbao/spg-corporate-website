import jwt from 'jsonwebtoken';

export function auth(req, res, next) {
  const header = String(req.headers.authorization || '');
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Missing admin token' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'local-development-secret');
    if (payload.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired admin token' });
  }
}
