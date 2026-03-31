"use client";
import { useEffect, useState, useRef } from "react";
import { useAppContext } from "../context/AppContext";
import { Loader2, Music2 } from "lucide-react";
import { useRouter } from "next/navigation";

// --- STRING DECODER FOR &quot;, &amp; etc. ---
const decodeHtml = (text: string) => {
  if (!text) return "";
  return String(text)
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
};

// Safe image extractor
const getImageUrl = (img: any) => {
  if (!img) return "https://via.placeholder.com/500x500?text=Music";
  if (typeof img === "string") return img.replace("150x150", "500x500").replace("50x50", "500x500");
  if (Array.isArray(img)) return img[img.length - 1]?.url || img[0]?.url;
  return "https://via.placeholder.com/500x500?text=Music";
};

// Subtitle Extractor (Strictly uses Artist Name for Albums)
const getSubtitle = (item: any, hideSubtitle: boolean) => {
  if (hideSubtitle) return "";
  let sub = "";
  
  // Prioritize artist name directly for Albums
  if (item.type === 'album' || item.type === 'song') {
    if (item.more_info?.artistMap?.primary_artists?.length > 0) {
      sub = item.more_info.artistMap.primary_artists.map((a: any) => a.name).join(", ");
    } else if (item.more_info?.singers) {
      sub = item.more_info.singers;
    }
  }
  
  if (!sub) sub = item.subtitle || item.header_desc || item.description || "";
  if (!sub && item.primaryArtists) sub = item.primaryArtists;
  if (!sub && item.singers) sub = item.singers;
  
  return decodeHtml(sub || (item.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1) : ""));
};

// Remove duplicates
const mergeAndDedupe = (arr1: any[], arr2: any[]) => {
  const map = new Map();[...(arr1 || []), ...(arr2 ||[])].forEach(item => {
    if (item && item.id && !map.has(item.id)) map.set(item.id, item);
  });
  return Array.from(map.values());
};

// --- LIGHTWEIGHT MARQUEE HOOK (Runs 1 Time, Zero Scroll Lag) ---
const MarqueeText = ({ text, className }: { text: string; className?: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = textRef.current;
    const container = containerRef.current;
    if (!el || !container) return;

    // Run measurement once per render
    const textWidth = el.scrollWidth;
    const boxWidth = container.offsetWidth;
    
    if (textWidth > boxWidth) {
      const dist = textWidth - boxWidth + 10; 
      const duration = Math.max(3.5, dist * 0.05 + 2);
      el.style.setProperty('--scroll-dist', `-${dist}px`);
      el.style.setProperty('--duration', `${duration}s`);
      el.classList.add('animate-pingpong');
      container.style.justifyContent = 'flex-start';
    } else {
      container.style.justifyContent = 'center';
    }
  }, [text]);

  return (
    <div ref={containerRef} className="marquee-container w-full flex justify-center">
      <span ref={textRef} className={`marquee-content ${className}`}>
        {text}
      </span>
    </div>
  );
};

// --- SUPER FAST PREMIUM CARD ---
const PremiumCard = ({ item, isCircular, hideSubtitle, index, onClick }: any) => {
  const title = decodeHtml(item.title || item.name || "Unknown");
  const subtitle = getSubtitle(item, hideSubtitle);

  return (
    <div 
      onClick={() => onClick(item)} 
      className="scroll-card animate-card flex-shrink-0 snap-start w-[125px] cursor-pointer group"
      style={{ animationDelay: `${Math.min(index * 0.04, 0.4)}s` }} 
    >
      <div className={`overflow-hidden shadow-lg bg-neutral-900 border border-neutral-800/50 mb-2 ${isCircular ? "rounded-full aspect-square" : "rounded-xl aspect-square"}`}>
        <img 
          src={getImageUrl(item.image)} 
          alt={title} 
          className="w-full h-full object-cover group-active:scale-95 transition-transform duration-200 ease-out"
          loading="lazy"
        />
      </div>
      <MarqueeText text={title} className="text-[13px] font-extrabold text-white tracking-wide" />
      {subtitle && <MarqueeText text={subtitle} className="text-[11px] font-medium text-neutral-400 mt-[2px]" />}
    </div>
  );
};

