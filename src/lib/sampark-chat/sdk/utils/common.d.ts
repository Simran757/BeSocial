export declare const generatePeerRoomId: (organizationId: string, userOneId: string, userTwoId: string, applicationId: string) => string | undefined;
export declare const RECEIVER_TYPE: {
    readonly USER: "user";
    readonly PEER: "user";
    readonly GROUP: "group";
};
export type ReceiverType = typeof RECEIVER_TYPE.USER | typeof RECEIVER_TYPE.GROUP;
export declare const GROUP_TYPE: {
    readonly PUBLIC: "public";
    readonly PRIVATE: "private";
    readonly PASSWORD: "password";
};
export type GroupType = typeof GROUP_TYPE[keyof typeof GROUP_TYPE];
export declare const GROUP_MEMBER_SCOPE: {
    readonly ADMIN: "Admin";
    readonly MODERATOR: "Moderator";
    readonly PARTICIPANT: "Participant";
    readonly OWNER: "Owner";
};
