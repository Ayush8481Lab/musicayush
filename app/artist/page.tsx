"use client";
import { useEffect, useState, Suspense, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Play, ArrowLeft, Loader2, MoreVertical, BadgeCheck, 
  Clock, Users, ChevronRight, Mic2
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
  
  const [albums, setAlbums] = useState<any[]>([]);
  const[singles, setSingles] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'main' | 'songs' | 'albums' | 'singles'>('main');
  
  // Infinite Scroll States
  const[songPage, setSongPage] = useState(0);
  const [hasMoreSongs, setHasMoreSongs] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const observerRef = useRef<HTMLDivElement | null>(null);

  // --- Initial Data Fetch ---
  useEffect(() => {
    if (!id) return;
    
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

        // 1. Handle Songs & Extract Total
        if (songsRes.status === "fulfilled" && songsRes.value.data) {
          fetchedSongs = songsRes.value.data.songs ||[];
          setTopSongs(fetchedSongs);
          setAllSongs(fetchedSongs);
          setTotalSongsCount(songsRes.value.data.total || 0);
        }

        // 2. Handle Main API vs Fallback Logic
        if (artistRes.status === "fulfilled" && artistRes.value.data && artistRes.value.data.name) {
          fetchedArtist = artistRes.value.data;
        } else if (fetchedSongs.length > 0) {
          // Data Scientist Fallback Strategy
          const firstSong = fetchedSongs[0];
          const allArtists = [
            ...(firstSong.artists?.primary || []), 
            ...(firstSong.artists?.all ||[]),
            ...(firstSong.artists?.featured ||[])
          ];
          const matchingArtist = allArtists.find((a: any) => String(a.id) === String(id));
          
          if (matchingArtist) {
            fetchedArtist = {
              id: matchingArtist.id,
              name: matchingArtist.name,
              image: matchingArtist.image,
              role: matchingArtist.role || "Artist",
              dominantLanguage: firstSong.language || "Unknown",
              followerCount: 0, 
              bio:[]
            };
          }
        }
        setArtist(fetchedArtist);

        // 3. Handle Albums & Singles (API provides separate arrays natively)
        if (albumsRes.status === "fulfilled" && albumsRes.value.data) {
          setAlbums(albumsRes.value.data.albums ||[]);
          setSingles(albumsRes.value.data.singles ||[]);
        }

      } catch (error) {
        console.error("Critical error loading artist data:", error);
      }
      setLoading(false);
    };

    fetchInitialData();
  }, [id]);

  // --- Infinite Scroll: 5 Pages Batch Fetching ---
  const loadMoreSongsBatch = useCallback(async () => {
    if (isFetchingMore || !hasMoreSongs || !id) return;
    setIsFetchingMore(true);

    try {
      const fetchPromises =[];
      // Request next 5 pages simultaneously
      for (let i = 1; i <= 5; i++) {
        fetchPromises.push(
          fetch(`https://ayushm-psi.vercel.app/api/artists/${id}/songs?page=${songPage + i}`).then(r => r.json())
        );
      }

      const results = await Promise.allSettled(fetchPromises);
      let newBatch: any[] =[];
      let anyDataFound = false;

      results.forEach(res => {
        if (res.status === 'fulfilled' && res.value.data?.songs?.length) {
          newBatch =[...newBatch, ...res.value.data.songs];
          anyDataFound = true;
        }
      });

      if (anyDataFound) {
        setAllSongs(prev => [...prev, ...newBatch]);
        setSongPage(prev => prev + 5);
      } else {
        setHasMoreSongs(false); // Hit the end
      }
    } catch (e) {
      setHasMoreSongs(false);
    } finally {
      setIsFetchingMore(false);
    }
  }, [id, songPage, isFetchingMore, hasMoreSongs]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && viewMode === 'songs') {
        loadMoreSongsBatch();
      }
    }, { rootMargin: '300px' }); // Trigger load slightly before hitting bottom

    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [loadMoreSongsBatch, viewMode]);


  if (loading) return <div className="flex h-screen items-center justify-center bg-black"><Loader2 className="animate-spin text-white" size={40} /></div>;
  if (!artist) return <div className="flex h-screen items-center justify-center bg-black text-neutral-400">Artist could not be loaded.</div>;

  const playSong = (song: any) => { setCurrentSong(song); setIsPlaying(true); };

  // --- UI COMPONENTS ---

  const SongItem = ({ song, index }: { song: any, index: number }) => (
    <div key={`${song.id}-${index}`} onClick={() => playSong(song)} className="flex items-center gap-3 md:gap-4 p-2 md:p-3 rounded-xl hover:bg-white/10 cursor-pointer group transition-all">
      <span className="text-neutral-500 text-sm font-medium w-6 text-center group-hover:text-white">{index + 1}</span>
      <img src={getImageUrl(song.image)} className="w-12 h-12 rounded-md object-cover shadow-md" />
      <div className="flex-1 overflow-hidden">
        <h3 className="text-sm md:text-base font-bold text-white truncate">{song.name}</h3>
        <p className="text-xs md:text-sm text-neutral-400 truncate mt-0.5">{song.artists?.primary?.map((a:any)=>a.name).join(', ') || artist.name}</p>
      </div>
      <div className="hidden md:block text-sm text-neutral-500 w-16 text-right mr-4">{formatDuration(song.duration)}</div>
      <MoreVertical size={20} className="text-neutral-500 hover:text-white" />
    </div>
  );

  const TwoLineCards = ({ items, type }: { items: any[], type: string }) => (
    <div className="grid grid-rows-2 grid-flow-col gap-4 overflow-x-auto snap-x hide-scrollbar pb-6 auto-cols-[140px] md:auto-cols-[180px]">
      {items.map((item: any) => (
        <div key={item.id} onClick={() => router.push(`/album?link=${encodeURIComponent(item.url)}`)} className="snap-start flex flex-col cursor-pointer group">
          <div className="relative overflow-hidden rounded-xl aspect-square shadow-lg mb-2">
            <img src={getImageUrl(item.image)} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 bg-neutral-800" />
            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
          </div>
          <h3 className="text-sm md:text-base font-bold text-white truncate">{item.name}</h3>
          <p className="text-xs text-neutral-400 mt-0.5 truncate">
            {item.year && `${item.year} • `} {type} {item.songCount && `• ${item.songCount} Songs`}
          </p>
        </div>
      ))}
    </div>
  );

  const GridView = ({ items, type }: { items: any[], type: string }) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
      {items.map((item: any) => (
        <div key={item.id} onClick={() => router.push(`/album?link=${encodeURIComponent(item.url)}`)} className="flex flex-col cursor-pointer group">
          <img src={getImageUrl(item.image)} className="w-full aspect-square object-cover rounded-xl shadow-lg mb-2 group-hover:scale-105 transition-transform duration-300" />
          <h3 className="text-sm font-bold text-white truncate">{item.name}</h3>
          <p className="text-xs text-neutral-400 truncate">{item.year || "Release"} • {type}</p>
        </div>
      ))}
    </div>
  );

  // --- SUB-VIEWS ---

  if (viewMode === 'songs') return (
    <div className="min-h-screen bg-black pb-28 pt-6 px-4 md:px-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4">
      <div className="sticky top-0 bg-black/90 backdrop-blur-xl z-30 -mx-4 px-4 py-4 mb-4 flex items-center gap-4 shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
        <button onClick={() => setViewMode('main')} className="p-2 bg-neutral-900 rounded-full hover:bg-neutral-800 text-white"><ArrowLeft size={24} /></button>
        <div>
          <h1 className="text-2xl font-black text-white">All Songs</h1>
          <p className="text-sm text-neutral-400">{artist.name} • {totalSongsCount.toLocaleString()} Total Songs</p>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        {allSongs.map((song, idx) => <SongItem key={`${song.id}-${idx}`} song={song} index={idx} />)}
      </div>
      <div ref={observerRef} className="py-8 flex justify-center">
        {isFetchingMore ? <Loader2 className="animate-spin text-white" size={32} /> : 
        !hasMoreSongs && <span className="text-neutral-500 font-medium">You've reached the end!</span>}
      </div>
    </div>
  );

  if (viewMode === 'albums' || viewMode === 'singles') return (
    <div className="min-h-screen bg-black pb-28 pt-6 px-4 md:px-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => setViewMode('main')} className="p-2 bg-neutral-900 rounded-full hover:bg-neutral-800 text-white"><ArrowLeft size={24} /></button>
        <h1 className="text-2xl font-black text-white capitalize">All {viewMode}</h1>
      </div>
      <GridView items={viewMode === 'albums' ? albums : singles} type={viewMode === 'albums' ? 'Album' : 'Single'} />
    </div>
  );

  // --- MAIN ARTIST VIEW ---
  return (
    <div className="pb-28 min-h-screen bg-black w-full overflow-hidden">
      
      {/* 1. Artist Hero Section with Rich UI Color Extraction */}
      <div className="relative w-full h-[450px] md:h-[550px] flex flex-col justify-end">
        
        {/* Dynamic Extracted Background Glow */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div 
            className="absolute inset-[-100px] bg-cover bg-center opacity-60 blur-[100px] saturate-[1.5]"
            style={{ backgroundImage: `url(${getImageUrl(artist.image)})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/60 to-black" />
        </div>
        
        <div className="absolute top-0 left-0 right-0 p-4 md:p-6 z-30">
          <button onClick={() => router.back()} className="bg-black/30 p-2.5 rounded-full backdrop-blur-md text-white hover:bg-black/50 transition">
            <ArrowLeft size={24} />
          </button>
        </div>

        {/* Hero Identity */}
        <div className="relative z-20 px-4 md:px-10 pb-8 max-w-7xl mx-auto w-full flex flex-col md:flex-row md:items-end gap-6 md:gap-8">
          <img 
            src={getImageUrl(artist.image)} 
            className="w-40 h-40 md:w-64 md:h-64 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.6)] object-cover border-[4px] border-white/10" 
            alt={artist.name}
          />
          <div className="flex flex-col gap-2 flex-1">
            <div className="flex items-center gap-2 text-blue-400 font-bold text-xs md:text-sm uppercase tracking-widest drop-shadow-md">
              <BadgeCheck size={18} fill="currentColor" className="text-white" /> Verified Artist
            </div>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tighter drop-shadow-xl leading-none">
              {artist.name}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm md:text-base text-neutral-300 mt-3 font-semibold">
              {artist.followerCount > 0 && (
                <span className="flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full backdrop-blur-md border border-white/5">
                  <Users size={16} /> {formatFollowers(artist.followerCount)} Followers
                </span>
              )}
              {artist.dominantLanguage && <span className="capitalize"><Mic2 size={16} className="inline mr-1"/> {artist.dominantLanguage}</span>}
              <span className="capitalize">• {artist.dominantType || artist.role || 'Artist'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="max-w-7xl mx-auto px-4 md:px-10 relative z-30">
        
        {/* Play Action */}
        <div className="mb-10 flex gap-4 items-center">
          <button 
            onClick={() => topSongs.length && playSong(topSongs[0])} 
            className="bg-white text-black p-5 rounded-full active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:scale-105"
          >
            <Play fill="black" size={28} className="ml-1" />
          </button>
        </div>

        {/* 2. Top Songs */}
        {topSongs.length > 0 && (
          <section className="mb-12">
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-2xl md:text-3xl font-black text-white">Top Songs</h2>
              <button onClick={() => setViewMode('songs')} className="text-sm font-bold text-neutral-400 hover:text-white transition-colors flex items-center">
                View All <ChevronRight size={18} />
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {topSongs.slice(0, 5).map((song: any, index: number) => (
                <SongItem key={song.id} song={song} index={index} />
              ))}
            </div>
          </section>
        )}

        {/* 3. Albums (2-Line Grid) */}
        {albums.length > 0 && (
          <section className="mb-12">
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-2xl md:text-3xl font-black text-white">Albums</h2>
              <button onClick={() => setViewMode('albums')} className="text-sm font-bold text-neutral-400 hover:text-white transition-colors flex items-center">
                View All <ChevronRight size={18} />
              </button>
            </div>
            <TwoLineCards items={albums} type="Album" />
          </section>
        )}

        {/* 4. Singles (2-Line Grid) */}
        {singles.length > 0 && (
          <section className="mb-12">
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-2xl md:text-3xl font-black text-white">Singles & EPs</h2>
              <button onClick={() => setViewMode('singles')} className="text-sm font-bold text-neutral-400 hover:text-white transition-colors flex items-center">
                View All <ChevronRight size={18} />
              </button>
            </div>
            <TwoLineCards items={singles} type="Single" />
          </section>
        )}

        {/* 5. Biography */}
        {artist.bio && artist.bio.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl md:text-3xl font-black text-white mb-6">About</h2>
            <div className="bg-neutral-900/40 rounded-3xl p-6 md:p-8 backdrop-blur-md border border-white/5 shadow-2xl">
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
