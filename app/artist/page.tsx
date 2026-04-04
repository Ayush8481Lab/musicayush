/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState, Suspense, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Play, ArrowLeft, Loader2, MoreVertical, BadgeCheck,
  Users, ChevronRight, Mic2, Disc3
} from "lucide-react";
import { useAppContext } from "../../context/AppContext";

// --- Global In-Memory Cache (Survives Back/Forth Navigation) ---
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

const extractToken = (url: string) => {
  if (!url) return null;
  const parts = url.split('/').filter(Boolean);
  return parts.pop();
};

// Sort Array by Year Descending Safely
const sortByYearDesc = (arr: any[]) => {
  if (!Array.isArray(arr)) return[];
  return arr.sort((a, b) => (parseInt(b.year) || 0) - (parseInt(a.year) || 0));
};

// Normalize API Item Properties
const normalizeItem = (item: any) => ({
  ...item,
  id: item.id || item.perma_url || item.artist_id,
  name: item.title || item.name,
  image: item.image_link || item.image,
  url: item.perma_url || item.url,
  songCount: item.song_count || item.songCount
});

// Calculate Highest Role for Similar Artists
const getHighestRole = (roles: Record<string, string>) => {
  if (!roles) return "Artist";
  let maxCount = -1;
  let bestRole = "Artist";
  for (const [role, countStr] of Object.entries(roles)) {
    if (role === "") continue; 
    const count = parseInt(countStr, 10);
    if (count > maxCount) {
      maxCount = count;
      bestRole = role;
    }
  }
  return bestRole.charAt(0).toUpperCase() + bestRole.slice(1);
};

// --- Smart Marquee Component ---
const ScrollableTitle = ({ text, className, alignCenterOnMobile }: { text: string, className?: string, alignCenterOnMobile?: boolean }) => {
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
    setTimeout(checkOverflow, 150); 
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  },[text]);

  const decodedText = decodeHTMLEntities(text);

  return (
    <div 
      ref={containerRef} 
      className={`w-full overflow-hidden whitespace-nowrap ${alignCenterOnMobile ? 'text-center md:text-left' : ''} ${className || ''}`}
      style={{
        maskImage: isOverflowing ? 'linear-gradient(to right, black 85%, transparent 100%)' : 'none',
        WebkitMaskImage: isOverflowing ? 'linear-gradient(to right, black 85%, transparent 100%)' : 'none'
      }}
    >
      <div className={`inline-block w-max ${isOverflowing ? 'animate-marquee-custom' : ''}`}>
         <span ref={textRef} className="inline-block max-w-none">{decodedText}</span>
         {isOverflowing && <span className="inline-block max-w-none pl-8">{decodedText}</span>}
      </div>
    </div>
  );
};


// --- UI REUSABLE COMPONENTS ---
const ViewAllHeader = ({ title, countLabel, artist, onBack }: any) => (
  <div className="sticky top-0 bg-neutral-950/90 backdrop-blur-xl z-40 -mx-4 px-4 py-3 md:py-4 mb-6 flex items-center gap-4 shadow-lg border-b border-white/5">
    <button onClick={onBack} className="p-2.5 bg-white/10 rounded-full hover:bg-white/20 text-white transition-all shrink-0">
      <ArrowLeft size={22} />
    </button>
    <img src={getImageUrl(artist?.image)} alt={artist?.name || "Artist"} className="w-12 h-12 md:w-14 md:h-14 rounded-full object-cover shadow-lg border border-white/10 shrink-0" />
    <div className="overflow-hidden min-w-0 flex-1">
      <ScrollableTitle text={artist?.name || ''} className="text-lg md:text-xl font-black text-white leading-tight" />
      <p className="text-xs md:text-sm text-neutral-400 font-medium truncate">{title} • {countLabel}</p>
    </div>
  </div>
);

const SongItem = ({ song, index, fallbackArtistName, onPlay }: any) => (
  <div onClick={() => onPlay(song)} className="flex items-center gap-3 md:gap-4 p-2.5 md:p-3 rounded-xl hover:bg-white/5 cursor-pointer group transition-colors w-full">
    <span className="text-neutral-500 text-sm font-medium w-6 text-center group-hover:text-white shrink-0">{index + 1}</span>
    <img src={getImageUrl(song.image)} alt={song.name || "Song"} className="w-12 h-12 rounded-md object-cover shadow-sm bg-neutral-800 shrink-0" />
    <div className="flex-1 overflow-hidden min-w-0">
      <ScrollableTitle text={song.name || song.title} className="text-sm md:text-base font-bold text-white" />
      <ScrollableTitle text={song.artists?.primary?.map((a:any) => a.name).join(', ') || fallbackArtistName} className="text-xs md:text-sm text-neutral-400 mt-0.5" />
    </div>
    <div className="hidden md:block text-sm text-neutral-500 w-16 text-right mr-4 font-medium shrink-0">{formatDuration(song.duration)}</div>
    <MoreVertical size={20} className="text-neutral-500 hover:text-white shrink-0" />
  </div>
);

