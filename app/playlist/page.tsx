"use client";
import { useEffect, useState, Suspense, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Play, ArrowLeft, Loader2, MoreVertical, Clock, Shuffle, Share2, Info } from "lucide-react";
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

const getArtists = (song: any) => {
  if (song.artists?.primary && Array.isArray(song.artists.primary)) {
    return song.artists.primary.map((a: any) => a.name).join(", ");
  }
  if (typeof song.artists === "string") return song.artists;
  if (song.primaryArtists) return song.primaryArtists;
  if (song.singers) return song.singers;
  return "Unknown Artist";
};

// --- Main Content Component --- //
function PlaylistContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const link = searchParams.get("link");
  const { setCurrentSong, setIsPlaying } = useAppContext();
  
  const[playlist, setPlaylist] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const[isScrolled, setIsScrolled] = useState(false);

  const observerRef = useRef<IntersectionObserver | null>(null);

  // Scroll listener for sticky header transparency
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 250);
    window.addEventListener("scroll", handleScroll);
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
            
            // Deduplicate songs by ID to prevent key errors
            const existingIds = new Set(prev.songs.map((s: any) => s.id));
            const newSongs = newData.songs?.filter((s: any) => !existingIds.has(s.id)) || [];
            
            return {
              ...prev,
              songs:[...prev.songs, ...newSongs]
            };
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
    }, { rootMargin: "400px", threshold: 0 });

    if (node) observerRef.current.observe(node);
  },[loading, loadingMore, hasMore]);


  if (loading && page === 1) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#121212] text-white">
        <Loader2 className="animate-spin text-neutral-400" size={36} />
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

  return (
    <div className="pb-32 bg-[#121212] min-h-screen relative text-white selection:bg-white/30">
      
      {/* 1. Dynamic Spotify-like Background Blur Gradient */}
      <div className="absolute top-0 left-0 w-full h-[600px] pointer-events-none overflow-hidden z-0">
        <img 
          src={coverImage} 
          alt="blur-bg" 
          className="w-full h-full object-cover blur-[80px] opacity-40 scale-125 transform brightness-75" 
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-[#121212]/80 to-[#121212]" />
      </div>

      {/* 2. Sticky Top Navigation */}
      <nav className={`fixed top-0 left-0 w-full z-50 flex items-center gap-4 px-4 py-3 transition-all duration-300 ${isScrolled ? "bg-[#121212]/90 backdrop-blur-xl border-b border-white/5 shadow-lg" : "bg-transparent"}`}>
        <button onClick={() => router.back()} className="p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md transition-colors text-white active:scale-95">
          <ArrowLeft size={22} />
        </button>
        {isScrolled && (
          <h1 className="text-base font-bold truncate flex-1 animate-fade-in">{title}</h1>
        )}
      </nav>

      {/* 3. Hero Header Section */}
      <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-6 px-4 md:px-8 pt-24 pb-6">
        <div className="w-56 h-56 md:w-64 md:h-64 flex-shrink-0 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-xl overflow-hidden group">
          <img 
            src={coverImage} 
            alt={title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" 
          />
        </div>
        
        <div className="flex flex-col items-center md:items-start text-center md:text-left mt-2 md:mt-0">
          <p className="text-[11px] uppercase tracking-[0.2em] font-extrabold text-neutral-300 mb-2">
            {playlist.type === "playlist" ? "Public Playlist" : "Album"}
          </p>
          <h1 className="text-3xl md:text-5xl lg:text-7xl font-black tracking-tighter mb-4 line-clamp-2 leading-tight">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-neutral-300 mb-3 max-w-2xl line-clamp-2 md:line-clamp-3 leading-relaxed">
              {description}
            </p>
          )}
          <div className="flex items-center gap-2 text-[13px] font-medium text-neutral-400 flex-wrap justify-center md:justify-start">
            <span className="text-white font-bold">{playlist.songCount} songs</span>
            {playlist.playCount && (
              <>
                <span>•</span>
                <span>{formatNumber(playlist.playCount)} plays</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 4. Action Bar */}
      <div className="relative z-10 px-4 md:px-8 py-4 flex items-center gap-4">
        <button 
          onClick={() => { if (playlist.songs?.length) { setCurrentSong(playlist.songs[0]); setIsPlaying(true); } }} 
          className="w-14 h-14 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_8px_30px_rgba(255,255,255,0.2)]"
        >
          <Play fill="black" size={24} className="ml-1" />
        </button>
        <button className="p-3 text-neutral-400 hover:text-white transition-colors">
          <Shuffle size={24} />
        </button>
        <button className="p-3 text-neutral-400 hover:text-white transition-colors">
          <Share2 size={24} />
        </button>
      </div>

      {/* 5. Tracklist Header */}
      <div className="relative z-10 px-4 md:px-8 mt-4 hidden md:flex items-center text-xs font-bold uppercase tracking-wider text-neutral-400 border-b border-white/10 pb-2 mb-4">
        <div className="w-10 text-center">#</div>
        <div className="flex-1 ml-4">Title</div>
        <div className="flex-1 hidden lg:block">Album</div>
        <div className="w-16 text-right mr-8"><Clock size={16} className="inline-block" /></div>
      </div>

      {/* 6. Songs List */}
      <div className="relative z-10 px-2 md:px-8 flex flex-col gap-1">
        {playlist.songs?.map((song: any, index: number) => {
          const isLastItem = index === playlist.songs.length - 1;
          const songTitle = decodeEntities(song.name || song.title);
          const artists = decodeEntities(getArtists(song));
          const albumName = decodeEntities(song.album?.name || "");

          return (
            <div 
              key={`${song.id}-${index}`} 
              ref={isLastItem ? lastElementRef : null}
              onClick={() => { setCurrentSong(song); setIsPlaying(true); }} 
              className="flex items-center gap-3 md:gap-4 p-2 md:p-3 rounded-xl hover:bg-white/5 cursor-pointer active:scale-[0.98] group transition-all"
            >
              {/* Index number (Hidden on very small screens) */}
              <div className="w-8 md:w-10 text-center text-neutral-500 font-medium text-sm hidden sm:block group-hover:text-white">
                {index + 1}
              </div>
              
              {/* Thumbnail */}
              <div className="relative w-12 h-12 md:w-14 md:h-14 flex-shrink-0 bg-neutral-800 rounded-md overflow-hidden">
                <img src={getImageUrl(song.image)} alt={songTitle} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play fill="white" size={20} className="text-white ml-0.5" />
                </div>
              </div>
              
              {/* Title & Artist */}
              <div className="flex-1 overflow-hidden pr-2">
                <h3 className="text-[15px] font-bold text-white truncate leading-tight mb-0.5">{songTitle}</h3>
                <p className="text-[13px] text-neutral-400 truncate hover:underline hover:text-white transition-colors">{artists}</p>
              </div>

              {/* Album (Hidden on mobile) */}
              <div className="flex-1 hidden lg:block overflow-hidden pr-4 text-[13px] text-neutral-400 truncate hover:text-white transition-colors">
                {albumName}
              </div>
              
              {/* Duration & Options */}
              <div className="flex items-center gap-3 md:gap-4">
                <span className="text-[13px] text-neutral-400 font-medium hidden md:block">
                  {formatDuration(song.duration)}
                </span>
                <button 
                  onClick={(e) => { e.stopPropagation(); /* Add to queue/options logic here */ }} 
                  className="p-2 text-neutral-500 hover:text-white rounded-full hover:bg-white/10 transition-colors opacity-100 md:opacity-0 group-hover:opacity-100"
                >
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 7. Loading More Spinner */}
      {loadingMore && (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="animate-spin text-neutral-500" size={32} />
        </div>
      )}

      {/* 8. End of Playlist indicator */}
      {!hasMore && playlist.songs?.length > 0 && (
        <div className="text-center py-8 pb-12">
          <p className="text-sm font-bold text-neutral-600">End of playlist</p>
        </div>
      )}
    </div>
  );
}

export default function PlaylistPage() {
  return (
    <main className="min-h-screen bg-[#121212]">
      <Suspense fallback={
        <div className="flex h-screen items-center justify-center bg-[#121212] text-white">
          <Loader2 className="animate-spin text-neutral-500" size={36} />
        </div>
      }>
        <PlaylistContent />
      </Suspense>
    </main>
  );
}
