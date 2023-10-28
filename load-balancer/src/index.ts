import { LoadBalancer } from './loadbalancer';
import { HTTPLoadBalancer } from './http';
import express, { Request, Response } from 'express';
import 'dotenv/config';
import { TCPLoadBalancer } from './tcp';

const PAGE_NOT_FOUND_STATUS = 404;

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const loadBalancer: LoadBalancer = (() => {
    var protocol = process.env.FORWARD_PROTOCOL;
    if (protocol?.toLocaleLowerCase() === 'tcp') {
        return new TCPLoadBalancer(app);
    } else {
        return new HTTPLoadBalancer(app);
    }
})();
console.log(loadBalancer)

app.use(async (req: Request, res: Response, next) => {
    console.log(`Received ${req.method} request on ${req.url}`);
    if (!isValidUrl(req.url)) {
        res.status(PAGE_NOT_FOUND_STATUS).send();
    } else {
        await resolveRequest(req, res);
        next();
    }
});

function isValidUrl(url: string): boolean {
    return url === '/';
}

async function resolveRequest(req: Request, res: Response): Promise<void> {
    loadBalancer.resolveRequest(req, res);
}