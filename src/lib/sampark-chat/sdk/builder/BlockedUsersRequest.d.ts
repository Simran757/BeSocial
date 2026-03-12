import { User } from "../client/TextMessage";
export declare class BlockedUsersRequestBuilder {
    private limit;
    private direction;
    setLimit(limit: number): BlockedUsersRequestBuilder;
    setDirection(direction: "BLOCKED_BY_ME" | "HAS_BLOCKED_ME" | "BOTH"): BlockedUsersRequestBuilder;
    build(): BlockedUsersRequest;
}
export declare class BlockedUsersRequest {
    private limit;
    private direction;
    private page;
    private hasMore;
    private isDestroyed;
    static directions: {
        BLOCKED_BY_ME: "BLOCKED_BY_ME";
        HAS_BLOCKED_ME: "HAS_BLOCKED_ME";
        BOTH: "BOTH";
    };
    constructor(limit: number, direction: "BLOCKED_BY_ME" | "HAS_BLOCKED_ME" | "BOTH");
    fetchNext(): Promise<User[]>;
    /**
     * Check if more blocked users are available
     */
    hasMoreUsers(): boolean;
    /**
     * Reset pagination to start from beginning
     */
    reset(): void;
    /**
     * Get current page number
     */
    getCurrentPage(): number;
    /**
     * Get direction filter
     */
    getDirection(): string;
    /**
     * Destroy the request instance
     */
    destroy(): void;
}
