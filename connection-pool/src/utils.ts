import { ConnectionInfo } from "./connectionpool";
import { SetupError } from "@shared/shared";

export const parseHosts = (hosts: string[]) => {
    let connections: ConnectionInfo[] = [];
    let connectionId: number = 0;

    hosts.forEach(host => {
        let info = host.split(':');
        if (info.length > 1) {
            let parsedPort = Number.parseInt(info[1]);
            let parsedHost = info[0];
            connections.push(hostToConnectionInfo(parsedHost, parsedPort, connectionId));
            connectionId++;
        } else {
            throw new SetupError("The provided host is bad formatted, the correct format is: <host>:<port>", 500);
        }
    });
    return connections;
}

const hostToConnectionInfo = (parsedHost: string, parsedPort: number, connectionId: number) => {
    return {
        host: parsedHost,
        socket: undefined,
        id: connectionId,
        port: parsedPort,
        available: true
    }
};

