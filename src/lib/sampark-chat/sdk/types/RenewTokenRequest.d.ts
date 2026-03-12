export declare class RenewTokenRequest {
    request_id: string;
    timestamp: string;
    action: string;
    data: {
        renew_token: string;
    };
    constructor(renewToken: string);
}
