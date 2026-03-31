"use client";
import { useEffect, useState, useRef } from "react";
import { useAppContext } from "../context/AppContext";
import { Loader2, Music2 } from "lucide-react";
import { useRouter } from "next/navigation";

// Safe image extractor
const getImageUrl = (img: any) => {
  if (!img) return "https://via.placeholder.com/500x500?text=Music";
  if (typeof img === "string") return img.replace("150x150", "500x500").replace("50x50", "500x500");
  if (Array.isArray(img)) return img[img.length - 1]?.url || img[0]?.url;
  return "https://via.placeholder.com/500x500?text=Music";
};

// Bulletproof Subtitle Extractor
const getSubtitle = (item: any, hideSubtitle: boolean) => {
  if (hideSubtitle) return "";
  let sub = item.subtitle || item.header_desc || item.description || "";
  
  if (!sub && item.more_info) {
    if (item.more_info.artistMap?.primary_artists?.length > 0) {
      sub = item.more_info.artistMap.primary_artists.map((a: any) => a.name).join(", ");
    } else if (item.more_info.singers) {
      sub = item.more_info.singers;
    }
  }
  if (!sub && item.primaryArtists) sub = item.primaryArtists;
  if (!sub && item.singers) sub = item.singers;
  
  return sub || (item.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1) : "");
};

// Remove duplicates based on ID
const mergeAndDedupe = (arr1: any[], arr2: any[]) => {
  const map = new Map();
  [...(arr1 || []), ...(arr2 ||[])].forEach(item => {
    if (item && item.id && !map.has(item.id)) map.set(item.id, item);
  });
  return Array.from(map.values());
};

// --- CUSTOM HOOK: SCROLL REVEAL ANIMATION ---
const useScrollReveal = (onIntersect?: () => void) => {
  const ref = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onIntersect);
  callbackRef.current = onIntersect;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        el.classList.add('is-visible');
        if (callbackRef.current) callbackRef.current();
      } else {
        // Remove class to animate again on re-entry during side scroll
        el.classList.remove('is-visible');
      }
    }, { threshold: 0.15 });
    
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  
  return ref;
};

// --- COMPONENT: EXACT HTML MARQUEE BEHAVIOR ---
const MarqueeText = ({ text, className }: { text: string; className?: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = textRef.current;
    const container = containerRef.current;
    if (!el || !container) return;

    const checkMarquee = () => {
      el.classList.remove('animate-pingpong');
      el.style.transform = 'translateX(0)';
      
      const textWidth = el.scrollWidth;
      const boxWidth = container.offsetWidth;
      
      if (textWidth > boxWidth) {
        const dist = textWidth - boxWidth + 20; 
        const duration = Math.max(5, dist * 0.05 + 3);
        el.style.setProperty('--container-width', `${boxWidth}px`);
        el.style.setProperty('--duration', `${duration}s`);
        el.classList.add('animate-pingpong');
        container.style.justifyContent = 'flex-start';
      } else {
        container.style.justifyContent = 'center';
      }
    };

    checkMarquee();
    window.addEventListener('resize', checkMarquee);
    return () => window.removeEventListener('resize', checkMarquee);
  }, [text]);

  return (
    <div ref={containerRef} className="marquee-container w-full justify-center">
      <span ref={textRef} className={`marquee-content ${className}`}>
        {text}
      </span>
    </div>
  );
};

