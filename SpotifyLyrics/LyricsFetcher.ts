import { LyricLine, SpotifyTrack } from "./types";

const cache = new Map<string, Promise<LyricLine[] | null>>();

export function getLyricsForTrack(track: SpotifyTrack): Promise<LyricLine[] | null> {
    const cached = cache.get(track.id);
    if (cached) return cached;

    const promise = fetchLyrics(track);
    cache.set(track.id, promise);
    return promise;
}

async function fetchLyrics(track: SpotifyTrack): Promise<LyricLine[] | null> {
    const artist = track.artists?.[0]?.name?.trim() ?? "";
    const title = track.name.trim();

    const exact = await tryGet(artist, title, track.duration);
    if (exact) return exact;

    return trySearch(artist, title);
}

async function tryGet(artist: string, title: string, duration: number): Promise<LyricLine[] | null> {
    const params = new URLSearchParams({
        artist_name: artist,
        track_name: title,
        duration: String(Math.round(duration / 1000))
    });
    const url = `https://lrclib.net/api/get?${params}`;

    const text = await fetchViaNative(url);
    if (!text) return null;

    try {
        const data = JSON.parse(text);
        return data.syncedLyrics ? parseLRC(data.syncedLyrics) : null;
    } catch (e) {
        console.error("[SpotifyLyricsSync] error /get", e);
        return null;
    }
}

async function trySearch(artist: string, title: string): Promise<LyricLine[] | null> {
    const params = new URLSearchParams({
        artist_name: artist,
        track_name: title
    });
    const url = `https://lrclib.net/api/search?${params}`;

    const text = await fetchViaNative(url);
    if (!text) return null;

    try {
        const results = JSON.parse(text);
        if (!Array.isArray(results) || results.length === 0) return null;

        const withSync = results.find((r: any) => r.syncedLyrics);
        return withSync ? parseLRC(withSync.syncedLyrics) : null;
    } catch (e) {
        console.error("[SpotifyLyricsSync] error /search", e);
        return null;
    }
}

async function fetchViaNative(url: string): Promise<string | null> {
    try {
        return await VencordNative.pluginHelpers.SpotifyLyricsSync.fetchLyrics(url);
    } catch (e) {
        console.error("[SpotifyLyricsSync] error native fetch", e);
        return null;
    }
}

function parseLRC(lrc: string): LyricLine[] {
    const lines: LyricLine[] = [];
    const re = /\[(\d+):(\d+(?:\.\d+)?)\](.*)/;

    for (const raw of lrc.split("\n")) {
        const match = raw.match(re);
        if (!match) continue;

        const [, min, sec, text] = match;
        const time = parseInt(min, 10) * 60_000 + parseFloat(sec) * 1000;
        const trimmed = text.trim();
        if (trimmed) lines.push({ time, text: trimmed });
    }

    return lines.sort((a, b) => a.time - b.time);
}