/**
 * Error Handler for PeerChat SDK
 * Handles SDK initialization errors and socket error handling
 */
export interface SocketError {
    roomId?: string;
    messageId?: string;
    error: string;
}
export interface SDKValidationParams {
    socket: any;
    userId: string;
    organizationId: string;
    applicationId: string;
}
export interface ApiErrorResponse {
    status?: number;
    message?: string;
    error_code?: string;
    data?: any;
}
export interface ApiErrorResult {
    isError: boolean;
    isEmptyResult?: boolean;
    error?: Error;
    emptyResult?: {
        messages: any[];
        currentPage: number;
        totalPages: number;
        totalChats: number;
    };
}
export declare class PeerChatErrorHandler {
    /**
     * Common SDK initialization validation
     * Returns error message if validation fails, null if valid
     */
    static validateSDKInitialization(params: SDKValidationParams): string | null;
    /**
     * Handle socket connection errors
     */
    static handleSocketConnectionError(error: any, context: string): void;
    /**
     * Handle socket emit errors
     */
    static handleSocketEmitError(event: string, error: any, context: string): void;
    /**
     * Handle SDK initialization errors
     */
    static handleSDKInitializationError(error: string, context: string): Error;
    /**
     * Handle socket initialization errors
     */
    static handleSocketError(error: string, context: string): Error;
    /**
     * Handle socket error events from backend
     */
    static handleSocketErrorEvent(error: SocketError, context: string): void;
    /**
     * Validate required fields for operations
     */
    static validateRequiredFields(fields: Record<string, any>, requiredFields: string[], context: string): Error | null;
    /**
     * Handle room join errors
     */
    static handleRoomJoinError(error: string, roomId?: string): Error;
    /**
     * Handle message send errors
     */
    static handleMessageSendError(error: string, roomId?: string): Error;
    /**
     * Handle message receive errors
     */
    static handleMessageReceiveError(error: string, roomId?: string): void;
    /**
     * Handle message edit errors
     */
    static handleMessageEditError(error: SocketError, context?: string): void;
    /**
     * Handle API error responses with status codes
     * Returns structured result for handling different error scenarios
     */
    static handleApiErrorResponse(response: ApiErrorResponse, context?: string, defaultPage?: number): ApiErrorResult;
    /**
     * Handle axios error responses
     * Handles network errors, API errors, and other axios-specific errors
     */
    static handleAxiosError(error: any, context?: string, defaultPage?: number): ApiErrorResult;
}
