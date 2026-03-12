import GroupMember from "../client/GroupMember";
export declare class GroupMembersRequestBuilder {
    private guid;
    private limit;
    setGUID(guid: string): GroupMembersRequestBuilder;
    setLimit(limit: number): GroupMembersRequestBuilder;
    build(): GroupMembersRequest;
}
export declare class GroupMembersRequest {
    private guid;
    private limit;
    constructor(guid: string, limit: number);
    fetchNext(): Promise<GroupMember[]>;
    fetchPrevious(): Promise<GroupMember[]>;
}
