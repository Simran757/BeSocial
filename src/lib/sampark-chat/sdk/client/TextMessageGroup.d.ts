/**
 * TextMessageGroup - A dedicated message class for group chat messages.
 * Separate from TextMessage (peer) to handle group-specific fields like mentions, fileInfo, messageType etc.
 */
export declare class GroupUser {
    uid: string;
    name: string;
    avatar?: string;
    status?: string;
    metadata?: Record<string, any>;
    constructor(uid: string, name: string);
    getUid(): string;
    getName(): string;
    getAvatar(): string | undefined;
    getStatus(): string | undefined;
    getMetadata(): Record<string, any> | undefined;
    setAvatar(avatar: string): void;
    setStatus(status: string): void;
    setMetadata(metadata: Record<string, any>): void;
}
export type GroupFileInfo = {
    fileId: string;
    originalName: string;
    size: number;
    mimeType: string;
    downloadUrl: string;
};
declare class TextMessageGroup {
    private id;
    private roomId;
    private text;
    private senderId;
    private senderName;
    private sentAt;
    private status;
    private messageType;
    private mentions;
    private replyToMessageId;
    private replyToUserId;
    private replyToText;
    private replyType;
    private fileId;
    private fileInfo;
    private editedAt;
    private editedBy;
    private deletedAt;
    private deletedBy;
    private sender;
    constructor(roomId: string, text: string);
    getId(): string;
    getRoomId(): string;
    getText(): string;
    getSenderId(): string;
    getSenderName(): string;
    getSentAt(): string;
    getStatus(): string;
    getMessageType(): string;
    getMentions(): any[];
    getReplyToMessageId(): string;
    getReplyToUserId(): string;
    getReplyToText(): string;
    getReplyType(): string;
    getFileId(): string;
    getFileInfo(): GroupFileInfo | null;
    getEditedAt(): string;
    getEditedBy(): string;
    getDeletedAt(): string;
    getDeletedBy(): string;
    getSender(): GroupUser | null;
    setText(text: string): void;
    setMentions(mentions: any[]): void;
    setReplyToMessageId(replyToMessageId: string): void;
    setReplyToUserId(replyToUserId: string): void;
    setReplyToText(replyToText: string): void;
    setReplyType(replyType: string): void;
    setFileId(fileId: string): void;
    _setId(id: string): void;
    _setRoomId(roomId: string): void;
    _setSenderId(senderId: string): void;
    _setSenderName(senderName: string): void;
    _setSentAt(sentAt: string): void;
    _setStatus(status: string): void;
    _setMessageType(messageType: string): void;
    _setMentions(mentions: any[]): void;
    _setReplyToMessageId(replyToMessageId: string): void;
    _setReplyToUserId(replyToUserId: string): void;
    _setReplyToText(replyToText: string): void;
    _setReplyType(replyType: string): void;
    _setFileId(fileId: string): void;
    _setFileInfo(fileInfo: GroupFileInfo | null): void;
    _setEditedAt(editedAt: string): void;
    _setEditedBy(editedBy: string): void;
    _setDeletedAt(deletedAt: string): void;
    _setDeletedBy(deletedBy: string): void;
    _setSender(sender: GroupUser): void;
}
export default TextMessageGroup;
