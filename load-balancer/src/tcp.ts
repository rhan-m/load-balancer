import { LoadBalancer } from "./loadbalancer";
import { Request, Response } from 'express';
import net from 'net';
import { RuntimeError, SetupError } from "./customerror";

interface ConnectionInfo {
	host: string;
	netConnection: net.Socket | undefined;
	id: number;
	port: number
}

export class TCPLoadBalancer implements LoadBalancer {
    private hostConnectionCounter = 0;
    private connections: ConnectionInfo[] = [];
    private candidateConnection: ConnectionInfo | undefined; 

    constructor() {
        this.setupConnections();
    }

    private setupConnections() {
        this.parseHosts();
        this.establishConnections();

    }

    private hostToConnectionInfo(host: string, port: number): ConnectionInfo {
        return {
            host: host,
            netConnection: undefined,
            id: this.hostConnectionCounter,
            port: port
        }
    }

    private parseHosts() {
        if (process.env.TCP_HOSTS !== undefined) {
            let hosts = process.env.TCP_HOSTS.split(';');
            hosts.forEach(host => {
                let info = host.split(':');
                if (info.length > 1) {
                    let parsedPort = Number.parseInt(info[1]);
                    let parsedHost = info[0];
                    this.connections.push(this.hostToConnectionInfo(parsedHost, parsedPort));
                    this.hostConnectionCounter++;
                } else {
                    throw new SetupError("The provided host is bad formatted, the correct format is: <host>:<port>", 500);
                }
            });
        } else {
            throw new SetupError("A host was not provided", 500);
        }
    }

    private establishConnections() {
        this.connections.forEach(connection => {
            connection.netConnection = net.createConnection(connection.port, connection.host, () => {		
            });
        });
    }

    private async proxyRequest(req: Request, host: net.Socket) {
        host.write(JSON.stringify(this.parseRequest(req)));
        try {
            const data = await this.waitForData(host);
            req.socket.write(data);
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
        this.checkConnections();
        if (this.candidateConnection === undefined || this.candidateConnection.id === this.connections.length - 1) {
            this.candidateConnection = this.connections[0];
        } else {
            this.candidateConnection = this.connections[this.candidateConnection.id + 1];
        }
        if (this.candidateConnection.netConnection) {
            return this.candidateConnection.netConnection;
        } else {
            throw new RuntimeError("There are no available connections", 500);
        }
    }

    private checkConnections() {
        this.connections.forEach(connection => {
            if(connection.netConnection !== undefined && !connection.netConnection.writable) {
                connection.netConnection.destroy();
                connection.netConnection = net.createConnection(connection.port, connection.host, () => {		
                });
            }
        })
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