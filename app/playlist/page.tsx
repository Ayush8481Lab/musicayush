"use client";
import React, { useEffect, useState, Suspense, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Play, Pause, ArrowLeft, Loader2, Shuffle, Share2, 
  Info, BadgeAlert, Heart, MoreHorizontal, Clock 
} from "lucide-react";
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

// Fixed: Removes duplicate artists (e.g. Guru Randhawa, Guru Randhawa -> Guru Randhawa)
const getArtists = (data: any) => {
  let names: string[] =[];
  if (data?.artists?.primary && Array.isArray(data.artists.primary)) {
    names = data.artists.primary.map((a: any) => a.name);
  } else if (Array.isArray(data?.artists)) {
    names = data.artists.slice(0, 4).map((a: any) => a.name);
  } else if (typeof data?.artists === "string") {
    names = data.artists.split(",").map((n: string) => n.trim());
  } else if (data?.primaryArtists) {
    names = data.primaryArtists.split(",").map((n: string) => n.trim());
  } else if (data?.singers) {
    names = data.singers.split(",").map((n: string) => n.trim());
  } else {
    return "Various Artists";
  }
  // Remove duplicates using Set
  return Array.from(new Set(names)).join(", ");
};

// --- Custom Components --- //

// 1. SMART PING-PONG MARQUEE
const PingPongMarquee = ({ text, isPlaying, isSub }: { text: string, isPlaying?: boolean, isSub?: boolean }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [overflowWidth, setOverflowWidth] = useState(0);

  // Measure text vs container to only animate if text is actually cut off
  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        const cWidth = containerRef.current.offsetWidth;
        const tWidth = textRef.current.scrollWidth;
        if (tWidth > cWidth) {
          setOverflowWidth(tWidth - cWidth + 10); // 10px breathing room
        } else {
          setOverflowWidth(0);
        }
      }
    };
    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [text]);

  let textColor = "text-white group-hover:text-white";
  if (isPlaying && !isSub) textColor = "text-[#1ed760]";
  else if (isSub) textColor = "text-white/60 group-hover:text-white/90";

  const textSize = isSub ? "text-[13px]" : "text-[15px] font-semibold";

  return (
    <div ref={containerRef} className="relative overflow-hidden whitespace-nowrap w-full mask-linear-fade">
      <div 
        ref={textRef}
        className={`inline-block ${overflowWidth > 0 ? "animate-ping-pong" : ""} ${textColor} ${textSize} transition-colors duration-300`}
        style={{ '--overflow-dist': `-${overflowWidth}px` } as React.CSSProperties}
      >
        {text}
      </div>
    </div>
  );
};

// 2. Animated Equalizer for currently playing song
const PlayingVisualizer = () => (
  <div className="flex items-end justify-center gap-[2px] w-6 h-4">
    <div className="w-[3px] bg-[#1ed760] rounded-t-sm eq-bar-1"></div>
    <div className="w-[3px] bg-[#1ed760] rounded-t-sm eq-bar-2"></div>
    <div className="w-[3px] bg-[#1ed760] rounded-t-sm eq-bar-3"></div>
    <div className="w-[3px] bg-[#1ed760] rounded-t-sm eq-bar-4"></div>
  </div>
);

// 3. Skeleton Loader
const PlaylistSkeleton = () => (
  <div className="min-h-screen bg-[#0a0a0a] p-4 md:p-8 pt-24 animate-pulse">
    <div className="flex flex-col md:flex-row gap-6 items-center md:items-end">
      <div className="w-40 h-40 md:w-64 md:h-64 bg-white/10 rounded-2xl shadow-2xl" />
      <div className="flex flex-col gap-4 w-full max-w-xl items-center md:items-start">
        <div className="w-24 h-4 bg-white/10 rounded-full" />
        <div className="w-full h-12 bg-white/10 rounded-xl" />
        <div className="w-2/3 h-4 bg-white/10 rounded-full" />
      </div>
    </div>
    <div className="mt-12 flex flex-col gap-2">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="w-full h-16 bg-white/5 rounded-xl" />
      ))}
    </div>
  </div>
);

