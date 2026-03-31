/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useAppContext } from "../context/AppContext";
import { 
  Play, Pause, SkipForward, SkipBack, Loader2, ChevronDown, 
  MoreHorizontal, Shuffle, Repeat, Heart, ListMusic, Volume2, 
  MonitorSpeaker, Mic2, Maximize2, SquarePlay, VolumeX
} from "lucide-react";

// --- UTILITIES ---
const decodeEntities = (text: string) => {
  if (!text) return "";
  return text.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&apos;/g, "'");
};

const getArtists = (data: any) => {
  let names: string[] =[];
  if (data?.artists?.primary && Array.isArray(data.artists.primary)) names = data.artists.primary.map((a: any) => a.name);
  else if (Array.isArray(data?.artists)) names = data.artists.slice(0, 4).map((a: any) => a.name);
  else if (typeof data?.artists === "string") names = data.artists.split(",").map((n: string) => n.trim());
  else if (data?.primaryArtists) names = data.primaryArtists.split(",").map((n: string) => n.trim());
  else if (data?.singers) names = data.singers.split(",").map((n: string) => n.trim());
  else return "Unknown Artist";
  return Array.from(new Set(names)).join(", ");
};

const getImageUrl = (img: any) => {
  if (!img) return "https://via.placeholder.com/500";
  if (typeof img === "string") return img.replace("50x50", "500x500").replace("150x150", "500x500");
  if (Array.isArray(img)) return img[img.length - 1]?.url || img[0]?.url;
  return "https://via.placeholder.com/500";
};

const formatTime = (time: number) => {
  if (!time || isNaN(time)) return "0:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
};

const parseTimeTag = (tag: string) => {
  if (!tag) return 0;
  const parts = tag.split(':');
  if (parts.length >= 2) {
    const m = parseInt(parts[0], 10);
    const s = parseFloat(parts[1]);
    return m * 60 + s;
  }
  return 0;
};

// --- RAPID API EXACT MATCHER LOGIC ---
const RAPID_KEYS =[
  "d1edce158amshec139440d20658ap1f2545jsnbb7da9add82f",
  "6cf7f03014msh787c51a713c0264p15c20djsna1f9a9f6a378",
  "13d48f6bb8msh459c11b91bdcc44p110f4ejsn099443894115",
  "03fc23317fmsh0535ef9ec8c6f5bp1db59bjsn545991df9343",
  "e54e3fbc4dmshfc16d4417b618fdp1a2fafjsn30c72d8cf3ab",
  "2f3f6a9ae2mshdc5288abadb0c84p118401jsnd18970b2f26a",
  "c1efbc2580mshf9e6f81b0e6f996p143edajsn64cf72ed1463",
  "da6bd1e90dmsh5aab26c0416ad7ep182d57jsnee8be14e0c74",
  "7dd1f2fad7msh74af897174e65bcp10834ejsnc62fe7ef2611",
  "2f4d50852bmsh18208c6cdabf7d5p1c8a68jsn6c3a2b8fa7b8",
  "d3c96044bfmshfb83354c3708e98p1ed394jsnbf4ef41a0837"
];
const RAPID_API_HOST = "spotify81.p.rapidapi.com";

