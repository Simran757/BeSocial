import TextMessage from "../client/TextMessage";
export declare class MessagesRequestBuilder {
    private uid;
    private limit;
    private page;
    private includeDeleted;
    private parentMessageId;
    private hideReplies;
    setUID(uid: string): MessagesRequestBuilder;
    setLimit(limit: number): MessagesRequestBuilder;
    setPage(page: number): MessagesRequestBuilder;
    setIncludeDeleted(include: boolean): MessagesRequestBuilder;
    setParentMessageId(parentId: string): MessagesRequestBuilder;
    setHideReplies(hide: boolean): MessagesRequestBuilder;
    build(): MessagesRequest;
}
export declare class MessagesRequest {
    private uid;
    private limit;
    private currentPage;
    private includeDeleted;
    private parentMessageId;
    private hideReplies;
    private hasMore;
    constructor(uid: string, limit: number, page: number, includeDeleted: boolean, parentMessageId: string, hideReplies: boolean);
    fetchPrevious(): Promise<TextMessage[]>;
    hasMoreMessages(): boolean;
    reset(): void;
}
