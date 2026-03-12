import { Socket } from "socket.io-client";
import { GroupType } from "../utils/common";
import TextMessageGroup, { GroupUser } from "./TextMessageGroup";
import { MediaMessageGroup, GroupFileUploadResponse } from "./MediaMessageGroup";
import Group from "./Group";
import GroupMember from "./GroupMember";
import { ReactionData } from "../types/Message";
export type GroupListener = {
    onGroupTextMessageReceived?: (textMessageGroup: TextMessageGroup) => void;
    onMediaMessageReceived?: (mediaMessageGroup: MediaMessageGroup) => void;
    onMessageReactionAdded?: (reactionData: ReactionData) => void;
    onMessageReactionRemoved?: (reactionData: ReactionData) => void;
    onMessageEdited?: (textMessageGroup: TextMessageGroup) => void;
    onMessageDeleted?: (textMessageGroup: TextMessageGroup) => void;
    onGroupMemberBanned?: (bannedUser: GroupUser, bannedBy: GroupUser, bannedFrom: Group, banReason?: string) => void;
    onGroupMemberUnbanned?: (unbannedUser: GroupUser, unbannedBy: GroupUser, unbannedFrom: Group, unbanReason?: string) => void;
    onGroupMemberScopeChanged?: (updatedUser: GroupUser, updatedBy: GroupUser, group: Group, newScope: string, oldScope: string) => void;
    onOwnershipTransferred?: (formerOwner: GroupUser, newOwner: GroupUser, group: Group, transferredAt: string) => void;
    onGroupDissolved?: (group: Group, ownerId: string, dissolvedAt: string) => void;
    onNewGroupCreated?: (roomId: string, groupName: string, organizationId: string, applicationId: string, adminId: string, userRole: string, participants: any[]) => void;
    onParticipantAdded?: (roomId: string, groupName: string, newParticipants: any[], addedBy: string, isCurrentUserAdded: boolean, currentUserRole?: string, allParticipants?: any[]) => void;
};
declare class GroupChat {
    static organizationId: string;
    static applicationId: string;
    static userId: string;
    static userName: string;
    static socket: Socket | null;
    static listeners: Map<string, GroupListener>;
    static currentRoomId: string | null;
    private static groupPasswords;
    private static bannedRooms;
    static setOrganizationId(orgId: string): void;
    static setApplicationId(appId: string): void;
    static setUserId(userId: string): void;
    static setUserName(userName: string): void;
    static setSocket(socket: Socket): void;
    static joinGroup(roomId: string, password?: string): Promise<string>;
    static sendGroupMessage(textMessageGroup: TextMessageGroup): Promise<TextMessageGroup>;
    static sendMediaMessage(mediaMessageGroup: MediaMessageGroup): Promise<MediaMessageGroup>;
    static receiveGroupMessage(): void;
    static addMessageListener(id: string, listener: GroupListener): void;
    static addGroupListener(id: string, listener: GroupListener): void;
    static removeMessageListener(id: string): void;
    static removeGroupListener(id: string): void;
    static addReaction(messageId: string, emojiId: string, roomId?: string, emojiType?: string): void;
    static removeReaction(messageId: string, emojiId: string, roomId?: string): void;
    static editMessage(textMessageGroup: TextMessageGroup): Promise<TextMessageGroup>;
    static deleteMessage(messageId: string, roomId: string, scope?: 'me' | 'everyone'): Promise<TextMessageGroup>;
    static createGroupWithMembers(group: Group, members: GroupMember[], banMembers?: string[]): Promise<Group>;
    static addParticipant(roomId: string, groupName: string, members: GroupMember[] | Array<{
        userId: string;
        userName?: string;
    }> | string[], userRole?: string): Promise<any>;
    static getgroups(): Promise<any[]>;
    static createGroup(groupOrName: Group | string, groupType?: GroupType, password?: string, memberUids?: string[], memberNames?: string[]): Promise<Group>;
    static addMembersToGroup(guid: string, membersList: GroupMember[], groupName?: string): Promise<{
        room_id: string;
        addedParticipants: string[];
        existingParticipants: string[];
        assignedRole: string;
        totalAdded: number;
        totalExisting: number;
        totalProcessed: number;
    }>;
    static leaveGroup(guid: string): Promise<{
        success: boolean;
        group_id: string;
    }>;
    static transferOwnershipAndLeave(guid: string, newOwnerUid: string): Promise<{
        success: boolean;
        room_id: string;
        former_owner_id: string;
        new_owner_id: string;
        transferred_at: string;
    }>;
    static ownerDeleteAndExitGroup(guid: string): Promise<{
        success: boolean;
        room_id: string;
        participants_removed: number;
        dissolved_at: string;
    }>;
    static kickGroupMember(guid: string, uid: string): Promise<{
        success: boolean;
        group_id: string;
        participant_id: string;
    }>;
    static banGroupMember(guid: string, uid: string, banReason?: string): Promise<{
        success: boolean;
        group_id: string;
        participant_id: string;
        banned_by: string;
        banned_at: string;
        ban_reason: string;
    }>;
    static unbanGroupMember(guid: string, uid: string, unbanReason?: string): Promise<{
        success: boolean;
        room_id: string;
        user_id: string;
        unbanned_by: string;
        unbanned_at: string;
        unban_reason: string;
    }>;
    static updateGroupMemberScope(guid: string, uid: string, newScope: string): Promise<{
        success: boolean;
        room_id: string;
        target_user_id: string;
        new_role: string;
        updated_by: string;
    }>;
    static Group: typeof Group;
    static GroupMember: typeof GroupMember;
    static GROUP_MEMBER_SCOPE: {
        readonly ADMIN: "Admin";
        readonly MODERATOR: "Moderator";
        readonly PARTICIPANT: "Participant";
        readonly OWNER: "Owner";
    };
    static uploadFile(file: File, roomId: string, userId: string, userName: string, messageId: string, uploadSource?: string): Promise<GroupFileUploadResponse>;
    static downloadFile(fileId: string): Promise<Blob>;
    static getFileInfo(fileId: string): Promise<any>;
    static getParticipant(roomId: string): Promise<any>;
    static fetchPreviousMessages(groupId: string, options?: {
        limit?: number;
        page?: number;
        includeDeleted?: boolean;
        userGroupStatus?: string;
        userGroupUpdatedAt?: string;
        password?: string;
    }): Promise<{
        messages: TextMessageGroup[];
        currentPage: number;
        totalPages: number;
        totalChats: number;
        participantGroupStatus?: string;
    }>;
    private static _verifyGroupPassword;
    static setGroupPassword(roomId: string, password: string): Promise<void>;
}
export { GroupMessagesRequestBuilder, GroupMessagesRequest } from "../builder/fetchGroupMessageBuilder";
export declare class GroupReactionRequestBuilder {
    private messageId;
    private limit;
    setMessageId(messageId: string): GroupReactionRequestBuilder;
    setLimit(limit: number): GroupReactionRequestBuilder;
    build(): GroupReactionRequest;
}
export declare class GroupReactionRequest {
    private messageId;
    private limit;
    constructor(messageId: string, limit: number);
    fetchNext(): Promise<any[]>;
    fetchPrevious(): Promise<any[]>;
}
export default GroupChat;
