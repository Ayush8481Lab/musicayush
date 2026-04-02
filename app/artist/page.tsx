"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Play, ArrowLeft, MoreVertical, BadgeCheck, 
  Users, Heart, Facebook, Twitter, Globe, Info, Disc3, Clock
} from "lucide-react";
import { useAppContext } from "../../context/AppContext";

// --- TYPESCRIPT INTERFACES (Prevents deployment errors) ---
interface ImageObj { quality: string; url: string; }
interface Song { id: string; name?: string; title?: string; image: ImageObj[] | string; album?: { name: string; url: string }; duration?: number; artists?: any; [key: string]: unknown; }
interface Album { id: string; name: string; image: ImageObj[] | string; year?: string | number; url: string; artists?: any; [key: string]: unknown; }
interface Artist { id: string; name: string; image: ImageObj[] | string; dominantType?: string; isVerified?: boolean; followerCount?: number; fanCount?: number; dominantLanguage?: string; fb?: string; twitter?: string; wiki?: string; bio?: { text: string }[]; dob?: string; availableLanguages?: string[]; isFallback?: boolean; [key: string]: unknown; }

// --- HELPERS ---
const getImageUrl = (img: ImageObj[] | string | undefined, targetQuality: '50x50' | '150x150' | '500x500' = '500x500') => {
  if (!img) return "https://ui-avatars.com/api/?name=Artist&background=random";
  if (typeof img === "string") return img.replace(/50x50|150x150/g, targetQuality);
  if (Array.isArray(img) && img.length > 0) {
    const exactMatch = img.find((i) => i.quality === targetQuality);
    return exactMatch?.url || img[img.length - 1]?.url;
  }
  return "https://ui-avatars.com/api/?name=Artist&background=random";
};

const formatNumber = (num?: number | string) => {
  if (!num) return "0";
  return Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short", maximumFractionDigits: 1 }).format(Number(num));
};

