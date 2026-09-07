# Vercel Deployment Guide

> **Status**: PARTIALLY IMPLEMENTED — Configuration documented, needs verification
> **Target**: Next.js 14 Web App (Frontend only — API deployed separately)

---

## Architecture on Vercel

```
┌─────────────────────────────────────────────────────────────────┐
│                        VERCEL EDGE NETWORK                       │
│                                                                  │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │  Static Assets  │    │  Edge Functions │    │  ISR/SSR    │ │
│  │  (CDN Cached)   │    │  (Middleware,   │    │  (Pages)    │ │
│  │  JS, CSS, Img   │    │   Rewrites)     │    │             │ │
│  └─────────────────┘    └─────────────────┘    └──────┬──────┘ │
│                                                        │        │
└────────────────────────────────────────────────────────┼────────┘
                                                         │
                    ┌────────────────────────────────────┘
                    ▼
         ┌────────────────────────┐
         │   EXTERNAL API SERVER  │
         │   (Railway/Render/AWS) │
         │   https://api.xxx.com  │
         └────────────────────────┘
```

**Key Decision**: Frontend on Vercel, API on separate Node.js host (Railway, Render, AWS, GCP, K8s). Vercel's serverless functions have 10s/60s timeout limits unsuitable for long-running AI/resume processing.

---

## Prerequisites

- Vercel account (https://vercel.com)
- GitHub/GitLab/Bitbucket repo connected
- API server already deployed with public URL
- Domain (optional, for custom domain)

---

## Step 1: Prepare Next.js for Vercel

### next.config.js (apps/web/next.config.js)

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for standalone output (Docker) but Vercel handles automatically
  // output: 'standalone',  // Comment out for Vercel

  // API URL for client-side fetch (set via env var)
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },

  // Image optimization domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com',  // OAuth avatars
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      // Add your S3/CDN domain if using custom storage
    ],
  },

  // Rewrites for API proxy (optional - only if you want to proxy through Vercel)
  async rewrites() {
    return [
      {
        source: '/api/proxy/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/:path*`,
      },
    ];
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

### Package.json Scripts (apps/web/package.json)

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  }
}
```

**Important**: Do NOT use `output: 'standalone'` for Vercel — it handles output automatically.

---

## Step 2: Configure Environment Variables

### In Vercel Dashboard → Project → Settings → Environment Variables

| Variable | Environment | Value |
|----------|-------------|-------|
| `NEXT_PUBLIC_API_URL` | Production, Preview, Development | `https://api.yourdomain.com` |
| `NEXT_PUBLIC_APP_URL` | Production, Preview, Development | `https://yourdomain.com` |
| `NEXT_PUBLIC_WS_URL` | Production, Preview, Development | `wss://api.yourdomain.com` (if using WebSockets) |

**Notes:**
- `NEXT_PUBLIC_` prefix makes them available in browser
- Different values per environment (Preview vs Production)
- API URL must be HTTPS in production

### Local Development (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Step 3: Deploy to Vercel

### Option A: Vercel CLI (Recommended for CI/CD)

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy from project root
cd apps/web
vercel

# Follow prompts:
# ? Set up and deploy? Yes
# ? Which scope? <your-account>
# ? Link to existing project? No (first time)
# ? Project name: skillsync-web
# ? Directory: ./apps/web
# ? Override settings? No

# For production deploy:
vercel --prod
```

### Option B: GitHub Integration (Auto-deploy on push)

1. Go to Vercel Dashboard → "Add New Project"
2. Import from GitHub: `your-org/skillsync`
3. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web`
   - **Build Command**: `npm run build` (or `pnpm build` if using pnpm)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (runs from repo root with workspaces)
4. Add Environment Variables (from Step 2)
5. Click "Deploy"

### Turborepo Considerations

Since this is a Turborepo monorepo, ensure:

```json
// vercel.json (in apps/web/)
{
  "buildCommand": "cd ../.. && npm run build --filter=@skillsync/web",
  "installCommand": "cd ../.. && npm install",
  "devCommand": "cd ../.. && npm run dev --filter=@skillsync/web"
}
```

Or configure in Vercel Dashboard:
- **Build Command**: `npm run build --filter=@skillsync/web`
- **Install Command**: `npm install`
- **Root Directory**: `apps/web` (if set, commands run from there)

---

## Step 4: Configure Custom Domain

### In Vercel Dashboard → Project → Settings → Domains

1. Add domain: `skillsync.com` or `app.skillsync.com`
2. Verify ownership (DNS records):
   - **A Record**: `@` → `76.76.21.21` (Vercel Anycast IP)
   - **CNAME**: `www` → `cname.vercel-dns.com`
