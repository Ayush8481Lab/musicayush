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

// --- MAIN PLAYER COMPONENT ---
export default function Player() {
  const { currentSong, isPlaying, setIsPlaying, setCurrentSong, queue } = useAppContext();
  
  const[audioUrl, setAudioUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isExpanded, setIsExpanded] = useState(false);
  const [dominantColor, setDominantColor] = useState("rgb(83, 83, 83)");
  
  // Swipe mechanics
  const [swipeX, setSwipeX] = useState(0);
  const touchStartX = useRef(0);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  const title = currentSong ? decodeEntities(currentSong.title || currentSong.name || "Unknown") : "";
  const artists = currentSong ? decodeEntities(getArtists(currentSong)) : "";
  const coverImage = currentSong ? getImageUrl(currentSong.image) : "";

  // 1. Precise Spotify Accent Color Extraction
  useEffect(() => {
    if (!coverImage) return;
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = coverImage;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      // Scale down drastically for speed and average approximation
      canvas.width = 50; 
      canvas.height = 50;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, 50, 50);
      try {
        const data = ctx.getImageData(0, 0, 50, 50).data;
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 16) {
          const brightness = (data[i] + data[i+1] + data[i+2]) / 3;
          // Ignore mud, blacks, and pure whites to extract only the rich tone
          if (brightness > 30 && brightness < 200) {
            r += data[i]; g += data[i+1]; b += data[i+2]; count++;
          }
        }
        if (count > 0) {
          setDominantColor(`rgb(${Math.floor(r/count)}, ${Math.floor(g/count)}, ${Math.floor(b/count)})`);
        } else {
          setDominantColor("rgb(83, 83, 83)");
        }
      } catch (e) { setDominantColor("rgb(30, 30, 30)"); }
    };
  }, [coverImage]);

  // 2. Audio Fetching & Controls
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
      audioRef.current.volume = volume / 100;
      if (isPlaying) { const p = audioRef.current.play(); if (p !== undefined) p.catch(() => {}); }
      else audioRef.current.pause();
    }
  }, [isPlaying, audioUrl]);

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

  // 3. Pixel-Perfect Mobile Swipe to Close (60% threshold)
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchMove = (e: React.TouchEvent) => {
    const diff = e.touches[0].clientX - touchStartX.current;
    if (diff > 0) setSwipeX(diff);
  };
  const handleTouchEnd = () => {
    if (swipeX > window.innerWidth * 0.6) {
      setCurrentSong(null); setIsPlaying(false); setIsExpanded(false);
    }
    setSwipeX(0); 
  };

  if (!currentSong) return null;

  return (
    <>
      {/* 
        Exactly Mimicking Spotify's Complex CSS range inputs 
        No overlapping divs, pure highly-optimized pseudo-elements 
      */}
      <style dangerouslySetInnerHTML={{__html: `
        /* Reset Range */
        input[type=range] { -webkit-appearance: none; appearance: none; background: transparent; cursor: pointer; border-radius: 4px; }
        input[type=range]:focus { outline: none; }
        
        /* Desktop Range Slider (Hover reveals green & thumb) */
        .desktop-slider::-webkit-slider-runnable-track { height: 4px; border-radius: 2px; background: #4d4d4d; transition: background 0.1s; }
        .desktop-slider::-moz-range-track { height: 4px; border-radius: 2px; background: #4d4d4d; }
        
        .desktop-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; height: 12px; width: 12px; border-radius: 50%; background: #fff; margin-top: -4px; opacity: 0; box-shadow: 0 2px 4px rgba(0,0,0,0.5); border: 0; }
        .desktop-slider::-moz-range-thumb { height: 12px; width: 12px; border-radius: 50%; background: #fff; opacity: 0; border: 0; }
        
        .desktop-slider-group:hover .desktop-slider::-webkit-slider-thumb { opacity: 1; }
        .desktop-slider-group:hover .desktop-slider::-moz-range-thumb { opacity: 1; }
        .desktop-slider-group:hover .desktop-slider { --fill-color: #1db954 !important; }

        /* Mobile Range Slider (Thumb always visible) */
        .mobile-slider::-webkit-slider-runnable-track { height: 4px; border-radius: 2px; background: rgba(255,255,255,0.2); }
        .mobile-slider::-moz-range-track { height: 4px; border-radius: 2px; background: rgba(255,255,255,0.2); }
        
        .mobile-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; height: 12px; width: 12px; border-radius: 50%; background: #fff; margin-top: -4px; box-shadow: 0 2px 4px rgba(0,0,0,0.4); border: 0; }
        .mobile-slider::-moz-range-thumb { height: 12px; width: 12px; border-radius: 50%; background: #fff; border: 0; }
        
        /* Truncate animation fixes */
        .marquee-hover:hover { display: inline-block; animation: slide 6s linear infinite; }
        @keyframes slide { 0%, 20% { transform: translateX(0); } 80%, 100% { transform: translateX(calc(-100% + 200px)); } }
      `}} />

      <audio ref={audioRef} src={audioUrl} autoPlay={isPlaying} onEnded={playNext} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} />

      {/* =========================================================================
          DESKTOP BOTTOM BAR (Hidden on Mobile) 
          Height: 90px | Background: #000000
      ========================================================================= */}
      <div className="hidden md:flex fixed bottom-0 left-0 w-full h-[90px] bg-[#000000] z-[100] items-center px-4 justify-between border-t border-[#282828]">
        
        {/* LEFT COLUMN: Art & Info */}
        <div className="flex items-center w-[30%] min-w-[180px] gap-4">
          <div className="relative w-14 h-14 flex-shrink-0 bg-[#282828] rounded overflow-hidden shadow-md group">
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

        {/* CENTER COLUMN: Playback Controls */}
        <div className="flex flex-col items-center justify-center w-[40%] max-w-[722px] px-2">
          {/* Top Row Buttons */}
          <div className="flex items-center gap-6 mb-[6px]">
            <button className="text-[#1db954] hover:text-[#1ed760] transition-colors"><Shuffle size={16} /></button>
            <button onClick={playPrev} className="text-[#b3b3b3] hover:text-white transition-colors"><SkipBack size={16} fill="currentColor" /></button>
            <button onClick={() => setIsPlaying(!isPlaying)} className="w-8 h-8 rounded-full bg-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform text-black shadow-md">
              {isPlaying ? <Pause fill="black" size={14} className="ml-0" /> : <Play fill="black" size={14} className="ml-[2px]" />}
            </button>
            <button onClick={playNext} className="text-[#b3b3b3] hover:text-white transition-colors"><SkipForward size={16} fill="currentColor" /></button>
            <button className="text-[#b3b3b3] hover:text-white transition-colors"><Repeat size={16} /></button>
          </div>
          
          {/* Seek Bar Row */}
          <div className="flex items-center gap-2 w-full desktop-slider-group">
            <span className="text-[11px] font-normal text-[#a7a7a7] min-w-[35px] text-right">{formatTime(currentTime)}</span>
            <input 
              type="range" min="0" max="100" value={duration > 0 ? progress : 0} onChange={handleSeek} 
              className="w-full desktop-slider"
              style={{ '--fill-color': '#fff', background: `linear-gradient(to right, var(--fill-color) ${progress}%, #4d4d4d ${progress}%)` } as any}
            />
            <span className="text-[11px] font-normal text-[#a7a7a7] min-w-[35px]">{formatTime(duration)}</span>
          </div>
        </div>

        {/* RIGHT COLUMN: Volume & Extras */}
        <div className="flex items-center justify-end w-[30%] min-w-[180px] gap-3 text-[#b3b3b3]">
          <button className="hover:text-white transition-colors"><SquarePlay size={16} /></button>
          <button className="hover:text-white transition-colors"><Mic2 size={16} /></button>
          <button className="hover:text-white transition-colors"><ListMusic size={16} /></button>
          <button className="hover:text-white transition-colors"><MonitorSpeaker size={16} /></button>
          
          <div className="flex items-center gap-2 w-[93px] desktop-slider-group">
            <button onClick={() => setVolume(volume > 0 ? 0 : 100)} className="hover:text-white transition-colors flex-shrink-0">
              {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <input 
              type="range" min="0" max="100" value={volume} onChange={handleVolume} 
              className="w-full desktop-slider"
              style={{ '--fill-color': '#fff', background: `linear-gradient(to right, var(--fill-color) ${volume}%, #4d4d4d ${volume}%)` } as any}
            />
          </div>
          <button className="hover:text-white transition-colors"><Maximize2 size={16} /></button>
        </div>
      </div>


      {/* =========================================================================
          MOBILE FULL SCREEN OVERLAY
      ========================================================================= */}
      <div className={`md:hidden fixed inset-0 z-[110] flex flex-col text-white transition-transform duration-500 ease-in-out ${isExpanded ? "translate-y-0" : "translate-y-full"}`} 
           style={{ background: `linear-gradient(to bottom, ${dominantColor} 0%, #121212 100%)` }}>
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 pt-safe-top mt-4 pb-4 flex-shrink-0">
          <button onClick={() => setIsExpanded(false)} className="p-2 -ml-2 text-white active:opacity-50"><ChevronDown size={28} /></button>
          <div className="flex flex-col items-center flex-1 min-w-0">
            <span className="text-[10px] tracking-widest text-white/70 uppercase truncate w-full text-center font-medium">Playing from playlist</span>
            <span className="text-[13px] font-bold text-white truncate w-full text-center mt-[2px]">Liked Songs</span>
          </div>
          <button className="p-2 -mr-2 text-white active:opacity-50"><MoreHorizontal size={24} /></button>
        </div>

        {/* Responsive Album Art Box */}
        {/* flex-1 min-h-0 allows it to shrink smoothly on small phones */}
        <div className="flex-1 w-full px-6 flex items-center justify-center min-h-0">
          <div className="w-full max-w-[400px] aspect-square rounded-sm overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.4)] relative bg-[#282828]">
            {loading && <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10"><Loader2 size={40} className="animate-spin text-white" /></div>}
            <img src={coverImage} alt="cover" className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Bottom Controls Panel (Fixed structure) */}
        <div className="w-full px-6 pb-safe-bottom mb-8 pt-4 flex flex-col justify-end flex-shrink-0">
          
          {/* Title & Heart */}
          <div className="flex items-end justify-between mb-6">
            <div className="flex flex-col overflow-hidden pr-4 flex-1">
              <span className="text-[22px] font-bold text-white truncate w-full tracking-tight">{title}</span>
              <span className="text-[15px] font-medium text-[#b3b3b3] truncate w-full mt-1">{artists}</span>
            </div>
            <button className="text-white flex-shrink-0 ml-2 mb-1 active:scale-75 transition-transform"><Heart size={26} /></button>
          </div>

          {/* Mobile Seek Bar */}
          <div className="w-full flex flex-col gap-1 mb-5 relative">
            <input 
              type="range" min="0" max="100" value={duration > 0 ? progress : 0} onChange={handleSeek} 
              className="w-full mobile-slider relative z-10"
              style={{ background: `linear-gradient(to right, #fff ${progress}%, rgba(255,255,255,0.2) ${progress}%)` }}
            />
            <div className="flex items-center justify-between text-[11px] font-medium text-[#a7a7a7] mt-1 w-full pointer-events-none">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Main Controls */}
          <div className="flex items-center justify-between w-full mb-6 px-1">
            <button className="text-[#1db954] active:opacity-50"><Shuffle size={24} /></button>
            <button onClick={playPrev} className="text-white active:opacity-50"><SkipBack size={36} fill="white" stroke="white" /></button>
            <button onClick={() => setIsPlaying(!isPlaying)} className="w-[64px] h-[64px] rounded-full bg-white flex items-center justify-center text-black active:scale-95 transition-transform shadow-lg">
              {isPlaying ? <Pause fill="black" stroke="black" size={26} /> : <Play fill="black" stroke="black" size={28} className="translate-x-[2px]" />}
            </button>
            <button onClick={playNext} className="text-white active:opacity-50"><SkipForward size={36} fill="white" stroke="white" /></button>
            <button className="text-white/70 active:opacity-50"><Repeat size={24} /></button>
          </div>

          {/* Footer Sub-actions */}
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
        className={`md:hidden fixed bottom-[65px] left-[8px] right-[8px] h-[56px] rounded-[6px] z-[105] cursor-pointer overflow-hidden transition-all duration-300 shadow-md ${isExpanded ? 'opacity-0 pointer-events-none translate-y-4' : 'opacity-100 translate-y-0'}`}
        style={{ 
          backgroundColor: dominantColor,
          transform: swipeX > 0 ? `translateX(${swipeX}px)` : undefined,
          transition: swipeX === 0 && !isExpanded ? 'transform 0.3s ease-out, opacity 0.3s' : 'none'
        }}
      >
        {/* Subtle Darkening Overlay */}
        <div className="absolute inset-0 bg-black/20 z-0 pointer-events-none" />
        
        {/* Content */}
        <div className="relative z-10 w-full h-full flex items-center px-2">
          
          <div className="w-[40px] h-[40px] flex-shrink-0 rounded-[4px] shadow-sm overflow-hidden bg-[#282828] relative mr-3">
            {loading && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Loader2 size={16} className="animate-spin text-white" /></div>}
            <img src={coverImage} alt="cover" className="w-full h-full object-cover" />
          </div>

          <div className="flex flex-col flex-1 min-w-0 pr-3 justify-center">
            <span className="text-[13px] font-bold text-white truncate w-full tracking-tight leading-tight mb-[2px]">{title}</span>
            <span className="text-[12px] font-medium text-white/70 truncate w-full leading-tight">{artists}</span>
          </div>

          <div className="flex items-center gap-4 flex-shrink-0 pr-2 text-white">
            <button className="active:scale-75 transition-transform" onClick={(e) => { e.stopPropagation(); /* Connect logic */ }}><MonitorSpeaker size={20} className="text-[#1db954]" /></button>
            <button className="active:scale-75 transition-transform" onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }}>
              {isPlaying ? <Pause fill="white" stroke="white" size={24} /> : <Play fill="white" stroke="white" size={24} className="translate-x-[1px]" />}
            </button>
          </div>

        </div>

        {/* 2px Absolute Bottom Mini Progress Bar */}
        <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-white/20 rounded-full z-20 pointer-events-none overflow-hidden">
          <div className="h-full bg-white rounded-full transition-all duration-300 ease-linear" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </>
  );
}
