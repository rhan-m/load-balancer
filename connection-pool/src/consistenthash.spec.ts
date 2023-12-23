import { HashList } from "./consistenthash";

describe('HashList', () => {
    let hashList: HashList;

    beforeEach(() => {
        hashList = new HashList();
    });

    it('should add a node to the list', () => {
        hashList.addNode('example.com');
        hashList.addNode('example2.com');
        hashList.addNode('example3.com');
        expect(hashList.getLenght() === 3);
    });

    it('should remove a node from the list', () => {
        hashList.addNode('example.com');
        hashList.addNode('example2.com');
        hashList.addNode('example3.com');
        const removedNode = hashList.removeNode('example2.com');
        expect(hashList.getLenght() === 2);
    });
});