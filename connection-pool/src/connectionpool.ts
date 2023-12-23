import { HashList } from './consistenthash';

export interface ConnectionPool {
    getConnections(): HashList;
    initiateConnections(hosts: string[]): Promise<void>;
    checkConnections(): Promise<void>;
}
