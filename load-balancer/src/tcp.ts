import { LoadBalancer } from "./loadbalancer";
import { Request, Response } from 'express';
import net from 'net';
import { RuntimeError, SetupError } from "@shared/shared";
import { ConnectionPoolManager } from "@connection-pool/connection-pool";
import { getLogger } from "@shared/shared";

const logger = getLogger("TCPLoadBalancer");

export class TCPLoadBalancer implements LoadBalancer {
    private connectionPoolManger!: ConnectionPoolManager;
    private connectionId: number | undefined;

    constructor(protocol: string, hosts: string) {
        if (hosts !== undefined) {
            this.setupConnections(protocol, hosts.split(';'));
        } else {
            throw new SetupError("TCP hosts not set. eg. <host1>:<port>;<host2>:<port>", 500);
        }
    }

    private setupConnections(protocol: string, hosts: string[]) {
        this.connectionPoolManger = new ConnectionPoolManager(protocol, hosts);
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
            const host = this.roundRobin();
            await this.proxyRequest(req, host, res);
        } catch (error) {
            throw new RuntimeError("There was a problem resolving your request", 500);
        }
    }

    private roundRobin(): net.Socket {
        if (this.connectionId === undefined) {
            this.connectionId = 0;
        }
        const previousConnectionId: number = this.connectionId;
        while (!this.connectionPoolManger.connectionPool.connections[this.connectionId].available) {
            this.connectionId++;
            if (previousConnectionId === this.connectionId) {
                throw new RuntimeError("No available conneciton", 500);
            }
        }
        return this.connectionPoolManger.connectionPool.connections[this.connectionId].socket!;
    }

    private waitForData(host: net.Socket): Promise<Buffer> {
        return new Promise((resolve) => {
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