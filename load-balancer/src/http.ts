import { LoadBalancer } from "./loadbalancer";
import { Request, Response } from 'express';
import { SetupError, RuntimeError } from "@shared/shared";
import { ConnectionPoolManager } from '@connection-pool/connection-pool';

export class HTTPLoadBalancer implements LoadBalancer{
    private connectionPoolManger!: ConnectionPoolManager;
    private connectionId: number | undefined;

    constructor(protocol: string) {
        this.setupConnections(protocol);
    }

    async resolveRequest(req: Request, res: Response): Promise<void> {
        try {
            let host = this.roundRobin();
            await this.proxyRequest(res, req, host);
        } catch (error) {
            throw new RuntimeError("There was a problem resolving your request", 500);
        }
    }

    private setupConnections(protocol: string) {
        if (process.env.HTTP_HOSTS !== undefined) {
            this.connectionPoolManger = new ConnectionPoolManager(protocol, process.env.HTTP_HOSTS.split(';'));
        } else {
            throw new SetupError("A host was not provided", 500);
        }
    }

    private roundRobin(): string {
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
        return this.connectionPoolManger.connectionPool.connections[this.connectionId].host 
        + ':' + this.connectionPoolManger.connectionPool.connections[this.connectionId].port;
    }

    async proxyRequest(res: Response, req: Request, host: string): Promise<void> {
        const redirectUrl = `http://${host}${req.url.toString()}`;
        res.redirect(301, redirectUrl);
    }

}