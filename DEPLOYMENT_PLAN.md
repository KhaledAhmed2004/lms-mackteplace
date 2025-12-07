# Deployment Plan & Infrastructure

**Project:** educoin-backend
**Audit Date:** 2025-11-08
**Deployment Status:** 🔴 **NOT DEPLOYMENT READY**

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Multi-Stage Dockerfile](#multi-stage-dockerfile)
3. [Docker Compose](#docker-compose)
4. [Environment Configuration](#environment-configuration)
5. [Build & Deploy Steps](#build--deploy-steps)
6. [Production Readiness Checklist](#production-readiness-checklist)
7. [Deployment Strategies](#deployment-strategies)
8. [Monitoring & Rollback](#monitoring--rollback)

---

## Executive Summary

### Current State: ❌ No Deployment Infrastructure

**Missing Components:**
- ❌ Dockerfile
- ❌ docker-compose.yml
- ❌ Health check endpoint
- ❌ Process manager (PM2)
- ❌ Deployment scripts
- ❌ Environment-specific configs
- ❌ Load balancer configuration
- ❌ Database migration strategy

**Impact:**
- Cannot deploy to containers (Docker/Kubernetes)
- No local development parity
- Manual deployment (error-prone)
- No graceful shutdown
- No zero-downtime deployments

---

## Multi-Stage Dockerfile

### Production-Ready Dockerfile

**File:** `Dockerfile` (CREATE THIS)

```dockerfile
# syntax=docker/dockerfile:1

# =============================================================================
# Stage 1: Dependencies
# =============================================================================
FROM node:20-alpine AS dependencies

LABEL maintainer="your-email@example.com"
LABEL description="educoin-backend - Production API Server"

# Install OpenSSL for Prisma (if needed) and other build dependencies
RUN apk add --no-cache \
    openssl \
    libc6-compat \
    python3 \
    make \
    g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci --include=dev

# =============================================================================
# Stage 2: Build
# =============================================================================
FROM node:20-alpine AS build

WORKDIR /app

# Copy dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# Remove devDependencies (keep only production deps)
RUN npm prune --production

# =============================================================================
# Stage 3: Production Runner
# =============================================================================
FROM node:20-alpine AS runner

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Set NODE_ENV to production
ENV NODE_ENV=production \
    PORT=5000

# Copy built application and production dependencies
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --from=build --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/package*.json ./

# Copy public assets (Swagger docs, etc.)
COPY --chown=nodejs:nodejs public ./public

# Create directories for logs (Winston)
RUN mkdir -p winston/success winston/error && \
    chown -R nodejs:nodejs winston

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/server.js"]
```

**Key Features:**
- ✅ **Multi-stage build** - Reduces final image size by ~70%
- ✅ **Non-root user** - Security best practice
- ✅ **Alpine Linux** - Minimal attack surface (~150MB total)
- ✅ **Dumb-init** - Proper signal handling (SIGTERM for graceful shutdown)
- ✅ **Health check** - Container orchestrators can detect failures
- ✅ **Layer caching** - Fast rebuilds (only rebuild changed layers)
- ✅ **Production dependencies only** - Smaller image

**Build & Run:**
```bash
# Build
docker build -t educoin-backend:latest .

# Run
docker run -p 5000:5000 \
  --env-file .env.production \
  educoin-backend:latest

# Check health
curl http://localhost:5000/api/v1/health
```

---

### .dockerignore

**File:** `.dockerignore` (CREATE THIS)

```
# Git
.git
.gitignore

# Node
node_modules
npm-debug.log
yarn-error.log

# Environment
.env
.env.local
.env.*.local

# Build
dist
build

# Logs
winston
*.log

# Tests
tests
coverage
.vitest

# IDE
.vscode
.idea
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Documentation
*.md
!README.md

# CI/CD
.github

# Docker
Dockerfile*
docker-compose*.yml
```

---

## Docker Compose

### Development Environment

**File:** `docker-compose.yml` (CREATE THIS)

```yaml
version: '3.8'

services:
  # =============================================================================
  # MongoDB Database
  # =============================================================================
  mongodb:
    image: mongo:7.0
    container_name: educoin-mongodb
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD:-changeme}
      MONGO_INITDB_DATABASE: educoin-backend
    ports:
      - '27017:27017'
    volumes:
      - mongodb_data:/data/db
      - mongodb_config:/data/configdb
    networks:
      - educoin-network
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test --quiet
      interval: 10s
      timeout: 5s
      retries: 5

  # =============================================================================
  # Redis (for caching, sessions, rate limiting)
  # =============================================================================
  redis:
    image: redis:7-alpine
    container_name: educoin-redis
    restart: unless-stopped
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data
    networks:
      - educoin-network
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 3s
      retries: 5
    command: redis-server --appendonly yes

  # =============================================================================
  # Application Server
  # =============================================================================
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: runner
    container_name: educoin-backend
    restart: unless-stopped
    ports:
      - '${PORT:-5000}:5000'
      - '9464:9464'  # Prometheus metrics
    env_file:
      - .env
    environment:
      NODE_ENV: ${NODE_ENV:-development}
      DATABASE_URL: mongodb://admin:${MONGO_ROOT_PASSWORD:-changeme}@mongodb:27017/educoin-backend?authSource=admin
      REDIS_URL: redis://redis:6379
    depends_on:
      mongodb:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - educoin-network
    volumes:
      # Mount source code for development (hot reload)
      - ./src:/app/src
      - ./public:/app/public
      # Don't mount node_modules (use container's version)
      - /app/node_modules
      # Persist logs
      - ./winston:/app/winston
    healthcheck:
      test: ['CMD', 'node', '-e', "require('http').get('http://localhost:5000/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 40s

  # =============================================================================
  # Prometheus (Metrics)
  # =============================================================================
  prometheus:
    image: prom/prometheus:latest
    container_name: educoin-prometheus
    restart: unless-stopped
    ports:
      - '9090:9090'
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    networks:
      - educoin-network
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/usr/share/prometheus/console_libraries'
      - '--web.console.templates=/usr/share/prometheus/consoles'

  # =============================================================================
  # Grafana (Visualization)
  # =============================================================================
  grafana:
    image: grafana/grafana:latest
    container_name: educoin-grafana
    restart: unless-stopped
    ports:
      - '3001:3000'
    environment:
      GF_SECURITY_ADMIN_USER: ${GRAFANA_USER:-admin}
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD:-admin}
      GF_INSTALL_PLUGINS: redis-datasource
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources
    networks:
      - educoin-network
    depends_on:
      - prometheus

  # =============================================================================
  # Jaeger (Distributed Tracing)
  # =============================================================================
  jaeger:
    image: jaegertracing/all-in-one:latest
    container_name: educoin-jaeger
    restart: unless-stopped
    ports:
      - '6831:6831/udp'  # Agent
      - '16686:16686'    # UI
      - '14268:14268'    # Collector HTTP
    environment:
      COLLECTOR_ZIPKIN_HOST_PORT: ':9411'
    networks:
      - educoin-network

networks:
  educoin-network:
    driver: bridge

volumes:
  mongodb_data:
  mongodb_config:
  redis_data:
  prometheus_data:
  grafana_data:
```

**Usage:**
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop all services
docker-compose down

# Stop and remove volumes (CAUTION: Deletes data)
docker-compose down -v

# Rebuild app container
docker-compose up -d --build app
```

**Access Services:**
- API: http://localhost:5000
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001 (admin/admin)
- Jaeger: http://localhost:16686
- MongoDB: mongodb://localhost:27017

---

### Production Docker Compose

**File:** `docker-compose.prod.yml` (CREATE THIS)

```yaml
version: '3.8'

services:
  app:
    image: ghcr.io/your-org/educoin-backend:${VERSION:-latest}
    container_name: educoin-backend-prod
    restart: always
    ports:
      - '5000:5000'
    env_file:
      - .env.production
    environment:
      NODE_ENV: production
    networks:
      - educoin-network
    deploy:
      replicas: 3  # For Docker Swarm
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
    healthcheck:
      test: ['CMD', 'node', '-e', "require('http').get('http://localhost:5000/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 40s

  # Nginx reverse proxy (load balancer)
  nginx:
    image: nginx:alpine
    container_name: educoin-nginx
    restart: always
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    networks:
      - educoin-network
    depends_on:
      - app

networks:
  educoin-network:
    driver: bridge
```

---

## Environment Configuration

### Required Environment Variables

#### Development (.env.development)
```bash
# Application
NODE_ENV=development
IP_ADDRESS=localhost
PORT=5000
FRONTEND_URL=http://localhost:3000

# Database (Docker)
DATABASE_URL=mongodb://admin:devpassword@localhost:27017/educoin-backend?authSource=admin

# Redis (Docker)
REDIS_URL=redis://localhost:6379

# Authentication (DEV ONLY - CHANGE IN PROD)
BCRYPT_SALT_ROUNDS=12
JWT_SECRET=dev-jwt-secret-change-in-production
JWT_EXPIRE_IN=1d
JWT_REFRESH_SECRET=dev-jwt-refresh-secret-change-in-production
JWT_REFRESH_EXPIRE_IN=365d

# Email (Gmail - DEV ONLY)
EMAIL_FROM=dev@educoin.local
EMAIL_USER=dev.test@gmail.com
EMAIL_PASS=dev-app-password
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587

# Super Admin (Seeding)
SUPER_ADMIN_EMAIL=admin@educoin.local
SUPER_ADMIN_PASSWORD=Admin123!

# Google OAuth (DEV)
GOOGLE_CLIENT_ID=dev-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=dev-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# Firebase (DEV)
FIREBASE_SERVICE_ACCOUNT_KEY_BASE64=dev-base64-encoded-key
FIREBASE_WEB_PUSH_CREDENTIALS=dev-credentials

# Stripe (TEST MODE)
STRIPE_SECRET_KEY=sk_test_dev_key
STRIPE_PUBLISHABLE_KEY=pk_test_dev_key
STRIPE_WEBHOOK_SECRET=whsec_dev_secret

# Payment Config
PLATFORM_FEE_PERCENTAGE=0.20
MINIMUM_PAYMENT_AMOUNT=100
MAXIMUM_PAYMENT_AMOUNT=100000
DEFAULT_CURRENCY=usd

# Observability
LOG_LEVEL=debug
CORS_DEBUG=true
JAEGER_ENDPOINT=http://localhost:14268/api/traces
```

#### Production (.env.production)
```bash
# Application
NODE_ENV=production
IP_ADDRESS=0.0.0.0
PORT=5000
FRONTEND_URL=https://educoin.com

# Database (MANAGED - AWS, GCP, Atlas)
DATABASE_URL=<GET_FROM_SECRETS_MANAGER>

# Redis (MANAGED - AWS ElastiCache, Redis Cloud)
REDIS_URL=<GET_FROM_SECRETS_MANAGER>

# Authentication (STRONG SECRETS)
BCRYPT_SALT_ROUNDS=12
JWT_SECRET=<GET_FROM_SECRETS_MANAGER>  # 256-bit random
JWT_EXPIRE_IN=15m  # Shorter in production
JWT_REFRESH_SECRET=<GET_FROM_SECRETS_MANAGER>  # 256-bit random
JWT_REFRESH_EXPIRE_IN=7d  # Shorter in production

# Email (SendGrid, AWS SES, Mailgun)
EMAIL_FROM=noreply@educoin.com
EMAIL_USER=<GET_FROM_SECRETS_MANAGER>
EMAIL_PASS=<GET_FROM_SECRETS_MANAGER>
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587

# Super Admin (CHANGE IMMEDIATELY)
SUPER_ADMIN_EMAIL=admin@educoin.com
SUPER_ADMIN_PASSWORD=<GET_FROM_SECRETS_MANAGER>

# Google OAuth (PRODUCTION)
GOOGLE_CLIENT_ID=<GET_FROM_SECRETS_MANAGER>
GOOGLE_CLIENT_SECRET=<GET_FROM_SECRETS_MANAGER>
GOOGLE_REDIRECT_URI=https://educoin.com/auth/google/callback

# Firebase (PRODUCTION)
FIREBASE_SERVICE_ACCOUNT_KEY_BASE64=<GET_FROM_SECRETS_MANAGER>
FIREBASE_WEB_PUSH_CREDENTIALS=<GET_FROM_SECRETS_MANAGER>

# Stripe (LIVE MODE)
STRIPE_SECRET_KEY=<GET_FROM_SECRETS_MANAGER>  # sk_live_...
STRIPE_PUBLISHABLE_KEY=<GET_FROM_SECRETS_MANAGER>  # pk_live_...
STRIPE_WEBHOOK_SECRET=<GET_FROM_SECRETS_MANAGER>  # whsec_...

# Payment Config
PLATFORM_FEE_PERCENTAGE=0.20
MINIMUM_PAYMENT_AMOUNT=500
MAXIMUM_PAYMENT_AMOUNT=50000
DEFAULT_CURRENCY=usd

# Observability
LOG_LEVEL=info  # Less verbose in production
CORS_DEBUG=false
SENTRY_DSN=<GET_FROM_SECRETS_MANAGER>
JAEGER_ENDPOINT=http://jaeger-collector:14268/api/traces

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
```

---

## Build & Deploy Steps

### Local Development

```bash
# 1. Clone repository
git clone https://github.com/your-org/educoin-backend.git
cd educoin-backend

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env
# Edit .env with your values

# 4. Start Docker services (MongoDB, Redis)
docker-compose up -d mongodb redis

# 5. Run database migrations (if any)
# npm run migrate:dev

# 6. Seed database (optional)
npm run seed

# 7. Start development server
npm run dev

# Server running at http://localhost:5000
```

---

### Docker Development

```bash
# 1. Start all services (app + dependencies)
docker-compose up -d

# 2. View logs
docker-compose logs -f app

# 3. Run migrations inside container
docker-compose exec app npm run migrate

# 4. Seed database
docker-compose exec app npm run seed

# 5. Restart app after code changes
docker-compose restart app

# 6. Stop all services
docker-compose down
```

---

### Production Build

```bash
# 1. Set production environment
export NODE_ENV=production

# 2. Install dependencies (production only)
npm ci --production

# 3. Build TypeScript
npm run build

# 4. Verify build output
ls -lah dist/

# 5. Test build locally
node dist/server.js

# 6. Build Docker image
docker build -t educoin-backend:v1.0.0 .

# 7. Tag for registry
docker tag educoin-backend:v1.0.0 ghcr.io/your-org/educoin-backend:v1.0.0
docker tag educoin-backend:v1.0.0 ghcr.io/your-org/educoin-backend:latest

# 8. Push to registry
docker push ghcr.io/your-org/educoin-backend:v1.0.0
docker push ghcr.io/your-org/educoin-backend:latest
```

---

### Deployment to Production

#### Option 1: Docker Compose (Single Server)

```bash
# SSH into production server
ssh user@production-server

# Pull latest image
docker pull ghcr.io/your-org/educoin-backend:latest

# Stop old container
docker stop educoin-backend

# Remove old container
docker rm educoin-backend

# Run new container
docker run -d \
  --name educoin-backend \
  --restart unless-stopped \
  -p 5000:5000 \
  --env-file .env.production \
  --network educoin-network \
  ghcr.io/your-org/educoin-backend:latest

# Verify deployment
docker logs -f educoin-backend
curl http://localhost:5000/api/v1/health
```

#### Option 2: Kubernetes (Recommended for Production)

**File:** `k8s/deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: educoin-backend
  labels:
    app: educoin-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: educoin-backend
  template:
    metadata:
      labels:
        app: educoin-backend
    spec:
      containers:
        - name: educoin-backend
          image: ghcr.io/your-org/educoin-backend:latest
          ports:
            - containerPort: 5000
          env:
            - name: NODE_ENV
              value: 'production'
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: educoin-secrets
                  key: database-url
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: educoin-secrets
                  key: jwt-secret
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: 1000m
              memory: 1Gi
          livenessProbe:
            httpGet:
              path: /api/v1/health
              port: 5000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /api/v1/health
              port: 5000
            initialDelaySeconds: 10
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: educoin-backend-service
spec:
  selector:
    app: educoin-backend
  ports:
    - protocol: TCP
      port: 80
      targetPort: 5000
  type: LoadBalancer
```

**Deploy to Kubernetes:**
```bash
# Create secrets
kubectl create secret generic educoin-secrets \
  --from-literal=database-url='mongodb://...' \
  --from-literal=jwt-secret='...'

# Apply deployment
kubectl apply -f k8s/deployment.yaml

# Check status
kubectl get pods
kubectl get services

# View logs
kubectl logs -f deployment/educoin-backend
```

---

## Production Readiness Checklist

### Infrastructure
- [ ] Dockerfile created and tested
- [ ] docker-compose.yml for local dev
- [ ] docker-compose.prod.yml for production
- [ ] .dockerignore configured
- [ ] Multi-stage build optimized

### Configuration
- [ ] .env.example created
- [ ] .env.development configured
- [ ] .env.production configured (with placeholders)
- [ ] Secrets moved to secrets manager (AWS/Vault)
- [ ] Environment-specific configs validated

### Health & Monitoring
- [ ] `/api/v1/health` endpoint implemented
- [ ] Health checks in Dockerfile
- [ ] Health checks in docker-compose
- [ ] Liveness probe configured (K8s)
- [ ] Readiness probe configured (K8s)

### Process Management
- [ ] Graceful shutdown implemented
- [ ] SIGTERM handling
- [ ] Database connection cleanup
- [ ] Socket.IO cleanup on shutdown

### Security
- [ ] Non-root user in Docker
- [ ] Minimal base image (Alpine)
- [ ] No secrets in Docker image
- [ ] Read-only filesystem (where possible)
- [ ] Security scanning (Snyk, Trivy)

### Performance
- [ ] Resource limits configured (CPU, memory)
- [ ] Connection pooling (MongoDB, Redis)
- [ ] Caching strategy implemented
- [ ] CDN for static assets (if any)

### Deployment
- [ ] Blue-green deployment strategy
- [ ] Rollback procedure documented
- [ ] Database migration strategy
- [ ] Zero-downtime deployment tested
- [ ] Deployment runbook created

---

## Deployment Strategies

### 1. Blue-Green Deployment

**Concept:** Two identical environments (Blue = current, Green = new)

**Steps:**
```bash
# 1. Deploy new version to Green environment
kubectl apply -f k8s/deployment-green.yaml

# 2. Wait for Green to be healthy
kubectl wait --for=condition=ready pod -l version=green

# 3. Run smoke tests against Green
curl http://green.internal/api/v1/health

# 4. Switch traffic from Blue to Green (update service selector)
kubectl patch service educoin-backend -p '{"spec":{"selector":{"version":"green"}}}'

# 5. Monitor for errors (5-10 minutes)
kubectl logs -f -l version=green

# 6. If OK: Decommission Blue
# If ERRORS: Rollback to Blue
kubectl patch service educoin-backend -p '{"spec":{"selector":{"version":"blue"}}}'
```

**Pros:**
- Zero downtime
- Easy rollback
- Full testing before cutover

**Cons:**
- Requires 2x resources
- Complex routing

---

### 2. Rolling Update (Recommended for Kubernetes)

**Concept:** Gradually replace old pods with new ones

**Kubernetes Strategy:**
```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1        # Max 1 extra pod during update
      maxUnavailable: 0  # Keep all pods running
```

**Deployment:**
```bash
# Update image
kubectl set image deployment/educoin-backend \
  educoin-backend=ghcr.io/your-org/educoin-backend:v1.1.0

# Watch rollout
kubectl rollout status deployment/educoin-backend

# If issues, rollback
kubectl rollout undo deployment/educoin-backend
```

**Pros:**
- No downtime
- Automatic rollback on failure
- No extra resources needed

**Cons:**
- Gradual rollout (not instant)
- Mixed versions during rollout

---

### 3. Canary Deployment

**Concept:** Route small % of traffic to new version

**Istio/Nginx Configuration:**
```yaml
# Route 95% to v1.0, 5% to v1.1
apiVersion: v1
kind: Service
metadata:
  name: educoin-backend
spec:
  selector:
    app: educoin-backend
  # Use Istio VirtualService for traffic splitting
```

**Pros:**
- Minimal risk (5% of users affected)
- Real production testing
- Gradual rollout

**Cons:**
- Requires traffic management (Istio, Nginx)
- Complex monitoring

---

## Monitoring & Rollback

### Deployment Monitoring

**Metrics to Watch (First 10 Minutes):**
1. **Error Rate:** Should be <1%
2. **Response Time (p95):** Should be <500ms
3. **CPU/Memory:** Should be stable
4. **Health Check Status:** All passing
5. **Database Connection Pool:** Stable
6. **Active WebSocket Connections:** Stable

**Alert Thresholds:**
```yaml
# Prometheus alerts
- alert: HighErrorRate
  expr: rate(http_errors_total[5m]) > 0.05  # >5% errors
  for: 2m
  annotations:
    summary: "ROLLBACK REQUIRED"

- alert: HighResponseTime
  expr: histogram_quantile(0.95, http_duration_ms) > 1000
  for: 5m
  annotations:
    summary: "Performance degradation"
```

---

### Rollback Procedures

#### Docker Compose Rollback
```bash
# 1. Stop current container
docker stop educoin-backend

# 2. Run previous version
docker run -d \
  --name educoin-backend \
  ghcr.io/your-org/educoin-backend:v1.0.0-previous  # Specific version

# 3. Verify
curl http://localhost:5000/api/v1/health
```

#### Kubernetes Rollback
```bash
# View rollout history
kubectl rollout history deployment/educoin-backend

# Rollback to previous version
kubectl rollout undo deployment/educoin-backend

# Rollback to specific revision
kubectl rollout undo deployment/educoin-backend --to-revision=3

# Verify
kubectl get pods
kubectl logs -f deployment/educoin-backend
```

#### Database Migration Rollback
```bash
# If using migration tool (e.g., migrate)
npm run migrate:rollback

# Manual rollback (if needed)
mongosh
use educoin-backend
db.migrations.find().sort({version:-1}).limit(5)  # Find last migration
# Run down migration script
```

---

## Quick Start Commands

### Development
```bash
# Start with Docker Compose
docker-compose up -d

# Start without Docker
npm run dev
```

### Production
```bash
# Build image
docker build -t educoin-backend:latest .

# Run production
docker-compose -f docker-compose.prod.yml up -d

# Deploy to Kubernetes
kubectl apply -f k8s/
```

### Health Check
```bash
# Local
curl http://localhost:5000/api/v1/health

# Production
curl https://api.educoin.com/api/v1/health
```

---

## Conclusion

**Current State:** 🔴 **NOT DEPLOYMENT READY**

**Critical Missing:**
- Dockerfile
- docker-compose.yml
- Health check endpoint
- Environment configurations

**Time to Deployment Ready:** 1-2 days

**Recommended Actions:**
1. Create Dockerfile (2 hours)
2. Create docker-compose.yml (2 hours)
3. Add health check endpoint (1 hour)
4. Create .env files (1 hour)
5. Test deployment locally (2 hours)
6. Create deployment runbook (2 hours)

**Total Effort:** 10-12 hours

---

**Last Updated:** 2025-11-08
**Next Review:** After deployment infrastructure implementation
