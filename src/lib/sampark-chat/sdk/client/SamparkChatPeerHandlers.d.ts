import TextMessage from './TextMessage';
declare const handlers: {
    TextMessage: typeof TextMessage;
    addPeerMessageListener: (id: string, listener: any) => void;
    removePeerMessageListener: (id: string) => void;
    addGroupMessageListener: (id: string, listener: any) => void;
    removeGroupMessageListener: (id: string) => void;
};
export default handlers;
