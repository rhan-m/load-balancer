export class BaseError extends Error {
    public statusCode: number;
    constructor(message: string, statusCode: number) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode || 500;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class SetupError extends BaseError {
    constructor(message: string, statusCode: number) {
        super(message, statusCode);
    }
}

export class RuntimeError extends BaseError {
    constructor(message: string, statusCode: number) {
        super(message, statusCode);
    }
}