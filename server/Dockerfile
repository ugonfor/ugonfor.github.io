FROM node:20-alpine

WORKDIR /app
COPY package.json ./package.json
COPY llm-proxy.mjs ./llm-proxy.mjs

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "llm-proxy.mjs"]
