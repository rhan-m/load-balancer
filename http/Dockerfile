FROM node:20.9

WORKDIR /load-balancer

RUN corepack enable
RUN corepack prepare pnpm@8.9.0 --activate
COPY ../ ./

RUN pnpm install
RUN npm i -g ts-node
EXPOSE 8082
WORKDIR /load-balancer/http
CMD ["ts-node", "src/index.ts"]
