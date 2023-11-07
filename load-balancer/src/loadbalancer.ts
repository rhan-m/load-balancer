import { Request, Response } from 'express';
import { SetupError } from '@shared/shared';
import { ConnectionPoolManager } from '@connection-pool/connection-pool';
import { HTTPLoadBalancer } from './http';
import { TCPLoadBalancer } from './tcp';

export interface LoadBalancer {
    resolveRequest(req: Request, res: Response): Promise<void>;
}

const hosts = process.env.HOSTS;
const protocol = process.env.PROTOCOL;

export class LoadBalancerService {
    private static loadBalancer: LoadBalancer | undefined;

    public static getLoadBalancer(): LoadBalancer {
        if (this.loadBalancer === undefined) {
            if (protocol === undefined) {
                throw new SetupError("Specify the protocol HTTP/TCP", 500);
            }
            if (hosts === undefined) {
                throw new SetupError("Setup the hosts eg: <host1>:<port1>;<hots2>:<port2>;...", 500);
            }

            const connectionPoolManager: ConnectionPoolManager = new ConnectionPoolManager();
            connectionPoolManager.init(protocol, hosts.split(';'));
            if (protocol.toLowerCase() === 'tcp') {
                this.loadBalancer = new TCPLoadBalancer(connectionPoolManager);
                return this.loadBalancer;
            } else {
                this.loadBalancer = new HTTPLoadBalancer(connectionPoolManager);
                return this.loadBalancer;
            }
        } else {
            return this.loadBalancer;
        }
    }
}