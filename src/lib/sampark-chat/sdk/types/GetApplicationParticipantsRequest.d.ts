export declare class GetApplicationParticipantsRequest {
    request_id: string;
    timestamp: string;
    action: string;
    data: {
        organization_id: string;
        app_id: string;
    };
    constructor(organizationId: string, appId: string);
}
