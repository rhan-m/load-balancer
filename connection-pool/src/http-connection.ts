import { ConnectionPool, ConnectionInfo } from "./connectionpool";
import { parseHosts } from "./utils";
import { getLogger } from "@shared/shared";
import axios from 'axios';

const logger = getLogger('HTTP-ConnectionPool')

export class HttpConnectionPool implements ConnectionPool {
    private connections: ConnectionInfo[] = [];

    constructor(hosts: string[]) {
        this.connections = parseHosts(hosts);
    }

    getConnections(): ConnectionInfo[] {
        return this.connections;
    }

    async initiateConnections(): Promise<void> {
        this.connections.forEach(async connection => {
            //TODO: replace axios
            try {
                const response = await axios.get(`http://${connection.host}:${connection.port}/health`);
                if (response.status === 200) {
                    connection.available = true;
                } else {
                    connection.available = false;
                }
            } catch(e) {
                logger.error(e);
                connection.available = false;
            }
        })
    }

    async checkConnections(): Promise<void> {
        this.initiateConnections();
    }
}