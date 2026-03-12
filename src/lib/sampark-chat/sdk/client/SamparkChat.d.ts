import { Socket } from "socket.io-client";
import GroupChat, { GroupReactionRequestBuilder, GroupReactionRequest } from "./GroupChat";
import { GroupMembersRequestBuilder, GroupMembersRequest } from "../builder/groupmemberrequestbuilder";
import { BannedMembersRequestBuilder, BannedMembersRequest } from "../builder/BannedMembersRequest";
import { GroupMessagesRequestBuilder, GroupMessagesRequest } from "../builder/fetchGroupMessageBuilder";
import PeerChat, { BlockedUsersRequestBuilder, BlockedUsersRequest, MediaMessage, TypingIndicator } from "./PeerChat";
import TextMessage from "./TextMessage";
import TextMessageGroup from "./TextMessageGroup";
import { MediaMessageGroup } from "./MediaMessageGroup";
import Group from "./Group";
import GroupMember from "./GroupMember";
type User = {
    id: string;
    name: string;
};
type LoginListener = {
    loginSuccess?: (user: User) => void;
    loginFailure?: (error: any) => void;
    logoutSuccess?: () => void;
    logoutFailure?: (error: any) => void;
};
type PeerMessageListener = Parameters<typeof PeerChat.addMessageListener>[1];
type GroupMessageListener = Parameters<typeof GroupChat.addMessageListener>[1];
type UserListener = Parameters<typeof PeerChat.addUserListener>[1];
declare class SamparkChat {
    private static socket;
    private static initialized;
    private static organizationId;
    private static applicationId;
    private static currentUser;
    private static renewToken;
    private static loginListeners;
    static addLoginListener(listenerID: string, listener: LoginListener): void;
    static removeLoginListener(listenerID: string): void;
    private static notifyLoginSuccess;
    private static notifyLoginFailure;
    private static notifyLogoutSuccess;
    private static notifyLogoutFailure;
    static init(appId: string, secretKey: string): Promise<{
        organizationId: string;
        applicationId: string;
    }>;
    static login(userId: string): Promise<User>;
    static getLoggedinUser(): Promise<User | null>;
    static TextMessage: typeof TextMessage;
    static TextMessageGroup: typeof TextMessageGroup;
    static MediaMessage: typeof MediaMessage;
    static MediaMessageGroup: typeof MediaMessageGroup;
    static GROUP_MESSAGE_TYPE: {
        readonly TEXT: "text";
        readonly FILE: "file";
        readonly IMAGE: "image";
        readonly VIDEO: "video";
        readonly AUDIO: "audio";
    };
    static GroupChat: typeof GroupChat;
    static PeerChat: typeof PeerChat;
    static RECEIVER_TYPE: {
        readonly USER: "user";
        readonly PEER: "user";
        readonly GROUP: "group";
    };
    static MESSAGE_TYPE: {
        readonly TEXT: "text";
        readonly FILE: "file";
        readonly IMAGE: "image";
        readonly VIDEO: "video";
        readonly AUDIO: "audio";
    };
    static GROUP_TYPE: {
        readonly PUBLIC: "public";
        readonly PRIVATE: "private";
        readonly PASSWORD: "password";
    };
    static GROUP_MEMBER_SCOPE: {
        readonly ADMIN: "Admin";
        readonly MODERATOR: "Moderator";
        readonly PARTICIPANT: "Participant";
        readonly OWNER: "Owner";
    };
    static Group: typeof Group;
    static GroupMember: typeof GroupMember;
    static GroupMessagesRequestBuilder: typeof GroupMessagesRequestBuilder;
    static GroupMessagesRequest: typeof GroupMessagesRequest;
    static GroupReactionRequestBuilder: typeof GroupReactionRequestBuilder;
    static GroupReactionRequest: typeof GroupReactionRequest;
    static GroupMembersRequestBuilder: typeof GroupMembersRequestBuilder;
    static GroupMembersRequest: typeof GroupMembersRequest;
    static BlockedUsersRequestBuilder: typeof BlockedUsersRequestBuilder;
    static BlockedUsersRequest: typeof BlockedUsersRequest;
    static BannedMembersRequestBuilder: typeof BannedMembersRequestBuilder;
    static BannedMembersRequest: typeof BannedMembersRequest;
    static TypingIndicator: typeof TypingIndicator;
    static startTyping(typingNotification: TypingIndicator): void;
    static endTyping(typingNotification: TypingIndicator): void;
    static addPeerMessageListener(listenerID: string, listener: PeerMessageListener): void;
    static removePeerMessageListener(listenerID: string): void;
    static addGroupMessageListener(listenerID: string, listener: GroupMessageListener): void;
    static removeGroupMessageListener(listenerID: string): void;
    static addUserListener(listenerID: string, listener: UserListener): void;
    static removeUserListener(listenerID: string): void;
    static getOnlineUsers(organizationId?: string): string[];
    static renewSession(): Promise<boolean>;
    static getSocket(): Socket | null;
    static blockUsers(usersList: string[]): Promise<{
        [key: string]: "success" | "fail";
    }>;
    static unblockUsers(usersList: string[]): Promise<{
        [key: string]: "success" | "fail";
    }>;
    static updateGroupMemberScope(guid: string, uid: string, newScope: string): Promise<{
        success: boolean;
        room_id: string;
        target_user_id: string;
        new_role: string;
        updated_by: string;
    }>;
}
export default SamparkChat;
