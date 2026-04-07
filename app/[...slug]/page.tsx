
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState, Suspense, useRef, useCallback, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Play, ArrowLeft, Loader2, Shuffle, Share2, Info, BadgeAlert, Heart, Clock } from "lucide-react";
import { useAppContext } from "../../context/AppContext";

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

  const textSize = isSub ? "text-[13px] sm:text-[14px] font-normal" : "text-[15px] sm:text-[16px] font-medium tracking-tight";

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
  <div className="min-h-screen bg-[#121212] p-6 md:p-8 pt-24 animate-pulse select-none">
    <div className="flex flex-col md:flex-row gap-6 items-center md:items-end mb-8">
      <div className="w-40 h-40 md:w-64 md:h-64 bg-white/5 shadow-2xl rounded-lg" />
      <div className="flex flex-col gap-4 w-full max-w-xl items-center md:items-start">
        <div className="w-20 h-4 bg-white/5 rounded-full" />
        <div className="w-3/4 h-12 md:h-16 bg-white/5 rounded-xl" />
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

function PlaylistContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const link = useMemo(() => {
    if (!pathname) return "";
    let fullUrl = `https://www.jiosaavn.com${pathname}`;
    const queryString = searchParams.toString();
    if (queryString) {
      fullUrl += `?${queryString}`;
    }
    return fullUrl;
  },[pathname, searchParams]);
  
  const { currentSong, setCurrentSong, setIsPlaying, setQueue, setPlayContext, likedPlaylists, toggleLikePlaylist } = useAppContext() as any;
  
  const [playlist, setPlaylist] = useState<any>(null);
  const[page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const[hasMore, setHasMore] = useState(true);
  
  const [headerOpacity, setHeaderOpacity] = useState(0);
  const [showStickyPlay, setShowStickyPlay] = useState(false);

  const observerRef = useRef<IntersectionObserver | null>(null);

  const isPlaylistLiked = playlist && playlist.id ? likedPlaylists.some((p: any) => p && p.id === playlist.id) : false;

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          const opacity = Math.min(scrollY / 250, 1);
          setHeaderOpacity(opacity);
          setShowStickyPlay(scrollY > 300);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  },[]);

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
        setHasMore(false);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };
    fetchPlaylist();
  },[link, page]);

  const lastElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || loadingMore || !hasMore) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) setPage(prev => prev + 1);
    }, { rootMargin: "400px" });
    if (node) observerRef.current.observe(node);
  }, [loading, loadingMore, hasMore]);

  const handlePlaySong = useCallback((song: any) => {
    if (playlist) {
      setPlayContext({ type: "Playlist", name: playlist.name || playlist.title });
      setQueue(playlist.songs);
    }
    setCurrentSong(song);
    setIsPlaying(true);
  }, [setCurrentSong, setIsPlaying, setQueue, setPlayContext, playlist]);

  const handlePlayPlaylist = useCallback(() => {
    if (!playlist?.songs?.length) return;
    handlePlaySong(playlist.songs[0]);
  }, [playlist?.songs, handlePlaySong]);

  const handleShuffle = useCallback(() => {
    if (!playlist?.songs?.length) return;
    const shuffled = [...playlist.songs].sort(() => Math.random() - 0.5);
    setPlayContext({ type: "Playlist", name: playlist.name || playlist.title });
    setQueue(shuffled);
    setCurrentSong(shuffled[0]);
    setIsPlaying(true);
  },[playlist, setQueue, setPlayContext, setCurrentSong, setIsPlaying]);

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
          className={`grid grid-cols-[36px_1fr_auto] md:grid-cols-[48px_1fr_100px_80px] gap-2 md:gap-4 items-center p-2 rounded-md cursor-pointer group transition-colors duration-200 ${isCurrentPlaying ? "bg-white/10" : "hover:bg-white/10"}`}
        >
          <div className="flex justify-center items-center h-full relative text-neutral-400">
            {isCurrentPlaying ? (
              <PlayingVisualizer />
            ) : (
              <span className="text-[14px] md:text-[16px] font-normal group-hover:opacity-0 transition-opacity">{index + 1}</span>
            )}
            <Play fill="white" size={16} className={`text-white absolute opacity-0 ${!isCurrentPlaying && 'group-hover:opacity-100'} transition-opacity`} />
          </div>
          
          <div className="flex items-center gap-3 overflow-hidden pr-2">
            <div className="relative w-10 h-10 md:w-12 md:h-12 flex-shrink-0 bg-neutral-800 rounded shadow-sm overflow-hidden pointer-events-none">
              <img src={getImageUrl(song.image)} alt="track" className="w-full h-full object-cover" draggable={false} />
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center overflow-hidden">
              <div className="flex items-center gap-2">
                <PingPongMarquee text={songTitle} isPlaying={isCurrentPlaying} />
                {song.explicitContent && <BadgeAlert size={14} className="text-neutral-400 flex-shrink-0" />}
              </div>
              <PingPongMarquee text={artists} isPlaying={isCurrentPlaying} isSub={true} />
            </div>
          </div>

          <div className="hidden md:flex items-center text-[13px] md:text-[14px] text-neutral-400 group-hover:text-white transition-colors">
            {plays}
          </div>
          
          <div className="flex items-center justify-end gap-3 md:gap-6 pr-2 md:pr-4">
             <button className="text-neutral-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
               <Heart size={18} />
             </button>
            <span className={`text-[13px] md:text-[14px] tabular-nums font-medium ${isCurrentPlaying ? "text-[#1ed760]" : "text-neutral-400"}`}>
              {formatDuration(song.duration)}
            </span>
          </div>
        </div>
      );
    });
  },[playlist?.songs, currentSongId, lastElementRef, handlePlaySong]);

  if (loading && page === 1) return <PlaylistSkeleton />;
  if (!playlist) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-[#121212] text-white gap-4 select-none">
        <Info size={48} className="text-white/30" />
        <p className="text-xl font-bold">Playlist not found</p>
        <button onClick={() => router.back()} className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold backdrop-blur-md transition-all">Go Back</button>
      </div>
    );
  }

  const coverImage = getImageUrl(playlist.image);
  const title = decodeEntities(playlist.name || playlist.title);
  const rawDesc = decodeEntities(playlist.description || "");
  const playlistArtists = decodeEntities(getArtists(playlist));
  
  let mainDesc = rawDesc;
  let coverArtistsDesc = "";
  if (rawDesc.includes("Artists on Cover:")) {
    const parts = rawDesc.split("Artists on Cover:");
    mainDesc = parts[0].trim();
    coverArtistsDesc = "Artists on Cover: " + parts[1].trim();
  }

  const totalSeconds = playlist.songs?.reduce((acc: number, song: any) => acc + (song.duration || 0), 0);
  let totalDurationStr = "";
  if (totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    totalDurationStr = h > 0 ? `${h} hr ${m} min` : `${m} min`;
  }

  return (
    <div className="pb-40 bg-[#121212] min-h-screen relative text-white select-none[-webkit-touch-callout:none] font-sans">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes ping-pong { 0%, 10% { transform: translateX(0); } 90%, 100% { transform: translateX(var(--overflow-dist)); } }
        .animate-ping-pong { animation: ping-pong 12s ease-in-out infinite alternate; }
        .mask-linear-fade { mask-image: linear-gradient(to right, transparent, black 2%, black 98%, transparent); -webkit-mask-image: linear-gradient(to right, transparent, black 2%, black 98%, transparent); }
        @keyframes eq { 0%, 100% { height: 4px; } 50% { height: 16px; } }
        .eq-bar-1 { animation: eq 1s ease-in-out infinite 0s; }
        .eq-bar-2 { animation: eq 1s ease-in-out infinite 0.2s; }
        .eq-bar-3 { animation: eq 1s ease-in-out infinite 0.4s; }
        .eq-bar-4 { animation: eq 1s ease-in-out infinite 0.1s; }
      `}} />

      <div className="absolute top-0 left-0 w-full h-[450px] md:h-[500px] pointer-events-none overflow-hidden z-0 select-none">
        <div className="absolute inset-0 bg-[#121212]" />
        <img src={coverImage} alt="bg" className="absolute inset-0 w-full h-full object-cover blur-[80px] saturate-[200%] opacity-85 transform-gpu" draggable={false} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-[#121212]/60 to-[#121212]" />
      </div>

      <nav 
        className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-4 py-3 transition-all duration-100"
        style={{ backgroundColor: `rgba(18, 18, 18, ${headerOpacity})`, borderBottom: `1px solid rgba(255,255,255, ${headerOpacity * 0.05})` }}
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <button onClick={() => router.back()} className="p-2.5 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md transition-all text-white active:scale-90 z-50 flex-shrink-0">
            <ArrowLeft size={24} />
          </button>
          
          <div className={`flex items-center gap-3 overflow-hidden transition-all duration-300 flex-1 min-w-0 ${showStickyPlay ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}>
            <img src={coverImage} alt="thumb" className="w-10 h-10 rounded-md object-cover shadow-md flex-shrink-0 pointer-events-none" draggable={false} />
            <PingPongMarquee text={title} />
          </div>
        </div>
      </nav>

      <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-5 md:gap-8 px-5 md:px-8 pt-24 md:pt-32 pb-4">
        <div className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 lg:w-60 lg:h-60 flex-shrink-0 shadow-[0_8px_40px_rgba(0,0,0,0.5)] bg-neutral-800 rounded-md overflow-hidden pointer-events-none">
          <img src={coverImage} alt="cover" className="w-full h-full object-cover" draggable={false} />
        </div>
        
        <div className="flex flex-col items-center md:items-start text-center md:text-left mt-3 md:mt-0 w-full flex-1 min-w-0">
          <span className="text-xs sm:text-sm font-bold text-white mb-1.5 tracking-wide hidden md:block">
            {playlist.type === "playlist" ? "Playlist" : "Album"}
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[5.5rem] font-black tracking-tighter mb-3 line-clamp-3 leading-[1.1] pb-1">
            {title}
          </h1>
          
          {(mainDesc || coverArtistsDesc) && (
            <div className="text-[13px] sm:text-[14px] text-neutral-300 mb-3 max-w-2xl font-medium px-2 md:px-0">
              {mainDesc && <span className="block mb-0.5 line-clamp-2">{mainDesc}</span>}
              {coverArtistsDesc && <span className="block text-white/60 line-clamp-1">{coverArtistsDesc}</span>}
            </div>
          )}
          
          <div className="flex items-center flex-wrap justify-center md:justify-start gap-1.5 text-[13px] sm:text-[14px] font-medium text-white mt-1">
            <span className="font-bold tracking-wide">{playlistArtists}</span>
            <span className="text-neutral-400 hidden sm:inline">•</span>
            <span className="text-neutral-400">{playlist.songCount || playlist.songs?.length} songs,</span>
            {totalDurationStr && (
              <span className="text-neutral-400 opacity-80">{totalDurationStr}</span>
            )}
          </div>
        </div>
      </div>

      <div className="relative z-10 px-5 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-5 md:gap-6">
          <button onClick={handlePlayPlaylist} className="w-14 h-14 md:w-16 md:h-16 bg-[#1ed760] hover:bg-[#3be477] text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg">
            <Play fill="black" size={28} className="ml-1" />
          </button>
          
          <button onClick={handleShuffle} className="text-neutral-400 hover:text-white transition-colors active:scale-90" title="Shuffle">
            <Shuffle size={28} className="md:w-8 md:h-8" />
          </button>
          
          <button onClick={() => toggleLikePlaylist({ ...playlist, type: playlist.type || "playlist" })} className={`transition-colors active:scale-90 ${isPlaylistLiked ? "text-[#1ed760]" : "text-neutral-400 hover:text-white"}`}>
            <Heart size={30} fill={isPlaylistLiked ? "#1ed760" : "none"} strokeWidth={1.5} className="md:w-[34px] md:h-[34px]" />
          </button>
          
          <button onClick={handleShare} className="text-neutral-400 hover:text-white transition-colors active:scale-90" title="Share">
             <Share2 size={26} className="md:w-7 md:h-7" />
          </button>
        </div>
      </div>

      <div className="relative z-10 px-4 md:px-8 mt-2 hidden md:grid grid-cols-[48px_1fr_100px_80px] gap-4 items-center text-[12px] md:text-[13px] font-medium uppercase tracking-widest text-neutral-400 border-b border-white/10 pb-2 mb-3 sticky top-[68px] bg-[#121212]/95 backdrop-blur-md">
        <div className="text-center">#</div>
        <div>Title</div>
        <div>Plays</div>
        <div className="text-right pr-6"><Clock size={16} className="inline-block" /></div>
      </div>

      <div className="relative z-10 px-2 md:px-6 flex flex-col">
        {renderedSongs}
      </div>

      {loadingMore && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="animate-spin text-[#1ed760]" size={36} />
        </div>
      )}

      {!hasMore && playlist.songs?.length > 0 && (
        <div className="px-5 md:px-12 py-16 mt-6 flex flex-col gap-1 text-neutral-500 text-[12px] md:text-[13px] font-medium border-t border-white/5">
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
