import { ConnectionPool, ConnectionInfo } from "./connectionpool";
import { parseHosts } from "./utils";
import { getLogger } from "@shared/shared";
import * as http from 'http';

const logger = getLogger('HTTP-ConnectionPool')
const getOptions = ((host: string, port: number) => {
    return {
        hostname: host,
        port: port,
        path: '/health',
        method: 'GET',
        headers: {
            'Connection': 'keep-alive',
        }
    }
});

export class HttpConnectionPool implements ConnectionPool {
    private connections: ConnectionInfo[] = [];

    constructor(hosts: string[]) {
        this.connections = parseHosts(hosts);
    }

    getConnections(): ConnectionInfo[] {
        return this.connections;
    }

    async handleCheckConnection(host: string, port: number): Promise<{status: number}> {
        return new Promise((resolve, reject) => {
            const req = http.get(getOptions(host, port), res => {
                let data: Buffer[] = [];
    
                res.on('data', chunk => {
                    data.push(chunk);
                });

                res.on('end', () => {
                    resolve({ status: res.statusCode as number });
                });
            });
            req.on('error', err => {
                reject(err);
            })
        })
    }

    async initiateConnections(): Promise<void> {
        this.connections.forEach(async connection => {
            try {
                const status = await this.handleCheckConnection(connection.host, connection.port);
                if (status.status === 200) {
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