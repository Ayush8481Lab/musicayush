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
const decodeHTMLEntities = (text: any) => {
  if (!text) return "";
  return String(text)
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

const sortByYearDesc = (arr: any[]) => {
  if (!Array.isArray(arr)) return[];
  return arr.sort((a, b) => (parseInt(b.year) || 0) - (parseInt(a.year) || 0));
};

const normalizeItem = (item: any) => ({
  ...item,
  id: item.id || item.perma_url || item.artist_id || Math.random().toString(),
  name: item.title || item.name,
  image: item.image_link || item.image,
  url: item.perma_url || item.url,
  songCount: item.song_count || item.songCount
});

const getHighestRole = (roles: Record<string, string>) => {
  if (!roles || typeof roles !== 'object' || Array.isArray(roles) || Object.keys(roles).length === 0) return "Artist";
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
  if (bestRole.toLowerCase() === 'starring') return 'Actor';
  return bestRole.charAt(0).toUpperCase() + bestRole.slice(1);
};


// --- YouTube Style Skeletons ---
const SkeletonHero = () => (
  <div className="relative w-full h-[400px] md:h-[500px] animate-pulse flex flex-col justify-end p-4 md:p-10 border-b border-white/5">
    <div className="flex flex-col md:flex-row items-center md:items-end gap-5 md:gap-8 max-w-7xl mx-auto w-full">
      <div className="w-36 h-36 md:w-56 md:h-56 rounded-full bg-white/10 shrink-0 shadow-lg border-[3px] border-white/5"></div>
      <div className="flex flex-col gap-3 w-full items-center md:items-start">
        <div className="h-10 md:h-14 bg-white/10 w-2/3 md:w-1/2 rounded-lg"></div>
        <div className="flex gap-3 mt-2">
          <div className="h-6 w-24 bg-white/10 rounded-full"></div>
          <div className="h-6 w-24 bg-white/10 rounded-full"></div>
        </div>
      </div>
    </div>
  </div>
);

const SkeletonRow = () => (
  <div className="flex items-center gap-4 p-3 animate-pulse">
    <div className="w-6 h-4 bg-white/5 rounded shrink-0"></div>
    <div className="w-12 h-12 bg-white/10 rounded-md shrink-0"></div>
    <div className="flex-1 flex flex-col gap-2">
      <div className="h-4 bg-white/10 w-2/3 rounded"></div>
      <div className="h-3 bg-white/10 w-1/3 rounded"></div>
    </div>
  </div>
);

const SkeletonCard = () => (
  <div className="flex flex-col animate-pulse w-full gap-2">
    <div className="w-full aspect-square bg-white/10 rounded-xl shadow-md"></div>
    <div className="h-4 bg-white/10 w-3/4 rounded mt-1"></div>
    <div className="h-3 bg-white/10 w-1/2 rounded"></div>
  </div>
);


// --- Smart Marquee Component (Constant Readable Speed) ---
const ScrollableTitle = ({ text, className, alignCenterOnMobile }: { text: string, className?: string, alignCenterOnMobile?: boolean }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [animDuration, setAnimDuration] = useState(8);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        const textWidth = textRef.current.scrollWidth;
        const containerWidth = containerRef.current.clientWidth;
        const overflow = textWidth > containerWidth;
        setIsOverflowing(overflow);
        
        // Dynamically calculate speed: 25 pixels per second = constant smooth readability
        if (overflow) {
          setAnimDuration(textWidth / 25);
        }
      }
    };
    checkOverflow();
    setTimeout(checkOverflow, 150); 
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  },[text]);

  const decodedText = decodeHTMLEntities(text || '');

  return (
    <div ref={containerRef} className={`w-full overflow-hidden whitespace-nowrap ${alignCenterOnMobile ? 'text-center md:text-left' : ''} ${className || ''}`}
      style={{
        maskImage: isOverflowing ? 'linear-gradient(to right, black 85%, transparent 100%)' : 'none',
        WebkitMaskImage: isOverflowing ? 'linear-gradient(to right, black 85%, transparent 100%)' : 'none'
      }}>
      <div className={`inline-block w-max ${isOverflowing ? 'animate-marquee-custom' : ''}`} style={isOverflowing ? { animationDuration: `${animDuration}s` } : {}}>
         <span ref={textRef} className="inline-block max-w-none">{decodedText}</span>
         {isOverflowing && <span className="inline-block max-w-none pl-8">{decodedText}</span>}
      </div>
    </div>
  );
};


