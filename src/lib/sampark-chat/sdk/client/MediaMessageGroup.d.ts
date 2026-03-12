import { GroupUser } from "./TextMessageGroup";
export type GroupFileUploadResponse = {
    fileId: string;
    originalName: string;
    size: number;
    mimeType: string;
    downloadUrl: string;
};
export type GroupFileInfo = {
    fileId: string;
    originalName: string;
    size: number;
    mimeType: string;
    uploadedBy?: string;
    uploadedAt?: string;
    downloadUrl: string;
};
export declare const GROUP_MESSAGE_TYPE: {
    readonly TEXT: "text";
    readonly FILE: "file";
    readonly IMAGE: "image";
    readonly VIDEO: "video";
    readonly AUDIO: "audio";
};
/**
 * MediaMessageGroup - A dedicated media message class for group chat.
 * Handles media messages (files, images, videos, audio) in group conversations.
 */
export declare class MediaMessageGroup {
    private receiverId;
    private file;
    private messageType;
    private receiverType;
    private id;
    private senderId;
    private senderName;
    private sentAt;
    private status;
    private text;
    private fileId;
    private fileInfo;
    private mentions;
    private replyToMessageId;
    private replyToUserId;
    private replyToText;
    private replyType;
    private sender;
    private attachmentUrl;
    data: {
        attachments?: Array<{
            url: string;
            mimeType: string;
            name: string;
            size: number;
        }>;
        url?: string;
    };
    constructor(receiverId: string, file: File, messageType: string, receiverType: string);
    getReceiverId(): string;
    getRoomId(): string;
    getFile(): File;
    getMessageType(): string;
    getReceiverType(): string;
    getId(): string;
    getSenderId(): string;
    getSenderName(): string;
    getSentAt(): string;
    getStatus(): string;
    getText(): string;
    getFileId(): string;
    getFileInfo(): GroupFileUploadResponse | null;
    getMentions(): any[];
    getReplyToMessageId(): string;
    getReplyToUserId(): string;
    getReplyToText(): string;
    getReplyType(): string;
    getSender(): GroupUser | null;
    getUrl(): string | null;
    setText(text: string): void;
    setMentions(mentions: any[]): void;
    setReplyToMessageId(id: string): void;
    setReplyToUserId(id: string): void;
    setReplyToText(text: string): void;
    setReplyType(type: string): void;
    _setId(id: string): void;
    _setSenderId(senderId: string): void;
    _setSenderName(senderName: string): void;
    _setSentAt(sentAt: string): void;
    _setStatus(status: string): void;
    _setText(text: string): void;
    _setMessageType(messageType: string): void;
    _setFileId(fileId: string): void;
    _setFileInfo(fileInfo: GroupFileUploadResponse | null): void;
    _setMentions(mentions: any[]): void;
    _setReplyToMessageId(id: string): void;
    _setReplyToUserId(id: string): void;
    _setReplyToText(text: string): void;
    _setReplyType(type: string): void;
    _setSender(sender: GroupUser): void;
    _setAttachmentUrl(url: string): void;
    _setFileInfoAndLoadUrl(fileInfo: GroupFileUploadResponse): Promise<void>;
}
/**
 * GroupMediaService - Handles file upload / download / info for group chat.
 * Uses uploadSource = 'group_chat' to distinguish from peer uploads.
 */
export declare class GroupMediaService {
    private static organizationId;
    private static applicationId;
    static setOrganizationId(orgId: string): void;
    static setApplicationId(appId: string): void;
    /**
     * Upload a file for a group chat message.
     */
    static uploadFile(file: File, roomId: string, userId: string, userName: string, messageId: string, uploadSource?: string): Promise<GroupFileUploadResponse>;
    /**
     * Download a file by fileId. Returns a Blob.
     */
    static downloadFile(fileId: string): Promise<Blob>;
    /**
     * Get file metadata by fileId.
     */
    static getFileInfo(fileId: string): Promise<GroupFileInfo>;
}
