# Stage 1: Build Next.js (node_modules from host)
FROM node:22-slim AS builder
WORKDIR /app
COPY . .
RUN npm run build

# Stage 2: Production runtime (minimal image)
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=7101
ENV HOSTNAME="0.0.0.0"

# Install LibreOffice Writer (headless) for DOCX → PDF conversion
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      libreoffice-writer-nogui \
      fonts-liberation \
      fonts-dejavu-core && \
    rm -rf /var/lib/apt/lists/*

# Copy standalone server + static assets
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Excel template files needed at runtime
COPY --from=builder /app/template.xlsx ./
COPY --from=builder /app/absensi.xlsx ./
COPY --from=builder /app/employe.xlsx ./

# Create data and uploads directories (will be overlaid by volumes)
RUN mkdir -p /app/data /app/public/uploads

EXPOSE 7101

CMD ["node", "server.js"]
