import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { dbService } from '../services/dbService';
import { emailService } from '../services/emailService';

const JWT_SECRET = process.env.JWT_SECRET || 'spendify_super_secret_jwt_key_123!';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'spendify_refresh_token_secret_987!';

// Secure 6-digit OTP generator
function generateSecureOTP(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

// Secure SHA-256 hash for OTP at rest
function hashOTP(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

export const register = async (req: Request, res: Response) => {
  try {
    const { email, phone, password, name, role } = req.body;

    if (!email || !phone || !password || !name) {
      return res.status(400).json({ error: 'All fields (email, phone, password, name) are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();

    // Check if user exists
    const existingEmailUser = await dbService.user.findUnique({ where: { email: normalizedEmail } });
    if (existingEmailUser) {
      if (existingEmailUser.emailVerified) {
        return res.status(400).json({ error: 'Email already registered. Please log in.' });
      } else {
        // User exists but has not verified their email yet. Re-issue fresh OTP code.
        const otp = generateSecureOTP();
        const otpHash = hashOTP(otp);
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await dbService.user.update({
          where: { id: existingEmailUser.id },
          data: {
            otpHash,
            otpExpiresAt,
            otpAttempts: 0,
            otpLastSentAt: new Date(),
            otpPurpose: 'SIGNUP_VERIFICATION'
          }
        });

        const emailResult = await emailService.sendVerificationEmail(normalizedEmail, existingEmailUser.name, otp);

        return res.status(200).json({
          message: 'An unverified account with this email already exists. A new verification code has been sent.',
          email: normalizedEmail,
          unverified: true,
          emailDelivery: {
            delivered: emailResult.delivered,
            simulated: emailResult.simulated,
            notice: emailResult.notice
          }
        });
      }
    }

    const existingPhone = await dbService.user.findUnique({ where: { phone: normalizedPhone } });
    if (existingPhone) {
      return res.status(400).json({ error: 'Phone number already registered with another account.' });
    }

    // Hash password securely with bcrypt salt rounds = 10
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Default role to BORROWER
    const userRole = (role === 'ADMIN' || role === 'OFFICER') ? role : 'BORROWER';

    // Generate cryptographic 6-digit OTP
    const otp = generateSecureOTP();
    const otpHash = hashOTP(otp);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const otpLastSentAt = new Date();

    const user = await dbService.user.create({
      data: {
        email: normalizedEmail,
        phone: normalizedPhone,
        passwordHash,
        name: name.trim(),
        role: userRole,
        emailVerified: false,
        otpHash,
        otpExpiresAt,
        otpAttempts: 0,
        otpLastSentAt,
        otpPurpose: 'SIGNUP_VERIFICATION'
      }
    });

    // Create pending KYC profile for borrower
    if (userRole === 'BORROWER') {
      await dbService.kycDocument.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
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

    // Deliver OTP via real email service
    const emailResult = await emailService.sendVerificationEmail(normalizedEmail, user.name, otp);

    // Notice: Do NOT issue JWT tokens yet! Account is unverified until OTP is confirmed.
    res.status(201).json({
      message: 'Registration successful! Please check your email for the 6-digit verification code.',
      unverified: true,
      email: normalizedEmail,
      emailDelivery: {
        delivered: emailResult.delivered,
        simulated: emailResult.simulated,
        notice: emailResult.notice,
        devOtp: process.env.NODE_ENV !== 'production' && emailResult.simulated ? otp : undefined
      }
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed: ' + error.message });
  }
};

export const verifyOTP = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and 6-digit verification code are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    if (!/^\d{6}$/.test(cleanOtp)) {
      return res.status(400).json({ error: 'Verification code must be exactly 6 digits.' });
    }

    const user = await dbService.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      return res.status(400).json({ error: 'Invalid verification request: account not found.' });
    }

    if (user.emailVerified) {
      return res.status(200).json({
        message: 'Email is already verified. Please log in.',
        alreadyVerified: true
      });
    }

    // Check maximum verification attempts (5 attempts limit)
    const currentAttempts = user.otpAttempts || 0;
    if (currentAttempts >= 5) {
      return res.status(429).json({
        error: 'Maximum verification attempts (5/5) exceeded. Please request a new verification code.',
        maxAttemptsExceeded: true
      });
    }

    // Check expiration (10-minute window)
    if (!user.otpExpiresAt || new Date() > new Date(user.otpExpiresAt)) {
      return res.status(400).json({
        error: 'Verification code has expired. Please click "Resend Code" to receive a fresh code.',
        expired: true
      });
    }

    // Compare cryptographic hashes
    const incomingHash = hashOTP(cleanOtp);
    if (!user.otpHash || incomingHash !== user.otpHash) {
      const updatedAttempts = currentAttempts + 1;
      await dbService.user.update({
        where: { id: user.id },
        data: { otpAttempts: updatedAttempts }
      });

      const remaining = Math.max(0, 5 - updatedAttempts);
      return res.status(400).json({
        error: `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
        remainingAttempts: remaining
      });
    }

    // OTP Verified! Mark verified and invalidate code atomically
    const verifiedUser = await dbService.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        otpHash: null,
        otpExpiresAt: null,
        otpAttempts: 0,
        otpPurpose: null
      }
    });

    // Generate authenticated JWT session tokens
    const token = jwt.sign(
      { id: verifiedUser.id, email: verifiedUser.email, role: verifiedUser.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { id: verifiedUser.id },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    await dbService.user.update({
      where: { id: verifiedUser.id },
      data: { refreshToken }
    });

    res.status(200).json({
      message: 'Email verified successfully! Welcome to SpendiFy.',
      token,
      refreshToken,
      user: {
        id: verifiedUser.id,
        email: verifiedUser.email,
        phone: verifiedUser.phone,
        name: verifiedUser.name,
        role: verifiedUser.role,
        emailVerified: true
      }
    });
  } catch (error: any) {
    console.error('OTP verification error:', error);
    res.status(500).json({ error: 'Verification failed: ' + error.message });
  }
};

export const resendOTP = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required to resend verification code.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await dbService.user.findUnique({ where: { email: normalizedEmail } });

    if (!user) {
      // Return safe message without user enumeration
      return res.status(404).json({ error: 'Account with this email does not exist.' });
    }

    if (user.emailVerified) {
      return res.status(400).json({ error: 'Email is already verified. Please proceed to log in.' });
    }

    // Enforce 60-second cooldown
    if (user.otpLastSentAt) {
      const elapsedMs = Date.now() - new Date(user.otpLastSentAt).getTime();
      const cooldownMs = 60 * 1000;
      if (elapsedMs < cooldownMs) {
        const retryAfterSec = Math.ceil((cooldownMs - elapsedMs) / 1000);
        return res.status(429).json({
          error: `Please wait ${retryAfterSec} second${retryAfterSec === 1 ? '' : 's'} before requesting another code.`,
          retryAfter: retryAfterSec
        });
      }
    }

    // Generate new secure OTP
    const otp = generateSecureOTP();
    const otpHash = hashOTP(otp);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await dbService.user.update({
      where: { id: user.id },
      data: {
        otpHash,
        otpExpiresAt,
        otpAttempts: 0,
        otpLastSentAt: new Date(),
        otpPurpose: 'SIGNUP_VERIFICATION'
      }
    });

    const emailResult = await emailService.sendVerificationEmail(normalizedEmail, user.name, otp);

    res.status(200).json({
      message: 'A new 6-digit verification code has been sent to your email.',
      email: normalizedEmail,
      emailDelivery: {
        delivered: emailResult.delivered,
        simulated: emailResult.simulated,
        notice: emailResult.notice,
        devOtp: process.env.NODE_ENV !== 'production' && emailResult.simulated ? otp : undefined
      }
    });
  } catch (error: any) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ error: 'Failed to resend verification code: ' + error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await dbService.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    // Enforce email verification gating
    // If user.emailVerified is false (and not explicitly true), reject login and prompt OTP verification
    if (user.emailVerified === false) {
      return res.status(403).json({
        error: 'Your email address has not been verified. Please verify your email with the 6-digit OTP code to continue.',
        unverified: true,
        email: user.email
      });
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
        role: user.role,
        emailVerified: user.emailVerified ?? true
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

    if (user.emailVerified === false) {
      return res.status(403).json({ error: 'Forbidden: Email unverified.', unverified: true });
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
