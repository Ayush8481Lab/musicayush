"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useAppContext } from "../context/AppContext";
import { Search as SearchIcon, Mic } from "lucide-react";
import { useRouter } from "next/navigation";

// --- HYBRID CACHE ENGINE (Instant RAM + 30m IDB Background) ---
const DB_NAME = 'MusicAppDB';
const STORE_NAME = 'HomeCache';
const CACHE_DURATION = 30 * 60 * 1000; 

const initDB = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, 1);
  request.onupgradeneeded = (e: any) => e.target.result.createObjectStore(STORE_NAME);
  request.onsuccess = (e: any) => resolve(e.target.result);
  request.onerror = () => reject('IDB Error');
});

const setCache = async (key: string, val: any) => {
  try { sessionStorage.setItem(key, JSON.stringify(val)); } catch (e) {} // Fast RAM Save
  try {
    const db = await initDB();
    db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(val, key); // BG IDB Save
  } catch (e) {}
};

const getCache = async (key: string): Promise<any> => {
  try { const mem = sessionStorage.getItem(key); if (mem) return JSON.parse(mem); } catch (e) {} // Instant RAM Hit
  try {
    const db = await initDB();
    return new Promise((resolve) => {
      const req = db.transaction(STORE_NAME).objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
  } catch (e) { return null; }
};

// --- UTILS ---
const getImageUrl = (img: any) => {
  if (!img) return "https://via.placeholder.com/500x500?text=Music";
  if (typeof img === "string") return img.replace("150x150", "500x500").replace("50x50", "500x500");
  if (Array.isArray(img)) return img[img.length - 1]?.url || img[0]?.url;
  return "https://via.placeholder.com/500x500?text=Music";
};

const decodeEntities = (text: string) => text ? text.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">") : "";

const getSubtitle = (item: any, hideSubtitle: boolean) => {
  if (hideSubtitle) return "";
  let sub = "";
  if (item.type === "album") {
    const primary = item.more_info?.artistMap?.primary_artists;
    const all = item.more_info?.artistMap?.artists;
    if (primary?.length > 0) sub = primary.map((a: any) => a.name).join(", ");
    else if (all?.length > 0) sub = all.map((a: any) => a.name).join(", ");
  }
  if (!sub) sub = item.subtitle || item.header_desc || item.description || item.more_info?.singers || item.primaryArtists || item.singers || "";
  return sub || (item.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1) : "");
};

