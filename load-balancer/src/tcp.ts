import { LoadBalancer } from "./loadbalancer";
import { Request, Response } from 'express';
import { RuntimeError } from "@shared/shared";
import { ConnectionPoolManager } from "@connection-pool/connection-pool";
import { getLogger } from "@shared/shared";
import net from 'net';

const logger = getLogger("TCPLoadBalancer");

export class TCPLoadBalancer implements LoadBalancer {
    private connectionPoolManger: ConnectionPoolManager;

    constructor(connectionPoolManager: ConnectionPoolManager) {
        this.connectionPoolManger = connectionPoolManager;
    }

    private async proxyRequest(req: Request, host: net.Socket, res: Response) {
        host.write(JSON.stringify(this.parseRequest(req)) + '$$END$$');
        try {
            const data = await this.waitForData(host);
            this.parseResponse(data, res);
        } catch (error) {
            throw new RuntimeError("There was a problem proxying your request", 500);
        }
    }

    async resolveRequest(req: Request, res: Response): Promise<void> {
        try {
            const host = this.roundRobin(req.socket.remoteAddress);
            if (host !== undefined) {
                await this.proxyRequest(req, host, res);
            } else {
                throw new RuntimeError("There was a problem resolving your request", 500);
            }
        } catch (error) {
            throw new RuntimeError("There was a problem resolving your request", 500);
        }
    }

    private roundRobin(ip: string | undefined): net.Socket | undefined {
        if (ip !== undefined) {
            return this.connectionPoolManger.connectionPool.getConnections().findServer(ip)?.getSocket();
        }
    }

    private hashCode(str: string | undefined): number {
        if (str !== undefined) {
            let hash = 0;
            for (let i = 0; i < str.length; i++) { 
                hash = ((hash << 5) - hash) + str.charCodeAt(i); hash |= 0; 
            } 
            return hash; 
        }
        return 0;
    }

    private waitForData(host: net.Socket): Promise<string> {
        return new Promise((resolve) => {
            let dataBuffer: Buffer[] = [];
            host.on('data', (data) => {
                if (data.toString().includes("$$END$$")) {
                    resolve(Buffer.concat(dataBuffer).toString() + data.toString().replace("$$END$$", ''));
                }
            })
        });
    }

    private parseResponse(data: string, res: Response) {
        const [headersAndBody, responseBody] = data.split('\r\n\r\n');
        const headers = headersAndBody.split('\r\n');

        headers.forEach((header) => {
            const [name, value] = header.split(': ');
            if (name && value) {
                res.setHeader(name, value);
            }
        });

        const contentTypeHeader = headers.find(header => header.startsWith('Content-Type:'));
        if (contentTypeHeader) {
            const [, contentType] = contentTypeHeader.split(': ');
            if (contentType) {
                res.setHeader('Content-Type', contentType);
            }
        }
        res.send(responseBody);
        res.end();
    }

    private parseRequest(req: Request) {
        return {
            'body': req.body,
            'url': req.url,
            'method': req.method,
            'headers': req.headers
        }
    }
}