// --- UI REUSABLE COMPONENTS ---
const ViewAllHeader = ({ title, countLabel, artist, onBack }: any) => (
  <div className="sticky top-0 bg-neutral-950/80 backdrop-blur-2xl z-40 -mx-4 px-4 py-3 md:py-4 mb-6 flex items-center gap-4 shadow-lg border-b border-white/5">
    <button onClick={onBack} className="p-2.5 bg-white/10 rounded-full hover:bg-white/20 active:scale-90 text-white transition-all shrink-0">
      <ArrowLeft size={22} />
    </button>
    <img draggable={false} src={getImageUrl(artist?.image)} alt="Artist" className="w-12 h-12 md:w-14 md:h-14 rounded-full object-cover shadow-lg border border-white/10 shrink-0 pointer-events-none" />
    <div className="overflow-hidden min-w-0 flex-1">
      <ScrollableTitle text={artist?.name || ''} className="text-lg md:text-xl font-black text-white leading-tight" />
      <p className="text-xs md:text-sm text-neutral-400 font-medium truncate">{title} • {countLabel}</p>
    </div>
  </div>
);

const SongItem = ({ song, index, fallbackArtistName, onPlay, currentSong }: any) => {
  const isPlaying = currentSong?.id === song.id;

  return (
    <div onClick={() => onPlay(song)} className="flex items-center gap-3 md:gap-4 p-2.5 md:p-3 rounded-xl hover:bg-white/10 active:bg-white/5 active:scale-[0.98] cursor-pointer group transition-all duration-200 ease-out w-full">
      <span className={`text-sm font-medium w-6 text-center shrink-0 ${isPlaying ? 'text-blue-400' : 'text-neutral-500 group-hover:text-white'}`}>
        {isPlaying ? <Play size={16} fill="currentColor" className="mx-auto" /> : index + 1}
      </span>
      <img draggable={false} src={getImageUrl(song.image)} alt="Cover" className="w-12 h-12 rounded-md object-cover shadow-sm bg-neutral-800 shrink-0 pointer-events-none" />
      <div className="flex-1 overflow-hidden min-w-0">
        <ScrollableTitle text={song.name || song.title} className={`text-sm md:text-base font-bold ${isPlaying ? 'text-blue-400' : 'text-white'}`} />
        <ScrollableTitle text={song.artists?.primary?.map((a:any) => a.name).join(', ') || fallbackArtistName} className="text-xs md:text-sm text-neutral-400 mt-0.5" />
      </div>
      <div className="hidden md:block text-sm text-neutral-500 w-16 text-right mr-4 font-medium shrink-0">{formatDuration(song.duration)}</div>
      <MoreVertical size={20} className="text-neutral-500 group-hover:text-white shrink-0" />
    </div>
  );
};

const GridCards = ({ items, type, onNavigate }: { items: any[], type: string, onNavigate: (url: string) => void }) => (
  <div className="grid grid-cols-2 min-[450px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 md:gap-6 w-full" style={{ overflowAnchor: 'none' }}>
    {items?.map((item: any, index: number) => (
      <div key={`grid-${item.id}-${index}`} onClick={() => onNavigate(item.url || item.perma_url)} className="flex flex-col cursor-pointer group min-w-0 w-full active:scale-[0.96] transition-transform duration-200">
        <div className="relative overflow-hidden rounded-lg md:rounded-xl shadow-md mb-2 md:mb-3 aspect-square w-full pointer-events-none">
          <img draggable={false} src={getImageUrl(item.image)} alt="Cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 bg-neutral-800" />
        </div>
        <ScrollableTitle text={item.name} className="text-sm md:text-base font-bold text-white" />
        <p className="text-xs text-neutral-400 mt-0.5 font-medium truncate">
          {item.year && `${item.year} • `}{item.songCount ? `${item.songCount} Songs` : type}
        </p>
      </div>
    ))}
  </div>
);

