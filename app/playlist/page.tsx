"use client";
import React, { useEffect, useState, Suspense, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Play, ArrowLeft, Loader2, Shuffle, Share2, Info, BadgeAlert, Pause } from "lucide-react";
import { useAppContext } from "../../context/AppContext";

// --- Utility Functions --- //
const getImageUrl = (img: any) => {
  if (!img) return "https://via.placeholder.com/500x500?text=Playlist";
  if (typeof img === "string") return img.replace("50x50", "500x500").replace("150x150", "500x500");
  if (Array.isArray(img)) return img[img.length - 1]?.url || img[0]?.url;
  return "https://via.placeholder.com/500x500?text=Playlist";
};

const decodeEntities = (text: string) => {
  if (!text) return "";
  return text.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
};

const formatDuration = (seconds: number) => {
  if (!seconds) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
};

const formatNumber = (num: number) => {
  if (!num) return "";
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
};

const getArtists = (data: any) => {
  if (data?.artists?.primary && Array.isArray(data.artists.primary)) {
    return data.artists.primary.map((a: any) => a.name).join(", ");
  }
  if (Array.isArray(data?.artists)) {
    return data.artists.slice(0, 4).map((a: any) => a.name).join(", ");
  }
  if (typeof data?.artists === "string") return data.artists;
  if (data?.primaryArtists) return data.primaryArtists;
  if (data?.singers) return data.singers;
  return "Various Artists";
};

