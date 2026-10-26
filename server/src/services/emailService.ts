import nodemailer, { Transporter } from 'nodemailer';

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  delivered: boolean;
  simulated?: boolean;
  error?: string;
  notice?: string;
}

class EmailService {
  private transporter: Transporter | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;

    if (host && user && pass) {
      try {
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure,
          auth: {
            user,
            pass
          }
        });
        this.isConfigured = true;
        console.log(`[EmailService] SMTP transporter initialized (${host}:${port}).`);
      } catch (err) {
        console.error('[EmailService] Failed to initialize SMTP transporter:', err);
        this.isConfigured = false;
      }
    } else {
      this.isConfigured = false;
      // Do not log secret values or fail silently
      console.log('[EmailService] SMTP credentials not provided in environment. Running in development/demo mode.');
    }
  }

  public isEmailConfigured(): boolean {
    return this.isConfigured;
  }

  public async sendVerificationEmail(email: string, name: string, otp: string): Promise<EmailSendResult> {
    const fromAddress = process.env.SMTP_FROM || '"SpendiFy Security" <no-reply@spendify.com>';
    const subject = `${otp} is your SpendiFy verification code`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SpendiFy Verification Code</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; margin: 0; padding: 24px; color: #f1f5f9;">
  <div style="max-width: 520px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 12px; padding: 32px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);">
    <div style="display: flex; align-items: center; margin-bottom: 24px; border-bottom: 1px solid #1e293b; padding-bottom: 16px;">
      <h1 style="color: #38bdf8; font-size: 24px; margin: 0; font-weight: 700; letter-spacing: -0.5px;">Spendi<span style="color: #10b981;">Fy</span></h1>
      <span style="margin-left: 12px; font-size: 12px; background: rgba(56, 189, 248, 0.15); color: #38bdf8; padding: 3px 8px; border-radius: 4px; font-weight: 600;">Security Verification</span>
    </div>

    <p style="font-size: 16px; line-height: 24px; color: #cbd5e1; margin: 0 0 16px 0;">
      Hello <strong style="color: #ffffff;">${escapeHtml(name)}</strong>,
    </p>

    <p style="font-size: 15px; line-height: 22px; color: #94a3b8; margin: 0 0 24px 0;">
      Thank you for registering with SpendiFy. Use the verification code below to verify your email address and activate your account.
    </p>

    <div style="background: #0f172a; border: 2px dashed #38bdf8; border-radius: 10px; padding: 20px; text-align: center; margin: 24px 0;">
      <span style="font-size: 13px; text-transform: uppercase; color: #64748b; letter-spacing: 1.5px; display: block; margin-bottom: 8px; font-weight: 600;">Verification Code</span>
      <div style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #38bdf8; font-family: monospace;">
        ${otp}
      </div>
    </div>

    <div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; border-radius: 6px; padding: 12px 16px; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 13px; color: #fca5a5; line-height: 18px;">
        <strong>Security Notice:</strong> This code expires in <strong>10 minutes</strong>. Never share this code with anyone, including SpendiFy support agents.
      </p>
    </div>

    <p style="font-size: 13px; line-height: 18px; color: #64748b; margin: 0 0 16px 0;">
      If you did not initiate this registration request, please disregard this email. Your email address will not be activated without this verification code.
    </p>

    <div style="border-top: 1px solid #1e293b; padding-top: 16px; font-size: 12px; color: #475569; text-align: center;">
      SpendiFy Micro-Lending & Credit Risk Assessment Platform &bull; Secure Authentication Service
    </div>
  </div>
</body>
</html>
    `;

    const textContent = `
SpendiFy Security Verification
----------------------------------------
Hello ${name},

Your SpendiFy email verification code is: ${otp}

This code expires in 10 minutes.
For your security, never share this code with anyone.

If you did not request this verification, please ignore this email.
----------------------------------------
SpendiFy AI Micro-Lending Platform
    `.trim();

    if (this.isConfigured && this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from: fromAddress,
          to: email,
          subject,
          text: textContent,
          html: htmlContent
        });
        console.log(`[EmailService] Live verification email sent to ${maskEmail(email)}. Message ID: ${info.messageId}`);
        return {
          success: true,
          delivered: true,
          messageId: info.messageId
        };
      } catch (error: any) {
        console.error(`[EmailService] Failed to send live email to ${maskEmail(email)}:`, error.message);
        return {
          success: false,
          delivered: false,
          error: error.message
        };
      }
    } else {
      // In development or when SMTP is not configured, record in dev log with masked security notices
      console.log(`[EmailService:DEV_MODE] OTP generated for ${maskEmail(email)}: [${otp}]. (SMTP not configured in .env, simulated local delivery)`);
      return {
        success: true,
        delivered: false,
        simulated: true,
        notice: 'Email provider not configured; verification code logged for development.'
      };
    }
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function maskEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return '***';
  const name = parts[0];
  const maskedName = name.length > 2 ? `${name[0]}***${name[name.length - 1]}` : `${name[0]}***`;
  return `${maskedName}@${parts[1]}`;
}

export const emailService = new EmailService();
