import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM_ADDRESS = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@meetingrunner.app';
const APP_NAME = 'MeetingRunner';
const APP_URL = process.env.CLIENT_URL || 'http://localhost:5173';

function isConfigured(): boolean {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendInviteEmail(
  to: string,
  displayName: string,
  temporaryPassword: string,
): Promise<boolean> {
  if (!isConfigured()) {
    console.warn('SMTP not configured — skipping invite email to', to);
    return false;
  }

  try {
    await transporter.sendMail({
      from: `"${APP_NAME}" <${FROM_ADDRESS}>`,
      to,
      subject: `You've been invited to ${APP_NAME}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="display: inline-block; width: 48px; height: 48px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 12px; line-height: 48px; color: white; font-size: 20px; font-weight: bold;">M</div>
          </div>
          <h1 style="font-size: 24px; font-weight: 700; color: #111827; text-align: center; margin-bottom: 8px;">Welcome to ${APP_NAME}!</h1>
          <p style="color: #6b7280; text-align: center; margin-bottom: 32px;">Hi ${displayName}, you've been invited to join the team.</p>
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <p style="margin: 0 0 12px 0; color: #374151; font-weight: 600;">Your login credentials:</p>
            <p style="margin: 0 0 8px 0; color: #6b7280;">Email: <strong style="color: #111827;">${to}</strong></p>
            <p style="margin: 0; color: #6b7280;">Temporary Password: <strong style="color: #111827; font-family: monospace; background: #fef3c7; padding: 2px 8px; border-radius: 4px;">${temporaryPassword}</strong></p>
          </div>
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${APP_URL}/login" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px;">Sign In Now</a>
          </div>
          <p style="color: #9ca3af; font-size: 13px; text-align: center;">You will be asked to change your password on first login.</p>
        </div>
      `,
    });
    console.log('Invite email sent to', to);
    return true;
  } catch (error) {
    console.error('Failed to send invite email:', error);
    return false;
  }
}

export async function sendPasswordResetEmail(
  to: string,
  displayName: string,
  temporaryPassword: string,
): Promise<boolean> {
  if (!isConfigured()) {
    console.warn('SMTP not configured — skipping password reset email to', to);
    return false;
  }

  try {
    await transporter.sendMail({
      from: `"${APP_NAME}" <${FROM_ADDRESS}>`,
      to,
      subject: `Your ${APP_NAME} password has been reset`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="display: inline-block; width: 48px; height: 48px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 12px; line-height: 48px; color: white; font-size: 20px; font-weight: bold;">M</div>
          </div>
          <h1 style="font-size: 24px; font-weight: 700; color: #111827; text-align: center; margin-bottom: 8px;">Password Reset</h1>
          <p style="color: #6b7280; text-align: center; margin-bottom: 32px;">Hi ${displayName}, an administrator has reset your password.</p>
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px 0; color: #6b7280;">Your new temporary password:</p>
            <p style="margin: 0; font-family: monospace; font-size: 18px; color: #111827; background: #fef3c7; padding: 8px 16px; border-radius: 6px; text-align: center; font-weight: 600;">${temporaryPassword}</p>
          </div>
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${APP_URL}/login" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px;">Sign In Now</a>
          </div>
          <p style="color: #9ca3af; font-size: 13px; text-align: center;">You will be asked to change your password on first login.</p>
        </div>
      `,
    });
    console.log('Password reset email sent to', to);
    return true;
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return false;
  }
}
