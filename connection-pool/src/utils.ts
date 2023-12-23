import { SetupError } from "@shared/shared";
const regex = /^([0-9a-fA-F:.]+):(\d+)$/;

export function validHost(host: string): boolean {
    if (regex.test(host)) {
        return true;
    } else {
        throw new SetupError("The provided host is bad formatted, the correct format is: <host>:<port>", 500);
    }
}