// --- Main Content Component --- //
function PlaylistContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const link = searchParams.get("link");
  
  const { currentSong, setCurrentSong, isPlaying, setIsPlaying, setQueue } = useAppContext() as any;
  
  const [playlist, setPlaylist] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const[loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const[isLiked, setIsLiked] = useState(false);

  const observerRef = useRef<IntersectionObserver | null>(null);

  // Scroll listener for sticky header
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 180);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  },[]);

  // Fetch API Logic
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
            const newSongs = newData.songs?.filter((s: any) => !existingIds.has(s.id)) ||[];
            return { ...prev, songs: [...prev.songs, ...newSongs] };
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

  // Infinite Scroll Observer
  const lastElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || loadingMore || !hasMore) return;
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prev => prev + 1);
      }
    }, { rootMargin: "400px" });

    if (node) observerRef.current.observe(node);
  }, [loading, loadingMore, hasMore]);

  // Actions
  const handlePlaySong = (song: any, index: number) => {
    setCurrentSong(song);
    setIsPlaying(true);
    // Setting Queue enables auto-play if your audio tag has an onEnded handler!
    if (setQueue && playlist?.songs) setQueue(playlist.songs);
  };

  const handlePlayPlaylist = () => {
    if (!playlist?.songs?.length) return;
    handlePlaySong(playlist.songs[0], 0);
  };

  const handleShuffle = () => {
    if (!playlist?.songs?.length) return;
    const shuffled = [...playlist.songs].sort(() => Math.random() - 0.5);
    if (setQueue) setQueue(shuffled);
    setCurrentSong(shuffled[0]);
    setIsPlaying(true);
  };

  const handleShare = async () => {
    const shareData = {
      title: decodeEntities(playlist?.name || playlist?.title),
      url: window.location.href,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch (err) {}
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  if (loading && page === 1) return <PlaylistSkeleton />;

  if (!playlist) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-[#0a0a0a] text-white gap-4">
        <Info size={48} className="text-white/30" />
        <p className="text-xl font-bold">Playlist not found</p>
        <button onClick={() => router.back()} className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold backdrop-blur-md transition-all">Go Back</button>
      </div>
    );
  }

  const coverImage = getImageUrl(playlist.image);
  const title = decodeEntities(playlist.name || playlist.title);
  const description = decodeEntities(playlist.description || "");
  const playlistArtists = decodeEntities(getArtists(playlist));
  const totalSeconds = playlist.songs?.reduce((acc: number, song: any) => acc + (song.duration || 0), 0);
  const totalDurationStr = totalSeconds ? `${Math.floor(totalSeconds / 60)} mins` : "";

  return (
    <div className="pb-36 bg-[#0a0a0a] min-h-screen relative text-white selection:bg-[#1ed760]/30 font-sans">
      
      {/* Ping-Pong CSS & EQ CSS */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes ping-pong {
          0%, 15% { transform: translateX(0); }
          85%, 100% { transform: translateX(var(--overflow-dist)); }
        }
        .animate-ping-pong { animation: ping-pong 6s ease-in-out infinite alternate; }
        .mask-linear-fade { mask-image: linear-gradient(to right, transparent, black 2%, black 98%, transparent); -webkit-mask-image: linear-gradient(to right, transparent, black 2%, black 98%, transparent); }
        
        @keyframes eq { 0%, 100% { height: 4px; } 50% { height: 16px; } }
        .eq-bar-1 { animation: eq 1s ease-in-out infinite 0s; }
        .eq-bar-2 { animation: eq 1s ease-in-out infinite 0.2s; }
        .eq-bar-3 { animation: eq 1s ease-in-out infinite 0.4s; }
        .eq-bar-4 { animation: eq 1s ease-in-out infinite 0.1s; }
      `}} />

      {/* 1. Dynamic Extracted Color Background */}
      <div className="fixed top-0 left-0 w-full h-[80vh] pointer-events-none overflow-hidden z-0">
        <img 
          src={coverImage} 
          alt="blur-bg" 
          className="w-full h-full object-cover blur-[100px] saturate-[250%] opacity-60 scale-[1.2] transform-gpu will-change-transform" 
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-[#0a0a0a]/80 to-[#0a0a0a]" />
      </div>

      {/* 2. Glassmorphic Sticky Header (With Banner included!) */}
      <nav className={`fixed top-0 left-0 w-full z-50 flex items-center justify-between px-4 py-3 transition-all duration-500 ${isScrolled ? "bg-[#0a0a0a]/85 backdrop-blur-2xl shadow-2xl border-b border-white/5" : "bg-transparent"}`}>
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <button onClick={() => router.back()} className="p-2.5 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-md transition-all text-white active:scale-90 z-50 flex-shrink-0">
            <ArrowLeft size={22} />
          </button>
          
          <div className={`flex items-center gap-3 overflow-hidden transition-all duration-500 flex-1 min-w-0 ${isScrolled ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}>
            <button onClick={handlePlayPlaylist} className="w-10 h-10 bg-[#1ed760] text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform flex-shrink-0 shadow-[0_4px_15px_rgba(30,215,96,0.3)]">
               <Play fill="black" size={18} className="ml-0.5" />
            </button>
            {/* Added Playlist Banner to Header */}
            <img src={coverImage} className="w-10 h-10 rounded-md object-cover flex-shrink-0 shadow-md border border-white/10 hidden sm:block" alt="banner" />
            <PingPongMarquee text={title} />
          </div>
        </div>

        {/* Share Button in Sticky Header */}
        <div className={`flex items-center transition-all duration-500 ${isScrolled ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
           <button onClick={handleShare} className="p-2.5 ml-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all active:scale-90" title="Share">
              <Share2 size={20} />
           </button>
        </div>
      </nav>

      {/* 3. Hero Header Section */}
      <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8 px-5 md:px-10 pt-24 md:pt-36 pb-8">
        <div className="w-40 h-40 sm:w-48 sm:h-48 md:w-60 md:h-60 lg:w-64 lg:h-64 flex-shrink-0 rounded-2xl md:rounded-3xl overflow-hidden group shadow-[0_30px_60px_rgba(0,0,0,0.6)] border border-white/10">
          <img 
            src={coverImage} 
            alt={title} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" 
          />
        </div>
        
        <div className="flex flex-col items-center md:items-start text-center md:text-left mt-2 md:mt-0 w-full flex-1 min-w-0">
          <span className="text-xs font-black uppercase tracking-[0.25em] text-white/70 mb-2 md:mb-3 drop-shadow-md">
            {playlist.type === "playlist" ? "Public Playlist" : "Album"}
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-black tracking-tighter mb-4 line-clamp-3 leading-[1.1] drop-shadow-2xl">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-white/60 mb-4 max-w-2xl line-clamp-2 leading-relaxed font-medium">
              {description}
            </p>
          )}
          
          <div className="flex items-center flex-wrap justify-center md:justify-start gap-2 text-sm font-semibold text-white/80 mt-1">
            <div className="flex items-center gap-2">
               <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#1ed760] to-blue-500" />
               <span className="text-white hover:underline cursor-pointer line-clamp-1 max-w-[200px] sm:max-w-none">{playlistArtists}</span>
            </div>
            <span className="text-white/40 hidden sm:inline">•</span>
            <span>{playlist.songCount || playlist.songs?.length} songs</span>
            {totalDurationStr && (
              <>
                <span className="text-white/40">•</span>
                <span>{totalDurationStr}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 4. Action Bar (Restored Share Button) */}
      <div className="relative z-10 px-5 md:px-10 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 md:gap-5">
          <button 
            onClick={handlePlayPlaylist} 
            className="w-14 h-14 md:w-16 md:h-16 bg-[#1ed760] hover:bg-[#3be477] text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_8px_40px_rgba(30,215,96,0.4)]"
          >
            <Play fill="black" size={28} className="ml-1" />
          </button>
          
          <button onClick={handleShuffle} className="p-3 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all active:scale-90" title="Shuffle Play">
            <Shuffle size={26} />
          </button>
          
          <button onClick={() => setIsLiked(!isLiked)} className={`p-3 rounded-full transition-all active:scale-90 ${isLiked ? "text-[#1ed760]" : "text-white/60 hover:text-white hover:bg-white/10"}`}>
            <Heart size={28} fill={isLiked ? "#1ed760" : "none"} />
          </button>
          
          {/* Share Button Brought Back Here */}
          <button onClick={handleShare} className="p-3 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all active:scale-90" title="Share Playlist">
             <Share2 size={26} />
          </button>
        </div>

        <button className="p-3 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all active:scale-90">
            <MoreHorizontal size={28} />
        </button>
      </div>

      {/* 5. Tracklist Header */}
      <div className="relative z-10 px-6 md:px-12 mt-6 hidden md:flex items-center text-[12px] font-bold uppercase tracking-widest text-white/40 border-b border-white/5 pb-3 mb-4 sticky top-[68px] bg-[#0a0a0a]/90 backdrop-blur-xl">
        <div className="w-12 text-center">#</div>
        <div className="flex-1 ml-4">Title</div>
        <div className="flex-1 hidden lg:block">Plays</div>
        <div className="w-16 text-right mr-4"><Clock size={16} className="inline-block" /></div>
      </div>

      {/* 6. Beautiful Songs List */}
      <div className="relative z-10 px-3 md:px-10 flex flex-col gap-1.5">
        {playlist.songs?.map((song: any, index: number) => {
          const isLastItem = index === playlist.songs.length - 1;
          const songTitle = decodeEntities(song.name || song.title);
          const artists = decodeEntities(getArtists(song));
          const plays = formatNumber(song.playCount);
          
          const isCurrentPlaying = currentSong?.id === song.id;

          return (
            <div 
              key={`${song.id}-${index}`} 
              ref={isLastItem ? lastElementRef : null}
              onClick={() => handlePlaySong(song, index)} 
              className={`flex items-center gap-3 md:gap-4 p-2.5 md:p-3 rounded-xl cursor-pointer group transition-all duration-300 ${isCurrentPlaying ? "bg-white/10" : "hover:bg-white/5"}`}
            >
              {/* Index number or Playing Visualizer */}
              <div className="w-8 md:w-12 flex justify-center items-center flex-shrink-0">
                {isCurrentPlaying ? (
                  <PlayingVisualizer />
                ) : (
                  <span className="text-white/40 font-semibold text-[14px] group-hover:hidden">{index + 1}</span>
                )}
                <Play fill="white" size={16} className={`text-white hidden ${!isCurrentPlaying && 'group-hover:block'} ml-0.5`} />
              </div>
              
              {/* Thumbnail */}
              <div className="relative w-11 h-11 md:w-12 md:h-12 flex-shrink-0 bg-white/5 rounded-md overflow-hidden shadow-md">
                <img src={getImageUrl(song.image)} alt={songTitle} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
              </div>
              
              {/* Marquee Title & Artist */}
              <div className="flex-1 min-w-0 pr-2 flex flex-col justify-center gap-0.5 overflow-hidden">
                <div className="flex items-center gap-2 w-full">
                  <PingPongMarquee text={songTitle} isPlaying={isCurrentPlaying} />
                  {song.explicitContent && <BadgeAlert size={14} className="text-white/40 flex-shrink-0" />}
                </div>
                <PingPongMarquee text={artists} isPlaying={isCurrentPlaying} isSub={true} />
              </div>

              {/* Plays (Hidden on Mobile) */}
              <div className="flex-1 hidden lg:block overflow-hidden pr-4 text-[13px] font-medium text-white/40 group-hover:text-white/80 transition-colors">
                {plays ? `${plays}` : ""}
              </div>
              
              {/* Duration */}
              <div className="w-12 text-right md:mr-4">
                <span className={`text-[13px] font-medium transition-colors ${isCurrentPlaying ? "text-[#1ed760]" : "text-white/40 group-hover:text-white/80"}`}>
                  {formatDuration(song.duration)}
                </span>
              </div>

              {/* Quick Actions (Hover) */}
              <div className="hidden md:flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                 <button className="p-2 text-white/60 hover:text-white"><Heart size={18} /></button>
                 <button className="p-2 text-white/60 hover:text-white"><MoreHorizontal size={18} /></button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 7. Loading More Spinner */}
      {loadingMore && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="animate-spin text-[#1ed760]" size={36} />
        </div>
      )}

      {/* 8. Footer Info */}
      {!hasMore && playlist.songs?.length > 0 && (
        <div className="px-5 md:px-12 py-16 pb-32 mt-8 text-center md:text-left flex flex-col gap-2 border-t border-white/5">
          <p className="text-white/40 text-sm font-bold tracking-wide uppercase">{playlist.songs.length} Tracks • {totalDurationStr}</p>
          {playlist.copyright && <p className="text-white/30 text-xs font-medium max-w-2xl">{playlist.copyright}</p>}
        </div>
      )}
    </div>
  );
}

export default function PlaylistPage() {
  return (
    <Suspense fallback={<PlaylistSkeleton />}>
      <PlaylistContent />
    </Suspense>
  );
}