// --- PREMIUM CARD COMPONENT ---
const PremiumCard = ({ item, isCircular, hideSubtitle, onClick }: any) => {
  const title = item.title || item.name || "Unknown";
  const subtitle = getSubtitle(item, hideSubtitle);
  const cardRef = useScrollReveal(); // Triggers the slide-up/scale animation

  return (
    <div 
      ref={cardRef}
      onClick={() => onClick(item)} 
      className="scroll-card flex-shrink-0 snap-start w-[130px] cursor-pointer group active:scale-95 transition-all duration-200"
    >
      <div className={`overflow-hidden shadow-lg bg-neutral-800 border border-neutral-800/50 mb-2 ${isCircular ? "rounded-full aspect-square" : "rounded-xl aspect-square"}`}>
        <img 
          src={getImageUrl(item.image)} 
          alt={title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          loading="lazy"
        />
      </div>
      <MarqueeText text={title} className="text-[13px] font-extrabold text-white tracking-wide" />
      {subtitle && <MarqueeText text={subtitle} className="text-[11px] font-medium text-neutral-400 mt-0.5" />}
    </div>
  );
};

// --- ASYNC IMAGE CARD ---
const AsyncImageCard = ({ item, type, onClick }: any) => {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  // Fetch only when scrolled into view
  const cardRef = useScrollReveal(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchImage();
    }
  });

  const fetchImage = async () => {
    try {
      let res, json;
      if (type === "artist" || type === "actor") {
        res = await fetch(`/api/artists/${item.id}`);
        json = await res.json();
        setImgUrl(getImageUrl(json.data?.image));
      } else if (type === "album") {
        res = await fetch(`/api/albums?link=https://www.jiosaavn.com${item.action}`);
        json = await res.json();
        setImgUrl(getImageUrl(json.data?.image));
      } else if (type === "playlist") {
        res = await fetch(`/api/playlists?link=https://www.jiosaavn.com${item.action}`);
        json = await res.json();
        setImgUrl(getImageUrl(json.data?.image));
      }
    } catch (e) {
      setImgUrl("https://via.placeholder.com/500x500?text=Music");
    }
  };

  const isCircular = type === "artist" || type === "actor";
  const title = item.title || item.name;

  return (
    <div 
      ref={cardRef} 
      onClick={() => onClick(item)} 
      className="scroll-card flex-shrink-0 snap-start w-[130px] cursor-pointer group active:scale-95 transition-all duration-200"
    >
      <div className={`overflow-hidden shadow-lg bg-neutral-900 border border-neutral-800/50 mb-2 flex items-center justify-center ${isCircular ? "rounded-full aspect-square" : "rounded-xl aspect-square"}`}>
        {imgUrl ? (
          <img src={imgUrl} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" />
        ) : (
          <Loader2 className="animate-spin text-neutral-600" size={24} />
        )}
      </div>
      <MarqueeText text={title} className="text-[13px] font-extrabold text-white tracking-wide" />
      <MarqueeText text={type} className="text-[11px] font-medium text-neutral-400 mt-0.5 capitalize" />
    </div>
  );
};

// --- REUSABLE CAROUSELS ---
const Carousel = ({ title, items, isCircular = false, hideSubtitle = false, onItemClick }: any) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold mb-3 px-4 tracking-tight text-white">{title}</h2>
      <div className="flex gap-3 overflow-x-auto hide-scrollbar px-4 snap-x pb-2">
        {items.map((item: any) => (
          <PremiumCard key={item.id} item={item} isCircular={isCircular} hideSubtitle={hideSubtitle} onClick={onItemClick} />
        ))}
      </div>
    </div>
  );
};

const AsyncCarousel = ({ title, items, type, onItemClick }: any) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold mb-3 px-4 tracking-tight text-white">{title}</h2>
      <div className="flex gap-3 overflow-x-auto hide-scrollbar px-4 snap-x pb-2">
        {items.map((item: any) => (
          <AsyncImageCard key={item.id} item={item} type={type} onClick={onItemClick} />
        ))}
      </div>
    </div>
  );
};

