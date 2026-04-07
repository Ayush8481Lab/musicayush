"use client";
import React, { useEffect, useState } from "react";
import { Heart, History, ListMusic, Play, Disc } from "lucide-react";
import { useAppContext } from "../../context/AppContext";
import { useRouter } from "next/navigation";

const getImageUrl = (img: any) => {
  if (!img) return "https://via.placeholder.com/500x500?text=Music";
  if (typeof img === "string") return img.replace("50x50", "500x500").replace("150x150", "500x500");
  if (Array.isArray(img) && img.length > 0) return img[img.length - 1]?.url || img[0]?.url;
  if (img.url) return img.url;
  return "https://via.placeholder.com/500x500?text=Music";
};

const decodeEntities = (text: string) => {
  if (!text) return "";
  return text.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
};

export default function LibraryPage() {
  const router = useRouter();
  const { setCurrentSong, setIsPlaying, setQueue, setPlayContext, historyQueue, likedSongs, likedPlaylists } = useAppContext();
  
  const [topSongs, setTopSongs] = useState<any[]>([]);
  const[activeTab, setActiveTab] = useState("recent");

  useEffect(() => {
    try {
      const top = JSON.parse(localStorage.getItem('top_30_songs') || '[]');
      setTopSongs(top);
    } catch (e) {}
  },[]);

  const handlePlaySong = (song: any, contextName: string) => {
    setPlayContext({ type: "Library", name: contextName });
    setQueue([song]); // Triggers recommendation API naturally
    setCurrentSong(song);
    setIsPlaying(true);
  };

  const handlePlayPlaylist = (item: any) => {
    if (item.type === 'album' || item.url?.includes('album')) {
       router.push(item.url || `/album/${item.id}`);
    } else {
       router.push(item.url || `/playlist/${item.id}`);
    }
  };

  const renderSongs = (songs: any[], contextName: string) => {
    if (songs.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed border-white/10 rounded-2xl bg-white/5">
          <ListMusic size={40} className="text-white/30 mb-3" />
          <p className="text-white/50 font-medium text-sm">No songs found here yet.</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1.5">
        {songs.map((song, idx) => {
          const title = decodeEntities(song.title || song.name || "Unknown");
          const artist = decodeEntities(song.artists || song.primaryArtists || song.singers || "Unknown Artist");
          const cover = getImageUrl(song.image || song.image_link || song.Banner || song.banner_link);

          return (
            <div 
              key={`${song.id}-${idx}`} 
              onClick={() => handlePlaySong(song, contextName)}
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/10 active:bg-white/5 active:scale-[0.98] cursor-pointer group transition-all"
            >
              <div className="relative w-12 h-12 rounded-md overflow-hidden bg-neutral-800 shrink-0 shadow-md">
                <img src={cover} alt="Cover" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Play fill="white" size={20} className="text-white translate-x-[1px]" />
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

  const renderPlaylists = () => {
    if (likedPlaylists.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed border-white/10 rounded-2xl bg-white/5">
          <Disc size={40} className="text-white/30 mb-3" />
          <p className="text-white/50 font-medium text-sm">You haven't saved any playlists or albums.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 min-[450px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
        {likedPlaylists.map((item, idx) => {
          const title = decodeEntities(item.title || item.name || "Unknown");
          const cover = getImageUrl(item.image || item.image_link);

          return (
            <div 
              key={`${item.id}-${idx}`} 
              onClick={() => handlePlayPlaylist(item)}
              className="flex flex-col cursor-pointer group active:scale-[0.96] transition-transform duration-200"
            >
              <div className="relative overflow-hidden rounded-xl aspect-square shadow-md mb-2 w-full bg-neutral-800">
                <img src={cover} alt="Cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <span className="text-sm font-bold text-white truncate w-full">{title}</span>
              <span className="text-xs text-neutral-400 font-medium truncate w-full capitalize mt-0.5">{item.type || "Playlist"}</span>
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

      <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar pb-1">
        {[
          { id: "recent", label: "Recent", icon: History },
          { id: "liked", label: "Liked", icon: Heart },
          { id: "playlists", label: "Playlists", icon: ListMusic },
          { id: "top", label: "Most Played", icon: Play }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold transition-all whitespace-nowrap ${
              activeTab === tab.id ? "bg-[#1db954] text-black shadow-md scale-105" : "bg-white/5 text-neutral-400 border border-white/5 hover:bg-white/10 active:scale-95"
            }`}
          >
            <tab.icon size={16} strokeWidth={activeTab === tab.id ? 2.5 : 2} /> {tab.label}
          </button>
        ))}
      </div>

      <div className="animate-in fade-in duration-300">
        {activeTab === "recent" && renderSongs(historyQueue, "Recently Played")}
        {activeTab === "liked" && renderSongs(likedSongs, "Liked Songs")}
        {activeTab === "top" && renderSongs(topSongs, "Most Played")}
        {activeTab === "playlists" && renderPlaylists()}
      </div>
    </main>
  );
}
