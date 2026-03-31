const { Client } = require("discord.js-selfbot-v13");

const DISCORD_TOKEN = process.env.TOKEN;
const TRACK_ID = process.env.TRACK_ID;
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

if (!DISCORD_TOKEN || !TRACK_ID || !CLIENT_ID || !CLIENT_SECRET) {
    console.error("❌ Missing required environment variables.");
    process.exit(1);
}

const client = new Client({ checkUpdate: false, syncStatus: false });

let spotifyToken = null;
let tokenExpiry = 0;

// Get new Spotify token with retry on rate limit
async function refreshSpotifyToken(retryAfter = 1000) {
    const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    try {
        const res = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials'
        });
        if (res.status === 429) {
            const retry = parseInt(res.headers.get('Retry-After') || '5') * 1000;
            console.log(`⚠️ Rate limited. Waiting ${retry}ms...`);
            setTimeout(() => refreshSpotifyToken(retry), retry);
            return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        spotifyToken = data.access_token;
        tokenExpiry = Date.now() + (data.expires_in * 1000);
        console.log(`✅ Spotify token refreshed (expires in ${data.expires_in}s)`);
    } catch (err) {
        console.error("Failed to get Spotify token:", err);
        setTimeout(() => refreshSpotifyToken(Math.min(retryAfter * 2, 60000)), retryAfter);
    }
}

async function ensureSpotifyToken() {
    if (!spotifyToken || Date.now() >= tokenExpiry) {
        await refreshSpotifyToken();
    }
    return spotifyToken;
}

// Cached track details (only fetched once)
let cachedTrack = null;

async function fetchSpotify(endpoint, retries = 3) {
    const token = await ensureSpotifyToken();
    for (let i = 0; i < retries; i++) {
        const res = await fetch(`https://api.spotify.com/v1/${endpoint}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.status === 429) {
            const wait = parseInt(res.headers.get('Retry-After') || '5') * 1000;
            console.log(`⏳ Rate limited, waiting ${wait}ms...`);
            await new Promise(r => setTimeout(r, wait));
            continue;
        }
        if (!res.ok) throw new Error(`Spotify API error: ${res.status}`);
        return res.json();
    }
    throw new Error(`Failed after ${retries} retries`);
}

async function getTrackDetails() {
    if (cachedTrack) return cachedTrack;
    const data = await fetchSpotify(`tracks/${TRACK_ID}`);
    if (!data || data.error) throw new Error("Track not found");
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

    const activity = {
        name: 'Spotify',
        type: 'LISTENING',
        details: track.name,
        state: track.artists,
        assets: {
            large_image: `spotify:${track.albumImage.split('/').pop()}`,
            large_text: track.album,
            small_image: 'spotify:ab6761610000e5ebd8b2c1e8b3f8e7e9b5c4d2a1',
            small_text: 'Spotify'
        },
        timestamps: { start: startTime, end: endTime },
        sync_id: track.id,
        flags: 48
    };

    await client.user.setPresence({ activities: [activity], status: 'online' });
    console.log(`🎵 Looping: ${track.name} — ${track.artists} | ${Math.floor(loopProgress/1000)}s / ${Math.floor(track.durationMs/1000)}s`);
}

client.on("ready", async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    await client.user.setStatus("online");
    await updatePresence();
    setInterval(updatePresence, 5000);
    // Refresh token every 50 minutes
    setInterval(async () => {
        await refreshSpotifyToken();
    }, 50 * 60 * 1000);
});

client.on("error", console.error);
client.login(DISCORD_TOKEN).catch(err => console.error("❌ Discord login failed:", err));
