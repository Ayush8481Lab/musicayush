"use client";
import { useEffect, useState, useRef } from "react";
import { useAppContext } from "../context/AppContext";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

// Safe image extractor
const getImageUrl = (img: any) => {
  if (!img) return "https://via.placeholder.com/500x500?text=Music@8481";
  if (typeof img === "string") return img.replace("150x150", "500x500").replace("50x50", "500x500");
  if (Array.isArray(img)) return img[img.length - 1]?.url || img[0]?.url;
  return "https://via.placeholder.com/500x500?text=Music@8481";
};

const getSubtitle = (item: any, hideSubtitle: boolean) => {
  if (hideSubtitle) return ""; 
  if (item.type === "album") {
    const primary = item.more_info?.artistMap?.primary_artists;
    if (primary && primary.length > 0) return primary.map((a: any) => a.name).join(", ");
  }
  return item.subtitle || item.header_desc || item.description || "";
};

// Premium Centered Text with Marquee on Hover
const MarqueeText = ({ text, sub }: { text: string; sub?: boolean }) => {
  if (!text) return null;
  return (
    <div className="w-full overflow-hidden flex justify-center mt-1">
      <p className={`whitespace-nowrap text-center inline-block hover-marquee px-1 ${sub ? "text-xs text-neutral-400 mt-0.5" : "text-sm font-bold text-neutral-100 mt-2"}`}>
        {text}
      </p>
    </div>
  );
};

// Standard Carousel
const Carousel = ({ title, items, isCircular = false, hideSubtitle = false, onItemClick }: any) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-extrabold mb-4 px-4 tracking-tight text-white">{title}</h2>
      <div className="flex gap-4 overflow-x-auto hide-scrollbar px-4 snap-x pb-4">
        {items.map((item: any, index: number) => (
          <div 
            key={item.id || index} 
            onClick={() => onItemClick(item)} 
            className="animate-slide-down flex-shrink-0 snap-start w-36 cursor-pointer group active:scale-95 transition-all duration-300"
            style={{ animationDelay: `${index * 0.05}s` }} // Staggered Top-to-Bottom animation!
          >
            <div className={`overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.5)] bg-neutral-800 ${isCircular ? "rounded-full aspect-square" : "rounded-2xl aspect-square"}`}>
              <img 
                src={getImageUrl(item.image)} 
                alt={item.title || item.name} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
            </div>
            <MarqueeText text={item.title || item.name} />
            <MarqueeText text={getSubtitle(item, hideSubtitle)} sub={true} />
          </div>
        ))}
      </div>
    </div>
  );
};

// Lazy-Loading API Image Card for Footer Items
const AsyncImageCard = ({ item, type, onItemClick, index }: any) => {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !imgUrl) {
        fetchImage();
        observer.disconnect();
      }
    });
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
      setImgUrl("https://via.placeholder.com/500x500?text=Music@8481");
    }
  };

  const isCircular = type === "artist" || type === "actor";

  return (
    <div 
      ref={cardRef} 
      onClick={() => onItemClick(item)} 
      className="animate-slide-down flex-shrink-0 snap-start w-36 cursor-pointer group active:scale-95 transition-all duration-300"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className={`overflow-hidden shadow-lg bg-neutral-900 flex items-center justify-center ${isCircular ? "rounded-full aspect-square" : "rounded-2xl aspect-square"}`}>
        {imgUrl ? (
          <img src={imgUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        ) : (
          <Loader2 className="animate-spin text-neutral-500" size={24} />
        )}
      </div>
      <MarqueeText text={item.title || item.name} />
      <MarqueeText text={type.charAt(0).toUpperCase() + type.slice(1)} sub={true} />
    </div>
  );
};

