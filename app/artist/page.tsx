"use client";
import { useEffect, useState, Suspense, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Play, ArrowLeft, Loader2, MoreVertical } from "lucide-react";
import { useAppContext } from "../../context/AppContext";

// High-quality Custom Blue Tick (Premium Look)
const VerifiedBadge = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#1db954] ml-1" fill="currentColor">
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-1.9 14.7L6 12.6l1.5-1.5 2.6 2.6 6.4-6.4 1.5 1.5-7.9 7.9z" />
  </svg>
);

// Helper: Get highest quality image
const getImageUrl = (img: any, size = "500") => {
  if (!img) return `https://via.placeholder.com/${size}`;
  if (typeof img === "string") return img.replace("150x150", `${size}x${size}`).replace("50x50", `${size}x${size}`);
  if (Array.isArray(img)) return img[img.length - 1]?.url || img[0]?.url;
  return `https://via.placeholder.com/${size}`;
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
  if (num == null || num === "") return "0";
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
  
  // Base States
  const [artist, setArtist] = useState<any>(null);
  const[albums, setAlbums] = useState<any[]>([]);
  const [singles, setSingles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination & View States
  const [currentView, setCurrentView] = useState<"main" | "all-songs" | "all-albums">("main");
  const [songs, setSongs] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const[totalSongsCount, setTotalSongsCount] = useState(0);
  const[totalAlbumsCount, setTotalAlbumsCount] = useState(0);

  // Bio Expand State
  const[isBioExpanded, setIsBioExpanded] = useState(false);

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
        let fetchedSongs =[];
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
          let fallbackArtist = fetchedSongs[0].artists?.all?.find((a: any) => a.id === id) 
                            || fetchedSongs[0].artists?.primary?.find((a: any) => a.id === id);
          
          finalArtist = {
            id: id,
            name: fallbackArtist?.name || "Unknown Artist",
            image: fallbackArtist?.image || fetchedSongs[0].image,
            role: fallbackArtist?.role || "Artist",
            isVerified: false,
            followerCount: 0, // Fallback sets followers to 0 as requested
            bio:[]
          };
        }

        setArtist(finalArtist);
        setSongs(fetchedSongs);
        setTotalSongsCount(sCount);
        setTotalAlbumsCount(aCount);
        setAlbums(fetchedAlbums);
        setSingles(mainData?.singles ||[]);

        // Initial setup for pagination
        setHasMore(fetchedSongs.length < sCount);

      } catch (error) {
        console.error("Error fetching artist data:", error);
      }
      setLoading(false);
    };

    fetchInitialData();
  }, [id]);

  // Infinite Scroll Fetching Logic (Songs & Albums)
  useEffect(() => {
    if (page === 0 || !id || currentView === "main") return;

    const fetchMoreData = async () => {
      setLoadingMore(true);
      try {
        const endpoint = currentView === "all-songs" ? "songs" : "albums";
        const res = await fetch(`https://ayushm-psi.vercel.app/api/artists/${id}/${endpoint}?page=${page}`);
        const json = await res.json();
        
        if (currentView === "all-songs") {
          const newSongs = json.data?.songs ||[];
          setSongs(prev => {
            const existingIds = new Set(prev.map(s => s.id));
            return[...prev, ...newSongs.filter((s: any) => !existingIds.has(s.id))];
          });
          if (newSongs.length === 0 || songs.length + newSongs.length >= totalSongsCount) setHasMore(false);
        } else {
          const newAlbums = json.data?.albums ||[];
          setAlbums(prev => {
            const existingIds = new Set(prev.map(a => a.id));
            return[...prev, ...newAlbums.filter((a: any) => !existingIds.has(a.id))];
          });
          if (newAlbums.length === 0 || albums.length + newAlbums.length >= totalAlbumsCount) setHasMore(false);
        }
      } catch (error) {
        console.error("Error fetching more data:", error);
        setHasMore(false);
      }
      setLoadingMore(false);
    };

    fetchMoreData();
  },[page, currentView, id, totalSongsCount, totalAlbumsCount, songs.length, albums.length]);

  // Intersection Observer for Infinite Scroll
  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useCallback((node: any) => {
    if (loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  },[loadingMore, hasMore]);

  const handlePlaySong = (song: any, index: number, sourceList: any[]) => {
    if (currentSong?.id === song.id) {
      setIsPlaying(!isPlaying);
    } else {
      // Logic to set queue could be added here
      setCurrentSong(song);
      setIsPlaying(true);
    }
  };

  const openAllView = (type: "all-songs" | "all-albums") => {
    setPage(0);
    setHasMore(true);
    setCurrentView(type);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeAllView = () => {
    setCurrentView("main");
    setPage(0);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0f1014] text-white">
        <div className="w-8 h-8 border-4 border-[#1e222b] border-t-[#1db954] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#0f1014] text-white">
        <h2 className="text-xl font-bold">Artist not found</h2>
        <button onClick={() => router.back()} className="mt-4 px-6 py-2 bg-[#1db954] text-black rounded-full font-bold">Go Back</button>
      </div>
    );
  }

  const bioText = artist.bio && artist.bio.length > 0 ? decodeHtml(artist.bio[0].text) : "";
  const roleDisplay = artist.dominantType || artist.role || "Artist";

  // ==============================
  // VIEW: ALL SONGS OR ALL ALBUMS
  // ==============================
  if (currentView === "all-songs" || currentView === "all-albums") {
    const isSongs = currentView === "all-songs";
    const dataList = isSongs ? songs : albums;
    const title = isSongs ? "All Songs" : "All Albums";

    return (
      <div className="pb-32 min-h-screen bg-[#0f1014] text-white">
        <div className="sticky top-0 z-30 bg-[#0f1014]/95 backdrop-blur-md px-5 py-4 flex items-center border-b border-white/5">
          <button onClick={closeAllView} className="p-2 mr-3 bg-black/40 rounded-full active:scale-90 transition-transform">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-extrabold truncate text-white leading-tight">{title}</h1>
            <p className="text-xs text-[#aeb6c4] font-medium">{artist.name}</p>
          </div>
        </div>
        
        <div className={isSongs ? "px-5 flex flex-col pt-4" : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-5"}>
          {dataList.map((item: any, index: number) => {
            const isLastElement = index === dataList.length - 1;
            
            if (isSongs) {
              const isCurrent = currentSong?.id === item.id;
              return (
                <div 
                  ref={isLastElement ? lastElementRef : null}
                  key={item.id + index} 
                  onClick={() => handlePlaySong(item, index, dataList)} 
                  className={`flex items-center py-2.5 border-b border-white/5 cursor-pointer active:bg-white/5 transition-colors`}
                >
                  <img src={getImageUrl(item.image, "50")} className="w-[50px] h-[50px] rounded object-cover flex-shrink-0 bg-[#222] mr-3.5" alt={item.name} />
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-[14px] font-medium truncate mb-0.5 ${isCurrent ? "text-[#1db954]" : "text-white"}`}>
                      {decodeHtml(item.name || item.title)}
                    </h4>
                    <p className="text-[12px] text-[#aeb6c4] truncate">{decodeHtml(item.subtitle || artist.name)}</p>
                  </div>
                  <MoreVertical size={18} className="text-[#aeb6c4]" />
                </div>
              );
            } else {
              // Albums Grid
              return (
                <div 
                  ref={isLastElement ? lastElementRef : null}
                  key={item.id + index} 
                  onClick={() => router.push(`/album?link=${encodeURIComponent(item.url || item.perma_url)}`)} 
                  className="cursor-pointer active:scale-95 transition-transform"
                >
                  <img src={getImageUrl(item.image, "250")} alt={item.name} className="w-full aspect-square rounded-lg object-cover bg-[#222] mb-2" />
                  <h3 className="text-[13px] font-semibold text-white truncate">{decodeHtml(item.name || item.title)}</h3>
                  <p className="text-[11px] text-[#aeb6c4] capitalize truncate">{item.year || 'Album'}</p>
                </div>
              );
            }
          })}
          
          {loadingMore && (
            <div className="py-6 flex justify-center col-span-full">
              <div className="w-6 h-6 border-2 border-[#1e222b] border-t-[#1db954] rounded-full animate-spin"></div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==============================
  // VIEW: MAIN ARTIST PROFILE
  // ==============================
  return (
    <div className="pb-32 min-h-screen bg-[#0f1014] text-white">
      {/* Dynamic Scoped Styles for UI identical to HTML template */}
      <style dangerouslySetInnerHTML={{__html: `
        .grid-scroll-multi {
          display: grid;
          grid-template-rows: repeat(2, auto);
          grid-auto-flow: column;
          overflow-x: auto;
          gap: 15px;
          padding: 0 20px 10px;
          scroll-snap-type: x mandatory;
          scrollbar-width: none;
        }
        .grid-scroll-multi::-webkit-scrollbar { display: none; }
        .lib-card {
          width: 140px;
          scroll-snap-align: start;
          cursor: pointer;
        }
        .lib-card:active img { transform: scale(0.95); opacity: 0.8; }
        .lib-card img {
          width: 100%;
          aspect-ratio: 1/1;
          object-fit: cover;
          border-radius: 8px;
          margin-bottom: 8px;
          transition: transform 0.2s;
          background: #222;
        }
      `}} />

      {/* ---------------- HERO HEADER ---------------- */}
      {/* Gradient matches the original HTML: Lighter gray/black mix dropping into #0f1014 */}
      <div className="relative pt-20 pb-6 bg-gradient-to-b from-[#333333] to-[#0f1014] flex flex-col items-center text-center overflow-hidden">
        
        <button onClick={() => router.back()} className="absolute top-5 left-5 w-10 h-10 bg-black/40 rounded-full flex items-center justify-center z-10 active:scale-90 transition-transform">
          <ArrowLeft size={18} className="text-white" />
        </button>

        <div className="w-[160px] h-[160px] rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.5)] mb-4 relative z-10 bg-[#222]">
          <img 
            src={getImageUrl(artist.image)} 
            alt={artist.name}
            className="w-full h-full rounded-full object-cover" 
          />
        </div>

        <h2 className="text-[22px] font-extrabold text-white flex items-center justify-center gap-1 z-10 px-4 leading-tight">
          {decodeHtml(artist.name)}
          {artist.isVerified && <VerifiedBadge />}
        </h2>
        
        <p className="text-[14px] text-[#aeb6c4] mt-1 z-10 capitalize max-w-[90%] truncate">
          {roleDisplay}
        </p>

        <div className="text-[12px] text-[#aaa] font-medium mt-2 z-10 flex items-center gap-2">
          <span>{formatNumber(artist.followerCount)} Followers</span>
          {totalSongsCount > 0 && <span>• {totalSongsCount} Songs</span>}
          {totalAlbumsCount > 0 && <span>• {totalAlbumsCount} Albums</span>}
        </div>
      </div>

      {/* ---------------- ACTION BUTTONS & BIO ---------------- */}
      <div className="px-5 mt-2 flex flex-col items-center gap-4">
        {songs.length > 0 && (
          <button 
            onClick={() => handlePlaySong(songs[0], 0, songs)} 
            className="bg-[#1db954] text-white px-8 py-2.5 rounded-full font-bold text-[14px] uppercase tracking-wider flex items-center gap-2 active:scale-95 transition-transform"
          >
            <Play fill="currentColor" size={16} /> Play
          </button>
        )}

        {bioText && (
          <div className="w-full text-center text-[13px] text-[#aeb6c4] leading-relaxed mt-2">
            {isBioExpanded ? bioText : `${bioText.substring(0, 140)}${bioText.length > 140 ? '...' : ''}`}
            {bioText.length > 140 && (
              <span 
                onClick={() => setIsBioExpanded(!isBioExpanded)}
                className="text-[#1db954] font-bold ml-2 cursor-pointer uppercase text-[11px]"
              >
                {isBioExpanded ? "Read Less" : "Read More"}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ---------------- TOP SONGS (10 Items) ---------------- */}
      {songs.length > 0 && (
        <div className="mt-8">
          <div className="flex justify-between items-center px-5 mb-4">
            <span className="text-[18px] font-bold text-white">Top Songs</span>
            {songs.length > 10 && (
              <span onClick={() => openAllView("all-songs")} className="text-[12px] font-bold text-[#1db954] uppercase cursor-pointer tracking-wide">
                View All
              </span>
            )}
          </div>
          
          <div className="px-5 flex flex-col">
            {songs.slice(0, 10).map((song: any, index: number) => {
              const isCurrent = currentSong?.id === song.id;
              return (
                <div 
                  key={song.id + index} 
                  onClick={() => handlePlaySong(song, index, songs)} 
                  className="flex items-center py-2.5 border-b border-white/5 cursor-pointer active:bg-white/5 transition-colors"
                >
                  <span className="w-5 text-center text-[#666] text-[12px] mr-2.5 font-medium">{index + 1}</span>
                  <img src={getImageUrl(song.image, "50")} className="w-[50px] h-[50px] rounded object-cover flex-shrink-0 bg-[#222] mr-3.5" alt={song.name} />
                  
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-[14px] font-medium truncate mb-0.5 ${isCurrent ? "text-[#1db954]" : "text-white"}`}>
                      {decodeHtml(song.name || song.title)}
                    </h4>
                    <p className="text-[12px] text-[#aeb6c4] truncate">{decodeHtml(song.subtitle || artist.name)}</p>
                  </div>
                  <MoreVertical size={18} className="text-[#aeb6c4]" />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ---------------- ALBUMS (2 Row Horizontal Scroll) ---------------- */}
      {albums.length > 0 && (
        <div className="mt-10">
          <div className="flex justify-between items-center px-5 mb-4">
            <span className="text-[18px] font-bold text-white">Albums</span>
            {totalAlbumsCount > 10 && (
              <span onClick={() => openAllView("all-albums")} className="text-[12px] font-bold text-[#1db954] uppercase cursor-pointer tracking-wide">
                All Albums
              </span>
            )}
          </div>
          
          <div className="grid-scroll-multi">
            {albums.map((album: any, index: number) => (
              <div 
                key={album.id + index} 
                onClick={() => router.push(`/album?link=${encodeURIComponent(album.url || album.perma_url)}`)} 
                className="lib-card"
              >
                <img src={getImageUrl(album.image, "250")} alt={album.name} loading="lazy" />
                <h3 className="text-[13px] font-semibold text-white truncate">{decodeHtml(album.name || album.title)}</h3>
                <p className="text-[11px] text-[#aeb6c4] capitalize truncate">{album.year || "Album"}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------- SINGLES (2 Row Horizontal Scroll) ---------------- */}
      {singles.length > 0 && (
        <div className="mt-6 mb-8">
          <div className="px-5 mb-4">
            <span className="text-[18px] font-bold text-white">Singles & EPs</span>
          </div>
          <div className="grid-scroll-multi">
            {singles.map((single: any, index: number) => (
              <div 
                key={single.id + index} 
                onClick={() => router.push(`/album?link=${encodeURIComponent(single.url || single.perma_url)}`)} 
                className="lib-card"
              >
                <img src={getImageUrl(single.image, "250")} alt={single.name} loading="lazy" />
                <h3 className="text-[13px] font-semibold text-white truncate">{decodeHtml(single.name || single.title)}</h3>
                <p className="text-[11px] text-[#aeb6c4] capitalize truncate">{single.year || "Single"}</p>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

export default function ArtistPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-[#0f1014] text-white">
        <div className="w-8 h-8 border-4 border-[#1e222b] border-t-[#1db954] rounded-full animate-spin"></div>
      </div>
    }>
      <ArtistContent />
    </Suspense>
  );
}