const formatDuration = (seconds?: number) => {
  if (!seconds) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

// --- MAIN COMPONENT ---
function ArtistContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id");

  const { setCurrentSong, setIsPlaying } = useAppContext();
  
  const [artist, setArtist] = useState<Artist | null>(null);
  const [topSongs, setTopSongs] = useState<Song[]>([]);
  const [topAlbums, setTopAlbums] = useState<Album[]>([]);
  const[singles, setSingles] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFullBio, setShowFullBio] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchArtistData = async () => {
      setLoading(true);
      try {
        // Safe concurrent fetching (Prevents Promise.allSettled TS deployment errors)
        const[artistRes, songsRes, albumsRes] = await Promise.all([
          fetch(`https://ayushm-psi.vercel.app/api/artists/${id}`).then(r => r.json()).catch(() => null),
          fetch(`https://ayushm-psi.vercel.app/api/artists/${id}/songs?page=0`).then(r => r.json()).catch(() => null),
          fetch(`https://ayushm-psi.vercel.app/api/artists/${id}/albums?page=0`).then(r => r.json()).catch(() => null),
        ]);

        let fetchedSongs: Song[] = songsRes?.data?.songs ||[];
        let fetchedAlbums: Album[] = albumsRes?.data?.albums ||[];
        let fetchedArtist: Artist | null = artistRes?.data || null;
        let fetchedSingles: Album[] = artistRes?.data?.singles ||[];

        // INTELLIGENT FALLBACK: If Main API fails, build artist from songs/albums
        if (!fetchedArtist && (fetchedSongs.length > 0 || fetchedAlbums.length > 0)) {
          let fallbackData = null;
          for (const song of fetchedSongs) {
            const match = song.artists?.primary?.find((a: any) => a.id === id) || song.artists?.all?.find((a: any) => a.id === id);
            if (match) { fallbackData = match; break; }
          }
          if (!fallbackData) {
            for (const album of fetchedAlbums) {
              const match = album.artists?.primary?.find((a: any) => a.id === id) || album.artists?.all?.find((a: any) => a.id === id);
              if (match) { fallbackData = match; break; }
            }
          }
          if (fallbackData) {
            fetchedArtist = {
              id: fallbackData.id,
              name: fallbackData.name,
              image: fallbackData.image,
              dominantType: fallbackData.role || "Artist",
              isFallback: true,
            };
          }
        }

        setArtist(fetchedArtist);
        setTopSongs(fetchedSongs);
        setTopAlbums(fetchedAlbums);
        setSingles(fetchedSingles);
      } catch (error) {
        console.error("Failed to load artist:", error);
      }
      setLoading(false);
    };

    fetchArtistData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black w-full animate-pulse">
        <div className="w-full h-80 md:h-[450px] bg-neutral-900 rounded-b-3xl"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-20">
           <div className="w-40 h-40 rounded-full bg-neutral-800 border-4 border-black mb-6"></div>
           <div className="h-10 w-64 bg-neutral-800 rounded-lg mb-10"></div>
           <div className="space-y-4">
             {[...Array(5)].map((_, i) => <div key={i} className="h-16 w-full bg-neutral-900 rounded-xl"></div>)}
           </div>
        </div>
      </div>
    );
  }

  if (!artist) return <div className="flex h-screen items-center justify-center bg-black text-white font-medium text-lg">Artist not found or unavailable.</div>;

  const combinedBio = artist.bio ? artist.bio.map(b => b.text).join("\n\n") : "";

  return (
    <div className="pb-32 min-h-screen bg-black text-white overflow-x-hidden selection:bg-green-500 selection:text-black">
      {/* 1. HERO SECTION */}
      <div className="relative w-full md:h-[480px] h-96 bg-neutral-900 flex flex-col justify-end">
        {/* Cinematic Blurred Background */}
        <div className="absolute inset-0 bg-cover bg-center opacity-40 blur-3xl scale-125 saturate-150 transition-all duration-1000" style={{ backgroundImage: `url(${getImageUrl(artist.image, '500x500')})` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent hidden md:block" />

        <button onClick={() => router.back()} className="absolute top-6 left-6 bg-black/40 hover:bg-black/80 p-3 rounded-full backdrop-blur-md z-30 transition-all hover:scale-105">
          <ArrowLeft size={24} className="text-white" />
        </button>

        <div className="relative z-20 flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-10 px-6 lg:px-12 pb-10 w-full max-w-7xl mx-auto">
          <div className="relative group">
            <img 
              src={getImageUrl(artist.image, '500x500')} 
              alt={artist.name}
              className="w-44 h-44 md:w-64 md:h-64 rounded-full shadow-[0_0_40px_rgba(0,0,0,0.8)] object-cover border-4 border-neutral-800/50 transition-transform duration-500 group-hover:scale-105" 
            />
          </div>
          
          <div className="flex flex-col items-center md:items-start text-center md:text-left flex-1">
            <div className="flex items-center gap-3 mb-2">
              {artist.isVerified && <BadgeCheck className="text-blue-500 bg-white rounded-full" size={26} fill="currentColor" />}
              {artist.dominantType && (
                <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold tracking-widest uppercase text-neutral-200">
                  {artist.dominantType}
                </span>
              )}
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-neutral-400 tracking-tight drop-shadow-2xl pb-1">
              {artist.name}
            </h1>
            
            {/* Stats */}
            <div className="flex flex-wrap justify-center md:justify-start gap-5 mt-4 text-sm md:text-base text-neutral-300 font-semibold tracking-wide">
              {artist.followerCount ? (
                <span className="flex items-center gap-2"><Users size={18} className="text-neutral-400"/> {formatNumber(artist.followerCount)} Followers</span>
              ) : null}
              {artist.fanCount ? (
                <span className="flex items-center gap-2"><Heart size={18} className="text-neutral-400"/> {formatNumber(artist.fanCount)} Fans</span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        
        {/* Action Controls */}
        <div className="flex items-center gap-6 relative z-30 mb-12 px-2">
          <button 
            onClick={() => { if (topSongs.length) { setCurrentSong(topSongs[0]); setIsPlaying(true); } }} 
            className="flex items-center justify-center bg-green-500 hover:bg-green-400 text-black w-16 h-16 rounded-full active:scale-90 transition-all shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:shadow-[0_0_35px_rgba(34,197,94,0.6)]"
          >
            <Play fill="black" size={28} className="ml-1" />
          </button>
          <button className="px-6 py-2 border border-neutral-600 rounded-full font-bold text-sm tracking-wide hover:border-white transition-colors">
            FOLLOW
          </button>
          <div className="flex gap-4 ml-auto">
            {artist.fb && <a href={artist.fb} target="_blank" rel="noreferrer" className="text-neutral-400 hover:text-white transition-colors"><Facebook size={20}/></a>}
            {artist.twitter && <a href={artist.twitter} target="_blank" rel="noreferrer" className="text-neutral-400 hover:text-white transition-colors"><Twitter size={20}/></a>}
            {artist.wiki && <a href={artist.wiki} target="_blank" rel="noreferrer" className="text-neutral-400 hover:text-white transition-colors"><Globe size={20}/></a>}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
          
          {/* MAIN COLUMN (Songs & Albums) */}
          <div className="xl:col-span-2 flex flex-col gap-12">
            
            {/* Popular Songs List */}
            {topSongs.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-6 tracking-tight">Popular</h2>
                <div className="flex flex-col gap-1">
                  {topSongs.slice(0, 10).map((song, index) => (
                    <div 
                      key={song.id} 
                      onClick={() => { setCurrentSong(song); setIsPlaying(true); }} 
                      className="group flex items-center gap-4 p-2.5 rounded-xl hover:bg-white/5 cursor-pointer active:scale-[0.98] transition-all"
                    >
                      <span className="text-neutral-400 text-sm font-semibold w-6 text-center group-hover:hidden">{index + 1}</span>
                      <Play size={16} className="hidden group-hover:block text-white w-6 text-center" fill="currentColor" />
                      
                      <img src={getImageUrl(song.image, '150x150')} className="w-12 h-12 rounded object-cover shadow-sm" alt={song.title} />
                      
                      <div className="flex-1 min-w-0 pr-4">
                        <h3 className="text-base font-semibold text-white truncate group-hover:text-green-400 transition-colors">{song.name || song.title}</h3>
                        <p className="text-sm text-neutral-400 truncate mt-0.5">{song.album?.name || artist.name}</p>
                      </div>
                      
                      <div className="hidden sm:flex items-center text-neutral-400 text-sm font-medium mr-4">
                        {formatDuration(song.duration)}
                      </div>
                      <button className="opacity-0 group-hover:opacity-100 p-2 text-neutral-400 hover:text-white transition-opacity focus:opacity-100">
                        <MoreVertical size={20} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Albums Grid */}
            {topAlbums.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-6 tracking-tight">Albums</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                  {topAlbums.map((album) => (
                    <div 
                      key={album.id} 
                      onClick={() => router.push(`/album?link=${encodeURIComponent(album.url)}`)} 
                      className="group flex flex-col gap-3 cursor-pointer active:scale-95 transition-all"
                    >
                      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-neutral-800 shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
                        <img src={getImageUrl(album.image, '500x500')} alt={album.name} className="w-full h-full object-cover group-hover:scale-105 group-hover:brightness-75 transition-all duration-500" />
                        <div className="absolute inset-0 flex items-end justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                           <div className="bg-green-500 p-3 rounded-full shadow-xl hover:scale-105 hover:bg-green-400 transition-all">
                             <Play fill="black" size={20} className="text-black ml-0.5"/>
                           </div>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white truncate group-hover:underline">{album.name}</h3>
                        <p className="text-sm text-neutral-400 truncate mt-0.5">{album.year || "Album"} • {artist.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Singles Grid */}
            {singles.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-6 tracking-tight">Singles & EPs</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                  {singles.map((single) => (
                    <div 
                      key={single.id} 
                      onClick={() => router.push(`/album?link=${encodeURIComponent(single.url)}`)} 
                      className="group flex flex-col gap-3 cursor-pointer active:scale-95 transition-all"
                    >
                      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-neutral-800 shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
                        <img src={getImageUrl(single.image, '500x500')} alt={single.name} className="w-full h-full object-cover group-hover:scale-105 group-hover:brightness-75 transition-all duration-500" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white truncate group-hover:underline">{single.name}</h3>
                        <p className="text-sm text-neutral-400 truncate mt-0.5">{single.year || "Single"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* RIGHT COLUMN (About Section) */}
          <div className="xl:col-span-1">
            {combinedBio ? (
              <div className="bg-neutral-900/60 backdrop-blur-xl border border-neutral-800/50 rounded-2xl p-8 sticky top-24 shadow-2xl">
                <h2 className="text-xl font-bold mb-5 tracking-tight flex items-center gap-2">About</h2>
                <div className={`text-neutral-300 text-sm md:text-base font-medium leading-relaxed ${!showFullBio ? "line-clamp-[8]" : ""}`}>
                  {combinedBio.split('\n\n').map((paragraph: string, i: number) => (
                    <p key={i} className="mb-4">{paragraph}</p>
                  ))}
                </div>
                {combinedBio.length > 400 && (
                  <button 
                    onClick={() => setShowFullBio(!showFullBio)}
                    className="mt-2 text-white font-bold text-sm tracking-wide hover:text-green-400 transition-colors uppercase"
                  >
                    {showFullBio ? "Show Less" : "Read More"}
                  </button>
                )}

                <div className="mt-8 pt-6 border-t border-neutral-800/50 grid grid-cols-2 gap-6 text-sm">
                  {artist.dob && (
                    <div>
                      <span className="text-neutral-500 block text-xs uppercase font-bold tracking-widest mb-1.5">Born</span>
                      <span className="font-semibold text-white">{artist.dob}</span>
                    </div>
                  )}
                  {artist.availableLanguages && artist.availableLanguages.length > 0 && (
                    <div>
                      <span className="text-neutral-500 block text-xs uppercase font-bold tracking-widest mb-1.5">Languages</span>
                      <span className="font-semibold text-white capitalize">{artist.availableLanguages.slice(0,3).join(", ")}{artist.availableLanguages.length > 3 ? "..." : ""}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : artist.isFallback ? (
              <div className="bg-neutral-900/60 border border-neutral-800/50 rounded-2xl p-8 flex flex-col items-center text-center sticky top-24">
                <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mb-5">
                  <Info size={28} className="text-neutral-500" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Detailed Bio Unavailable</h3>
                <p className="text-sm text-neutral-400 font-medium leading-relaxed">We could only load partial data for {artist.name} right now. You can still stream all their popular tracks and albums.</p>
              </div>
            ) : null}
          </div>

        </div>
      </div>
    </div>
  );
}

export default function ArtistPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-black text-white">
        <Loader2 className="animate-spin text-green-500" size={48} />
      </div>
    }>
      <ArtistContent />
    </Suspense>
  );
}
