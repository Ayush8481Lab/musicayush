"use client";
import { useEffect, useState, Suspense, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Play, ArrowLeft, Loader2, MoreVertical, BadgeCheck,
  Users, ChevronRight, Mic2, Disc3
} from "lucide-react";
import { useAppContext } from "../../context/AppContext";

// --- Global In-Memory Cache ---
const memoryCache: Record<string, any> = {};

// --- Helpers ---
const decodeHTMLEntities = (text: string) => {
  if (!text) return "";
  return text
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&hellip;/g, '...');
};

const getImageUrl = (img: any) => {
  if (!img) return "https://via.placeholder.com/500";
  if (typeof img === "string") return img.replace(/50x50|150x150/g, "500x500");
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
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toLocaleString();
};

// --- Smart Marquee Component ---
const ScrollableTitle = ({ text, className }: { text: string, className?: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        setIsOverflowing(textRef.current.scrollWidth > containerRef.current.clientWidth);
      }
    };
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [text]);

  const decodedText = decodeHTMLEntities(text);

  return (
    <div 
      ref={containerRef} 
      className="w-full overflow-hidden whitespace-nowrap"
      style={{
        maskImage: isOverflowing ? 'linear-gradient(to right, black 85%, transparent 100%)' : 'none',
        WebkitMaskImage: isOverflowing ? 'linear-gradient(to right, black 85%, transparent 100%)' : 'none'
      }}
    >
      <div className={`inline-block ${isOverflowing ? 'animate-marquee-custom' : ''}`}>
         <span ref={textRef} className={className}>{decodedText}</span>
         {isOverflowing && <span className={`${className} pl-8`}>{decodedText}</span>}
      </div>
    </div>
  );
};


// --- UI REUSABLE COMPONENTS (Extracted to completely prevent unmounting & scroll jumps) ---

const ViewAllHeader = ({ title, countLabel, artist, onBack }: any) => (
  <div className="sticky top-0 bg-neutral-950/90 backdrop-blur-xl z-40 -mx-4 px-4 py-3 md:py-4 mb-6 flex items-center gap-4 shadow-lg border-b border-white/5">
    <button onClick={onBack} className="p-2.5 bg-white/10 rounded-full hover:bg-white/20 text-white transition-all">
      <ArrowLeft size={22} />
    </button>
    <img src={getImageUrl(artist?.image)} className="w-12 h-12 md:w-14 md:h-14 rounded-full object-cover shadow-lg border border-white/10" />
    <div className="overflow-hidden">
      <h1 className="text-lg md:text-xl font-black text-white leading-tight truncate">{decodeHTMLEntities(artist?.name)}</h1>
      <p className="text-xs md:text-sm text-neutral-400 font-medium">{title} • {countLabel}</p>
    </div>
  </div>
);

const SongItem = ({ song, index, fallbackArtistName, onPlay }: any) => (
  <div onClick={() => onPlay(song)} className="flex items-center gap-3 md:gap-4 p-2.5 md:p-3 rounded-xl hover:bg-white/5 cursor-pointer group transition-colors">
    <span className="text-neutral-500 text-sm font-medium w-6 text-center group-hover:text-white">{index + 1}</span>
    <img src={getImageUrl(song.image)} className="w-12 h-12 rounded-md object-cover shadow-sm bg-neutral-800 shrink-0" />
    <div className="flex-1 overflow-hidden min-w-0">
      <ScrollableTitle text={song.name || song.title} className="text-sm md:text-base font-bold text-white" />
      <p className="text-xs md:text-sm text-neutral-400 truncate mt-0.5">{decodeHTMLEntities(song.artists?.primary?.map((a:any) => a.name).join(', ') || fallbackArtistName)}</p>
    </div>
    <div className="hidden md:block text-sm text-neutral-500 w-16 text-right mr-4 font-medium shrink-0">{formatDuration(song.duration)}</div>
    <MoreVertical size={20} className="text-neutral-500 hover:text-white shrink-0" />
  </div>
);

