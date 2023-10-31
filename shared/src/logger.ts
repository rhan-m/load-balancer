import { createLogger, transports, format, Logger } from "winston";

export function getLogger(serviceName: string): Logger {
    return createLogger({
        transports: [new transports.Console()],
        format: format.combine(
        format.colorize(),
        format.timestamp(),
        format.printf(({ timestamp, level, message, service }) => {
            return `[${timestamp} - ${service}] ${level}: ${message}`;
        })
        ),
        defaultMeta: {
            service: serviceName,
        },
    })
};