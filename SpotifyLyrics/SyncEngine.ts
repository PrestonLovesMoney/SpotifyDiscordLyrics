import { LyricLine } from "./types";
import {
    GAP_THRESHOLD_MS,
    HOLD_LINE_MS,
    NOTE_FRAMES,
    NOTE_FRAME_DURATION,
    LYRIC_WRAPPER
} from "./constants";

function findLineIndex(lines: LyricLine[], position: number): number {
    let lo = 0, hi = lines.length - 1, res = -1;
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (lines[mid].time <= position) {
            res = mid;
            lo = mid + 1;
        } else {
            hi = mid - 1;
        }
    }
    return res;
}

function getNoteFrame(): string {
    const idx = Math.floor(Date.now() / NOTE_FRAME_DURATION) % NOTE_FRAMES.length;
    return NOTE_FRAMES[idx];
}

function getDisplayInfo(
    lines: LyricLine[],
    idx: number,
    pos: number
): { text: string; isInstrumental: boolean; } {
    if (idx === -1) {
        if (lines.length === 0) return { text: getNoteFrame(), isInstrumental: true };
        const untilFirst = lines[0].time - pos;
        return untilFirst > GAP_THRESHOLD_MS
            ? { text: getNoteFrame(), isInstrumental: true }
            : { text: LYRIC_WRAPPER(lines[0].text), isInstrumental: false };
    }

    const current = lines[idx];
    const next = lines[idx + 1];

    if (!next) return { text: LYRIC_WRAPPER(current.text), isInstrumental: false };

    const gap = next.time - current.time;
    const sinceCurrent = pos - current.time;

    if (gap > GAP_THRESHOLD_MS && sinceCurrent > HOLD_LINE_MS) {
        return { text: getNoteFrame(), isInstrumental: true };
    }

    return { text: LYRIC_WRAPPER(current.text), isInstrumental: false };
}

export interface SyncHandle {
    stop: () => void;
    resync: () => void;
}

export function startSyncEngine(
    lines: LyricLine[],
    getPosition: () => number,
    getIsPlaying: () => boolean,
    onTextChange: (text: string) => void
): SyncHandle {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let lastText: string | null = null;

    function tick() {
        if (timeoutId) clearTimeout(timeoutId);

        if (!getIsPlaying()) {
            timeoutId = setTimeout(tick, 500);
            return;
        }

        const pos = getPosition();
        const idx = findLineIndex(lines, pos);
        const { text, isInstrumental } = getDisplayInfo(lines, idx, pos);

        if (text !== lastText) {
            lastText = text;
            onTextChange(text);
        }

        let delay: number;

        if (isInstrumental) {
            delay = NOTE_FRAME_DURATION;
        } else if (idx === -1 && lines.length > 0) {
            delay = Math.max(50, lines[0].time - pos);
        } else if (idx >= 0 && lines[idx + 1]) {
            delay = Math.max(50, lines[idx + 1].time - pos);
        } else {
            delay = 300;
        }

        timeoutId = setTimeout(tick, Math.min(delay, 750));
    }

    tick();

    return {
        stop: () => {
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = null;
        },
        resync: () => {
            tick();
        }
    };
}