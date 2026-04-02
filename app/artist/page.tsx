"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Play, ArrowLeft, Loader2, MoreVertical, BadgeCheck, Disc3, Music, Info, Pause } from "lucide-react";
import { useAppContext } from "../../context/AppContext";

// Helper to get the highest quality image
const getImageUrl = (img: any) => {
  if (!img) return "https://via.placeholder.com/500";
  if (typeof img === "string") return img.replace("150x150", "500x500");
  if (Array.isArray(img)) return img[img.length - 1]?.url || img[0]?.url;
  return "https://via.placeholder.com/500";
};

// Helper to decode HTML entities in song names
const decodeHtml = (html: string) => {
  if (!html) return "";
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
};

function ArtistContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id");
  
  const { currentSong, setCurrentSong, isPlaying, setIsPlaying } = useAppContext();
  
  const [artist, setArtist] = useState<any>(null);
  const [songs, setSongs] = useState<any[]>([]);
  const [albums, setAlbums] = useState<any[]>([]);
  const [singles, setSingles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllSongs, setShowAllSongs] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    const fetchArtistData = async () => {
      setLoading(true);
      try {
        // Use allSettled so if main API fails, we still get songs and albums
        const [mainRes, songsRes, albumsRes] = await Promise.allSettled([
          fetch(`https://ayushm-psi.vercel.app/api/artists/${id}`),
          fetch(`https://ayushm-psi.vercel.app/api/artists/${id}/songs?page=0`),
          fetch(`https://ayushm-psi.vercel.app/api/artists/${id}/albums?page=0`)
        ]);

        let mainData = null;
        let fetchedSongs = [];
        let fetchedAlbums = [];

        if (mainRes.status === "fulfilled" && mainRes.value.ok) {
          const json = await mainRes.value.json();
          mainData = json.data;
        }

        if (songsRes.status === "fulfilled" && songsRes.value.ok) {
          const json = await songsRes.value.json();
          fetchedSongs = json.data?.songs || [];
        }

        if (albumsRes.status === "fulfilled" && albumsRes.value.ok) {
          const json = await albumsRes.value.json();
          fetchedAlbums = json.data?.albums || [];
        }

        // FALLBACK LOGIC: If main API failed, build artist profile from the first song
        let finalArtist = mainData;
        if (!finalArtist && fetchedSongs.length > 0) {
          // Find this artist in the primary artists array of the first song
          const fallbackArtist = fetchedSongs[0].artists?.primary?.find((a: any) => a.id === id);
          finalArtist = {
            id: id,
            name: fallbackArtist?.name || "Unknown Artist",
            image: fallbackArtist?.image || fetchedSongs[0].image,
            isVerified: false,
            followerCount: null,
            bio: []
          };
        }

        setArtist(finalArtist);
        
        // Merge main API top songs with paginated songs, removing duplicates
        const mergedSongs = [...(mainData?.topSongs || []), ...fetchedSongs];
        const uniqueSongs = Array.from(new Map(mergedSongs.map(s => [s.id, s])).values());
        
        setSongs(uniqueSongs);
        setAlbums(fetchedAlbums.length > 0 ? fetchedAlbums : mainData?.topAlbums || []);
        setSingles(mainData?.singles || []);

      } catch (error) {
        console.error("Error fetching artist data:", error);
      }
      setLoading(false);
    };

    fetchArtistData();
  }, [id]);

  const handlePlaySong = (song: any) => {
    if (currentSong?.id === song.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentSong(song);
      setIsPlaying(true);
    }
  };

  const handlePlayAll = () => {
    if (songs.length > 0) {
      setCurrentSong(songs[0]);
      setIsPlaying(true);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white">
        <Loader2 className="animate-spin text-white" size={40} />
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-black text-white">
        <Disc3 size={64} className="text-neutral-600 mb-4" />
        <h2 className="text-xl font-bold">Artist not found</h2>
        <button onClick={() => router.back()} className="mt-4 px-6 py-2 bg-white text-black rounded-full font-bold">Go Back</button>
      </div>
    );
  }

  const displayedSongs = showAllSongs ? songs : songs.slice(0, 5);

  return (
    <div className="pb-32 min-h-screen bg-black text-white selection:bg-white/30">
      
      {/* ---------------- HERO SECTION ---------------- */}
      <div className="relative w-full h-[45vh] md:h-[50vh] bg-neutral-900 overflow-hidden flex flex-col justify-end">
        {/* Background Blur */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30 blur-2xl scale-110"
          style={{ backgroundImage: `url(${getImageUrl(artist.image)})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
        
        <button onClick={() => router.back()} className="absolute top-6 left-4 md:left-8 bg-black/40 hover:bg-black/60 p-2.5 rounded-full backdrop-blur-md z-20 transition-all">
          <ArrowLeft size={24} className="text-white" />
        </button>

        <div className="relative z-10 px-4 md:px-8 pb-8 flex flex-col md:flex-row items-center md:items-end gap-6">
          <img 
            src={getImageUrl(artist.image)} 
            alt={artist.name}
            className="w-36 h-36 md:w-56 md:h-56 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.8)] object-cover border-4 border-neutral-800" 
          />
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <h1 className="text-4xl md:text-6xl font-black text-white flex items-center gap-2 mb-2 tracking-tight">
              {artist.name} {artist.isVerified && <BadgeCheck className="text-blue-400 mt-1" size={32} fill="currentColor" />}
            </h1>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-neutral-300 font-medium">
              {artist.followerCount && (
                <span className="bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
                  {artist.followerCount.toLocaleString()} Monthly Listeners
                </span>
              )}
              {artist.dominantLanguage && (
                <span className="capitalize text-neutral-400">{artist.dominantLanguage}</span>
              )}
            </div>

            {/* Play Button Desktop */}
            <div className="hidden md:flex mt-6 gap-4">
              <button 
                onClick={handlePlayAll} 
                className="bg-green-500 hover:bg-green-400 text-black px-8 py-3 rounded-full font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
              >
                <Play fill="black" size={20} /> Play
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Play Button Mobile */}
      <div className="md:hidden flex justify-center -mt-8 relative z-20 mb-8">
        <button 
          onClick={handlePlayAll} 
          className="bg-green-500 text-black p-4 rounded-full active:scale-95 transition-transform shadow-[0_0_20px_rgba(34,197,94,0.4)]"
        >
          <Play fill="black" size={28} className="ml-1" />
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8">
        
        {/* ---------------- BIO SECTION ---------------- */}
        {artist.bio && artist.bio.length > 0 && (
          <div className="mb-10 text-neutral-400 text-sm md:text-base leading-relaxed bg-white/5 p-4 rounded-2xl border border-white/10 flex gap-3">
            <Info className="flex-shrink-0 mt-0.5 text-neutral-500" size={20} />
            <p className="line-clamp-3 md:line-clamp-none">{decodeHtml(artist.bio[0].text)}</p>
          </div>
        )}

        {/* ---------------- TOP SONGS ---------------- */}
        {songs.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">Popular Songs</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-2">
              {displayedSongs.map((song: any, index: number) => {
                const isCurrent = currentSong?.id === song.id;
                return (
                  <div 
                    key={song.id + index} 
                    onClick={() => handlePlaySong(song)} 
                    className="group flex items-center gap-4 p-2.5 rounded-xl hover:bg-white/10 cursor-pointer transition-colors"
                  >
                    <div className="w-6 text-center">
                      {isCurrent && isPlaying ? (
                        <div className="flex items-end justify-center gap-0.5 h-4">
                          <span className="w-1 bg-green-500 h-2 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                          <span className="w-1 bg-green-500 h-4 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                          <span className="w-1 bg-green-500 h-3 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                      ) : (
                        <span className="text-neutral-500 text-sm font-medium group-hover:hidden">{index + 1}</span>
                      )}
                      <Play size={16} fill="white" className="hidden group-hover:block mx-auto text-white" />
                    </div>
                    
                    <img src={getImageUrl(song.image)} className="w-12 h-12 rounded-md object-cover shadow-md" alt={song.name} />
                    
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-base font-semibold truncate ${isCurrent ? "text-green-400" : "text-white"}`}>
                        {decodeHtml(song.name || song.title)}
                      </h3>
                      <p className="text-sm text-neutral-400 truncate mt-0.5">{song.album?.name || artist.name}</p>
                    </div>
                    
                    <button className="opacity-0 group-hover:opacity-100 p-2 text-neutral-400 hover:text-white transition-opacity hidden sm:block">
                      <MoreVertical size={20} />
                    </button>
                  </div>
                )
              })}
            </div>
            
            {songs.length > 5 && (
              <button 
                onClick={() => setShowAllSongs(!showAllSongs)}
                className="mt-4 text-sm font-bold text-neutral-400 hover:text-white transition-colors"
              >
                {showAllSongs ? "Show Less" : `See All Songs`}
              </button>
            )}
          </div>
        )}

        {/* ---------------- ALBUMS (Responsive Grid) ---------------- */}
        {albums.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">Albums</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
              {albums.map((album: any) => (
                <div 
                  key={album.id} 
                  onClick={() => router.push(`/album?link=${encodeURIComponent(album.url)}`)} 
                  className="group bg-neutral-900/50 p-3 rounded-2xl hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <div className="relative aspect-square mb-3 overflow-hidden rounded-xl shadow-lg">
                    <img src={getImageUrl(album.image)} alt={album.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute bottom-2 right-2 bg-green-500 p-3 rounded-full shadow-xl opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                      <Play fill="black" className="text-black" size={20} />
                    </div>
                  </div>
                  <h3 className="text-sm md:text-base font-bold text-white truncate">{decodeHtml(album.name)}</h3>
                  <p className="text-xs md:text-sm text-neutral-400 mt-1">{album.year || "Album"}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---------------- SINGLES (Responsive Grid) ---------------- */}
        {singles.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">Singles & EPs</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
              {singles.map((single: any) => (
                <div 
                  key={single.id} 
                  onClick={() => router.push(`/album?link=${encodeURIComponent(single.url)}`)} 
                  className="group bg-neutral-900/50 p-3 rounded-2xl hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <div className="relative aspect-square mb-3 overflow-hidden rounded-xl shadow-lg">
                    <img src={getImageUrl(single.image)} alt={single.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <h3 className="text-sm md:text-base font-bold text-white truncate">{decodeHtml(single.name)}</h3>
                  <p className="text-xs md:text-sm text-neutral-400 mt-1">{single.year || "Single"}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function ArtistPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-black text-white">
        <Loader2 className="animate-spin" size={40} />
      </div>
    }>
      <ArtistContent />
    </Suspense>
  );
}
