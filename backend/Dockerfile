FROM node:20-alpine

WORKDIR /app

# Cài dependencies trước (tận dụng Docker layer cache)
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Tạo thư mục cần thiết
RUN mkdir -p uploads logs

# Không chạy với root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 && \
    chown -R nodeuser:nodejs /app

USER nodeuser

EXPOSE 5001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:5001/health || exit 1

CMD ["node", "src/server.js"]
