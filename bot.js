const { Client, SpotifyRPC } = require("discord.js-selfbot-v13");

// Hardcoded Spotify token (aapne diya tha – optional, override with env if you like)
const DEFAULT_SPOTIFY_TOKEN = "BQBKnCcY-fMhp5hsVrDFh-F0ZXmYL0a59r7R77i3jzDZ-wbz1TKE3fg_XCseRLq8c6mTbQnY3GVibwIqS1UvV5obKRcVTlTgg5CBq-kb2cjUsgGqV3ElgDV3ulBXkYhp-evVCQFZO0Om6JO5CoGeoBZq4ibqw6DHaKywm2RvuqgAmT895NFHKV0v7Ou_frqGAXaIEbWlg0tmtWvpGudBO0eKfEaw0SQgtYNobHlTH7sELGecpGzCermfFVpiwPo7o1-s4ESN4pcL3ruDnDfPGwfarHbJqia4CrDJ7z_9GnA6lAzPbI_zzTFHRAiPvhVqhzUeug";

// Environment variables
const DISCORD_TOKEN = process.env.TOKEN;
const SPOTIFY_TOKEN = process.env.SPOTIFY_TOKEN || DEFAULT_SPOTIFY_TOKEN;
const TRACK_ID = process.env.TRACK_ID;

if (!DISCORD_TOKEN) {
    console.error("❌ TOKEN environment variable is missing (Discord token).");
    process.exit(1);
}
if (!TRACK_ID) {
    console.error("❌ TRACK_ID environment variable is missing. Set it in Railway.");
    process.exit(1);
}

const client = new Client({ checkUpdate: false, syncStatus: false });

// Helper: Spotify API call
async function fetchSpotify(endpoint) {
    const res = await fetch(`https://api.spotify.com/v1/${endpoint}`, {
        headers: { Authorization: `Bearer ${SPOTIFY_TOKEN}` }
    });
    if (!res.ok) throw new Error(`Spotify API error: ${res.status}`);
    return res.json();
}

let cachedTrack = null;
async function getTrackDetails() {
    if (cachedTrack) return cachedTrack;
    const data = await fetchSpotify(`tracks/${TRACK_ID}`);
    if (!data || data.error) throw new Error("Track not found or invalid ID");
    cachedTrack = {
        id: data.id,
        name: data.name,
        artists: data.artists.map(a => a.name).join(", "),
        album: data.album.name,
        albumImage: data.album.images[0]?.url,
        durationMs: data.duration_ms,
        artistIds: data.artists.map(a => a.id)
    };
    console.log(`✅ Track loaded: ${cachedTrack.name} by ${cachedTrack.artists}`);
    return cachedTrack;
}

async function updatePresence() {
    const track = await getTrackDetails();
    if (!track) return;

    const now = Date.now();
    const loopProgress = now % track.durationMs;
    const startTime = now - loopProgress;
    const endTime = startTime + track.durationMs;

    const presence = new SpotifyRPC(client)
        .setSongId(track.id)
        .setDetails(track.name)
        .setState(track.artists)
        .setAssetsLargeImage(`spotify:${track.albumImage.split('/').pop()}`)
        .setAssetsLargeText(track.album)
        .setAssetsSmallImage("spotify:ab6761610000e5ebd8b2c1e8b3f8e7e9b5c4d2a1")
        .setAssetsSmallText("Spotify")
        .setTimestampsStart(startTime)
        .setTimestampsEnd(endTime)
        .setArtistIds(...track.artistIds);

    await client.user.setPresence(presence.toDiscord());
    console.log(`🎵 Looping: ${track.name} — ${track.artists} | ${Math.floor(loopProgress/1000)}s / ${Math.floor(track.durationMs/1000)}s`);
}

client.on("ready", async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    await client.user.setStatus("online");
    await updatePresence();
    setInterval(updatePresence, 5000);
});

client.on("error", console.error);
client.login(DISCORD_TOKEN).catch(err => console.error("❌ Discord login failed:", err));
