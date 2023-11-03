import { ConnectionPool, ConnectionInfo } from "./connectionpool";
import { parseHosts } from "./utils";
import net from 'net';

export class TCPConnectionPool implements ConnectionPool {
    connections: ConnectionInfo[] = [];

    constructor(hosts: string[]) {
        this.connections = parseHosts(hosts);
    }

    async initiateConnections(): Promise<void> {
        this.connections.forEach(connection => {
            connection.socket = net.createConnection(connection.port, connection.host, () => {		
            });
            if (connection.socket.writable) {
                connection.available = true;
            } else {
                connection.available = false;
            }
        });
    }

    async checkConnections(): Promise<void> {
        this.connections.forEach(connection => {
            if(connection.socket !== undefined && !connection.socket.writable) {
                connection.socket.destroy();
                connection.socket = net.createConnection(connection.port, connection.host, () => {		
                });
            }
        })
    }

}