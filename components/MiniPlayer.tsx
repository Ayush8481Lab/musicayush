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

// --- PERFECT MARQUEE COMPONENT ---
const MarqueeText = ({ text, className = "" }: { text: string, className?: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        // +2px buffer prevents rounding false positives
        setIsOverflowing(textRef.current.scrollWidth > containerRef.current.clientWidth + 2);
      }
    };
    checkOverflow();
    const timeout = setTimeout(checkOverflow, 150); // Fallback for custom fonts loading
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
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const[currentTime, setCurrentTime] = useState(0);
  const[duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const[isExpanded, setIsExpanded] = useState(false);
  const[dominantColor, setDominantColor] = useState("rgb(83, 83, 83)");
  
  // Swipe mechanics
  const[swipeX, setSwipeX] = useState(0);
  const touchStartX = useRef(0);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  const title = currentSong ? decodeEntities(currentSong.title || currentSong.name || "Unknown") : "";
  const artists = currentSong ? decodeEntities(getArtists(currentSong)) : "";
  const coverImage = currentSong ? getImageUrl(currentSong.image) : "";
  
  // Dynamic Context Header (Auto Playlist/Album Detection)
  const contextType = currentSong?.playlistName ? "PLAYLIST" : (currentSong?.album?.name ? "ALBUM" : "TRACK");
  const contextName = currentSong?.playlistName || currentSong?.album?.name || "Single";

  // 1. High-Fidelity Accent Color Extraction
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

  // 2. Audio Fetching
  useEffect(() => {
    if (!currentSong) return;
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
    fetchUrl();
  }, [currentSong]);

  // 3. Audio Execution
  useEffect(() => {
    if (audioRef.current && audioUrl) {
      audioRef.current.volume = volume / 100;
      if (isPlaying) { 
        const playPromise = audioRef.current.play(); 
        if (playPromise !== undefined) playPromise.catch(() => {}); 
      }
      else audioRef.current.pause();
    }
  }, [isPlaying, audioUrl, volume]);

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

  // 4. Smooth Swipe to Close Mechanics
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchMove = (e: React.TouchEvent) => {
    const diff = e.touches[0].clientX - touchStartX.current;
    if (diff > 0) setSwipeX(diff);
  };
  const handleTouchEnd = () => {
    if (swipeX > window.innerWidth * 0.45) { // Adjusted to 45% for a snappier dismiss feel
      setCurrentSong(null); setIsPlaying(false); setIsExpanded(false); 
    }
    setSwipeX(0); 
  };

  if (!currentSong) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        /* Premium Spotify Marquee */
        @keyframes spotify-marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-spotify-marquee { animation: spotify-marquee 12s linear infinite; display: inline-block; }
        .mask-edges { mask-image: linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%); -webkit-mask-image: linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%); }

        /* Pure CSS Apple/Spotify Sliders */
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

      {/* =========================================================================
          DESKTOP BOTTOM BAR (Hidden on Mobile) 
      ========================================================================= */}
      <div className="hidden md:flex fixed bottom-0 left-0 w-full h-[90px] bg-[#000000] z-[100] items-center px-4 justify-between border-t border-[#282828]">
        
        {/* Left Column: Art & Info */}
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

        {/* Center Column: Controls */}
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

        {/* Right Column: Volume & Extras */}
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

      {/* =========================================================================
          MOBILE FULL SCREEN OVERLAY
      ========================================================================= */}
      <div 
        className={`md:hidden fixed inset-0 z-[110] flex flex-col text-white transition-transform duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${isExpanded ? "translate-y-0" : "translate-y-full"}`} 
        style={{ background: `linear-gradient(to bottom, ${dominantColor} 0%, #121212 100%)` }}
      >
        {/* Dynamic Header */}
        <div className="flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-2 flex-shrink-0 w-full mt-4">
          <button onClick={() => setIsExpanded(false)} className="p-2 -ml-2 text-white active:opacity-50"><ChevronDown size={28} /></button>
          <div className="flex flex-col items-center flex-1 min-w-0 px-2">
            <span className="text-[10px] tracking-widest text-white/70 uppercase truncate w-full text-center font-medium">Playing from {contextType}</span>
            <span className="text-[13px] font-bold text-white truncate w-full text-center mt-[2px]">{contextName}</span>
          </div>
          <button className="p-2 -mr-2 text-white active:opacity-50"><MoreHorizontal size={24} /></button>
        </div>

        {/* 100% BULLETPROOF Auto-Adjusting Image Container */}
        {/* Mathematically fits any device screen perfectly using native aspect-ratio constraints */}
        <div className="flex-1 w-full min-h-0 flex items-center justify-center py-2 px-6">
          <div 
            className="relative bg-[#282828] rounded-[8px] shadow-[0_15px_40px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-300"
            style={{
              height: '100%',
              aspectRatio: '1 / 1',
              maxHeight: '450px', 
              maxWidth: 'min(calc(100vw - 48px), 450px)' // Prevents overlapping padding on sides
            }}
          >
            {loading && <div className="absolute inset-0 z-10 bg-black/50 flex items-center justify-center"><Loader2 size={40} className="animate-spin text-white" /></div>}
            <img src={coverImage} alt="cover" className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Bottom Controls Area */}
        <div className="w-full px-6 pb-[max(1rem,env(safe-area-inset-bottom))] mb-6 pt-2 flex flex-col justify-end flex-shrink-0">
          
          {/* Marquee Title & Heart */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex flex-col overflow-hidden pr-4 flex-1 min-w-0 w-full">
              <MarqueeText text={title} className="text-[22px] font-bold text-white tracking-tight leading-tight" />
              <MarqueeText text={artists} className="text-[15px] font-medium text-[#b3b3b3] mt-1" />
            </div>
            <button className="text-white flex-shrink-0 ml-2 active:scale-75 transition-transform"><Heart size={26} /></button>
          </div>

          {/* Progress Bar */}
          <div className="w-full flex flex-col gap-1 mb-5 relative">
            <input type="range" min="0" max="100" value={duration > 0 ? progress : 0} onChange={handleSeek} className="w-full mobile-slider relative z-10" style={{ background: `linear-gradient(to right, #fff ${progress}%, rgba(255,255,255,0.2) ${progress}%)` }} />
            <div className="flex items-center justify-between text-[11px] font-medium text-[#a7a7a7] mt-1 w-full pointer-events-none">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Main Controls Row */}
          <div className="flex items-center justify-between w-full mb-6 px-1">
            <button className="text-[#1db954] active:opacity-50"><Shuffle size={24} /></button>
            <button onClick={playPrev} className="text-white active:opacity-50"><SkipBack size={36} fill="white" stroke="white" /></button>
            <button onClick={() => setIsPlaying(!isPlaying)} className="w-[64px] h-[64px] rounded-full bg-white flex items-center justify-center text-black active:scale-95 transition-transform shadow-lg">
              {isPlaying ? <Pause fill="black" stroke="black" size={26} /> : <Play fill="black" stroke="black" size={28} className="translate-x-[2px]" />}
            </button>
            <button onClick={playNext} className="text-white active:opacity-50"><SkipForward size={36} fill="white" stroke="white" /></button>
            <button className="text-white/70 active:opacity-50"><Repeat size={24} /></button>
          </div>

          {/* Bottom Device/Queue Actions */}
          <div className="flex items-center justify-between text-[#b3b3b3] w-full px-1">
            <button className="active:opacity-50"><MonitorSpeaker size={20} /></button>
            <div className="flex items-center gap-6">
              <button className="active:opacity-50"><ListMusic size={20} /></button>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MOBILE MINI PLAYER (Floating at Bottom)
      ========================================================================= */}
      <div 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => setIsExpanded(true)}
        className={`md:hidden fixed bottom-[65px] left-[8px] right-[8px] h-[56px] rounded-[6px] z-[105] cursor-pointer overflow-hidden transition-all duration-[400ms] shadow-md ${isExpanded ? 'opacity-0 pointer-events-none translate-y-6 scale-[0.98]' : 'opacity-100 translate-y-0 scale-100'}`}
        style={{ 
          backgroundColor: dominantColor,
          transform: swipeX > 0 ? `translateX(${swipeX}px)` : undefined,
          transition: swipeX === 0 && !isExpanded ? 'transform 0.4s ease-out, opacity 0.4s' : 'none'
        }}
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
