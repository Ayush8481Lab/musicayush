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

// Strict Subtitle Extractor
const getSubtitle = (item: any, hideSubtitle: boolean) => {
  if (hideSubtitle) return null; 
  
  // If it's an album, strictly extract the Artist Name
  if (item.type === "album" || item.type === "album") {
    const primary = item.more_info?.artistMap?.primary_artists;
    if (primary && primary.length > 0) return primary.map((a: any) => a.name).join(", ");
    
    const all = item.more_info?.artistMap?.artists;
    if (all && all.length > 0) return all.map((a: any) => a.name).join(", ");
  }
  
  // Fallback for songs and other types
  const sub = item.subtitle || item.header_desc || item.description || item.primaryArtists || item.singers;
  return sub ? sub : null;
};

// Remove duplicates based on ID
const mergeAndDedupe = (arr1: any[], arr2: any[]) => {
  const map = new Map();
  [...(arr1 || []), ...(arr2 ||[])].forEach(item => {
    if (item && item.id && !map.has(item.id)) map.set(item.id, item);
  });
  return Array.from(map.values());
};

// Premium Standard Carousel
const Carousel = ({ title, items, isCircular = false, hideSubtitle = false, onItemClick }: any) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="mb-10">
      <h2 className="text-2xl font-black mb-4 px-4 tracking-tight text-white">{title}</h2>
      <div className="flex gap-4 overflow-x-auto hide-scrollbar px-4 snap-x pb-4">
        {items.map((item: any, i: number) => {
          const subtitle = getSubtitle(item, hideSubtitle);
          return (
            <div 
              key={item.id || i} 
              onClick={() => onItemClick(item)} 
              className="animate-slide-down flex-shrink-0 snap-start w-32 cursor-pointer active:scale-95 transition-transform"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <img 
                src={getImageUrl(item.image)} 
                alt={item.title || item.name} 
                className={`w-32 h-32 object-cover bg-neutral-800 shadow-lg mb-3 ${isCircular ? "rounded-full" : "rounded-xl"}`}
              />
              {/* Up to 2 lines of text allowed, exactly like Spotify */}
              <p className="text-sm font-bold text-neutral-100 text-center leading-snug line-clamp-2">
                {item.title || item.name}
              </p>
              {/* Only renders if subtitle exists */}
              {subtitle && (
                <p className="text-xs text-neutral-400 text-center mt-1 line-clamp-1">
                  {subtitle}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Lazy-Loading Image Card for Recommendations
const AsyncImageCard = ({ item, type, index, onClick }: any) => {
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
      setImgUrl("https://via.placeholder.com/500x500?text=Music");
    }
  };

  const isCircular = type === "artist" || type === "actor";

  return (
    <div 
      ref={cardRef} 
      onClick={() => onClick(item)} 
      className="animate-slide-down flex-shrink-0 snap-start w-32 cursor-pointer active:scale-95 transition-transform"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className={`w-32 h-32 overflow-hidden shadow-lg bg-neutral-900 border border-neutral-800/50 mb-3 flex items-center justify-center ${isCircular ? "rounded-full" : "rounded-xl"}`}>
        {imgUrl ? (
          <img src={imgUrl} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <Loader2 className="animate-spin text-neutral-600" size={24} />
        )}
      </div>
      <p className="text-sm font-bold text-neutral-100 text-center leading-snug line-clamp-2">
        {item.title || item.name}
      </p>
      <p className="text-xs text-neutral-400 text-center mt-1 line-clamp-1 capitalize">
        {type}
      </p>
    </div>
  );
};

const AsyncCarousel = ({ title, items, type, onItemClick }: any) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="mb-10">
      <h2 className="text-2xl font-black mb-4 px-4 tracking-tight text-white">{title}</h2>
      <div className="flex gap-4 overflow-x-auto hide-scrollbar px-4 snap-x pb-4">
        {items.map((item: any, i: number) => (
          <AsyncImageCard key={item.id || i} item={item} type={type} index={i} onClick={onItemClick} />
        ))}
      </div>
    </div>
  );
};

export default function Home() {
  const { language, setCurrentSong, setIsPlaying } = useAppContext();
  const[loading, setLoading] = useState(true);
  const router = useRouter();

  const [trending, setTrending] = useState<any[]>([]);
  const [newReleases, setNewReleases] = useState<any[]>([]);
  const [featuredPlaylists, setFeaturedPlaylists] = useState<any[]>([]);
  const[otherPromos, setOtherPromos] = useState<any[]>([]);
  const[topArtists, setTopArtists] = useState<any[]>([]);
  const [charts, setCharts] = useState<any[]>([]);

  const [recoArtists, setRecoArtists] = useState<any[]>([]);
  const [recoActors, setRecoActors] = useState<any[]>([]);
  const[recoAlbums, setRecoAlbums] = useState<any[]>([]);
  const[recoPlaylists, setRecoPlaylists] = useState<any[]>([]);

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      // Strictly wipe all states so old language data doesn't flash
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

        // 1. Trending
        const trendData = Array.isArray(trendingJson) ? trendingJson : trendingJson.data ||[];
        setTrending(mergeAndDedupe(launchJson.new_trending, trendData));

        // 2. New Releases (Strictly from getAlbums)
        const albumsData = Array.isArray(albumsJson) ? albumsJson : albumsJson.data ||[];
        setNewReleases(albumsData);

        // 3. Featured Playlists
        setFeaturedPlaylists(Array.isArray(featuredJson) ? featuredJson : featuredJson.data ||[]);

        // 4. Exclude Radios and Unwanted Modules
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
    <main className="pt-12 pb-28 bg-black min-h-screen">
      {/* Clean Premium Title */}
      <div className="px-4 mb-10 flex items-center justify-center gap-2">
        <div className="bg-white p-1.5 rounded-full">
          <Music2 fill="black" size={20} className="text-black" />
        </div>
        <h1 className="text-3xl font-black tracking-tighter text-white">
          Music@8481
        </h1>
      </div>

      <Carousel title="Trending" items={trending} onItemClick={handleItemClick} />
      <Carousel title="New Releases" items={newReleases} onItemClick={handleItemClick} />
      <Carousel title="Featured Playlists" items={featuredPlaylists} onItemClick={handleItemClick} />
      
      {/* Recommended Items Load Images Smoothly As You Scroll */}
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
