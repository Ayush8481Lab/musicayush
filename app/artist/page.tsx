"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Play, ArrowLeft, Loader2, MoreVertical, BadgeCheck, 
  Users, ChevronRight, Mic2, Disc3 
} from "lucide-react";
import { useAppContext } from "../../context/AppContext"; // Adjust path as needed

// --- Utility Functions ---
const getImageUrl = (img: any) => {
  if (!img) return "https://via.placeholder.com/500x500?text=No+Image";
  if (typeof img === "string") return img.replace("150x150", "500x500");
  if (Array.isArray(img)) return img[img.length - 1]?.url || img[0]?.url;
  return "https://via.placeholder.com/500x500?text=No+Image";
};

const formatDuration = (seconds: number) => {
  if (!seconds) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
};

const formatFollowers = (count: number) => {
  if (!count) return "";
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toLocaleString();
};

// --- Main Component ---
export default function ArtistPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id");

  const { setCurrentSong, setIsPlaying } = useAppContext();

  // --- State ---
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"main" | "songs" | "albums">("main");

  const [artist, setArtist] = useState<any>(null);
  
  const [songs, setSongs] = useState<any[]>([]);
  const [totalSongs, setTotalSongs] = useState(0);
  
  const [albums, setAlbums] = useState<any[]>([]);
  const [totalAlbums, setTotalAlbums] = useState(0);
  
  const [singles, setSingles] = useState<any[]>([]);

  // Infinite Scroll States
  const [songPage, setSongPage] = useState(0);
  const [hasMoreSongs, setHasMoreSongs] = useState(true);
  const [albumPage, setAlbumPage] = useState(0);
  const [hasMoreAlbums, setHasMoreAlbums] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const observerRef = useRef<HTMLDivElement | null>(null);

  // --- 1. Initial Data Fetching ---
  useEffect(() => {
    if (!id) return;

    const fetchAllData = async () => {
      setLoading(true);
      try {
        const [mainRes, songsRes, albumsRes] = await Promise.allSettled([
          fetch(`https://ayushm-psi.vercel.app/api/artists/${id}`).then((r) => r.json()),
          fetch(`https://ayushm-psi.vercel.app/api/artists/${id}/songs?page=0`).then((r) => r.json()),
          fetch(`https://ayushm-psi.vercel.app/api/artists/${id}/albums?page=0`).then((r) => r.json()),
        ]);

        let fetchedSongs: any[] = [];
        let fetchedAlbums: any[] = [];
        let fetchedSingles: any[] = [];
        let finalArtistData: any = {};

        // Parse Songs
        if (songsRes.status === "fulfilled" && songsRes.value.data?.songs) {
          fetchedSongs = songsRes.value.data.songs;
          setSongs(fetchedSongs);
          setTotalSongs(songsRes.value.data.total || fetchedSongs.length);
        }

        // Parse Albums & Sort by Year Descending
        if (albumsRes.status === "fulfilled" && albumsRes.value.data?.albums) {
          fetchedAlbums = albumsRes.value.data.albums;
          fetchedAlbums.sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0));
          setAlbums(fetchedAlbums);
          setTotalAlbums(albumsRes.value.data.total || fetchedAlbums.length);
        }

        // Parse Main API (Singles & Exact Artist Details)
        if (mainRes.status === "fulfilled" && mainRes.value.success) {
          const mainData = mainRes.value.data;
          finalArtistData = mainData;
          
          // Extract singles from main api
          if (mainData.topAlbums) {
            fetchedSingles = mainData.topAlbums.filter(
              (a: any) => a.type === "single" || a.songCount === 1
            );
            setSingles(fetchedSingles);
          }
        } else {
          // --- FALLBACK LOGIC ---
          // If Main API fails, find artist info from the first song
          const fallbackSource = fetchedSongs[0]?.artists?.primary?.find((a: any) => a.id === id) 
                              || fetchedSongs[0]?.artists?.all?.find((a: any) => a.id === id);
          
          if (fallbackSource) {
            finalArtistData = {
              id: fallbackSource.id,
              name: fallbackSource.name,
              image: fallbackSource.image,
              role: fallbackSource.role || "Artist",
              dominantLanguage: fetchedSongs[0]?.language || "Unknown",
              followerCount: 0, // Cannot get without main API
              bio: []
            };
          }
        }

        setArtist(finalArtistData);
      } catch (error) {
        console.error("Failed to load artist", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [id]);

  // --- 2. Infinite Scroll Logic (Fetches 3 pages concurrently) ---
  const fetchMoreItems = useCallback(async () => {
    if (isFetchingMore || !id) return;

    if (viewMode === "songs" && !hasMoreSongs) return;
    if (viewMode === "albums" && !hasMoreAlbums) return;

    setIsFetchingMore(true);

    try {
      const isSongView = viewMode === "songs";
      const currentPage = isSongView ? songPage : albumPage;
      const endpoint = isSongView ? "songs" : "albums";
      
      // Fetch next 3 pages simultaneously
      const promises = [1, 2, 3].map((offset) =>
        fetch(`https://ayushm-psi.vercel.app/api/artists/${id}/${endpoint}?page=${currentPage + offset}`).then((r) => r.json())
      );
      
      const results = await Promise.allSettled(promises);
      let newItems: any[] = [];

      results.forEach((res) => {
        if (res.status === "fulfilled" && res.value.data) {
          const items = isSongView ? res.value.data.songs : res.value.data.albums;
          if (items) newItems = [...newItems, ...items];
        }
      });

      if (newItems.length === 0) {
        if (isSongView) setHasMoreSongs(false);
        else setHasMoreAlbums(false);
      } else {
        if (isSongView) {
          setSongs((prev) => {
            const unique = newItems.filter((n) => !prev.some((p) => p.id === n.id));
            return [...prev, ...unique];
          });
          setSongPage((p) => p + 3);
        } else {
          // Sort new albums before appending
          newItems.sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0));
          setAlbums((prev) => {
            const unique = newItems.filter((n) => !prev.some((p) => p.id === n.id));
            return [...prev, ...unique];
          });
          setAlbumPage((p) => p + 3);
        }
      }
    } catch (error) {
      console.error("Infinite scroll error", error);
    } finally {
      setIsFetchingMore(false);
    }
  }, [id, viewMode, songPage, albumPage, hasMoreSongs, hasMoreAlbums, isFetchingMore]);

  // Observer Trigger
  useEffect(() => {
    if (viewMode === "main") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchMoreItems();
        }
      },
      { rootMargin: "300px" } // Trigger fetch slightly before reaching bottom
    );

    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [fetchMoreItems, viewMode]);

  // --- Loading State ---
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-950">
        <Loader2 className="animate-spin text-white" size={40} />
      </div>
    );
  }

  if (!artist || !artist.name) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-neutral-950 text-neutral-400">
        <p>Artist could not be loaded.</p>
        <button onClick={() => router.back()} className="mt-4 px-4 py-2 bg-white/10 rounded-full text-white">Go Back</button>
      </div>
    );
  }

  // --- Handlers ---
  const handlePlaySong = (song: any) => {
    setCurrentSong(song);
    setIsPlaying(true);
  };

  const handleNavigation = (link: string) => {
    router.push(`/album?link=${encodeURIComponent(link)}`);
  };

  // --- Sub-Components ---
  const SongRow = ({ song, index }: { song: any; index: number }) => (
    <div
      onClick={() => handlePlaySong(song)}
      className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/10 cursor-pointer group transition-colors"
    >
      <span className="text-neutral-500 text-sm font-medium w-6 text-center group-hover:text-white">
        {index + 1}
      </span>
      <img src={getImageUrl(song.image)} className="w-12 h-12 rounded-md object-cover bg-neutral-800" alt={song.name} />
      <div className="flex-1 overflow-hidden">
        <h3 className="text-sm md:text-base font-bold text-white truncate">
          {song.name || song.title}
        </h3>
        <p className="text-xs text-neutral-400 truncate mt-0.5">
          {song.artists?.primary?.map((a: any) => a.name).join(", ") || artist.name}
        </p>
      </div>
      <div className="hidden md:block text-sm text-neutral-500 w-16 text-right font-medium">
        {formatDuration(song.duration)}
      </div>
      <MoreVertical size={20} className="text-neutral-500 hover:text-white mr-2" />
    </div>
  );

  const HorizontalScroller = ({ items, type }: { items: any[]; type: string }) => (
    <div className="flex gap-4 md:gap-6 overflow-x-auto snap-x hide-scrollbar pb-6 pt-2">
      {items.map((item: any) => (
        <div
          key={item.id}
          onClick={() => handleNavigation(item.url)}
          className="snap-start flex flex-col min-w-[130px] md:min-w-[160px] max-w-[130px] md:max-w-[160px] cursor-pointer group"
        >
          <div className="relative overflow-hidden rounded-xl aspect-square shadow-lg mb-3 bg-neutral-800">
            <img
              src={getImageUrl(item.image)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              alt={item.name}
            />
          </div>
          <h3 className="text-sm font-bold text-white truncate">{item.name}</h3>
          <p className="text-xs text-neutral-400 mt-1 truncate font-medium">
            {item.year && `${item.year} • `} {type}
          </p>
        </div>
      ))}
    </div>
  );

  // --- Render "View All" Lists ---
  if (viewMode === "songs" || viewMode === "albums") {
    const isSongs = viewMode === "songs";
    const data = isSongs ? songs : albums;
    
    return (
      <div className="min-h-screen bg-neutral-950 pb-28 pt-4 px-4 md:px-8 max-w-7xl mx-auto animate-in fade-in">
        {/* Header */}
        <div className="sticky top-0 bg-neutral-950/90 backdrop-blur-xl z-40 -mx-4 px-4 py-4 mb-6 flex items-center gap-4 border-b border-white/5">
          <button
            onClick={() => { setViewMode("main"); window.scrollTo(0, 0); }}
            className="p-2 bg-white/10 rounded-full hover:bg-white/20 text-white transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <img src={getImageUrl(artist.image)} className="w-10 h-10 rounded-full object-cover" alt="" />
          <div>
            <h1 className="text-lg font-bold text-white">{isSongs ? "All Songs" : "All Albums"}</h1>
            <p className="text-xs text-neutral-400">{isSongs ? totalSongs : totalAlbums} Total</p>
          </div>
        </div>

        {/* List Content */}
        {isSongs ? (
          <div className="flex flex-col gap-1">
            {data.map((song, idx) => <SongRow key={`v-song-${song.id}-${idx}`} song={song} index={idx} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {data.map((album, idx) => (
              <div key={`v-alb-${album.id}-${idx}`} onClick={() => handleNavigation(album.url)} className="flex flex-col cursor-pointer group">
                <div className="overflow-hidden rounded-xl aspect-square mb-2 bg-neutral-800">
                  <img src={getImageUrl(album.image)} className="w-full h-full object-cover group-hover:scale-105 transition-all" alt="" />
                </div>
                <h3 className="text-sm font-bold text-white truncate">{album.name}</h3>
                <p className="text-xs text-neutral-400 mt-1">{album.year || "Album"}</p>
              </div>
            ))}
          </div>
        )}

        {/* Infinite Scroll Loader */}
        <div ref={observerRef} className="py-10 flex justify-center">
          {isFetchingMore ? (
             <Loader2 className="animate-spin text-white" size={32} />
          ) : (
             <span className="text-neutral-500 text-sm">End of list</span>
          )}
        </div>
      </div>
    );
  }

  // --- Render Main Page ---
  return (
    <div className="min-h-screen bg-neutral-950 w-full overflow-hidden pb-28">
      {/* Hero Section */}
      <div className="relative w-full h-[350px] md:h-[450px] flex flex-col justify-end bg-neutral-900">
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div
            className="absolute inset-[-10%] bg-cover bg-center blur-[60px] opacity-40 saturate-150"
            style={{ backgroundImage: `url(${getImageUrl(artist.image)})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/60 to-transparent" />
        </div>

        <div className="absolute top-0 left-0 p-4 md:p-6 z-30">
          <button onClick={() => router.back()} className="bg-black/40 p-2.5 rounded-full backdrop-blur-md text-white hover:bg-white/20 transition-all">
            <ArrowLeft size={24} />
          </button>
        </div>

        <div className="relative z-20 px-4 md:px-10 pb-8 max-w-7xl mx-auto w-full flex flex-col md:flex-row md:items-end gap-6">
          <img
            src={getImageUrl(artist.image)}
            className="w-40 h-40 md:w-56 md:h-56 rounded-full shadow-2xl object-cover border-4 border-neutral-950 bg-neutral-800"
            alt={artist.name}
          />
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-blue-400 font-bold text-xs uppercase tracking-wider">
              <BadgeCheck size={16} fill="currentColor" className="text-white" /> Verified Artist
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight drop-shadow-lg">
              {artist.name}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs md:text-sm text-neutral-300 font-medium mt-1">
              {artist.followerCount > 0 && (
                <span className="flex items-center gap-1.5">
                  <Users size={16} /> {formatFollowers(artist.followerCount)} Followers
                </span>
              )}
              {artist.dominantLanguage && (
                <span className="capitalize flex items-center gap-1"><Mic2 size={16} /> {artist.dominantLanguage}</span>
              )}
              {artist.role && (
                <span className="capitalize flex items-center gap-1"><Disc3 size={16} /> {artist.role}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-10 relative z-30 mt-6">
        {/* Play Button */}
        {songs.length > 0 && (
          <button
            onClick={() => handlePlaySong(songs[0])}
            className="bg-green-500 hover:bg-green-400 text-black p-4 md:p-5 rounded-full active:scale-95 transition-all shadow-lg mb-10"
          >
            <Play fill="black" size={24} className="ml-1" />
          </button>
        )}

        {/* Top Songs */}
        {songs.length > 0 && (
          <section className="mb-12">
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-2xl font-black text-white">Popular Songs</h2>
              <button
                onClick={() => setViewMode("songs")}
                className="text-sm font-bold text-neutral-400 hover:text-white flex items-center"
              >
                View All <ChevronRight size={18} />
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {songs.slice(0, 10).map((song, idx) => (
                <SongRow key={`top-${song.id}-${idx}`} song={song} index={idx} />
              ))}
            </div>
          </section>
        )}

        {/* Albums */}
        {albums.length > 0 && (
          <section className="mb-12">
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-2xl font-black text-white">Albums</h2>
              <button
                onClick={() => setViewMode("albums")}
                className="text-sm font-bold text-neutral-400 hover:text-white flex items-center"
              >
                View All <ChevronRight size={18} />
              </button>
            </div>
            <HorizontalScroller items={albums.slice(0, 10)} type="Album" />
          </section>
        )}

        {/* Singles */}
        {singles.length > 0 && (
          <section className="mb-12">
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-2xl font-black text-white">Singles & EPs</h2>
            </div>
            <HorizontalScroller items={singles} type="Single" />
          </section>
        )}

        {/* About */}
        {artist.bio && artist.bio.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-black text-white mb-6">About</h2>
            <div className="bg-white/5 rounded-2xl p-6 md:p-8 border border-white/10">
              <div className="space-y-4 text-neutral-300 text-sm md:text-base leading-relaxed">
                {artist.bio.map((para: any, idx: number) => (
                  <div key={idx}>
                    {para.title && <h3 className="text-white font-bold text-lg mb-1">{para.title}</h3>}
                    <p className="whitespace-pre-line">{para.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
