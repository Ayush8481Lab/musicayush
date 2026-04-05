"use client";
import { useEffect, useState, useRef } from "react";
import { useAppContext } from "../context/AppContext";
import { Music2 } from "lucide-react";
import { useRouter } from "next/navigation";

// Safe image extractor
const getImageUrl = (img: any) => {
  if (!img) return "https://via.placeholder.com/500x500?text=Music";
  if (typeof img === "string") return img.replace("150x150", "500x500").replace("50x50", "500x500");
  if (Array.isArray(img)) return img[img.length - 1]?.url || img[0]?.url;
  return "https://via.placeholder.com/500x500?text=Music";
};

// HTML Entity Decoder to fix &quot;, &#039;, etc.
const decodeEntities = (text: string) => {
  if (!text) return "";
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
};

// Bulletproof Subtitle Extractor
const getSubtitle = (item: any, hideSubtitle: boolean) => {
  if (hideSubtitle) return "";
  let sub = "";

  // If it's an album, strictly extract the Artist Name
  if (item.type === "album") {
    const primary = item.more_info?.artistMap?.primary_artists;
    const all = item.more_info?.artistMap?.artists;
    if (primary && primary.length > 0) {
      sub = primary.map((a: any) => a.name).join(", ");
    } else if (all && all.length > 0) {
      sub = all.map((a: any) => a.name).join(", ");
    }
  }

  // Fallbacks if not an album or if album artist missing
  if (!sub) sub = item.subtitle || item.header_desc || item.description || "";
  if (!sub && item.more_info) {
    if (item.more_info.singers) sub = item.more_info.singers;
  }
  if (!sub && item.primaryArtists) sub = item.primaryArtists;
  if (!sub && item.singers) sub = item.singers;

  return sub || (item.type && item.type !== "album" ? item.type.charAt(0).toUpperCase() + item.type.slice(1) : "");
};

// Remove duplicates based on ID
const mergeAndDedupe = (arr1: any[], arr2: any[]) => {
  const map = new Map();
  [...(arr1 || []), ...(arr2 ||[])].forEach(item => {
    if (item && item.id && !map.has(item.id)) map.set(item.id, item);
  });
  return Array.from(map.values());
};

// Premium Card Component with Smart Math-based Marquee
const PremiumCard = ({ item, isCircular, hideSubtitle, onClick }: any) => {
  const title = decodeEntities(item.title || item.name || "Unknown");
  const subtitle = decodeEntities(getSubtitle(item, hideSubtitle));

  const isLongTitle = title.length > 15;
  const isLongSub = subtitle.length > 18;

  const titleSpeed = `${Math.max(4, title.length * 0.25)}s`;
  const subSpeed = `${Math.max(4, subtitle.length * 0.25)}s`;

  return (
    <div
      onClick={() => onClick(item)}
      className="flex-shrink-0 snap-start w-36 cursor-pointer group"
    >
      <div className={`relative overflow-hidden bg-white/5 border border-white/5 mb-2 transition-transform duration-300 active:scale-95 shadow-md ${isCircular ? "rounded-full aspect-square" : "rounded-xl aspect-[1/1]"}`}>
        <img
          src={getImageUrl(item.image_link || item.image)}
          alt={title}
          loading="lazy"
          decoding="async"
          onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/500x500?text=Music"; }}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />
      </div>

      <div className="w-full overflow-hidden whitespace-nowrap text-center">
        <span
          className={`inline-block text-[14px] font-extrabold text-white tracking-wide ${isLongTitle ? "animate-ping-pong" : ""}`}
          style={isLongTitle ? { animationDuration: titleSpeed } : {}}
        >
          {title}
        </span>
      </div>

      {subtitle && (
        <div className="w-full overflow-hidden whitespace-nowrap text-center mt-0.5">
          <span
            className={`inline-block text-[12px] font-medium text-neutral-400 ${isLongSub ? "animate-ping-pong" : ""}`}
            style={isLongSub ? { animationDuration: subSpeed } : {}}
          >
            {subtitle}
          </span>
        </div>
      )}
    </div>
  );
};

