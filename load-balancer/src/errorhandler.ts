import { SetupError, RuntimeError, BaseError } from './customerror';
import { exit } from 'process';
import { NextFunction, Request, Response } from 'express';
import { getLogger } from './logger';

const logger = getLogger('ErrorHandler');

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof BaseError) {
        if (err instanceof SetupError) {
            res.status((err).statusCode).send(err.message);
            exit(1);
        } else if (err instanceof RuntimeError) {
            res.status((err).statusCode).send(err.message);
        }
    } else {
		logger.error(err.stack);
		res.status(500).send('Something went wrong!');
	}
}