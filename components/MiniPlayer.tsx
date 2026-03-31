/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState, useRef } from "react";
import { useAppContext } from "../context/AppContext";
import { Play, Pause, SkipForward, SkipBack, Loader2, ChevronDown } from "lucide-react";

// Robust HTML Entity Decoder
const decodeEntities = (text: string) => {
  if (!text) return "";
  let decoded = text.replace(/&amp;/g, "&"); 
  return decoded
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&apos;/g, "'");
};

// Extracts artist correctly
const getArtists = (data: any) => {
  let names: string[] =[];
  if (data?.artists?.primary && Array.isArray(data.artists.primary)) {
    names = data.artists.primary.map((a: any) => a.name);
  } else if (Array.isArray(data?.artists)) {
    names = data.artists.slice(0, 4).map((a: any) => a.name);
  } else if (typeof data?.artists === "string") {
    names = data.artists.split(",").map((n: string) => n.trim());
  } else if (data?.primaryArtists) {
    names = data.primaryArtists.split(",").map((n: string) => n.trim());
  } else if (data?.singers) {
    names = data.singers.split(",").map((n: string) => n.trim());
  } else {
    return "Unknown Artist";
  }
  return Array.from(new Set(names)).join(", ");
};

const getImageUrl = (img: any) => {
  if (!img) return "https://via.placeholder.com/500";
  if (typeof img === "string") return img.replace("50x50", "500x500").replace("150x150", "500x500");
  if (Array.isArray(img)) return img[img.length - 1]?.url || img[0]?.url;
  return "https://via.placeholder.com/500";
};

// Helper to format time (e.g., 65 -> "1:05")
const formatTime = (time: number) => {
  if (!time || isNaN(time)) return "0:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
};

