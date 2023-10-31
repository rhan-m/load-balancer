import { LoadBalancer } from "./loadbalancer";
import { Request, Response } from 'express';
import { SetupError, RuntimeError } from "./customerror";

interface ConnectionInfo {
	host: string;
	id: number;
}

export class HTTPLoadBalancer implements LoadBalancer{
    private hostConnectionCounter = 0;
    private connections: ConnectionInfo[] = [];
    private candidateConnection: ConnectionInfo | undefined;

    constructor() {
        this.setupConnections();
    }

    async resolveRequest(req: Request, res: Response): Promise<void> {
        try {
            let host = this.roundRobin();
            await this.proxyRequest(res, req, host);
        } catch (error) {
            throw new RuntimeError("There was a problem resolving your request", 500);
        }
    }

    private hostToConnectionInfo(host: string): ConnectionInfo {
        return {
            host: host,
            id: this.hostConnectionCounter,
        }
    }

    private setupConnections() {
        if (process.env.HTTP_HOSTS !== undefined) {
            let hosts = process.env.HTTP_HOSTS.split(';');
            hosts.forEach(host => {
                this.connections.push(this.hostToConnectionInfo(host));
                this.hostConnectionCounter++;
            });
        } else {
            throw new SetupError("A host was not provided", 500);
        }
    }

    private roundRobin(): ConnectionInfo {
        if (this.candidateConnection === undefined || this.candidateConnection.id === this.connections.length - 1) {
            this.candidateConnection = this.connections[0];
        } else {
            this.candidateConnection = this.connections[this.candidateConnection.id + 1];
        }
        return this.candidateConnection;
    }

    async proxyRequest(res: Response, req: Request, host: ConnectionInfo): Promise<void> {
        const redirectUrl = `http://${host.host.toString()}${req.url.toString()}`;
        res.redirect(301, redirectUrl);
    }

}