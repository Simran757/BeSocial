export interface ISamparkChatService {
    init(appId: string, secretKey: string): Promise<string>;
}
