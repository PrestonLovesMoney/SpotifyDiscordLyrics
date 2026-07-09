import { net } from "electron";

export async function fetchLyrics(_: any, url: string): Promise<string | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
        const response = await net.fetch(url, { signal: controller.signal });
        if (!response.ok) return null;
        return await response.text();
    } catch (e) {
        console.error("[SpotifyLyricsSync/native] fetch error", e);
        return null;
    } finally {
        clearTimeout(timeout);
    }
}