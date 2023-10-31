import { ConnectionPool, ConnectionInfo } from "./connectionpool";
import { parseHosts } from "./utils";
import axios from 'axios';

export class HttpConnectionPool implements ConnectionPool {
    connections: ConnectionInfo[] = [];

    constructor(hosts: string[]) {
        this.connections = parseHosts(hosts);
    }

    async initiateConnections(): Promise<void> {
        this.connections.forEach(async connection => {
            const response = await axios.get(`http://${connection.host}:${connection.port}/health`);
            if (response.status === 200) {
                connection.available = true;
            } else {
                connection.available = false;
            }
        })
    }

    async checkConnections(): Promise<void> {
        this.initiateConnections();
    }
}