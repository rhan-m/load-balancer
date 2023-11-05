import './tcp'
import { TCPLoadBalancer } from './tcp';
import { describe } from 'node:test';
import { Request, Response } from 'express';
import { ConnectionPoolManager } from '@connection-pool/connection-pool';

const mockedRequest: Request = {
    body: { key: 'value' },
    url: "/",
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
} as unknown as Request;

const mockedResponse: Response = {

} as unknown as Response;

describe('TCPLoadBalancer', () => {
    describe('on resolve request', () => {
        it('resolveRequest method should be called', async () => {
            const mockedConnectionPoolManager = new ConnectionPoolManager();
            const mockedTCPLoadBalancer = new TCPLoadBalancer(mockedConnectionPoolManager);

            mockedConnectionPoolManager.init = jest.fn();
            mockedTCPLoadBalancer.resolveRequest = jest.fn();
            const resolveRequestSpy = jest.spyOn(mockedTCPLoadBalancer, 'resolveRequest');

            await mockedTCPLoadBalancer.resolveRequest(mockedRequest, mockedResponse);
            expect(resolveRequestSpy).toHaveBeenCalled();
        });
    });
});
