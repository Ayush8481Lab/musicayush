"use client";
import { useEffect, useState, Suspense, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Play, ArrowLeft, Loader2, MoreVertical, BadgeCheck, Pause } from "lucide-react";
import { useAppContext } from "../../context/AppContext";

// Helper: Get highest quality image
const getImageUrl = (img: any) => {
  if (!img) return "https://via.placeholder.com/500";
  if (typeof img === "string") return img.replace("150x150", "500x500").replace("50x50", "500x500");
  if (Array.isArray(img)) return img[img.length - 1]?.url || img[0]?.url;
  return "https://via.placeholder.com/500";
};

// Helper: Decode HTML Entities cleanly
const decodeHtml = (html: string) => {
  if (!html) return "";
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
};

// Helper: Format large numbers (e.g., 1.2M, 500K)
const formatNumber = (num: number | string | null | undefined) => {
  if (!num) return "0";
  const n = typeof num === 'string' ? parseInt(num.replace(/,/g, '')) : num;
  if (isNaN(n)) return "0";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
};

function ArtistContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id");
  
  const { currentSong, setCurrentSong, isPlaying, setIsPlaying } = useAppContext();
  
  // States
  const [artist, setArtist] = useState<any>(null);
  const[albums, setAlbums] = useState<any[]>([]);
  const [singles, setSingles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination & View States
  const[currentView, setCurrentView] = useState<"main" | "all-songs">("main");
  const[songs, setSongs] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [hasMoreSongs, setHasMoreSongs] = useState(true);
  const[loadingMore, setLoadingMore] = useState(false);
  const [totalSongsCount, setTotalSongsCount] = useState(0);
  const [totalAlbumsCount, setTotalAlbumsCount] = useState(0);

  // Bio Expand State
  const [isBioExpanded, setIsBioExpanded] = useState(false);

  // Initial Fetch Effect
  useEffect(() => {
    if (!id) return;
    
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const [mainRes, songsRes, albumsRes] = await Promise.allSettled([
          fetch(`https://ayushm-psi.vercel.app/api/artists/${id}`),
          fetch(`https://ayushm-psi.vercel.app/api/artists/${id}/songs?page=0`),
          fetch(`https://ayushm-psi.vercel.app/api/artists/${id}/albums?page=0`)
        ]);

        let mainData = null;
        let fetchedSongs = [];
        let fetchedAlbums =[];
        let sCount = 0;
        let aCount = 0;

        if (mainRes.status === "fulfilled" && mainRes.value.ok) {
          const json = await mainRes.value.json();
          mainData = json.data;
        }

        if (songsRes.status === "fulfilled" && songsRes.value.ok) {
          const json = await songsRes.value.json();
          fetchedSongs = json.data?.songs ||[];
          sCount = json.data?.total || fetchedSongs.length;
        }

        if (albumsRes.status === "fulfilled" && albumsRes.value.ok) {
          const json = await albumsRes.value.json();
          fetchedAlbums = json.data?.albums ||[];
          aCount = json.data?.total || fetchedAlbums.length;
        }

        // --- FALLBACK LOGIC ---
        let finalArtist = mainData;
        if (!finalArtist && fetchedSongs.length > 0) {
          // Find exact artist from the first song's artist array
          let fallbackArtist = fetchedSongs[0].artists?.all?.find((a: any) => a.id === id) 
                            || fetchedSongs[0].artists?.primary?.find((a: any) => a.id === id);
          
          finalArtist = {
            id: id,
            name: fallbackArtist?.name || "Unknown Artist",
            image: fallbackArtist?.image || fetchedSongs[0].image,
            role: fallbackArtist?.role || "Artist",
            isVerified: false,
            followerCount: 0, // Forced to 0 as requested in fallback
            bio:[]
          };
        }

        setArtist(finalArtist);
        setSongs(fetchedSongs);
        setTotalSongsCount(sCount);
        setTotalAlbumsCount(aCount);
        setAlbums(fetchedAlbums);
        setSingles(mainData?.singles ||[]);
        setHasMoreSongs(fetchedSongs.length < sCount);

      } catch (error) {
        console.error("Error fetching artist data:", error);
      }
      setLoading(false);
    };

    fetchInitialData();
  }, [id]);

  // Infinite Scroll Fetching Logic
  useEffect(() => {
    if (page === 0 || !id) return;

    const fetchMoreSongs = async () => {
      setLoadingMore(true);
      try {
        const res = await fetch(`https://ayushm-psi.vercel.app/api/artists/${id}/songs?page=${page}`);
        const json = await res.json();
        const newSongs = json.data?.songs ||[];
        
        setSongs(prev => {
          // Prevent duplicates
          const existingIds = new Set(prev.map(s => s.id));
          const filteredNew = newSongs.filter((s: any) => !existingIds.has(s.id));
          return[...prev, ...filteredNew];
        });
        
        if (newSongs.length === 0 || songs.length + newSongs.length >= totalSongsCount) {
          setHasMoreSongs(false);
        }
      } catch (error) {
        console.error("Error fetching more songs:", error);
      }
      setLoadingMore(false);
    };

    fetchMoreSongs();
  }, [page, id, totalSongsCount]);

  // Intersection Observer for Infinite Scroll
  const observer = useRef<IntersectionObserver | null>(null);
  const lastSongElementRef = useCallback((node: any) => {
    if (loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMoreSongs && currentView === "all-songs") {
        setPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loadingMore, hasMoreSongs, currentView]);

  const handlePlaySong = (song: any) => {
    if (currentSong?.id === song.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentSong(song);
      setIsPlaying(true);
    }
  };

  const handlePlayAll = () => {
    if (songs.length > 0) {
      setCurrentSong(songs[0]);
      setIsPlaying(true);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white">
        <Loader2 className="animate-spin text-white" size={40} />
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-black text-white">
        <h2 className="text-xl font-bold">Artist not found</h2>
        <button onClick={() => router.back()} className="mt-4 px-6 py-2 bg-white text-black rounded-full font-bold">Go Back</button>
      </div>
    );
  }

  // ALL SONGS VIEW
  if (currentView === "all-songs") {
    return (
      <div className="pb-32 min-h-screen bg-black text-white">
        <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-md p-4 flex items-center border-b border-white/10">
          <button onClick={() => setCurrentView("main")} className="p-2 mr-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold truncate">{artist.name} - All Songs</h1>
        </div>
        
        <div className="max-w-5xl mx-auto p-4 flex flex-col gap-2">
          {songs.map((song: any, index: number) => {
            const isCurrent = currentSong?.id === song.id;
            const isLastElement = index === songs.length - 1;
            
            return (
              <div 
                ref={isLastElement ? lastSongElementRef : null}
                key={song.id + index} 
                onClick={() => handlePlaySong(song)} 
                className={`group flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-colors ${isCurrent ? 'bg-white/10' : 'hover:bg-white/5'}`}
              >
                <div className="w-8 text-center flex-shrink-0">
                  {isCurrent && isPlaying ? (
                    <div className="flex items-end justify-center gap-0.5 h-4">
                      <span className="w-1 bg-green-500 h-2 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-1 bg-green-500 h-4 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-1 bg-green-500 h-3 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  ) : (
                    <span className="text-neutral-500 font-medium group-hover:hidden">{index + 1}</span>
                  )}
                  <Play size={16} fill="white" className="hidden group-hover:block mx-auto text-white" />
                </div>
                
                <img src={getImageUrl(song.image)} className="w-12 h-12 rounded-md object-cover shadow-md flex-shrink-0" alt={song.name} />
                
                <div className="flex-1 min-w-0">
                  <h3 className={`text-base font-semibold truncate ${isCurrent ? "text-green-400" : "text-white"}`}>
                    {decodeHtml(song.name || song.title)}
                  </h3>
                  <p className="text-sm text-neutral-400 truncate mt-0.5">{decodeHtml(song.album?.name || artist.name)}</p>
                </div>
                <button className="p-2 text-neutral-400 hover:text-white transition-opacity">
                  <MoreVertical size={20} />
                </button>
              </div>
            );
          })}
          
          {loadingMore && (
            <div className="py-8 flex justify-center">
              <Loader2 className="animate-spin text-green-500" size={32} />
            </div>
          )}
        </div>
      </div>
    );
  }

  // MAIN VIEW
  const bioText = artist.bio && artist.bio.length > 0 ? decodeHtml(artist.bio[0].text) : "";
  const roleDisplay = artist.role || artist.dominantType || "Artist";

  return (
    <div className="pb-32 min-h-screen bg-[#0a0a0a] text-white selection:bg-white/30">
      
      {/* ---------------- HERO BANNER ---------------- */}
      <div className="relative w-full h-[45vh] md:h-[50vh] bg-gradient-to-b from-neutral-500 to-black overflow-hidden flex flex-col justify-end">
        {/* Lighter Blurred Background */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-40 blur-3xl scale-125 mix-blend-screen"
          style={{ backgroundImage: `url(${getImageUrl(artist.image)})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />
        
        <button onClick={() => router.back()} className="absolute top-6 left-4 md:left-8 bg-black/40 hover:bg-black/60 p-2.5 rounded-full backdrop-blur-md z-20 transition-all">
          <ArrowLeft size={24} className="text-white" />
        </button>

        <div className="relative z-10 px-4 md:px-8 pb-8 flex flex-col md:flex-row items-center md:items-end gap-6">
          <img 
            src={getImageUrl(artist.image)} 
            alt={artist.name}
            className="w-36 h-36 md:w-56 md:h-56 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.6)] object-cover border-4 border-[#1a1a1a]" 
          />
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <h1 className="text-4xl md:text-6xl font-black text-white flex items-center gap-3 mb-3 tracking-tight">
              {decodeHtml(artist.name)}
              {artist.isVerified && (
                <div className="relative flex items-center justify-center rounded-full bg-white w-6 h-6 md:w-8 md:h-8">
                  <BadgeCheck className="text-blue-500 absolute w-7 h-7 md:w-9 md:h-9" fill="currentColor" stroke="white" strokeWidth={1} />
                </div>
              )}
            </h1>
            
            {/* Stats Row */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-sm md:text-base text-neutral-300 font-medium">
              <span className="capitalize px-3 py-1 bg-white/10 rounded-full backdrop-blur-sm border border-white/5">{roleDisplay}</span>
              <span className="px-3 py-1 bg-white/10 rounded-full backdrop-blur-sm border border-white/5">
                {formatNumber(artist.followerCount)} Followers
              </span>
              {(totalSongsCount > 0 || totalAlbumsCount > 0) && (
                <span className="px-3 py-1 bg-white/10 rounded-full backdrop-blur-sm border border-white/5">
                  {totalSongsCount} Songs • {totalAlbumsCount} Albums
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-6">
        
        {/* Play Button & Bio Section */}
        <div className="flex flex-col md:flex-row gap-6 items-start mb-10">
          <button 
            onClick={handlePlayAll} 
            className="bg-green-500 hover:bg-green-400 text-black px-8 py-3.5 rounded-full font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 flex-shrink-0 mx-auto md:mx-0 shadow-[0_0_20px_rgba(34,197,94,0.3)]"
          >
            <Play fill="black" size={22} /> Play
          </button>

          {/* Expandable Bio */}
          {bioText && (
            <div className="text-neutral-400 text-sm md:text-base leading-relaxed bg-white/5 p-4 rounded-2xl border border-white/5 flex-1 w-full">
              <p>
                {isBioExpanded ? bioText : `${bioText.substring(0, 150)}... `}
                {bioText.length > 150 && (
                  <button 
                    onClick={() => setIsBioExpanded(!isBioExpanded)}
                    className="text-white font-semibold hover:underline ml-1"
                  >
                    {isBioExpanded ? "Show Less" : "Read More"}
                  </button>
                )}
              </p>
            </div>
          )}
        </div>

        {/* ---------------- TOP 10 SONGS ---------------- */}
        {songs.length > 0 && (
          <div className="mb-12">
            <div className="flex items-end justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Top Songs</h2>
              {songs.length > 10 && (
                <button onClick={() => setCurrentView("all-songs")} className="text-sm font-bold text-neutral-400 hover:text-white transition-colors">
                  View All
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-1">
              {songs.slice(0, 10).map((song: any, index: number) => {
                const isCurrent = currentSong?.id === song.id;
                return (
                  <div 
                    key={song.id + index} 
                    onClick={() => handlePlaySong(song)} 
                    className={`group flex items-center gap-4 p-2.5 rounded-xl cursor-pointer transition-colors ${isCurrent ? 'bg-white/10' : 'hover:bg-white/5'}`}
                  >
                    <div className="w-8 text-center flex-shrink-0">
                      {isCurrent && isPlaying ? (
                        <div className="flex items-end justify-center gap-0.5 h-4">
                          <span className="w-1 bg-green-500 h-2 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                          <span className="w-1 bg-green-500 h-4 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                          <span className="w-1 bg-green-500 h-3 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                      ) : (
                        <span className="text-neutral-500 text-sm font-medium group-hover:hidden">{index + 1}</span>
                      )}
                      <Play size={16} fill="white" className="hidden group-hover:block mx-auto text-white" />
                    </div>
                    
                    <img src={getImageUrl(song.image)} className="w-12 h-12 rounded-md object-cover shadow-md flex-shrink-0 bg-neutral-800" alt={song.name} />
                    
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-base font-semibold truncate ${isCurrent ? "text-green-400" : "text-white"}`}>
                        {decodeHtml(song.name || song.title)}
                      </h3>
                      <p className="text-sm text-neutral-400 truncate mt-0.5">{decodeHtml(song.album?.name || artist.name)}</p>
                    </div>
                    
                    <button className="opacity-0 group-hover:opacity-100 p-2 text-neutral-400 hover:text-white transition-opacity hidden sm:block">
                      <MoreVertical size={20} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ---------------- ALBUMS (2 Lines Horizontal Scroll) ---------------- */}
        {albums.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">Albums</h2>
            <div className="grid grid-rows-2 grid-flow-col gap-x-5 gap-y-6 overflow-x-auto pb-6 custom-scrollbar auto-cols-[140px] md:auto-cols-[160px] snap-x snap-mandatory">
              {albums.map((album: any) => (
                <div 
                  key={album.id} 
                  onClick={() => router.push(`/album?link=${encodeURIComponent(album.url)}`)} 
                  className="group snap-start cursor-pointer w-[140px] md:w-[160px]"
                >
                  <div className="relative w-full aspect-square mb-3 overflow-hidden rounded-xl shadow-lg bg-neutral-800">
                    <img src={getImageUrl(album.image)} alt={album.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    <div className="absolute bottom-2 right-2 bg-green-500 p-2.5 rounded-full shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                      <Play fill="black" className="text-black" size={18} />
                    </div>
                  </div>
                  <h3 className="text-sm md:text-base font-bold text-white truncate">{decodeHtml(album.name)}</h3>
                  <p className="text-xs md:text-sm text-neutral-400 mt-0.5 truncate">{album.year || "Album"}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---------------- SINGLES (2 Lines Horizontal Scroll) ---------------- */}
        {singles.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">Singles & EPs</h2>
            <div className="grid grid-rows-2 grid-flow-col gap-x-5 gap-y-6 overflow-x-auto pb-6 custom-scrollbar auto-cols-[140px] md:auto-cols-[160px] snap-x snap-mandatory">
              {singles.map((single: any) => (
                <div 
                  key={single.id} 
                  onClick={() => router.push(`/album?link=${encodeURIComponent(single.url)}`)} 
                  className="group snap-start cursor-pointer w-[140px] md:w-[160px]"
                >
                  <div className="relative w-full aspect-square mb-3 overflow-hidden rounded-xl shadow-lg bg-neutral-800">
                    <img src={getImageUrl(single.image)} alt={single.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  </div>
                  <h3 className="text-sm md:text-base font-bold text-white truncate">{decodeHtml(single.name)}</h3>
                  <p className="text-xs md:text-sm text-neutral-400 mt-0.5 truncate">{single.year || "Single"}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}} />
    </div>
  );
}

export default function ArtistPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-black text-white">
        <Loader2 className="animate-spin text-white" size={40} />
      </div>
    }>
      <ArtistContent />
    </Suspense>
  );
}
