"use client";
import { useAppContext } from "../context/AppContext";
import { Play, Pause, X } from "lucide-react";

// Helper to extract highest quality image
const getImageUrl = (img: any) => {
  if (!img) return "https://via.placeholder.com/150";
  if (typeof img === "string") return img.replace("150x150", "500x500");
  if (Array.isArray(img)) return img[img.length - 1]?.url || img[0]?.url;
  return "https://via.placeholder.com/150";
};

export default function MiniPlayer() {
  const { currentSong, isPlaying, setIsPlaying, setCurrentSong } = useAppContext();

  if (!currentSong) return null;

  return (
    <div className="fixed bottom-[75px] left-2 right-2 bg-neutral-800/95 backdrop-blur-xl text-white p-2 rounded-xl flex items-center justify-between shadow-2xl border border-neutral-700 z-50">
      <div className="flex items-center gap-3 overflow-hidden w-2/3">
        <img src={getImageUrl(currentSong.image)} alt="cover" className="w-10 h-10 rounded-md object-cover shadow-md" />
        <div className="flex flex-col overflow-hidden w-full">
          <span className="text-sm font-bold truncate">{currentSong.title || currentSong.name || "Unknown"}</span>
          <span className="text-xs text-neutral-400 truncate">{currentSong.subtitle || "Music@8481"}</span>
        </div>
      </div>
      <div className="flex items-center gap-4 pr-2">
        <button onClick={() => setIsPlaying(!isPlaying)} className="active:scale-90 transition-transform">
          {isPlaying ? <Pause fill="white" size={22} /> : <Play fill="white" size={22} />}
        </button>
        <button onClick={() => setCurrentSong(null)}>
          <X size={20} className="text-neutral-400" />
        </button>
      </div>
    </div>
  );
}