// --- COMPONENTS ---
const PremiumCard = ({ item, isCircular, hideSubtitle, onClick }: any) => {
  const title = decodeEntities(item.title || item.name || "Unknown");
  const subtitle = decodeEntities(getSubtitle(item, hideSubtitle));
  const isLongTitle = title.length > 15;
  const isLongSub = subtitle.length > 18;

  return (
    <div onClick={() => onClick(item)} className="w-[140px] flex-shrink-0 snap-start cursor-pointer group pb-1">
      <div className={`relative overflow-hidden bg-[#111] border border-[#222] mb-2 transition-transform duration-200 active:scale-95 shadow-md ${isCircular ? "rounded-full aspect-square" : "rounded-xl aspect-[1/1]"}`}>
        <img src={getImageUrl(item.image_link || item.image)} alt={title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" />
      </div>
      <div className="w-full overflow-hidden whitespace-nowrap text-center">
        <span className={`inline-block text-[14px] font-extrabold text-white tracking-wide ${isLongTitle ? "animate-ping-pong" : ""}`} style={isLongTitle ? { animationDuration: `${Math.max(4, title.length * 0.15)}s` } : {}}>{title}</span>
      </div>
      {subtitle && (
        <div className="w-full overflow-hidden whitespace-nowrap text-center mt-0.5">
          <span className={`inline-block text-[12px] font-medium text-neutral-500 ${isLongSub ? "animate-ping-pong" : ""}`} style={isLongSub ? { animationDuration: `${Math.max(4, subtitle.length * 0.15)}s` } : {}}>{subtitle}</span>
        </div>
      )}
    </div>
  );
};

const AsyncImageCard = ({ item, type, onClick }: any) => {
  const[imgUrl, setImgUrl] = useState<string | null>((item.image_link || item.image) ? getImageUrl(item.image_link || item.image) : null);
  const cardRef = useRef<HTMLDivElement>(null);
  const fetched = useRef(false);

  useEffect(() => {
    if (imgUrl) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !fetched.current) {
        fetched.current = true;
        fetchImage();
        observer.disconnect(); 
      }
    }, { rootMargin: "250px" });
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, imgUrl]);

  const fetchImage = async () => {
    try {
      let res, json;
      if (type === "artist" || type === "actor") {
        res = await fetch(`https://ayushm-psi.vercel.app/api/artists/${item.id}`); json = await res.json(); setImgUrl(getImageUrl(json.data?.image));
      } else if (type === "album") {
        res = await fetch(`https://ayushm-psi.vercel.app/api/albums?link=https://www.jiosaavn.com${item.action}`); json = await res.json(); setImgUrl(getImageUrl(json.data?.image));
      } else if (type === "playlist") {
        res = await fetch(`https://ayushm-psi.vercel.app/api/playlists?link=https://www.jiosaavn.com${item.action}`); json = await res.json(); setImgUrl(getImageUrl(json.data?.image));
      }
    } catch (e) { setImgUrl("https://via.placeholder.com/500x500?text=Music"); }
  };

  const isCircular = type === "artist" || type === "actor";
  const title = decodeEntities(item.title || item.name);
  const isLongTitle = title.length > 15;

  return (
    <div ref={cardRef} onClick={() => onClick(item)} className="w-[140px] flex-shrink-0 snap-start cursor-pointer group pb-1 content-visibility-auto">
      <div className={`relative overflow-hidden bg-[#111] border border-[#222] mb-2 flex items-center justify-center transition-transform duration-200 active:scale-95 shadow-md ${isCircular ? "rounded-full aspect-square" : "rounded-xl aspect-[1/1]"}`}>
        {imgUrl ? <img src={imgUrl} alt={title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" /> : <div className="w-full h-full bg-[#222] animate-pulse" />}
      </div>
      <div className="w-full overflow-hidden whitespace-nowrap text-center">
        <span className={`inline-block text-[14px] font-extrabold text-white tracking-wide ${isLongTitle ? "animate-ping-pong" : ""}`} style={isLongTitle ? { animationDuration: `${Math.max(4, title.length * 0.15)}s` } : {}}>{title}</span>
      </div>
    </div>
  );
};

const Carousel = ({ title, items, isCircular = false, hideSubtitle = false, onItemClick }: any) => {
  if (!items || items.length === 0) return null;
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => sessionStorage.setItem(`scrollX_${title}`, (e.target as HTMLDivElement).scrollLeft.toString());
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => { const el = document.getElementById(`carousel_${title}`); if (el && sessionStorage.getItem(`scrollX_${title}`)) el.scrollLeft = parseInt(sessionStorage.getItem(`scrollX_${title}`)!); },[title]);

  return (
    <div className="mb-8 content-visibility-auto">
      <h2 className="text-[20px] font-bold mb-3 px-4 tracking-tight text-white">{title}</h2>
      <div id={`carousel_${title}`} onScroll={handleScroll} className="flex gap-4 overflow-x-auto hide-scrollbar px-4 snap-x pb-2 pt-1">
        {items.map((item: any, i: number) => <PremiumCard key={item.id || i} item={item} isCircular={isCircular} hideSubtitle={hideSubtitle} onClick={onItemClick} />)}
      </div>
    </div>
  );
};

const TwoLineCarousel = ({ title, items, isCircular = false, hideSubtitle = false, onItemClick }: any) => {
  if (!items || items.length === 0) return null;
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => sessionStorage.setItem(`scrollX_${title}`, (e.target as HTMLDivElement).scrollLeft.toString());
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => { const el = document.getElementById(`carousel_${title}`); if (el && sessionStorage.getItem(`scrollX_${title}`)) el.scrollLeft = parseInt(sessionStorage.getItem(`scrollX_${title}`)!); }, [title]);

  return (
    <div className="mb-8 content-visibility-auto">
      <h2 className="text-[20px] font-bold mb-3 px-4 tracking-tight text-white">{title}</h2>
      <div id={`carousel_${title}`} onScroll={handleScroll} className="grid grid-rows-2 grid-flow-col auto-cols-max gap-x-4 gap-y-6 overflow-x-auto hide-scrollbar px-4 snap-x pb-2 pt-1">
        {items.map((item: any, i: number) => <PremiumCard key={item.id || i} item={item} isCircular={isCircular} hideSubtitle={hideSubtitle} onClick={onItemClick} />)}
      </div>
    </div>
  );
};

