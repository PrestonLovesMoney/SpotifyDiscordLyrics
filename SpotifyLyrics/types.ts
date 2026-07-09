export interface LyricLine {
    time: number;
    text: string;
}

export interface SpotifyTrack {
    id: string;
    name: string;
    duration: number;
    artists: { name: string }[];
    album?: { name: string; image?: { url: string } };
}