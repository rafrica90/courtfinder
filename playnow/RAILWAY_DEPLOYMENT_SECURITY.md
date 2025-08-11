# Railway Deployment Security Checklist

## ✅ Security Improvements Implemented

### 1. **Authentication Middleware** (`src/middleware.ts`)
- ✅ All `/api/games/*` endpoints now require Bearer token authentication
- ✅ Automatic token validation with Supabase
- ✅ User ID injection into request headers for secure user identification
- ✅ Proper 401 responses for unauthenticated requests

### 2. **Environment Variable Validation** (`src/lib/env-validation.ts`)
- ✅ Validates all required environment variables at startup
- ✅ Fails fast in production if configuration is invalid
- ✅ Validates URL formats and domain lists

### 3. **Open Redirect Protection** (`src/app/api/clicks/route.ts`)
- ✅ Domain allowlist for redirect URLs
- ✅ Protocol validation (HTTPS required in production)
- ✅ Prevents phishing attacks via open redirects

### 4. **Image Proxy Security** (`src/app/api/image/route.ts`)
- ✅ Domain allowlist for image sources
- ✅ Prevents SSRF (Server-Side Request Forgery) attacks
- ✅ Wildcard subdomain support for CDNs

### 5. **CORS Configuration** (in middleware)
- ✅ Configurable allowed origins via environment variable
- ✅ Proper preflight request handling
- ✅ Strict origin checking in production

### 6. **Security Headers** (middleware + next.config.ts)
- ✅ X-Frame-Options: DENY (prevents clickjacking)
- ✅ X-Content-Type-Options: nosniff
- ✅ X-XSS-Protection: 1; mode=block
- ✅ Strict-Transport-Security (HSTS)
- ✅ Referrer-Policy: strict-origin-when-cross-origin
- ✅ Permissions-Policy (disables unnecessary browser features)

### 7. **Production Logging**
- ✅ Console.error statements wrapped with NODE_ENV checks
- ✅ Prevents sensitive information leakage in production logs

### 8. **Rate Limiting** (`src/lib/rate-limit.ts`)
- ✅ In-memory rate limiter implementation
- ✅ Different limits for different endpoint types
- ✅ Proper 429 responses with Retry-After headers

### 9. **Secure API Client** (`src/lib/api-client.ts`)
- ✅ Automatic auth token injection
- ✅ Token refresh on 401 responses
- ✅ Proper error handling

### 10. **Build Configuration**
- ✅ ESLint enabled for production builds
- ✅ TypeScript errors not ignored
- ✅ Source maps disabled in production

## 🚀 Railway Deployment Steps

### 1. **Set Environment Variables in Railway**

Required variables:
```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NODE_ENV=production
ALLOWED_ORIGINS=https://${{RAILWAY_PUBLIC_DOMAIN}}
ALLOWED_REDIRECT_DOMAINS=${{RAILWAY_PUBLIC_DOMAIN}}
ALLOWED_IMAGE_DOMAINS=images.unsplash.com,cdn.pixabay.com,*.supabase.co
```

### 2. **Update Client Code to Use Secure API**

Replace direct fetch calls with the secure API client:

```typescript
// OLD - Insecure
const response = await fetch('/api/games', {
  method: 'POST',
  body: JSON.stringify({ hostUserId: 'user123', ... })
});

// NEW - Secure (auth handled automatically)
import { api } from '@/lib/api-client';
const { data, error } = await api.games.create({ ... });
```

### 3. **Configure Supabase**

1. Enable Row Level Security (RLS) on all tables
2. Set up proper authentication policies
3. Configure allowed redirect URLs in Supabase dashboard

### 4. **Deploy to Railway**

```bash
# Push to your repository
git add .
git commit -m "Add security improvements for Railway deployment"
git push origin main

# Railway will auto-deploy from your GitHub repo
```

## ⚠️ Important Security Notes

### Things to Update Before Production

1. **Update Domain Allowlists**
   - Replace example domains in `ALLOWED_ORIGINS`
   - Update `ALLOWED_REDIRECT_DOMAINS` with your actual domain
   - Adjust `ALLOWED_IMAGE_DOMAINS` based on your needs

2. **Supabase Configuration**
   - Enable email verification for sign-ups
   - Configure rate limiting in Supabase
   - Set up proper backup strategies

3. **Consider Adding**
   - Redis for distributed rate limiting (if scaling horizontally)
   - Monitoring service (Sentry, LogTail, etc.)
   - WAF (Web Application Firewall) via Cloudflare
   - Database query optimization and indexes

### Security Best Practices

1. **Never expose `SUPABASE_SERVICE_ROLE_KEY`** - keep it only on the server
2. **Use Railway's secret management** for sensitive variables
3. **Enable 2FA** on your Railway and Supabase accounts
4. **Regular security audits** - run `npm audit` regularly
5. **Keep dependencies updated** - use Dependabot or similar

## 🔍 Testing Security

### Local Testing
```bash
# Test with production-like environment
NODE_ENV=production npm run build
NODE_ENV=production npm start
```

### Security Headers Test
```bash
# After deployment, test security headers
curl -I https://your-app.railway.app
```

### Rate Limiting Test
```bash
# Test rate limiting (should get 429 after limit)
for i in {1..150}; do curl https://your-app.railway.app/api/games; done
```

## 📊 Monitoring

After deployment, monitor:
- Failed authentication attempts
- Rate limit violations
- 4xx and 5xx error rates
- Response times
- Database query performance

## 🆘 Troubleshooting

### Common Issues

1. **"Missing authorization header" errors**
   - Ensure client is using the secure API client
   - Check that Supabase auth is properly initialized

2. **CORS errors**
   - Update `ALLOWED_ORIGINS` with your Railway domain
   - Include both www and non-www versions if needed

3. **Rate limiting too strict**
   - Adjust limits in `src/lib/rate-limit.ts`
   - Consider using Redis for better performance

4. **Environment variables not working**
   - Use Railway's reference variables syntax: `${{VARIABLE_NAME}}`
   - Ensure all required variables are set

## ✅ Final Checklist

Before going live:
- [ ] All environment variables set in Railway
- [ ] Domain allowlists updated with production domains
- [ ] Client code updated to use secure API client
- [ ] Supabase RLS policies configured
- [ ] Security headers verified
- [ ] Rate limiting tested
- [ ] Error monitoring configured
- [ ] Backup strategy in place
- [ ] Security audit completed
