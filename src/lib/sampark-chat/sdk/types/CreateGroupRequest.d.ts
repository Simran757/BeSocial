import Group from "../client/Group";
export declare class CreateGroupRequest {
    request_id: string;
    timestamp: string;
    action: string;
    group_name: string;
    application_id: string;
    data: {
        admin_id: string;
        user_id: string;
        room_type: string;
        participants: Array<{
            user_id: string;
            user_name: string;
        }>;
        is_protected: boolean;
        password?: string;
    };
    constructor(group: Group, adminId: string, adminName: string, organizationId: string, applicationId: string);
}
