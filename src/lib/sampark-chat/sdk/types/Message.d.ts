export declare const RECEIVER_TYPE: {
    readonly USER: "user";
    readonly GROUP: "group";
};
export declare const MESSAGE_TYPE: {
    readonly TEXT: "text";
    readonly FILE: "file";
    readonly IMAGE: "image";
    readonly VIDEO: "video";
    readonly AUDIO: "audio";
};
export type ReceiverType = typeof RECEIVER_TYPE[keyof typeof RECEIVER_TYPE];
export type MessageType = typeof MESSAGE_TYPE[keyof typeof MESSAGE_TYPE];
export type ReactionData = {
    action: "react" | "unreact";
    roomId: string;
    messageId: string;
    userId: string;
    userName?: string;
    emojiId: string;
    emojiType?: string;
    reacted_at?: string;
};
export declare class BaseMessage {
    protected _receiverId: string;
    protected _receiverType: ReceiverType;
    protected _id?: string;
    protected _sentAt?: Date;
    protected _status?: string;
    constructor(receiverId: string, receiverType: ReceiverType);
    get receiverId(): string;
    get receiverType(): ReceiverType;
    get id(): string | undefined;
    set id(value: string | undefined);
    get sentAt(): Date | undefined;
    set sentAt(value: Date | undefined);
    get status(): string | undefined;
    set status(value: string | undefined);
}
export declare class TextMessage extends BaseMessage {
    private _text;
    private _type;
    /**
     * Create a text message
     * @param receiverId - The ID of the receiver (user or group)
     * @param text - The message text
     * @param receiverType - Type of receiver (RECEIVER_TYPE.USER or RECEIVER_TYPE.GROUP)
     */
    constructor(receiverId: string, text: string, receiverType: ReceiverType);
    get text(): string;
    get type(): 'text';
}
export declare class MediaMessage extends BaseMessage {
    private _file;
    private _messageType;
    /**
     * Create a media message (file, image, video, audio)
     * @param receiverId - The ID of the receiver (user or group)
     * @param file - The File object to send
     * @param messageType - Type of media (MESSAGE_TYPE.FILE, IMAGE, VIDEO, AUDIO)
     * @param receiverType - Type of receiver (RECEIVER_TYPE.USER or RECEIVER_TYPE.GROUP)
     */
    constructor(receiverId: string, file: File, messageType: MessageType, receiverType: ReceiverType);
    get file(): File;
    get messageType(): MessageType;
    get type(): MessageType;
    get fileName(): string;
    get fileSize(): number;
    get mimeType(): string;
}
export interface SentMessage {
    id: string;
    senderId: string;
    senderName: string;
    receiverId: string;
    text: string;
    type: MessageType | 'text';
    roomId: string;
    sentAt: string;
    status: string;
    fileInfo?: {
        fileId?: string;
        originalName: string;
        size: number;
        mimeType: string;
        url?: string;
    };
}
