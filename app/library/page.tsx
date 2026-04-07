"use client";
import React, { useEffect, useState } from "react";
import { Heart, History, ListMusic, Play } from "lucide-react";
import { useAppContext } from "../../context/AppContext";

const getImageUrl = (img: any) => {
  if (!img) return "https://via.placeholder.com/500x500?text=Music";
  if (typeof img === "string") return img.replace("50x50", "500x500").replace("150x150", "500x500");
  if (Array.isArray(img)) return img[img.length - 1]?.url || img[0]?.url;
  return "https://via.placeholder.com/500x500?text=Music";
};

const decodeEntities = (text: string) => {
  if (!text) return "";
  return text.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
};

export default function LibraryPage() {
  // Uses global historyQueue hydrated perfectly via localstorage by the new Context engine
  const { setCurrentSong, setIsPlaying, historyQueue } = useAppContext();
  const [topSongs, setTopSongs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("recent");

  useEffect(() => {
    try {
      // Retrive top 30 user specific listened songs
      const top = JSON.parse(localStorage.getItem('top_30_songs') || '[]');
      setTopSongs(top);
    } catch (e) {}
  },[]);

  const handlePlay = (song: any) => {
    setCurrentSong(song);
    setIsPlaying(true);
  };

  const renderSongs = (songs: any[]) => {
    if (songs.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed border-neutral-800 rounded-2xl bg-neutral-900/30">
          <ListMusic size={40} className="text-neutral-600 mb-3" />
          <p className="text-neutral-400 font-medium">No songs found yet. Start listening!</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-2">
        {songs.map((song, idx) => {
          const title = decodeEntities(song.title || song.name || "Unknown");
          const artist = decodeEntities(song.artists || song.primaryArtists || song.singers || "Unknown Artist");
          return (
            <div 
              key={`${song.id}-${idx}`} 
              onClick={() => handlePlay(song)}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 active:bg-white/5 active:scale-[0.98] cursor-pointer group transition-all"
            >
              <div className="relative w-12 h-12 rounded-md overflow-hidden bg-neutral-800 shrink-0">
                <img src={getImageUrl(song.image)} alt="Cover" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Play fill="white" size={20} className="text-white" />
                </div>
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-white font-bold text-[15px] truncate">{title}</span>
                <span className="text-neutral-400 text-[13px] font-medium truncate">{artist}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <main className="min-h-screen pt-12 pb-32 px-4 bg-[#121212]">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Your Library</h1>
      </div>

      <div className="flex gap-3 mb-6 overflow-x-auto hide-scrollbar">
        <button 
          onClick={() => setActiveTab("recent")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-colors whitespace-nowrap ${activeTab === "recent" ? "bg-white text-black" : "bg-neutral-800 text-white"}`}
        >
          <History size={16} /> Recently Played
        </button>
        <button 
          onClick={() => setActiveTab("top")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-colors whitespace-nowrap ${activeTab === "top" ? "bg-white text-black" : "bg-neutral-800 text-white"}`}
        >
          <Heart size={16} /> Most Played
        </button>
      </div>

      <div className="animate-in fade-in duration-300">
        {activeTab === "recent" ? (
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Recently Played</h2>
            {renderSongs(historyQueue)}
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Your Top Songs</h2>
            {renderSongs(topSongs)}
          </div>
        )}
      </div>
    </main>
  );
}
