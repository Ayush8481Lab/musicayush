"use client";
import { useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext";
import { Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

// Safe image extractor
const getImageUrl = (img: any) => {
  if (!img) return "https://via.placeholder.com/500";
  if (typeof img === "string") return img.replace("150x150", "500x500").replace("50x50", "500x500");
  if (Array.isArray(img)) return img[img.length - 1]?.url || img[0]?.url;
  return "https://via.placeholder.com/500";
};

// Smart subtitle extractor
const getSubtitle = (item: any, hideSubtitle: boolean) => {
  if (hideSubtitle) return ""; // Hide for Top Charts
  
  if (item.type === "album") {
    const primary = item.more_info?.artistMap?.primary_artists;
    const all = item.more_info?.artistMap?.artists;
    if (primary && primary.length > 0) return primary.map((a: any) => a.name).join(", ");
    if (all && all.length > 0) return all.map((a: any) => a.name).join(", ");
  }

  return item.subtitle || item.header_desc || item.description || "";
};

// Merges two arrays and removes duplicates based on 'id'
const mergeAndDedupe = (arr1: any[], arr2: any[]) => {
  const map = new Map();
  [...(arr1 || []), ...(arr2 ||[])].forEach(item => {
    if (item && item.id && !map.has(item.id)) {
      map.set(item.id, item);
    }
  });
  return Array.from(map.values());
};

// Reusable Carousel
const Carousel = ({ title, items, isCircular = false, hideSubtitle = false, onItemClick }: any) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4 px-4 tracking-tight text-white flex items-center gap-2">
        {title}
      </h2>
      <div className="flex gap-4 overflow-x-auto hide-scrollbar px-4 snap-x pb-4">
        {items.map((item: any, i: number) => {
          const subtitle = getSubtitle(item, hideSubtitle);
          return (
            <div key={item.id || i} onClick={() => onItemClick(item)} className="flex-shrink-0 snap-start w-36 cursor-pointer group active:scale-95 transition-all duration-300">
              <div className={`overflow-hidden shadow-lg bg-neutral-800 ${isCircular ? "rounded-full aspect-square" : "rounded-2xl aspect-square"}`}>
                <img 
                  src={getImageUrl(item.image)} 
                  alt={item.title || item.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <p className="text-sm font-bold mt-3 truncate text-neutral-100">{item.title || item.name}</p>
              {subtitle && (
                <p className="text-xs text-neutral-400 truncate mt-0.5">{subtitle}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function Home() {
  const { language, setCurrentSong, setIsPlaying } = useAppContext();
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Storing organized data
  const[trending, setTrending] = useState<any[]>([]);
  const [newReleases, setNewReleases] = useState<any[]>([]);
  const [featuredPlaylists, setFeaturedPlaylists] = useState<any[]>([]);
  const [recoArtists, setRecoArtists] = useState<any>({ title: "", data:[] });
  const [otherPromos, setOtherPromos] = useState<any[]>([]);
  const[topArtists, setTopArtists] = useState<any[]>([]);
  const [charts, setCharts] = useState<any[]>([]);

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        // Fetching all endpoints in parallel to merge data
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
        const extraTrendingJson = await trendingRes.json();

        // 1. Merge Trending (Launch Trending + Extra Trending)
        const extraTrendingArr = Array.isArray(extraTrendingJson) ? extraTrendingJson : extraTrendingJson.data ||[];
        setTrending(mergeAndDedupe(launchJson.new_trending, extraTrendingArr));

        // 2. Merge New Releases (Launch Albums + Extra Albums)
        setNewReleases(mergeAndDedupe(launchJson.new_albums, albumsJson.data ||[]));

        // 3. Set Featured Playlists
        setFeaturedPlaylists(Array.isArray(featuredJson) ? featuredJson : featuredJson.data || []);

        // 4. Set Top Artists
        setTopArtists(artistsJson.top_artists ||[]);

        // 5. Set Charts
        setCharts(launchJson.charts ||[]);

        // 6. Process Modules (Remove Radio, Separate Reco Artists, Keep Rest)
        if (launchJson.modules) {
          const activeModules = Object.keys(launchJson.modules)
            .map((key) => ({ key, ...launchJson.modules[key] }))
            .sort((a, b) => a.position - b.position)
            // Filter out ANY radio stations completely
            .filter((m) => m.source !== "radio" && m.type !== "radio_station"); 

          // Find Recommended Artists
          const recoModule = activeModules.find((m) => m.source === "artist_recos");
          if (recoModule && launchJson[recoModule.key]) {
            setRecoArtists({ title: recoModule.title, data: launchJson[recoModule.key] });
          }

          // Other Promos (excluding things we already display)
          const excludeSources =["new_trending", "new_albums", "charts", "top_playlists", "artist_recos"];
          const promos = activeModules.filter((m) => !excludeSources.includes(m.source));
          
          const promosWithData = promos.map((promo) => ({
            title: promo.title,
            data: launchJson[promo.key] ||[]
          })).filter(p => p.data.length > 0);

          setOtherPromos(promosWithData);
        }
      } catch (error) {
        console.error("Error fetching home data:", error);
      }
      setLoading(false);
    };

    fetchAllData();
  }, [language]);

  // Dynamic Router
  const handleItemClick = (item: any) => {
    const type = item.type;
    const link = item.perma_url || item.url;
    const artistId = item.artistid || (type === "artist" ? item.id : null);

    if (type === "song") {
      setCurrentSong(item);
      setIsPlaying(true);
    } else if (type === "album") {
      router.push(`/album?link=${encodeURIComponent(link)}`);
    } else if (type === "playlist") {
      router.push(`/playlist?link=${encodeURIComponent(link)}`);
    } else if (artistId) {
      router.push(`/artist?id=${artistId}`);
    } else {
      setCurrentSong(item);
      setIsPlaying(true);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-black text-white">
        <Loader2 className="animate-spin mb-4 text-white" size={40} />
        <p className="text-neutral-400 font-medium tracking-wide">Tuning into Music@8481...</p>
      </div>
    );
  }

  return (
    <main className="pt-12 pb-28 bg-black min-h-screen">
      {/* Header */}
      <div className="px-4 mb-8 flex items-center justify-between">
        <h1 className="text-4xl font-black tracking-tighter text-white">Music@8481</h1>
        <Sparkles className="text-neutral-500" size={24} />
      </div>

      {/* 1. Trending (Merged & Massive) */}
      <Carousel title="Trending" items={trending} onItemClick={handleItemClick} />

      {/* 2. New Releases (Merged & Massive) */}
      <Carousel title="New Releases" items={newReleases} onItemClick={handleItemClick} />

      {/* 3. Featured Playlists (From requested API) */}
      <Carousel title="Featured Playlists" items={featuredPlaylists} onItemClick={handleItemClick} />

      {/* 4. Recommended Artists (Openable, Extracted from Modules) */}
      {recoArtists.data.length > 0 && (
        <Carousel title={recoArtists.title || "Recommended Artists"} items={recoArtists.data} isCircular={true} onItemClick={handleItemClick} />
      )}

      {/* 5. Top Charts (Subtitles Hidden) */}
      <Carousel title="Top Charts" items={charts} hideSubtitle={true} onItemClick={handleItemClick} />

      {/* 6. Other Promos (Dynamic from Modules) */}
      {otherPromos.map((promo, idx) => (
        <Carousel key={idx} title={promo.title} items={promo.data} onItemClick={handleItemClick} />
      ))}

      {/* 7. Top Artists (Always at the bottom) */}
      <Carousel title="Top Artists" items={topArtists} isCircular={true} onItemClick={handleItemClick} />
      
    </main>
  );
}
