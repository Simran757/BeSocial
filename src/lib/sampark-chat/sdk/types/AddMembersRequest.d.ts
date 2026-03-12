import GroupMember from "../client/GroupMember";
export declare class AddMembersRequest {
    request_id: string;
    timestamp: string;
    action: string;
    data: {
        room_id: string;
        organization_id: string;
        group_name: string;
        participants: Array<{
            user_id: string;
            user_name: string;
        }>;
        user_role: string;
    };
    constructor(roomId: string, organizationId: string, members: GroupMember[], defaultRole: string, groupName?: string);
}
