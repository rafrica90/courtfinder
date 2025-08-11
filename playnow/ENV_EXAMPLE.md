# Environment Variables Setup

## Required Environment Variables

Copy these variables to your `.env.local` file for local development or set them in Railway's environment variables section for production.

```bash
# ========================================
# REQUIRED ENVIRONMENT VARIABLES
# ========================================

# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# ========================================
# SECURITY CONFIGURATION
# ========================================

# Allowed Origins for CORS (comma-separated list)
# Example: https://yourdomain.com,https://www.yourdomain.com
# For Railway: add your Railway domain here
ALLOWED_ORIGINS=https://your-app.railway.app

# Allowed domains for redirect URLs (comma-separated list)
# Used to prevent open redirect attacks in /api/clicks
# Example: yourdomain.com,*.yourdomain.com
ALLOWED_REDIRECT_DOMAINS=your-app.railway.app,localhost:3000

# Allowed domains for image proxy (comma-separated list)
# Used to prevent SSRF attacks in /api/image
# Example: images.unsplash.com,cdn.pixabay.com,*.supabase.co
ALLOWED_IMAGE_DOMAINS=images.unsplash.com,cdn.pixabay.com,*.supabase.co,*.supabase.in

# ========================================
# OPTIONAL CONFIGURATION
# ========================================

# Node Environment
NODE_ENV=production

# Rate Limiting (Optional - for future implementation)
# RATE_LIMIT_ENABLED=true
# RATE_LIMIT_WINDOW_MS=60000
# RATE_LIMIT_MAX_REQUESTS=100

# Redis Configuration (Optional - for rate limiting/caching)
# REDIS_URL=redis://localhost:6379

# Monitoring/Logging Service (Optional)
# SENTRY_DSN=your-sentry-dsn-here
# LOGTAIL_SOURCE_TOKEN=your-logtail-token-here
```

## Railway Deployment Notes

When deploying to Railway:

1. **Set all required variables** in Railway's environment variables section
2. **Update ALLOWED_ORIGINS** with your Railway domain (e.g., `https://your-app.railway.app`)
3. **Update ALLOWED_REDIRECT_DOMAINS** with your Railway domain
4. **Keep SUPABASE_SERVICE_ROLE_KEY private** - never commit it to git
5. **Use Railway's reference variables** for dynamic URLs

### Railway Automatic Variables

Railway provides these variables automatically:
- `RAILWAY_ENVIRONMENT` - production, staging, etc.
- `RAILWAY_PUBLIC_DOMAIN` - your app's public URL
- `PORT` - the port your app should listen on

You can reference them in your config:
```bash
ALLOWED_ORIGINS=https://${{RAILWAY_PUBLIC_DOMAIN}}
ALLOWED_REDIRECT_DOMAINS=${{RAILWAY_PUBLIC_DOMAIN}}
```

## Security Checklist

Before deploying to production:

- [ ] All required environment variables are set
- [ ] SUPABASE_SERVICE_ROLE_KEY is kept secret
- [ ] ALLOWED_ORIGINS is configured with your production domain
- [ ] ALLOWED_REDIRECT_DOMAINS is configured
- [ ] ALLOWED_IMAGE_DOMAINS is configured
- [ ] NODE_ENV is set to 'production'
- [ ] Database has proper indexes and security rules
- [ ] Authentication is properly configured in Supabase
- [ ] Rate limiting is considered for API endpoints
