import express, { NextFunction, Request, Response } from 'express';
import 'dotenv/config';
import { LoadBalancer } from './loadbalancer';
import { TCPLoadBalancer } from './tcp';
import { HTTPLoadBalancer } from './http';
import { errorHandler } from './errorhandler';
import { SetupError, getLogger } from '@shared/shared';
import { ConnectionPoolManager } from '@connection-pool/connection-pool';

const PAGE_NOT_FOUND_STATUS = 404;
const PORT = process.env.PORT;
const protocol = process.env.PROTOCOL;

const logger = getLogger('main');
const app = express();

const loadBalancer: LoadBalancer = (() => {
	if (protocol === undefined) {
		throw new SetupError("Specify the protocol HTTP/TCP", 500);
	}

	if (process.env.HOSTS === undefined) {
		throw new SetupError("Setup the hosts eg: <host1>:<port1>;<hots2>:<port2>;...", 500);
	}

	const connectionPoolManager: ConnectionPoolManager = new ConnectionPoolManager();
	connectionPoolManager.init(protocol, process.env.HOSTS.split(';'));
	if (protocol.toLowerCase() === 'tcp') {
		return new TCPLoadBalancer(connectionPoolManager);
	} else {
		return new HTTPLoadBalancer(connectionPoolManager);
	}
})();


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.listen(PORT, () => {
	logger.info(`Load balancer listening on port ${PORT}`);
});

app.use(async (req: Request, res: Response, next:NextFunction,) => {
	logger.info(`Received ${req.method} request on ${req.url}`);
	if (!isValidUrl(req.url)) {
		res.status(PAGE_NOT_FOUND_STATUS).send();
	} else {
		await loadBalancer.resolveRequest(req, res);
		next();
	}
});

app.use(errorHandler);

function isValidUrl(url: String) {
	return url === '/'
}