// --- MAIN PAGE ---
export default function Home() {
  const { language, setCurrentSong, setIsPlaying } = useAppContext();
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [trending, setTrending] = useState<any[]>([]);
  const [newReleases, setNewReleases] = useState<any[]>([]);
  const [featuredPlaylists, setFeaturedPlaylists] = useState<any[]>([]);
  const [otherPromos, setOtherPromos] = useState<any[]>([]);
  const [topArtists, setTopArtists] = useState<any[]>([]);
  const [charts, setCharts] = useState<any[]>([]);
  const [recoArtists, setRecoArtists] = useState<any[]>([]);
  const [recoActors, setRecoActors] = useState<any[]>([]);
  const [recoAlbums, setRecoAlbums] = useState<any[]>([]);
  const [recoPlaylists, setRecoPlaylists] = useState<any[]>([]);

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      setTrending([]); setNewReleases([]); setFeaturedPlaylists([]); 
      setOtherPromos([]); setTopArtists([]); setCharts([]);
      setRecoArtists([]); setRecoActors([]); setRecoAlbums([]); setRecoPlaylists([]);

      try {
        const [launchRes, artistsRes, featuredRes, albumsRes, trendingRes, footerRes] = await Promise.all([
          fetch(`/api/jiosaavn?__call=webapi.getLaunchData&api_version=4&_format=json&_marker=0&ctx=wap6dot0&languages=${language}`),
          fetch(`/api/jiosaavn?__call=social.getTopArtists&api_version=4&_format=json&_marker=0&ctx=wap6dot0&languages=${language}`),
          fetch(`/api/jiosaavn?__call=content.getFeaturedPlaylists&fetch_from_serialized_files=true&p=1&n=50&api_version=4&_format=json&_marker=0&ctx=wap6dot0&languages=${language}`),
          fetch(`/api/jiosaavn?__call=content.getAlbums&api_version=4&_format=json&_marker=0&n=50&p=1&ctx=wap6dot0&languages=${language}`),
          fetch(`/api/jiosaavn?__call=content.getTrending&api_version=4&_format=json&_marker=0&n=50&p=1&ctx=wap6dot0&languages=${language}`),
          fetch(`/api/jiosaavn?__call=webapi.getFooterDetails&language=${language}&api_version=4&_format=json&_marker=0`)
        ]);

        const launchJson = await launchRes.json();
        const artistsJson = await artistsRes.json();
        const featuredJson = await featuredRes.json();
        const albumsJson = await albumsRes.json();
        const trendingJson = await trendingRes.json();
        const footerJson = await footerRes.json();

        const trendData = Array.isArray(trendingJson) ? trendingJson : trendingJson.data ||[];
        setTrending(mergeAndDedupe(launchJson.new_trending, trendData));

        const albumsData = Array.isArray(albumsJson) ? albumsJson : albumsJson.data ||[];
        setNewReleases(albumsData);
        setFeaturedPlaylists(Array.isArray(featuredJson) ? featuredJson : featuredJson.data ||[]);

        if (launchJson.modules) {
          const activeModules = Object.keys(launchJson.modules)
            .map((key) => ({ key, ...launchJson.modules[key] }))
            .sort((a, b) => a.position - b.position)
            .filter((m) => m.source !== "radio" && m.type !== "radio_station" && m.source !== "artist_recos"); 

          setCharts(launchJson.charts || []);

          const exclude =["new_trending", "new_albums", "charts", "top_playlists"];
          const promos = activeModules.filter((m) => !exclude.includes(m.source));
          setOtherPromos(promos.map((p) => ({ title: p.title, data: launchJson[p.key] ||[] })).filter(p => p.data.length > 0));
        }

        setTopArtists(artistsJson.top_artists || []);
        setRecoArtists(footerJson.artist ||[]);
        setRecoActors(footerJson.actor || []);
        setRecoAlbums(footerJson.album ||[]);
        setRecoPlaylists(footerJson.playlist ||[]);

      } catch (error) {
        console.error("Fetch error:", error);
      }
      setLoading(false);
    };

    fetchAllData();
  }, [language]);

  const handleItemClick = (item: any) => {
    const type = item.type;
    const link = item.perma_url || item.url || (item.action ? `https://www.jiosaavn.com${item.action}` : "");
    const artistId = item.artistid || (type === "artist" ? item.id : null);

    if (type === "song") {
      setCurrentSong(item);
      setIsPlaying(true);
    } else if (type === "album" || link.includes("/album/")) {
      router.push(`/album?link=${encodeURIComponent(link)}`);
    } else if (type === "playlist" || link.includes("/playlist/") || link.includes("/featured/")) {
      router.push(`/playlist?link=${encodeURIComponent(link)}`);
    } else if (artistId || link.includes("/artist/")) {
      router.push(`/artist?id=${artistId || item.id}`);
    } else {
      setCurrentSong(item);
      setIsPlaying(true);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-black text-white">
        <Loader2 className="animate-spin mb-4 text-neutral-400" size={40} />
      </div>
    );
  }

  return (
    <main className="pt-6 pb-20 bg-black min-h-screen">
      {/* Tighter Header */}
      <div className="px-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-white p-1.5 rounded-full">
            <Music2 fill="black" size={18} className="text-black" />
          </div>
          <h1 className="text-2xl font-black tracking-tighter text-white">
            Music<span className="text-neutral-400 font-bold text-[18px]">@8481</span>
          </h1>
        </div>
      </div>

      <Carousel title="Trending" items={trending} onItemClick={handleItemClick} />
      <Carousel title="New Releases" items={newReleases} onItemClick={handleItemClick} />
      <Carousel title="Featured Playlists" items={featuredPlaylists} onItemClick={handleItemClick} />
      
      <AsyncCarousel title="Recommended Artists" items={recoArtists} type="artist" onItemClick={handleItemClick} />

      {otherPromos.map((promo, idx) => (
        <Carousel key={idx} title={promo.title} items={promo.data} onItemClick={handleItemClick} />
      ))}

      <AsyncCarousel title="Recommended Actors" items={recoActors} type="actor" onItemClick={handleItemClick} />
      <AsyncCarousel title="Recommended Albums" items={recoAlbums} type="album" onItemClick={handleItemClick} />
      <AsyncCarousel title="Recommended Playlists" items={recoPlaylists} type="playlist" onItemClick={handleItemClick} />
      
      <Carousel title="Top Charts" items={charts} hideSubtitle={true} onItemClick={handleItemClick} />
      <Carousel title="Top Artists" items={topArtists} isCircular={true} onItemClick={handleItemClick} />
      
    </main>
  );
}
