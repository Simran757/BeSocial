declare class GroupMember {
    private uid;
    private name?;
    private scope;
    constructor(uid: string, scope: string, name?: string);
    getUid(): string;
    getName(): string | undefined;
    getScope(): string;
    setName(name: string): void;
}
export default GroupMember;