const performMatching = (apiData: any, targetTrack: string, targetArtist: string): any => {
  if (!apiData.tracks || apiData.tracks.length === 0) return null;
  const clean = (s: string) => (s || "").toLowerCase().replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ").trim();
  const tTitle = clean(targetTrack); 
  const tArtist = clean(targetArtist);
  
  let bestMatch: any = null; 
  let highestScore = 0;
  
  apiData.tracks.forEach((item: any) => {
      const track = item.data; 
      if (!track) return;
      
      const rTitle = clean(track.name); 
      const rArtists = track.artists.items.map((a: any) => clean(a.profile.name));
      
      let score = 0; 
      let artistMatched = false;
      
      if (tArtist.length > 0) {
          for (let ra of rArtists) { 
              if (ra === tArtist) { score += 100; artistMatched = true; break; } 
              else if (ra.includes(tArtist) || tArtist.includes(ra)) { score += 80; artistMatched = true; break; } 
          }
          if (!artistMatched) score = 0;
      } else { score += 50; }
      
      if (score > 0) { 
          if (rTitle === tTitle) score += 100; 
          else if (rTitle.startsWith(tTitle) || tTitle.startsWith(rTitle)) score += 80; 
          else if (rTitle.includes(tTitle)) score += 50; 
      }
      
      if (score > highestScore) { 
          highestScore = score; 
          bestMatch = track; 
      }
  });

  // Fallback: If strict match fails, but we have tracks, return the top result so Canvas/Lyrics still work
  if (highestScore > 0) return bestMatch;
  if (apiData.tracks && apiData.tracks.length > 0) return apiData.tracks[0].data;
  return null;
};

// --- PERFECT MARQUEE COMPONENT ---
const MarqueeText = ({ text, className = "" }: { text: string, className?: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const[isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        setIsOverflowing(textRef.current.scrollWidth > containerRef.current.clientWidth + 2);
      }
    };
    checkOverflow();
    const timeout = setTimeout(checkOverflow, 150);
    window.addEventListener("resize", checkOverflow);
    return () => { clearTimeout(timeout); window.removeEventListener("resize", checkOverflow); };
  }, [text]);

  return (
    <div ref={containerRef} className={`overflow-hidden whitespace-nowrap w-full ${isOverflowing ? "mask-edges" : ""} ${className}`}>
      <div className={`inline-block ${isOverflowing ? "animate-spotify-marquee" : ""}`}>
        <span ref={textRef} className={isOverflowing ? "pr-12" : ""}>{text}</span>
        {isOverflowing && <span className="pr-12">{text}</span>}
      </div>
    </div>
  );
};

