import { LoadBalancer } from "./loadbalancer";
import { Request, Response } from 'express';
import net from 'net';
import { RuntimeError, SetupError } from "@shared/shared";
import { ConnectionPoolManager } from "@connection-pool/connection-pool";
import { getLogger } from "./logger";

const logger = getLogger("TCPLoadBalancer");

export class TCPLoadBalancer implements LoadBalancer {
    private connectionPoolManger!: ConnectionPoolManager;
    private connectionId: number | undefined;

    constructor(protocol: string) {
        if (process.env.TCP_HOSTS !== undefined) {
            this.setupConnections(protocol, process.env.TCP_HOSTS.split(';'));
        } else {
            throw new SetupError("TCP hosts not set. eg. <host1>:<port>;<host2>:<port>", 500);
        }
    }

    private setupConnections(protocol: string, hosts: string[]) {
        this.connectionPoolManger = new ConnectionPoolManager(protocol, hosts);
    }

    private async proxyRequest(req: Request, host: net.Socket) {
        host.setKeepAlive(true, 60000);
        host.write(JSON.stringify(this.parseRequest(req)));
        try {
            const data = await this.waitForData(host);
            req.socket.write(data);
            logger.info("Received data on TCP");
        } catch (error) {
            throw new RuntimeError("There was a problem proxying your request", 500);
        }
    }

    async resolveRequest(req: Request, res: Response): Promise<void> {
        try {
            const host = this.roundRobin();
            await this.proxyRequest(req, host);
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

    private waitForData(client: net.Socket): Promise<Buffer> {
        return new Promise((resolve) => {
            client.on('data', (data) => {
                resolve(data);
            });
        });
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