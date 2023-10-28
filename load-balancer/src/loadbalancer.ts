import { Request, Response} from 'express';

export interface LoadBalancer {
    resolveRequest(req: Request, res: Response): Promise<void>;
}
