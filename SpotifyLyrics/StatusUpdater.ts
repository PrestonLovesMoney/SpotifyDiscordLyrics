import { RestAPI } from "@webpack/common";
import { STATUS_MIN_INTERVAL_MS, MAX_STATUS_LENGTH } from "./constants";

let lastSentAt = 0;
let lastSentText: string | null = null;
let pendingText: string | null = null;
let timeoutId: ReturnType<typeof setTimeout> | null = null;

async function sendStatus(text: string) {
    if (text === lastSentText) return;
    lastSentAt = Date.now();
    lastSentText = text;

    try {
        await RestAPI.patch({
            url: "/users/@me/settings",
            body: {
                custom_status: { text: text.slice(0, MAX_STATUS_LENGTH) }
            }
        });
    } catch (e) {
        console.error("[SpotifyLyricsSync] error sendStatus", e);
    }
}

export function queueStatusUpdate(text: string) {
    pendingText = text;

    const elapsed = Date.now() - lastSentAt;
    if (elapsed >= STATUS_MIN_INTERVAL_MS) {
        flush();
    } else if (!timeoutId) {
        timeoutId = setTimeout(flush, STATUS_MIN_INTERVAL_MS - elapsed);
    }
}

function flush() {
    timeoutId = null;
    if (pendingText !== null) {
        sendStatus(pendingText);
        pendingText = null;
    }
}

export async function clearStatus() {
    if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
    }
    pendingText = null;
    lastSentText = null;

    try {
        await RestAPI.patch({
            url: "/users/@me/settings",
            body: { custom_status: null }
        });
    } catch (e) {
        console.error("[SpotifyLyricsSync] error clearStatus", e);
    }
}