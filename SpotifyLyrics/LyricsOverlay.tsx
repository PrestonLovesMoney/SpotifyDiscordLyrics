import { React, useEffect, useState } from "@webpack/common";
import { SpotifyTrack } from "./types";
import { getLyricsForTrack } from "./LyricsFetcher";
import { startSyncEngine, SyncHandle } from "./SyncEngine";

interface Props {
    getTrack: () => SpotifyTrack | null;
    getPosition: () => number;
    getIsPlaying: () => boolean;
    subscribe: (cb: () => void) => () => void;
}

export function LyricsOverlay({ getTrack, getPosition, getIsPlaying, subscribe }: Props) {
    const [currentLine, setCurrentLine] = useState<string | null>(null);
    const [trackId, setTrackId] = useState<string | null>(null);
    const [noLyrics, setNoLyrics] = useState(false);

    useEffect(() => {
        let syncHandle: SyncHandle | null = null;
        let cancelled = false;

        async function loadForCurrentTrack() {
            const track = getTrack();
            if (!track) {
                setCurrentLine(null);
                setTrackId(null);
                return;
            }
            if (track.id === trackId) return;

            setTrackId(track.id);
            setCurrentLine(null);
            setNoLyrics(false);

            const lines = await getLyricsForTrack(track);
            if (cancelled) return;

            if (!lines || lines.length === 0) {
                setNoLyrics(true);
                return;
            }

            syncHandle?.stop();
            syncHandle = startSyncEngine(lines, getPosition, getIsPlaying, setCurrentLine);
        }

        loadForCurrentTrack();
        const unsub = subscribe(loadForCurrentTrack);

        return () => {
            cancelled = true;
            syncHandle?.stop();
            unsub();
        };
    }, [trackId]);

    if (!trackId) return null;

    return (
        <div className="spotify-lyrics-sync-overlay">
            {noLyrics ? (
                <span className="spotify-lyrics-sync-empty">Lyrics not found error :c</span>
            ) : (
                <span className="spotify-lyrics-sync-line">{currentLine ?? "…"}</span>
            )}
        </div>
    );
}