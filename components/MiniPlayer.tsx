"use client";
import { useEffect, useState, useRef } from "react";
import { useAppContext } from "../context/AppContext";
import { Play, Pause, X, Loader2 } from "lucide-react";

export default function MiniPlayer() {
  const { currentSong, isPlaying, setIsPlaying, setCurrentSong } = useAppContext();
  const [audioUrl, setAudioUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!currentSong) {
      setAudioUrl("");
      setIsPlaying(false);
      return;
    }

    const fetchPlayableUrl = async () => {
      setLoading(true);
      try {
        // If the song object already has download links
        if (currentSong.downloadUrl && currentSong.downloadUrl.length > 0) {
          setAudioUrl(currentSong.downloadUrl[currentSong.downloadUrl.length - 1].url);
        } else {
          // Otherwise, fetch it using your custom API!
          const link = currentSong.url || currentSong.perma_url;
          const res = await fetch(`https://ayushm-psi.vercel.app/api/songs?link=${encodeURIComponent(link)}`);
          const json = await res.json();
          if (json.data && json.data[0]?.downloadUrl) {
            const urls = json.data[0].downloadUrl;
            setAudioUrl(urls[urls.length - 1].url); // Gets highest quality
          }
        }
      } catch (error) {
        console.error("Error fetching audio", error);
      }
      setLoading(false);
    };

    fetchPlayableUrl();
  }, [currentSong]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying && audioUrl) {
        audioRef.current.play().catch(() => setIsPlaying(false));
      } else {
        audioRef.current.pause();
      }
    }
  },[isPlaying, audioUrl]);

  if (!currentSong) return null;

  return (
    <div className="fixed bottom-[75px] left-2 right-2 bg-neutral-800/95 backdrop-blur-xl text-white p-2 rounded-xl flex items-center justify-between shadow-2xl border border-neutral-700 z-50">
      
      {/* Invisible Audio Element */}
      <audio 
        ref={audioRef} 
        src={audioUrl} 
        autoPlay={isPlaying} 
        onEnded={() => setIsPlaying(false)} 
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      <div className="flex items-center gap-3 overflow-hidden w-2/3">
        {loading ? (
          <div className="w-10 h-10 flex items-center justify-center bg-neutral-700 rounded-md"><Loader2 className="animate-spin text-neutral-400" size={20} /></div>
        ) : (
          <img src={currentSong.image?.[2]?.url || currentSong.image || "https://via.placeholder.com/50"} alt="cover" className="w-10 h-10 rounded-md object-cover shadow-md" />
        )}
        <div className="flex flex-col overflow-hidden w-full">
          <span className="text-sm font-bold truncate">{currentSong.title || currentSong.name || "Loading..."}</span>
          <span className="text-xs text-neutral-400 truncate">{currentSong.subtitle || currentSong.primaryArtists || "Music@8481"}</span>
        </div>
      </div>
      <div className="flex items-center gap-4 pr-2">
        <button disabled={loading} onClick={() => setIsPlaying(!isPlaying)} className="active:scale-90 transition-transform">
          {isPlaying ? <Pause fill="white" size={22} /> : <Play fill="white" size={22} />}
        </button>
        <button onClick={() => setCurrentSong(null)}>
          <X size={20} className="text-neutral-400" />
        </button>
      </div>
    </div>
  );
}
