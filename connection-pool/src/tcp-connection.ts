import { ConnectionPool } from "./connectionpool";
import { HashList } from "./consistenthash";
import { validHost } from "./utils";
import { getLogger } from "@shared/shared";
import net from 'net';

const logger = getLogger('TCP-ConnectionPool');

export class TCPConnectionPool implements ConnectionPool {
    connections: HashList;
    hosts: string[];

    constructor(hosts: string[]) {
        this.connections = new HashList();
        this.hosts = hosts;
        hosts.forEach(host => {
            if (validHost(host)) {
                this.connections.addNode(host);
            }
        });
    }

    getConnections(): HashList {
        return this.connections;
    }

    async initiateConnections(): Promise<void> {
        this.hosts.forEach(host => {
            let connectionHost = this.connections.findServer(host);
            if (connectionHost !== undefined) {
                let [ip, port] = host.split(":");
                try {
                    const connectionSocket = net.createConnection(Number(port), ip, () => {
                    });
                    connectionHost.setSocket(connectionSocket);
                    connectionHost.getSocket()?.on('error', (error) => {
                        logger.error(error);
                        this.connections.removeNode(host);
                    })
                } catch(e) {
                    logger.error(e);
                }

            }
        });
    }

    async checkConnections(): Promise<void> {
        this.hosts.forEach(host => {
            let connectionHost = this.connections.findServer(host);
            if (connectionHost && connectionHost.getSocket() && !connectionHost.getSocket()?.writable) {
                try {
                    connectionHost.getSocket()?.destroy();
                    let [ip, port] = host.split(":");
                    connectionHost.setSocket(net.createConnection(Number(port), ip, () => {
                    }));
                    connectionHost.getSocket()?.on('error', (error) => {
                        logger.error(error);
                        this.connections.removeNode(host);
                    });
                    connectionHost.getSocket()?.on('close', () => {
                        this.connections.removeNode(host);
                    });
                    connectionHost.getSocket()?.on('end', () => {
                        this.connections.removeNode(host);
                    });
                } catch (e) {
                    logger.error(e);
                }
            }
        });
    }
}