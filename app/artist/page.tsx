"use client";
import { useEffect, useState, Suspense, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Play, ArrowLeft, Loader2, MoreVertical, BadgeCheck, 
  Users, ChevronRight, Mic2, Disc3 
} from "lucide-react";
import { useAppContext } from "../../context/AppContext";

// --- Helpers ---
const getImageUrl = (img: any) => {
  if (!img) return "https://via.placeholder.com/500";
  if (typeof img === "string") return img.replace("150x150", "500x500");
  if (Array.isArray(img)) return img[img.length - 1]?.url || img[0]?.url;
  return "https://via.placeholder.com/500";
};

const formatDuration = (seconds: number) => {
  if (!seconds) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const formatFollowers = (count: number) => {
  if (!count) return "";
  if (count > 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count > 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toLocaleString();
};

function ArtistContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id");
  
  const { setCurrentSong, setIsPlaying } = useAppContext();
  
  // --- States ---
  const [artist, setArtist] = useState<any>(null);
  
  const[topSongs, setTopSongs] = useState<any[]>([]);
  const [allSongs, setAllSongs] = useState<any[]>([]);
  const [totalSongsCount, setTotalSongsCount] = useState<number>(0);
  
  const [topAlbums, setTopAlbums] = useState<any[]>([]);
  const[allAlbums, setAllAlbums] = useState<any[]>([]);
  const [totalAlbumsCount, setTotalAlbumsCount] = useState<number>(0);
  
  const [singles, setSingles] = useState<any[]>([]);
  const [totalSinglesCount, setTotalSinglesCount] = useState<number>(0);
  
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'main' | 'songs' | 'albums'>('main');
  
  // --- Infinite Scroll States ---
  const [songPage, setSongPage] = useState(0);
  const [hasMoreSongs, setHasMoreSongs] = useState(true);
  const isFetchingSongsRef = useRef(false);

  const [albumPage, setAlbumPage] = useState(0);
  const [hasMoreAlbums, setHasMoreAlbums] = useState(true);
  const isFetchingAlbumsRef = useRef(false);

  // UI Refs
  const observerRef = useRef<HTMLDivElement | null>(null);
  const [restoredScrollPos, setRestoredScrollPos] = useState<number | null>(null);

  // --- 1. Core Data Fetching & Caching ---
  useEffect(() => {
    if (!id) return;
    
    // Check SessionStorage for instant scroll & state restoration
    const cacheKey = `artist_cache_${id}`;
    const cachedData = sessionStorage.getItem(cacheKey);

    if (cachedData) {
      const data = JSON.parse(cachedData);
      setArtist(data.artist);
      setTopSongs(data.topSongs);
      setAllSongs(data.allSongs);
      setTotalSongsCount(data.totalSongsCount);
      setTopAlbums(data.topAlbums);
      setAllAlbums(data.allAlbums);
      setTotalAlbumsCount(data.totalAlbumsCount);
      setSingles(data.singles);
      setTotalSinglesCount(data.totalSinglesCount);
      setViewMode(data.viewMode);
      setSongPage(data.songPage);
      setAlbumPage(data.albumPage);
      setHasMoreSongs(data.hasMoreSongs);
      setHasMoreAlbums(data.hasMoreAlbums);

      if (data.scrollPos) setRestoredScrollPos(data.scrollPos);
      sessionStorage.removeItem(cacheKey);
      setLoading(false);
      return;
    }

    // Fetch fresh data
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const [artistRes, songsRes, albumsRes] = await Promise.allSettled([
          fetch(`https://ayushm-psi.vercel.app/api/artists/${id}`).then(r => r.json()),
          fetch(`https://ayushm-psi.vercel.app/api/artists/${id}/songs?page=0`).then(r => r.json()),
          fetch(`https://ayushm-psi.vercel.app/api/artists/${id}/albums?page=0`).then(r => r.json())
        ]);

        let fetchedArtist = null;
        let fetchedSongs =[];

        // Parse Songs & Total
        if (songsRes.status === "fulfilled" && songsRes.value.data) {
          fetchedSongs = songsRes.value.data.songs ||[];
          setTopSongs(fetchedSongs.slice(0, 10)); 
          setAllSongs(fetchedSongs);
          setTotalSongsCount(songsRes.value.data.total || 0);
        }

        // Parse Main API & Extract Singles / Handle Fallback
        if (artistRes.status === "fulfilled" && artistRes.value.data && artistRes.value.data.name) {
          fetchedArtist = artistRes.value.data;
          if (fetchedArtist.topAlbums) {
            const apiSingles = fetchedArtist.topAlbums.filter((a: any) => a.songCount === 1 || a.type === 'single');
            setSingles(apiSingles);
            setTotalSinglesCount(apiSingles.length);
          }
        } else if (fetchedSongs.length > 0) {
          const firstSong = fetchedSongs[0];
          const primaryArtist = firstSong.artists?.primary?.find((a: any) => String(a.id) === String(id)) || firstSong.artists?.all?.[0];
          if (primaryArtist) {
            fetchedArtist = {
              id: primaryArtist.id, name: primaryArtist.name, image: primaryArtist.image,
              role: primaryArtist.role || "Artist", dominantLanguage: firstSong.language || "Unknown", followerCount: 0, bio:[]
            };
          }
        }
        setArtist(fetchedArtist);

        // Parse Albums & Extract remaining singles if not found
        if (albumsRes.status === "fulfilled" && albumsRes.value.data) {
          const rawAlbums = albumsRes.value.data.albums ||[];
          
          const pureAlbums = rawAlbums.filter((a: any) => a.songCount > 1 || !a.songCount);
          const pureSingles = rawAlbums.filter((a: any) => a.songCount === 1);

          setTopAlbums(pureAlbums.slice(0, 10));
          setAllAlbums(pureAlbums);
          setTotalAlbumsCount(albumsRes.value.data.total || pureAlbums.length);

          if (singles.length === 0) {
            setSingles(pureSingles);
            setTotalSinglesCount(pureSingles.length);
          }
        }

      } catch (error) {
        console.error("Error loading artist data:", error);
      }
      setLoading(false);
    };

    fetchInitialData();
  }, [id]);

  // Handle precise scroll restoration securely
  useEffect(() => {
    if (restoredScrollPos !== null && !loading) {
      const timer = setTimeout(() => {
        window.scrollTo({ top: restoredScrollPos, behavior: "instant" });
        setRestoredScrollPos(null);
      }, 150); 
      return () => clearTimeout(timer);
    }
  }, [restoredScrollPos, loading]); // Dependency explicitly optimized to prevent accidental jump re-triggers

  // --- 2. Navigation Wrapper (Saves state & exact scroll) ---
  const handleNavigate = (url: string) => {
    const cacheData = {
      artist, topSongs, allSongs, totalSongsCount,
      topAlbums, allAlbums, totalAlbumsCount,
      singles, totalSinglesCount, viewMode, songPage, albumPage,
      hasMoreSongs, hasMoreAlbums,
      scrollPos: window.scrollY 
    };
    sessionStorage.setItem(`artist_cache_${id}`, JSON.stringify(cacheData));
    router.push(url);
  };

  // --- 3. Batch Infinite Loaders (5 Pages / 50 items simultaneously) ---
  const loadMoreSongsBatch = useCallback(async () => {
    if (isFetchingSongsRef.current || !hasMoreSongs || !id) return;
    isFetchingSongsRef.current = true;
    setSongPage(prev => prev); // Trigger loader UI render

    try {
      const promises = Array.from({ length: 5 }, (_, i) => 
        fetch(`https://ayushm-psi.vercel.app/api/artists/${id}/songs?page=${songPage + i + 1}`).then(r => r.json())
      );
      const results = await Promise.allSettled(promises);
      
      let newBatch: any[] =[];
      results.forEach(res => {
        if (res.status === 'fulfilled' && res.value.data?.songs) {
          newBatch =[...newBatch, ...res.value.data.songs];
        }
      });

      setAllSongs(prev => {
        const existingIds = new Set(prev.map(s => s.id));
        const unique = newBatch.filter(s => !existingIds.has(s.id));
        
        if (unique.length === 0) {
          setHasMoreSongs(false); 
          return prev;
        }
        
        setSongPage(p => p + 5);
        return [...prev, ...unique];
      });
    } catch (e) { 
      setHasMoreSongs(false); 
    } finally { 
      isFetchingSongsRef.current = false; 
    }
  },[id, songPage, hasMoreSongs]);

  const loadMoreAlbumsBatch = useCallback(async () => {
    if (isFetchingAlbumsRef.current || !hasMoreAlbums || !id) return;
    isFetchingAlbumsRef.current = true;
    setAlbumPage(prev => prev); // Trigger loader UI

    try {
      const promises = Array.from({ length: 5 }, (_, i) => 
        fetch(`https://ayushm-psi.vercel.app/api/artists/${id}/albums?page=${albumPage + i + 1}`).then(r => r.json())
      );
      const results = await Promise.allSettled(promises);
      
      let newBatch: any[] =[];
      results.forEach(res => {
        if (res.status === 'fulfilled' && res.value.data?.albums) {
          newBatch = [...newBatch, ...res.value.data.albums];
        }
      });

      setAllAlbums(prev => {
        const existingIds = new Set(prev.map(a => a.id));
        const unique = newBatch.filter(a => !existingIds.has(a.id) && (a.songCount > 1 || !a.songCount));
        
        if (unique.length === 0) {
          setHasMoreAlbums(false); 
          return prev;
        }
        
        setAlbumPage(p => p + 5);
        return [...prev, ...unique];
      });
    } catch (e) { 
      setHasMoreAlbums(false); 
    } finally { 
      isFetchingAlbumsRef.current = false; 
    }
  },[id, albumPage, hasMoreAlbums]);

  // Observer Trigger
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        if (viewMode === 'songs') loadMoreSongsBatch();
        if (viewMode === 'albums') loadMoreAlbumsBatch();
      }
    }, { rootMargin: '400px' }); 

    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [loadMoreSongsBatch, loadMoreAlbumsBatch, viewMode]);


  if (loading) return <div className="flex h-screen items-center justify-center bg-neutral-950"><Loader2 className="animate-spin text-white" size={40} /></div>;
  if (!artist) return <div className="flex h-screen items-center justify-center bg-neutral-950 text-neutral-400 font-medium">Artist could not be loaded.</div>;

  const playSong = (song: any) => { setCurrentSong(song); setIsPlaying(true); };

  // --- UI REUSABLE COMPONENTS ---

  const ViewAllHeader = ({ title, countLabel }: { title: string, countLabel: string }) => (
    <div className="sticky top-0 bg-neutral-950/80 backdrop-blur-xl z-40 -mx-4 px-4 py-3 md:py-4 mb-6 flex items-center gap-4 shadow-lg border-b border-white/5">
      <button onClick={() => { setViewMode('main'); window.scrollTo(0, 0); }} className="p-2.5 bg-white/10 rounded-full hover:bg-white/20 text-white transition-all">
        <ArrowLeft size={22} />
      </button>
      <img src={getImageUrl(artist.image)} className="w-12 h-12 md:w-14 md:h-14 rounded-full object-cover shadow-lg border border-white/10" />
      <div>
        <h1 className="text-lg md:text-xl font-black text-white leading-tight truncate">{artist.name}</h1>
        <p className="text-xs md:text-sm text-neutral-400 font-medium">{title} • {countLabel}</p>
      </div>
    </div>
  );

  const SongItem = ({ song, index }: { song: any, index: number }) => (
    <div key={`song-${song.id}-${index}`} onClick={() => playSong(song)} className="flex items-center gap-3 md:gap-4 p-2.5 md:p-3 rounded-xl hover:bg-white/5 cursor-pointer group transition-colors">
      <span className="text-neutral-500 text-sm font-medium w-6 text-center group-hover:text-white">{index + 1}</span>
      <img src={getImageUrl(song.image)} className="w-12 h-12 rounded-md object-cover shadow-sm bg-neutral-800" />
      <div className="flex-1 overflow-hidden">
        <h3 className="text-sm md:text-base font-bold text-white truncate">{song.name || song.title}</h3>
        <p className="text-xs md:text-sm text-neutral-400 truncate mt-0.5">{song.artists?.primary?.map((a:any)=>a.name).join(', ') || artist.name}</p>
      </div>
      <div className="hidden md:block text-sm text-neutral-500 w-16 text-right mr-4 font-medium">{formatDuration(song.duration)}</div>
      <MoreVertical size={20} className="text-neutral-500 hover:text-white" />
    </div>
  );

  const TwoLineCards = ({ items, type }: { items: any[], type: string }) => (
    <div className="grid grid-rows-2 grid-flow-col gap-4 md:gap-6 overflow-x-auto snap-x hide-scrollbar pb-6 pt-2 auto-cols-[115px] sm:auto-cols-[140px] md:auto-cols-[170px] scroll-smooth">
      {items.map((item: any, index: number) => (
        <div key={`scroll-${item.id}-${index}`} onClick={() => handleNavigate(`/album?link=${encodeURIComponent(item.url)}`)} className="snap-start flex flex-col cursor-pointer group">
          <div className="relative overflow-hidden rounded-lg md:rounded-xl aspect-square shadow-md mb-2">
            <img src={getImageUrl(item.image)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 bg-neutral-800" />
          </div>
          <h3 className="text-xs md:text-sm font-bold text-white truncate">{item.name}</h3>
          <p className="text-[10px] md:text-xs text-neutral-400 mt-0.5 truncate font-medium">
            {item.year && `${item.year} • `} 
            {item.songCount ? `${item.songCount} Songs` : type}
          </p>
        </div>
      ))}
    </div>
  );

  // overflowAnchor: 'none' securely prevents jumping when new batches of 50 albums load
  const GridView = ({ items, type }: { items: any[], type: string }) => (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-5" style={{ overflowAnchor: 'none' }}>
      {items.map((item: any, index: number) => (
        <div key={`grid-${item.id}-${index}`} onClick={() => handleNavigate(`/album?link=${encodeURIComponent(item.url)}`)} className="flex flex-col cursor-pointer group">
          <div className="relative overflow-hidden rounded-lg md:rounded-xl shadow-md mb-2 aspect-square">
            <img src={getImageUrl(item.image)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 bg-neutral-800" />
          </div>
          <h3 className="text-xs md:text-sm font-bold text-white truncate">{item.name}</h3>
          <p className="text-[10px] md:text-xs text-neutral-400 truncate mt-0.5 font-medium">
            {item.year && `${item.year} • `} 
            {item.songCount ? `${item.songCount} Songs` : type}
          </p>
        </div>
      ))}
    </div>
  );

  // --- SUB VIEWS ---

  if (viewMode === 'songs') return (
    <div className="min-h-screen bg-neutral-950 pb-28 pt-2 px-4 md:px-8 max-w-7xl mx-auto animate-in fade-in">
      <ViewAllHeader title="All Songs" countLabel={`${totalSongsCount.toLocaleString()} Total Songs`} />
      <div className="flex flex-col gap-1" style={{ overflowAnchor: 'none' }}>
        {allSongs.map((song, idx) => <SongItem key={`song-${song.id}-${idx}`} song={song} index={idx} />)}
      </div>
      <div ref={observerRef} className="py-8 flex justify-center">
        {isFetchingSongsRef.current ? <Loader2 className="animate-spin text-white" size={32} /> : 
        !hasMoreSongs && <span className="text-neutral-500 font-medium text-sm">End of tracklist</span>}
      </div>
    </div>
  );

  if (viewMode === 'albums') return (
    <div className="min-h-screen bg-neutral-950 pb-28 pt-2 px-4 md:px-8 max-w-7xl mx-auto animate-in fade-in">
      <ViewAllHeader title="All Albums" countLabel={`${totalAlbumsCount.toLocaleString()} Total Albums`} />
      <GridView items={allAlbums} type="Album" />
      <div ref={observerRef} className="py-10 flex justify-center">
        {isFetchingAlbumsRef.current ? <Loader2 className="animate-spin text-white" size={32} /> : 
        !hasMoreAlbums && <span className="text-neutral-500 font-medium text-sm">End of albums</span>}
      </div>
    </div>
  );

  // --- MAIN PAGE VIEW ---
  return (
    <div className="pb-28 min-h-screen bg-neutral-950 w-full overflow-hidden">
      
      {/* 1. Artist Hero Section (Lighter Base, True Image Extraction) */}
      <div className="relative w-full h-[400px] md:h-[500px] flex flex-col justify-end bg-neutral-900 overflow-hidden">
        {/* Dynamic Light Blurred Background */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div 
            className="absolute inset-[-10%] bg-cover bg-center blur-[80px] saturate-[1.5] opacity-50"
            style={{ backgroundImage: `url(${getImageUrl(artist.image)})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />
        </div>
        
        <div className="absolute top-0 left-0 right-0 p-4 md:p-6 z-30">
          <button onClick={() => router.back()} className="bg-black/20 p-2.5 rounded-full backdrop-blur-xl text-white hover:bg-white/20 transition-all border border-white/10 shadow-sm">
            <ArrowLeft size={24} />
          </button>
        </div>

        {/* Hero Identity */}
        <div className="relative z-20 px-4 md:px-10 pb-8 max-w-7xl mx-auto w-full flex flex-col md:flex-row md:items-end gap-5 md:gap-8">
          <img 
            src={getImageUrl(artist.image)} 
            className="w-36 h-36 md:w-56 md:h-56 rounded-full shadow-[0_15px_40px_rgba(0,0,0,0.4)] object-cover border-[3px] border-white/20 bg-neutral-800" 
            alt={artist.name}
          />
          <div className="flex flex-col gap-1.5 flex-1">
            <div className="flex items-center gap-1.5 text-blue-400 font-bold text-xs md:text-sm uppercase tracking-widest drop-shadow-sm">
              <BadgeCheck size={18} fill="currentColor" className="text-white" /> Verified Artist
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white tracking-tight drop-shadow-lg leading-none">
              {artist.name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs md:text-sm text-neutral-200 mt-2 font-semibold">
              {artist.followerCount > 0 && (
                <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full backdrop-blur-md border border-white/5">
                  <Users size={14} /> {formatFollowers(artist.followerCount)} Followers
                </span>
              )}
              {artist.dominantLanguage && <span className="capitalize flex items-center gap-1 text-neutral-300"><Mic2 size={14} /> {artist.dominantLanguage}</span>}
              <span className="capitalize flex items-center gap-1 text-neutral-300"><Disc3 size={14} /> {artist.dominantType || artist.role || 'Artist'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="max-w-7xl mx-auto px-4 md:px-10 relative z-30 -mt-4">
        
        {/* Play Action */}
        <div className="mb-10 flex gap-4 items-center">
          <button 
            onClick={() => topSongs.length && playSong(topSongs[0])} 
            className="bg-white text-black p-4 md:p-5 rounded-full active:scale-95 transition-transform shadow-[0_5px_20px_rgba(255,255,255,0.3)] hover:scale-105"
          >
            <Play fill="black" size={26} className="ml-1" />
          </button>
        </div>

        {/* 2. Top Songs */}
        {topSongs.length > 0 && (
          <section className="mb-12">
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-2xl md:text-3xl font-black text-white">Popular Songs</h2>
              <button onClick={() => { setViewMode('songs'); window.scrollTo(0,0); }} className="text-sm font-bold text-neutral-400 hover:text-white transition-colors flex items-center gap-0.5">
                View All <ChevronRight size={18} />
              </button>
            </div>
            <div className="flex flex-col gap-1 bg-white/[0.02] p-2 md:p-3 rounded-2xl border border-white/5">
              {topSongs.map((song: any, index: number) => (
                <SongItem key={`top-song-${song.id}-${index}`} song={song} index={index} />
              ))}
            </div>
          </section>
        )}

        {/* 3. Albums (2-Line Grid) */}
        {topAlbums.length > 0 && (
          <section className="mb-12">
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-2xl md:text-3xl font-black text-white">Albums</h2>
              <button onClick={() => { setViewMode('albums'); window.scrollTo(0,0); }} className="text-sm font-bold text-neutral-400 hover:text-white transition-colors flex items-center gap-0.5">
                View All <ChevronRight size={18} />
              </button>
            </div>
            <TwoLineCards items={topAlbums} type="Album" />
          </section>
        )}

        {/* 4. Singles (2-Line Grid - NO VIEW ALL BUTTON) */}
        {singles.length > 0 && (
          <section className="mb-12">
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-2xl md:text-3xl font-black text-white">Singles & EPs</h2>
            </div>
            <TwoLineCards items={singles} type="Single" />
          </section>
        )}

        {/* 5. Biography */}
        {artist.bio && artist.bio.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl md:text-3xl font-black text-white mb-6">About</h2>
            <div className="bg-white/[0.02] rounded-3xl p-6 md:p-8 backdrop-blur-md border border-white/5 shadow-md">
              <div className="space-y-5 text-neutral-300 text-sm md:text-base leading-relaxed">
                {artist.bio.map((para: any) => (
                  <div key={para.sequence}>
                    {para.title && <h3 className="text-white font-bold text-lg mb-1.5">{para.title}</h3>}
                    <p className="whitespace-pre-line">{para.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

      </div>
    </div>
  );
}

export default function ArtistPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-neutral-950"><Loader2 className="animate-spin text-white" size={40} /></div>}>
      <ArtistContent />
    </Suspense>
  );
}
