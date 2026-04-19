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

      // Next.js automatically separates search parameters. 'id' is just "AD0zfk0Dc2M"
      const videoId = searchParams?.get("token");
      const spotifyId = searchParams?.get("signature");

      try {
        const link = `https://www.jiosaavn.com/song/${slug}/${id}`;
        const res = await fetch(`https://ayushm-psi.vercel.app/api/songs?link=${encodeURIComponent(link)}`);
        const json = await res.json();
        
        // Defensive check: API might return data as an array, an object, or directly
        let song = null;
        if (json.success && json.data && json.data.length > 0) {
          song = json.data[0];
        } else if (Array.isArray(json) && json.length > 0) {
          song = json[0];
        } else if (json.data && !Array.isArray(json.data)) {
          song = json.data;
        }

        if (song) {
          if (videoId) song.prefetchedYtId = videoId;
          if (spotifyId) {
            song.spotifyId = spotifyId;
            song.spotifyUrl = `https://open.spotify.com/track/${spotifyId}`;
          }

          setPlayContext({ type: "External Link", name: "Shared Track" });
          setQueue([song]); 
          setCurrentSong(song);
          setIsPlaying(true);

          // Give the player 500ms to mount/register before redirecting to home
          setTimeout(() => {
            router.push("/");
          }, 500);

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

  // If it fails, we show an error instead of silently kicking the user to the home page
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
