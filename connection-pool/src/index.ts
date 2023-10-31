import { CronJob } from 'cron';
import { ConnectionPool } from './connectionpool';
import { TCPConnectionPool } from './tcp-connection';
import { HttpConnectionPool } from './http-connection';
import { getLogger } from '@shared/shared';
import 'dotenv/config';

const logger = getLogger('MainConnectionManager');

export class ConnectionPoolManager {
    connectionPool!: ConnectionPool;
    cronJob!: CronJob;

    constructor(protocol: string, hosts: string[]) {
        this.createConnectionPool(protocol, hosts);
        this.connectionPool.initiateConnections(hosts);
        this.createCronJob();
    }

    private createConnectionPool(protocol: string, hosts: string[]) {
        if (protocol.toLocaleLowerCase() === 'tcp') {
            this.connectionPool = new TCPConnectionPool(hosts);
        } else {
            this.connectionPool = new HttpConnectionPool(hosts);
        }
    }

    private createCronJob() {
        this.cronJob = new CronJob('0/30 * * * * *', async () => {
            try {
                logger.info("Cron Job started")
                await this.connectionPool.checkConnections();
            } catch (e) {
                logger.error(e);
            }
        });
    }

}