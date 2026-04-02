"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Play, ArrowLeft, Loader2, MoreVertical, BadgeCheck, 
  Users, Heart, Facebook, Twitter, Globe, Info, Disc3, Music
} from "lucide-react";
import { useAppContext } from "../../context/AppContext";

// Advanced image URL extractor mapping to requested quality
const getImageUrl = (img: any, targetQuality: '50x50' | '150x150' | '500x500' = '500x500') => {
  if (!img) return "https://via.placeholder.com/500";
  if (typeof img === "string") {
    return img.replace(/50x50|150x150/g, targetQuality);
  }
  if (Array.isArray(img)) {
    const exactMatch = img.find((i) => i.quality === targetQuality);
    return exactMatch?.url || img[img.length - 1]?.url || "https://via.placeholder.com/500";
  }
  return "https://via.placeholder.com/500";
};

// Formatter for large numbers (e.g. 40.5M)
const formatNumber = (num: number | string) => {
  if (!num) return "0";
  return Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short", maximumFractionDigits: 1 }).format(Number(num));
};

function ArtistContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id");

  const { setCurrentSong, setIsPlaying } = useAppContext();
  
  const [artist, setArtist] = useState<any>(null);
  const[topSongs, setTopSongs] = useState<any[]>([]);
  const [topAlbums, setTopAlbums] = useState<any[]>([]);
  const [singles, setSingles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const[showFullBio, setShowFullBio] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchArtistData = async () => {
      setLoading(true);
      try {
        // Use Promise.allSettled so that if the main API fails, we still get Songs & Albums
        const[artistRes, songsRes, albumsRes] = await Promise.allSettled([
          fetch(`https://ayushm-psi.vercel.app/api/artists/${id}`),
          fetch(`https://ayushm-psi.vercel.app/api/artists/${id}/songs?page=0`),
          fetch(`https://ayushm-psi.vercel.app/api/artists/${id}/albums?page=0`)
        ]);

        let fetchedSongs = [];
        let fetchedAlbums = [];
        let fetchedArtist = null;
        let fetchedSingles =[];

        if (songsRes.status === 'fulfilled') {
          const songsJson = await songsRes.value.json();
          fetchedSongs = songsJson?.data?.songs ||[];
        }

        if (albumsRes.status === 'fulfilled') {
          const albumsJson = await albumsRes.value.json();
          fetchedAlbums = albumsJson?.data?.albums ||[];
        }

        if (artistRes.status === 'fulfilled') {
          const artistJson = await artistRes.value.json();
          if (artistJson.success && artistJson.data) {
            fetchedArtist = artistJson.data;
            fetchedSingles = artistJson.data?.singles ||[];
          }
        }

        // INTELLIGENT FALLBACK: If Main Artist API fails or is empty, extract from Songs/Albums
        if (!fetchedArtist) {
          console.warn("Main Artist API failed. Extracting fallback data from songs/albums...");
          let fallbackArtist = null;

          // Attempt to extract from Songs array
          for (const song of fetchedSongs) {
            const match = song.artists?.primary?.find((a: any) => a.id === id) || song.artists?.all?.find((a: any) => a.id === id);
            if (match) { fallbackArtist = match; break; }
          }

          // If not in songs, attempt to extract from Albums array
          if (!fallbackArtist) {
            for (const album of fetchedAlbums) {
              const match = album.artists?.primary?.find((a: any) => a.id === id) || album.artists?.all?.find((a: any) => a.id === id);
              if (match) { fallbackArtist = match; break; }
            }
          }

          if (fallbackArtist) {
            fetchedArtist = {
              id: fallbackArtist.id,
              name: fallbackArtist.name,
              image: fallbackArtist.image,
              dominantType: fallbackArtist.role || "Artist",
              isFallback: true, // Flag indicating it's partial data
            };
          }
        }

        setArtist(fetchedArtist);
        setTopSongs(fetchedSongs);
        setTopAlbums(fetchedAlbums);
        setSingles(fetchedSingles);

      } catch (error) {
        console.error("Error fetching artist data:", error);
      }
      setLoading(false);
    };

    fetchArtistData();
  }, [id]);

  if (loading) return <div className="flex h-screen items-center justify-center bg-black text-white"><Loader2 className="animate-spin text-white" size={40} /></div>;
  if (!artist) return <div className="flex h-screen items-center justify-center bg-black text-white">Artist not found</div>;

  const combinedBio = artist.bio ? artist.bio.map((b: any) => b.text).join("\n\n") : "";

  return (
    <div className="pb-24 min-h-screen bg-black text-white overflow-x-hidden">
      {/* 1. HERO SECTION */}
      <div className="relative w-full md:h-[450px] h-96 bg-neutral-900 overflow-hidden flex flex-col justify-end lg:justify-center">
        {/* Blurred Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 blur-2xl transform scale-110"
          style={{ backgroundImage: `url(${getImageUrl(artist.image)})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 lg:via-black/40 to-transparent" />

        {/* Back Button */}
        <button onClick={() => router.back()} className="absolute top-6 left-6 bg-black/50 hover:bg-black/70 p-3 rounded-full backdrop-blur-md z-30 transition-colors">
          <ArrowLeft size={24} className="text-white" />
        </button>

        {/* Hero Content - Adapts for Mobile vs PC */}
        <div className="relative z-20 flex flex-col lg:flex-row items-center lg:items-end gap-6 px-6 lg:px-12 pb-8 w-full max-w-7xl mx-auto">
          <img 
            src={getImageUrl(artist.image)} 
            alt={artist.name}
            className="w-40 h-40 md:w-56 md:h-56 rounded-full shadow-2xl object-cover border-4 border-neutral-800 lg:mb-0 mb-2" 
          />
          
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left flex-1">
            {/* Badges & Name */}
            <div className="flex items-center gap-2 mb-1">
              {artist.dominantType && (
                <span className="px-2 py-1 bg-white/10 backdrop-blur-md rounded-md text-xs font-semibold tracking-wider uppercase text-neutral-300">
                  {artist.dominantType}
                </span>
              )}
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white flex items-center gap-3 drop-shadow-lg">
              {artist.name} 
              {artist.isVerified && <BadgeCheck className="text-blue-500 mt-2" size={32} fill="currentColor" />}
            </h1>
            
            {/* Stats (if available) */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-4 mt-4 text-sm md:text-base text-neutral-300 font-medium">
              {artist.followerCount && (
                <span className="flex items-center gap-1.5"><Users size={18} /> {formatNumber(artist.followerCount)} Followers</span>
              )}
              {artist.fanCount && (
                <span className="flex items-center gap-1.5"><Heart size={18} /> {formatNumber(artist.fanCount)} Fans</span>
              )}
              {artist.dominantLanguage && (
                <span className="capitalize flex items-center gap-1.5"><Globe size={18}/> {artist.dominantLanguage}</span>
              )}
            </div>

            {/* Social Links */}
            <div className="flex gap-4 mt-4">
              {artist.fb && <a href={artist.fb} target="_blank" rel="noreferrer" className="text-neutral-400 hover:text-blue-500 transition-colors"><Facebook size={22}/></a>}
              {artist.twitter && <a href={artist.twitter} target="_blank" rel="noreferrer" className="text-neutral-400 hover:text-sky-400 transition-colors"><Twitter size={22}/></a>}
              {artist.wiki && <a href={artist.wiki} target="_blank" rel="noreferrer" className="text-neutral-400 hover:text-white transition-colors"><Globe size={22}/></a>}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        
        {/* Play Button & Action Row */}
        <div className="flex items-center justify-between relative z-30 mb-10">
          <button 
            onClick={() => { if (topSongs.length) { setCurrentSong(topSongs[0]); setIsPlaying(true); } }} 
            className="bg-green-500 hover:bg-green-400 text-black p-4 md:p-5 rounded-full active:scale-95 transition-all shadow-[0_0_30px_rgba(34,197,94,0.3)] hover:shadow-[0_0_40px_rgba(34,197,94,0.5)]"
          >
            <Play fill="black" size={28} className="ml-1" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT/MAIN COLUMN */}
          <div className="lg:col-span-2 flex flex-col gap-10">
            
            {/* Top Songs Section */}
            {topSongs.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold flex items-center gap-2"><Music size={24} className="text-neutral-400"/> Popular Songs</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {topSongs.slice(0, 10).map((song: any, index: number) => (
                    <div 
                      key={song.id} 
                      onClick={() => { setCurrentSong(song); setIsPlaying(true); }} 
                      className="group flex items-center gap-4 p-3 rounded-xl hover:bg-neutral-800/50 cursor-pointer active:scale-95 transition-all relative overflow-hidden"
                    >
                      <span className="text-neutral-500 text-sm font-semibold w-5 text-center group-hover:hidden">{index + 1}</span>
                      <Play size={16} className="hidden group-hover:block text-white w-5 text-center" fill="currentColor" />
                      
                      <img src={getImageUrl(song.image, '150x150')} className="w-14 h-14 rounded-md object-cover shadow-md" alt={song.title} />
                      
                      <div className="flex-1 min-w-0 pr-2">
                        <h3 className="text-base font-bold text-white truncate group-hover:text-green-400 transition-colors">{song.name || song.title}</h3>
                        <p className="text-sm text-neutral-400 truncate mt-0.5">{song.album?.name || artist.name}</p>
                      </div>
                      <button className="opacity-0 group-hover:opacity-100 p-2 text-neutral-400 hover:text-white transition-opacity">
                        <MoreVertical size={20} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Albums Section (Grid) */}
            {topAlbums.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><Disc3 size={24} className="text-neutral-400"/> Top Albums</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                  {topAlbums.map((album: any) => (
                    <div 
                      key={album.id} 
                      onClick={() => router.push(`/album?link=${encodeURIComponent(album.url)}`)} 
                      className="group flex flex-col gap-2 p-3 rounded-xl hover:bg-neutral-800/50 cursor-pointer transition-all"
                    >
                      <div className="relative aspect-square w-full overflow-hidden rounded-xl shadow-lg bg-neutral-800">
                        <img src={getImageUrl(album.image, '500x500')} alt={album.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <div className="bg-green-500 p-3 rounded-full translate-y-4 group-hover:translate-y-0 transition-all duration-300 shadow-xl">
                             <Play fill="black" size={20} className="text-black ml-0.5"/>
                           </div>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white truncate group-hover:text-green-400 transition-colors">{album.name}</h3>
                        <p className="text-xs text-neutral-400 truncate mt-0.5">{album.year || "Album"} • {artist.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Singles Section (Grid) - Only if available from main API */}
            {singles.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><Disc3 size={24} className="text-neutral-400"/> Latest Singles</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                  {singles.map((single: any) => (
                    <div 
                      key={single.id} 
                      onClick={() => router.push(`/album?link=${encodeURIComponent(single.url)}`)} 
                      className="group flex flex-col gap-2 p-3 rounded-xl hover:bg-neutral-800/50 cursor-pointer transition-all"
                    >
                      <div className="relative aspect-square w-full overflow-hidden rounded-xl shadow-lg bg-neutral-800">
                        <img src={getImageUrl(single.image, '500x500')} alt={single.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white truncate">{single.name}</h3>
                        <p className="text-xs text-neutral-400 truncate mt-0.5">{single.year || "Single"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

          </div>

          {/* RIGHT COLUMN (About / Bio) */}
          <div className="lg:col-span-1">
            {combinedBio && (
              <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 sticky top-24">
                <h2 className="text-xl font-bold flex items-center gap-2 mb-4"><Info size={22} className="text-neutral-400"/> About {artist.name}</h2>
                
                <div className={`text-neutral-300 text-sm leading-relaxed ${!showFullBio ? "line-clamp-6" : ""}`}>
                  {combinedBio.split('\n\n').map((paragraph: string, i: number) => (
                    <p key={i} className="mb-3">{paragraph}</p>
                  ))}
                </div>
                
                {combinedBio.length > 300 && (
                  <button 
                    onClick={() => setShowFullBio(!showFullBio)}
                    className="mt-2 text-white font-semibold text-sm hover:underline"
                  >
                    {showFullBio ? "Show less" : "Read more"}
                  </button>
                )}

                {/* Extra Details */}
                <div className="mt-6 pt-6 border-t border-neutral-800 grid grid-cols-2 gap-4 text-sm">
                  {artist.dob && (
                    <div>
                      <span className="text-neutral-500 block text-xs uppercase font-bold tracking-wider mb-1">Born</span>
                      <span className="font-medium text-white">{artist.dob}</span>
                    </div>
                  )}
                  {artist.availableLanguages && artist.availableLanguages.length > 0 && (
                    <div>
                      <span className="text-neutral-500 block text-xs uppercase font-bold tracking-wider mb-1">Languages</span>
                      <span className="font-medium text-white capitalize">{artist.availableLanguages.slice(0,3).join(", ")}{artist.availableLanguages.length > 3 ? "..." : ""}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Render a fallback block if no bio exists but it's a fallback artist */}
            {artist.isFallback && !combinedBio && (
               <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 flex flex-col items-center text-center sticky top-24">
                  <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mb-4">
                    <Info size={30} className="text-neutral-500" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Detailed Info Unavailable</h3>
                  <p className="text-sm text-neutral-400">We could only load partial data for {artist.name} at this moment. You can still explore their top tracks and albums.</p>
               </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default function ArtistPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-black text-white"><Loader2 className="animate-spin" size={40} /></div>}>
      <ArtistContent />
    </Suspense>
  );
}
