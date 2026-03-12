import { Socket } from "socket.io-client";
import TextMessage, { User } from "./TextMessage";
import { ReactionData } from "../types/Message";
import { BlockedUsersRequestBuilder, BlockedUsersRequest } from "../builder/BlockedUsersRequest";
import { MediaMessage, MESSAGE_TYPE, FileUploadResponse, FileInfo } from "./MediaMessage";
import { MessagesRequest, MessagesRequestBuilder } from "../builder/fetchPeerMessageBuilder";
export { MediaMessage, MESSAGE_TYPE, FileUploadResponse, FileInfo };
export declare class TypingIndicator {
    private receiverId;
    private receiverType;
    private sender?;
    constructor(receiverId: string, receiverType: string);
    getReceiver(): string;
    getReceiverType(): string;
    getSender(): User | undefined;
    _setSender(sender: User): void;
}
type PeerListener = {
    onTextMessageReceived?: (textMessage: TextMessage) => void;
    onMediaMessageReceived?: (mediaMessage: MediaMessage) => void;
    onMessageReactionAdded?: (reactionData: ReactionData) => void;
    onMessageReactionRemoved?: (reactionData: ReactionData) => void;
    onMessageEdited?: (textMessage: TextMessage) => void;
    onMessageDeleted?: (textMessage: TextMessage) => void;
    onTypingStarted?: (typingIndicator: TypingIndicator) => void;
    onTypingEnded?: (typingIndicator: TypingIndicator) => void;
    onUserBlocked?: (blockData: {
        room_id: string;
        blocker_user_id: string;
        blocked_user_id: string;
        blocked_at: string;
    }) => void;
    onUserUnblocked?: (unblockData: {
        room_id: string;
        blocker_user_id: string;
        blocked_user_id: string;
        unblocked_at: string;
    }) => void;
};
export type UserListener = {
    onUserOnline?: (onlineUser: User) => void;
    onUserOffline?: (offlineUser: User) => void;
};
declare class PeerChat {
    private static organizationId;
    private static applicationId;
    private static userId;
    private static userName;
    private static socket;
    private static currentRoomId;
    private static currentPeerId;
    private static listeners;
    private static userListeners;
    private static onlineUsers;
    static setOrganizationId(orgId: string): void;
    static setApplicationId(appId: string): void;
    static setUserId(userId: string): void;
    static setUserName(userName: string): void;
    static setSocket(socket: Socket): void;
    static addUserListener(listenerId: string, listener: UserListener): void;
    static removeUserListener(listenerId: string): void;
    static getOnlineUsers(organizationId?: string): string[];
    static notifyUserOnline(): void;
    private static joinRoom;
    static joinroom(peerId: string): string | undefined;
    static sendMessage(textMessage: TextMessage): Promise<TextMessage>;
    static addMessageListener(id: string, listener: PeerListener): void;
    static removeMessageListener(id: string): void;
    static addReaction(messageId: string, emojiId: string, roomId?: string, emojiType?: string): void;
    static removeReaction(messageId: string, emojiId: string, roomId?: string): void;
    static sendmessage(textMessage: TextMessage): Promise<TextMessage>;
    static isFileMessage(message: TextMessage): boolean;
    static getMessageFileInfo(message: TextMessage): any | null;
    static getMessageType(message: TextMessage): string;
    static MESSAGE_TYPE: {
        readonly TEXT: "text";
        readonly FILE: "file";
        readonly IMAGE: "image";
        readonly VIDEO: "video";
        readonly AUDIO: "audio";
    };
    static RECEIVER_TYPE: {
        readonly USER: "user";
        readonly PEER: "user";
        readonly GROUP: "group";
    };
    static MessagesRequestBuilder: typeof MessagesRequestBuilder;
    static MessagesRequest: typeof MessagesRequest;
    static sendMediaMessage(mediaMessage: MediaMessage): Promise<MediaMessage>;
    static uploadFile(file: File, roomId: string, userId: string, userName: string, messageId: string, uploadSource?: string): Promise<FileUploadResponse>;
    static downloadFile(fileId: string): Promise<Blob>;
    static getFileInfo(fileId: string): Promise<FileInfo>;
    static editMessage(textMessage: TextMessage): Promise<TextMessage>;
    static deleteMessage(messageId: string, scope?: 'me' | 'everyone', receiverId?: string): Promise<TextMessage>;
    static deleteConversation(UID: string, type: "user"): Promise<{
        room_id: string;
        user_id: string;
        deleted_at: string;
    }>;
    static startTyping(typingNotification: TypingIndicator): void;
    static endTyping(typingNotification: TypingIndicator): void;
    static getapplictionuserlist(): Promise<any[]>;
    static fetchPreviousMessages(peerId: string, options?: {
        limit?: number;
        page?: number;
        includeDeleted?: boolean;
        parentMessageId?: string | null;
        hideReplies?: boolean;
    }): Promise<{
        messages: TextMessage[];
        currentPage: number;
        totalPages: number;
        totalChats: number;
    }>;
    static blockUsers(usersList: string[], roomId?: string): Promise<{
        [key: string]: "success" | "fail";
    }>;
    static unblockUsers(usersList: string[], roomId?: string): Promise<{
        [key: string]: "success" | "fail";
    }>;
}
export { MessagesRequestBuilder, MessagesRequest } from "../builder/fetchPeerMessageBuilder";
export { BlockedUsersRequestBuilder, BlockedUsersRequest };
export default PeerChat;
