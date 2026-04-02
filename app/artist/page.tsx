"use client";
import { useEffect, useState, Suspense, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Play, ArrowLeft, Loader2, MoreVertical, BadgeCheck, 
  Clock, Users, Music, ChevronRight, Disc3 
} from "lucide-react";
import { useAppContext } from "../../context/AppContext";

// Helper Functions
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
  
  // Data States
  const [artist, setArtist] = useState<any>(null);
  const [fallbackArtist, setFallbackArtist] = useState<any>(null); // Intelligent Fallback
  const[songs, setSongs] = useState<any[]>([]);
  const [albums, setAlbums] = useState<any[]>([]);
  const [singles, setSingles] = useState<any[]>([]);
  
  // UI & Pagination States
  const [loading, setLoading] = useState(true);
  const[viewMode, setViewMode] = useState<'main' | 'songs' | 'albums' | 'singles'>('main');
  const [songPage, setSongPage] = useState(0);
  const[hasMoreSongs, setHasMoreSongs] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  // Observer Ref for Infinite Scroll
  const observerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!id) return;
    
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        // Promise.allSettled guarantees the page loads even if the main artist API fails
        const [artistRes, songsRes, albumsRes] = await Promise.allSettled([
          fetch(`https://ayushm-psi.vercel.app/api/artists/${id}`).then(res => res.json()),
          fetch(`https://ayushm-psi.vercel.app/api/artists/${id}/songs?page=0`).then(res => res.json()),
          fetch(`https://ayushm-psi.vercel.app/api/artists/${id}/albums?page=0`).then(res => res.json())
        ]);

        // 1. Process Songs & Extract Fallback Data
        let initialSongs =[];
        if (songsRes.status === "fulfilled" && songsRes.value.data?.songs) {
          initialSongs = songsRes.value.data.songs;
          setSongs(initialSongs);
          
          // Data Scientist approach: Extract artist image & role from the first song if main API fails
          if (initialSongs.length > 0) {
            const primaryArtistData = initialSongs[0]?.artists?.primary?.find((a: any) => a.id === id);
            if (primaryArtistData) {
              setFallbackArtist({
                name: primaryArtistData.name,
                image: primaryArtistData.image,
                role: primaryArtistData.role || "Artist"
              });
            }
          }
        }

        // 2. Process Albums and Separate Singles logically (songCount === 1)
        if (albumsRes.status === "fulfilled" && albumsRes.value.data?.albums) {
          const allAlbumsData = albumsRes.value.data.albums;
          setAlbums(allAlbumsData.filter((a: any) => a.songCount > 1));
          setSingles(allAlbumsData.filter((a: any) => a.songCount === 1 || !a.songCount)); // Fallback condition for singles
        }

        // 3. Process Main Artist API
        if (artistRes.status === "fulfilled" && artistRes.value.data) {
          setArtist(artistRes.value.data);
        }

      } catch (error) {
        console.error("Critical Error fetching artist data:", error);
      }
      setLoading(false);
    };

    fetchInitialData();
  }, [id]);

  // Infinite Scroll Hook Setup
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMoreSongs && !isFetchingMore && viewMode === 'songs') {
        setSongPage((prev) => prev + 1);
      }
    }, { threshold: 0.5 });

    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [hasMoreSongs, isFetchingMore, viewMode]);

  // Fetch More Songs when page increments
  useEffect(() => {
    if (songPage === 0 || !id) return;
    
    const fetchMoreSongs = async () => {
      setIsFetchingMore(true);
      try {
        const res = await fetch(`https://ayushm-psi.vercel.app/api/artists/${id}/songs?page=${songPage}`);
        const data = await res.json();
        
        if (data?.data?.songs?.length > 0) {
          setSongs(prev => [...prev, ...data.data.songs]);
        } else {
          setHasMoreSongs(false); // End of infinite scroll
        }
      } catch (err) {
        setHasMoreSongs(false);
      }
      setIsFetchingMore(false);
    };

    fetchMoreSongs();
  }, [songPage, id]);

  if (loading) return <div className="flex h-screen items-center justify-center bg-black text-white"><Loader2 className="animate-spin text-blue-500" size={40} /></div>;
  
  // Decide which data to display ensuring UI never breaks
  const displayArtist = artist || fallbackArtist;
  if (!displayArtist) return <div className="flex h-screen items-center justify-center bg-black text-neutral-400 font-medium">Artist data could not be resolved.</div>;

  const playSong = (song: any) => {
    setCurrentSong(song);
    setIsPlaying(true);
  };

  // --- Sub-Components & Views ---

  // Component: Song List Item (Reusable)
  const SongItem = ({ song, index }: { song: any, index: number }) => (
    <div key={song.id} onClick={() => playSong(song)} className="flex items-center gap-3 md:gap-4 p-2 md:p-3 rounded-xl hover:bg-white/10 cursor-pointer group active:scale-[0.98] transition-all">
      <span className="text-neutral-500 text-xs md:text-sm font-medium w-4 md:w-6 text-center group-hover:text-white transition-colors">{index + 1}</span>
      <img src={getImageUrl(song.image)} className="w-12 h-12 md:w-14 md:h-14 rounded-md object-cover shadow-sm" />
      <div className="flex-1 overflow-hidden">
        <h3 className="text-sm md:text-base font-bold text-white truncate">{song.name || song.title}</h3>
        <p className="text-xs md:text-sm text-neutral-400 truncate mt-0.5">{song.artists?.primary?.map((a:any)=>a.name).join(', ') || displayArtist.name}</p>
      </div>
      <div className="hidden md:flex text-sm text-neutral-500 w-16 justify-end items-center gap-2">
        {formatDuration(song.duration)}
      </div>
      <button className="p-2 text-neutral-400 hover:text-white transition-colors">
        <MoreVertical size={20} />
      </button>
    </div>
  );

  // Component: 2-Line Scrollable Horizontal Card Setup (Reusable)
  const ScrollableCards = ({ items, type }: { items: any[], type: string }) => (
    <div className="grid grid-rows-2 grid-flow-col gap-4 md:gap-6 overflow-x-auto hide-scrollbar pb-6 pt-2 snap-x snap-mandatory scroll-smooth">
      {items.map((item: any) => (
        <div 
          key={item.id} 
          onClick={() => router.push(`/album?link=${encodeURIComponent(item.url)}`)} 
          className="flex-shrink-0 snap-start w-36 md:w-48 cursor-pointer group"
        >
          <div className="relative overflow-hidden rounded-xl bg-neutral-800 aspect-square shadow-lg mb-3">
            <img src={getImageUrl(item.image)} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
          </div>
          <h3 className="text-sm md:text-base font-bold text-white truncate">{item.name}</h3>
          <p className="text-xs md:text-sm text-neutral-400 mt-0.5 truncate flex items-center gap-1">
            {item.year && <span>{item.year}</span>} 
            {item.year && item.songCount && <span>•</span>}
            {item.songCount && <span>{item.songCount} {type}</span>}
          </p>
        </div>
      ))}
    </div>
  );

  // VIEW: All Songs (Infinite Scroll)
  if (viewMode === 'songs') {
    return (
      <div className="min-h-screen bg-black pb-28 pt-6 px-4 md:px-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-300">
        <div className="sticky top-0 bg-black/80 backdrop-blur-xl z-30 -mx-4 px-4 py-4 mb-6 flex items-center gap-4">
          <button onClick={() => setViewMode('main')} className="p-2 bg-neutral-900 rounded-full hover:bg-neutral-800 transition-colors text-white">
             <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-white">All Songs</h1>
            <p className="text-sm text-neutral-400">{displayArtist.name} • {songs.length} Tracks</p>
          </div>
        </div>

        {/* Desktop Banner/Header */}
        <div className="hidden md:flex text-neutral-500 text-sm font-semibold uppercase tracking-wider mb-4 px-4 border-b border-neutral-800 pb-2">
          <span className="w-6 text-center mr-4">#</span>
          <span className="flex-1">Song</span>
          <span className="w-16 text-right mr-10"><Clock size={16} className="inline" /></span>
        </div>

        <div className="flex flex-col gap-1">
          {songs.map((song, idx) => <SongItem key={`${song.id}-${idx}`} song={song} index={idx} />)}
        </div>

        {/* Infinite Scroll Loader Target */}
        <div ref={observerRef} className="py-8 flex justify-center">
          {isFetchingMore && <Loader2 className="animate-spin text-neutral-500" size={28} />}
          {!hasMoreSongs && songs.length > 0 && <span className="text-neutral-500 text-sm">You've reached the end!</span>}
        </div>
      </div>
    );
  }

  // VIEW: Main Artist Page
  return (
    <div className="pb-28 min-h-screen bg-black w-full overflow-x-hidden">
      
      {/* 1. Artist Hero Header */}
      <div className="relative w-full h-[400px] md:h-[500px] bg-neutral-900 flex flex-col justify-end">
        {/* Dynamic Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40 md:opacity-30 blur-2xl md:blur-3xl scale-110"
          style={{ backgroundImage: `url(${getImageUrl(displayArtist.image)})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 md:via-black/50 to-transparent" />
        
        {/* Nav Bar */}
        <div className="absolute top-0 left-0 right-0 p-4 md:p-6 flex justify-between z-30">
          <button onClick={() => router.back()} className="bg-black/30 hover:bg-black/50 p-2.5 rounded-full backdrop-blur-md transition-colors text-white">
            <ArrowLeft size={24} />
          </button>
        </div>

        {/* Artist Identity */}
        <div className="relative z-20 px-4 md:px-10 pb-8 max-w-7xl mx-auto w-full flex flex-col md:flex-row md:items-end gap-6 md:gap-8">
          <img 
            src={getImageUrl(displayArtist.image)} 
            className="w-36 h-36 md:w-56 md:h-56 rounded-full shadow-[0_0_40px_rgba(0,0,0,0.5)] object-cover border-4 border-neutral-900/50" 
            alt={displayArtist.name}
          />
          <div className="flex flex-col gap-2 flex-1">
            <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs md:text-sm uppercase tracking-widest">
              <BadgeCheck size={18} /> Verified Artist
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white tracking-tight drop-shadow-lg leading-none">
              {displayArtist.name}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm md:text-base text-neutral-300 mt-2 font-medium">
              {displayArtist.followerCount && (
                <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
                  <Users size={16} /> {formatFollowers(displayArtist.followerCount)} Followers
                </span>
              )}
              {artist?.dominantLanguage && (
                <span className="capitalize text-neutral-400">• {artist.dominantLanguage}</span>
              )}
              <span className="capitalize text-neutral-400">• {displayArtist.dominantType || displayArtist.role || 'Artist'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 md:px-10 -mt-6 relative z-30">
        
        {/* Floating Play Button */}
        <div className="mb-10 flex gap-4 items-center">
          <button 
            onClick={() => { if (songs.length) playSong(songs[0]) }} 
            className="bg-blue-600 hover:bg-blue-500 text-white p-4 md:p-5 rounded-full active:scale-95 transition-all shadow-[0_0_30px_rgba(37,99,235,0.4)] hover:shadow-[0_0_40px_rgba(37,99,235,0.6)] group"
          >
            <Play fill="currentColor" size={28} className="ml-1 group-hover:scale-110 transition-transform" />
          </button>
        </div>

        {/* 2. Top Songs */}
        {songs.length > 0 && (
          <section className="mb-12">
            <div className="flex justify-between items-end mb-5">
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Popular Songs</h2>
              {songs.length > 5 && (
                <button onClick={() => setViewMode('songs')} className="text-sm font-bold text-neutral-400 hover:text-white transition-colors flex items-center">
                  View All <ChevronRight size={18} />
                </button>
              )}
            </div>
            <div className="flex flex-col gap-1 md:gap-2 bg-neutral-900/30 p-2 rounded-2xl">
              {songs.slice(0, 5).map((song: any, index: number) => (
                <SongItem key={song.id} song={song} index={index} />
              ))}
            </div>
          </section>
        )}

        {/* 3. Albums (2-Line Scroll) */}
        {albums.length > 0 && (
          <section className="mb-12">
            <div className="flex justify-between items-end mb-2">
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Albums</h2>
            </div>
            <ScrollableCards items={albums} type="Songs" />
          </section>
        )}

        {/* 4. Singles (2-Line Scroll) */}
        {singles.length > 0 && (
          <section className="mb-12">
            <div className="flex justify-between items-end mb-2">
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Singles & EPs</h2>
            </div>
            <ScrollableCards items={singles} type="Single" />
          </section>
        )}

        {/* 5. Biography Section */}
        {artist?.bio && artist.bio.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-6">About</h2>
            <div className="bg-neutral-900/60 rounded-3xl p-6 md:p-8 backdrop-blur-sm border border-neutral-800">
              <div className="space-y-6 text-neutral-300 text-sm md:text-base leading-relaxed max-w-4xl">
                {artist.bio.map((paragraph: any) => (
                  <div key={paragraph.sequence}>
                    {paragraph.title && (
                      <h3 className="text-white font-bold text-lg mb-2">{paragraph.title}</h3>
                    )}
                    <p className="whitespace-pre-line">{paragraph.text}</p>
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

// Global Export Wrapper
export default function ArtistPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-black text-white"><Loader2 className="animate-spin text-blue-500" size={40} /></div>}>
      <ArtistContent />
    </Suspense>
  );
}
