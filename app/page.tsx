"use client";
import { useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext";
import { Loader2, Sparkles, Mic2, User, Disc, ListMusic } from "lucide-react";
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
  if (hideSubtitle) return ""; 
  
  if (item.type === "album") {
    const primary = item.more_info?.artistMap?.primary_artists;
    const all = item.more_info?.artistMap?.artists;
    if (primary && primary.length > 0) return primary.map((a: any) => a.name).join(", ");
    if (all && all.length > 0) return all.map((a: any) => a.name).join(", ");
  }
  return item.subtitle || item.header_desc || item.description || "";
};

// Deduplication helper
const mergeAndDedupe = (arr1: any[], arr2: any[]) => {
  const map = new Map();
  [...(arr1 || []), ...(arr2 ||[])].forEach(item => {
    if (item && item.id && !map.has(item.id)) map.set(item.id, item);
  });
  return Array.from(map.values());
};

// Beautiful Image Carousel
const Carousel = ({ title, items, isCircular = false, hideSubtitle = false, onItemClick }: any) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-extrabold mb-4 px-4 tracking-tight text-white">{title}</h2>
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
              {subtitle && <p className="text-xs text-neutral-400 truncate mt-0.5">{subtitle}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Premium Gradient Card Carousel (For Footer APIs that lack images)
const GradientCarousel = ({ title, items, icon: Icon, onItemClick }: any) => {
  if (!items || items.length === 0) return null;
  const gradients =[
    "from-indigo-600 to-purple-800", "from-emerald-500 to-teal-800",
    "from-rose-500 to-red-800", "from-blue-500 to-cyan-800", "from-amber-500 to-orange-800"
  ];

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-extrabold mb-4 px-4 tracking-tight text-white">{title}</h2>
      <div className="flex gap-3 overflow-x-auto hide-scrollbar px-4 snap-x pb-4">
        {items.map((item: any, i: number) => {
          const grad = gradients[i % gradients.length];
          return (
            <div key={item.id || i} onClick={() => onItemClick(item)} className="flex-shrink-0 snap-start w-40 cursor-pointer active:scale-95 transition-transform">
              <div className={`h-24 rounded-2xl bg-gradient-to-br ${grad} p-4 flex flex-col justify-between shadow-lg relative overflow-hidden`}>
                <div className="absolute -right-4 -bottom-4 opacity-20"><Icon size={64} /></div>
                <Icon className="text-white/80" size={24} />
                <p className="text-sm font-bold text-white truncate relative z-10">{item.title}</p>
              </div>
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

  // Main Data States
  const [trending, setTrending] = useState<any[]>([]);
  const [newReleases, setNewReleases] = useState<any[]>([]);
  const[featuredPlaylists, setFeaturedPlaylists] = useState<any[]>([]);
  const [otherPromos, setOtherPromos] = useState<any[]>([]);
  const [topArtists, setTopArtists] = useState<any[]>([]);
  const [charts, setCharts] = useState<any[]>([]);

  // Footer Recommendation States
  const [recoArtists, setRecoArtists] = useState<any[]>([]);
  const[recoActors, setRecoActors] = useState<any[]>([]);
  const [recoAlbums, setRecoAlbums] = useState<any[]>([]);
  const [recoPlaylists, setRecoPlaylists] = useState<any[]>([]);

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        // Fetching exactly 6 APIs in parallel matching the selected language!
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
        const extraTrendingJson = await trendingRes.json();
        const footerJson = await footerRes.json();

        // 1. Merge Trending 
        const extraTrendingArr = Array.isArray(extraTrendingJson) ? extraTrendingJson : extraTrendingJson.data ||[];
        setTrending(mergeAndDedupe(launchJson.new_trending, extraTrendingArr));

        // 2. Merge New Releases 
        setNewReleases(mergeAndDedupe(launchJson.new_albums, albumsJson.data ||[]));

        // 3. Featured Playlists
        setFeaturedPlaylists(Array.isArray(featuredJson) ? featuredJson : featuredJson.data ||[]);

        // 4. Top Artists & Charts
        setTopArtists(artistsJson.top_artists ||[]);
        setCharts(launchJson.charts ||[]);

        // 5. Parse Promos (Strictly remove radio/artist_recos)
        if (launchJson.modules) {
          const activeModules = Object.keys(launchJson.modules)
            .map((key) => ({ key, ...launchJson.modules[key] }))
            .sort((a, b) => a.position - b.position)
            .filter((m) => m.source !== "radio" && m.type !== "radio_station" && m.source !== "artist_recos"); 

          const excludeSources = ["new_trending", "new_albums", "charts", "top_playlists"];
          const promos = activeModules.filter((m) => !excludeSources.includes(m.source));
          
          setOtherPromos(promos.map((promo) => ({
            title: promo.title,
            data: launchJson[promo.key] ||[]
          })).filter(p => p.data.length > 0));
        }

        // 6. Footer Details (Artists, Actors, Albums, Playlists)
        setRecoArtists(footerJson.artist ||[]);
        setRecoActors(footerJson.actor || []);
        setRecoAlbums(footerJson.album ||[]);
        setRecoPlaylists(footerJson.playlist ||[]);

      } catch (error) {
        console.error("Error fetching home data:", error);
      }
      setLoading(false);
    };

    fetchAllData();
  }, [language]);

  // Main Clicks
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

  // Footer Clicks (Text-based APIs)
  const handleFooterClick = (item: any) => {
    if (!item.action) return;
    if (item.action.includes('/artist/')) {
      router.push(`/artist?id=${item.id}`);
    } else if (item.action.includes('/album/')) {
      router.push(`/album?link=${encodeURIComponent(`https://www.jiosaavn.com${item.action}`)}`);
    } else if (item.action.includes('/featured/') || item.action.includes('/playlist/')) {
      router.push(`/playlist?link=${encodeURIComponent(`https://www.jiosaavn.com${item.action}`)}`);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-black text-white">
        <Loader2 className="animate-spin mb-4 text-white" size={40} />
        <p className="text-neutral-400 font-medium tracking-wide animate-pulse">Curating your music...</p>
      </div>
    );
  }

  return (
    <main className="pt-12 pb-28 bg-black min-h-screen">
      <div className="px-4 mb-8 flex items-center justify-between">
        <h1 className="text-4xl font-black tracking-tighter text-white">Music@8481</h1>
        <Sparkles className="text-neutral-500" size={24} />
      </div>

      <Carousel title="Trending" items={trending} onItemClick={handleItemClick} />
      <Carousel title="New Releases" items={newReleases} onItemClick={handleItemClick} />
      <Carousel title="Featured Playlists" items={featuredPlaylists} onItemClick={handleItemClick} />
      
      <Carousel title="Top Charts" items={charts} hideSubtitle={true} onItemClick={handleItemClick} />
      
      {otherPromos.map((promo, idx) => (
        <Carousel key={idx} title={promo.title} items={promo.data} onItemClick={handleItemClick} />
      ))}

      <Carousel title="Top Artists" items={topArtists} isCircular={true} onItemClick={handleItemClick} />

      {/* Recommended Details from Footer API (Premium Gradient View) */}
      <GradientCarousel title="Recommended Artists" items={recoArtists} icon={Mic2} onItemClick={handleFooterClick} />
      <GradientCarousel title="Recommended Actors" items={recoActors} icon={User} onItemClick={handleFooterClick} />
      <GradientCarousel title="Recommended Albums" items={recoAlbums} icon={Disc} onItemClick={handleFooterClick} />
      <GradientCarousel title="Recommended Playlists" items={recoPlaylists} icon={ListMusic} onItemClick={handleFooterClick} />

    </main>
  );
}
