import net from 'net';

export interface ConnectionInfo {
	host: string;
	socket: net.Socket | undefined;
	id: number;
	port: number;
    available: boolean;
}

export interface ConnectionPool {
    connections: ConnectionInfo[];
    initiateConnections(hosts: string[]): Promise<void>;
    checkConnections(): Promise<void>;
}
