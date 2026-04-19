"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppContext } from "../../../../../context/AppContext";
import { Loader2 } from "lucide-react";

interface PlaySongClientProps {
  slug: string;
  id: string;
}

export default function PlaySongClient({ slug, id }: PlaySongClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setCurrentSong, setIsPlaying, setPlayContext, setQueue } = useAppContext();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAndPlay = async () => {
      if (!id || !slug) {
        router.push("/");
        return;
      }

      let cleanId = id;
      let videoId = searchParams?.get("token") || "";
      let spotifyId = searchParams?.get("signature") || "";

      // EXTREMELY ROBUST PARSING: Catches the tokens even if WhatsApp/Next.js malforms the URL
      const fullIdStr = decodeURIComponent(id);
      if (fullIdStr.includes("&token=") || fullIdStr.includes("?token=")) {
        const separator = fullIdStr.includes("?token=") ? "?token=" : "&token=";
        const parts = fullIdStr.split(separator);
        cleanId = parts[0];
        const rest = parts[1];
        if (rest && (rest.includes("&signature=") || rest.includes("?signature="))) {
          const subSeparator = rest.includes("?signature=") ? "?signature=" : "&signature=";
          const subParts = rest.split(subSeparator);
          if (!videoId) videoId = subParts[0];
          if (!spotifyId) spotifyId = subParts[1];
        } else {
          if (!videoId) videoId = rest;
        }
      }

      try {
        const link = `https://www.jiosaavn.com/song/${slug}/${cleanId}`;
        const res = await fetch(`https://ayushm-psi.vercel.app/api/songs?link=${encodeURIComponent(link)}`);
        const json = await res.json();
        
        let song = null;
        if (json.success && json.data && json.data.length > 0) {
          song = json.data[0];
        } else if (Array.isArray(json) && json.length > 0) {
          song = json[0];
        } else if (json.data && !Array.isArray(json.data)) {
          song = json.data;
        }

        if (song) {
          // Attaching the Video ID is crucial for your player to actually play the audio!
          if (videoId) song.prefetchedYtId = videoId;
          if (spotifyId) {
            song.spotifyId = spotifyId;
            song.spotifyUrl = `https://open.spotify.com/track/${spotifyId}`;
          }

          setPlayContext({ type: "External Link", name: "Shared Track" });
          setQueue([song]); 
          setCurrentSong(song);
          setIsPlaying(true);

          // We wait slightly longer (800ms) to ensure the global audio player state catches the YtId
          setTimeout(() => {
            router.push("/");
          }, 800);

        } else {
          setError("Song could not be loaded from the API.");
        }
      } catch (err) {
        console.error("Deep Link Error:", err);
        setError("Network error occurred while fetching the song.");
      }
    };

    fetchAndPlay();
  },[id, slug, searchParams, setCurrentSong, setIsPlaying, router, setPlayContext, setQueue]);

  if (error) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#121212] gap-4">
        <p className="text-red-500 font-bold text-lg">{error}</p>
        <button onClick={() => router.push("/")} className="px-6 py-2 bg-[#1db954] text-black rounded-full font-bold">
          Go to Home
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#121212]">
      <div className="flex flex-col items-center gap-5">
        <Loader2 className="animate-spin text-[#1db954]" size={48} />
        <p className="text-white/80 font-bold text-lg tracking-wide">Starting Track...</p>
      </div>
    </div>
  );
}
