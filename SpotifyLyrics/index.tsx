import definePlugin from "@utils/types";
import { FluxDispatcher } from "@webpack/common";
import { SpotifyStore } from "../spotifyControls/SpotifyStore";
import { getLyricsForTrack } from "./LyricsFetcher";
import { startSyncEngine, SyncHandle } from "./SyncEngine";
import { queueStatusUpdate, clearStatus } from "./StatusUpdater";

let syncHandle: SyncHandle | null = null;
let currentTrackId: string | null = null;
let generation = 0;

async function handleTrackChange() {
    const track = SpotifyStore.track;

    if (!track) {
        generation++;
        syncHandle?.stop();
        syncHandle = null;
        currentTrackId = null;
        clearStatus();
        return;
    }

    if (track.id === currentTrackId) return;
    currentTrackId = track.id;

    syncHandle?.stop();
    syncHandle = null;
    const myGeneration = ++generation;

    const lines = await getLyricsForTrack(track);
    if (myGeneration !== generation) return;
    if (!lines || lines.length === 0) return;

    syncHandle = startSyncEngine(
        lines,
        () => SpotifyStore.position,
        () => SpotifyStore.isPlaying,
        queueStatusUpdate
    );
}

function handleResyncEvent() {
    syncHandle?.resync();
}

export default definePlugin({
    name: "SpotifyLyricsSync",
    description: "Syncs custom status to song lyrics",
    authors: [{ name: "Lsreaam", id: 1295730761311195177n }],
    dependencies: ["SpotifyControls"],

    start() {
        this.unsub = () => FluxDispatcher.unsubscribe("SPOTIFY_PLAYER_STATE", handleTrackChange);
        FluxDispatcher.subscribe("SPOTIFY_PLAYER_STATE", handleTrackChange);

        document.addEventListener("visibilitychange", handleResyncEvent);
        window.addEventListener("focus", handleResyncEvent);

        handleTrackChange();
    },

    stop() {
        generation++;
        syncHandle?.stop();
        syncHandle = null;
        this.unsub?.();

        document.removeEventListener("visibilitychange", handleResyncEvent);
        window.removeEventListener("focus", handleResyncEvent);

        clearStatus();
    }
});