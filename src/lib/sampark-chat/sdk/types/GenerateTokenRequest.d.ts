export declare class GenerateTokenRequest {
    request_id: string;
    timestamp: string;
    action: string;
    data: {
        app_id: string;
        secret_key: string;
    };
    constructor(appId: string, secretKey: string);
}