3. Wait for SSL certificate (automatic via Let's Encrypt)
4. Set as Primary domain

### Update Environment Variables

```env
NEXT_PUBLIC_APP_URL=https://skillsync.com
NEXT_PUBLIC_API_URL=https://api.skillsync.com
```

Redeploy: `vercel --prod`

---

## Step 5: API Server CORS Configuration

Your API server (Hono) must allow requests from Vercel domains.

### In API .env (Production)

```env
APP_URL=https://skillsync.com
```

### In API Code (apps/api/src/index.ts)

```typescript
const allowedOrigins = Array.from(new Set([
  'http://localhost:3000',
  ...(process.env.APP_URL ? [process.env.APP_URL.replace(/\/$/, '')] : []),
  // Add Vercel preview URLs if needed
  // 'https://skillsync-web-git-main-yourorg.vercel.app',
]));

app.use('*', cors({
  origin: (origin) => {
    if (!origin) return allowedOrigins[0];
    const normalized = origin.replace(/\/$/, '');
    if (allowedOrigins.includes(normalized)) {
      return origin;  // Reflect origin for credentials
    }
    return allowedOrigins[0];
  },
  credentials: true,  // Allow cookies
}));
```

**Critical**: `credentials: true` + reflecting exact origin required for HttpOnly cookies to work cross-origin.

---

## Step 6: Cookie Domain Configuration

### In API Auth Utils (apps/api/src/auth/utils.ts)

```typescript
export const getSessionCookieOptions = (c: Context) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isVercel = process.env.VERCEL === '1';  // Set in Vercel env
  
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 7,  // 7 days
    // domain: isProduction ? '.yourdomain.com' : undefined,  // Optional: share across subdomains
  };
};
```

**Subdomain Sharing** (if API on `api.yourdomain.com`, Web on `yourdomain.com`):
```typescript
domain: isProduction ? '.yourdomain.com' : undefined,
```
Requires API and Web on same root domain.

---

## Step 7: Preview Deployments

Vercel creates preview deployments for every PR.

### Configure Preview API URL

In Vercel Dashboard → Project → Settings → Environment Variables:

| Variable | Preview Value |
|----------|---------------|
| `NEXT_PUBLIC_API_URL` | `https://api-staging.yourdomain.com` |

Or use Vercel System Environment Variables:
```typescript
// In next.config.js
const isPreview = process.env.VERCEL_ENV === 'preview';
const apiUrl = isPreview 
  ? 'https://api-staging.yourdomain.com' 
  : process.env.NEXT_PUBLIC_API_URL;
```

---

## Step 8: Middleware for Auth (Optional)

### Create apps/web/src/middleware.ts

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedPaths = ['/dashboard', '/skills', '/skill-intelligence', '/evidence', '/resumes', '/learning', '/profile', '/settings', '/ai'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if path is protected
  const isProtected = protectedPaths.some(path => pathname.startsWith(path));
  
  if (isProtected) {
    // Check for session cookie
    const sessionCookie = request.cookies.get('skillsync_session');
    
    if (!sessionCookie) {
      // Redirect to login with return URL
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/skills/:path*',
    '/skill-intelligence/:path*',
    '/evidence/:path*',
    '/resumes/:path*',
    '/learning/:path*',
    '/profile/:path*',
    '/settings/:path*',
    '/ai/:path*',
  ],
};
```

**Note**: Client-side `AuthContext` also checks auth on mount. Middleware provides server-side protection for SSR pages.

---

## Step 9: Build Optimization

### Analyze Bundle Size

```bash
# Local analysis
cd apps/web
npm run build
npx @next/bundle-analyzer

# Or add to package.json
"analyze": "ANALYZE=true npm run build"
```

### Common Optimizations

```javascript
// next.config.js
const nextConfig = {
  // ...existing config
  
  // Transpile shared packages
  transpilePackages: ['@skillsync/ui', '@skillsync/types', '@skillsync/utils'],
  
  // Experimental: optimize package imports
  experimental: {
    optimizePackageImports: ['@skillsync/ui', 'lucide-react'],
  },
  
  // Reduce bundle size
  modularizeImports: {
    '@skillsync/ui': {
      transform: '@skillsync/ui/components/{{member}}',
    },
  },
};
```

---

## Step 10: Monitoring & Analytics

### Vercel Analytics (Built-in)

Enable in Vercel Dashboard → Project → Analytics:
- **Web Vitals**: LCP, FID, CLS
- **Page Views**: Path, referrer, device
- **Function Metrics**: Duration, errors, cold starts

### Custom Events (Client-side)

```typescript
// lib/analytics.ts
export function trackEvent(event: string, properties?: Record<string, any>) {
  if (typeof window !== 'undefined' && window.va) {
    window.va('track', event, properties);
  }
}

// Usage
trackEvent('skill_added', { skillId, proficiencyLevel });
trackEvent('resume_uploaded', { fileType, fileSize });
trackEvent('learning_path_generated', { targetSkillId, readiness });
```

---

## Troubleshooting

### Issue: Cookies not sent to API

**Symptoms**: `GET /auth/me` returns 401 on Vercel but works locally

**Causes & Fixes**:
1. **CORS origin mismatch** → Ensure `APP_URL` in API matches exact Vercel domain
2. **SameSite=Lax blocks cross-site** → Use same root domain (api.yourdomain.com + yourdomain.com) with `domain: '.yourdomain.com'`
3. **Secure flag** → Must use HTTPS in production
4. **Vercel proxy strips cookies** → Don't proxy API through Vercel rewrites; call API directly

### Issue: Build fails with "Module not found"

**Causes & Fixes**:
1. **Workspace packages not linked** → Ensure `npm install` runs from repo root
2. **transpilePackages missing** → Add `@skillsync/*` to `transpilePackages`
3. **TypeScript path aliases** → Match `tsconfig.json` paths in `next.config.js`

### Issue: API calls timeout

**Cause**: Vercel serverless function timeout (10s Hobby, 60s Pro)

**Fix**: Don't proxy long-running API calls through Vercel. Call API directly from client:
```typescript
// Good: Direct API call
fetch('https://api.yourdomain.com/skill-intelligence', { credentials: 'include' });

// Bad: Proxy through Vercel (times out on long AI requests)
fetch('/api/proxy/skill-intelligence', { credentials: 'include' });
```

### Issue: Environment variables not working

**Fix**: 
- `NEXT_PUBLIC_` prefix required for client-side access
- Redeploy after adding env vars: `vercel --prod`
- Check in browser: `console.log(process.env.NEXT_PUBLIC_API_URL)`

---

## CI/CD with GitHub Actions

### .github/workflows/vercel-deploy.yml

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy-preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9
          
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
          
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        
      - name: Build web
        run: pnpm run build --filter=@skillsync/web
        working-directory: ./apps/web
        
      - name: Deploy to Vercel Preview
        uses: amondnet/vercel-action@v25
        if: github.event_name == 'pull_request'
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--token=${{ secrets.VERCEL_TOKEN }}'
          working-directory: ./apps/web

  deploy-production:
    needs: deploy-preview
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Vercel Production
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod --token=${{ secrets.VERCEL_TOKEN }}'
          working-directory: ./apps/web
```

### Required Secrets (GitHub → Settings → Secrets)
- `VERCEL_TOKEN` — From Vercel Account Settings → Tokens
- `VERCEL_ORG_ID` — From Vercel Project Settings
- `VERCEL_PROJECT_ID` — From Vercel Project Settings

---

## Cost Estimation (Vercel)

| Plan | Bandwidth | Functions | Price |
|------|-----------|-----------|-------|
| Hobby | 100 GB | 125K invocations | Free |
| Pro | 1 TB | 1M invocations | $20/mo |
| Enterprise | Custom | Custom | Custom |

**SkillSync Typical Usage**:
- ~10K visits/month → ~5 GB bandwidth
- ~50K function invocations (auth checks, API proxies)
- **Recommendation**: Hobby tier sufficient for MVP; Pro for production

---

## Rollback Procedure

```bash
# List deployments
vercel ls skillsync-web

# Rollback to specific deployment
vercel rollback skillsync-web <deployment-url>

# Or in Dashboard: Deployments → "..." → "Promote to Production"
```

---

## Checklist Before Going Live

- [ ] API deployed and accessible at `https://api.yourdomain.com`
- [ ] CORS configured for Vercel domain
- [ ] Cookie domain configured for subdomain sharing
- [ ] Environment variables set in Vercel (Production + Preview)
- [ ] Custom domain configured with SSL
- [ ] Preview deployments working for PRs
- [ ] GitHub Actions CI/CD configured
- [ ] Analytics enabled
- [ ] Error tracking (Sentry) configured
- [ ] Load tested: 100 concurrent users
- [ ] Session persistence verified across page navigations
- [ ] Auth redirects work (login → dashboard, protected → login)