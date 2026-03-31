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

// Premium Card Component with Smart Math-based Marquee
const PremiumCard = ({ item, isCircular, hideSubtitle, onClick }: any) => {
  const title = decodeEntities(item.title || item.name || "Unknown");
  const subtitle = decodeEntities(getSubtitle(item, hideSubtitle));

  // MAGIC FIX: Only animate if text is actually long enough to need it (Saves massive GPU memory)
  const isLongTitle = title.length > 15;
  const isLongSub = subtitle.length > 18;

  // MAGIC FIX: Uniform speed calculated by character length (0.25s per character)
  const titleSpeed = `${Math.max(4, title.length * 0.25)}s`;
  const subSpeed = `${Math.max(4, subtitle.length * 0.25)}s`;

  return (
    <div
      onClick={() => onClick(item)}
      className="flex-shrink-0 snap-start w-32 cursor-pointer group"
    >
      <div className={`relative overflow-hidden bg-white/5 border border-white/10 mb-2 transition-transform duration-300 active:scale-95 ${isCircular ? "rounded-full aspect-square" : "rounded-2xl aspect-[1/1]"}`}>
        <img
          src={getImageUrl(item.image)}
          alt={title}
          loading="lazy"
          decoding="async"
          onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/500x500?text=Music"; }}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />
        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-300 pointer-events-none" />
      </div>

      <div className="w-full overflow-hidden whitespace-nowrap text-center">
        <span
          className={`inline-block text-[13px] font-extrabold text-white tracking-wide ${isLongTitle ? "animate-ping-pong" : ""}`}
          style={isLongTitle ? { animationDuration: titleSpeed } : {}}
        >
          {title}
        </span>
      </div>

      {subtitle && (
        <div className="w-full overflow-hidden whitespace-nowrap text-center mt-0.5">
          <span
            className={`inline-block text-[11px] font-medium text-pink-200/80 ${isLongSub ? "animate-ping-pong" : ""}`}
            style={isLongSub ? { animationDuration: subSpeed } : {}}
          >
            {subtitle}
          </span>
        </div>
      )}
    </div>
  );
};

// Async Image Card (Highly Optimized Observer)
const AsyncImageCard = ({ item, type, onClick }: any) => {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const fetched = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !fetched.current) {
        fetched.current = true;
        fetchImage();
        observer.disconnect(); // Instantly kill observer to stop scroll lag
      }
    }, { rootMargin: "250px" });

    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [item]);

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
      className="flex-shrink-0 snap-start w-32 cursor-pointer group"
    >
      <div className={`relative overflow-hidden bg-white/5 border border-white/10 mb-2 flex items-center justify-center transition-transform duration-300 active:scale-95 ${isCircular ? "rounded-full aspect-square" : "rounded-2xl aspect-[1/1]"}`}>
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
          className={`inline-block text-[13px] font-extrabold text-white tracking-wide ${isLongTitle ? "animate-ping-pong" : ""}`}
          style={isLongTitle ? { animationDuration: titleSpeed } : {}}
        >
          {title}
        </span>
      </div>
      
      <div className="w-full overflow-hidden whitespace-nowrap text-center mt-0.5">
        <span className="inline-block text-[11px] font-medium text-cyan-200/80 capitalize">
          {type}
        </span>
      </div>
    </div>
  );
};

// Reusable Carousel Wrappers with strictly contained layouts
const Carousel = ({ title, items, isCircular = false, hideSubtitle = false, onItemClick }: any) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="mb-10 contain-content">
      <h2 className="text-[22px] font-black mb-4 px-4 tracking-tight bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">{title}</h2>
      <div className="flex gap-4 overflow-x-auto hide-scrollbar px-4 snap-x pb-4">
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
    <div className="mb-10 contain-content">
      <h2 className="text-[22px] font-black mb-4 px-4 tracking-tight bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">{title}</h2>
      <div className="flex gap-4 overflow-x-auto hide-scrollbar px-4 snap-x pb-4">
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
  const[otherPromos, setOtherPromos] = useState<any[]>([]);
  const [topArtists, setTopArtists] = useState<any[]>([]);
  const [charts, setCharts] = useState<any[]>([]);

  const [recoArtists, setRecoArtists] = useState<any[]>([]);
  const[recoActors, setRecoActors] = useState<any[]>([]);
  const[recoAlbums, setRecoAlbums] = useState<any[]>([]);
  const [recoPlaylists, setRecoPlaylists] = useState<any[]>([]);

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      setTrending([]); setNewReleases([]); setFeaturedPlaylists([]);
      setOtherPromos([]); setTopArtists([]); setCharts([]);
      setRecoArtists([]); setRecoActors([]); setRecoAlbums([]); setRecoPlaylists([]);

      try {
        const[launchRes, artistsRes, featuredRes, albumsRes, trendingRes, footerRes] = await Promise.all([
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

        setTopArtists(artistsJson.top_artists ||[]);
        setRecoArtists(footerJson.artist || []);
        setRecoActors(footerJson.actor ||[]);
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
      <div className="flex h-screen flex-col items-center justify-center bg-[#07070C] text-white">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 animate-pulse opacity-40">
           {[...Array(8)].map((_, i) => (
             <div key={i} className="w-32 h-32 bg-white/10 rounded-2xl"></div>
           ))}
        </div>
      </div>
    );
  }

  return (
    <main className="pt-14 pb-28 min-h-screen bg-gradient-to-b from-[#0F0A1D] via-[#07070C] to-[#000000]">
      <div className="px-4 mb-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-pink-500 to-indigo-600 p-2 rounded-xl">
            <Music2 fill="white" size={22} className="text-white" />
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-white">
            Music<span className="bg-gradient-to-r from-pink-400 to-cyan-300 bg-clip-text text-transparent font-bold text-xl ml-1">@8481</span>
          </h1>
        </div>
      </div>

      <Carousel title="Trending 🔥" items={trending} onItemClick={handleItemClick} />
      <Carousel title="New Releases ⚡" items={newReleases} onItemClick={handleItemClick} />
      <Carousel title="Featured Playlists 🎧" items={featuredPlaylists} onItemClick={handleItemClick} />

      <AsyncCarousel title="Recommended Artists ✨" items={recoArtists} type="artist" onItemClick={handleItemClick} />

      {otherPromos.map((promo, idx) => (
        <Carousel key={idx} title={promo.title} items={promo.data} onItemClick={handleItemClick} />
      ))}

      <AsyncCarousel title="Recommended Actors 🎭" items={recoActors} type="actor" onItemClick={handleItemClick} />
      <AsyncCarousel title="Recommended Albums 💿" items={recoAlbums} type="album" onItemClick={handleItemClick} />
      <AsyncCarousel title="Recommended Playlists 📻" items={recoPlaylists} type="playlist" onItemClick={handleItemClick} />

      <Carousel title="Top Charts 📈" items={charts} hideSubtitle={true} onItemClick={handleItemClick} />
      <Carousel title="Top Artists 🌟" items={topArtists} isCircular={true} onItemClick={handleItemClick} />
    </main>
  );
}
