import './tcp'
import { TCPLoadBalancer } from './tcp';
import { describe } from 'node:test';
import { Request, Response } from 'express';
import { GenericContainer } from 'testcontainers';

const mockedRequest: Request = {
    body: { key: 'value' },
    url: "/",
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
} as unknown as Request;

const mockedResponse: Response = {

} as unknown as Response;

const mockedProtocol: string = "TCP";

const startTcpServerInContainer = async () => {
    const container = await new GenericContainer('http-server:1.0')
        .withExposedPorts(8082)
        .start();

    const host = container.getHost();
    const port = container.getMappedPort(8082);

    return { host, port, stopContainer: async () => await container.stop() };
};

describe('TCPLoadBalancer', () => {
    describe('on resolve request', () => {
        it('resolveRequest method should be called', async () => {
            let tcpServer = await startTcpServerInContainer();
            const mockedHosts: string = tcpServer.host + ":" + tcpServer.port;
            const mockedTCPLoadBalancer = new TCPLoadBalancer(mockedProtocol, mockedHosts);

            mockedTCPLoadBalancer.resolveRequest = jest.fn();
            const resolveRequestSpy = jest.spyOn(mockedTCPLoadBalancer, 'resolveRequest');
  
            await mockedTCPLoadBalancer.resolveRequest(mockedRequest, mockedResponse);
            expect(resolveRequestSpy).toHaveBeenCalled();
            tcpServer.stopContainer();
        });
    });
});