// Strictly 2 to 4 columns depending on device size
const GridCards = ({ items, type }: { items: any[], type: string }) => {
  const router = useRouter();
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-5" style={{ overflowAnchor: 'none' }}>
      {items.map((item: any, index: number) => (
        <div key={`grid-${item.id}-${index}`} onClick={() => router.push(`/album?link=${encodeURIComponent(item.url)}`)} className="flex flex-col cursor-pointer group min-w-0">
          <div className="relative overflow-hidden rounded-lg md:rounded-xl shadow-md mb-2 aspect-square w-full">
            <img src={getImageUrl(item.image)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 bg-neutral-800" />
          </div>
          <ScrollableTitle text={item.name} className="text-xs md:text-sm font-bold text-white" />
          <p className="text-[10px] md:text-xs text-neutral-400 truncate mt-0.5 font-medium">
            {item.year && `${item.year} • `}{type}
          </p>
        </div>
      ))}
    </div>
  );
};

const TwoLineCards = ({ items, type }: { items: any[], type: string }) => {
  const router = useRouter();
  return (
    <div className="grid grid-rows-2 grid-flow-col gap-4 md:gap-6 overflow-x-auto snap-x hide-scrollbar pb-6 pt-2 auto-cols-[130px] sm:auto-cols-[150px] md:auto-cols-[170px] scroll-smooth">
      {items.map((item: any, index: number) => (
        <div key={`scroll-${item.id}-${index}`} onClick={() => router.push(`/album?link=${encodeURIComponent(item.url)}`)} className="snap-start flex flex-col cursor-pointer group min-w-0">
          <div className="relative overflow-hidden rounded-lg md:rounded-xl aspect-square shadow-md mb-2 w-full">
            <img src={getImageUrl(item.image)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 bg-neutral-800" />
          </div>
          <ScrollableTitle text={item.name} className="text-xs md:text-sm font-bold text-white" />
          <p className="text-[10px] md:text-xs text-neutral-400 mt-0.5 truncate font-medium">
            {item.year && `${item.year} • `}{type}
          </p>
        </div>
      ))}
    </div>
  );
};


// --- MAIN LOGIC COMPONENT ---

function ArtistContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id");

  const { setCurrentSong, setIsPlaying } = useAppContext();

  // --- States ---
  const [artist, setArtist] = useState<any>(null);

  const[songs, setSongs] = useState<any[]>([]);
  const [totalSongsCount, setTotalSongsCount] = useState<number>(0);

  const[albums, setAlbums] = useState<any[]>([]);
  const[totalAlbumsCount, setTotalAlbumsCount] = useState<number>(0);

  const [singles, setSingles] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'main' | 'songs' | 'albums'>('main');

  // --- Infinite Scroll States ---
  const [songPage, setSongPage] = useState(0);
  const [loadingMoreSongs, setLoadingMoreSongs] = useState(false);

  const [albumPage, setAlbumPage] = useState(0);
  const[loadingMoreAlbums, setLoadingMoreAlbums] = useState(false);

  // UI Refs
  const observerRef = useRef<HTMLDivElement | null>(null);

  // --- 1. Core Data Fetching & Caching ---
  useEffect(() => {
    if (!id) return;

    if (memoryCache[id]) {
      const data = memoryCache[id];
      setArtist(data.artist);
      setSongs(data.songs);
      setTotalSongsCount(data.totalSongsCount);
      setAlbums(data.albums);
      setTotalAlbumsCount(data.totalAlbumsCount);
      setSingles(data.singles);
      setSongPage(data.songPage);
      setAlbumPage(data.albumPage);
      setLoading(false);
      return;
    }

    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const [artistRes, songsRes, albumsRes] = await Promise.allSettled([
          fetch(`https://ayushm-psi.vercel.app/api/artists/${id}`).then(r => r.json()),
          fetch(`https://ayushm-psi.vercel.app/api/artists/${id}/songs?page=1`).then(r => r.json()),
          fetch(`https://ayushm-psi.vercel.app/api/artists/${id}/albums?page=1`).then(r => r.json())
        ]);

        let fetchedSongs =[];
        let fetchedAlbums = [];
        let fetchedSingles =[];
        let fetchedArtist = null;

        // 1. Process Songs
        if (songsRes.status === "fulfilled" && songsRes.value.success) {
          fetchedSongs = songsRes.value.data.songs ||[];
          setSongs(fetchedSongs);
          setTotalSongsCount(songsRes.value.data.total || fetchedSongs.length);
        }

        // 2. Process Albums
        if (albumsRes.status === "fulfilled" && albumsRes.value.success) {
          const rawAlbums = albumsRes.value.data.albums ||[];
          fetchedAlbums = rawAlbums.sort((a: any, b: any) => (b.year || 0) - (a.year || 0));
          setAlbums(fetchedAlbums);
          setTotalAlbumsCount(albumsRes.value.data.total || fetchedAlbums.length);
        }

        // 3. Process Main API & Fallback
        if (artistRes.status === "fulfilled" && artistRes.value.success && artistRes.value.data?.name) {
          fetchedArtist = artistRes.value.data;
          fetchedArtist.isVerified = artistRes.value.data.isVerified === true; 
          
          // Grab singles and strictly sort from highest to lowest year
          const rawSingles = fetchedArtist.singles ||[];
          fetchedSingles = rawSingles.sort((a: any, b: any) => (b.year || 0) - (a.year || 0));
          setSingles(fetchedSingles);
        } else {
          // --- FALLBACK METHOD ---
          if (fetchedSongs.length > 0) {
            const firstSong = fetchedSongs[0];
            const targetId = String(id);
            
            // Search inside all arrays for exact artist ID match
            let primaryArtist = firstSong.artists?.all?.find((a: any) => String(a.id) === targetId);
            if (!primaryArtist) {
              primaryArtist = firstSong.artists?.primary?.find((a: any) => String(a.id) === targetId);
            }

            if (primaryArtist) {
              fetchedArtist = {
                id: primaryArtist.id,
                name: primaryArtist.name,
                image: primaryArtist.image,
                dominantType: primaryArtist.role || primaryArtist.type || "Artist",
                dominantLanguage: firstSong.language || "Unknown",
                followerCount: 0,
                isVerified: false,
                bio:[]
              };
            }
          }
          setSingles([]);
        }

        setArtist(fetchedArtist);

        memoryCache[id] = {
          artist: fetchedArtist,
          songs: fetchedSongs,
          totalSongsCount: songsRes.status === 'fulfilled' ? songsRes.value.data?.total : 0,
          albums: fetchedAlbums,
          totalAlbumsCount: albumsRes.status === 'fulfilled' ? albumsRes.value.data?.total : 0,
          singles: fetchedSingles,
          songPage: 1,
          albumPage: 1
        };

      } catch (error) {
        console.error("Error loading artist data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  },[id]);


  // --- 2. Batch Infinite Loaders (Process 3 Pages Concurrently) ---
  const loadMoreSongsBatch = useCallback(async () => {
    if (loadingMoreSongs || songs.length >= totalSongsCount || !id) return;
    setLoadingMoreSongs(true);

    try {
      const nextPage1 = songPage + 1;
      const nextPage2 = songPage + 2;
      const nextPage3 = songPage + 3;

      const promises =[
        fetch(`https://ayushm-psi.vercel.app/api/artists/${id}/songs?page=${nextPage1}`).then(r => r.json()),
        fetch(`https://ayushm-psi.vercel.app/api/artists/${id}/songs?page=${nextPage2}`).then(r => r.json()),
        fetch(`https://ayushm-psi.vercel.app/api/artists/${id}/songs?page=${nextPage3}`).then(r => r.json())
      ];
      
      const results = await Promise.allSettled(promises);
      
      let newBatch: any[] =[];
      results.forEach(res => {
        if (res.status === 'fulfilled' && res.value.success && res.value.data?.songs) {
          newBatch =[...newBatch, ...res.value.data.songs];
        }
      });

      setSongs(prev => {
        const existingIds = new Set(prev.map(s => s.id));
        const unique = newBatch.filter(s => !existingIds.has(s.id));
        const finalData =[...prev, ...unique]; 
        
        if (memoryCache[id]) {
          memoryCache[id].songs = finalData;
          memoryCache[id].songPage = nextPage3;
        }
        return finalData;
      });

      setSongPage(nextPage3);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMoreSongs(false);
    }
  },[id, songPage, songs.length, totalSongsCount, loadingMoreSongs]);


  const loadMoreAlbumsBatch = useCallback(async () => {
    if (loadingMoreAlbums || albums.length >= totalAlbumsCount || !id) return;
    setLoadingMoreAlbums(true);

    try {
      const nextPage1 = albumPage + 1;
      const nextPage2 = albumPage + 2;
      const nextPage3 = albumPage + 3;

      const promises =[
        fetch(`https://ayushm-psi.vercel.app/api/artists/${id}/albums?page=${nextPage1}`).then(r => r.json()),
        fetch(`https://ayushm-psi.vercel.app/api/artists/${id}/albums?page=${nextPage2}`).then(r => r.json()),
        fetch(`https://ayushm-psi.vercel.app/api/artists/${id}/albums?page=${nextPage3}`).then(r => r.json())
      ];

      const results = await Promise.allSettled(promises);
      
      let newBatch: any[] =[];
      results.forEach(res => {
        if (res.status === 'fulfilled' && res.value.success && res.value.data?.albums) {
          newBatch =[...newBatch, ...res.value.data.albums];
        }
      });

      setAlbums(prev => {
        const existingIds = new Set(prev.map(a => a.id));
        
        // 1. Get truly new items
        const unique = newBatch.filter(a => !existingIds.has(a.id));
        
        // 2. Sort ONLY the new items (Prevents shuffling and jumping of the entire list)
        const sortedUnique = unique.sort((a, b) => (b.year || 0) - (a.year || 0));
        
        // 3. Cleanly append to bottom
        const finalData =[...prev, ...sortedUnique];

        if (memoryCache[id]) {
          memoryCache[id].albums = finalData;
          memoryCache[id].albumPage = nextPage3;
        }
        return finalData;
      });

      setAlbumPage(nextPage3);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMoreAlbums(false);
    }
  }, [id, albumPage, albums.length, totalAlbumsCount, loadingMoreAlbums]);

  // Observer Trigger
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        if (viewMode === 'songs') loadMoreSongsBatch();
        if (viewMode === 'albums') loadMoreAlbumsBatch();
      }
    }, { rootMargin: '600px', threshold: 0.1 }); // Starts loading safely before bottom

    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [loadMoreSongsBatch, loadMoreAlbumsBatch, viewMode]);


  if (loading) return <div className="flex h-screen items-center justify-center bg-neutral-950"><Loader2 className="animate-spin text-white" size={40} /></div>;
  if (!artist) return <div className="flex h-screen items-center justify-center bg-neutral-950 text-neutral-400 font-medium">Artist could not be found.</div>;

  const handlePlaySong = (song: any) => { setCurrentSong(song); setIsPlaying(true); };

  // --- SUB VIEWS ---

  if (viewMode === 'songs') return (
    <div className="min-h-screen bg-neutral-950 pb-28 pt-2 px-4 md:px-8 max-w-7xl mx-auto animate-in fade-in">
      <ViewAllHeader 
        title="All Songs" 
        countLabel={`${totalSongsCount.toLocaleString()} Total Songs`} 
        artist={artist} 
        onBack={() => { setViewMode('main'); window.scrollTo(0, 0); }} 
      />
      <div className="flex flex-col gap-1" style={{ overflowAnchor: 'none' }}>
        {songs.map((song, idx) => (
          <SongItem 
            key={`song-list-${song.id}-${idx}`} 
            song={song} 
            index={idx} 
            fallbackArtistName={artist?.name} 
            onPlay={handlePlaySong} 
          />
        ))}
      </div>
      <div ref={observerRef} className="py-8 flex justify-center">
        {loadingMoreSongs ? <Loader2 className="animate-spin text-white" size={32} /> :
          songs.length >= totalSongsCount && <span className="text-neutral-500 font-medium text-sm">End of tracklist</span>}
      </div>
    </div>
  );

  if (viewMode === 'albums') return (
    <div className="min-h-screen bg-neutral-950 pb-28 pt-2 px-4 md:px-8 max-w-7xl mx-auto animate-in fade-in">
      <ViewAllHeader 
        title="All Albums" 
        countLabel={`${totalAlbumsCount.toLocaleString()} Total Albums`} 
        artist={artist} 
        onBack={() => { setViewMode('main'); window.scrollTo(0, 0); }} 
      />
      <GridCards items={albums} type="Album" />
      <div ref={observerRef} className="py-10 flex justify-center">
        {loadingMoreAlbums ? <Loader2 className="animate-spin text-white" size={32} /> :
          albums.length >= totalAlbumsCount && <span className="text-neutral-500 font-medium text-sm">End of albums</span>}
      </div>
    </div>
  );

  // --- MAIN PAGE VIEW ---
  return (
    <div className="pb-28 min-h-screen bg-neutral-950 w-full overflow-hidden">
      
      {/* 1. Artist Hero Section */}
      <div className="relative w-full h-[400px] md:h-[500px] flex flex-col justify-end bg-neutral-900 overflow-hidden">
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
            className="w-36 h-36 md:w-56 md:h-56 rounded-full shadow-[0_15px_40px_rgba(0,0,0,0.4)] object-cover border-[3px] border-white/20 bg-neutral-800 shrink-0" 
            alt={decodeHTMLEntities(artist.name)}
          />
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            {artist.isVerified && (
              <div className="flex items-center gap-1.5 text-blue-400 font-bold text-xs md:text-sm uppercase tracking-widest drop-shadow-sm">
                <BadgeCheck size={18} fill="currentColor" className="text-white" /> Verified Artist
              </div>
            )}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white tracking-tight drop-shadow-lg leading-none truncate">
              {decodeHTMLEntities(artist.name)}
            </h1>
            <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs md:text-sm text-neutral-200 mt-2 font-semibold">
              {artist.followerCount > 0 && (
                <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full backdrop-blur-md border border-white/5">
                  <Users size={14} /> {formatFollowers(artist.followerCount)} Followers
                </span>
              )}
              {artist.dominantLanguage && <span className="capitalize flex items-center gap-1 text-neutral-300"><Mic2 size={14} /> {artist.dominantLanguage}</span>}
              {(artist.dominantType || artist.role) && <span className="capitalize flex items-center gap-1 text-neutral-300"><Disc3 size={14} /> {artist.dominantType || artist.role || 'Artist'}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="max-w-7xl mx-auto px-4 md:px-10 relative z-30 -mt-4">
        
        {/* Play Action */}
        <div className="mb-10 flex gap-4 items-center">
          <button 
            onClick={() => songs.length && handlePlaySong(songs[0])} 
            className="bg-white text-black p-4 md:p-5 rounded-full active:scale-95 transition-transform shadow-[0_5px_20px_rgba(255,255,255,0.3)] hover:scale-105"
          >
            <Play fill="black" size={26} className="ml-1" />
          </button>
        </div>

        {/* 2. Top Songs (Top 10 Only) */}
        {songs.length > 0 && (
          <section className="mb-12">
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-2xl md:text-3xl font-black text-white">Top Songs</h2>
              <button onClick={() => { setViewMode('songs'); window.scrollTo(0,0); }} className="text-sm font-bold text-neutral-400 hover:text-white transition-colors flex items-center gap-0.5">
                View All <ChevronRight size={18} />
              </button>
            </div>
            <div className="flex flex-col gap-1 bg-white/[0.02] p-2 md:p-3 rounded-2xl border border-white/5">
              {songs.slice(0, 10).map((song: any, index: number) => (
                <SongItem 
                  key={`top-song-${song.id}-${index}`} 
                  song={song} 
                  index={index} 
                  fallbackArtistName={artist?.name}
                  onPlay={handlePlaySong}
                />
              ))}
            </div>
          </section>
        )}

        {/* 3. Albums (Sorted by Year Descending) */}
        {albums.length > 0 && (
          <section className="mb-12">
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-2xl md:text-3xl font-black text-white">Albums</h2>
              <button onClick={() => { setViewMode('albums'); window.scrollTo(0,0); }} className="text-sm font-bold text-neutral-400 hover:text-white transition-colors flex items-center gap-0.5">
                View All <ChevronRight size={18} />
              </button>
            </div>
            <TwoLineCards items={albums.slice(0, 10)} type="Album" />
          </section>
        )}

        {/* 4. Singles */}
        {singles.length > 0 && (
          <section className="mb-12">
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-2xl md:text-3xl font-black text-white">Singles</h2>
            </div>
            <TwoLineCards items={singles} type="Single" />
          </section>
        )}

        {/* 5. Biography */}
        {artist.bio && artist.bio.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl md:text-3xl font-black text-white mb-6">About Artist</h2>
            <div className="bg-white/[0.02] rounded-3xl p-6 md:p-8 backdrop-blur-md border border-white/5 shadow-md">
              <div className="space-y-5 text-neutral-300 text-sm md:text-base leading-relaxed">
                {artist.bio.map((para: any, i: number) => (
                  <div key={para.sequence || i}>
                    {para.title && <h3 className="text-white font-bold text-lg mb-1.5">{decodeHTMLEntities(para.title)}</h3>}
                    <p className="whitespace-pre-line">{decodeHTMLEntities(para.text)}</p>
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
    <>
      <style>{`
        @keyframes custom-marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee-custom {
          animation: custom-marquee 8s linear infinite;
        }
      `}</style>
      <Suspense fallback={<div className="flex h-screen items-center justify-center bg-neutral-950"><Loader2 className="animate-spin text-white" size={40} /></div>}>
        <ArtistContent />
      </Suspense>
    </>
  );
}
