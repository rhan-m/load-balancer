import express, { Router, Response, Request } from "express";
import 'dotenv/config';

export const router: Router = express.Router();
const OK_STATUS = 200;

router.get('/', (req: Request, res: Response) => {
    try {
        res.status(OK_STATUS).send(process.env.MESSAGE?.toString());
    } catch (error) {
        res.status(500).send('Internal Server Error');
    }
});
