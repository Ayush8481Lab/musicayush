// app/api/spotify-match/route.ts
import { NextResponse } from "next/server";

const RAPID_KEYS =[
  "d1edce158amshec139440d20658ap1f2545jsnbb7da9add82f",
  "6cf7f03014msh787c51a713c0264p15c20djsna1f9a9f6a378",
  "13d48f6bb8msh459c11b91bdcc44p110f4ejsn099443894115",
  "03fc23317fmsh0535ef9ec8c6f5bp1db59bjsn545991df9343",
  "e54e3fbc4dmshfc16d4417b618fdp1a2fafjsn30c72d8cf3ab",
  "2f3f6a9ae2mshdc5288abadb0c84p118401jsnd18970b2f26a",
  "c1efbc2580mshf9e6f81b0e6f996p143edajsn64cf72ed1463",
  "da6bd1e90dmsh5aab26c0416ad7ep182d57jsnee8be14e0c74",
  "7dd1f2fad7msh74af897174e65bcp10834ejsnc62fe7ef2611",
  "2f4d50852bmsh18208c6cdabf7d5p1c8a68jsn6c3a2b8fa7b8",
  "d3c96044bfmshfb83354c3708e98p1ed394jsnbf4ef41a0837"
];

const RAPID_API_HOST = "spotify81.p.rapidapi.com";

// Exactly matches the logic from your HTML file
function performMatching(apiData: any, targetTrack: string, targetArtist: string) {
  if (!apiData.tracks || apiData.tracks.length === 0) return null;
  const clean = (s: string) => (s || "").toLowerCase().replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ").trim();
  const tTitle = clean(targetTrack);
  const tArtist = clean(targetArtist);
  let bestMatch = null;
  let highestScore = 0;

  apiData.tracks.forEach((item: any) => {
    const track = item.data;
    if (!track) return;
    const rTitle = clean(track.name);
    const rArtists = track.artists.items.map((a: any) => clean(a.profile.name));
    let score = 0;
    let artistMatched = false;

    if (tArtist.length > 0) {
      for (let ra of rArtists) {
        if (ra === tArtist) { score += 100; artistMatched = true; break; }
        else if (ra.includes(tArtist) || tArtist.includes(ra)) { score += 80; artistMatched = true; break; }
      }
      if (!artistMatched) score = 0;
    } else score += 50;

    if (score > 0) {
      if (rTitle === tTitle) score += 100;
      else if (rTitle.startsWith(tTitle) || tTitle.startsWith(rTitle)) score += 80;
      else if (rTitle.includes(tTitle)) score += 50;
    }
    if (score > highestScore) { highestScore = score; bestMatch = track; }
  });
  return highestScore > 0 ? bestMatch : null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title");
  const artist = searchParams.get("artist");

  if (!title) return NextResponse.json({ error: "Missing Title" }, { status: 400 });

  const searchArtist = artist ? artist.split(',').slice(0, 2).join(' ') : "";
  const query = `${title} ${searchArtist}`.trim();
  const searchUrl = `https://${RAPID_API_HOST}/search?q=${encodeURIComponent(query)}&type=tracks&offset=0&limit=25&numberOfTopResults=5`;

  let trackData = null;

  // Key Rotation Strategy
  for (let i = 0; i < RAPID_KEYS.length; i++) {
    try {
      const res = await fetch(searchUrl, {
        headers: { 'x-rapidapi-key': RAPID_KEYS[i], 'x-rapidapi-host': RAPID_API_HOST }
      });
      if (res.ok) { trackData = await res.json(); break; }
      if (res.status !== 429 && res.status !== 401 && res.status !== 403) break;
    } catch (e) {}
  }

  if (!trackData) return NextResponse.json({ error: "No track found or limits reached" }, { status: 404 });

  const match = performMatching(trackData, title, artist || "");
  if (!match) return NextResponse.json({ error: "No exact match found" }, { status: 404 });

  const spotifyId = match.id;
  const spotifyUrl = `https://open.spotify.com/track/${spotifyId}`;

  // Fetch Lyrics & Canvas in parallel
  const[lyricsRes, canvasRes] = await Promise.all([
    fetch(`https://lyr-nine.vercel.app/api/lyrics?url=${spotifyUrl}&format=lrc`),
    fetch(`https://ayush-gamma-coral.vercel.app/api/canvas?trackId=${spotifyId}`)
  ]);

  const lyrics = lyricsRes.ok ? await lyricsRes.json().catch(()=>null) : null;
  const canvasData = canvasRes.ok ? await canvasRes.json().catch(()=>null) : null;

  // Extract necessary variables
  const canvasObj = canvasData?.canvasesList?.[0] || null;

  return NextResponse.json({
    trackId: spotifyId,
    spotifyUrl,
    lyrics,
    canvas: canvasObj ? {
      canvasUrl: canvasObj.canvasUrl,
      artist: canvasObj.artist
    } : null
  });
}
