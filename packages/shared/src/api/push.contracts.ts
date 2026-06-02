export interface PushSubscribeRequest {
  subscription: {
    endpoint: string;
    expirationTime?: number | null;
    keys: Record<string, string>;
  };
  notificationTime: string; // "HH:MM"
  timezone: string; // IANA timezone
}

export interface PushUnsubscribeRequest {
  endpoint: string;
}

export interface PushTrackedRequest {
  endpoint: string;
  date: string; // "YYYY-MM-DD"
}

export interface VapidKeyResponse {
  publicKey: string;
}
