/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
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

// PingPong Marquee Component
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
  
  const[audioUrl, setAudioUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const[isExpanded, setIsExpanded] = useState(false);
  const [dominantColor, setDominantColor] = useState("rgb(20, 20, 20)");
  
  const audioRef = useRef<HTMLAudioElement>(null);

  const title = currentSong ? (currentSong.title || currentSong.name || "Unknown") : "Loading...";
  const artists = currentSong ? getArtists(currentSong) : "Unknown Artist";
  const coverImage = currentSong ? getImageUrl(currentSong.image) : "";

  // 1. DYNAMIC COLOR EXTRACTION VIA CANVAS
  useEffect(() => {
    if (!coverImage) return;
    const img = new Image();
    img.crossOrigin = "Anonymous"; // Prevents CORS Tainted Canvas issues
    img.src = coverImage;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      try {
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let r = 0, g = 0, b = 0, count = 0;
        // Sample every 40th pixel for performance
        for (let i = 0; i < data.length; i += 160) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
        setDominantColor(`rgb(${Math.floor(r / count)}, ${Math.floor(g / count)}, ${Math.floor(b / count)})`);
      } catch (e) {
        console.warn("Canvas Tainted, using fallback dark theme", e);
        setDominantColor("rgb(30, 30, 30)");
      }
    };
  },[coverImage]);

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

  // 2. MEDIA SESSION METADATA & CONTROLS
  useEffect(() => {
    if ('mediaSession' in navigator && currentSong) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: decodeEntities(title),
        artist: decodeEntities(artists),
        artwork:[
          { src: coverImage, sizes: '96x96', type: 'image/jpeg' },
          { src: coverImage, sizes: '512x512', type: 'image/jpeg' },
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true));
      navigator.mediaSession.setActionHandler('pause', () => setIsPlaying(false));
      navigator.mediaSession.setActionHandler('previoustrack', playPrev);
      navigator.mediaSession.setActionHandler('nexttrack', playNext);
    }
  }, [currentSong, title, artists, coverImage, setIsPlaying]);

  // 3. MEDIA SESSION DURATION SYNC (For Notification Progress Bar)
  const syncMediaSessionPosition = useCallback(() => {
    if ('mediaSession' in navigator && audioRef.current && duration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: duration,
          playbackRate: 1,
          position: audioRef.current.currentTime,
        });
      } catch (err) {
        // Ignore if duration is infinite or position is invalid
      }
    }
  }, [duration]);

  // Sync position on Play/Pause to keep the OS notification updated
  useEffect(() => {
    syncMediaSessionPosition();
  }, [isPlaying, syncMediaSessionPosition]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const total = audioRef.current.duration;
      setCurrentTime(current);
      setDuration(total || 0);
      if (total > 0) setProgress((current / total) * 100);
      
      // We only call setPositionState when the song first loads its duration to save performance
      if (total > 0 && duration === 0) {
        syncMediaSessionPosition();
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setProgress(val);
    if (audioRef.current && duration > 0) {
      const newTime = (val / 100) * duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      // Immediately sync OS notification when seeking
      syncMediaSessionPosition();
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
        
        /* Modern Apple-Music style Seekbar */
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 12px; width: 12px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          margin-top: -4px;
          box-shadow: 0 0 4px rgba(0,0,0,0.5);
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
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
      />

      {/* --- MAIN PLAYER OVERLAY --- */}
      <div 
        className={`fixed inset-0 z-[100] text-white transition-transform duration-500 ease-out ${isExpanded ? "translate-y-0" : "translate-y-full"}`}
        style={{
          background: `linear-gradient(145deg, ${dominantColor} 0%, #000000 80%)`,
        }}
      >
        <div className="flex flex-col h-full max-h-screen pt-8 pb-10 px-6 sm:px-10 max-w-lg mx-auto overflow-hidden">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-4 flex-shrink-0 pt-safe">
            <button onClick={() => setIsExpanded(false)} className="p-2 -ml-2 text-white/80 hover:text-white transition-colors rounded-full active:scale-90">
              <ChevronDown size={32} />
            </button>
            <span className="text-xs font-semibold tracking-widest text-white/70 uppercase">Now Playing</span>
            <div className="w-10"></div> {/* Spacer */}
          </div>

          {/* Dynamic Scaling Image Container */}
          <div className="flex-1 min-h-0 flex items-center justify-center py-6">
            <div className="relative w-full max-w-[340px] aspect-square rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-300">
              {loading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-md">
                  <Loader2 className="animate-spin text-[#1ed760]" size={40} />
                </div>
              )}
              <img src={coverImage} alt="cover" className={`w-full h-full object-cover transition-transform duration-500 ${isPlaying ? 'scale-100' : 'scale-[0.97]'}`} />
            </div>
          </div>

          {/* Bottom Controls Area (Fixed spacing) */}
          <div className="flex flex-col flex-shrink-0 w-full mb-safe">
            
            {/* Song Info */}
            <div className="flex flex-col mb-6 w-full overflow-hidden">
              <MiniPingPongMarquee text={title} isMain={true} />
              <div className="mt-1">
                <MiniPingPongMarquee text={artists} isSub={true} isMain={true} />
              </div>
            </div>

            {/* Seek Bar */}
            <div className="w-full flex flex-col gap-3 mb-8">
              <input 
                type="range" 
                min="0" max="100" 
                value={progress} 
                onChange={handleSeek}
                className="w-full appearance-none bg-transparent focus:outline-none h-4"
                style={{
                  background: `linear-gradient(to right, white ${progress}%, rgba(255,255,255,0.2) ${progress}%)`,
                  backgroundSize: '100% 4px',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center'
                }}
              />
              <div className="flex justify-between text-[13px] font-medium text-white/50">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-center gap-8 md:gap-10 pb-4">
              <button onClick={playPrev} className="text-white/80 hover:text-white hover:scale-110 active:scale-95 transition-all">
                <SkipBack size={38} fill="currentColor" stroke="currentColor" />
              </button>
              
              <button 
                disabled={loading} 
                onClick={() => setIsPlaying(!isPlaying)} 
                className={`w-20 h-20 flex items-center justify-center rounded-full bg-white text-black hover:scale-105 active:scale-95 transition-all shadow-xl ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {/* 4. OPTICALLY CENTERED SVG PLAY BUTTON */}
                {isPlaying ? (
                  <Pause fill="currentColor" stroke="currentColor" size={32} />
                ) : (
                  <Play fill="currentColor" stroke="currentColor" size={34} className="translate-x-[2px]" />
                )}
              </button>
              
              <button onClick={playNext} className="text-white/80 hover:text-white hover:scale-110 active:scale-95 transition-all">
                <SkipForward size={38} fill="currentColor" stroke="currentColor" />
              </button>
            </div>
            
          </div>
        </div>
      </div>


      {/* --- MINI PLAYER --- */}
      <div 
        onClick={() => setIsExpanded(true)}
        className={`fixed bottom-[75px] left-2 right-2 md:left-1/2 md:-translate-x-1/2 md:w-[500px] h-[64px] rounded-xl overflow-hidden shadow-2xl border border-white/10 z-[99] cursor-pointer active:scale-[0.98] transition-all duration-300 ${isExpanded ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100 scale-100'}`}
        style={{ background: dominantColor }}
      >
        <div className="absolute inset-0 bg-black/40 z-0 pointer-events-none" />

        <div className="absolute bottom-0 left-0 w-full h-[3px] bg-black/20 z-20">
          <div className="h-full bg-white transition-all duration-300 ease-linear rounded-r-full shadow-[0_0_8px_white]" style={{ width: `${progress}%` }} />
        </div>

        <div className="relative z-10 flex items-center justify-between h-full px-3 w-full pb-[3px]">
          <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0 pr-2">
            <div className="relative w-11 h-11 flex-shrink-0 rounded-md overflow-hidden shadow-md">
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                  <Loader2 className="animate-spin text-white" size={20} />
                </div>
              )}
              <img src={coverImage} alt="cover" className="w-full h-full object-cover" />
            </div>

            <div className="flex flex-col overflow-hidden w-full gap-[2px] justify-center">
              <MiniPingPongMarquee text={title} />
              <MiniPingPongMarquee text={artists} isSub={true} />
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0 pl-2">
            <button disabled={loading} onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-all active:scale-90">
              {isPlaying ? (
                <Pause fill="white" stroke="white" size={24} />
              ) : (
                <Play fill="white" stroke="white" size={24} className="translate-x-[2px]" />
              )}
            </button>
            <button onClick={(e) => { e.stopPropagation(); playNext(); }} className="w-10 h-10 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 rounded-full active:scale-90 transition-all">
              <SkipForward size={24} fill="currentColor" stroke="currentColor" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
