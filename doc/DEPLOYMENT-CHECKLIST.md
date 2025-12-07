# Production Deployment Checklist

## Pre-Deployment Setup

### 1. Install Additional Dependencies

```bash
# Google Calendar Integration
npm install googleapis

# Cron Jobs
npm install node-cron
npm install -D @types/node-cron

# Testing (if not already installed)
npm install -D vitest supertest mongodb-memory-server

# Swagger Documentation
npm install swagger-ui-express swagger-jsdoc
npm install -D @types/swagger-ui-express @types/swagger-jsdoc
```

### 2. Environment Configuration

Create `.env.production` file:

```env
# Server
NODE_ENV=production
PORT=5000

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tutoring-marketplace?retryWrites=true&w=majority

# JWT
JWT_SECRET=your_super_secure_jwt_secret_change_this
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your_refresh_token_secret
JWT_REFRESH_EXPIRES_IN=30d

# Stripe
STRIPE_SECRET_KEY=sk_live_your_live_stripe_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://api.yourdomain.com/api/v1/auth/google/callback

# Google Calendar
GOOGLE_CALENDAR_CLIENT_ID=your_calendar_client_id
GOOGLE_CALENDAR_CLIENT_SECRET=your_calendar_secret
GOOGLE_CALENDAR_REFRESH_TOKEN=your_refresh_token

# Email/SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_specific_password
EMAIL_FROM=noreply@yourdomain.com

# Frontend
FRONTEND_URL=https://yourdomain.com

# Cloudinary (for file uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Redis (optional, for caching)
REDIS_URL=redis://localhost:6379

# Monitoring
SENTRY_DSN=your_sentry_dsn_for_error_tracking
```

---

## Google Services Setup

### Google OAuth2 Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable **Google+ API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Set authorized redirect URIs:
   - `https://api.yourdomain.com/api/v1/auth/google/callback`
6. Copy **Client ID** and **Client Secret** to `.env`

### Google Calendar API Setup

1. In same Google Cloud project
2. Enable **Google Calendar API**
3. Create **OAuth 2.0 Client ID** or **Service Account**
4. For OAuth:
   - Get authorization code
   - Exchange for refresh token
   - Add refresh token to `.env`
5. For Service Account:
   - Download JSON key file
   - Add to project (don't commit to git!)

**Uncomment Google Calendar integration** in:
- `src/app/services/googleCalendar.service.ts`

---

## Stripe Setup

### 1. Create Stripe Account

1. Sign up at [stripe.com](https://stripe.com)
2. Complete business verification
3. Get API keys from Dashboard

### 2. Enable Stripe Connect

1. Go to **Connect** → **Settings**
2. Enable **Express** or **Standard** accounts
3. Set platform branding
4. Configure payout schedule

### 3. Set Up Webhooks

1. Go to **Developers** → **Webhooks**
2. Add endpoint: `https://api.yourdomain.com/api/v1/webhooks/stripe`
3. Select events:
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `payout.paid`
   - `payout.failed`
   - `transfer.created`
4. Copy **Webhook Secret** to `.env`

**Uncomment Stripe integration** in:
- MonthlyBilling service
- TutorEarnings service
- Payment routes

---

## Cron Jobs Setup

### Initialize Cron Jobs

Add to `src/server.ts` after database connection:

```typescript
import { CronService } from './app/services/cron.service';

// After successful database connection
mongoose.connection.once('open', () => {
  logger.info('Database connected successfully');

  // Initialize cron jobs
  CronService.initializeCronJobs();
  logger.info('Cron jobs initialized');
});
```

**Uncomment cron schedules** in:
- `src/app/services/cron.service.ts`

**Verify cron jobs**:
- Trial request expiration (hourly)
- Session auto-completion (every 30 min)
- Session reminders (hourly)
- Monthly billing (1st of month, 2:00 AM)
- Tutor earnings (1st of month, 3:00 AM)

---

## Database Setup

### MongoDB Atlas (Recommended)

1. Create MongoDB Atlas account
2. Create new cluster
3. Add IP whitelist (0.0.0.0/0 for production or specific IPs)
4. Create database user
5. Get connection string
6. Add to `.env.production`

### Indexes

Indexes are created automatically via Mongoose schemas, but verify:

```bash
# Check indexes
db.monthlyBillings.getIndexes()
db.tutorEarnings.getIndexes()
db.sessionReviews.getIndexes()
```

Expected indexes:
- `monthlyBillings`: Unique on `studentId + billingYear + billingMonth`
- `tutorEarnings`: Unique on `tutorId + payoutYear + payoutMonth`
- `sessionReviews`: Unique on `sessionId`

---

## Testing Before Deployment

### 1. Run All Tests

```bash
npm run test:run
npm run test:coverage
```

Ensure coverage > 75%

### 2. Build TypeScript

```bash
npm run build
```

Check for compilation errors

### 3. Test Production Build

```bash
NODE_ENV=production npm start
```

### 4. Manual Testing Checklist

- [ ] User registration and login
- [ ] Tutor application flow
- [ ] Trial request creation and acceptance
- [ ] Session booking and completion
- [ ] Review creation
- [ ] Monthly billing generation (test endpoint)
- [ ] Tutor earnings generation (test endpoint)
- [ ] Admin dashboard loads
- [ ] CSV exports work
- [ ] Google Meet links generate
- [ ] Stripe webhooks receive events

---

## Security Hardening

### 1. Rate Limiting

Already configured via express-rate-limit

### 2. Helmet.js

Already configured for security headers

### 3. CORS

Update allowed origins in `src/app.ts`:

```typescript
const corsOptions = {
  origin: ['https://yourdomain.com', 'https://www.yourdomain.com'],
  credentials: true,
};
```

### 4. Environment Variables

- [ ] Never commit `.env` files
- [ ] Use strong JWT secrets
- [ ] Rotate secrets regularly
- [ ] Use Stripe live keys, not test keys

### 5. MongoDB Security

- [ ] Enable authentication
- [ ] Use strong passwords
- [ ] Whitelist specific IPs
- [ ] Enable SSL/TLS

---

## Server Setup

### Option 1: VPS (DigitalOcean, AWS EC2, etc.)

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Clone repository
git clone https://github.com/yourusername/tutoring-marketplace.git
cd tutoring-marketplace

# Install dependencies
npm install

# Build
npm run build

# Start with PM2
pm2 start dist/server.js --name tutoring-api

# Save PM2 config
pm2 save
pm2 startup
```

### Option 2: Docker

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 5000

CMD ["node", "dist/server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "5000:5000"
    env_file:
      - .env.production
    depends_on:
      - mongodb

  mongodb:
    image: mongo:6
    volumes:
      - mongo-data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password

volumes:
  mongo-data:
```

### Option 3: Heroku

```bash
# Login to Heroku
heroku login

# Create app
heroku create tutoring-marketplace-api

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=your_mongodb_uri
# ... set all other env variables

# Deploy
git push heroku main

# Scale
heroku ps:scale web=1
```

---

## Nginx Configuration (Reverse Proxy)

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}

# SSL configuration (after certbot)
server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:5000;
        # ... same proxy settings as above
    }
}
```

---

## SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d api.yourdomain.com

# Auto-renewal (already set up by certbot)
sudo certbot renew --dry-run
```

