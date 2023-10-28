import express, { Request, Response } from 'express';
import 'dotenv/config';
import { LoadBalancer } from './loadbalancer';
import { TCPLoadBalancer } from './tcp';
import { HTTPLoadBalancer } from './http';

const PAGE_NOT_FOUND_STATUS = 404;
const PORT = process.env.PORT;
const protocol = process.env.PROTOCOL;

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
	console.log(`Load balancer listening on port ${PORT}`);
});

app.use(async (req: Request, res: Response, next) => {
	console.log(`Received ${req.method} request on ${req.url}`);
	if (!isValidUrl(req.url)) {
		res.status(PAGE_NOT_FOUND_STATUS).send();
	} else {
		await loadBalancer.resolveRequest(req, res);
		next();
	}
});

function isValidUrl(url: String) {
	return url === '/'
}


