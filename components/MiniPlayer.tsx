/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useAppContext } from "../context/AppContext";
import { 
  Play, Pause, SkipForward, SkipBack, Loader2, ChevronDown, 
  MoreHorizontal, Shuffle, Repeat, Heart, List, Volume2, MonitorSpeaker
} from "lucide-react";

// Robust HTML Entity Decoder
const decodeEntities = (text: string) => {
  if (!text) return "";
  return text.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&apos;/g, "'");
};

// Extracts artist correctly
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

// PingPong Marquee Component
const Marquee = ({ text, className = "" }: { text: string, className?: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(0);

  useEffect(() => {
    const check = () => {
      if (containerRef.current && textRef.current) {
        const diff = textRef.current.scrollWidth - containerRef.current.offsetWidth;
        setOverflow(diff > 0 ? diff + 20 : 0);
      }
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [text]);

  return (
    <div ref={containerRef} className={`relative overflow-hidden whitespace-nowrap mask-linear-fade ${className}`}>
      <div ref={textRef} className={`inline-block ${overflow > 0 ? "animate-marquee" : ""}`} style={{ '--scroll-dist': `-${overflow}px` } as React.CSSProperties}>
        {decodeEntities(text)}
      </div>
    </div>
  );
};

export default function Player() {
  const { currentSong, isPlaying, setIsPlaying, setCurrentSong, queue } = useAppContext();
  
  const [audioUrl, setAudioUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const[currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const[dominantColor, setDominantColor] = useState("rgb(40, 40, 40)");
  const[swipeX, setSwipeX] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const touchStartX = useRef(0);

  const title = currentSong ? (currentSong.title || currentSong.name || "Unknown") : "";
  const artists = currentSong ? getArtists(currentSong) : "";
  const coverImage = currentSong ? getImageUrl(currentSong.image) : "";

  // 1. IMPROVED COLOR EXTRACTION
  useEffect(() => {
    if (!coverImage) return;
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = coverImage;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      try {
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 16) {
          const rV = data[i], gV = data[i+1], bV = data[i+2];
          const brightness = (rV + gV + bV) / 3;
          // Ignore mud, blacks, and pure whites to find the true vibrant color
          if (brightness > 30 && brightness < 220) {
            r += rV; g += gV; b += bV; count++;
          }
        }
        if (count > 0) {
          setDominantColor(`rgb(${Math.floor(r/count)}, ${Math.floor(g/count)}, ${Math.floor(b/count)})`);
        } else {
          setDominantColor("rgb(83, 83, 83)");
        }
      } catch (e) {
        setDominantColor("rgb(83, 83, 83)");
      }
    };
  }, [coverImage]);

  // Audio Fetching & Controls
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

  useEffect(() => {
    if (audioRef.current && audioUrl) {
      if (isPlaying) {
        const p = audioRef.current.play();
        if (p !== undefined) p.catch(() => {});
      } else audioRef.current.pause();
    }
  }, [isPlaying, audioUrl]);

  const syncPosition = useCallback(() => {
    if ('mediaSession' in navigator && audioRef.current && duration > 0) {
      try { navigator.mediaSession.setPositionState({ duration, playbackRate: 1, position: audioRef.current.currentTime }); } catch(e) {}
    }
  }, [duration]);

  useEffect(() => { syncPosition(); }, [isPlaying, syncPosition]);

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
      const newTime = (val / 100) * duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      syncPosition();
    }
  };

  const playNext = () => { /* Add actual queue logic here */ };
  const playPrev = () => { if (audioRef.current) audioRef.current.currentTime = 0; };

  // 2. SWIPE TO CLOSE LOGIC
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    const diff = e.touches[0].clientX - touchStartX.current;
    if (diff > 0) setSwipeX(diff); // Only allow swipe right
  };
  const handleTouchEnd = () => {
    if (swipeX > window.innerWidth * 0.6) {
      // Swipe was more than 60%, close player
      setCurrentSong(null);
      setIsPlaying(false);
    }
    setSwipeX(0); // Animate back if not closed
  };

  if (!currentSong) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee { 0%, 15% { transform: translateX(0); } 85%, 100% { transform: translateX(var(--scroll-dist)); } }
        .animate-marquee { animation: marquee 6s linear infinite alternate; }
        .mask-linear-fade { mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent); -webkit-mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent); }
        
        /* Spotify Slider Styling */
        input[type=range] { -webkit-appearance: none; background: transparent; cursor: pointer; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; height: 12px; width: 12px; border-radius: 50%; background: #fff; margin-top: -4px; opacity: 0; transition: opacity 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.5); }
        input[type=range]:hover::-webkit-slider-thumb, input[type=range]:active::-webkit-slider-thumb { opacity: 1; }
        input[type=range]::-webkit-slider-runnable-track { width: 100%; height: 4px; border-radius: 2px; background: rgba(255, 255, 255, 0.3); }
        
        .desktop-slider::-webkit-slider-thumb { opacity: 0; }
        .desktop-slider:hover::-webkit-slider-thumb { opacity: 1; }
        .desktop-slider:hover::-webkit-slider-runnable-track { background: rgba(255, 255, 255, 0.2); }
      `}} />

      <audio ref={audioRef} src={audioUrl} autoPlay={isPlaying} onEnded={playNext} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} />

      {/* =========================================================================
          DESKTOP BOTTOM BAR (Hidden on Mobile) - EXACT SPOTIFY DESKTOP UI
      ========================================================================= */}
      <div className="hidden md:flex fixed bottom-0 left-0 w-full h-[90px] bg-[#181818] border-t border-[#282828] z-[100] items-center px-4 justify-between">
        {/* Left: Art & Info */}
        <div className="flex items-center w-[30%] min-w-[180px] gap-4">
          <img src={coverImage} alt="cover" className="w-14 h-14 rounded shadow-md object-cover" />
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-normal text-white hover:underline cursor-pointer truncate">{title}</span>
            <span className="text-xs font-normal text-[#b3b3b3] hover:underline cursor-pointer truncate">{artists}</span>
          </div>
          <Heart size={16} className="text-[#b3b3b3] hover:text-white cursor-pointer ml-2" />
        </div>

        {/* Center: Controls */}
        <div className="flex flex-col items-center justify-center w-[40%] max-w-[722px]">
          <div className="flex items-center gap-6 mb-2">
            <Shuffle size={16} className="text-[#b3b3b3] hover:text-white cursor-pointer" />
            <SkipBack onClick={playPrev} size={20} className="text-[#b3b3b3] hover:text-white cursor-pointer" fill="currentColor" />
            <button onClick={() => setIsPlaying(!isPlaying)} className="w-8 h-8 rounded-full bg-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all text-black">
              {isPlaying ? <Pause fill="currentColor" size={16} /> : <Play fill="currentColor" size={16} className="translate-x-[1px]" />}
            </button>
            <SkipForward onClick={playNext} size={20} className="text-[#b3b3b3] hover:text-white cursor-pointer" fill="currentColor" />
            <Repeat size={16} className="text-[#b3b3b3] hover:text-white cursor-pointer" />
          </div>
          <div className="flex items-center w-full gap-2 group">
            <span className="text-[11px] text-[#a7a7a7] min-w-[35px] text-right">{formatTime(currentTime)}</span>
            <input type="range" min="0" max="100" value={progress} onChange={handleSeek} className="w-full h-1 desktop-slider group-hover:bg-[#1db954]" style={{ background: `linear-gradient(to right, ${progress > 0 ? (isExpanded ? '#fff' : 'white') : '#fff'} ${progress}%, #4d4d4d ${progress}%)` }} />
            <span className="text-[11px] text-[#a7a7a7] min-w-[35px]">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right: Extras */}
        <div className="flex items-center justify-end w-[30%] min-w-[180px] gap-4 text-[#b3b3b3]">
          <List size={16} className="hover:text-white cursor-pointer" />
          <MonitorSpeaker size={16} className="hover:text-white cursor-pointer" />
          <div className="flex items-center gap-2 w-[100px] group">
            <Volume2 size={16} className="hover:text-white cursor-pointer" />
            <div className="h-1 w-full bg-[#4d4d4d] rounded-full overflow-hidden group-hover:bg-[#1db954] cursor-pointer"><div className="h-full bg-white" style={{width: '70%'}}/></div>
          </div>
        </div>
      </div>


      {/* =========================================================================
          MOBILE FULL SCREEN PLAYER (Hidden on Desktop)
      ========================================================================= */}
      <div className={`md:hidden fixed inset-0 z-[110] flex flex-col text-white transition-transform duration-500 ease-in-out ${isExpanded ? "translate-y-0" : "translate-y-full"}`} style={{ backgroundImage: `linear-gradient(to bottom, ${dominantColor} 0%, #121212 100%)` }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-10 pb-4 flex-shrink-0">
          <button onClick={() => setIsExpanded(false)} className="p-2 -ml-2 text-white active:opacity-50"><ChevronDown size={28} /></button>
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold tracking-widest text-white/80 uppercase">Now playing from Playlist</span>
            <span className="text-xs font-bold text-white mt-[2px]">Liked Songs</span>
          </div>
          <button className="p-2 -mr-2 text-white active:opacity-50"><MoreHorizontal size={24} /></button>
        </div>

        {/* Art */}
        <div className="flex-1 w-full flex items-center justify-center px-6 min-h-0">
          <div className="w-full aspect-square shadow-[0_8px_40px_rgba(0,0,0,0.5)] rounded-lg overflow-hidden relative">
            {loading && <div className="absolute inset-0 flex items-center justify-center bg-black/40"><Loader2 className="animate-spin text-white" size={40} /></div>}
            <img src={coverImage} alt="cover" className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Controls Area */}
        <div className="px-6 pb-12 pt-2 flex-shrink-0">
          {/* Titles & Heart */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex flex-col overflow-hidden pr-4">
              <Marquee text={title} className="text-2xl font-bold text-white mb-1" />
              <Marquee text={artists} className="text-[15px] font-medium text-[#b3b3b3]" />
            </div>
            <Heart size={26} className="text-white flex-shrink-0 active:scale-75 transition-transform" />
          </div>

          {/* Progress Bar */}
          <div className="w-full flex flex-col gap-1 mb-6 relative">
            <input type="range" min="0" max="100" value={progress} onChange={handleSeek} className="w-full z-10 absolute -top-2 h-6 opacity-0 md:opacity-100 cursor-pointer" />
            <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden pointer-events-none">
              <div className="h-full bg-white rounded-full transition-all duration-150 ease-linear" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between text-[11px] font-bold text-[#a7a7a7] mt-1 pointer-events-none">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Play Controls */}
          <div className="flex items-center justify-between mb-4">
            <Shuffle size={24} className="text-[#1db954]" />
            <SkipBack onClick={playPrev} size={36} fill="white" className="active:opacity-50" />
            <button onClick={() => setIsPlaying(!isPlaying)} className="w-[68px] h-[68px] rounded-full bg-white text-black flex items-center justify-center shadow-lg active:scale-95 transition-transform">
              {isPlaying ? <Pause fill="black" stroke="black" size={28} /> : <Play fill="black" stroke="black" size={30} className="translate-x-[2px]" />}
            </button>
            <SkipForward onClick={playNext} size={36} fill="white" className="active:opacity-50" />
            <Repeat size={24} className="text-white/70" />
          </div>
          
          {/* Bottom Actions */}
          <div className="flex items-center justify-between pt-4 pb-2">
            <MonitorSpeaker size={20} className="text-[#a7a7a7]" />
            <div className="flex gap-6">
              <List size={20} className="text-[#a7a7a7]" />
            </div>
          </div>
        </div>
      </div>


      {/* =========================================================================
          MOBILE MINI PLAYER (Hidden on Desktop)
      ========================================================================= */}
      <div 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => setIsExpanded(true)}
        className={`md:hidden fixed bottom-[70px] left-2 right-2 h-[56px] rounded-md z-[105] cursor-pointer flex items-center px-2 shadow-lg transition-transform ${isExpanded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        style={{ 
          backgroundColor: dominantColor, 
          transform: `translateX(${swipeX}px)`,
          transition: swipeX === 0 ? 'transform 0.3s ease, opacity 0.3s' : 'none' 
        }}
      >
        <div className="absolute inset-0 bg-black/20 rounded-md z-0 pointer-events-none" />
        
        <div className="relative z-10 w-10 h-10 flex-shrink-0 rounded overflow-hidden shadow-sm mr-2">
          {loading && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Loader2 className="animate-spin text-white w-4 h-4" /></div>}
          <img src={coverImage} alt="cover" className="w-full h-full object-cover" />
        </div>

        <div className="relative z-10 flex flex-col flex-1 min-w-0 pr-2">
          <Marquee text={title} className="text-[13px] font-bold text-white mb-[1px]" />
          <Marquee text={artists} className="text-[11px] font-medium text-white/70" />
        </div>

        <div className="relative z-10 flex items-center gap-4 px-2">
          <Heart size={22} className="text-white active:scale-75 transition-transform" onClick={(e) => e.stopPropagation()} />
          <button onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }} className="w-8 h-8 flex items-center justify-center active:scale-90 transition-transform">
            {isPlaying ? <Pause fill="white" stroke="white" size={24} /> : <Play fill="white" stroke="white" size={24} className="translate-x-[1px]" />}
          </button>
        </div>

        {/* Mini Progress Bar Bottom Line */}
        <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-white/20 rounded-full overflow-hidden pointer-events-none">
          <div className="h-full bg-white rounded-full transition-all duration-300 ease-linear" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </>
  );
}
