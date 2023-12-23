import * as sha256 from "js-sha256";
import net from 'net';

class HashNode {
    private next: HashNode | undefined;
    private socket: net.Socket | undefined;
    private hashValue: string;
    private host: string;

    public constructor(host: string) {
        this.host = host;
        this.hashValue = sha256.sha256(host);
    }

    public setSocket(socket: net.Socket) {
        this.socket = socket;
    }

    public getSocket() {
        return this.socket;
    }

    public setNext(node: HashNode | undefined) {
        this.next = node;
    }

    public hasNext() {
        return this.next != undefined;
    }

    public getNext(): HashNode | undefined {
        return this.next;
    }

    public getHashValue() {
        return this.hashValue;
    }

    public getHost() {
        return this.host;
    }
}

export class HashList {
    private head: HashNode | undefined;
    private lenght: number = 0;

    public getHead(): HashNode | undefined {
        return this.head;
    }

    public getLenght(): number {
        return this.lenght;
    }

    public printList() {
        let dummyHead = this.head;
        while (dummyHead) {
            console.log(dummyHead);
            dummyHead = dummyHead.getNext();
        }
    }

    public getHost(host: string): HashNode | undefined {
        let dummyHead = this.head;
        while (dummyHead) {
            if (dummyHead.getHost() === host) {
                return dummyHead;
            }
            dummyHead = dummyHead.getNext();
        }
        return undefined;
    }

    public hostExists(host: string): boolean {
        let dummyHead = this.head;
        while (dummyHead) {
            if (dummyHead.getHost() === host) {
                return true;
            }
            dummyHead = dummyHead.getNext();
        }
        return false;
    }

    public findServer(ip: string): HashNode | undefined {
        let dummyHead = this.head;

        if (!dummyHead) {
            return undefined;
        }
        const ipHash = sha256.sha256(ip);
        while(dummyHead) {
            if (ipHash <= dummyHead.getHashValue()) {
                return dummyHead;
            }
            dummyHead = dummyHead.getNext();
        }
        return this.head;
    }

    public addNode(host: string): HashNode {
        let newNode: HashNode = new HashNode(host);
        let dummyHead: HashNode | undefined = this.head;
        let prev: HashNode | undefined = undefined;

        if (dummyHead == undefined) {
            this.head = newNode;
            this.lenght += 1;
            return this.head;
        }

        while (dummyHead) {
            if (dummyHead.getHashValue() < newNode.getHashValue()) {
                if (dummyHead.hasNext()) {
                    prev = dummyHead;
                    dummyHead = dummyHead.getNext();
                } else {
                    dummyHead.setNext(newNode);
                    this.lenght += 1;
                    return this.head!;
                }
            } else {
                newNode.setNext(dummyHead);
                if (prev !== undefined) {
                    prev.setNext(newNode);
                } else {
                    this.head = newNode;
                }
                this.lenght += 1;
                return this.head!;
            }
        }
        this.lenght += 1;
        return this.head!;
    }

    public removeNode(host: String): HashNode | undefined {
        let dummyHead: HashNode | undefined = this.head;
        let prev: HashNode | undefined = undefined;

        if (dummyHead == undefined) {
            return undefined;
        }

        if (dummyHead.getHost() === host) {
            if (!dummyHead.hasNext()) {
                this.head = undefined;
            } else {
                this.head = this.head?.getNext();
            }
            this.lenght -= 1;
            return dummyHead;
        }

        while (dummyHead) {
            if (dummyHead.getHost() === host) {
                prev?.setNext(dummyHead.getNext());
                dummyHead.setNext(undefined);
                this.lenght -= 1;
                return dummyHead;
            } else {
                if (dummyHead.hasNext()) {
                    prev = dummyHead;
                    dummyHead = dummyHead.getNext();
                } else {
                    return undefined;
                }
            }
        }
    }
}