// Carousel specifically for Async Items
const AsyncCarousel = ({ title, items, type, onItemClick }: any) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-extrabold mb-4 px-4 tracking-tight text-white">{title}</h2>
      <div className="flex gap-4 overflow-x-auto hide-scrollbar px-4 snap-x pb-4">
        {items.map((item: any, i: number) => (
          <AsyncImageCard key={item.id || i} item={item} type={type} onItemClick={onItemClick} index={i} />
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
  const[featuredPlaylists, setFeaturedPlaylists] = useState<any[]>([]);
  const[otherPromos, setOtherPromos] = useState<any[]>([]);
  const [topArtists, setTopArtists] = useState<any[]>([]);
  const [charts, setCharts] = useState<any[]>([]);

  const[recoArtists, setRecoArtists] = useState<any[]>([]);
  const [recoActors, setRecoActors] = useState<any[]>([]);
  const [recoAlbums, setRecoAlbums] = useState<any[]>([]);
  const[recoPlaylists, setRecoPlaylists] = useState<any[]>([]);

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      // WIPE STATE COMPLETELY to prevent language mixing
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

        // 1. Trending (Only from getTrending API)
        const trendData = Array.isArray(trendingJson) ? trendingJson : trendingJson.data ||[];
        setTrending(trendData);

        // 2. New Releases (STRICTLY from getAlbums API as requested)
        const albumsData = Array.isArray(albumsJson) ? albumsJson : albumsJson.data ||[];
        setNewReleases(albumsData);

        // 3. Featured Playlists
        setFeaturedPlaylists(Array.isArray(featuredJson) ? featuredJson : featuredJson.data ||[]);

        // 4. Modules (Charts, Promos) - EXCLUDING RADIOS
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
        
        // Footer Data
        setRecoArtists(footerJson.artist || []);
        setRecoActors(footerJson.actor ||[]);
        setRecoAlbums(footerJson.album || []);
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
    } else if (type === "album" || (item.action && item.action.includes("/album/"))) {
      router.push(`/album?link=${encodeURIComponent(link)}`);
    } else if (type === "playlist" || (item.action && item.action.includes("/playlist/")) || (item.action && item.action.includes("/featured/"))) {
      router.push(`/playlist?link=${encodeURIComponent(link)}`);
    } else if (artistId || (item.action && item.action.includes("/artist/"))) {
      router.push(`/artist?id=${artistId || item.id}`);
    } else {
      setCurrentSong(item);
      setIsPlaying(true);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-black text-white">
        <Loader2 className="animate-spin mb-4" size={40} />
        <p className="text-neutral-400 font-medium">Tuning into Music@8481...</p>
      </div>
    );
  }

  return (
    <main className="pt-12 pb-28 bg-black min-h-screen">
      {/* Title - Logo removed, styling improved */}
      <div className="px-4 mb-10 flex justify-center">
        <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-300 to-neutral-500">
          Music@8481
        </h1>
      </div>

      <Carousel title="Trending" items={trending} onItemClick={handleItemClick} />
      <Carousel title="New Releases" items={newReleases} onItemClick={handleItemClick} />
      <Carousel title="Featured Playlists" items={featuredPlaylists} onItemClick={handleItemClick} />
      
      {/* Recommended Artists - Moved here, loaded lazily from API */}
      <AsyncCarousel title="Recommended Artists" items={recoArtists} type="artist" onItemClick={handleItemClick} />

      {otherPromos.map((promo, idx) => (
        <Carousel key={idx} title={promo.title} items={promo.data} onItemClick={handleItemClick} />
      ))}

      {/* Bottom Sections as requested */}
      <AsyncCarousel title="Recommended Actors" items={recoActors} type="actor" onItemClick={handleItemClick} />
      <AsyncCarousel title="Recommended Albums" items={recoAlbums} type="album" onItemClick={handleItemClick} />
      <AsyncCarousel title="Recommended Playlists" items={recoPlaylists} type="playlist" onItemClick={handleItemClick} />
      
      <Carousel title="Top Charts" items={charts} hideSubtitle={true} onItemClick={handleItemClick} />
      <Carousel title="Top Artists" items={topArtists} isCircular={true} onItemClick={handleItemClick} />
      
    </main>
  );
  }
