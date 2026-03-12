import TextMessage from "../client/TextMessage";
export declare class GroupMessagesRequestBuilder {
    private guid;
    private limit;
    private page;
    private includeDeleted;
    private userGroupStatus;
    private userGroupUpdatedAt;
    private password;
    setGUID(guid: string): GroupMessagesRequestBuilder;
    setLimit(limit: number): GroupMessagesRequestBuilder;
    setPage(page: number): GroupMessagesRequestBuilder;
    setIncludeDeleted(include: boolean): GroupMessagesRequestBuilder;
    setUserGroupStatus(status: string): GroupMessagesRequestBuilder;
    setUserGroupUpdatedAt(timestamp: string): GroupMessagesRequestBuilder;
    setPassword(password: string): GroupMessagesRequestBuilder;
    build(): GroupMessagesRequest;
}
export declare class GroupMessagesRequest {
    private guid;
    private limit;
    private currentPage;
    private includeDeleted;
    private userGroupStatus;
    private userGroupUpdatedAt;
    private password;
    private hasMore;
    private fetchFunction;
    constructor(guid: string, limit: number, page: number, includeDeleted: boolean, userGroupStatus: string, userGroupUpdatedAt: string, password: string, fetchFunction?: any);
    fetchPrevious(): Promise<TextMessage[]>;
    hasMoreMessages(): boolean;
    reset(): void;
}