const TwoLineCards = ({ items, type, onNavigate }: { items: any[], type: string, onNavigate: (url: string) => void }) => (
  <div className="grid grid-rows-2 grid-flow-col gap-4 md:gap-6 overflow-x-auto snap-x hide-scrollbar pb-6 pt-2 auto-cols-[140px] sm:auto-cols-[160px] md:auto-cols-[190px] scroll-smooth w-full">
    {items?.map((item: any, index: number) => (
      <div key={`scroll2-${item.id}-${index}`} onClick={() => onNavigate(item.url || item.perma_url)} className="snap-start flex flex-col cursor-pointer group min-w-0 w-full active:scale-[0.96] transition-transform duration-200">
        <div className="relative overflow-hidden rounded-lg md:rounded-xl aspect-square shadow-md mb-2 md:mb-3 w-full pointer-events-none">
          <img draggable={false} src={getImageUrl(item.image)} alt="Cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 bg-neutral-800" />
        </div>
        <ScrollableTitle text={item.name} className="text-sm md:text-base font-bold text-white" />
        <p className="text-xs text-neutral-400 mt-0.5 truncate font-medium">
          {item.year && `${item.year} • `}{item.songCount ? `${item.songCount} Songs` : type}
        </p>
      </div>
    ))}
  </div>
);

const OneLineCards = ({ items, type, onNavigate }: { items: any[], type: string, onNavigate: (url: string) => void }) => (
  <div className="flex gap-4 md:gap-6 overflow-x-auto snap-x hide-scrollbar pb-6 pt-2 scroll-smooth w-full">
    {items?.map((item: any, index: number) => (
      <div key={`scroll1-${item.id || index}`} onClick={() => onNavigate(item.url || item.perma_url)} className="flex-shrink-0 snap-start w-[140px] sm:w-[160px] md:w-[190px] flex flex-col cursor-pointer group min-w-0 active:scale-[0.96] transition-transform duration-200">
        <div className="relative overflow-hidden rounded-lg md:rounded-xl aspect-square shadow-md mb-2 md:mb-3 w-full pointer-events-none">
          <img draggable={false} src={getImageUrl(item.image)} alt="Cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 bg-neutral-800" />
        </div>
        <ScrollableTitle text={item.name} className="text-sm md:text-base font-bold text-white" />
        <p className="text-xs text-neutral-400 mt-0.5 truncate font-medium">
          {item.year && `${item.year} • `}{item.songCount ? `${item.songCount} Songs` : type}
        </p>
      </div>
    ))}
  </div>
);

