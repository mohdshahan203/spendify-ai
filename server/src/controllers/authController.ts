import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { dbService } from '../services/dbService';

const JWT_SECRET = process.env.JWT_SECRET || 'spendify_super_secret_jwt_key_123!';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'spendify_refresh_token_secret_987!';

export const register = async (req: Request, res: Response) => {
  try {
    const { email, phone, password, name, role } = req.body;

    if (!email || !phone || !password || !name) {
      return res.status(400).json({ error: 'All fields (email, phone, password, name) are required.' });
    }

    // Check if user exists
    const existingEmail = await dbService.user.findUnique({ where: { email } });
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    const existingPhone = await dbService.user.findUnique({ where: { phone } });
    if (existingPhone) {
      return res.status(400).json({ error: 'Phone number already registered.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Default role to BORROWER if invalid or not provided
    const userRole = (role === 'ADMIN' || role === 'OFFICER') ? role : 'BORROWER';

    const user = await dbService.user.create({
      data: {
        email,
        phone,
        passwordHash,
        name,
        role: userRole
      }
    });

    // Create an empty KYC profile for borrowers
    if (userRole === 'BORROWER') {
      await dbService.kycDocument.upsert({
        where: { userId: user.id },
        create: {
          aadhaarNumber: '',
          aadhaarUrl: '',
          panNumber: '',
          panUrl: '',
          bankStatementUrl: '',
          esignatureUrl: '',
          status: 'NOT_STARTED'
        },
        update: {}
      });
    }

    res.status(201).json({
      message: 'User registered successfully.',
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        role: user.role
      }
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed: ' + error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await dbService.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    // Generate tokens
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Save refresh token to user
    await dbService.user.update({
      where: { id: user.id },
      data: { refreshToken }
    });

    res.status(200).json({
      message: 'Login successful.',
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        role: user.role
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed: ' + error.message });
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required.' });
    }

    // Verify token
    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch {
      return res.status(403).json({ error: 'Forbidden: Invalid refresh token.' });
    }

    const user = await dbService.user.findUnique({ where: { id: decoded.id } });
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ error: 'Forbidden: Session expired or invalid.' });
    }

    // Generate new access token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({ token });
  } catch (error: any) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Token refresh failed.' });
  }
};
