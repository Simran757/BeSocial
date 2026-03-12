export declare class ValidateApplicationUserRequest {
    request_id: string;
    timestamp: string;
    action: string;
    data: {
        organization_id: string;
        app_id: string;
        user_id: string;
    };
    constructor(organizationId: string, appId: string, userId: string);
}
