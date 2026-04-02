"use client";
import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Play, ArrowLeft, Loader2, MoreVertical, BadgeCheck, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { useAppContext } from "../../context/AppContext";

// --- UTILITIES ---
const getImageUrl = (img: any, size = "500") => {
  if (!img) return `https://via.placeholder.com/${size}`;
  if (typeof img === "string") return img.replace("150x150", `${size}x${size}`).replace("50x50", `${size}x${size}`);
  if (Array.isArray(img)) return img[img.length - 1]?.url || img[0]?.url;
  return `https://via.placeholder.com/${size}`;
};

const decodeHtml = (html: string) => {
  if (!html) return "";
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
};

const formatNumber = (num: number | string | null | undefined) => {
  if (num == null || num === "" || num === 0) return "0";
  const n = typeof num === 'string' ? parseInt(num.replace(/,/g, '')) : num;
  if (isNaN(n) || n === 0) return "0";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
};

function ArtistContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id");
  const { currentSong, setCurrentSong, isPlaying, setIsPlaying } = useAppContext();
  
  // --- CORE STATES ---
  const [artist, setArtist] = useState<any>(null);
  const [singles, setSingles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const[view, setView] = useState<"main" | "songs" | "albums">("main");
  const [isBioExpanded, setIsBioExpanded] = useState(false);

  // --- PAGINATION STATES (SONGS) ---
  const[songs, setSongs] = useState<any[]>([]);
  const [songsPage, setSongsPage] = useState(0);
  const [hasMoreSongs, setHasMoreSongs] = useState(true);
  const [loadingMoreSongs, setLoadingMoreSongs] = useState(false);

  // --- PAGINATION STATES (ALBUMS) ---
  const[albums, setAlbums] = useState<any[]>([]);
  const [albumsPage, setAlbumsPage] = useState(0);
  const [hasMoreAlbums, setHasMoreAlbums] = useState(true);
  const [loadingMoreAlbums, setLoadingMoreAlbums] = useState(false);

  // --- 1. INITIAL DATA FETCH & FALLBACK LOGIC ---
  useEffect(() => {
    if (!id) return;
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const[mainRes, songsRes, albumsRes] = await Promise.allSettled([
          fetch(`https://ayushm-psi.vercel.app/api/artists/${id}`),
          fetch(`https://ayushm-psi.vercel.app/api/artists/${id}/songs?page=0`),
          fetch(`https://ayushm-psi.vercel.app/api/artists/${id}/albums?page=0`)
        ]);

        let mainData = null;
        let fetchedSongs = [];
        let fetchedAlbums =[];

        if (mainRes.status === "fulfilled" && mainRes.value.ok) {
          const json = await mainRes.value.json();
          mainData = json.data;
        }

        if (songsRes.status === "fulfilled" && songsRes.value.ok) {
          const json = await songsRes.value.json();
          fetchedSongs = json.data?.songs ||[];
        }

        if (albumsRes.status === "fulfilled" && albumsRes.value.ok) {
          const json = await albumsRes.value.json();
          fetchedAlbums = json.data?.albums ||[];
        }

        // 🚨 STRICT FALLBACK LOGIC 🚨
        let finalArtist = mainData;
        if (!finalArtist && fetchedSongs.length > 0) {
          let fallbackData = fetchedSongs[0].artists?.primary?.find((a: any) => String(a.id) === String(id)) 
                          || fetchedSongs[0].artists?.all?.find((a: any) => String(a.id) === String(id));
          
          finalArtist = {
            id: id,
            name: fallbackData?.name || fetchedSongs[0].artist || "Unknown Artist",
            image: fallbackData?.image || fetchedSongs[0].image,
            role: fallbackData?.role || "Artist",
            isVerified: false,
            followerCount: 0, // Fallback -> 0 Followers
            bio:[]
          };
        }

        setArtist(finalArtist);
        setSongs(fetchedSongs);
        setAlbums(fetchedAlbums);
        setSingles(mainData?.singles ||[]);
        
        // Disable more if API returned empty/small array
        if (fetchedSongs.length < 10) setHasMoreSongs(false);
        if (fetchedAlbums.length < 10) setHasMoreAlbums(false);

      } catch (error) {
        console.error("Critical Error loading artist:", error);
      }
      setLoading(false);
    };
    fetchInitialData();
  }, [id]);

  // --- 2. INFINITE SCROLL FETCHING (SONGS) ---
  useEffect(() => {
    if (songsPage === 0 || !id) return;
    const loadMoreSongs = async () => {
      setLoadingMoreSongs(true);
      try {
        const res = await fetch(`https://ayushm-psi.vercel.app/api/artists/${id}/songs?page=${songsPage}`);
        const json = await res.json();
        const newSongs = json.data?.songs ||[];
        
        if (newSongs.length === 0) {
          setHasMoreSongs(false);
        } else {
          setSongs(prev => {
            const existingIds = new Set(prev.map(s => s.id));
            return[...prev, ...newSongs.filter((s: any) => !existingIds.has(s.id))];
          });
        }
      } catch (err) { setHasMoreSongs(false); }
      setLoadingMoreSongs(false);
    };
    loadMoreSongs();
  },[songsPage, id]);

  // --- 3. INFINITE SCROLL FETCHING (ALBUMS) ---
  useEffect(() => {
    if (albumsPage === 0 || !id) return;
    const loadMoreAlbums = async () => {
      setLoadingMoreAlbums(true);
      try {
        const res = await fetch(`https://ayushm-psi.vercel.app/api/artists/${id}/albums?page=${albumsPage}`);
        const json = await res.json();
        const newAlbums = json.data?.albums ||[];
        
        if (newAlbums.length === 0) {
          setHasMoreAlbums(false);
        } else {
          setAlbums(prev => {
            const existingIds = new Set(prev.map(a => a.id));
            return[...prev, ...newAlbums.filter((a: any) => !existingIds.has(a.id))];
          });
        }
      } catch (err) { setHasMoreAlbums(false); }
      setLoadingMoreAlbums(false);
    };
    loadMoreAlbums();
  }, [albumsPage, id]);

  // --- 4. INTERSECTION OBSERVERS ---
  const songObserver = useRef<IntersectionObserver | null>(null);
  const lastSongRef = useCallback((node: any) => {
    if (loadingMoreSongs) return;
    if (songObserver.current) songObserver.current.disconnect();
    songObserver.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMoreSongs && view === "songs") {
        setSongsPage(prev => prev + 1);
      }
    });
    if (node) songObserver.current.observe(node);
  },[loadingMoreSongs, hasMoreSongs, view]);

  const albumObserver = useRef<IntersectionObserver | null>(null);
  const lastAlbumRef = useCallback((node: any) => {
    if (loadingMoreAlbums) return;
    if (albumObserver.current) albumObserver.current.disconnect();
    albumObserver.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMoreAlbums && view === "albums") {
        setAlbumsPage(prev => prev + 1);
      }
    });
    if (node) albumObserver.current.observe(node);
  }, [loadingMoreAlbums, hasMoreAlbums, view]);


  // --- PLAY HANDLER ---
  const handlePlay = (song: any) => {
    if (currentSong?.id === song.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentSong(song);
      setIsPlaying(true);
    }
  };

  const handleViralClick = (e: React.MouseEvent, songName: string) => {
    e.stopPropagation(); // Prevents song from playing
    alert(`Going viral: ${songName} 🔥`);
    // Add real sharing or trending logic here
  };

  // --- RENDER LOADERS ---
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#121212]">
        <Loader2 className="animate-spin text-[#1db954]" size={48} />
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#121212] text-white">
        <h2 className="text-2xl font-bold mb-4">Artist Not Found</h2>
        <button onClick={() => router.back()} className="px-6 py-2 bg-[#1db954] text-black rounded-full font-bold hover:scale-105">
          Go Back
        </button>
      </div>
    );
  }

  // Common UI Variables
  const followerCount = formatNumber(artist.followerCount);
  const bioHtml = artist.bio && artist.bio.length > 0 ? decodeHtml(artist.bio[0].text) : "";

  // ==========================================
  // VIEW: ALL SONGS (Infinite Scroll)
  // ==========================================
  if (view === "songs") {
    return (
      <div className="min-h-screen bg-[#121212] text-white pb-32">
        <div className="sticky top-0 z-50 bg-[#121212]/90 backdrop-blur-md p-4 flex items-center shadow-md">
          <button onClick={() => setView("main")} className="p-2 mr-2 bg-white/10 rounded-full hover:bg-white/20 transition">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold truncate">All Songs</h1>
        </div>
        <div className="px-4 mt-2">
          {songs.map((song, idx) => {
            const isCurrent = currentSong?.id === song.id;
            return (
              <div 
                ref={idx === songs.length - 1 ? lastSongRef : null}
                key={`${song.id}-${idx}`} 
                onClick={() => handlePlay(song)}
                className="group flex items-center justify-between p-3 rounded-md hover:bg-white/10 cursor-pointer transition"
              >
                <div className="flex items-center gap-4 flex-1 overflow-hidden">
                  <span className="w-6 text-center text-[#a7a7a7] text-sm font-medium">{idx + 1}</span>
                  <img src={getImageUrl(song.image, "150")} className="w-12 h-12 rounded object-cover shadow-lg bg-[#282828]" />
                  <div className="flex-1 truncate">
                    <h4 className={`text-[15px] font-semibold truncate ${isCurrent ? "text-[#1db954]" : "text-white"}`}>
                      {decodeHtml(song.name || song.title)}
                    </h4>
                    <p className="text-[13px] text-[#a7a7a7] truncate">{decodeHtml(song.subtitle || artist.name)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => handleViralClick(e, song.name)} 
                    className="p-2 rounded-full text-orange-400 hover:bg-orange-400/20 transition-all shadow-[0_0_10px_rgba(251,146,60,0.2)]"
                    title="Viral Action"
                  >
                    <TrendingUp size={20} />
                  </button>
                  <button className="p-2 text-[#a7a7a7] hover:text-white transition"><MoreVertical size={20} /></button>
                </div>
              </div>
            );
          })}
          {loadingMoreSongs && <div className="py-6 flex justify-center"><Loader2 className="animate-spin text-[#1db954]" size={30} /></div>}
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: ALL ALBUMS (Infinite Scroll)
  // ==========================================
  if (view === "albums") {
    return (
      <div className="min-h-screen bg-[#121212] text-white pb-32">
        <div className="sticky top-0 z-50 bg-[#121212]/90 backdrop-blur-md p-4 flex items-center shadow-md">
          <button onClick={() => setView("main")} className="p-2 mr-2 bg-white/10 rounded-full hover:bg-white/20 transition">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold truncate">All Albums</h1>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-4">
          {albums.map((album, idx) => (
            <div 
              ref={idx === albums.length - 1 ? lastAlbumRef : null}
              key={`${album.id}-${idx}`} 
              onClick={() => router.push(`/album?link=${encodeURIComponent(album.url || album.perma_url)}`)}
              className="bg-[#181818] p-3 rounded-lg hover:bg-[#282828] transition cursor-pointer"
            >
              <img src={getImageUrl(album.image, "250")} className="w-full aspect-square rounded-md shadow-lg mb-3 object-cover" />
              <h3 className="text-[14px] font-bold text-white truncate">{decodeHtml(album.name || album.title)}</h3>
              <p className="text-[13px] text-[#a7a7a7] mt-1 capitalize">{album.year || "Album"}</p>
            </div>
          ))}
        </div>
        {loadingMoreAlbums && <div className="py-6 flex justify-center w-full"><Loader2 className="animate-spin text-[#1db954]" size={30} /></div>}
      </div>
    );
  }

  // ==========================================
  // VIEW: MAIN ARTIST PROFILE (SPOTIFY STYLE)
  // ==========================================
  return (
    <div className="min-h-screen bg-[#121212] text-white pb-32 overflow-x-hidden">
      
      {/* SCOPED CSS FOR 2-ROW HORIZONTAL SCROLL & HIDING SCROLLBARS */}
      <style dangerouslySetInnerHTML={{__html: `
        .grid-2-rows {
          display: grid;
          grid-template-rows: repeat(2, auto);
          grid-auto-flow: column;
          gap: 16px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          scrollbar-width: none; /* Firefox */
        }
        .grid-2-rows::-webkit-scrollbar { display: none; /* Chrome/Safari */ }
        .grid-card {
          width: 140px;
          scroll-snap-align: start;
        }
        @media (min-width: 768px) {
          .grid-card { width: 170px; }
        }
      `}} />

      {/* --- HERO BANNER --- */}
      <div className="relative h-[45vh] md:h-[50vh] w-full flex items-end">
        {/* Dynamic Image Background with Blur */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${getImageUrl(artist.image, "500")})` }}
        />
        {/* Gradient Overlay (Spotify exact logic) */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/80 to-transparent" />
        <div className="absolute inset-0 bg-black/20" />

        <button onClick={() => router.back()} className="absolute top-6 left-4 p-2 bg-black/40 hover:bg-black/60 rounded-full backdrop-blur-sm transition z-20">
          <ArrowLeft size={24} className="text-white" />
        </button>

        <div className="relative z-10 px-5 md:px-8 pb-6 w-full">
          <div className="flex items-center gap-2 text-[#a7a7a7] text-sm font-semibold mb-2 uppercase tracking-widest">
            {artist.isVerified && <BadgeCheck className="text-blue-400" size={20} fill="currentColor" stroke="white" />}
            {artist.isVerified ? "Verified Artist" : (artist.role || artist.dominantType || "Artist")}
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-4 shadow-sm">
            {decodeHtml(artist.name)}
          </h1>
          <p className="text-[15px] font-medium text-[#a7a7a7]">
            {followerCount} monthly listeners
          </p>
        </div>
      </div>

      {/* --- ACTION BUTTONS --- */}
      <div className="px-5 md:px-8 py-4 flex items-center gap-6 relative z-20 bg-gradient-to-b from-[#121212]/50 to-[#121212]">
        {songs.length > 0 && (
          <button 
            onClick={() => handlePlay(songs[0])} 
            className="w-14 h-14 bg-[#1db954] hover:bg-[#1ed760] hover:scale-105 active:scale-95 flex items-center justify-center rounded-full transition-all shadow-[0_8px_8px_rgba(0,0,0,0.3)]"
          >
            <Play fill="black" size={24} className="text-black ml-1" />
          </button>
        )}
        <button className="border border-[#878787] hover:border-white px-6 py-1.5 rounded-full text-sm font-bold tracking-widest uppercase transition-colors">
          Follow
        </button>
      </div>

      {/* --- TOP 10 SONGS --- */}
      {songs.length > 0 && (
        <div className="px-5 md:px-8 mt-6">
          <h2 className="text-2xl font-bold mb-4">Popular</h2>
          <div className="flex flex-col">
            {songs.slice(0, 10).map((song: any, idx: number) => {
              const isCurrent = currentSong?.id === song.id;
              return (
                <div 
                  key={song.id + idx} 
                  onClick={() => handlePlay(song)}
                  className="group flex items-center justify-between py-2 px-2 md:px-4 rounded-md hover:bg-white/10 transition cursor-pointer"
                >
                  <div className="flex items-center gap-4 flex-1 overflow-hidden">
                    <span className="w-5 text-right text-[#a7a7a7] text-sm font-medium group-hover:hidden">{idx + 1}</span>
                    <Play size={16} fill="white" className="w-5 hidden group-hover:block text-white" />
                    
                    <img src={getImageUrl(song.image, "150")} className="w-10 h-10 object-cover shadow-md" />
                    
                    <div className="flex-1 truncate">
                      <h4 className={`text-[15px] font-medium truncate ${isCurrent ? "text-[#1db954]" : "text-white"}`}>
                        {decodeHtml(song.name || song.title)}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* VIRAL BUTTON */}
                    <button 
                      onClick={(e) => handleViralClick(e, song.name)}
                      className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-2 rounded-full text-orange-400 hover:text-white hover:bg-orange-500 transition-all shadow-[0_0_8px_rgba(251,146,60,0.2)]"
                      title="Make it Viral"
                    >
                      <TrendingUp size={18} />
                    </button>
                    <button className="text-[#a7a7a7] hover:text-white p-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition">
                      <MoreVertical size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {songs.length > 10 && (
            <button 
              onClick={() => setView("songs")}
              className="mt-4 text-[13px] font-bold text-[#a7a7a7] hover:text-white uppercase tracking-widest px-2 transition-colors"
            >
              See More
            </button>
          )}
        </div>
      )}

      {/* --- ALBUMS (2 Lines Side Scrollable) --- */}
      {albums.length > 0 && (
        <div className="px-5 md:px-8 mt-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold hover:underline cursor-pointer" onClick={() => setView("albums")}>Discography</h2>
            {albums.length > 10 && (
              <span onClick={() => setView("albums")} className="text-sm font-bold text-[#a7a7a7] hover:text-white cursor-pointer transition">
                Show all
              </span>
            )}
          </div>
          
          <div className="grid-2-rows pb-4">
            {albums.map((album: any, idx: number) => (
              <div 
                key={album.id + idx}
                onClick={() => router.push(`/album?link=${encodeURIComponent(album.url || album.perma_url)}`)}
                className="grid-card bg-[#181818] p-3 rounded-lg hover:bg-[#282828] transition group"
              >
                <div className="relative w-full aspect-square mb-3 shadow-lg rounded-md overflow-hidden bg-[#222]">
                  <img src={getImageUrl(album.image, "250")} alt={album.name} className="w-full h-full object-cover" loading="lazy" />
                  {/* Hover Play Button */}
                  <div className="absolute bottom-2 right-2 w-10 h-10 bg-[#1db954] rounded-full flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all shadow-xl">
                    <Play fill="black" size={20} className="text-black ml-1" />
                  </div>
                </div>
                <h3 className="text-[14px] font-bold text-white truncate">{decodeHtml(album.name || album.title)}</h3>
                <p className="text-[13px] text-[#a7a7a7] mt-1 capitalize truncate">{album.year || "Album"}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- SINGLES (2 Lines Side Scrollable) --- */}
      {singles.length > 0 && (
        <div className="px-5 md:px-8 mt-8">
          <h2 className="text-2xl font-bold mb-4">Singles & EPs</h2>
          <div className="grid-2-rows pb-4">
            {singles.map((single: any, idx: number) => (
              <div 
                key={single.id + idx}
                onClick={() => router.push(`/album?link=${encodeURIComponent(single.url || single.perma_url)}`)}
                className="grid-card bg-[#181818] p-3 rounded-lg hover:bg-[#282828] transition group"
              >
                <div className="relative w-full aspect-square mb-3 shadow-lg rounded-md overflow-hidden bg-[#222]">
                  <img src={getImageUrl(single.image, "250")} alt={single.name} className="w-full h-full object-cover" loading="lazy" />
                </div>
                <h3 className="text-[14px] font-bold text-white truncate">{decodeHtml(single.name || single.title)}</h3>
                <p className="text-[13px] text-[#a7a7a7] mt-1 capitalize truncate">{single.year || "Single"}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- ARTIST BIO --- */}
      {bioText && (
        <div className="px-5 md:px-8 mt-12 mb-8">
          <h2 className="text-2xl font-bold mb-4">About</h2>
          <div 
            onClick={() => setIsBioExpanded(!isBioExpanded)}
            className="group relative bg-[#181818] hover:bg-[#282828] transition p-6 rounded-xl cursor-pointer"
          >
            {/* Bio Header with Follower Count again for aesthetic */}
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-[#222]">
                <img src={getImageUrl(artist.image, "150")} className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="text-white font-bold text-lg">{formatNumber(artist.followerCount)}</p>
                <p className="text-[#a7a7a7] text-sm uppercase font-semibold tracking-widest">Followers</p>
              </div>
            </div>

            <p className="text-[#a7a7a7] text-[15px] leading-relaxed">
              {isBioExpanded ? bioText : `${bioText.substring(0, 200)}${bioText.length > 200 ? '...' : ''}`}
            </p>

            {bioText.length > 200 && (
              <div className="flex items-center gap-1 text-white font-bold mt-4 group-hover:underline">
                {isBioExpanded ? "Show Less" : "Read More"}
                {isBioExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ArtistPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-[#121212]">
        <Loader2 className="animate-spin text-[#1db954]" size={48} />
      </div>
    }>
      <ArtistContent />
    </Suspense>
  );
}
