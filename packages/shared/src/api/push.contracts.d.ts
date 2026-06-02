export interface PushSubscribeRequest {
    subscription: PushSubscriptionJSON;
    notificationTime: string;
    timezone: string;
}
export interface PushUnsubscribeRequest {
    endpoint: string;
}
export interface PushTrackedRequest {
    endpoint: string;
    date: string;
}
export interface VapidKeyResponse {
    publicKey: string;
}
//# sourceMappingURL=push.contracts.d.ts.map