// Decoupled Router logic to fix the deployment URL bug
const TwoLineCards = ({ items, type, onNavigate }: { items: any[], type: string, onNavigate: (url: string) => void }) => (
  <div className="grid grid-rows-2 grid-flow-col gap-4 md:gap-6 overflow-x-auto snap-x hide-scrollbar pb-6 pt-2 auto-cols-[130px] sm:auto-cols-[150px] md:auto-cols-[170px] scroll-smooth w-full">
    {items?.map((item: any, index: number) => (
      <div key={`scroll-${item.id}-${index}`} onClick={() => onNavigate(item.url || item.perma_url)} className="snap-start flex flex-col cursor-pointer group min-w-0 w-full">
        <div className="relative overflow-hidden rounded-lg md:rounded-xl aspect-square shadow-md mb-2 w-full">
          <img src={getImageUrl(item.image)} alt={item.name || "Cover"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 bg-neutral-800" />
        </div>
        <ScrollableTitle text={item.name} className="text-xs md:text-sm font-bold text-white" />
        <p className="text-[10px] md:text-xs text-neutral-400 mt-0.5 truncate font-medium">
          {item.year && `${item.year} • `}{item.songCount ? `${item.songCount} Songs` : type}
        </p>
      </div>
    ))}
  </div>
);

const GridCards = ({ items, type, onNavigate }: { items: any[], type: string, onNavigate: (url: string) => void }) => (
  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-5 w-full" style={{ overflowAnchor: 'none' }}>
    {items?.map((item: any, index: number) => (
      <div key={`grid-${item.id}-${index}`} onClick={() => onNavigate(item.url || item.perma_url)} className="flex flex-col cursor-pointer group min-w-0 w-full">
        <div className="relative overflow-hidden rounded-lg md:rounded-xl shadow-md mb-2 aspect-square w-full">
          <img src={getImageUrl(item.image)} alt={item.name || "Cover"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 bg-neutral-800" />
        </div>
        <ScrollableTitle text={item.name} className="text-xs md:text-sm font-bold text-white" />
        <p className="text-[10px] md:text-xs text-neutral-400 truncate mt-0.5 font-medium">
          {item.year && `${item.year} • `}{item.songCount ? `${item.songCount} Songs` : type}
        </p>
      </div>
    ))}
  </div>
);


// --- MAIN LOGIC COMPONENT ---

function ArtistContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id");

  const { setCurrentSong, setIsPlaying } = useAppContext();

  // --- States ---
  const[artist, setArtist] = useState<any>(null);

  const [songs, setSongs] = useState<any[]>([]);
  const [totalSongsCount, setTotalSongsCount] = useState<number>(0);

  const [albums, setAlbums] = useState<any[]>([]);
  const [totalAlbumsCount, setTotalAlbumsCount] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'main' | 'songs' | 'albums'>('main');

  // --- Infinite Scroll States ---
  const [songPage, setSongPage] = useState(0);
  const[loadingMoreSongs, setLoadingMoreSongs] = useState(false);
  const isFetchingSongs = useRef(false);
  const[hasMoreSongs, setHasMoreSongs] = useState(true);

  const[albumPage, setAlbumPage] = useState(0);
  const [loadingMoreAlbums, setLoadingMoreAlbums] = useState(false);
  const isFetchingAlbums = useRef(false);
  const [hasMoreAlbums, setHasMoreAlbums] = useState(true);

  const [restoredScrollPos, setRestoredScrollPos] = useState<number | null>(null);
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
      setSongPage(data.songPage);
      setAlbumPage(data.albumPage);
      setHasMoreSongs(data.hasMoreSongs);
      setHasMoreAlbums(data.hasMoreAlbums);
      
      if (data.viewMode) setViewMode(data.viewMode);
      if (data.scrollPos !== undefined) setRestoredScrollPos(data.scrollPos);
      
      setLoading(false);
      return;
    }

    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const [artistRes, songsRes, albumsRes] = await Promise.allSettled([
          fetch(`https://ayushm-psi.vercel.app/api/artists/${id}`).then(r => r.json()),
          fetch(`https://ayushm-psi.vercel.app/api/artists/${id}/songs?page=0`).then(r => r.json()), 
          fetch(`https://ayushm-psi.vercel.app/api/artists/${id}/albums?page=0`).then(r => r.json())
        ]);

        let fetchedSongs = [];
        let fetchedAlbums =[];
        let fetchedArtist: any = null;
        let artistUrl = "";

        if (songsRes.status === "fulfilled" && songsRes.value.success) {
          fetchedSongs = songsRes.value.data.songs ||[];
          setSongs(fetchedSongs);
          setTotalSongsCount(songsRes.value.data.total || fetchedSongs.length);
        }

        if (artistRes.status === "fulfilled" && artistRes.value.success && artistRes.value.data?.name) {
          fetchedArtist = artistRes.value.data;
          artistUrl = fetchedArtist.url || "";
        } else if (fetchedSongs.length > 0) {
          const firstSong = fetchedSongs[0];
          const targetId = String(id);
          let primaryArtist = firstSong.artists?.all?.find((a: any) => String(a.id) === targetId) || 
                              firstSong.artists?.primary?.find((a: any) => String(a.id) === targetId);

          if (primaryArtist) {
            fetchedArtist = {
              id: primaryArtist.id, name: primaryArtist.name, image: primaryArtist.image,
              dominantType: primaryArtist.role || primaryArtist.type || "Artist",
              dominantLanguage: firstSong.language || "Unknown",
              followerCount: 0, bio:[]
            };
            artistUrl = primaryArtist.url || "";
          }
        }

        if (fetchedArtist && artistUrl) {
          const token = extractToken(artistUrl);
          if (token) {
            try {
              const extraRes = await fetch(`https://ayushpr.vercel.app/${token}`);
              const extraData = await extraRes.json();
              if (extraData) {
                fetchedArtist.followerCount = parseInt(extraData.follower_count) || fetchedArtist.followerCount;
                const mappedSingles = (extraData.modules?.singles ||[]).map(normalizeItem);
                fetchedArtist.singles = sortByYearDesc(mappedSingles.length > 0 ? mappedSingles : fetchedArtist.singles ||[]);
                fetchedArtist.latestReleases = sortByYearDesc((extraData.modules?.latest_release ||[]).map(normalizeItem));
                fetchedArtist.dedicatedPlaylists = (extraData.modules?.dedicated_artist_playlist ||[]).map(normalizeItem);
                fetchedArtist.featuredPlaylists = (extraData.modules?.featured_artist_playlist ||[]).map(normalizeItem);
                fetchedArtist.similarArtists = (extraData.similarArtists || extraData.modules?.similarArtists ||[]).map(normalizeItem);
              }
            } catch (err) {
              console.error("Detailed API fetch failed", err);
            }
          }
        }

        if (albumsRes.status === "fulfilled" && albumsRes.value.success) {
          const rawAlbums = albumsRes.value.data.albums ||[];
          const pureAlbums = rawAlbums.filter((a: any) => a.songCount > 1 || !a.songCount);
          fetchedAlbums = sortByYearDesc(pureAlbums);

          if (!fetchedArtist?.singles || fetchedArtist.singles.length === 0) {
            if(fetchedArtist) fetchedArtist.singles = sortByYearDesc(rawAlbums.filter((a: any) => a.songCount === 1));
          }
        }
        
        setAlbums(fetchedAlbums);
        setTotalAlbumsCount(albumsRes.status === 'fulfilled' ? (albumsRes.value.data?.total || fetchedAlbums.length) : 0);
        setArtist(fetchedArtist);

        // Save fresh data to Cache
        memoryCache[id] = {
          artist: fetchedArtist,
          songs: fetchedSongs,
          totalSongsCount: songsRes.status === 'fulfilled' ? songsRes.value.data?.total : 0,
          albums: fetchedAlbums,
          totalAlbumsCount: albumsRes.status === 'fulfilled' ? albumsRes.value.data?.total : 0,
          songPage: 0,
          albumPage: 0,
          hasMoreSongs: true,
          hasMoreAlbums: true,
          viewMode: 'main',
          scrollPos: 0
        };

      } catch (error) {
        console.error("Error loading artist data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [id]);


  // Handle exact scroll restoration securely
  useEffect(() => {
    if (restoredScrollPos !== null && !loading) {
      requestAnimationFrame(() => {
        setTimeout(() => {
          window.scrollTo({ top: restoredScrollPos, behavior: 'instant' });
          setRestoredScrollPos(null);
        }, 150);
      });
    }
  }, [restoredScrollPos, loading, viewMode]);


  // --- Cache Router Interceptor ---
  const navigateToResource = (url: string) => {
    if (id && memoryCache[id]) {
      memoryCache[id].viewMode = viewMode;
      memoryCache[id].scrollPos = window.scrollY; 
    }
    if (!url) return;
    router.push(url.startsWith('/album') || url.startsWith('/playlist') || url.startsWith('/artist') 
      ? url : `/album?link=${encodeURIComponent(url)}`);
  };

  const handleBackToMain = () => {
    setViewMode('main');
    if (id && memoryCache[id]) {
      memoryCache[id].viewMode = 'main';
      memoryCache[id].scrollPos = 0;
    }
    window.scrollTo(0, 0);
  };

  // --- 2. Batch Infinite Loaders (Process 5 Pages Concurrently) ---
  const loadMoreSongsBatch = useCallback(async () => {
    if (isFetchingSongs.current || !hasMoreSongs || !id) return;
    isFetchingSongs.current = true;
    setLoadingMoreSongs(true);

    try {
      const promises = Array.from({ length: 5 }, (_, i) => 
        fetch(`https://ayushm-psi.vercel.app/api/artists/${id}/songs?page=${songPage + i + 1}`).then(r => r.json())
      );
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
        if (unique.length === 0) { setHasMoreSongs(false); return prev; }
        
        const finalData = [...prev, ...unique]; 
        if (memoryCache[id]) { memoryCache[id].songs = finalData; memoryCache[id].songPage = songPage + 5; memoryCache[id].hasMoreSongs = true; }
        return finalData;
      });

      setSongPage(p => p + 5);
    } catch (e) {
      setHasMoreSongs(false);
    } finally {
      isFetchingSongs.current = false;
      setLoadingMoreSongs(false);
    }
  }, [id, songPage, hasMoreSongs]);


  const loadMoreAlbumsBatch = useCallback(async () => {
    if (isFetchingAlbums.current || !hasMoreAlbums || !id) return;
    isFetchingAlbums.current = true;
    setLoadingMoreAlbums(true);

    try {
      const promises = Array.from({ length: 5 }, (_, i) => 
        fetch(`https://ayushm-psi.vercel.app/api/artists/${id}/albums?page=${albumPage + i + 1}`).then(r => r.json())
      );
      const results = await Promise.allSettled(promises);
      
      let newBatch: any[] =[];
      results.forEach(res => {
        if (res.status === 'fulfilled' && res.value.success && res.value.data?.albums) {
          newBatch = [...newBatch, ...res.value.data.albums];
        }
      });

      setAlbums(prev => {
        const existingIds = new Set(prev.map(a => a.id));
        const unique = newBatch.filter(a => !existingIds.has(a.id) && (a.songCount > 1 || !a.songCount));
        if (unique.length === 0) { setHasMoreAlbums(false); return prev; }
        
        const sortedUnique = sortByYearDesc(unique);
        const finalData = [...prev, ...sortedUnique];

        if (memoryCache[id]) { memoryCache[id].albums = finalData; memoryCache[id].albumPage = albumPage + 5; memoryCache[id].hasMoreAlbums = true; }
        return finalData;
      });

      setAlbumPage(p => p + 5);
    } catch (e) {
      setHasMoreAlbums(false);
    } finally {
      isFetchingAlbums.current = false;
      setLoadingMoreAlbums(false);
    }
  },[id, albumPage, hasMoreAlbums]);

  // Observer Trigger
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        if (viewMode === 'songs') loadMoreSongsBatch();
        if (viewMode === 'albums') loadMoreAlbumsBatch();
      }
    }, { rootMargin: '800px', threshold: 0.1 }); 

    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [loadMoreSongsBatch, loadMoreAlbumsBatch, viewMode]);


  if (loading) return <div className="flex h-screen items-center justify-center bg-neutral-950"><Loader2 className="animate-spin text-white" size={40} /></div>;
  if (!artist) return <div className="flex h-screen items-center justify-center bg-neutral-950 text-neutral-400 font-medium">Artist could not be found.</div>;

  const handlePlaySong = (song: any) => { setCurrentSong(song); setIsPlaying(true); };

  // --- SUB VIEWS ---

  if (viewMode === 'songs') return (
    <div className="min-h-screen bg-neutral-950 pb-28 pt-2 px-4 md:px-8 max-w-7xl mx-auto animate-in fade-in" style={{ overflowAnchor: 'none' }}>
      <ViewAllHeader 
        title="All Songs" 
        countLabel={`${(totalSongsCount || 0).toLocaleString()} Total Songs`} 
        artist={artist} 
        onBack={handleBackToMain} 
      />
      <div className="flex flex-col gap-1 w-full">
        {songs?.map((song, idx) => (
          <SongItem 
            key={`song-list-${song.id}-${idx}`} 
            song={song} 
            index={idx} 
            fallbackArtistName={artist?.name} 
            onPlay={handlePlaySong} 
          />
        ))}
      </div>
      <div ref={observerRef} className="py-8 flex justify-center min-h-[80px] w-full">
        {loadingMoreSongs ? <Loader2 className="animate-spin text-white" size={32} /> :
          !hasMoreSongs && <span className="text-neutral-500 font-medium text-sm">End of tracklist</span>}
      </div>
    </div>
  );

  if (viewMode === 'albums') return (
    <div className="min-h-screen bg-neutral-950 pb-28 pt-2 px-4 md:px-8 max-w-7xl mx-auto animate-in fade-in" style={{ overflowAnchor: 'none' }}>
      <ViewAllHeader 
        title="All Albums" 
        countLabel={`${(totalAlbumsCount || 0).toLocaleString()} Total Albums`} 
        artist={artist} 
        onBack={handleBackToMain} 
      />
      <GridCards items={albums} type="Album" onNavigate={navigateToResource} />
      <div ref={observerRef} className="py-10 flex justify-center min-h-[80px] w-full">
        {loadingMoreAlbums ? <Loader2 className="animate-spin text-white" size={32} /> :
          !hasMoreAlbums && <span className="text-neutral-500 font-medium text-sm">End of albums</span>}
      </div>
    </div>
  );

  // --- MAIN PAGE VIEW ---
  return (
    <div className="pb-28 min-h-screen bg-neutral-950 w-full overflow-hidden">
      
      {/* 1. Artist Hero Section (Left-aligned, Light Premium Glassmorphism) */}
      <div className="relative w-full h-[350px] md:h-[450px] flex flex-col justify-end bg-neutral-900 overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div 
            className="absolute inset-[-10%] bg-cover bg-center blur-[80px] saturate-[1.8] opacity-50"
            style={{ backgroundImage: `url(${getImageUrl(artist.image)})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />
        </div>
        
        <div className="absolute top-0 left-0 right-0 p-4 md:p-6 z-30">
          <button onClick={() => router.back()} className="bg-black/20 p-2.5 rounded-full backdrop-blur-xl text-white hover:bg-white/20 transition-all border border-white/10 shadow-sm">
            <ArrowLeft size={24} />
          </button>
        </div>

        <div className="relative z-20 px-4 md:px-10 pb-8 max-w-7xl mx-auto w-full flex flex-col md:flex-row md:items-end gap-5 md:gap-8 items-start">
          <img 
            src={getImageUrl(artist.image)} 
            alt={artist.name || "Artist"}
            className="w-32 h-32 md:w-52 md:h-52 rounded-full shadow-[0_15px_40px_rgba(0,0,0,0.4)] object-cover border-[3px] border-white/20 bg-neutral-800 shrink-0 mx-auto md:mx-0" 
          />
          <div className="flex flex-col gap-1.5 flex-1 min-w-0 w-full items-center md:items-start">
            <ScrollableTitle 
              text={artist.name || 'Artist'} 
              alignCenterOnMobile={true}
              className="text-4xl md:text-6xl lg:text-7xl font-black text-white tracking-tight drop-shadow-lg leading-none" 
            />
            
            <div className="flex flex-wrap justify-center md:justify-start items-center gap-3 md:gap-4 text-xs md:text-sm text-neutral-200 mt-2 font-semibold">
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

      <div className="max-w-7xl mx-auto px-4 md:px-10 relative z-30 -mt-4">
        <div className="mb-10 flex justify-center md:justify-start gap-4 items-center">
          <button onClick={() => songs.length && handlePlaySong(songs[0])} className="bg-white text-black p-4 md:p-5 rounded-full active:scale-95 transition-transform shadow-[0_5px_20px_rgba(255,255,255,0.3)] hover:scale-105">
            <Play fill="black" size={26} className="ml-1" />
          </button>
        </div>

        {/* 2. Top Songs (Top 10) */}
        {songs?.length > 0 && (
          <section className="mb-12">
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-2xl md:text-3xl font-black text-white">Popular Songs</h2>
              {songs.length > 5 && (
                <button onClick={() => { setViewMode('songs'); window.scrollTo(0,0); }} className="text-sm font-bold text-neutral-400 hover:text-white transition-colors flex items-center gap-0.5">
                  View All <ChevronRight size={18} />
                </button>
              )}
            </div>
            <div className="flex flex-col gap-1 bg-white/[0.02] p-2 md:p-3 rounded-2xl border border-white/5 w-full">
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

        {/* 3. Albums */}
        {albums?.length > 0 && (
          <section className="mb-12">
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-2xl md:text-3xl font-black text-white">Albums</h2>
              {albums.length > 5 && (
                <button onClick={() => { setViewMode('albums'); window.scrollTo(0,0); }} className="text-sm font-bold text-neutral-400 hover:text-white transition-colors flex items-center gap-0.5">
                  View All <ChevronRight size={18} />
                </button>
              )}
            </div>
            <TwoLineCards items={albums.slice(0, 10)} type="Album" onNavigate={navigateToResource} />
          </section>
        )}

        {/* 4. Singles */}
        {artist.singles?.length > 0 && (
          <section className="mb-12">
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-2xl md:text-3xl font-black text-white">Singles & EPs</h2>
            </div>
            <TwoLineCards items={artist.singles} type="Single" onNavigate={navigateToResource} />
          </section>
        )}

        {/* 5. Latest Releases */}
        {artist.latestReleases?.length > 0 && (
          <section className="mb-12">
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-2xl md:text-3xl font-black text-white">Latest Releases</h2>
            </div>
            <TwoLineCards items={artist.latestReleases} type="Release" onNavigate={navigateToResource} />
          </section>
        )}

        {/* 6. Playlists */}
        {artist.dedicatedPlaylists?.length > 0 && (
          <section className="mb-12">
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-2xl md:text-3xl font-black text-white">{artist.name} Playlists</h2>
            </div>
            <TwoLineCards items={artist.dedicatedPlaylists} type="Playlist" onNavigate={(url) => navigateToResource(`/playlist?link=${encodeURIComponent(url)}`)} />
          </section>
        )}
        
        {artist.featuredPlaylists?.length > 0 && (
          <section className="mb-12">
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-2xl md:text-3xl font-black text-white">Featured In</h2>
            </div>
            <TwoLineCards items={artist.featuredPlaylists} type="Playlist" onNavigate={(url) => navigateToResource(`/playlist?link=${encodeURIComponent(url)}`)} />
          </section>
        )}

        {/* 7. Similar Artists */}
        {artist.similarArtists?.length > 0 && (
          <section className="mb-12">
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-2xl md:text-3xl font-black text-white">Similar Artists</h2>
            </div>
            <div className="flex gap-4 md:gap-6 overflow-x-auto snap-x hide-scrollbar pb-6 pt-2 w-full">
              {artist.similarArtists.map((item: any, index: number) => (
                <div key={`sim-${item.id}-${index}`} onClick={() => navigateToResource(`/artist?id=${item.id}`)} className="snap-start flex flex-col items-center cursor-pointer group min-w-[100px] md:min-w-[120px] w-[100px] md:w-[120px]">
                   <img src={getImageUrl(item.image)} alt={item.name || "Artist"} className="w-20 h-20 md:w-28 md:h-28 rounded-full object-cover mb-3 group-hover:scale-105 transition-transform bg-neutral-800 shadow-md border border-white/10" />
                   <ScrollableTitle text={item.name} alignCenterOnMobile={true} className="text-xs md:text-sm font-bold text-white text-center w-full px-1" />
                   <p className="text-[10px] md:text-xs text-neutral-400 mt-0.5 font-medium truncate w-full text-center">
                     {getHighestRole(item.roles)}
                   </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 8. Biography */}
        {Array.isArray(artist.bio) && artist.bio.length > 0 && (
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
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes custom-marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee-custom {
          animation: custom-marquee 8s linear infinite;
        }
      `}} />
      <Suspense fallback={<div className="flex h-screen items-center justify-center bg-neutral-950"><Loader2 className="animate-spin text-white" size={40} /></div>}>
        <ArtistContent />
      </Suspense>
    </>
  );
}
