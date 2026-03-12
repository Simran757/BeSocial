export declare class GetRoomsByUserIdRequest {
    request_id: string;
    timestamp: string;
    action: string;
    data: {
        user_id: string;
        organization_id: string;
        application_id: string;
    };
    constructor(userId: string, organizationId: string, applicationId: string);
}
