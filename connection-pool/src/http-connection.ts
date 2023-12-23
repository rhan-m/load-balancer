import { ConnectionPool } from "./connectionpool";
import { HashList } from "./consistenthash";
import { validHost } from "./utils";
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
        },
        agent: new http.Agent({ keepAlive: true }),
    }
});

export class HttpConnectionPool implements ConnectionPool {
    private connections: HashList;
    private hosts: string[];

    constructor(hosts: string[]) {
        this.hosts = hosts;
        this.connections = new HashList();
        hosts.forEach(host => {
            if (validHost(host)) {
                this.connections.addNode(host);
            }
        });
    }

    getConnections(): HashList {
        return this.connections;
    }

    async handleCheckConnection(host: string, port: number): Promise<{ status: number }> {
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
        this.hosts.forEach(async host => {
            try {
                let [ip, port] = host.split(":");
                const status = await this.handleCheckConnection(ip, Number(port));
                if (status.status === 200) {
                    if (!this.connections.hostExists(host)) {
                        this.connections.addNode(host);
                    }
                } else {
                    this.connections.removeNode(host);
                }
            } catch (e) {
                logger.error(e);
                this.connections.removeNode(host);
            }
        }); 
    }

    async checkConnections(): Promise<void> {
        this.initiateConnections();
    }
}