const MiniPingPongMarquee = ({ text, isSub, isMain = false }: { text: string, isSub?: boolean, isMain?: boolean }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [overflowWidth, setOverflowWidth] = useState(0);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        const cWidth = containerRef.current.offsetWidth;
        const tWidth = textRef.current.scrollWidth;
        setOverflowWidth(tWidth > cWidth ? tWidth - cWidth + 10 : 0);
      }
    };
    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  },[text]);

  return (
    <div ref={containerRef} className="relative overflow-hidden whitespace-nowrap w-full mask-linear-fade-mini">
      <div 
        ref={textRef}
        className={`inline-block ${overflowWidth > 0 ? "animate-ping-pong-mini" : ""} ${
          isMain 
            ? (isSub ? "text-lg text-white/70 font-medium" : "text-2xl font-bold text-white") 
            : (isSub ? "text-xs text-white/70 font-medium" : "text-[15px] font-bold text-white")
        } transition-colors`}
        style={{ '--overflow-dist': `-${overflowWidth}px` } as React.CSSProperties}
      >
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
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false); // Controls Main Player Overlay
  
  const audioRef = useRef<HTMLAudioElement>(null);

  const title = currentSong ? (currentSong.title || currentSong.name || "Unknown") : "Loading...";
  const artists = currentSong ? getArtists(currentSong) : "Unknown Artist";
  const coverImage = currentSong ? getImageUrl(currentSong.image) : "";

  useEffect(() => {
    if (!currentSong) {
      setAudioUrl("");
      setIsPlaying(false);
      return;
    }

    const fetchPlayableUrl = async () => {
      setLoading(true);
      try {
        if (currentSong.downloadUrl && currentSong.downloadUrl.length > 0) {
          setAudioUrl(currentSong.downloadUrl[currentSong.downloadUrl.length - 1].url);
        } else {
          const link = currentSong.url || currentSong.perma_url;
          const res = await fetch(`https://ayushm-psi.vercel.app/api/songs?link=${encodeURIComponent(link)}`);
          const json = await res.json();
          if (json.data && json.data[0]?.downloadUrl) {
            const urls = json.data[0].downloadUrl;
            setAudioUrl(urls[urls.length - 1].url);
          }
        }
      } catch (error) {
        console.error("Error fetching audio", error);
      }
      setLoading(false);
    };

    fetchPlayableUrl();
  }, [currentSong]);

  useEffect(() => {
    if (audioRef.current && audioUrl) {
      if (isPlaying) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => console.log("Buffering/Autoplay prevented:", e));
        }
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, audioUrl]);

  // FEATURE 1: System Notification & Media Keys Integration
  useEffect(() => {
    if ('mediaSession' in navigator && currentSong) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: decodeEntities(title),
        artist: decodeEntities(artists),
        artwork: [
          { src: coverImage, sizes: '96x96', type: 'image/jpeg' },
          { src: coverImage, sizes: '128x128', type: 'image/jpeg' },
          { src: coverImage, sizes: '192x192', type: 'image/jpeg' },
          { src: coverImage, sizes: '256x256', type: 'image/jpeg' },
          { src: coverImage, sizes: '512x512', type: 'image/jpeg' },
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true));
      navigator.mediaSession.setActionHandler('pause', () => setIsPlaying(false));
      navigator.mediaSession.setActionHandler('previoustrack', playPrev);
      navigator.mediaSession.setActionHandler('nexttrack', playNext);
    }
  }, [currentSong, title, artists, coverImage, isPlaying]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const total = audioRef.current.duration;
      setCurrentTime(current);
      setDuration(total || 0);
      if (total > 0) setProgress((current / total) * 100);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setProgress(val);
    if (audioRef.current && duration > 0) {
      audioRef.current.currentTime = (val / 100) * duration;
    }
  };

  const playNext = () => {
    if (!queue || queue.length === 0) return;
    const currentIndex = queue.findIndex((s: any) => s.id === currentSong.id);
    if (currentIndex !== -1 && currentIndex < queue.length - 1) {
      setCurrentSong(queue[currentIndex + 1]);
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
      setProgress(0);
    }
  };

  const playPrev = () => {
    if (!queue || queue.length === 0) return;
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    const currentIndex = queue.findIndex((s: any) => s.id === currentSong.id);
    if (currentIndex > 0) {
      setCurrentSong(queue[currentIndex - 1]);
      setIsPlaying(true);
    }
  };

  if (!currentSong) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes ping-pong-mini {
          0%, 15% { transform: translateX(0); }
          85%, 100% { transform: translateX(var(--overflow-dist)); }
        }
        .animate-ping-pong-mini { animation: ping-pong-mini 5s ease-in-out infinite alternate; }
        .mask-linear-fade-mini { mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent); -webkit-mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent); }
        
        /* Custom Seekbar styling */
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 12px; width: 12px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          margin-top: -4px;
        }
        input[type=range]::-webkit-slider-runnable-track {
          width: 100%; height: 4px;
          cursor: pointer;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
        }
      `}} />

      <audio 
        ref={audioRef} 
        src={audioUrl} 
        autoPlay={isPlaying} 
        onEnded={playNext}
        onTimeUpdate={handleTimeUpdate}
      />

      {/* FEATURE 2: MAIN PLAYER OVERLAY */}
      <div className={`fixed inset-0 z-[100] bg-black text-white transition-transform duration-500 ease-in-out ${isExpanded ? "translate-y-0" : "translate-y-full"} overflow-hidden flex flex-col`}>
        {/* Dynamic Background */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="w-full h-full bg-center bg-cover opacity-60" style={{ backgroundImage: `url(${coverImage})`, filter: 'blur(50px) saturate(150%)', transform: 'scale(1.2)' }} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black" />
        </div>

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between px-6 pt-12 pb-4">
          <button onClick={() => setIsExpanded(false)} className="p-2 -ml-2 text-white/80 hover:text-white transition-colors rounded-full active:scale-90">
            <ChevronDown size={32} />
          </button>
          <span className="text-xs font-semibold tracking-widest text-white/70 uppercase">Now Playing</span>
          <div className="w-10"></div> {/* Spacer to center the header text */}
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col flex-1 px-8 pb-12 w-full max-w-md mx-auto justify-center">
          {/* Main Image */}
          <div className="relative w-full aspect-square rounded-xl overflow-hidden shadow-2xl mb-10 border border-white/10">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <Loader2 className="animate-spin text-[#1ed760]" size={40} />
              </div>
            ) : null}
            <img src={coverImage} alt="cover" className="w-full h-full object-cover" />
          </div>

          {/* Song Info */}
          <div className="flex flex-col mb-8 w-full overflow-hidden">
            <MiniPingPongMarquee text={title} isMain={true} />
            <MiniPingPongMarquee text={artists} isSub={true} isMain={true} />
          </div>

          {/* Seek Bar */}
          <div className="w-full flex flex-col gap-2 mb-8 group">
            <input 
              type="range" 
              min="0" max="100" 
              value={progress} 
              onChange={handleSeek}
              className="w-full appearance-none bg-transparent focus:outline-none"
              style={{
                background: `linear-gradient(to right, white ${progress}%, rgba(255,255,255,0.2) ${progress}%)`
              }}
            />
            <div className="flex justify-between text-xs font-medium text-white/50">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-8">
            <button onClick={playPrev} className="text-white hover:scale-110 active:scale-95 transition-all">
              <SkipBack size={36} fill="currentColor" />
            </button>
            <button 
              disabled={loading} 
              onClick={() => setIsPlaying(!isPlaying)} 
              className={`w-20 h-20 flex items-center justify-center rounded-full bg-white text-black hover:scale-105 active:scale-95 transition-all shadow-xl ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isPlaying ? <Pause fill="black" size={32} /> : <Play fill="black" size={32} className="ml-2" />}
            </button>
            <button onClick={playNext} className="text-white hover:scale-110 active:scale-95 transition-all">
              <SkipForward size={36} fill="currentColor" />
            </button>
          </div>
        </div>
      </div>


      {/* MINI PLAYER (Visible when Not Expanded) */}
      <div 
        onClick={() => setIsExpanded(true)}
        className={`fixed bottom-[75px] left-2 right-2 md:left-1/2 md:-translate-x-1/2 md:w-[500px] h-[64px] rounded-xl overflow-hidden shadow-2xl border border-white/5 z-[99] bg-black group cursor-pointer active:scale-[0.98] transition-all duration-300 ${isExpanded ? 'opacity-0 pointer-events-none scale-90' : 'opacity-100 scale-100'}`}
      >
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="w-full h-full bg-center bg-cover" style={{ backgroundImage: `url(${coverImage})`, filter: 'blur(30px) saturate(200%)', transform: 'scale(4)' }} />
          <div className="absolute inset-0 bg-black/40" />
        </div>

        <div className="absolute bottom-0 left-0 w-full h-[3px] bg-black/20 z-20">
          <div className="h-full bg-[#1ed760] transition-all duration-300 ease-linear rounded-r-full shadow-[0_0_8px_#1ed760]" style={{ width: `${progress}%` }} />
        </div>

        <div className="relative z-10 flex items-center justify-between h-full px-3 w-full pb-[3px]">
          <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0 pr-2">
            <div className="relative w-11 h-11 flex-shrink-0 bg-white/10 rounded-md overflow-hidden shadow-lg border border-white/5">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                  <Loader2 className="animate-spin text-[#1ed760]" size={20} />
                </div>
              ) : null}
              <img src={coverImage} alt="cover" className="w-full h-full object-cover" />
            </div>

            <div className="flex flex-col overflow-hidden w-full gap-[1px] justify-center">
              <MiniPingPongMarquee text={title} />
              <MiniPingPongMarquee text={artists} isSub={true} />
            </div>
          </div>

          <div className="flex items-center gap-4 flex-shrink-0 pl-2">
            <button onClick={(e) => { e.stopPropagation(); playPrev(); }} className="text-white/80 hover:text-white active:scale-90 transition-all hidden sm:block">
              <SkipBack size={24} fill="currentColor" />
            </button>

            <button disabled={loading} onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }} className={`w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-90 ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10'}`}>
              {isPlaying ? <Pause fill="white" size={26} /> : <Play fill="white" size={26} className="ml-1" />}
            </button>

            <button onClick={(e) => { e.stopPropagation(); playNext(); }} className="text-white/80 hover:text-white active:scale-90 transition-all">
              <SkipForward size={24} fill="currentColor" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
