import { NextFunction, Request, Response } from 'express';
import { LoadBalancer, LoadBalancerService } from './loadbalancer';
import { getLogger } from '@shared/shared';
import { CronJob } from 'cron';

const logger = getLogger('RequestHandler');
const PAGE_NOT_FOUND_STATUS = 404;
const TO_MANY_REQUESTS = 429;
const requestRate: string | undefined = process.env.REQUEST_RATE;
const ipRates = new Map<string, number>();
const resetRateTimer: string | undefined = process.env.RESET_RATE_TIMER;

const loadBalancer: LoadBalancer = LoadBalancerService.getLoadBalancer();

startCronJob();
export const handleRequest = (async (req: Request, res: Response, next:NextFunction) => {
    logger.info(`Received ${req.method} request on ${req.url}`);
    increaseRate(req.socket.remoteAddress!);
	if (!isValidUrl(req.url)) {
		res.status(PAGE_NOT_FOUND_STATUS).send();
	} else if (isRateExcedeed(req.socket.remoteAddress!)) {
		res.status(TO_MANY_REQUESTS).send();
    } else {
		await loadBalancer.resolveRequest(req, res);
		next();
	}
});

function isValidUrl(url: String) {
	return url === '/'
}

function increaseRate(ip: string): void {
    let ipRate = ipRates.get(ip);
    if (ipRate !== undefined) {
        ipRates.set(ip, ipRate + 1)
    } else {
        ipRates.set(ip, 1);
    }
}

function isRateExcedeed(ip: string): boolean {
    if (requestRate !== undefined) {
        const ipRate = ipRates.get(ip);
        if (ipRate === undefined) {
            return false;
        } else {
            return ipRate - 1 >= Number(requestRate);
        }
    }
    return false;
}

function startCronJob() {
    let cronJob: CronJob;
    if (resetRateTimer === undefined) {
        cronJob = new CronJob(`*/5 * * * * *`, async () => {
            try {
                ipRates.clear();
            } catch (e) {
                logger.error(e);
            }
        });
    } else {
        cronJob = new CronJob(`* */${Number(resetRateTimer)} * * * *`, async () => {
            try {
                ipRates.clear();
            } catch (e) {
                logger.error(e);
            }
        });
    }
    cronJob.start();
}