// App-wide setting keys
export const SETTING_KEYS = {
    NOTIFICATION_EMAIL: 'notification_email',
} as const;

export type SettingKey = typeof SETTING_KEYS[keyof typeof SETTING_KEYS];
