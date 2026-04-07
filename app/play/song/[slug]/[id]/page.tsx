"use client";

import { useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useAppContext } from "../../../../../context/AppContext";
import { Loader2 } from "lucide-react";

export default function PlaySongEndpoint() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { setCurrentSong, setIsPlaying } = useAppContext();

  useEffect(() => {
    const fetchAndPlay = async () => {
      const slug = params?.slug as string;
      const id = params?.id as string;
      
      if (!id || !slug) {
        router.push("/");
        return;
      }

      // Hack to extract token and signature correctly whether they were correctly formatted as Query Params OR raw appended to the url path
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
          
          // Inject straight into the Global Context - Miniplayer logic was built to skip external API calls if these exist!
          if (videoId) {
            song.prefetchedYtId = videoId;
          }
          if (spotifyId) {
            song.spotifyId = spotifyId;
            song.spotifyUrl = `https://open.spotify.com/track/${spotifyId}`;
          }

          setCurrentSong(song);
          setIsPlaying(true);
        }
      } catch (err) {
        console.error("Error fetching song via deep link:", err);
      } finally {
        // Redirect completely invisibly
        router.push("/");
      }
    };

    fetchAndPlay();
  },[params, searchParams, setCurrentSong, setIsPlaying, router]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#121212]">
      <div className="flex flex-col items-center gap-5">
        <Loader2 className="animate-spin text-[#1db954]" size={48} />
        <p className="text-white/80 font-bold text-lg tracking-wide">Starting Track...</p>
      </div>
    </div>
  );
}
