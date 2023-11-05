import { LoadBalancer } from "./loadbalancer";
import { Request, Response } from 'express';
import { RuntimeError } from "@shared/shared";
import { ConnectionPoolManager } from '@connection-pool/connection-pool';

export class HTTPLoadBalancer implements LoadBalancer{
    private connectionPoolManger!: ConnectionPoolManager;
    private connectionId: number | undefined;

    constructor(connectionPoolManager: ConnectionPoolManager) {
        this.connectionPoolManger = connectionPoolManager;
    }

    async resolveRequest(req: Request, res: Response): Promise<void> {
        try {
            let host = this.roundRobin();
            await this.proxyRequest(res, req, host);
        } catch (error) {
            throw new RuntimeError("There was a problem resolving your request", 500);
        }
    }

    private roundRobin(): string {
        if (this.connectionId === undefined) {
            this.connectionId = 0;
        }
        const previousConnectionId: number = this.connectionId;
        while (!this.connectionPoolManger.connectionPool.getConnections()[this.connectionId].available) {
            this.connectionId++;
            if (previousConnectionId === this.connectionId) {
                throw new RuntimeError("No available conneciton", 500);
            }
        }
        return this.connectionPoolManger.connectionPool.getConnections()[this.connectionId].host 
        + ':' + this.connectionPoolManger.connectionPool.getConnections()[this.connectionId].port;
    }

    async proxyRequest(res: Response, req: Request, host: string): Promise<void> {
        //TODO: replace redirect with request
        const redirectUrl = `http://${host}${req.url.toString()}`;
        res.redirect(301, redirectUrl);
    }

}