// --- REUSABLE CAROUSEL WRAPPER ---
const Carousel = ({ title, items, isCircular = false, hideSubtitle = false, onItemClick }: any) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="mb-7">
      <h2 className="text-xl font-bold mb-3 px-4 tracking-tight text-white">{title}</h2>
      <div className="flex gap-3 overflow-x-auto hide-scrollbar px-4 snap-x pb-2">
        {items.map((item: any, i: number) => (
          <PremiumCard key={item.id} item={item} isCircular={isCircular} hideSubtitle={hideSubtitle} index={i} onClick={onItemClick} />
        ))}
      </div>
    </div>
  );
};

// --- MAIN PAGE COMPONENT ---
export default function Home() {
  const { language, setCurrentSong, setIsPlaying } = useAppContext();
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [trending, setTrending] = useState<any[]>([]);
  const [newReleases, setNewReleases] = useState<any[]>([]);
  const[featuredPlaylists, setFeaturedPlaylists] = useState<any[]>([]);
  const[otherPromos, setOtherPromos] = useState<any[]>([]);
  const [topArtists, setTopArtists] = useState<any[]>([]);
  const [charts, setCharts] = useState<any[]>([]);

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      setTrending([]); setNewReleases([]); setFeaturedPlaylists([]); 
      setOtherPromos([]); setTopArtists([]); setCharts([]);

      try {
        const[launchRes, artistsRes, featuredRes, albumsRes, trendingRes] = await Promise.all([
          fetch(`/api/jiosaavn?__call=webapi.getLaunchData&api_version=4&_format=json&_marker=0&ctx=wap6dot0&languages=${language}`),
          fetch(`/api/jiosaavn?__call=social.getTopArtists&api_version=4&_format=json&_marker=0&ctx=wap6dot0&languages=${language}`),
          fetch(`/api/jiosaavn?__call=content.getFeaturedPlaylists&fetch_from_serialized_files=true&p=1&n=50&api_version=4&_format=json&_marker=0&ctx=wap6dot0&languages=${language}`),
          fetch(`/api/jiosaavn?__call=content.getAlbums&api_version=4&_format=json&_marker=0&n=50&p=1&ctx=wap6dot0&languages=${language}`),
          fetch(`/api/jiosaavn?__call=content.getTrending&api_version=4&_format=json&_marker=0&n=50&p=1&ctx=wap6dot0&languages=${language}`)
        ]);

        const launchJson = await launchRes.json();
        const artistsJson = await artistsRes.json();
        const featuredJson = await featuredRes.json();
        const albumsJson = await albumsRes.json();
        const trendingJson = await trendingRes.json();

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

          const exclude = ["new_trending", "new_albums", "charts", "top_playlists"];
          const promos = activeModules.filter((m) => !exclude.includes(m.source));
          setOtherPromos(promos.map((p) => ({ title: p.title, data: launchJson[p.key] ||[] })).filter(p => p.data.length > 0));
        }

        setTopArtists(artistsJson.top_artists ||[]);

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
        <Loader2 className="animate-spin mb-4 text-neutral-400" size={36} />
      </div>
    );
  }

  return (
    <main className="pt-6 pb-24 bg-black min-h-screen">
      <div className="px-4 mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-white p-1 rounded-full">
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

      {otherPromos.map((promo, idx) => (
        <Carousel key={idx} title={decodeHtml(promo.title)} items={promo.data} onItemClick={handleItemClick} />
      ))}

      <Carousel title="Top Charts" items={charts} hideSubtitle={true} onItemClick={handleItemClick} />
      <Carousel title="Top Artists" items={topArtists} isCircular={true} onItemClick={handleItemClick} />
    </main>
  );
}
