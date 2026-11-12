FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY workers/media/src/index.mjs ./worker/index.mjs
ENV NODE_ENV=production
CMD ["node", "/app/worker/index.mjs", "--interval=15000"]
