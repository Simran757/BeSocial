import { User } from "./TextMessage";
export type FileUploadResponse = {
    fileId: string;
    originalName: string;
    size: number;
    mimeType: string;
    downloadUrl: string;
};
export type FileInfo = {
    fileId: string;
    originalName: string;
    size: number;
    mimeType: string;
    uploadedBy?: string;
    uploadedAt?: string;
    downloadUrl: string;
};
export declare const MESSAGE_TYPE: {
    readonly TEXT: "text";
    readonly FILE: "file";
    readonly IMAGE: "image";
    readonly VIDEO: "video";
    readonly AUDIO: "audio";
};
/**
 * MediaMessage class following CometChat pattern
 * Handles media messages (files, images, videos, audio)
 */
export declare class MediaMessage {
    private receiverId;
    private file;
    private messageType;
    private receiverType;
    private id;
    private senderId;
    private senderName;
    private sentAt;
    private status;
    private fileInfo;
    private parentMessageId?;
    private replyToUserId?;
    private replyToText?;
    private replyType?;
    private sender?;
    private receiver?;
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
    getFile(): File;
    getMessageType(): string;
    getReceiverType(): string;
    getId(): string;
    getSenderId(): string;
    getSenderName(): string;
    getSentAt(): string;
    getStatus(): string;
    getFileInfo(): FileUploadResponse | null;
    getParentMessageId(): string | undefined;
    getReplyToUserId(): string | undefined;
    getReplyToText(): string | undefined;
    getReplyType(): string | undefined;
    getSender(): User | undefined;
    getReceiver(): User | undefined;
    getUrl(): string | null;
    _setId(id: string): void;
    _setSenderId(senderId: string): void;
    _setSenderName(senderName: string): void;
    _setSentAt(sentAt: string): void;
    _setStatus(status: string): void;
    _setParentMessageId(parentMessageId: string): void;
    _setReplyToUserId(replyToUserId: string): void;
    _setReplyToText(replyToText: string): void;
    _setReplyType(replyType: string): void;
    _setSender(sender: User): void;
    _setReceiver(receiver: User): void;
    _setFileInfoAndLoadUrl(fileInfo: FileUploadResponse): Promise<void>;
    _setFileInfo(fileInfo: FileUploadResponse): void;
}
export declare class MediaService {
    private static organizationId;
    private static applicationId;
    static setOrganizationId(orgId: string): void;
    static setApplicationId(appId: string): void;
    static uploadFile(file: File, roomId: string, userId: string, userName: string, messageId: string, // Required by backend uploadFile endpoint
    uploadSource?: string): Promise<FileUploadResponse>;
    static downloadFile(fileId: string): Promise<Blob>;
    static getFileInfo(fileId: string): Promise<FileInfo>;
}
