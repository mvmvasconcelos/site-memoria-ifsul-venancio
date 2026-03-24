# Multi-stage Dockerfile for Site Memória IFSul Venâncio Aires
# Stage 1: Build Tailwind CSS bundle using Node.js
# Stage 2: Runtime with Python Flask backend

# ============================================================================
# STAGE 1: BUILD - Tailwind CSS + PostCSS
# ============================================================================
FROM node:20-alpine AS builder

WORKDIR /build

# Copy package*.json files
COPY package.json package-lock.json* ./

# Install dependencies (use npm install instead of npm ci for flexibility)
RUN npm install --prefer-offline --no-audit --omit=optional

# Copy source files for Tailwind processing
COPY src/ ./src/
COPY *.html ./
COPY tailwind.config.js postcss.config.js ./

# Build Tailwind CSS bundle
# Output: dist/public.bundle.css
RUN npm run build

# ============================================================================
# STAGE 2: RUNTIME - Python Flask Backend
# ============================================================================
FROM python:3.11-alpine

WORKDIR /app

# Install runtime dependencies (minimal)
RUN apk add --no-cache bash curl

# Copy Python requirements and install
COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# Copy entire application
COPY . /app

# Copy pre-built CSS bundle from builder stage
COPY --from=builder /build/dist/public.bundle.css /app/src/css/public.bundle.css

# Environment configuration
ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=backend/run.py

EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/ || exit 1

CMD ["python", "backend/run.py"]
