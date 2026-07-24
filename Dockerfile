# Stage 1: Install dependencies
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

# Stage 2: Build the Next.js application
FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Production runtime (minimal image)
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=7101
ENV HOSTNAME="0.0.0.0"

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