const SimilarArtistCards = ({ items, onNavigate }: { items: any[], onNavigate: (url: string) => void }) => (
  <div className="flex gap-4 md:gap-6 overflow-x-auto snap-x hide-scrollbar pb-6 pt-2 w-full">
    {items?.map((item: any, index: number) => (
      <div key={`sim-${item.id || index}`} onClick={() => onNavigate(`/artist?id=${item.id}`)} className="snap-start flex flex-col items-center cursor-pointer group min-w-[100px] md:min-w-[130px] w-[100px] md:w-[130px] active:scale-[0.96] transition-transform duration-200">
         <img draggable={false} src={getImageUrl(item.image)} alt="Artist" className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover mb-3 group-hover:scale-105 transition-transform bg-neutral-800 shadow-md border border-white/10 pointer-events-none" />
         <ScrollableTitle text={item.name} alignCenterOnMobile={true} className="text-xs md:text-sm font-bold text-white text-center w-full px-1" />
         <p className="text-[10px] md:text-xs text-neutral-400 mt-0.5 font-medium truncate w-full text-center capitalize">
           {getHighestRole(item.roles || {})}
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

  const { currentSong, setCurrentSong, setIsPlaying } = useAppContext();

  // --- States ---
  const [artist, setArtist] = useState<any>(null);

  const [songs, setSongs] = useState<any[]>([]);
  const[totalSongsCount, setTotalSongsCount] = useState<number>(0);

  const [albums, setAlbums] = useState<any[]>([]);
  const[totalAlbumsCount, setTotalAlbumsCount] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'main' | 'songs' | 'albums'>('main');

  // --- Infinite Scroll States ---
  const [songPage, setSongPage] = useState(0);
  const[loadingMoreSongs, setLoadingMoreSongs] = useState(false);
  const isFetchingSongs = useRef(false);
  const[hasMoreSongs, setHasMoreSongs] = useState(true);

  const [albumPage, setAlbumPage] = useState(0);
  const[loadingMoreAlbums, setLoadingMoreAlbums] = useState(false);
  const isFetchingAlbums = useRef(false);
  const[hasMoreAlbums, setHasMoreAlbums] = useState(true);

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

        let fetchedSongs =[];
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
              dominantLanguage: firstSong.language || "Unknown", followerCount: 0, bio:[]
            };
            artistUrl = primaryArtist.url || primaryArtist.perma_url || "";
          }
        }

        if (fetchedArtist && artistUrl) {
          const token = extractToken(artistUrl);
          if (token) {
            try {
              const extraRes = await fetch(`https://ayushpr.vercel.app/${token}`);
              const extraData = await extraRes.json();
              if (extraData) {
                fetchedArtist.followerCount = parseInt(extraData.follower_count) || fetchedArtist.followerCount || 0;
                
                const mappedSingles = (extraData.modules?.singles ||[]).map(normalizeItem);
                fetchedArtist.singles = sortByYearDesc(mappedSingles.length > 0 ? mappedSingles : fetchedArtist.singles ||[]);
                fetchedArtist.latestReleases = sortByYearDesc((extraData.latest_release || extraData.modules?.latest_release ||[]).map(normalizeItem));
                fetchedArtist.dedicatedPlaylists = (extraData.dedicated_artist_playlist || extraData.modules?.dedicated_artist_playlist ||[]).map(normalizeItem);
                fetchedArtist.featuredPlaylists = (extraData.featured_artist_playlist || extraData.modules?.featured_artist_playlist ||[]).map(normalizeItem);
                fetchedArtist.similarArtists = (extraData.similarArtists || extraData.modules?.similarArtists ||[]).map(normalizeItem);
              }
            } catch (err) {}
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

        memoryCache[id] = {
          artist: fetchedArtist, songs: fetchedSongs,
          totalSongsCount: songsRes.status === 'fulfilled' ? songsRes.value.data?.total : 0,
          albums: fetchedAlbums,
          totalAlbumsCount: albumsRes.status === 'fulfilled' ? albumsRes.value.data?.total : 0,
          songPage: 0, albumPage: 0,
          hasMoreSongs: true, hasMoreAlbums: true,
          viewMode: 'main', scrollPos: 0
        };

      } catch (error) {} finally { setLoading(false); }
    };

    fetchInitialData();
  }, [id]);

  useEffect(() => {
    if (restoredScrollPos !== null && !loading) {
      requestAnimationFrame(() => {
        setTimeout(() => {
          window.scrollTo({ top: restoredScrollPos, behavior: 'instant' });
          setRestoredScrollPos(null);
        }, 150);
      });
    }
  },[restoredScrollPos, loading, viewMode]);

  const handleNavigate = (url: string) => {
    if (!url) return;
    if (id && memoryCache[id]) {
      memoryCache[id].viewMode = viewMode;
      memoryCache[id].scrollPos = window.scrollY; 
    }
    
    let targetUrl = url;

    // Convert full jiosaavn urls into relative direct paths
    if (targetUrl.startsWith('http')) {
      try {
        const parsedUrl = new URL(targetUrl);
        targetUrl = parsedUrl.pathname + parsedUrl.search;
      } catch (error) {}
    } else if (!targetUrl.startsWith('/')) {
      // Safety fallback for relative string mappings
      targetUrl = '/' + targetUrl;
    }
    
    router.push(targetUrl);
  };

  const handleBackToMain = () => {
    setViewMode('main');
    if (id && memoryCache[id]) {
      memoryCache[id].viewMode = 'main';
      memoryCache[id].scrollPos = 0;
    }
    window.scrollTo(0, 0);
  };

  // --- Reduced Batch Size (3 Pages) to prevent massive DOM jumps & speed up load ---
  const loadMoreSongsBatch = useCallback(async () => {
    if (isFetchingSongs.current || !hasMoreSongs || !id) return;
    isFetchingSongs.current = true; setLoadingMoreSongs(true);

    try {
      const p1 = songPage + 1, p2 = songPage + 2, p3 = songPage + 3;
      const promises =[
        fetch(`https://ayushm-psi.vercel.app/api/artists/${id}/songs?page=${p1}`).then(r => r.json()),
        fetch(`https://ayushm-psi.vercel.app/api/artists/${id}/songs?page=${p2}`).then(r => r.json()),
        fetch(`https://ayushm-psi.vercel.app/api/artists/${id}/songs?page=${p3}`).then(r => r.json())
      ];
      
      const results = await Promise.allSettled(promises);
      let newBatch: any[] =[];
      results.forEach(res => {
        if (res.status === 'fulfilled' && res.value.success && res.value.data?.songs) {
          newBatch = [...newBatch, ...res.value.data.songs];
        }
      });

      setSongs(prev => {
        const ids = new Set(prev.map(s => s.id));
        const unique = newBatch.filter(s => !ids.has(s.id));
        if (unique.length === 0) { setHasMoreSongs(false); return prev; }
        
        const finalData = [...prev, ...unique]; 
        if (memoryCache[id]) { memoryCache[id].songs = finalData; memoryCache[id].songPage = p3; }
        return finalData;
      });
      setSongPage(p3);
    } catch (e) { setHasMoreSongs(false); } finally { isFetchingSongs.current = false; setLoadingMoreSongs(false); }
  },[id, songPage, hasMoreSongs]);

  const loadMoreAlbumsBatch = useCallback(async () => {
    if (isFetchingAlbums.current || !hasMoreAlbums || !id) return;
    isFetchingAlbums.current = true; setLoadingMoreAlbums(true);

    try {
      const p1 = albumPage + 1, p2 = albumPage + 2, p3 = albumPage + 3;
      const promises =[
        fetch(`https://ayushm-psi.vercel.app/api/artists/${id}/albums?page=${p1}`).then(r => r.json()),
        fetch(`https://ayushm-psi.vercel.app/api/artists/${id}/albums?page=${p2}`).then(r => r.json()),
        fetch(`https://ayushm-psi.vercel.app/api/artists/${id}/albums?page=${p3}`).then(r => r.json())
      ];

      const results = await Promise.allSettled(promises);
      let newBatch: any[] =[];
      results.forEach(res => {
        if (res.status === 'fulfilled' && res.value.success && res.value.data?.albums) {
          newBatch =[...newBatch, ...res.value.data.albums];
        }
      });

      setAlbums(prev => {
        const ids = new Set(prev.map(a => a.id));
        const unique = newBatch.filter(a => !ids.has(a.id) && (a.songCount > 1 || !a.songCount));
        if (unique.length === 0) { setHasMoreAlbums(false); return prev; }
        
        const finalData =[...prev, ...sortByYearDesc(unique)];
        if (memoryCache[id]) { memoryCache[id].albums = finalData; memoryCache[id].albumPage = p3; }
        return finalData;
      });
      setAlbumPage(p3);
    } catch (e) { setHasMoreAlbums(false); } finally { isFetchingAlbums.current = false; setLoadingMoreAlbums(false); }
  }, [id, albumPage, hasMoreAlbums]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        if (viewMode === 'songs') loadMoreSongsBatch();
        if (viewMode === 'albums') loadMoreAlbumsBatch();
      }
    }, { rootMargin: '800px', threshold: 0.1 }); 

    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  },[loadMoreSongsBatch, loadMoreAlbumsBatch, viewMode]);


  if (loading) return (
    <div className="min-h-screen bg-neutral-950 w-full overflow-hidden pb-28 select-none [-webkit-touch-callout:none]" onContextMenu={(e) => e.preventDefault()}>
      <SkeletonHero />
      <div className="max-w-7xl mx-auto px-4 md:px-10 mt-6">
        <div className="h-8 w-40 bg-white/10 rounded animate-pulse mb-4"></div>
        <div className="flex flex-col gap-1 mb-10"><SkeletonRow /><SkeletonRow /><SkeletonRow /></div>
        <div className="h-8 w-40 bg-white/10 rounded animate-pulse mb-4"></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      </div>
    </div>
  );

  if (!artist) return <div className="flex h-screen items-center justify-center bg-neutral-950 text-neutral-400 font-medium">Artist could not be found.</div>;

  const handlePlaySong = (song: any) => { setCurrentSong(song); setIsPlaying(true); };

  // --- SUB VIEWS ---

  if (viewMode === 'songs') return (
    <div className="min-h-screen bg-transparent relative z-10 pb-28 pt-2 px-4 md:px-8 max-w-7xl mx-auto animate-in fade-in" style={{ overflowAnchor: 'none' }}>
      <ViewAllHeader title="All Songs" countLabel={`${(totalSongsCount || 0).toLocaleString()} Total Songs`} artist={artist} onBack={handleBackToMain} />
      <div className="flex flex-col gap-1 w-full">
        {songs?.map((song, idx) => (
          <SongItem key={`song-list-${song.id}-${idx}`} song={song} index={idx} fallbackArtistName={artist?.name} onPlay={handlePlaySong} currentSong={currentSong} />
        ))}
      </div>
      <div ref={observerRef} className="py-8 flex justify-center min-h-[80px] w-full">
        {loadingMoreSongs ? <div className="flex flex-col items-center gap-2"><Loader2 className="animate-spin text-white" size={32} /><span className="text-xs text-neutral-400">Loading...</span></div> :
          !hasMoreSongs && <span className="text-neutral-500 font-medium text-sm">End of tracklist</span>}
      </div>
    </div>
  );

  if (viewMode === 'albums') return (
    <div className="min-h-screen bg-transparent relative z-10 pb-28 pt-2 px-4 md:px-8 max-w-7xl mx-auto animate-in fade-in" style={{ overflowAnchor: 'none' }}>
      <ViewAllHeader title="All Albums" countLabel={`${(totalAlbumsCount || 0).toLocaleString()} Total Albums`} artist={artist} onBack={handleBackToMain} />
      <GridCards items={albums} type="Album" onNavigate={handleNavigate} />
      <div ref={observerRef} className="py-10 flex justify-center min-h-[80px] w-full">
        {loadingMoreAlbums ? <div className="flex flex-col items-center gap-2"><Loader2 className="animate-spin text-white" size={32} /><span className="text-xs text-neutral-400">Loading...</span></div> :
          !hasMoreAlbums && <span className="text-neutral-500 font-medium text-sm">End of albums</span>}
      </div>
    </div>
  );

  // --- MAIN PAGE VIEW ---
  return (
    <>
      {/* Absolute Global Background Tint */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div 
          className="absolute inset-[-20%] bg-cover bg-center blur-[120px] saturate-[2.0] opacity-40"
          style={{ backgroundImage: `url(${getImageUrl(artist.image)})` }}
        />
        <div className="absolute inset-0 bg-neutral-950/80" />
      </div>

      <div className="pb-28 min-h-screen bg-transparent w-full relative z-10 overflow-hidden">
        
        {/* 1. Artist Hero Section */}
        <div className="relative w-full h-[350px] md:h-[450px] flex flex-col justify-end bg-transparent border-b border-white/5">
          <div className="absolute top-0 left-0 right-0 p-4 md:p-6 z-30">
            <button onClick={() => router.back()} className="bg-black/20 p-2.5 rounded-full backdrop-blur-xl text-white hover:bg-white/20 active:scale-90 transition-all border border-white/10 shadow-sm">
              <ArrowLeft size={24} />
            </button>
          </div>

          <div className="relative z-20 px-4 md:px-10 pb-8 max-w-7xl mx-auto w-full flex flex-col md:flex-row md:items-end gap-5 md:gap-8 items-start">
            <img 
              src={getImageUrl(artist.image)} 
              draggable={false}
              alt="Artist"
              className="w-32 h-32 md:w-52 md:h-52 rounded-full shadow-[0_15px_40px_rgba(0,0,0,0.4)] object-cover border-[3px] border-white/20 bg-neutral-800 shrink-0 mx-auto md:mx-0 pointer-events-none" 
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
            <button onClick={() => songs.length && handlePlaySong(songs[0])} className="bg-white text-black p-4 md:p-5 rounded-full active:scale-90 active:opacity-90 transition-all duration-200 shadow-[0_5px_20px_rgba(255,255,255,0.3)] hover:scale-105">
              <Play fill="black" size={26} className="ml-1" />
            </button>
          </div>

          {/* 2. Top Songs (Top 10) */}
          {songs?.length > 0 && (
            <section className="mb-12">
              <div className="flex justify-between items-end mb-4">
                <h2 className="text-2xl md:text-3xl font-black text-white">Popular Songs</h2>
                {songs.length > 5 && (
                  <button onClick={() => { setViewMode('songs'); window.scrollTo(0,0); }} className="text-sm font-bold text-neutral-400 hover:text-white transition-colors flex items-center gap-0.5 active:scale-95">
                    View All <ChevronRight size={18} />
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-1 bg-black/20 p-2 md:p-3 rounded-2xl border border-white/5 w-full">
                {songs.slice(0, 10).map((song: any, index: number) => (
                  <SongItem 
                    key={`top-song-${song.id}-${index}`} 
                    song={song} 
                    index={index} 
                    fallbackArtistName={artist?.name}
                    onPlay={handlePlaySong}
                    currentSong={currentSong}
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
                  <button onClick={() => { setViewMode('albums'); window.scrollTo(0,0); }} className="text-sm font-bold text-neutral-400 hover:text-white transition-colors flex items-center gap-0.5 active:scale-95">
                    View All <ChevronRight size={18} />
                  </button>
                )}
              </div>
              <TwoLineCards items={albums.slice(0, 10)} type="Album" onNavigate={handleNavigate} />
            </section>
          )}

          {/* 4. Singles */}
          {artist.singles?.length > 0 && (
            <section className="mb-12">
              <div className="flex justify-between items-end mb-4">
                <h2 className="text-2xl md:text-3xl font-black text-white">Singles</h2>
              </div>
              <TwoLineCards items={artist.singles} type="Single" onNavigate={handleNavigate} />
            </section>
          )}

          {/* 5. Latest Releases */}
          {artist.latestReleases?.length > 0 && (
            <section className="mb-12">
              <div className="flex justify-between items-end mb-4">
                <h2 className="text-2xl md:text-3xl font-black text-white">Latest Releases</h2>
              </div>
              <OneLineCards items={artist.latestReleases} type="Release" onNavigate={handleNavigate} />
            </section>
          )}

          {/* 6. Playlists */}
          {artist.dedicatedPlaylists?.length > 0 && (
            <section className="mb-12">
              <div className="flex justify-between items-end mb-4">
                <h2 className="text-2xl md:text-3xl font-black text-white">{artist.name} Playlists</h2>
              </div>
              <OneLineCards items={artist.dedicatedPlaylists} type="Playlist" onNavigate={handleNavigate} />
            </section>
          )}
          
          {artist.featuredPlaylists?.length > 0 && (
            <section className="mb-12">
              <div className="flex justify-between items-end mb-4">
                <h2 className="text-2xl md:text-3xl font-black text-white">Featured In</h2>
              </div>
              <OneLineCards items={artist.featuredPlaylists} type="Playlist" onNavigate={handleNavigate} />
            </section>
          )}

          {/* 7. Similar Artists */}
          {artist.similarArtists?.length > 0 && (
            <section className="mb-12">
              <div className="flex justify-between items-end mb-4">
                <h2 className="text-2xl md:text-3xl font-black text-white">Similar Artists</h2>
              </div>
              <SimilarArtistCards items={artist.similarArtists} onNavigate={handleNavigate} />
            </section>
          )}

          {/* 8. Biography */}
          {Array.isArray(artist.bio) && artist.bio.length > 0 && (
            <section className="mb-12">
              <h2 className="text-2xl md:text-3xl font-black text-white mb-6">About Artist</h2>
              <div className="bg-black/20 rounded-3xl p-6 md:p-8 backdrop-blur-md border border-white/5 shadow-md">
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
    </>
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
          animation: custom-marquee linear infinite;
        }
      `}} />
      <div className="select-none [-webkit-touch-callout:none] [-webkit-user-drag:none]" onContextMenu={(e) => e.preventDefault()}>
        <Suspense fallback={
          <div className="flex h-screen w-full bg-neutral-950 items-center justify-center">
            <Loader2 className="animate-spin text-white" size={40} />
          </div>
        }>
          <ArtistContent />
        </Suspense>
      </div>
    </>
  );
}