const AsyncCarousel = ({ title, items, type, onItemClick }: any) => {
  if (!items || items.length === 0) return null;
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => sessionStorage.setItem(`scrollX_${title}`, (e.target as HTMLDivElement).scrollLeft.toString());
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => { const el = document.getElementById(`carousel_${title}`); if (el && sessionStorage.getItem(`scrollX_${title}`)) el.scrollLeft = parseInt(sessionStorage.getItem(`scrollX_${title}`)!); }, [title]);

  return (
    <div className="mb-8 content-visibility-auto">
      <h2 className="text-[20px] font-bold mb-3 px-4 tracking-tight text-white">{title}</h2>
      <div id={`carousel_${title}`} onScroll={handleScroll} className="flex gap-4 overflow-x-auto hide-scrollbar px-4 snap-x pb-2 pt-1">
        {items.map((item: any, i: number) => <AsyncImageCard key={item.id || i} item={item} type={type} onClick={onItemClick} />)}
      </div>
    </div>
  );
};

export default function Home() {
  const { language, setCurrentSong, setIsPlaying, setPlayContext, setQueue } = useAppContext() as any;
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const[trending, setTrending] = useState<any[]>([]);
  const[newReleases, setNewReleases] = useState<any[]>([]);
  const [featuredPlaylists, setFeaturedPlaylists] = useState<any[]>([]);
  const[otherPromos, setOtherPromos] = useState<any[]>([]);
  const[topArtists, setTopArtists] = useState<any[]>([]);
  const [charts, setCharts] = useState<any[]>([]);

  const [recoArtists, setRecoArtists] = useState<any[]>([]);
  const[recoActors, setRecoActors] = useState<any[]>([]);
  const[recoAlbums, setRecoAlbums] = useState<any[]>([]);
  const[recoPlaylists, setRecoPlaylists] = useState<any[]>([]);

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      const cacheKey = `home_data_${language}`;
      
      try {
        const cachedData = await getCache(cacheKey);
        if (cachedData && (Date.now() - cachedData.timestamp < CACHE_DURATION)) {
          applyData(cachedData.data);
          setLoading(false);
          return; // Instant render
        }

        const res = await fetch(`https://ayushpr.vercel.app/home?ln=${language}`);
        const data = await res.json();
        await setCache(cacheKey, { timestamp: Date.now(), data });
        applyData(data);
      } catch (error) {}
      setLoading(false);
    };

    const applyData = (data: any) => {
      const filterJioPlaylists = (items: any[]) => items.filter(item => !(item.type === "playlist" && item.title?.toLowerCase().includes("jio")));
      const applySubtitleFallback = (items: any[]) => items.map(item => (!item.subtitle && item.type ? { ...item, subtitle: item.type.charAt(0).toUpperCase() + item.type.slice(1) } : item));

      setTrending(applySubtitleFallback(data.trending ||[]));
      setNewReleases(applySubtitleFallback(data.new_releases ||[]));
      setFeaturedPlaylists(filterJioPlaylists(data.featured_playlists ||[]));
      setCharts(filterJioPlaylists(data.top_charts ||[]));
      setRecoPlaylists(filterJioPlaylists(data.recommended_playlists ||[]));

      const cleanedPromos = (data.promo_modules ||[]).map((promo: any) => ({ ...promo, data: filterJioPlaylists(promo.data ||[]) })).filter((promo: any) => promo.data.length > 0);
      setOtherPromos(cleanedPromos);

      setTopArtists(data.top_artists ||[]);
      setRecoArtists(data.recommended_artists ||[]);
      setRecoActors(data.recommended_actors ||[]);
      setRecoAlbums(data.recommended_albums ||[]);
    };

    fetchAllData();
  }, [language]);

  // Restore scroll perfectly after data maps
  useEffect(() => {
    if (!loading) {
      const scrollY = sessionStorage.getItem("homeScrollY");
      if (scrollY) {
        requestAnimationFrame(() => window.scrollTo(0, parseInt(scrollY)));
      }
    }
  }, [loading]);

  const handleItemClick = (item: any) => {
    sessionStorage.setItem("homeScrollY", window.scrollY.toString());

    const type = item.type;
    let link = item.perma_url || item.url || (item.action ? `https://www.jiosaavn.com${item.action}` : "");
    const artistId = item.artistid || (type === "artist" ? item.id : null);

    let targetPath = link;
    if (link.startsWith("http")) { try { targetPath = new URL(link).pathname; } catch (e) { targetPath = link; } } 
    else if (link.startsWith("/")) { targetPath = link.split("?")[0]; }

    let extractedArtists = item.more_info?.singers || item.primaryArtists || item.singers;
    if (!extractedArtists && item.more_info?.artistMap?.primary_artists?.length) extractedArtists = item.more_info.artistMap.primary_artists.map((a: any) => a.name).join(", ");
    if (!extractedArtists && item.more_info?.artistMap?.artists?.length) extractedArtists = item.more_info.artistMap.artists.map((a: any) => a.name).join(", ");
    if (!extractedArtists && item.subtitle && item.subtitle.toLowerCase() !== "song") extractedArtists = item.subtitle;
    if (!extractedArtists) extractedArtists = "Unknown Artist";

    const normalizedSongItem = { ...item, artists: item.artists || extractedArtists, singers: item.singers || extractedArtists, primaryArtists: item.primaryArtists || extractedArtists };

    if (type === "song") {
      setPlayContext({ type: "Home", name: "Home Recommendations" });
      setQueue([normalizedSongItem]); setCurrentSong(normalizedSongItem); setIsPlaying(true);
    } else if (type === "album" || link.includes("/album/")) {
      router.push(targetPath);
    } else if (type === "playlist" || link.includes("/playlist/") || link.includes("/featured/")) {
      router.push(targetPath);
    } else if (artistId || link.includes("/artist/")) {
      router.push(`/artist?id=${artistId || item.id}`);
    } else {
      setPlayContext({ type: "Home", name: "Home Recommendations" });
      setQueue([normalizedSongItem]); setCurrentSong(normalizedSongItem); setIsPlaying(true);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-black text-white">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 animate-pulse opacity-40 px-4 w-full">
           {[...Array(8)].map((_, i) => <div key={i} className="w-full aspect-[1/1] bg-[#222] rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <main className="pt-10 pb-28 min-h-screen bg-black" style={{ touchAction: 'pan-y' }}>
      
      <style dangerouslySetInnerHTML={{__html:`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes ping-pong { 0%, 15% { transform: translateX(0); } 85%, 100% { transform: translateX(calc(-100% + 140px)); } }
        .animate-ping-pong { animation-name: ping-pong; animation-timing-function: ease-in-out; animation-iteration-count: infinite; animation-direction: alternate; }
        .content-visibility-auto { content-visibility: auto; contain-intrinsic-size: 250px; }
      `}} />

      {/* Header */}
      <div className="px-4 mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="https://raw.githubusercontent.com/Ayush8481Lab/musicayush/refs/heads/main/app/android-chrome-192x192.png" alt="Logo" className="w-8 h-8 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
          <h1 className="text-[26px] font-black tracking-tighter text-white">Music@8481</h1>
        </div>
      </div>

      {/* Google-Style Search Widget with Auto-focus/Auto-mic hooks */}
      <div onClick={() => { sessionStorage.setItem("homeScrollY", window.scrollY.toString()); router.push('/search?action=focus'); }} className="mx-4 mb-8 flex items-center bg-[#111] border border-[#222] rounded-full h-[52px] px-4 cursor-pointer hover:bg-[#1a1a1a] active:scale-[0.98] transition-all shadow-lg">
         <SearchIcon size={20} className="text-white/50" />
         <span className="text-white/50 ml-3 text-[15px] font-medium tracking-wide">Search songs, artists...</span>
         <button onClick={(e) => { e.stopPropagation(); sessionStorage.setItem("homeScrollY", window.scrollY.toString()); router.push('/search?action=mic'); }} className="ml-auto p-2 text-white/50 hover:text-white active:scale-90 transition-all rounded-full bg-[#1a1a1a] border border-[#333]">
           <Mic size={18} />
         </button>
      </div>

      <TwoLineCarousel title="Trending" items={trending} onItemClick={handleItemClick} />
      <Carousel title="New Releases" items={newReleases} onItemClick={handleItemClick} />
      <TwoLineCarousel title="Featured Playlists" items={featuredPlaylists} onItemClick={handleItemClick} />

      <AsyncCarousel title="Recommended Artists" items={recoArtists} type="artist" onItemClick={handleItemClick} />

      {otherPromos.map((promo, idx) => <Carousel key={idx} title={promo.title} items={promo.data} onItemClick={handleItemClick} />)}

      <AsyncCarousel title="Recommended Actors" items={recoActors} type="actor" onItemClick={handleItemClick} />
      <AsyncCarousel title="Recommended Albums" items={recoAlbums} type="album" onItemClick={handleItemClick} />
      <AsyncCarousel title="Recommended Playlists" items={recoPlaylists} type="playlist" onItemClick={handleItemClick} />

      <Carousel title="Top Charts" items={charts} hideSubtitle={true} onItemClick={handleItemClick} />
      <Carousel title="Top Artists" items={topArtists} isCircular={true} hideSubtitle={true} onItemClick={handleItemClick} />
    </main>
  );
}
