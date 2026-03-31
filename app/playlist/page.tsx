/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState, Suspense, useRef, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Play, ArrowLeft, Loader2, Shuffle, Share2, Info, BadgeAlert, Heart, MoreHorizontal, Clock } from "lucide-react";
import { useAppContext } from "../../context/AppContext";

// --- UTILITIES ---
const decodeEntities = (text: string) => {
  if (!text) return "";
  let decoded = text.replace(/&amp;/g, "&"); 
  return decoded
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&apos;/g, "'");
};

const getImageUrl = (img: any) => {
  if (!img) return "https://via.placeholder.com/500x500?text=Playlist";
  if (typeof img === "string") return img.replace("50x50", "500x500").replace("150x150", "500x500");
  if (Array.isArray(img)) return img[img.length - 1]?.url || img[0]?.url;
  return "https://via.placeholder.com/500x500?text=Playlist";
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
  return Array.from(new Set(names)).join(", ");
};

// --- COMPONENTS ---
const PingPongMarquee = ({ text, isPlaying, isSub }: { text: string, isPlaying?: boolean, isSub?: boolean }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [overflowWidth, setOverflowWidth] = useState(0);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        const cWidth = containerRef.current.offsetWidth;
        const tWidth = textRef.current.scrollWidth;
        setOverflowWidth(tWidth > cWidth ? tWidth - cWidth + 10 : 0);
      }
    };
    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [text]);

  let textColor = "text-white group-hover:text-white";
  if (isPlaying && !isSub) textColor = "text-[#1ed760]";
  else if (isSub) textColor = "text-neutral-400 group-hover:text-white";

  const textSize = isSub ? "text-[14px] font-normal" : "text-[16px] font-medium tracking-tight";

  return (
    <div ref={containerRef} className="relative overflow-hidden whitespace-nowrap w-full mask-linear-fade">
      <div 
        ref={textRef}
        className={`inline-block ${overflowWidth > 0 ? "animate-ping-pong" : ""} ${textColor} ${textSize} transition-colors duration-200`}
        style={{ '--overflow-dist': `-${overflowWidth}px` } as React.CSSProperties}
      >
        {decodeEntities(text)}
      </div>
    </div>
  );
};

const PlayingVisualizer = () => (
  <div className="flex items-end justify-center gap-[2px] w-5 h-4">
    <div className="w-[3px] bg-[#1ed760] rounded-t-sm eq-bar-1"></div>
    <div className="w-[3px] bg-[#1ed760] rounded-t-sm eq-bar-2"></div>
    <div className="w-[3px] bg-[#1ed760] rounded-t-sm eq-bar-3"></div>
    <div className="w-[3px] bg-[#1ed760] rounded-t-sm eq-bar-4"></div>
  </div>
);

const PlaylistSkeleton = () => (
  <div className="min-h-screen bg-[#121212] p-6 md:p-8 pt-24 animate-pulse">
    <div className="flex flex-col md:flex-row gap-6 items-center md:items-end mb-8">
      <div className="w-56 h-56 md:w-64 md:h-64 bg-white/5 shadow-2xl rounded-lg" />
      <div className="flex flex-col gap-4 w-full max-w-xl items-center md:items-start">
        <div className="w-20 h-4 bg-white/5 rounded-full" />
        <div className="w-3/4 h-16 bg-white/5 rounded-xl" />
        <div className="w-1/2 h-4 bg-white/5 rounded-full" />
      </div>
    </div>
    <div className="flex flex-col gap-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="w-full h-14 bg-white/5 rounded-md" />
      ))}
    </div>
  </div>
);

