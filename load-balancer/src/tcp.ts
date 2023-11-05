import { LoadBalancer } from "./loadbalancer";
import { Request, Response } from 'express';
import { RuntimeError } from "@shared/shared";
import { ConnectionPoolManager } from "@connection-pool/connection-pool";
import { getLogger } from "@shared/shared";
import net from 'net';

const logger = getLogger("TCPLoadBalancer");

export class TCPLoadBalancer implements LoadBalancer {
    private connectionPoolManger: ConnectionPoolManager;
    private connectionId: number | undefined;

    constructor(connectionPoolManager: ConnectionPoolManager) {
        this.connectionPoolManger = connectionPoolManager;
    }

    private async proxyRequest(req: Request, host: net.Socket, res: Response) {
        host.write(JSON.stringify(this.parseRequest(req)));
        try {
            const data = await this.waitForData(host);
            this.parseResponse(data.toString(), res);
        } catch (error) {
            throw new RuntimeError("There was a problem proxying your request", 500);
        }
    }

    async resolveRequest(req: Request, res: Response): Promise<void> {
        try {
            const host = this.roundRobin(req.socket.remoteAddress);
            await this.proxyRequest(req, host, res);
        } catch (error) {
            throw new RuntimeError("There was a problem resolving your request", 500);
        }
    }

    private roundRobin(reqIp: string | undefined): net.Socket {
        this.connectionId = Math.abs(this.hashCode(reqIp) % this.connectionPoolManger.connectionPool.getConnections().length);

        if (!this.connectionPoolManger.connectionPool.getConnections()[this.connectionId].available) {
            let newConnectionId = 0;
            while (!this.connectionPoolManger.connectionPool.getConnections()[newConnectionId].available) {
                newConnectionId++;
                if (newConnectionId > this.connectionPoolManger.connectionPool.getConnections().length) {
                    throw new RuntimeError("No available conneciton", 500);
                }
            }
            this.connectionId = newConnectionId;
        }

        return this.connectionPoolManger.connectionPool.getConnections()[this.connectionId].socket!;
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

    private waitForData(host: net.Socket): Promise<Buffer> {
        return new Promise((resolve) => {
            //TODO: buffered read
            host.on('data', (data) => {
                resolve(data);
            });
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