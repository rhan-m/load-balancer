import express, { Request, Response } from "express";
import { router } from "./router";
import net from 'net';

const PORT = process.env.PORT;
const TCP_PORT: number = parseInt(process.env.TCP_PORT!);

const app = express();

const server = net.createServer((socket) => {
    console.log("Client connected");

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
        socket.pipe(expressSocket);
        expressSocket.pipe(socket);
    });

    socket.on("end", () => {
        console.log("Client disconnected");
    });

    socket.on("error", (error) => {
        console.log(`Socket Error: ${error.message}`);
    });
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/', router);

app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});

server.listen(TCP_PORT, () => {
    console.log(`TCP socket server is running on port: ${TCP_PORT}`);
});

app.use((req: Request, res: Response, next) => {
    console.log(`Received ${req.method} request on ${req.url}`);
    next();
});