"use client";

import { useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useAppContext } from "../../../../../context/AppContext";
import { Loader2 } from "lucide-react";

export default function PlaySongClient() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { setCurrentSong, setIsPlaying, setPlayContext, setQueue } = useAppContext();

  useEffect(() => {
    const fetchAndPlay = async () => {
      const slug = params?.slug as string;
      const id = params?.id as string;
      
      if (!id || !slug) {
        router.push("/");
        return;
      }

      let videoId = searchParams?.get("token");
      let spotifyId = searchParams?.get("signature");

      let cleanId = id;
      if (id.includes("&token=")) {
         const parts = id.split("&token=");
         cleanId = parts[0];
         const rest = parts[1];
         if (rest.includes("&signature=")) {
            const subParts = rest.split("&signature=");
            videoId = subParts[0];
            spotifyId = subParts[1];
         } else {
            videoId = rest;
         }
      }

      try {
        const link = `https://www.jiosaavn.com/song/${slug}/${cleanId}`;
        const res = await fetch(`https://ayushm-psi.vercel.app/api/songs?link=${encodeURIComponent(link)}`);
        const json = await res.json();
        
        if (json.success && json.data && json.data.length > 0) {
          const song = json.data[0];
          
          if (videoId) song.prefetchedYtId = videoId;
          if (spotifyId) {
            song.spotifyId = spotifyId;
            song.spotifyUrl = `https://open.spotify.com/track/${spotifyId}`;
          }

          setPlayContext({ type: "External Link", name: "Shared Track" });
          setQueue([song]); 
          setCurrentSong(song);
          setIsPlaying(true);
        }
      } catch (err) {
        console.error("Deep Link Error:", err);
      } finally {
        router.push("/");
      }
    };

    fetchAndPlay();
  },[params, searchParams, setCurrentSong, setIsPlaying, router, setPlayContext, setQueue]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#121212]">
      <div className="flex flex-col items-center gap-5">
        <Loader2 className="animate-spin text-[#1db954]" size={48} />
        <p className="text-white/80 font-bold text-lg tracking-wide">Starting Track...</p>
      </div>
    </div>
  );
}
