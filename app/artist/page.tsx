"use client";
import { useEffect, useState, Suspense, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Play, ArrowLeft, Loader2, MoreVertical, BadgeCheck, 
  Users, ChevronRight, Mic2, Disc3, Music
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
  
  const [topSongs, setTopSongs] = useState<any[]>([]);
  const [allSongs, setAllSongs] = useState<any[]>([]);
  const[totalSongsCount, setTotalSongsCount] = useState<number>(0);
  
  const[topAlbums, setTopAlbums] = useState<any[]>([]);
  const [allAlbums, setAllAlbums] = useState<any[]>([]);
  const [totalAlbumsCount, setTotalAlbumsCount] = useState<number>(0);
  
  const [singles, setSingles] = useState<any[]>([]);
  
  const[loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'main' | 'songs' | 'albums' | 'singles'>('main');
  
  // Infinite Scroll States
  const [songPage, setSongPage] = useState(0);
  const[hasMoreSongs, setHasMoreSongs] = useState(true);
  const [isFetchingSongs, setIsFetchingSongs] = useState(false);

  const [albumPage, setAlbumPage] = useState(0);
  const[hasMoreAlbums, setHasMoreAlbums] = useState(true);
  const[isFetchingAlbums, setIsFetchingAlbums] = useState(false);

  const observerRef = useRef<HTMLDivElement | null>(null);

  // --- Core Data Fetching & Caching ---
  useEffect(() => {
    if (!id) return;
    
    // 1. Check SessionStorage for instant scroll restoration
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
      setViewMode(data.viewMode);
      setSongPage(data.songPage);
      setAlbumPage(data.albumPage);
      setHasMoreSongs(data.hasMoreSongs);
      setHasMoreAlbums(data.hasMoreAlbums);

      // Restore Scroll Position seamlessly
      if (data.scrollPos) {
        setTimeout(() => window.scrollTo(0, data.scrollPos), 100);
      }
      
      sessionStorage.removeItem(cacheKey); // Clear cache after restoring
      setLoading(false);
      return;
    }

    // 2. Fetch fresh data if no cache exists
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const[artistRes, songsRes, albumsRes] = await Promise.allSettled([
          fetch(`https://ayushm-psi.vercel.app/api/artists/${id}`).then(r => r.json()),
          fetch(`https://ayushm-psi.vercel.app/api/artists/${id}/songs?page=0`).then(r => r.json()),
          fetch(`https://ayushm-psi.vercel.app/api/artists/${id}/albums?page=0`).then(r => r.json())
        ]);

        let fetchedArtist = null;
        let fetchedSongs =[];

        // Parse Songs
        if (songsRes.status === "fulfilled" && songsRes.value.data) {
          fetchedSongs = songsRes.value.data.songs ||[];
          setTopSongs(fetchedSongs.slice(0, 10)); // Display 10 top songs
          setAllSongs(fetchedSongs);
          setTotalSongsCount(songsRes.value.data.total || 0);
        }

        // Parse Main API & Extract Singles
        if (artistRes.status === "fulfilled" && artistRes.value.data && artistRes.value.data.name) {
          fetchedArtist = artistRes.value.data;
          if (fetchedArtist.singles) setSingles(fetchedArtist.singles);
        } else if (fetchedSongs.length > 0) {
          // Fallback if Main API fails
          const firstSong = fetchedSongs[0];
          const primaryArtist = firstSong.artists?.primary?.find((a: any) => String(a.id) === String(id));
          if (primaryArtist) {
            fetchedArtist = {
              id: primaryArtist.id, name: primaryArtist.name, image: primaryArtist.image,
              role: primaryArtist.role || "Artist", dominantLanguage: firstSong.language || "Unknown", followerCount: 0, bio:[]
            };
          }
        }
        setArtist(fetchedArtist);

        // Parse Albums
        if (albumsRes.status === "fulfilled" && albumsRes.value.data) {
          const fetchedAlbums = albumsRes.value.data.albums ||[];
          setTopAlbums(fetchedAlbums.slice(0, 10)); // Top 10 for main page
          setAllAlbums(fetchedAlbums);
          setTotalAlbumsCount(albumsRes.value.data.total || 0);

          // If main API failed to provide singles, extract them from albums
          if (!fetchedArtist?.singles && singles.length === 0) {
            setSingles(fetchedAlbums.filter((a: any) => a.songCount === 1));
          }
        }

      } catch (error) {
        console.error("Critical error loading artist data:", error);
      }
      setLoading(false);
    };

    fetchInitialData();
  }, [id]);

  // --- Navigate Wrapper to save state & scroll position ---
  const handleNavigate = (url: string) => {
    const cacheData = {
      artist, topSongs, allSongs, totalSongsCount,
      topAlbums, allAlbums, totalAlbumsCount,
      singles, viewMode, songPage, albumPage,
      hasMoreSongs, hasMoreAlbums,
      scrollPos: window.scrollY // Save Exact Scroll Position
    };
    sessionStorage.setItem(`artist_cache_${id}`, JSON.stringify(cacheData));
    router.push(url);
  };

  // --- Infinite Scroll Batch Loaders (5 Pages Simultaneously) ---
  const loadMoreSongsBatch = useCallback(async () => {
    if (isFetchingSongs || !hasMoreSongs || !id) return;
    setIsFetchingSongs(true);
    try {
      const promises = Array.from({ length: 5 }, (_, i) => 
        fetch(`https://ayushm-psi.vercel.app/api/artists/${id}/songs?page=${songPage + i + 1}`).then(r => r.json())
      );
      const results = await Promise.allSettled(promises);
      let newBatch: any[] =[];
      results.forEach(res => {
        if (res.status === 'fulfilled' && res.value.data?.songs) {
          newBatch = [...newBatch, ...res.value.data.songs];
        }
      });
      if (newBatch.length > 0) {
        setAllSongs(prev =>[...prev, ...newBatch]);
        setSongPage(prev => prev + 5);
      } else {
        setHasMoreSongs(false);
      }
    } catch (e) { setHasMoreSongs(false); } finally { setIsFetchingSongs(false); }
  },[id, songPage, isFetchingSongs, hasMoreSongs]);

  const loadMoreAlbumsBatch = useCallback(async () => {
    if (isFetchingAlbums || !hasMoreAlbums || !id) return;
    setIsFetchingAlbums(true);
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
      if (newBatch.length > 0) {
        // Prevent duplication
        setAllAlbums(prev => {
          const ids = new Set(prev.map(a => a.id));
          return[...prev, ...newBatch.filter(a => !ids.has(a.id))];
        });
        setAlbumPage(prev => prev + 5);
      } else {
        setHasMoreAlbums(false);
      }
    } catch (e) { setHasMoreAlbums(false); } finally { setIsFetchingAlbums(false); }
  }, [id, albumPage, isFetchingAlbums, hasMoreAlbums]);

  // Observer Trigger
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        if (viewMode === 'songs') loadMoreSongsBatch();
        if (viewMode === 'albums') loadMoreAlbumsBatch();
      }
    }, { rootMargin: '400px' }); // Load heavily before reaching bottom

    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  },[loadMoreSongsBatch, loadMoreAlbumsBatch, viewMode]);


  if (loading) return <div className="flex h-screen items-center justify-center bg-black"><Loader2 className="animate-spin text-white" size={40} /></div>;
  if (!artist) return <div className="flex h-screen items-center justify-center bg-black text-neutral-400 font-bold text-xl">Artist could not be loaded.</div>;

  const playSong = (song: any) => { setCurrentSong(song); setIsPlaying(true); };

  // --- UI REUSABLE COMPONENTS ---

  const ViewAllHeader = ({ title, countLabel }: { title: string, countLabel: string }) => (
    <div className="sticky top-0 bg-black/80 backdrop-blur-xl z-40 -mx-4 px-4 py-3 md:py-4 mb-6 flex items-center gap-4 shadow-[0_10px_40px_rgba(0,0,0,0.8)] border-b border-white/5">
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
    <div key={`${song.id}-${index}`} onClick={() => playSong(song)} className="flex items-center gap-3 md:gap-4 p-2.5 md:p-3 rounded-xl hover:bg-white/10 cursor-pointer group transition-colors">
      <span className="text-neutral-500 text-sm font-medium w-6 text-center group-hover:text-white">{index + 1}</span>
      <img src={getImageUrl(song.image)} className="w-12 h-12 rounded-md object-cover shadow-md bg-neutral-800" />
      <div className="flex-1 overflow-hidden">
        <h3 className="text-sm md:text-base font-bold text-white truncate">{song.name}</h3>
        <p className="text-xs md:text-sm text-neutral-400 truncate mt-0.5">{song.artists?.primary?.map((a:any)=>a.name).join(', ') || artist.name}</p>
      </div>
      <div className="hidden md:block text-sm text-neutral-500 w-16 text-right mr-4 font-medium">{formatDuration(song.duration)}</div>
      <MoreVertical size={20} className="text-neutral-500 hover:text-white" />
    </div>
  );

  // Deep CSS Grid layout for 2-line cards
  const TwoLineCards = ({ items, type }: { items: any[], type: string }) => (
    <div className="grid grid-rows-2 grid-flow-col gap-4 md:gap-6 overflow-x-auto snap-x hide-scrollbar pb-6 pt-2 auto-cols-[140px] md:auto-cols-[170px] scroll-smooth">
      {items.map((item: any) => (
        <div key={item.id} onClick={() => handleNavigate(`/album?link=${encodeURIComponent(item.url)}`)} className="snap-start flex flex-col cursor-pointer group">
          <div className="relative overflow-hidden rounded-xl aspect-square shadow-[0_10px_20px_rgba(0,0,0,0.5)] mb-3">
            <img src={getImageUrl(item.image)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 bg-neutral-800" />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
          </div>
          <h3 className="text-sm md:text-base font-bold text-white truncate">{item.name}</h3>
          <p className="text-xs text-neutral-400 mt-0.5 truncate font-medium">
            {item.year && `${item.year} • `} {type}
          </p>
        </div>
      ))}
    </div>
  );

  const GridView = ({ items, type }: { items: any[], type: string }) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
      {items.map((item: any) => (
        <div key={item.id} onClick={() => handleNavigate(`/album?link=${encodeURIComponent(item.url)}`)} className="flex flex-col cursor-pointer group">
          <div className="relative overflow-hidden rounded-xl shadow-xl mb-3 aspect-square">
            <img src={getImageUrl(item.image)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 bg-neutral-900" />
          </div>
          <h3 className="text-sm md:text-base font-bold text-white truncate">{item.name}</h3>
          <p className="text-xs text-neutral-400 truncate mt-0.5">{item.year || "Release"} • {type}</p>
        </div>
      ))}
    </div>
  );

  // --- VIEW RENDERERS ---

  if (viewMode === 'songs') return (
    <div className="min-h-screen bg-black pb-28 pt-2 px-4 md:px-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4">
      <ViewAllHeader title="All Songs" countLabel={`${totalSongsCount.toLocaleString()} Total Songs`} />
      <div className="flex flex-col gap-1">
        {allSongs.map((song, idx) => <SongItem key={`${song.id}-${idx}`} song={song} index={idx} />)}
      </div>
      <div ref={observerRef} className="py-8 flex justify-center">
        {isFetchingSongs ? <Loader2 className="animate-spin text-white" size={32} /> : 
        !hasMoreSongs && <span className="text-neutral-500 font-medium">End of tracklist</span>}
      </div>
    </div>
  );

  if (viewMode === 'albums') return (
    <div className="min-h-screen bg-black pb-28 pt-2 px-4 md:px-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4">
      <ViewAllHeader title="All Albums" countLabel={`${totalAlbumsCount.toLocaleString()} Total Albums`} />
      <GridView items={allAlbums} type="Album" />
      <div ref={observerRef} className="py-10 flex justify-center">
        {isFetchingAlbums ? <Loader2 className="animate-spin text-white" size={32} /> : 
        !hasMoreAlbums && <span className="text-neutral-500 font-medium">End of albums</span>}
      </div>
    </div>
  );

  if (viewMode === 'singles') return (
    <div className="min-h-screen bg-black pb-28 pt-2 px-4 md:px-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4">
      <ViewAllHeader title="Singles & EPs" countLabel={`${singles.length} Total Singles`} />
      <GridView items={singles} type="Single" />
    </div>
  );

  // --- MAIN PAGE ---
  return (
    <div className="pb-28 min-h-screen bg-[#090909] w-full overflow-hidden">
      
      {/* 1. Artist Hero Section (Premium Color Extraction Glassmorphism) */}
      <div className="relative w-full h-[450px] md:h-[550px] flex flex-col justify-end bg-black">
        {/* Dynamic Heavy Blur Background */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div 
            className="absolute inset-[-25%] bg-cover bg-center blur-[120px] saturate-[2.5] opacity-60 md:opacity-50"
            style={{ backgroundImage: `url(${getImageUrl(artist.image)})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/40 to-[#090909]" />
        </div>
        
        <div className="absolute top-0 left-0 right-0 p-4 md:p-6 z-30">
          <button onClick={() => router.back()} className="bg-black/20 p-3 rounded-full backdrop-blur-xl text-white hover:bg-white/20 transition-all border border-white/10">
            <ArrowLeft size={24} />
          </button>
        </div>

        {/* Hero Identity */}
        <div className="relative z-20 px-4 md:px-10 pb-8 max-w-7xl mx-auto w-full flex flex-col md:flex-row md:items-end gap-6 md:gap-8">
          <img 
            src={getImageUrl(artist.image)} 
            className="w-40 h-40 md:w-64 md:h-64 rounded-full shadow-[0_20px_60px_rgba(0,0,0,0.8)] object-cover border-[4px] border-white/20" 
            alt={artist.name}
          />
          <div className="flex flex-col gap-2 flex-1">
            <div className="flex items-center gap-2 text-[#3b82f6] font-bold text-xs md:text-sm uppercase tracking-widest drop-shadow-md">
              <BadgeCheck size={20} fill="currentColor" className="text-white" /> Verified Artist
            </div>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tighter drop-shadow-2xl leading-none">
              {artist.name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 md:gap-4 text-sm md:text-base text-neutral-200 mt-3 font-semibold">
              {artist.followerCount > 0 && (
                <span className="flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full backdrop-blur-md border border-white/5 shadow-inner">
                  <Users size={16} /> {formatFollowers(artist.followerCount)} Followers
                </span>
              )}
              {artist.dominantLanguage && <span className="capitalize flex items-center gap-1.5"><Mic2 size={16} /> {artist.dominantLanguage}</span>}
              <span className="capitalize flex items-center gap-1.5"><Disc3 size={16} /> {artist.dominantType || artist.role || 'Artist'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="max-w-7xl mx-auto px-4 md:px-10 relative z-30 -mt-6">
        
        {/* Floating Play Button */}
        <div className="mb-10 flex gap-4 items-center">
          <button 
            onClick={() => topSongs.length && playSong(topSongs[0])} 
            className="bg-white text-black p-5 md:p-6 rounded-full active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.4)] hover:scale-105"
          >
            <Play fill="black" size={30} className="ml-1" />
          </button>
        </div>

        {/* 2. Top Songs */}
        {topSongs.length > 0 && (
          <section className="mb-14">
            <div className="flex justify-between items-end mb-5">
              <h2 className="text-2xl md:text-3xl font-black text-white">Popular Songs</h2>
              <button onClick={() => { setViewMode('songs'); window.scrollTo(0,0); }} className="text-sm font-bold text-neutral-400 hover:text-white transition-colors flex items-center gap-1">
                View All <ChevronRight size={18} />
              </button>
            </div>
            <div className="flex flex-col gap-1 bg-neutral-900/40 p-2 md:p-3 rounded-2xl border border-white/5">
              {topSongs.map((song: any, index: number) => (
                <SongItem key={song.id} song={song} index={index} />
              ))}
            </div>
          </section>
        )}

        {/* 3. Albums (2-Line Grid) */}
        {topAlbums.length > 0 && (
          <section className="mb-14">
            <div className="flex justify-between items-end mb-5">
              <h2 className="text-2xl md:text-3xl font-black text-white">Albums</h2>
              <button onClick={() => { setViewMode('albums'); window.scrollTo(0,0); }} className="text-sm font-bold text-neutral-400 hover:text-white transition-colors flex items-center gap-1">
                View All <ChevronRight size={18} />
              </button>
            </div>
            <TwoLineCards items={topAlbums} type="Album" />
          </section>
        )}

        {/* 4. Singles (2-Line Grid) */}
        {singles.length > 0 && (
          <section className="mb-14">
            <div className="flex justify-between items-end mb-5">
              <h2 className="text-2xl md:text-3xl font-black text-white">Singles & EPs</h2>
              <button onClick={() => { setViewMode('singles'); window.scrollTo(0,0); }} className="text-sm font-bold text-neutral-400 hover:text-white transition-colors flex items-center gap-1">
                View All <ChevronRight size={18} />
              </button>
            </div>
            <TwoLineCards items={singles} type="Single" />
          </section>
        )}

        {/* 5. Biography */}
        {artist.bio && artist.bio.length > 0 && (
          <section className="mb-14">
            <h2 className="text-2xl md:text-3xl font-black text-white mb-6">About</h2>
            <div className="bg-neutral-900/60 rounded-3xl p-6 md:p-10 backdrop-blur-xl border border-white/10 shadow-2xl">
              <div className="space-y-6 text-neutral-300 text-sm md:text-base leading-relaxed">
                {artist.bio.map((para: any) => (
                  <div key={para.sequence}>
                    {para.title && <h3 className="text-white font-bold text-lg mb-2">{para.title}</h3>}
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
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-black"><Loader2 className="animate-spin text-white" size={40} /></div>}>
      <ArtistContent />
    </Suspense>
  );
}
