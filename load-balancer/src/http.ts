import { Request, Response, Express } from 'express';
import 'dotenv/config';
import { LoadBalancer } from './loadbalancer';

interface ConnectionInfo {
    host: string,
    id: number;
}

export class HTTPLoadBalancer implements LoadBalancer {
    private PORT = process.env.PORT;
    private currentHost: ConnectionInfo | undefined;
    private hosts: string[] = [];
    private availableHosts: ConnectionInfo[] = [];
	private currentConnectionId = 0;

    constructor(app: Express) {
        this.setupHosts(app);
    }

    async resolveRequest(req: Request, res: Response): Promise<void> {
		try {
			let host: ConnectionInfo = this.roundRobin();
			await this.proxyRequest(req, res, host);
		} catch (error) {
			console.log(error);
		}
	}

    private roundRobin(): ConnectionInfo {
        if (this.currentHost === undefined || this.currentHost.id === this.availableHosts.length - 1) {
            this.currentHost = this.availableHosts[0];
        } else {
            this.currentHost = this.availableHosts[(this.currentHost?.id || 0) + 1]
        }
        return this.currentHost;
    }

    private async proxyRequest(req: Request, res: Response, host: ConnectionInfo) {
        res.setHeader('location', host.host + req.url);
        res.end();
    }

    private setupHosts(app: Express) {
        app.listen(this.PORT, () => {
            console.log(`Load balancer listening on port ${this.PORT}`);
        });

        this.hosts = process.env.HTTP_HOSTS?.split(';')!;
        this.hosts.forEach((host) => {
            let connectionInfo =  this.hostToConnectionInfo(host);
            this.currentConnectionId++;
            this.availableHosts.push(connectionInfo);
        });
    }

    private hostToConnectionInfo(host: string): ConnectionInfo {
        return {
            host: host,
            id: this.currentConnectionId,
        }
    }
}