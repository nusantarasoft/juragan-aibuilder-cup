"use client";

import { App } from "antd";

/** Ant Design message API bound to App context (avoids static message theme warning). */
export function useAppMessage() {
    return App.useApp().message;
}
