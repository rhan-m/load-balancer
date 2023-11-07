import { LoadBalancer } from "./loadbalancer";
import { Request, Response } from 'express';
import { RuntimeError } from "@shared/shared";
import { ConnectionPoolManager } from '@connection-pool/connection-pool';
import * as http from 'http'
import { getLogger } from "@shared/shared";

const logger = getLogger('HTTP - LoadBalancer');
const getOptions = ((host: string, path: string) => {
    const hostDetails = host.split(':');
    return {
        hostname: hostDetails[0],
        port: hostDetails[1],
        path: path,
        method: 'GET',
        headers: {
            'Connection': 'keep-alive',
        }
    }
}
);

export class HTTPLoadBalancer implements LoadBalancer {
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
        if (this.connectionId === undefined || this.connectionId === this.connectionPoolManger.connectionPool.getConnections().length - 1) {
            this.connectionId = 0;
        } else {
            this.connectionId++;
        }
        const previousConnectionId: number = this.connectionId;

        while (!this.connectionPoolManger.connectionPool.getConnections()[this.connectionId].available) {
            if (this.connectionId === this.connectionPoolManger.connectionPool.getConnections().length - 1) {
                this.connectionId = 0;
            } else {
                this.connectionId++;
            }
            if (previousConnectionId === this.connectionId) {
                throw new RuntimeError("No available conneciton", 500);
            }
        }
        return this.connectionPoolManger.connectionPool.getConnections()[this.connectionId].host
            + ':' + this.connectionPoolManger.connectionPool.getConnections()[this.connectionId].port;
    }

    async handleGetRequest(host: string, url: string): Promise<{ data: Buffer[], status: number }> {
        return new Promise((resolve, reject) => {
            const req = http.get(getOptions(host, url), res => {
                let data: Buffer[] = [];

                res.on('data', chunk => {
                    data.push(chunk);
                });

                res.on('end', () => {
                    resolve({ data, status: res.statusCode as number });
                });
            });

            req.on('error', err => {
                reject(err);
            });
        });
    }

    async proxyRequest(res: Response, req: Request, host: string): Promise<void> {
        try {
            switch (req.method.toLowerCase()) {
                case 'post':
                    break;
                default:
                    const { data, status } = await this.handleGetRequest(host, req.url);
                    const response = Buffer.concat(data).toString();
                    res.status(status || 200).send(response);
            }
        } catch (error) {
            logger.error(error);
            res.status(500).send('Internal Server Error');
        }
    }

}