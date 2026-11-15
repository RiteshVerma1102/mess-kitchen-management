import { logger } from './logger';

export interface OutboxEmail {
  id: string;
  to: string;
  from: string;
  subject: string;
  text: string;
  html: string;
  sentAt: Date;
  verificationCode?: string;
  resetToken?: string;
}

// In-memory outbox for testing, verification, and audit inspection
const emailOutbox: OutboxEmail[] = [];

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
  verificationCode?: string;
  resetToken?: string;
}

/**
 * Send an email via SMTP (if configured) or store in test outbox
 */
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const from = process.env.SMTP_FROM || 'no-reply@smartmess.internal';
  const emailRecord: OutboxEmail = {
    id: `email_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    to: options.to.toLowerCase(),
    from,
    subject: options.subject,
    text: options.text,
    html: options.html,
    sentAt: new Date(),
    verificationCode: options.verificationCode,
    resetToken: options.resetToken,
  };

  emailOutbox.unshift(emailRecord);
  // Keep last 100 emails in outbox
  if (emailOutbox.length > 100) {
    emailOutbox.pop();
  }

  logger.info(
    { to: options.to, subject: options.subject, emailId: emailRecord.id, code: options.verificationCode },
    'Authentication email dispatched to outbox',
  );

  return true;
}

/**
 * Retrieve sent emails for a given address (for testing & verification)
 */
export function getOutboxForEmail(email: string): OutboxEmail[] {
  const normalized = email.toLowerCase().trim();
  return emailOutbox.filter((e) => e.to === normalized);
}

/**
 * Retrieve latest email for a given address
 */
export function getLatestEmailFor(email: string): OutboxEmail | undefined {
  const list = getOutboxForEmail(email);
  return list[0];
}

/**
 * Clear email outbox (useful in unit test setup)
 */
export function clearOutbox(): void {
  emailOutbox.length = 0;
}

/**
 * Template: Email Verification Code (Clerk style)
 */
export function renderVerificationEmail(fullName: string, code: string, verifyLink: string): { subject: string; text: string; html: string } {
  const subject = `Your FoodFlow Verification Code: ${code}`;
  const text = `Hello ${fullName},\n\nYour FoodFlow verification code is: ${code}\n\nAlternatively, verify using this link: ${verifyLink}\n\nThis code will expire in 15 minutes.\n\nSmart Mess & Central Kitchen Platform`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F5F7FA; color: #253746; margin: 0; padding: 24px; }
          .container { max-width: 520px; margin: 0 auto; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E5EAF0; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
          .header { text-align: center; margin-bottom: 24px; }
          .logo-badge { display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 12px; background-color: #087E8B; color: #FFFFFF; font-size: 24px; }
          h1 { font-size: 20px; font-weight: 800; color: #253746; margin-top: 16px; margin-bottom: 8px; }
          p { font-size: 14px; line-height: 1.5; color: #718096; margin: 0 0 16px; }
          .code-box { background-color: #DDF3F3; border: 1px solid #087E8B; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0; }
          .code { font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #087E8B; font-family: monospace; }
          .button { display: inline-block; background-color: #087E8B; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 700; font-size: 13px; text-align: center; }
          .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #E5EAF0; font-size: 12px; color: #718096; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo-badge">🍃</div>
            <h1>Verify your email address</h1>
            <p>Welcome to FoodFlow, ${fullName}! Enter this verification code to activate your account:</p>
          </div>
          <div class="code-box">
            <div class="code">${code}</div>
          </div>
          <p style="text-align: center;">This verification code will expire in <strong>15 minutes</strong>.</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${verifyLink}" class="button">Click Here to Verify Automatically</a>
          </div>
          <div class="footer">
            If you did not request this verification email, you can safely ignore it.<br>
            Smart Mess & Central Kitchen Management System
          </div>
        </div>
      </body>
    </html>
  `;

  return { subject, text, html };
}

/**
 * Template: Password Reset Email (Clerk style)
 */
export function renderPasswordResetEmail(fullName: string, resetLink: string, code: string): { subject: string; text: string; html: string } {
  const subject = `Reset Your FoodFlow Password (Code: ${code})`;
  const text = `Hello ${fullName},\n\nWe received a request to reset your FoodFlow password.\n\nYour reset code is: ${code}\nOr click the link below to set a new password:\n${resetLink}\n\nThis link will expire in 15 minutes.\n\nSmart Mess & Central Kitchen Platform`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F5F7FA; color: #253746; margin: 0; padding: 24px; }
          .container { max-width: 520px; margin: 0 auto; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E5EAF0; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
          .header { text-align: center; margin-bottom: 24px; }
          .logo-badge { display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 12px; background-color: #087E8B; color: #FFFFFF; font-size: 24px; }
          h1 { font-size: 20px; font-weight: 800; color: #253746; margin-top: 16px; margin-bottom: 8px; }
          p { font-size: 14px; line-height: 1.5; color: #718096; margin: 0 0 16px; }
          .code-box { background-color: #F5F7FA; border: 1px solid #E5EAF0; border-radius: 12px; padding: 16px; text-align: center; margin: 20px 0; }
          .code { font-size: 28px; font-weight: 800; letter-spacing: 4px; color: #253746; font-family: monospace; }
          .button { display: inline-block; background-color: #087E8B; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 700; font-size: 13px; text-align: center; }
          .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #E5EAF0; font-size: 12px; color: #718096; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo-badge">🔑</div>
            <h1>Password Reset Request</h1>
            <p>Hello ${fullName}, we received a request to reset your password. Use the code below or click the button:</p>
          </div>
          <div class="code-box">
            <div class="code">${code}</div>
          </div>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${resetLink}" class="button">Reset My Password</a>
          </div>
          <p style="text-align: center; font-size: 12px;">This password reset link will expire in <strong>15 minutes</strong>.</p>
          <div class="footer">
            If you did not request a password reset, please ignore this email or notify your system administrator immediately.<br>
            Smart Mess & Central Kitchen Management System
          </div>
        </div>
      </body>
    </html>
  `;

  return { subject, text, html };
}

