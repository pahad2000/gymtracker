# GymTracker - Setup Instructions

This document contains instructions for completing the setup after the recent updates.

## Database Migration

Run the following command to update your database schema with the new 2FA fields:

```bash
npx prisma migrate dev --name add-2fa-fields
npx prisma generate
```

## Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update the following variables in your `.env` file:

### Required Variables

- **DATABASE_URL**: Your PostgreSQL connection string
- **NEXTAUTH_SECRET**: Generate with `openssl rand -base64 32`
- **NEXTAUTH_URL**: Your application URL (http://localhost:3000 for development)

### Email Service (Resend)

For 2FA and weekly reports, you need to set up Resend (free tier: 3,000 emails/month):

1. Sign up at https://resend.com
2. Get your API key from https://resend.com/api-keys
3. Add to `.env`:
   ```
   RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxx"
   EMAIL_FROM="GymTracker <noreply@yourdomain.com>"
   ```

**Note**: For the free tier, you can only send from `onboarding@resend.dev`. To use a custom domain, you'll need to verify your domain in Resend.

### Cron Job Secret

For weekly reports, generate a secret:

```bash
openssl rand -base64 32
```

Add to `.env`:
```
CRON_SECRET="your-generated-secret-here"
```

## Features Implemented

### 1. Workout Player Improvements
- ✅ All future workouts now appear in 'Up Next' section
- ✅ Set completion counter updates instantly
- ✅ Rest timer appears immediately after completing a set
- ✅ Progress check at end of each workout comparing weight/duration
- ✅ Improved drag-and-drop smoothness on desktop
- ✅ Ability to reorder remaining workouts mid-workout

### 2. Workout Form Validation
- ✅ Prevents zero days in workout frequency settings
- ✅ Requires at least one day selection for specific days schedule
- ✅ Validates interval days must be at least 1

### 3. Authentication & Security
- ✅ API middleware for comprehensive authentication protection
- ✅ All API routes now require authentication
- ✅ Middleware protects both API and app routes

### 4. Two-Factor Authentication (2FA)
- ✅ Email-based 2FA verification
- ✅ 6-digit verification codes
- ✅ 10-minute code expiration
- ✅ Enable/disable 2FA in user settings

**To enable 2FA for a user:**

Make a POST request to `/api/auth/2fa/setup`:
```json
{
  "enabled": true
}
```

Or create a settings page with a toggle for users to enable/disable 2FA.

### 5. Weekly Metrics Notifications
- ✅ Automated weekly workout summary emails
- ✅ Stats include: workouts completed, total sets, total reps, weight lifted
- ✅ Comparison with previous week
- ✅ Personal records (PRs) highlighted
- ✅ Runs every Monday at 9:00 AM (configured in vercel.json)

## Testing Weekly Reports

You can manually trigger the weekly reports endpoint:

```bash
curl -X GET http://localhost:3000/api/cron/weekly-reports \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Deployment Notes

### Vercel
- The `vercel.json` file is already configured for weekly cron jobs
- Make sure to add all environment variables to your Vercel project
- The cron job will run automatically every Monday at 9:00 AM UTC

### Other Platforms
- Set up an external cron service (e.g., cron-job.org, EasyCron)
- Configure it to call `/api/cron/weekly-reports` weekly
- Include the Authorization header: `Bearer YOUR_CRON_SECRET`

## Additional Notes

1. **Email Domain**: For production, you should verify a custom domain in Resend to send emails from your own domain.

2. **Database Backups**: Always backup your database before running migrations.

3. **Security**: Keep your `CRON_SECRET` and `NEXTAUTH_SECRET` secure and never commit them to version control.

4. **Testing 2FA**: Create a test account and enable 2FA to test the email flow before deploying to production.

## Troubleshooting

### Email not sending
- Check that `RESEND_API_KEY` is set correctly
- Verify you're using `onboarding@resend.dev` for the free tier
- Check Resend dashboard for email logs

### Migration fails
- Ensure PostgreSQL is running
- Check that `DATABASE_URL` is correct
- Verify you have necessary database permissions

### 2FA code not received
- Check spam folder
- Verify email service is configured
- Check application logs for email sending errors

## Support

For issues or questions, please check the application logs and error messages for more details.
