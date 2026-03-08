import nodemailer from 'nodemailer';
import { AppError } from '../errors/index.js';

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM_NAME,
  SMTP_FROM_EMAIL,
  NODE_ENV,
} = process.env;

const createTransporter = () => {
  if (NODE_ENV === 'development' && !SMTP_HOST) {
    return null;
  }

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error('Missing SMTP environment variables: SMTP_HOST, SMTP_USER, SMTP_PASS');
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587'),
    secure: parseInt(SMTP_PORT || '587') === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
};

const FROM_ADDRESS = `"${SMTP_FROM_NAME || 'PCOSAPI'}" <${SMTP_FROM_EMAIL || SMTP_USER || 'noreply@pcosapi.com'}>`;

export const sendOTPEmail = async (email, otpCode) => {
  const transporter = createTransporter();

  if (!transporter) {
    console.log(`[Email - DEV MODE] OTP for ${email}: ${otpCode} (no SMTP configured)`);
    return;
  }

  const mailOptions = {
    from: FROM_ADDRESS,
    to: email,
    subject: 'Your PCOSAPI Verification Code',
    text: `Your verification code is: ${otpCode}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, please ignore this email.`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 20px;">
            <tr>
              <td align="center">
                <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
                  <tr>
                    <td align="center" style="padding-bottom:24px;">
                      <h1 style="margin:0;font-size:22px;font-weight:700;color:#111827;">PCOSAPI</h1>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-bottom:8px;">
                      <h2 style="margin:0;font-size:18px;font-weight:600;color:#111827;">Verify your email address</h2>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-bottom:32px;">
                      <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6;">
                        Enter the code below to verify your email. It expires in <strong>10 minutes</strong>.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-bottom:32px;">
                      <div style="background:#f3f4f6;border-radius:8px;padding:20px 40px;display:inline-block;">
                        <span style="font-size:36px;font-weight:700;color:#111827;letter-spacing:8px;">${otpCode}</span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td align="center">
                      <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
                        If you didn't request this code, you can safely ignore this email.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error('[Email] Failed to send OTP email:', err.message);
    throw new AppError(
      'Failed to send verification email. Please try again.',
      500,
      'EMAIL_SEND_FAILED'
    );
  }
};

export const sendPasswordResetEmail = async (email, resetUrl) => {
  const transporter = createTransporter();

  if (!transporter) {
    console.log(`[Email - DEV MODE] Password reset for ${email}: ${resetUrl}`);
    return;
  }

  const mailOptions = {
    from: FROM_ADDRESS,
    to: email,
    subject: 'Reset your PCOSAPI password',
    text: `Click the link below to reset your password:\n\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you did not request a password reset, please ignore this email.`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 20px;">
            <tr>
              <td align="center">
                <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
                  <tr>
                    <td align="center" style="padding-bottom:24px;">
                      <h1 style="margin:0;font-size:22px;font-weight:700;color:#111827;">PCOSAPI</h1>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-bottom:8px;">
                      <h2 style="margin:0;font-size:18px;font-weight:600;color:#111827;">Reset your password</h2>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-bottom:32px;">
                      <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6;">
                        Click the button below to reset your password. This link expires in <strong>1 hour</strong>.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-bottom:32px;">
                      <a href="${resetUrl}" style="background:#111827;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block;">
                        Reset Password
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td align="center">
                      <p style="margin:0;font-size:12px;color:#9ca3af;">
                        If you didn't request this, you can safely ignore this email.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error('[Email] Failed to send reset email:', err.message);
  }
};
