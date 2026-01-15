import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

@Injectable()
export class EmailService {
  private fromEmail: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    if (apiKey) {
      sgMail.setApiKey(apiKey);
    }
    this.fromEmail =
      this.configService.get<string>('SENDGRID_FROM_EMAIL') ||
      'noreply@cmutalenthub.com';
  }

  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
    // Deep link for mobile app - will open app if installed, otherwise fallback to web
    const deepLink = `cmutalenthub://reset-password?token=${resetToken}`;
    const universalLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    const msg = {
      to: email,
      from: this.fromEmail,
      subject: 'Reset Your Password - CMU TalentHub',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #8F1A27 0%, #6A0032 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: #FFC540; margin: 0; font-size: 28px;">CMU TALENTHUB</h1>
          </div>
          <div style="background: #ffffff; padding: 40px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #8F1A27; margin-top: 0;">Reset Your Password</h2>
            <p>We received a request to reset your password for your CMU TalentHub account.</p>
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <!-- Universal link that works for both app and web -->
              <a href="${universalLink}" style="background: linear-gradient(135deg, #8F1A27 0%, #6A0032 100%); color: #ffffff; padding: 15px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">Reset Password</a>
            </div>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8F1A27;">
              <p style="color: #666; font-size: 13px; margin: 0 0 8px 0;"><strong>📱 Using the mobile app?</strong></p>
              <p style="color: #666; font-size: 12px; margin: 0;">If you have the CMU TalentHub app installed, clicking the button above will open the password reset screen in the app. Otherwise, you can use the web link below.</p>
            </div>
            <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
            <p style="color: #8F1A27; font-size: 12px; word-break: break-all;">${resetUrl}</p>
            <p style="color: #666; font-size: 14px; margin-top: 30px;">This link will expire in 1 hour.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request a password reset, please ignore this email.</p>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>&copy; ${new Date().getFullYear()} CMU TalentHub. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
      text: `Reset Your Password - CMU TalentHub

We received a request to reset your password for your CMU TalentHub account.

Click this link to reset your password: ${resetUrl}

If you have the CMU TalentHub mobile app installed, the link will open the app. Otherwise, it will open in your web browser.

This link will expire in 1 hour.

If you didn't request a password reset, please ignore this email.`,
    };

    try {
      await sgMail.send(msg);
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }
}
