import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

@Injectable()
export class EmailService {
  private fromEmail: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    if (!apiKey) {
      console.warn('WARNING: SENDGRID_API_KEY is not set. Email functionality will not work.');
    } else {
      sgMail.setApiKey(apiKey);
      console.log('SendGrid API key configured successfully');
    }
    this.fromEmail =
      this.configService.get<string>('SENDGRID_FROM_EMAIL') ||
      'noreply@cmutalenthub.com';
    console.log(`Email service initialized with fromEmail: ${this.fromEmail}`);
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
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #8F1A27 0%, #6A0032 100%); padding: 30px; text-align: center;">
                      <h1 style="color: #FFC540; margin: 0; font-size: 28px; font-weight: bold;">CMU TALENTHUB</h1>
                    </td>
                  </tr>
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h2 style="color: #8F1A27; margin-top: 0; margin-bottom: 20px; font-size: 24px;">Reset Your Password</h2>
                      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">We received a request to reset your password for your CMU TalentHub account.</p>
                      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">Click the button below to reset your password:</p>
                      
                      <!-- Reset Button -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                        <tr>
                          <td align="center">
                            <a href="${resetUrl}" style="background-color: #8F1A27; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; min-width: 200px; text-align: center;">Reset Password</a>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Mobile App Info -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-left: 4px solid #8F1A27; margin-bottom: 25px;">
                        <tr>
                          <td style="padding: 15px;">
                            <p style="color: #333; font-size: 14px; margin: 0 0 8px 0; font-weight: bold;">📱 Using the mobile app?</p>
                            <p style="color: #666; font-size: 13px; margin: 0; line-height: 1.5;">If you have the CMU TalentHub app installed, the link will open the app. Otherwise, it will open in your web browser.</p>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Alternative Link Section -->
                      <p style="color: #666; font-size: 14px; margin-bottom: 10px;">Or copy and paste this link into your browser:</p>
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 4px; margin-bottom: 25px;">
                        <tr>
                          <td style="padding: 12px;">
                            <a href="${resetUrl}" style="color: #8F1A27; font-size: 13px; word-break: break-all; text-decoration: underline;">${resetUrl}</a>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Important Notes -->
                      <p style="color: #666; font-size: 14px; margin-top: 25px; margin-bottom: 10px;">This link will expire in 1 hour.</p>
                      <p style="color: #666; font-size: 14px; margin-bottom: 0;">If you didn't request a password reset, please ignore this email.</p>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
                      <p style="color: #999; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} CMU TalentHub. All rights reserved.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `Reset Your Password - CMU TalentHub

We received a request to reset your password for your CMU TalentHub account.

Click this link to reset your password:
${resetUrl}

If you have the CMU TalentHub mobile app installed, the link will open the app. Otherwise, it will open in your web browser.

This link will expire in 1 hour.

If you didn't request a password reset, please ignore this email.`,
    };

    // Validate SendGrid is configured
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    if (!apiKey) {
      console.error('SendGrid API key is not configured');
      throw new Error('Email service is not configured. Please contact support.');
    }

    try {
      console.log(`Attempting to send password reset email to: ${email}`);
      const result = await sgMail.send(msg);
      console.log(`Email sent successfully. Status code: ${result[0]?.statusCode}`);
      return;
    } catch (error: any) {
      console.error('Error sending email:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        response: error.response ? {
          statusCode: error.response.statusCode,
          body: error.response.body,
          headers: error.response.headers,
        } : null,
      });
      
      // Provide more specific error messages
      if (error.code === 'UNAUTHORIZED') {
        throw new Error('Invalid SendGrid API key. Please contact support.');
      } else if (error.response?.body?.errors) {
        const errors = error.response.body.errors;
        throw new Error(`SendGrid error: ${errors.map((e: any) => e.message).join(', ')}`);
      } else if (error.message) {
        throw new Error(`Failed to send email: ${error.message}`);
      } else {
        throw new Error('Failed to send email. Please try again later.');
      }
    }
  }
}
