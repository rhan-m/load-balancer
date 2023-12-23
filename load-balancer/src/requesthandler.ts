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

export class RequestHandler {
    private loadBalancer: LoadBalancer;
    private cronJob!: CronJob;

    constructor() {
        this.loadBalancer = LoadBalancerService.getLoadBalancer();
        this.startCronJob();
    }

    private startCronJob() {
        if (resetRateTimer === undefined) {
            this.cronJob = new CronJob(`*/5 * * * * *`, async () => {
                try {
                    ipRates.clear();
                } catch (e) {
                    logger.error(e);
                }
            });
        } else {
            this.cronJob = new CronJob(`* */${Number(resetRateTimer)} * * * *`, async () => {
                try {
                    ipRates.clear();
                } catch (e) {
                    logger.error(e);
                }
            });
        }
        this.cronJob.start();
    }

    private isValidUrl(url: String): boolean {
        return url === '/'
    }

    private increaseRate(ip: string) {
        let ipRate = ipRates.get(ip);
        if (ipRate !== undefined) {
            ipRates.set(ip, ipRate + 1)
        } else {
            ipRates.set(ip, 1);
        }
    }

    private isRateExcedeed(ip: string): boolean {
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

    public async handleRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
        logger.info(`Received ${req.method} request on ${req.url}`);
        this.increaseRate(req.socket.remoteAddress!);

        if (this.isRateExcedeed(req.socket.remoteAddress!)) {
            res.status(TO_MANY_REQUESTS).send();
        } else if (!this.isValidUrl(req.url)) {
            res.status(PAGE_NOT_FOUND_STATUS).send();
        } else {
            await this.loadBalancer.resolveRequest(req, res);
            next();
        }
    }
}
