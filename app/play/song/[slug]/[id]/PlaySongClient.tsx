"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "../../../../../context/AppContext";
import { Loader2 } from "lucide-react";

export default function PlaySongClient({ slug, id, token, signature }: any) {
  const router = useRouter();
  const { setCurrentSong, setIsPlaying, setPlayContext, setQueue } = useAppContext();
  
  const [songDetails, setSongDetails] = useState<any>(null);
  const[errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const fetchAndPlay = async () => {
      try {
        // Strip out any extra characters attached to the ID
        const cleanId = id.split("?")[0].split("&")[0];
        const link = `https://www.jiosaavn.com/song/${slug}/${cleanId}`;
        
        const res = await fetch(`https://ayushm-psi.vercel.app/api/songs?link=${encodeURIComponent(link)}`);
        const json = await res.json();
        
        let song = json?.data?.[0] || json?.[0] || json?.data || json;

        if (song && song.name) {
          // Attach YouTube Token so audio actually plays!
          if (token) song.prefetchedYtId = token;
          if (signature) {
            song.spotifyId = signature;
            song.spotifyUrl = `https://open.spotify.com/track/${signature}`;
          }

          // Visually show the album art on the screen
          setSongDetails(song);

          // Start the Global Player in Context
          setPlayContext({ type: "External Link", name: "Shared Track" });
          setQueue([song]); 
          setCurrentSong(song);
          setIsPlaying(true);

          // Wait 2 seconds for the audio player to register natively, then smoothly redirect home
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
        <button 
          onClick={() => router.push("/")} 
          className="px-6 py-2 bg-[#1db954] text-black rounded-full font-bold hover:scale-105 transition-all"
        >
          Go Home
        </button>
      </div>
    );
  }

  // Helper variable to safely pull the image regardless of how the API formats it
  let displayImg = "";
  if (songDetails) {
    if (Array.isArray(songDetails.image)) {
      const bestImg = songDetails.image[songDetails.image.length - 1] || songDetails.image[0];
      displayImg = bestImg?.url || bestImg?.link || "";
    } else if (typeof songDetails.image === "object") {
      displayImg = songDetails.image.url || songDetails.image.link || "";
    } else if (typeof songDetails.image === "string") {
      displayImg = songDetails.image;
    }
  }

  // Visual Success/Loading Feedback
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#121212] text-white">
      {songDetails ? (
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-500">
          <img 
            src={displayImg} 
            alt="Album Art" 
            className="w-48 h-48 rounded-2xl shadow-2xl shadow-[#1db954]/20 object-cover"
          />
          <h2 className="text-2xl font-bold text-[#1db954] text-center px-4">
            {songDetails.name}
          </h2>
          <div className="flex items-center gap-2 mt-2">
            <Loader2 className="animate-spin text-white/50" size={20} />
            <p className="text-white/50 text-sm font-medium">Starting player...</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-[#1db954]" size={48} />
          <p className="text-white/80 font-bold text-lg tracking-wide animate-pulse">
            Fetching Track Data...
          </p>
        </div>
      )}
    </div>
  );
}
