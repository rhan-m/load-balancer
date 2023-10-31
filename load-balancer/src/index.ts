import express, { NextFunction, Request, Response } from 'express';
import 'dotenv/config';
import { LoadBalancer } from './loadbalancer';
import { TCPLoadBalancer } from './tcp';
import { HTTPLoadBalancer } from './http';
import { errorHandler } from './errorhandler';
import { getLogger } from './logger';


const PAGE_NOT_FOUND_STATUS = 404;
const PORT = process.env.PORT;
const protocol = process.env.PROTOCOL;
const logger = getLogger('main');

const loadBalancer: LoadBalancer = (() => {
	if (protocol?.toLowerCase() === 'tcp') {
		return new TCPLoadBalancer();
	} else {
		return new HTTPLoadBalancer();
	}
})();
const app = express();

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


