import { LoadBalancer } from "./loadbalancer";
import { Request, Response } from 'express';
import net from 'net';


interface ConnectionInfo {
	host: string;
	netConnection: net.Socket;
	id: number;
	port: number
}

export class TCPLoadBalancer implements LoadBalancer {
    private current_connection_id = 0;
    private connections: ConnectionInfo[] = [];
    private available_connections: ConnectionInfo[] = [];
    private current_connection: ConnectionInfo | undefined; 

    constructor() {
        this.setupConnections();
    }

    private setupConnections() {
        let hosts = process.env.TCP_HOSTS?.split(';')!;
        this.establishConnections(hosts);
    }

    private establishConnections(hosts: string[]) {
        hosts.forEach(host => {
            let info = host.split(':');
            let parsedPort = Number.parseInt(info[1]);
            let parsedHost = info[0];
            let connection = net.createConnection(parsedPort, parsedHost, () => {		
            });
            this.connections.push({
                host: parsedHost,
                netConnection: connection,
                id: this.current_connection_id,
                port: parsedPort
            });
            this.current_connection_id++;
        });
    }

    private async proxyRequest(req: Request, client: net.Socket) {
        client.write(JSON.stringify(this.parseRequest(req)));
        try {
            const data = await this.waitForData(client);
            req.socket.write(data);
        } catch (error) {
            console.log(error);
        }
    }
    
    
    async resolveRequest(req: Request, res: Response): Promise<void> {
        try {
            let client = this.roundRobin();
            await this.proxyRequest(req, client);
        } catch (error) {
            console.log(error);
        }
    }
    
    private roundRobin(): net.Socket {
        this.checkConnections();
        if (this.current_connection === undefined || this.current_connection.id === this.available_connections.length - 1) {
            this.current_connection = this.available_connections[0];
        } else {
            this.current_connection = this.available_connections[this.current_connection.id + 1];
        }
        return this.current_connection.netConnection;
    }
    
    private checkConnections() {
        this.available_connections = []
        this.connections.forEach(connection => {
            if(!connection.netConnection.writable) {
                connection.netConnection.destroy();
                connection.netConnection = net.createConnection(connection.port, connection.host, () => {		
                });
            }
            this.available_connections.push(connection);
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