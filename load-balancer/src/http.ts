import { LoadBalancer } from "./loadbalancer";
import { Request, Response } from 'express';

interface ConnectionInfo {
	host: string;
	id: number;
}

export class HTTPLoadBalancer implements LoadBalancer{
    private current_connection_id = 0;
    private available_connections: ConnectionInfo[] = [];
    private current_connection: ConnectionInfo | undefined;

    constructor() {
        this.setupConnections();
    }

    async resolveRequest(req: Request, res: Response): Promise<void> {
        try {
            let host = this.roundRobin();
            await this.proxyRequest(res, req, host);
        } catch (error) {
            console.log(error);
        }
    }

    private hostToConnectionInfo(host: string): ConnectionInfo {
        return {
            host: host,
            id: this.current_connection_id,
        }
    }

    private setupConnections() {
        let hosts = process.env.HTTP_HOSTS?.split(';')!;
        hosts.forEach(host => {
            this.available_connections.push(this.hostToConnectionInfo(host));
            this.current_connection_id++;
        });
    }

    private roundRobin(): ConnectionInfo {
        if (this.current_connection === undefined || this.current_connection.id === this.available_connections.length - 1) {
            this.current_connection = this.available_connections[0];
        } else {
            this.current_connection = this.available_connections[this.current_connection.id + 1];
        }
        return this.current_connection;
    }

    async proxyRequest(res: Response, req: Request, host: ConnectionInfo): Promise<void> {
        const redirectUrl = `http://${host.host.toString()}${req.url.toString()}`;
        res.redirect(301, redirectUrl);
        console.log(redirectUrl)
        
    }

}