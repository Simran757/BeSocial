export declare class GetParticipantsRequest {
    request_id: string;
    timestamp: string;
    action: string;
    data: {
        room_id: string;
        organization_id: string;
    };
    constructor(roomId: string, organizationId: string);
}