// --- MAIN PLAYER COMPONENT ---
export default function Player() {
  const { currentSong, isPlaying, setIsPlaying, setCurrentSong, queue } = useAppContext();
  
  const [audioUrl, setAudioUrl] = useState("");
  const[loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const[currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const[volume, setVolume] = useState(100);
  const[isExpanded, setIsExpanded] = useState(false);
  const [dominantColor, setDominantColor] = useState("rgb(83, 83, 83)");

  const rapidKeyIdxRef = useRef(0);
  const[spotifyId, setSpotifyId] = useState<string | null>(null);
  const[spotifyUrl, setSpotifyUrl] = useState<string | null>(null);
  const[lyrics, setLyrics] = useState<any[]>([]);
  const [syncType, setSyncType] = useState<string | null>(null);
  const [activeLyricIndex, setActiveLyricIndex] = useState(-1);
  const[canvasData, setCanvasData] = useState<any>(null);
  const[isCanvasLoaded, setIsCanvasLoaded] = useState(false);
  
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const activeLyricRef = useRef<HTMLParagraphElement>(null);
  
  const[swipeX, setSwipeX] = useState(0);
  const touchStartX = useRef(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const title = currentSong ? decodeEntities(currentSong.title || currentSong.name || "Unknown") : "";
  const artists = currentSong ? decodeEntities(getArtists(currentSong)) : "";
  const coverImage = currentSong ? getImageUrl(currentSong.image) : "";
  const contextType = currentSong?.playlistName ? "PLAYLIST" : (currentSong?.album?.name ? "ALBUM" : "TRACK");
  const contextName = currentSong?.playlistName || currentSong?.album?.name || "Single";

  // Reset Everything on Song Change
  useEffect(() => {
    if (!currentSong) return;
    
    setSpotifyId(null);
    setSpotifyUrl(null);
    setLyrics([]);
    setSyncType(null);
    setCanvasData(null);
    setIsCanvasLoaded(false);
    setActiveLyricIndex(-1);

    const fetchUrl = async () => {
      setLoading(true);
      try {
        if (currentSong.downloadUrl?.length > 0) setAudioUrl(currentSong.downloadUrl[currentSong.downloadUrl.length - 1].url);
        else {
          const res = await fetch(`https://ayushm-psi.vercel.app/api/songs?link=${encodeURIComponent(currentSong.url || currentSong.perma_url)}`);
          const json = await res.json();
          if (json.data?.[0]?.downloadUrl) setAudioUrl(json.data[0].downloadUrl[json.data[0].downloadUrl.length - 1].url);
        }
      } catch (err) {}
      setLoading(false);
    };

    const fetchSpotifyMatch = async () => {
      const searchArtist = artists ? artists.split(',').slice(0, 3).join(' ') : "";
      const query = `${title} ${searchArtist}`.trim();
      const searchUrl = `https://${RAPID_API_HOST}/search?q=${encodeURIComponent(query)}&type=tracks&offset=0&limit=25&numberOfTopResults=5`;

      let matchData = null;
      for (let attempt = 0; attempt < RAPID_KEYS.length; attempt++) {
        try {
          const response = await fetch(searchUrl, { 
              method: 'GET', headers: { 'x-rapidapi-key': RAPID_KEYS[rapidKeyIdxRef.current], 'x-rapidapi-host': RAPID_API_HOST } 
          });
          if (response.ok) {
              matchData = await response.json();
              break; 
          } else if (response.status === 429 || response.status === 401 || response.status === 403) {
              rapidKeyIdxRef.current = (rapidKeyIdxRef.current + 1) % RAPID_KEYS.length;
          } else break; 
        } catch (e) {
            rapidKeyIdxRef.current = (rapidKeyIdxRef.current + 1) % RAPID_KEYS.length;
        }
      }

      if (matchData) {
        const match: any = performMatching(matchData, title, searchArtist);
        if (match) {
          setSpotifyId(match.id);
          setSpotifyUrl(`https://open.spotify.com/track/${match.id}`);
        }
      }
    };

    fetchUrl();
    fetchSpotifyMatch();
  },[currentSong, title, artists]);

  // Fetch Lyrics and Canvas
  useEffect(() => {
    if (!spotifyId || !spotifyUrl) return;

    const fetchExtras = async () => {
      try {
        const lyricsRes = await fetch(`https://lyr-nine.vercel.app/api/lyrics?url=${encodeURIComponent(spotifyUrl)}&format=lrc`);
        if (lyricsRes.ok) {
          const lyricsJson = await lyricsRes.json();
          if (lyricsJson.lines) {
            const parsedLines = lyricsJson.lines.map((l: any) => ({ time: parseTimeTag(l.timeTag), words: l.words }));
            setLyrics(parsedLines);
            setSyncType(lyricsJson.syncType);
          }
        }

        const canvasRes = await fetch(`https://ayush-gamma-coral.vercel.app/api/canvas?trackId=${spotifyId}`);
        if (canvasRes.ok) {
          const canvasJson = await canvasRes.json();
          if (canvasJson.canvasesList && canvasJson.canvasesList.length > 0) {
            setCanvasData(canvasJson.canvasesList[0]);
          }
        }
      } catch (e) {}
    };

    fetchExtras();
  }, [spotifyId, spotifyUrl]);

  // Extract High-Fidelity Accent Color
  useEffect(() => {
    if (!coverImage) return;
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = coverImage;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 50; canvas.height = 50; 
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, 50, 50);
      try {
        const data = ctx.getImageData(0, 0, 50, 50).data;
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 16) {
          const brightness = (data[i] + data[i+1] + data[i+2]) / 3;
          if (brightness > 30 && brightness < 210) { 
            r += data[i]; g += data[i+1]; b += data[i+2]; count++; 
          }
        }
        setDominantColor(count > 0 ? `rgb(${Math.floor(r/count)}, ${Math.floor(g/count)}, ${Math.floor(b/count)})` : "rgb(83, 83, 83)");
      } catch (e) { setDominantColor("rgb(30, 30, 30)"); }
    };
  }, [coverImage]);

  // Audio Execution
  useEffect(() => {
    if (audioRef.current && audioUrl) {
      audioRef.current.volume = volume / 100;
      if (isPlaying) { 
        const playPromise = audioRef.current.play(); 
        if (playPromise !== undefined) playPromise.catch(() => {}); 
      }
      else audioRef.current.pause();
    }
  },[isPlaying, audioUrl, volume]);

  const syncPosition = useCallback(() => {
    if ('mediaSession' in navigator && audioRef.current && duration > 0) {
      try { navigator.mediaSession.setPositionState({ duration, playbackRate: 1, position: audioRef.current.currentTime }); } catch(e) {}
    }
  }, [duration]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const c = audioRef.current.currentTime;
      const d = audioRef.current.duration;
      setCurrentTime(c); setDuration(d || 0);
      if (d > 0) setProgress((c / d) * 100);
      if (d > 0 && duration === 0) syncPosition();

      // Sync Lyrics Active Line
      if (syncType === "LINE_SYNCED" && lyrics.length > 0) {
        let activeIdx = -1;
        for (let i = 0; i < lyrics.length; i++) {
          if (lyrics[i].time <= c) activeIdx = i;
          else break;
        }
        if (activeIdx !== activeLyricIndex) setActiveLyricIndex(activeIdx);
      }
    }
  };

  // INTERNAL Scroll active lyric so the main page doesn't bounce
  useEffect(() => {
    if (activeLyricRef.current && lyricsContainerRef.current) {
      const container = lyricsContainerRef.current;
      const element = activeLyricRef.current;
      
      const scrollPos = element.offsetTop - container.offsetTop - (container.clientHeight / 2) + (element.clientHeight / 2);
      
      container.scrollTo({ top: scrollPos, behavior: 'smooth' });
    }
  }, [activeLyricIndex]);

  // Click on Lyrics to Sync
  const handleLyricClick = (time: number) => {
    if (audioRef.current && duration > 0) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
      syncPosition();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setProgress(val);
    if (audioRef.current && duration > 0) {
      audioRef.current.currentTime = (val / 100) * duration;
      setCurrentTime(audioRef.current.currentTime);
      syncPosition();
    }
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) audioRef.current.volume = val / 100;
  };

  const playNext = () => {
    if (!queue || queue.length === 0) return;
    const idx = queue.findIndex((s: any) => s.id === currentSong.id);
    if (idx !== -1 && idx < queue.length - 1) { setCurrentSong(queue[idx + 1]); setIsPlaying(true); } 
    else { setIsPlaying(false); setProgress(0); }
  };

  const playPrev = () => {
    if (!queue || queue.length === 0) return;
    if (audioRef.current && audioRef.current.currentTime > 3) { audioRef.current.currentTime = 0; return; }
    const idx = queue.findIndex((s: any) => s.id === currentSong.id);
    if (idx > 0) { setCurrentSong(queue[idx - 1]); setIsPlaying(true); }
  };

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchMove = (e: React.TouchEvent) => {
    const diff = e.touches[0].clientX - touchStartX.current;
    if (diff > 0) setSwipeX(diff);
  };
  const handleTouchEnd = () => {
    if (swipeX > window.innerWidth * 0.45) { 
      setCurrentSong(null); setIsPlaying(false); setIsExpanded(false); 
    }
    setSwipeX(0); 
  };

  if (!currentSong) return null;

  // Render Artist Data gracefully
  const artistNameToShow = canvasData?.artist?.artistName || artists.split(',')[0];
  const artistImgToShow = canvasData?.artist?.artistImgUrl || coverImage;

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spotify-marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes slide-up-lyric { 0% { transform: translateY(10px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
        .animate-spotify-marquee { animation: spotify-marquee 12s linear infinite; display: inline-block; }
        .animate-lyric-change { animation: slide-up-lyric 0.35s ease-out forwards; }
        .mask-edges { mask-image: linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%); -webkit-mask-image: linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%); }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }

        input[type=range] { -webkit-appearance: none; appearance: none; background: transparent; cursor: pointer; border-radius: 4px; }
        input[type=range]:focus { outline: none; }
        
        .desktop-slider::-webkit-slider-runnable-track { height: 4px; border-radius: 2px; background: #4d4d4d; transition: background 0.1s; }
        .desktop-slider::-moz-range-track { height: 4px; border-radius: 2px; background: #4d4d4d; }
        .desktop-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; height: 12px; width: 12px; border-radius: 50%; background: #fff; margin-top: -4px; opacity: 0; box-shadow: 0 2px 4px rgba(0,0,0,0.5); border: 0; }
        .desktop-slider::-moz-range-thumb { height: 12px; width: 12px; border-radius: 50%; background: #fff; opacity: 0; border: 0; }
        
        .desktop-slider-group:hover .desktop-slider::-webkit-slider-thumb { opacity: 1; }
        .desktop-slider-group:hover .desktop-slider::-moz-range-thumb { opacity: 1; }
        .desktop-slider-group:hover .desktop-slider { --fill-color: #1db954 !important; }

        .mobile-slider::-webkit-slider-runnable-track { height: 4px; border-radius: 2px; background: rgba(255,255,255,0.2); }
        .mobile-slider::-moz-range-track { height: 4px; border-radius: 2px; background: rgba(255,255,255,0.2); }
        .mobile-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; height: 12px; width: 12px; border-radius: 50%; background: #fff; margin-top: -4px; box-shadow: 0 2px 4px rgba(0,0,0,0.4); border: 0; }
        .mobile-slider::-moz-range-thumb { height: 12px; width: 12px; border-radius: 50%; background: #fff; border: 0; }
      `}} />

      <audio ref={audioRef} src={audioUrl} autoPlay={isPlaying} onEnded={playNext} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} />

      {/* DESKTOP BOTTOM BAR */}
      <div className="hidden md:flex fixed bottom-0 left-0 w-full h-[90px] bg-[#000000] z-[100] items-center px-4 justify-between border-t border-[#282828]">
        <div className="flex items-center w-[30%] min-w-[180px] gap-4">
          <div className="relative w-14 h-14 flex-shrink-0 bg-[#282828] rounded overflow-hidden shadow-md group cursor-pointer">
            {loading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 size={20} className="animate-spin text-white" /></div>}
            <img src={coverImage} alt="cover" className="w-full h-full object-cover" />
            <button className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-black/60 rounded-full p-1 transition-opacity"><ChevronDown size={14} className="text-white"/></button>
          </div>
          <div className="flex flex-col min-w-0 pr-2 overflow-hidden">
            <span className="text-[14px] font-medium text-white hover:underline cursor-pointer truncate">{title}</span>
            <span className="text-[11px] font-normal text-[#b3b3b3] hover:underline cursor-pointer truncate mt-[1px]">{artists}</span>
          </div>
          <button className="flex-shrink-0 text-[#b3b3b3] hover:text-white transition-colors ml-1"><Heart size={16} /></button>
        </div>

        <div className="flex flex-col items-center justify-center w-[40%] max-w-[722px] px-2">
          <div className="flex items-center gap-6 mb-[6px]">
            <button className="text-[#1db954] hover:text-[#1ed760] transition-colors"><Shuffle size={16} /></button>
            <button onClick={playPrev} className="text-[#b3b3b3] hover:text-white transition-colors"><SkipBack size={16} fill="currentColor" /></button>
            <button onClick={() => setIsPlaying(!isPlaying)} className="w-8 h-8 rounded-full bg-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform text-black shadow-md">
              {isPlaying ? <Pause fill="black" size={14} className="ml-0" /> : <Play fill="black" size={14} className="ml-[2px]" />}
            </button>
            <button onClick={playNext} className="text-[#b3b3b3] hover:text-white transition-colors"><SkipForward size={16} fill="currentColor" /></button>
            <button className="text-[#b3b3b3] hover:text-white transition-colors"><Repeat size={16} /></button>
          </div>
          <div className="flex items-center gap-2 w-full desktop-slider-group">
            <span className="text-[11px] font-normal text-[#a7a7a7] min-w-[35px] text-right">{formatTime(currentTime)}</span>
            <input type="range" min="0" max="100" value={duration > 0 ? progress : 0} onChange={handleSeek} className="w-full desktop-slider" style={{ '--fill-color': '#fff', background: `linear-gradient(to right, var(--fill-color) ${progress}%, #4d4d4d ${progress}%)` } as any} />
            <span className="text-[11px] font-normal text-[#a7a7a7] min-w-[35px]">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center justify-end w-[30%] min-w-[180px] gap-3 text-[#b3b3b3]">
          <button className="hover:text-white transition-colors"><SquarePlay size={16} /></button>
          <button className="hover:text-white transition-colors"><Mic2 size={16} /></button>
          <button className="hover:text-white transition-colors"><ListMusic size={16} /></button>
          <button className="hover:text-white transition-colors"><MonitorSpeaker size={16} /></button>
          <div className="flex items-center gap-2 w-[93px] desktop-slider-group">
            <button onClick={() => setVolume(volume > 0 ? 0 : 100)} className="hover:text-white transition-colors flex-shrink-0">
              {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <input type="range" min="0" max="100" value={volume} onChange={handleVolume} className="w-full desktop-slider" style={{ '--fill-color': '#fff', background: `linear-gradient(to right, var(--fill-color) ${volume}%, #4d4d4d ${volume}%)` } as any} />
          </div>
          <button className="hover:text-white transition-colors"><Maximize2 size={16} /></button>
        </div>
      </div>

      {/* MOBILE FULL SCREEN OVERLAY (Scrollable) */}
      <div 
        className={`md:hidden fixed inset-0 z-[99999] text-white transition-transform duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] overflow-y-auto overflow-x-hidden scrollbar-hide ${isExpanded ? "translate-y-0" : "translate-y-full"}`} 
        style={{ backgroundColor: isCanvasLoaded ? '#000' : dominantColor }}
      >
        {/* Dynamic Backgrounds */}
        {!isCanvasLoaded && (
          <div className="fixed inset-0 pointer-events-none z-0" style={{ background: `linear-gradient(to bottom, ${dominantColor} 0%, #121212 100%)` }} />
        )}
        
        {isCanvasLoaded && canvasData?.canvasUrl && (
          <div className="fixed inset-0 pointer-events-none z-0 bg-black">
            <video src={canvasData.canvasUrl} autoPlay loop muted playsInline onCanPlay={() => setIsCanvasLoaded(true)} className="absolute inset-0 w-full h-full object-cover opacity-90 scale-105 blur-sm" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/90" />
          </div>
        )}

        {/* Content Wrapper */}
        <div className="relative z-10 w-full min-h-max flex flex-col">
          
          {/* Main Controls (Takes up viewport minus 90px so lyrics card peeks out) */}
          <div className="w-full flex flex-col flex-shrink-0" style={{ minHeight: 'calc(100dvh - 90px)' }}>
            <div className="flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-2 flex-shrink-0 w-full mt-4">
              <button onClick={() => setIsExpanded(false)} className="p-2 -ml-2 text-white active:opacity-50 drop-shadow-md"><ChevronDown size={28} /></button>
              <div className="flex flex-col items-center flex-1 min-w-0 px-2 drop-shadow-md">
                <span className="text-[10px] tracking-widest text-white/70 uppercase truncate w-full text-center font-medium">Playing from {contextType}</span>
                <span className="text-[13px] font-bold text-white truncate w-full text-center mt-[2px]">{contextName}</span>
              </div>
              <button className="p-2 -mr-2 text-white active:opacity-50 drop-shadow-md"><MoreHorizontal size={24} /></button>
            </div>

            <div className={`flex-1 w-full min-h-0 flex items-center justify-center py-2 px-6 transition-opacity duration-500 ${isCanvasLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
              <div className="relative bg-[#282828] rounded-[8px] shadow-[0_15px_40px_rgba(0,0,0,0.5)] overflow-hidden" style={{ height: '100%', aspectRatio: '1 / 1', maxHeight: '450px', maxWidth: 'min(calc(100vw - 48px), 450px)' }}>
                {loading && <div className="absolute inset-0 z-10 bg-black/50 flex items-center justify-center"><Loader2 size={40} className="animate-spin text-white" /></div>}
                <img src={coverImage} alt="cover" className="w-full h-full object-cover" />
              </div>
            </div>

            <div className="w-full px-6 pb-[max(1rem,env(safe-area-inset-bottom))] mb-2 pt-2 flex flex-col justify-end flex-shrink-0">
              {/* Dynamic Active Lyric Line (Spotify Style) */}
              {syncType === "LINE_SYNCED" && lyrics[activeLyricIndex] && (
                <div key={activeLyricIndex} className="text-white/95 text-[15px] font-bold text-left mb-2 min-h-[22px] animate-lyric-change drop-shadow-lg pr-4 line-clamp-2">
                  {lyrics[activeLyricIndex].words || "♪"}
                </div>
              )}

              <div className="flex items-center justify-between mb-5 drop-shadow-md">
                <div className="flex flex-col overflow-hidden pr-4 flex-1 min-w-0 w-full">
                  <MarqueeText text={title} className="text-[22px] font-bold text-white tracking-tight leading-tight drop-shadow-md" />
                  <MarqueeText text={artists} className="text-[15px] font-medium text-[#b3b3b3] mt-1 drop-shadow-md" />
                </div>
                <button className="text-white flex-shrink-0 ml-2 active:scale-75 transition-transform"><Heart size={26} /></button>
              </div>

              <div className="w-full flex flex-col gap-1 mb-5 relative drop-shadow-md">
                <input type="range" min="0" max="100" value={duration > 0 ? progress : 0} onChange={handleSeek} className="w-full mobile-slider relative z-10" style={{ background: `linear-gradient(to right, #fff ${progress}%, rgba(255,255,255,0.2) ${progress}%)` }} />
                <div className="flex items-center justify-between text-[11px] font-medium text-[#a7a7a7] mt-1 w-full pointer-events-none">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between w-full mb-5 px-1 drop-shadow-md">
                <button className="text-[#1db954] active:opacity-50"><Shuffle size={24} /></button>
                <button onClick={playPrev} className="text-white active:opacity-50"><SkipBack size={36} fill="white" stroke="white" /></button>
                <button onClick={() => setIsPlaying(!isPlaying)} className="w-[64px] h-[64px] rounded-full bg-white flex items-center justify-center text-black active:scale-95 transition-transform shadow-lg">
                  {isPlaying ? <Pause fill="black" stroke="black" size={26} /> : <Play fill="black" stroke="black" size={28} className="translate-x-[2px]" />}
                </button>
                <button onClick={playNext} className="text-white active:opacity-50"><SkipForward size={36} fill="white" stroke="white" /></button>
                <button className="text-white/70 active:opacity-50"><Repeat size={24} /></button>
              </div>

              <div className="flex items-center justify-between text-[#b3b3b3] w-full px-1 drop-shadow-md">
                <button className="active:opacity-50"><MonitorSpeaker size={20} /></button>
                <div className="flex items-center gap-6">
                  <button className="active:opacity-50"><ListMusic size={20} /></button>
                </div>
              </div>
            </div>
          </div>

          {/* PAGE 2: Lyrics & Artist Cards */}
          <div className="w-full px-5 pb-20 flex flex-col gap-6">
            
            {/* Spotify Lyrics Card (Solid Color & Huge Text) */}
            {lyrics.length > 0 && (
              <div 
                className="rounded-xl p-6 w-full mx-auto shadow-2xl relative overflow-hidden transition-colors duration-500" 
                style={{ backgroundColor: dominantColor, filter: 'brightness(0.75)' }} // Solid darkened card color
              >
                <div className="flex items-center justify-between mb-6 sticky top-0 bg-transparent z-10">
                  <h3 className="text-white font-bold text-[18px]">Lyrics</h3>
                  <button className="p-2 text-white/80 hover:text-white rounded-full bg-black/30"><Maximize2 size={16} /></button>
                </div>
                
                {/* Lyrics Container (Scrolls Internally) */}
                <div className="flex flex-col gap-5 max-h-[400px] overflow-y-auto scrollbar-hide pb-10" ref={lyricsContainerRef}>
                  {lyrics.map((line, idx) => {
                    const isActive = idx === activeLyricIndex;
                    const isPast = idx < activeLyricIndex;
                    return (
                      <p 
                        key={idx} 
                        ref={isActive ? activeLyricRef : null}
                        onClick={() => handleLyricClick(line.time)} // Click to Sync
                        className={`cursor-pointer transition-all duration-300 hover:text-white ${isActive ? 'text-white text-[24px] font-bold drop-shadow-lg' : isPast ? 'text-white/60 text-[20px] font-semibold' : 'text-white/30 text-[20px] font-semibold'}`}
                      >
                        {line.words || '♪'}
                      </p>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Artist Card */}
            <div className="bg-[#1e1e1e] rounded-xl w-full mx-auto mb-10 overflow-hidden relative shadow-lg h-[220px] group cursor-pointer border border-white/5">
              <img src={artistImgToShow} className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500" alt={artistNameToShow} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
              <div className="absolute bottom-6 left-6 flex flex-col">
                <span className="text-white/80 text-[12px] uppercase tracking-widest font-bold mb-1">Artist</span>
                <span className="text-white font-bold text-3xl drop-shadow-lg">{artistNameToShow}</span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* MOBILE MINI PLAYER */}
      <div 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => setIsExpanded(true)}
        className={`md:hidden fixed bottom-[65px] left-[8px] right-[8px] h-[56px] rounded-[6px] z-[99990] cursor-pointer overflow-hidden transition-all duration-[400ms] shadow-md ${isExpanded ? 'opacity-0 pointer-events-none translate-y-6 scale-[0.98]' : 'opacity-100 translate-y-0 scale-100'}`}
        style={{ backgroundColor: dominantColor, transform: swipeX > 0 ? `translateX(${swipeX}px)` : undefined, transition: swipeX === 0 && !isExpanded ? 'transform 0.4s ease-out, opacity 0.4s' : 'none' }}
      >
        <div className="absolute inset-0 bg-black/25 z-0 pointer-events-none" />
        
        <div className="relative z-10 w-full h-full flex items-center px-2">
          <div className="w-[40px] h-[40px] flex-shrink-0 rounded-[4px] shadow-sm overflow-hidden bg-[#282828] relative mr-3">
            {loading && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Loader2 size={16} className="animate-spin text-white" /></div>}
            <img src={coverImage} alt="cover" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col flex-1 min-w-0 pr-3 justify-center">
            <MarqueeText text={title} className="text-[13px] font-bold text-white leading-tight mb-[2px]" />
            <MarqueeText text={artists} className="text-[12px] font-medium text-white/70 leading-tight" />
          </div>
          <div className="flex items-center gap-4 flex-shrink-0 pr-2 text-white">
            <button className="active:scale-75 transition-transform" onClick={(e) => { e.stopPropagation(); }}><MonitorSpeaker size={20} className="text-[#1db954]" /></button>
            <button className="active:scale-75 transition-transform" onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }}>
              {isPlaying ? <Pause fill="white" stroke="white" size={24} /> : <Play fill="white" stroke="white" size={24} className="translate-x-[1px]" />}
            </button>
          </div>
        </div>
        <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-white/20 rounded-full z-20 pointer-events-none overflow-hidden">
          <div className="h-full bg-white rounded-full transition-all duration-300 ease-linear" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </>
  );
}
