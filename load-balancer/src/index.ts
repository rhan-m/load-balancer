import express, { NextFunction, Request, Response } from 'express';
import 'dotenv/config';
import { errorHandler } from './errorhandler';
import { getLogger } from '@shared/shared';
import { handleRequest } from './requesthandler';

const PORT = process.env.PORT;

const logger = getLogger('main');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.listen(PORT, () => {
	logger.info(`Load balancer listening on port ${PORT}`);
});

app.use(async (req: Request, res: Response, next:NextFunction) => {
	await handleRequest(req, res, next);
});
app.use(errorHandler);
