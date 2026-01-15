# SendGrid Email Delivery Troubleshooting

## Issue: Emails Not Being Received

If the logs show `Status code: 202` but emails aren't arriving, the email was accepted by SendGrid but delivery may be failing.

### Quick Checks

1. **Check SendGrid Activity Feed**
   - Go to: https://app.sendgrid.com/activity
   - Look for the email address you're sending to
   - Check the delivery status:
     - ✅ **Delivered** - Email was delivered (check spam folder)
     - ❌ **Bounced** - Check bounce reason
     - ❌ **Blocked** - Email was blocked by SendGrid
     - ❌ **Dropped** - Email was dropped (check suppression list)
     - ⏳ **Pending** - Still processing

2. **Verify Sender Authentication**
   - Go to: https://app.sendgrid.com/settings/sender_auth
   - **Single Sender Verification**: Ensure `noreply@cmutalenthub.com` is verified
   - **Domain Authentication**: If using a custom domain, verify it's authenticated

### Common Issues and Fixes

#### Issue 1: Sender Not Verified
**Symptom**: Emails accepted (202) but not delivered, or blocked in SendGrid Activity

**Fix**:
1. Go to SendGrid → Settings → Sender Authentication
2. Click "Verify a Single Sender"
3. Enter:
   - Email: `noreply@cmutalenthub.com` (or your FROM_EMAIL)
   - Reply To: (optional)
   - Company Name: CMU TalentHub
   - Website URL: Your website
4. Click "Create"
5. **Check the verification email** SendGrid sends to that address
6. Click the verification link

#### Issue 2: Domain Not Authenticated
**Symptom**: Emails going to spam or being rejected

**Fix**:
1. Go to SendGrid → Settings → Sender Authentication
2. Click "Authenticate Your Domain"
3. Follow the DNS setup instructions
4. Add the required DNS records to your domain provider

#### Issue 3: Email in Spam Folder
**Symptom**: Status 202 but email not in inbox

**Fix**:
- Ask users to check spam/junk folder
- Use domain authentication (not just single sender)
- Ensure SPF, DKIM, and DMARC records are configured
- Avoid spam trigger words in subject/body

#### Issue 4: Suppression List
**Symptom**: Email was "Dropped" in Activity Feed

**Fix**:
1. Go to SendGrid → Suppressions
2. Check if the email address is on the suppression list
3. Remove if needed

#### Issue 5: API Key Permissions
**Symptom**: 401 Unauthorized errors

**Fix**:
1. Go to SendGrid → Settings → API Keys
2. Check your API key has "Mail Send" permissions
3. Regenerate key if needed

### Testing Email Delivery

1. **Use SendGrid's Test Email Tool**
   - Go to: https://app.sendgrid.com/mail_settings
   - Send a test email to verify delivery

2. **Check Email Address Format**
   - Ensure recipient email is valid format
   - Try sending to a different email address to isolate the issue

3. **Verify Environment Variables on Railway**
   - `SENDGRID_API_KEY` - Must be a valid SendGrid API key
   - `SENDGRID_FROM_EMAIL` - Must be a verified sender in SendGrid
   - `FRONTEND_URL` - Used in reset links

### Next Steps if Still Not Working

1. **Check SendGrid Account Status**
   - Ensure account is active and not suspended
   - Check if you've hit sending limits (free tier: 100 emails/day)

2. **Review SendGrid Logs**
   - Activity Feed shows detailed delivery information
   - Look for error messages or warnings

3. **Test with a Different Email Provider**
   - Try sending to Gmail, Outlook, Yahoo, etc.
   - Some providers are stricter than others

4. **Contact SendGrid Support**
   - If emails are being blocked with no clear reason
   - Provide the message ID from Activity Feed

### Useful SendGrid Links

- Activity Feed: https://app.sendgrid.com/activity
- Sender Authentication: https://app.sendgrid.com/settings/sender_auth
- API Keys: https://app.sendgrid.com/settings/api_keys
- Suppressions: https://app.sendgrid.com/suppressions
- Settings: https://app.sendgrid.com/settings
