import nodemailer from "nodemailer";
import { randomBytes } from "crypto";

if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  throw new Error("Email configuration is required");
}

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export function generateVerificationToken(): string {
  return randomBytes(32).toString("hex");
}

export async function sendVerificationEmail(email: string, token: string) {
  const domain = process.env.REPL_SLUG && process.env.REPL_OWNER
    ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
    : 'http://localhost:5000';

  const verificationUrl = `${domain}/verify-email?token=${token}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Verify your email address",
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <h1 style="color: #2563eb;">Welcome to RunAI Coach!</h1>
        <p>Please verify your email address to complete your registration and start your personalized training journey.</p>
        <a href="${verificationUrl}" 
           style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; margin: 20px 0;">
          Verify Email
        </a>
        <p style="color: #666;">If you didn't create an account, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">
          This email was sent by RunAI Coach. Please do not reply to this email.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${email}`);
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
}

export async function verifyEmailToken(token: string): Promise<boolean> {
  try {
    // This will be implemented in the routes handler
    return true;
  } catch (error) {
    console.error('Error verifying email token:', error);
    return false;
  }
}