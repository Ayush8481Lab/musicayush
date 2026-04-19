"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "../../../../../context/AppContext";
import { Loader2 } from "lucide-react";

export default function PlaySongClient({ slug, id, token, signature }: any) {
  const router = useRouter();
  const { setCurrentSong, setIsPlaying, setPlayContext, setQueue } = useAppContext();
  
  const [songDetails, setSongDetails] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const fetchAndPlay = async () => {
      try {
        // Strip out any weird characters that might have gotten attached to the ID
        const cleanId = id.split("?")[0].split("&")[0];
        const link = `https://www.jiosaavn.com/song/${slug}/${cleanId}`;
        
        const res = await fetch(`https://ayushm-psi.vercel.app/api/songs?link=${encodeURIComponent(link)}`);
        const json = await res.json();
        
        let song = json?.data?.[0] || json?.[0] || json?.data || json;

        if (song && song.name) {
          // Attach YouTube Token so audio actually plays
          if (token) song.prefetchedYtId = token;
          if (signature) {
            song.spotifyId = signature;
            song.spotifyUrl = `https://open.spotify.com/track/${signature}`;
          }

          // Show the album art on the screen so you KNOW it worked
          setSongDetails(song);

          // Start the Global Player
          setPlayContext({ type: "External Link", name: "Shared Track" });
          setQueue([song]); 
          setCurrentSong(song);
          setIsPlaying(true);

          // Wait 2 seconds so the audio player actually starts natively, then redirect safely
          setTimeout(() => {
             router.push("/");
          }, 2000);

        } else {
          setErrorMsg("Could not load song details from API.");
        }
      } catch (err) {
        console.error(err);
        setErrorMsg("Network error connecting to API.");
      }
    };

    if (id && slug) {
      fetchAndPlay();
    }
  },[id, slug, token, signature, setCurrentSong, setIsPlaying, setPlayContext, setQueue, router]);

  // Visual Error Feedback
  if (errorMsg) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#121212] gap-4">
        <p className="text-red-500 font-bold text-lg">{errorMsg}</p>
        <button onClick={() => router.push("/")} className="px-6 py-2 bg-[#1db954] text-black rounded-full font-bold">Go Home</button>
      </div>
    );
  }

  // Visual Success Feedback (Shows the Song Image!)
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#121212] text-white">
      {songDetails ? (
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-500">
          <img 
            src={songDetails.image?.[2]?.link || songDetails.image?.[0]?.link || songDetails.image} 
            alt="Album Art" 
            className="w-48 h-48 rounded-2xl shadow-2xl shadow-[#1db954]/20"
          />
          <h2 className="text-2xl font-bold text-[#1db954]">{songDetails.name}</h2>
          <Loader2 className="animate-spin mt-2 text-white/50" size={24} />
          <p className="text-white/50 text-sm">Loading player...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-[#1db954]" size={48} />
          <p className="text-white/80 font-bold text-lg tracking-wide">Fetching Track Data...</p>
        </div>
      )}
    </div>
  );
}