// Async Image Card (Highly Optimized Observer - No Subtitles)
const AsyncImageCard = ({ item, type, onClick }: any) => {
  // Try to use image_link directly from the new API to avoid unneeded fetches
  const [imgUrl, setImgUrl] = useState<string | null>(
    (item.image_link || item.image) ? getImageUrl(item.image_link || item.image) : null
  );
  const cardRef = useRef<HTMLDivElement>(null);
  const fetched = useRef(false);

  useEffect(() => {
    // Skip intersection observer if we already have the image directly from API
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
  }, [item, imgUrl]);

  const fetchImage = async () => {
    try {
      let res, json;
      if (type === "artist" || type === "actor") {
        res = await fetch(`https://ayushm-psi.vercel.app/api/artists/${item.id}`);
        json = await res.json();
        setImgUrl(getImageUrl(json.data?.image));
      } else if (type === "album") {
        res = await fetch(`https://ayushm-psi.vercel.app/api/albums?link=https://www.jiosaavn.com${item.action}`);
        json = await res.json();
        setImgUrl(getImageUrl(json.data?.image));
      } else if (type === "playlist") {
        res = await fetch(`https://ayushm-psi.vercel.app/api/playlists?link=https://www.jiosaavn.com${item.action}`);
        json = await res.json();
        setImgUrl(getImageUrl(json.data?.image));
      }
    } catch (e) {
      setImgUrl("https://via.placeholder.com/500x500?text=Music");
    }
  };

  const isCircular = type === "artist" || type === "actor";
  const title = decodeEntities(item.title || item.name);
  
  const isLongTitle = title.length > 15;
  const titleSpeed = `${Math.max(4, title.length * 0.25)}s`;

  return (
    <div
      ref={cardRef}
      onClick={() => onClick(item)}
      className="flex-shrink-0 snap-start w-36 cursor-pointer group"
    >
      <div className={`relative overflow-hidden bg-white/5 border border-white/5 mb-2 flex items-center justify-center transition-transform duration-300 active:scale-95 shadow-md ${isCircular ? "rounded-full aspect-square" : "rounded-xl aspect-[1/1]"}`}>
        {imgUrl ? (
          <img 
            src={imgUrl} 
            alt={title} 
            loading="lazy" 
            decoding="async"
            onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/500x500?text=Music"; }}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" 
          />
        ) : (
          <div className="w-full h-full bg-white/10 animate-pulse" />
        )}
      </div>
      
      <div className="w-full overflow-hidden whitespace-nowrap text-center">
        <span
          className={`inline-block text-[14px] font-extrabold text-white tracking-wide ${isLongTitle ? "animate-ping-pong" : ""}`}
          style={isLongTitle ? { animationDuration: titleSpeed } : {}}
        >
          {title}
        </span>
      </div>
    </div>
  );
};

// Reusable Carousel Wrappers with reduced bottom margin
const Carousel = ({ title, items, isCircular = false, hideSubtitle = false, onItemClick }: any) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="mb-6 contain-content">
      <h2 className="text-[20px] font-bold mb-3 px-4 tracking-tight text-white">{title}</h2>
      <div className="flex gap-4 overflow-x-auto hide-scrollbar px-4 snap-x pb-2">
        {items.map((item: any, i: number) => (
          <PremiumCard key={item.id || i} item={item} isCircular={isCircular} hideSubtitle={hideSubtitle} onClick={onItemClick} />
        ))}
      </div>
    </div>
  );
};

const AsyncCarousel = ({ title, items, type, onItemClick }: any) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="mb-6 contain-content">
      <h2 className="text-[20px] font-bold mb-3 px-4 tracking-tight text-white">{title}</h2>
      <div className="flex gap-4 overflow-x-auto hide-scrollbar px-4 snap-x pb-2">
        {items.map((item: any, i: number) => (
          <AsyncImageCard key={item.id || i} item={item} type={type} onClick={onItemClick} />
        ))}
      </div>
    </div>
  );
};

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
        const res = await fetch(`https://ayushpr.vercel.app/home?ln=${language}`);
        const data = await res.json();

        setTrending(data.trending || []);
        setNewReleases(data.new_releases || []);
        setFeaturedPlaylists(data.featured_playlists || []);
        setOtherPromos(data.promo_modules || []);
        setTopArtists(data.top_artists || []);
        setCharts(data.top_charts || []);
        setRecoArtists(data.recommended_artists || []);
        setRecoActors(data.recommended_actors || []);
        setRecoAlbums(data.recommended_albums || []);
        setRecoPlaylists(data.recommended_playlists || []);

      } catch (error) {
        console.error("Fetch error:", error);
      }
      setLoading(false);
    };

    fetchAllData();
  }, [language]);

  const handleItemClick = (item: any) => {
    const type = item.type;
    let link = item.perma_url || item.url || (item.action ? `https://www.jiosaavn.com${item.action}` : "");
    const artistId = item.artistid || (type === "artist" ? item.id : null);

    // Dynamic clean-up for new routing logic
    let targetPath = link;
    if (link.startsWith("http")) {
      try {
        targetPath = new URL(link).pathname; // Gets /album/... or /featured/... directly
      } catch (e) {
        targetPath = link;
      }
    } else if (link.startsWith("/")) {
      targetPath = link.split("?")[0]; // removes any trailing queries
    }

    if (type === "song") {
      setCurrentSong(item);
      setIsPlaying(true);
    } else if (type === "album" || link.includes("/album/")) {
      router.push(targetPath);
    } else if (type === "playlist" || link.includes("/playlist/") || link.includes("/featured/")) {
      router.push(targetPath);
    } else if (artistId || link.includes("/artist/")) {
      router.push(`/artist?id=${artistId || item.id}`);
    } else {
      setCurrentSong(item);
      setIsPlaying(true);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#121212] text-white">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 animate-pulse opacity-40">
           {[...Array(8)].map((_, i) => (
             <div key={i} className="w-36 h-36 bg-white/10 rounded-2xl"></div>
           ))}
        </div>
      </div>
    );
  }

  return (
    <main className="pt-12 pb-28 min-h-screen bg-gradient-to-b from-[#121212] to-[#000000]">
      <div className="px-4 mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-white p-1 rounded-full">
            <Music2 fill="black" size={18} className="text-black" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Music@8481
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
      <Carousel title="Top Artists" items={topArtists} isCircular={true} hideSubtitle={true} onItemClick={handleItemClick} />
    </main>
  );
}
