import GroupMember from "../client/GroupMember";
export declare class BannedMembersRequestBuilder {
    private guid;
    private limit;
    constructor(guid?: string);
    setGUID(guid: string): BannedMembersRequestBuilder;
    setLimit(limit: number): BannedMembersRequestBuilder;
    build(): BannedMembersRequest;
}
export declare class BannedMembersRequest {
    private guid;
    private limit;
    private page;
    private hasMore;
    private isDestroyed;
    private cachedBannedMembers;
    constructor(guid: string, limit: number);
    fetchNext(): Promise<GroupMember[]>;
    /**
     * Alias for fetchNext — fetches the previous page (same data, for API compatibility)
     */
    fetchPrevious(): Promise<GroupMember[]>;
    /**
     * Check if more banned members are available to fetch
     */
    hasMoreMembers(): boolean;
    /**
     * Reset pagination to start from the beginning and clear cached data
     */
    reset(): void;
    /**
     * Get current page number
     */
    getCurrentPage(): number;
    /**
     * Get the GUID this request is for
     */
    getGUID(): string;
    /**
     * Destroy the request instance — prevents further use
     */
    destroy(): void;
}
