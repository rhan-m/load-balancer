import { Request, Response, Express } from 'express';
import 'dotenv/config';
import net from 'net';
import './loadbalancer'
import { LoadBalancer } from './loadbalancer';

export interface ConnectionInfo {
	host: string;
	netConnection: net.Socket;
	id: number;
	port: number;
}

export class TCPLoadBalancer implements LoadBalancer{
	private currentConnectionId = 0;
	private PORT = process.env.PORT;

	private connections: ConnectionInfo[] = [];
	private availableConnections: ConnectionInfo[] = [];
	private currentConnection: ConnectionInfo | undefined;

	constructor(app: Express) {
		this.setupListeners(app);
	}

	private setupListeners(app: Express): void {
		app.listen(this.PORT, () => {
			console.log(`Load balancer listening on port ${this.PORT}`);
			const hosts = process.env.TCP_HOSTS?.split(';')!;
			this.establishConnections(hosts);
		});
	}

	private waitForData(client: net.Socket): Promise<Buffer> {
		return new Promise((resolve) => {
			client.on('data', (data) => {
				resolve(data);
			});
		});
	}

	private parseRequest(req: Request): string {
		return JSON.stringify({
			body: req.body,
			url: req.url,
			method: req.method,
			headers: req.headers,
		});
	}

	private async proxyRequest(req: Request, client: net.Socket): Promise<void> {
		client.write(this.parseRequest(req));
		try {
			const data = await this.waitForData(client);
			req.socket.write(data);
		} catch (error) {
			console.log(error);
		}
	}

	private establishConnections(hosts: string[]): void {
		hosts.forEach((host) => {
			const info = host.split(':');
			const parsedPort = Number.parseInt(info[1]);
			const parsedHost = info[0];
			const connection = net.createConnection(parsedPort, parsedHost, () => {});
			this.connections.push({
				host: parsedHost,
				netConnection: connection,
				id: this.currentConnectionId,
				port: parsedPort,
			});
			this.currentConnectionId++;
		});
	}

	async resolveRequest(req: Request, res: Response): Promise<void> {
		try {
			const client = this.roundRobin();
			await this.proxyRequest(req, client);
		} catch (error) {
			console.log(error);
		}
	}

	private roundRobin(): net.Socket {
		this.checkConnections();
		if (this.currentConnection === undefined || this.currentConnection?.id === this.availableConnections.length - 1) {
			this.currentConnection = this.availableConnections[0];
		} else {			
			this.currentConnection = this.availableConnections[(this.currentConnection?.id || 0) + 1];
		}
		return this.currentConnection.netConnection;
	}

	private checkConnections(): void {
		this.availableConnections = [];
		this.connections.forEach((connection) => {
			if (!connection.netConnection.writable) {
				connection.netConnection.destroy();
				connection.netConnection = net.createConnection(
					connection.port,
					connection.host,
					() => {}
				);
			}
			this.availableConnections.push(connection);
		});
	}
}