// --- MAIN PAGE ---
function PlaylistContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const link = searchParams.get("link");
  
  const { currentSong, setCurrentSong, setIsPlaying, setQueue } = useAppContext() as any;
  
  const [playlist, setPlaylist] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const[loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  // UI States
  const [headerOpacity, setHeaderOpacity] = useState(0);
  const[showStickyPlay, setShowStickyPlay] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  const observerRef = useRef<IntersectionObserver | null>(null);

  // Smooth Scroll Listener for Pro-Level Opacity Transition
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          // Calculate pure gradient opacity (fully dark at 300px)
          const opacity = Math.min(scrollY / 300, 1);
          setHeaderOpacity(opacity);
          
          // Trigger the small play button & title drop-in exactly when massive banner leaves
          setShowStickyPlay(scrollY > 380);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  },[]);

  // Fetch Logic
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
            return { ...prev, songs:[...prev.songs, ...newSongs] };
          });
          setHasMore(newData.songs && newData.songs.length > 0);
        }
      } catch (error) {
        setHasMore(false);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };
    fetchPlaylist();
  }, [link, page]);

  // Infinite Scroll Hook
  const lastElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || loadingMore || !hasMore) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) setPage(prev => prev + 1);
    }, { rootMargin: "400px" });
    if (node) observerRef.current.observe(node);
  },[loading, loadingMore, hasMore]);

  // Actions
  const handlePlaySong = useCallback((song: any) => {
    setCurrentSong(song);
    setIsPlaying(true);
    if (setQueue && playlist?.songs) setQueue(playlist.songs);
  },[setCurrentSong, setIsPlaying, setQueue, playlist?.songs]);

  const handlePlayPlaylist = useCallback(() => {
    if (!playlist?.songs?.length) return;
    handlePlaySong(playlist.songs[0]);
  },[playlist?.songs, handlePlaySong]);

  const handleShuffle = useCallback(() => {
    if (!playlist?.songs?.length) return;
    const shuffled =[...playlist.songs].sort(() => Math.random() - 0.5);
    if (setQueue) setQueue(shuffled);
    setCurrentSong(shuffled[0]);
    setIsPlaying(true);
  },[playlist?.songs, setQueue, setCurrentSong, setIsPlaying]);

  const handleShare = useCallback(async () => {
    const shareData = {
      title: decodeEntities(playlist?.name || playlist?.title),
      url: window.location.href,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch (err) {}
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied!");
    }
  }, [playlist?.name, playlist?.title]);

  // Memoized Tracklist for 120fps Scrolling
  const currentSongId = currentSong?.id;
  const renderedSongs = useMemo(() => {
    return playlist?.songs?.map((song: any, index: number) => {
      const isLastItem = index === playlist.songs.length - 1;
      const songTitle = song.name || song.title;
      const artists = getArtists(song);
      const plays = formatNumber(song.playCount);
      const isCurrentPlaying = currentSongId === song.id;

      return (
        <div 
          key={`${song.id}-${index}`} 
          ref={isLastItem ? lastElementRef : null}
          onClick={() => handlePlaySong(song)} 
          // Professional CSS Grid structure replacing flex for perfect table alignment
          className={`grid grid-cols-[40px_1fr_auto] md:grid-cols-[48px_1fr_120px_100px] gap-3 md:gap-4 items-center p-2 rounded-md cursor-pointer group transition-colors duration-200 ${isCurrentPlaying ? "bg-white/10" : "hover:bg-white/10"}`}
        >
          
          {/* Column 1: Index / Play Icon / EQ */}
          <div className="flex justify-center items-center h-full relative text-neutral-400">
            {isCurrentPlaying ? (
              <PlayingVisualizer />
            ) : (
              <span className="text-[16px] font-normal group-hover:opacity-0 transition-opacity">{index + 1}</span>
            )}
            <Play fill="white" size={16} className={`text-white absolute opacity-0 ${!isCurrentPlaying && 'group-hover:opacity-100'} transition-opacity`} />
          </div>
          
          {/* Column 2: Title & Artist (with Image) */}
          <div className="flex items-center gap-3 overflow-hidden pr-2">
            <div className="relative w-10 h-10 md:w-12 md:h-12 flex-shrink-0 bg-neutral-800 rounded shadow-md overflow-hidden">
              <img src={getImageUrl(song.image)} alt={decodeEntities(songTitle)} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center overflow-hidden">
              <div className="flex items-center gap-2">
                <PingPongMarquee text={songTitle} isPlaying={isCurrentPlaying} />
                {song.explicitContent && <BadgeAlert size={14} className="text-neutral-400 flex-shrink-0" />}
              </div>
              <PingPongMarquee text={artists} isPlaying={isCurrentPlaying} isSub={true} />
            </div>
          </div>

          {/* Column 3: Plays (Desktop Only) */}
          <div className="hidden md:flex items-center text-[14px] text-neutral-400 group-hover:text-white transition-colors">
            {plays}
          </div>
          
          {/* Column 4: Actions & Duration */}
          <div className="flex items-center justify-end gap-4 md:gap-6 pr-2 md:pr-4">
             <button className="text-neutral-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
               <Heart size={18} />
             </button>
            <span className={`text-[14px] tabular-nums font-medium ${isCurrentPlaying ? "text-[#1ed760]" : "text-neutral-400"}`}>
              {formatDuration(song.duration)}
            </span>
            <button className="text-neutral-400 hover:text-white opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreHorizontal size={20} />
            </button>
          </div>

        </div>
      );
    });
  }, [playlist?.songs, currentSongId, lastElementRef, handlePlaySong]);

  if (loading && page === 1) return <PlaylistSkeleton />;
  if (!playlist) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-[#121212] text-white gap-4">
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
  const totalDurationStr = totalSeconds ? `${Math.floor(totalSeconds / 60)} min` : "";

  return (
    <div className="pb-40 bg-[#121212] min-h-screen relative text-white selection:bg-[#1ed760]/30 font-sans">

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes ping-pong { 0%, 15% { transform: translateX(0); } 85%, 100% { transform: translateX(var(--overflow-dist)); } }
        .animate-ping-pong { animation: ping-pong 6s ease-in-out infinite alternate; }
        .mask-linear-fade { mask-image: linear-gradient(to right, transparent, black 2%, black 98%, transparent); -webkit-mask-image: linear-gradient(to right, transparent, black 2%, black 98%, transparent); }
        @keyframes eq { 0%, 100% { height: 4px; } 50% { height: 16px; } }
        .eq-bar-1 { animation: eq 1s ease-in-out infinite 0s; }
        .eq-bar-2 { animation: eq 1s ease-in-out infinite 0.2s; }
        .eq-bar-3 { animation: eq 1s ease-in-out infinite 0.4s; }
        .eq-bar-4 { animation: eq 1s ease-in-out infinite 0.1s; }
      `}} />

      {/* 1. PROFESSIONAL TOP GRADIENT FADE */}
      {/* Contained strictly to the top 450px so it perfectly fades into #121212 before the tracklist */}
      <div className="absolute top-0 left-0 w-full h-[450px] pointer-events-none overflow-hidden z-0 select-none">
        <div className="absolute inset-0 bg-[#121212]" />
        <img src={coverImage} alt="bg" className="absolute inset-0 w-full h-full object-cover blur-[60px] saturate-[150%] opacity-50 transform-gpu" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#121212]/80 to-[#121212]" />
      </div>

      {/* 2. DYNAMIC STICKY HEADER */}
      <nav 
        className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-4 py-4 transition-all duration-100"
        style={{ backgroundColor: `rgba(20, 20, 20, ${headerOpacity})`, borderBottom: `1px solid rgba(255,255,255, ${headerOpacity * 0.05})` }}
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <button onClick={() => router.back()} className="p-2.5 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md transition-all text-white active:scale-90 z-50 flex-shrink-0">
            <ArrowLeft size={24} />
          </button>
          
          <div className={`flex items-center gap-3 overflow-hidden transition-all duration-300 flex-1 min-w-0 ${showStickyPlay ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}>
            <button onClick={handlePlayPlaylist} className="w-11 h-11 bg-[#1ed760] text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform flex-shrink-0 shadow-lg">
               <Play fill="black" size={20} className="ml-1" />
            </button>
            <PingPongMarquee text={title} />
          </div>
        </div>
      </nav>

      {/* 3. HERO BANNER SECTION */}
      <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8 px-5 md:px-8 pt-28 md:pt-36 pb-6">
        <div className="w-56 h-56 md:w-60 md:h-60 flex-shrink-0 shadow-[0_8px_40px_rgba(0,0,0,0.5)] bg-neutral-800 rounded-md overflow-hidden">
          <img src={coverImage} alt={title} className="w-full h-full object-cover" />
        </div>
        
        <div className="flex flex-col items-center md:items-start text-center md:text-left mt-2 md:mt-0 w-full flex-1 min-w-0">
          <span className="text-sm font-bold text-white mb-2 tracking-wide hidden md:block">
            {playlist.type === "playlist" ? "Playlist" : "Album"}
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[6rem] font-black tracking-tighter mb-4 line-clamp-3 leading-[1.05] pb-1">
            {title}
          </h1>
          {description && (
            <p className="text-[14px] text-neutral-300 mb-3 max-w-3xl line-clamp-2 font-medium">
              {description}
            </p>
          )}
          
          <div className="flex items-center flex-wrap justify-center md:justify-start gap-1.5 text-[14px] font-medium text-white mt-1">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#1ed760] to-blue-500 hidden sm:block" />
            <span className="font-bold hover:underline cursor-pointer tracking-wide">{playlistArtists}</span>
            <span className="text-neutral-400 hidden sm:inline">•</span>
            <span className="text-neutral-400">{playlist.songCount || playlist.songs?.length} songs,</span>
            {totalDurationStr && (
              <span className="text-neutral-400 opacity-80">{totalDurationStr}</span>
            )}
          </div>
        </div>
      </div>

      {/* 4. MAIN ACTION BAR */}
      <div className="relative z-10 px-5 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button onClick={handlePlayPlaylist} className="w-14 h-14 md:w-16 md:h-16 bg-[#1ed760] hover:bg-[#3be477] text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg">
            <Play fill="black" size={28} className="ml-1" />
          </button>
          
          <button onClick={handleShuffle} className="text-neutral-400 hover:text-white transition-colors active:scale-90" title="Shuffle">
            <Shuffle size={32} />
          </button>
          
          <button onClick={() => setIsLiked(!isLiked)} className={`transition-colors active:scale-90 ${isLiked ? "text-[#1ed760]" : "text-neutral-400 hover:text-white"}`}>
            <Heart size={34} fill={isLiked ? "#1ed760" : "none"} strokeWidth={1.5} />
          </button>
          
          <button onClick={handleShare} className="text-neutral-400 hover:text-white transition-colors active:scale-90" title="Share">
             <Share2 size={28} />
          </button>

          <button className="text-neutral-400 hover:text-white transition-colors active:scale-90">
            <MoreHorizontal size={32} />
          </button>
        </div>
      </div>

      {/* 5. TABLE HEADER (CSS GRID ALIGNED) */}
      <div className="relative z-10 px-4 md:px-8 mt-4 hidden md:grid grid-cols-[48px_1fr_120px_100px] gap-4 items-center text-[13px] font-medium uppercase tracking-widest text-neutral-400 border-b border-white/10 pb-2 mb-4 sticky top-[72px] bg-[#121212]/95 backdrop-blur-md">
        <div className="text-center">#</div>
        <div>Title</div>
        <div>Plays</div>
        <div className="text-right pr-10"><Clock size={16} className="inline-block" /></div>
      </div>

      {/* 6. TRACKLIST */}
      <div className="relative z-10 px-2 md:px-6 flex flex-col">
        {renderedSongs}
      </div>

      {/* 7. LOADING & FOOTER */}
      {loadingMore && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="animate-spin text-[#1ed760]" size={36} />
        </div>
      )}

      {!hasMore && playlist.songs?.length > 0 && (
        <div className="px-5 md:px-12 py-16 mt-8 flex flex-col gap-1 text-neutral-500 text-[13px] font-medium">
          <p>{playlist.songs.length} tracks • {totalDurationStr}</p>
          {playlist.copyright && <p className="max-w-2xl mt-2">{decodeEntities(playlist.copyright)}</p>}
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