---

## Monitoring & Logging

### 1. PM2 Monitoring

```bash
pm2 logs tutoring-api
pm2 monit
```

### 2. Log Files

Logs are saved in `logs/` directory:
- `combined.log` - All logs
- `error.log` - Error logs

### 3. Sentry (Error Tracking)

1. Create account at sentry.io
2. Create new project
3. Get DSN
4. Add to `.env.production`

### 4. Health Check Endpoint

```bash
curl https://api.yourdomain.com/health
```

---

## Post-Deployment Verification

### 1. API Health

```bash
# Test health endpoint
curl https://api.yourdomain.com/health

# Test authentication
curl -X POST https://api.yourdomain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

### 2. Database Connection

Check logs for successful connection:
```bash
pm2 logs tutoring-api | grep "Database connected"
```

### 3. Cron Jobs

Check logs for cron job initialization:
```bash
pm2 logs tutoring-api | grep "Cron jobs"
```

### 4. Stripe Webhooks

Send test webhook from Stripe dashboard

### 5. Google Calendar

Test session creation and check for Meet link

---

## Backup Strategy

### 1. Database Backups

```bash
# Daily MongoDB backup
mongodump --uri="your_mongodb_uri" --out=/backups/$(date +%Y%m%d)

# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d)
mongodump --uri="$MONGODB_URI" --out="/backups/$DATE"
find /backups -type d -mtime +30 -exec rm -rf {} \;
```

### 2. Code Backups

- Push to GitHub/GitLab
- Tag releases: `git tag v1.0.0`

---

## Scaling Considerations

### Horizontal Scaling

- Use PM2 cluster mode: `pm2 start dist/server.js -i max`
- Load balancer (Nginx, AWS ELB)
- Session storage in Redis (for Socket.IO)

### Database Scaling

- MongoDB replica sets
- Read replicas
- Sharding (for large datasets)

---

## Maintenance Tasks

### Daily
- [ ] Check error logs
- [ ] Monitor API response times
- [ ] Verify cron jobs ran successfully

### Weekly
- [ ] Review failed payments
- [ ] Check database performance
- [ ] Review user feedback

### Monthly
- [ ] Verify billing accuracy
- [ ] Check payout completions
- [ ] Security updates (`npm audit`)
- [ ] Database backups verification

---

## Rollback Plan

If deployment fails:

```bash
# Revert to previous version
git revert HEAD
git push heroku main

# Or rollback Heroku
heroku releases
heroku rollback v42

# Or restart PM2 with previous code
cd /path/to/previous/version
pm2 restart tutoring-api
```

---

## Final Checklist

- [ ] All environment variables set
- [ ] Database connected and indexed
- [ ] Google OAuth configured
- [ ] Google Calendar integrated
- [ ] Stripe webhooks working
- [ ] Cron jobs running
- [ ] SSL certificate installed
- [ ] Monitoring set up
- [ ] Backups configured
- [ ] Tests passing
- [ ] Documentation updated
- [ ] Frontend can connect to API
- [ ] Email notifications working
- [ ] Error tracking (Sentry) working

---

## Support & Troubleshooting

### Common Issues

**Cron jobs not running**:
- Check logs for errors
- Verify node-cron is installed
- Check timezone settings

**Stripe webhooks failing**:
- Verify webhook secret
- Check raw body parsing middleware
- Test webhook signature verification

**Google Meet links not generating**:
- Verify OAuth tokens not expired
- Check Calendar API quota
- Review service account permissions

**MongoDB connection timeout**:
- Check IP whitelist
- Verify connection string
- Check network firewall

---

**Deployment is complete! Monitor closely for first few days.** 🚀
