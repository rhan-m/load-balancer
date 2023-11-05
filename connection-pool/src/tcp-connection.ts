import { ConnectionPool, ConnectionInfo } from "./connectionpool";
import { parseHosts } from "./utils";
import { getLogger } from "@shared/shared";
import net from 'net';

const logger = getLogger('TCP-ConnectionPool');

export class TCPConnectionPool implements ConnectionPool {
    connections: ConnectionInfo[] = [];

    constructor(hosts: string[]) {
        this.connections = parseHosts(hosts);
    }

    getConnections(): ConnectionInfo[] {
        return this.connections;
    }

    async initiateConnections(): Promise<void> {
        this.connections.forEach(connection => {
            try {
                connection.socket = net.createConnection(connection.port, connection.host, () => {		
                });
                connection.available = connection.socket.writable;
                connection.socket.on('error', (error) => {
                    logger.error(error);
                    connection.available = false;
                });
            } catch (e) {
                logger.error(e);
            }
        });
    }

    async checkConnections(): Promise<void> {
        this.connections.forEach(connection => {
            if (connection.socket !== undefined && !connection.socket.writable) {
                try {
                    connection.socket.destroy();
                    connection.socket = net.createConnection(connection.port, connection.host, () => {                    
                    });
                    connection.available = connection.socket.writable;
                    connection.socket.on('error', (error) => {
                        logger.error(error);
                        connection.available = false;
                    });
                    connection.socket.on('close', () => {
                        connection.available = false;
                    });
                    connection.socket.on('end', () => {
                        connection.available = false;
                    });
                } catch (e) {
                    logger.error(e);
                }
            }
        });
    }
    

}