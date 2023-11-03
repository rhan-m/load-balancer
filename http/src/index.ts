import express, { Request, Response } from "express";
import { router } from "./router";
import { getLogger } from "@shared/shared";
import net from 'net';
import { Socket } from "net";
const PORT = process.env.PORT;
const TCP_PORT: number = parseInt(process.env.TCP_PORT!);

const app = express();
const logger = getLogger("HTTP-Server");

const server = net.createServer((socket: Socket) => {
    logger.info("Client connected");

    socket.on("data", (data) => {
        const jsonData = JSON.parse(data.toString());
        const expressSocket = net.createConnection({ port: parseInt(PORT!) }, () => {
            expressSocket.write(`${jsonData['method']} ${jsonData['url']} HTTP/1.1\r\n`);
            Object.keys(jsonData['headers']).forEach((header) => {
                expressSocket.write(`${header}: ${jsonData['headers'][header]}\r\n`);
            });
            expressSocket.write('\r\n');
            expressSocket.write(JSON.stringify(jsonData['body']));
            expressSocket.end();
        });
        expressSocket.on('data', (data) => {
            socket.write(data);
        });
    });

    socket.on("end", () => {
        logger.info("Client disconnected");
    });

    socket.on("error", (error) => {
        logger.info(`Socket Error: ${error.message}`);
    });
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/', router);

app.listen(PORT, () => {
    logger.info(`Server is listening on port ${PORT}`);
});

server.listen(TCP_PORT, () => {
    logger.info(`TCP socket server is running on port: ${TCP_PORT}`);
});

app.use((req: Request, res: Response, next) => {
    logger.info(`Received ${req.method} request on ${req.url}`);
    next();
});