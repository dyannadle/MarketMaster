# Production Deployment & Release Checklist
## Project: MarketMaster Academy
**Target**: Staging & Production Verification  
**Version**: 1.0.0  

---

### 1. Pre-Release Verification Checklist
- [x] Verify `NODE_ENV=production` and `DEBUG=false`.
- [x] All database Flyway migrations executed successfully.
- [x] CORS origins locked down to production web domain.
- [x] All private API routes require valid JWT authentication.
- [x] Rate limiting active on authentication and order endpoints.
- [x] Educational and risk disclaimers present on all screens.
- [x] Zero dark patterns or hidden fees.
- [x] Privacy Policy, Terms of Service, Cookie Policy accessible.
- [x] Sitemap.xml and robots.txt tested and active.
- [x] WCAG 2.1 AA contrast ratio verified on dark and light themes.

---

### 2. CI/CD GitHub Actions Pipeline
* **Trigger**: Push to `main` branch.
* **Pipeline Jobs**:
  1. `lint-and-typecheck`: TypeScript compiler (`tsc --noEmit`) and ESLint.
  2. `test-backend`: Maven test runner with JUnit 5.
  3. `test-frontend`: Vitest test runner.
  4. `build-apk`: Gradle build `assembleRelease` generating direct downloadable APK.
  5. `deploy-web`: Automatic deployment to Vercel/Cloudflare Pages.