// Fallback color generator based on text hashing
const getHashColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 65%, 30%)`;
};

// --- Custom Universal Marquee Component --- //
const TrackMarquee = ({ text, isPlaying, isSubtitle }: { text: string, isPlaying?: boolean, isSubtitle?: boolean }) => {
  const isLong = text.length > 28;
  const speed = Math.max(8, text.length * 0.2); // Dynamic speed based on length

  const baseClass = isSubtitle 
    ? "text-[12px] text-neutral-400 group-hover:text-neutral-300 transition-colors" 
    : `text-[15px] font-semibold ${isPlaying ? "text-[#1ed760]" : "text-white"}`;

  return (
    <div className="relative overflow-hidden whitespace-nowrap mask-linear-fade flex w-full">
      <div className={`inline-block w-max ${isLong ? "animate-marquee" : ""}`} style={{ animationDuration: `${speed}s` }}>
        <span className={`${baseClass} pr-10`}>{text}</span>
        {isLong && <span className={`${baseClass} pr-10`}>{text}</span>}
      </div>
    </div>
  );
};

// --- Main Content Component --- //
function PlaylistContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const link = searchParams.get("link");
  
  // Destructure context - Assumes global player supports queues
  const { currentSong, setCurrentSong, setIsPlaying, setQueue, setQueueIndex } = useAppContext() as any;
  
  const [playlist, setPlaylist] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const[loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  const [isScrolled, setIsScrolled] = useState(false);
  const[bgColor, setBgColor] = useState<string>("#121212"); // Default dark
  
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Scroll listener for sticky header
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 250);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  },[]);

  // Fetch Playlist Data
  useEffect(() => {
    if (!link) return;

    const fetchPlaylist = async () => {
      if (page === 1) setLoading(true);
      else setLoadingMore(true);

      try {
        const res = await fetch(`https://ayushm-psi.vercel.app/api/playlists?link=${encodeURIComponent(link)}&page=${page}&limit=50`);
        const json = await res.json();
        const newData = json.data;

        if (page === 1) {
          setPlaylist(newData);
          setHasMore(newData.songs && newData.songs.length > 0 && newData.songs.length < (newData.songCount || 9999));
        } else {
          setPlaylist((prev: any) => {
            if (!prev) return newData;
            const existingIds = new Set(prev.songs.map((s: any) => s.id));
            const newSongs = newData.songs?.filter((s: any) => !existingIds.has(s.id)) || [];
            return { ...prev, songs:[...prev.songs, ...newSongs] };
          });
          setHasMore(newData.songs && newData.songs.length > 0);
        }
      } catch (error) {
        console.error("Error fetching playlist:", error);
        setHasMore(false);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };

    fetchPlaylist();
  }, [link, page]);

  // Extract solid dominant color from the image using Canvas API
  useEffect(() => {
    if (!playlist?.image) return;
    const coverUrl = getImageUrl(playlist.image);
    
    const img = new window.Image();
    img.crossOrigin = "Anonymous";
    img.src = coverUrl;
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = 1;
        canvas.height = 1;
        ctx.drawImage(img, 0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        // Make sure it's dark enough to support white text
        setBgColor(`rgb(${Math.max(10, r - 30)}, ${Math.max(10, g - 30)}, ${Math.max(10, b - 30)})`);
      } catch (e) {
        setBgColor(getHashColor(coverUrl)); // Fallback if CORS blocked
      }
    };
    img.onerror = () => setBgColor(getHashColor(coverUrl));
  }, [playlist?.image]);

  // Infinite Scroll Observer
  const lastElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || loadingMore || !hasMore) return;
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) setPage(prev => prev + 1);
    }, { rootMargin: "400px" });

    if (node) observerRef.current.observe(node);
  },[loading, loadingMore, hasMore]);

  // Interactive Play Actions
  const handlePlaySong = (song: any, index: number) => {
    setCurrentSong(song);
    setIsPlaying(true);
    // Passing the entire playlist array to global queue for Auto-Play Next support
    if (setQueue) setQueue(playlist.songs);
    if (setQueueIndex) setQueueIndex(index);
  };

  const handleShuffle = () => {
    if (!playlist?.songs?.length) return;
    const randomIndex = Math.floor(Math.random() * playlist.songs.length);
    handlePlaySong(playlist.songs[randomIndex], randomIndex);
  };

  const handleShare = async () => {
    const shareData = {
      title: decodeEntities(playlist?.name || playlist?.title),
      text: `Listen to ${decodeEntities(playlist?.name || playlist?.title)} on Music@8481`,
      url: window.location.href,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch (err) {}
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };


  if (loading && page === 1) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#121212] text-[#1ed760]">
        <Loader2 className="animate-spin" size={40} />
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-[#121212] text-white gap-4">
        <Info size={48} className="text-neutral-500" />
        <p className="text-lg font-bold">Playlist not found</p>
        <button onClick={() => router.back()} className="px-6 py-2 bg-white text-black rounded-full font-bold">Go Back</button>
      </div>
    );
  }

  const coverImage = getImageUrl(playlist.image);
  const title = decodeEntities(playlist.name || playlist.title);
  const description = decodeEntities(playlist.description || "");
  const playlistArtists = decodeEntities(getArtists(playlist));

  const totalSeconds = playlist.songs?.reduce((acc: number, song: any) => acc + (song.duration || 0), 0);
  const totalDurationStr = totalSeconds ? ` • ${Math.floor(totalSeconds / 60)} mins` : "";

  return (
    <div className="pb-32 bg-[#121212] min-h-screen relative text-white selection:bg-[#1ed760]/30">
      
      {/* CSS For Global Marquee */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee linear infinite;
        }
        .mask-linear-fade {
          -webkit-mask-image: linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%);
          mask-image: linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%);
        }
      `}} />

      {/* 1. Dynamic Extracted Solid Color Gradient Background */}
      <div 
        className="absolute top-0 left-0 w-full h-[500px] pointer-events-none z-0 transition-colors duration-1000 ease-in-out"
        style={{ background: `linear-gradient(to bottom, ${bgColor} 0%, #121212 100%)` }}
      />

      {/* 2. Sticky Top Navigation */}
      <nav className={`fixed top-0 left-0 w-full z-50 flex items-center gap-3 px-4 py-3 transition-all duration-300 ${isScrolled ? "bg-[#171717] shadow-xl" : "bg-transparent"}`}>
        <button onClick={() => router.back()} className="p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md transition-colors text-white active:scale-95 z-50">
          <ArrowLeft size={22} />
        </button>
        
        {/* Compact Title appearing on scroll */}
        <div className={`flex items-center gap-3 overflow-hidden transition-opacity duration-300 w-full pr-12 ${isScrolled ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
          <img src={coverImage} className="w-9 h-9 rounded-md shadow-md object-cover" alt="thumb" />
          <div className="flex-1 overflow-hidden">
            <TrackMarquee text={title} />
          </div>
        </div>
      </nav>

      {/* 3. Hero Header Section */}
      <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-5 md:gap-8 px-4 md:px-8 pt-20 md:pt-28 pb-6">
        
        {/* Banner - Small on Mobile, Large on Desktop */}
        <div className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 lg:w-64 lg:h-64 flex-shrink-0 shadow-[0_25px_50px_rgba(0,0,0,0.5)] rounded-xl overflow-hidden group">
          <img 
            src={coverImage} 
            alt={title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" 
          />
        </div>
        
        <div className="flex flex-col items-center md:items-start text-center md:text-left mt-2 md:mt-0 w-full">
          <p className="text-[11px] uppercase tracking-[0.2em] font-extrabold text-neutral-300 mb-2 drop-shadow-md">
            {playlist.type === "playlist" ? "Playlist" : "Album"}
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black tracking-tighter mb-3 line-clamp-3 leading-tight drop-shadow-lg">
            {title}
          </h1>
          {description && (
            <p className="text-[13px] md:text-sm text-neutral-200 mb-3 max-w-2xl line-clamp-2 md:line-clamp-3 leading-relaxed drop-shadow-sm">
              {description}
            </p>
          )}
          
          <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2 text-[13px] font-medium text-neutral-300 mt-1">
            <span className="font-bold text-white drop-shadow-md">{playlistArtists}</span>
            <div className="flex items-center justify-center gap-1.5 opacity-90 drop-shadow-sm">
              <span className="hidden md:inline">•</span>
              <span>{playlist.songCount || playlist.songs?.length} songs</span>
              {totalDurationStr}
              {playlist.playCount && (
                <>
                  <span>•</span>
                  <span>{formatNumber(playlist.playCount)} plays</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Action Bar (Light Green Spotify-like Play Button) */}
      <div className="relative z-10 px-4 md:px-8 py-2 flex items-center justify-center md:justify-start gap-6">
        <button 
          onClick={() => { if (playlist.songs?.length) handlePlaySong(playlist.songs[0], 0); }} 
          className="w-14 h-14 bg-[#1ed760] hover:bg-[#1fdf64] text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_8px_30px_rgba(30,215,96,0.4)]"
        >
          <Play fill="black" size={26} className="ml-1" />
        </button>
        <button onClick={handleShuffle} className="p-2 text-neutral-300 hover:text-white transition-colors active:scale-90" title="Shuffle Play">
          <Shuffle size={28} />
        </button>
        <button onClick={handleShare} className="p-2 text-neutral-300 hover:text-white transition-colors active:scale-90" title="Share">
          <Share2 size={26} />
        </button>
      </div>

      {/* 5. Tracklist Header */}
      <div className="relative z-10 px-4 md:px-8 mt-6 hidden md:flex items-center text-[11px] font-bold uppercase tracking-wider text-neutral-400 border-b border-white/10 pb-2 mb-4">
        <div className="w-10 text-center">#</div>
        <div className="flex-1 ml-4">Title</div>
        <div className="flex-1 hidden lg:block">Plays</div>
        <div className="w-16 text-right mr-4">Duration</div>
      </div>

      {/* 6. Songs List */}
      <div className="relative z-10 px-2 md:px-8 flex flex-col gap-1">
        {playlist.songs?.map((song: any, index: number) => {
          const isLastItem = index === playlist.songs.length - 1;
          const songTitle = decodeEntities(song.name || song.title);
          const artists = decodeEntities(getArtists(song));
          const plays = formatNumber(song.playCount);
          
          // Verify if this is the currently playing song globally
          const isCurrentlyPlaying = currentSong?.id === song.id;

          return (
            <div 
              key={`${song.id}-${index}`} 
              ref={isLastItem ? lastElementRef : null}
              onClick={() => handlePlaySong(song, index)} 
              className={`flex items-center gap-3 md:gap-4 p-2 md:p-3 rounded-xl cursor-pointer group transition-all ${
                isCurrentlyPlaying ? "bg-white/10" : "hover:bg-white/5"
              }`}
            >
              {/* Index number or Playing Indicator */}
              <div className="w-6 md:w-10 text-center flex justify-center items-center text-neutral-500 font-medium text-[13px] hidden sm:flex group-hover:text-white">
                {isCurrentlyPlaying ? (
                  <div className="flex items-end gap-[2px] h-4">
                    <div className="w-1 bg-[#1ed760] animate-[bounce_1s_infinite] h-full" />
                    <div className="w-1 bg-[#1ed760] animate-[bounce_1.2s_infinite] h-2/3" />
                    <div className="w-1 bg-[#1ed760] animate-[bounce_0.8s_infinite] h-1/2" />
                  </div>
                ) : (
                  index + 1
                )}
              </div>
              
              {/* Thumbnail */}
              <div className="relative w-12 h-12 flex-shrink-0 bg-neutral-800 rounded-md overflow-hidden">
                <img src={getImageUrl(song.image)} alt={songTitle} className="w-full h-full object-cover" loading="lazy" />
                <div className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity ${isCurrentlyPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                  {isCurrentlyPlaying ? (
                    <Pause fill="#1ed760" size={18} className="text-[#1ed760]" />
                  ) : (
                    <Play fill="white" size={18} className="text-white ml-0.5" />
                  )}
                </div>
              </div>
              
              {/* Title & Artist (with Dynamic Marquee & Green Text if Playing) */}
              <div className="flex-1 overflow-hidden pr-2 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-0.5">
                  <TrackMarquee text={songTitle} isPlaying={isCurrentlyPlaying} />
                  {song.explicitContent && <BadgeAlert size={14} className="text-neutral-500 flex-shrink-0" title="Explicit" />}
                </div>
                <TrackMarquee text={artists} isSubtitle={true} />
              </div>

              {/* Plays (Hidden on Mobile) */}
              <div className="flex-1 hidden lg:block overflow-hidden pr-4 text-[13px] text-neutral-400">
                {plays ? `${plays} plays` : ""}
              </div>
              
              {/* Duration */}
              <div className="w-12 text-right md:mr-4">
                <span className={`text-[13px] font-medium ${isCurrentlyPlaying ? "text-[#1ed760]" : "text-neutral-400"}`}>
                  {formatDuration(song.duration)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 7. Loading More Spinner */}
      {loadingMore && (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="animate-spin text-[#1ed760]" size={32} />
        </div>
      )}

      {/* 8. Footer Info (End of Playlist) */}
      {!hasMore && playlist.songs?.length > 0 && (
        <div className="px-4 md:px-12 py-12 pb-24 border-t border-white/10 mt-8 text-neutral-500 text-xs font-medium flex flex-col gap-1 items-center md:items-start text-center md:text-left">
          <p>{playlist.songs.length} Tracks • {totalDurationStr}</p>
          {playlist.copyright && <p>© {playlist.copyright}</p>}
          <p>Data provided by Music@8481 APIs</p>
        </div>
      )}
    </div>
  );
}

export default function PlaylistPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#121212] p-4 md:p-8 pt-24 animate-pulse flex flex-col items-center">
        <div className="w-40 h-40 bg-white/10 rounded-xl mb-6" />
        <div className="w-48 h-6 bg-white/10 rounded-full mb-2" />
        <div className="w-32 h-4 bg-white/10 rounded-full" />
      </div>
    }>
      <PlaylistContent />
    </Suspense>
  );
}
