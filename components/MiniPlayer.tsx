"use client";
import { useAppContext } from "../context/AppContext";
import { Play, Pause, X } from "lucide-react";

export default function MiniPlayer() {
  const { currentSong, isPlaying, setIsPlaying, setCurrentSong } = useAppContext();

  if (!currentSong) return null;

  return (
    <div className="fixed bottom-[65px] left-2 right-2 bg-neutral-900/95 backdrop-blur-md text-white p-2 rounded-xl flex items-center justify-between shadow-2xl border border-neutral-700 z-50">
      <div className="flex items-center gap-3 overflow-hidden">
        <img src={currentSong.image || currentSong.image?.[1]?.url || "https://via.placeholder.com/50"} alt="cover" className="w-10 h-10 rounded-md object-cover" />
        <div className="flex flex-col overflow-hidden">
          <span className="text-sm font-bold truncate">{currentSong.title || currentSong.name || "Unknown"}</span>
          <span className="text-xs text-neutral-400 truncate">{currentSong.subtitle || "Music@8481"}</span>
        </div>
      </div>
      <div className="flex items-center gap-4 pr-2">
        <button onClick={() => setIsPlaying(!isPlaying)}>
          {isPlaying ? <Pause fill="white" size={22} /> : <Play fill="white" size={22} />}
        </button>
        <button onClick={() => setCurrentSong(null)}>
          <X size={20} className="text-neutral-400" />
        </button>
      </div>
    </div>
  );
}
