/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState, useRef } from "react";
import { useAppContext } from "../context/AppContext";
import { Play, Pause, SkipForward, SkipBack, Loader2 } from "lucide-react";

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
  if (!img) return "https://via.placeholder.com/150";
  if (typeof img === "string") return img.replace("50x50", "500x500").replace("150x150", "500x500");
  if (Array.isArray(img)) return img[img.length - 1]?.url || img[0]?.url;
  return "https://via.placeholder.com/150";
};

const MiniPingPongMarquee = ({ text, isSub }: { text: string, isSub?: boolean }) => {
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
        className={`inline-block ${overflowWidth > 0 ? "animate-ping-pong-mini" : ""} ${isSub ? "text-xs text-white/70 font-medium" : "text-[15px] font-bold text-white"} transition-colors`}
        style={{ '--overflow-dist': `-${overflowWidth}px` } as React.CSSProperties}
      >
        {decodeEntities(text)}
      </div>
    </div>
  );
};

export default function MiniPlayer() {
  const { currentSong, isPlaying, setIsPlaying, setCurrentSong, queue } = useAppContext();
  
  const[audioUrl, setAudioUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [bgColor, setBgColor] = useState("#1a1a1a");
  const audioRef = useRef<HTMLAudioElement>(null);

  // VIBRANT COLOR EXTRACTOR (IGNORES WHITE & BLACK)
  useEffect(() => {
    if (!currentSong) return;
    const url = getImageUrl(currentSong.image);
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = url;
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 40; canvas.height = 40;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 40, 40);
        const data = ctx.getImageData(0, 0, 40, 40).data;
        
        let maxVibrancy = 0;
        let bestColor = [26, 26, 26];

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i+1], b = data[i+2];
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const vibrancy = max - min; // Difference between brightest and darkest channel
          
          if (max > 230 && min > 230) continue; // Skip near white
          if (max < 30) continue;               // Skip near black
          
          if (vibrancy > maxVibrancy) {
            maxVibrancy = vibrancy;
            bestColor = [r, g, b];
          }
        }

        if (maxVibrancy < 15) {
          // Mostly grayscale image, fallback to sleek dark
          setBgColor("#1a1a1a");
        } else {
          // Darken the vibrant color slightly to ensure white text pops beautifully
          setBgColor(`rgb(${Math.floor(bestColor[0]*0.45)}, ${Math.floor(bestColor[1]*0.45)}, ${Math.floor(bestColor[2]*0.45)})`);
        }
      } catch (e) {
        setBgColor("#1a1a1a");
      }
    };
  }, [currentSong]);

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

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const total = audioRef.current.duration;
      if (total > 0) setProgress((current / total) * 100);
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

  const coverImage = getImageUrl(currentSong.image);
  const title = currentSong.title || currentSong.name || "Loading...";
  const artists = getArtists(currentSong);

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes ping-pong-mini {
          0%, 15% { transform: translateX(0); }
          85%, 100% { transform: translateX(var(--overflow-dist)); }
        }
        .animate-ping-pong-mini { animation: ping-pong-mini 5s ease-in-out infinite alternate; }
        .mask-linear-fade-mini { mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent); -webkit-mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent); }
      `}} />

      {/* Dynamic Background extracted via Canvas */}
      <div 
        className="fixed bottom-[75px] left-2 right-2 md:left-1/2 md:-translate-x-1/2 md:w-[500px] h-[64px] rounded-xl overflow-hidden shadow-2xl border border-white/5 z-[99] group cursor-pointer active:scale-[0.98] transition-colors duration-700"
        style={{ backgroundColor: bgColor }}
      >
        {/* Soft dark gradient to give premium 3D feel over the solid color */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/20 pointer-events-none" />

        <audio 
          ref={audioRef} 
          src={audioUrl} 
          autoPlay={isPlaying} 
          onEnded={playNext}
          onTimeUpdate={handleTimeUpdate}
        />

        {/* Green Line positioned at the absolute bottom */}
        <div className="absolute bottom-0 left-0 w-full h-[3px] bg-black/20 z-20">
          <div className="h-full bg-[#1ed760] transition-all duration-300 ease-linear rounded-r-full shadow-[0_0_8px_#1ed760]" style={{ width: `${progress}%` }} />
        </div>

        <div className="relative z-10 flex items-center justify-between h-full px-3 w-full pb-[3px]">
          <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0 pr-2">
            <div className="relative w-11 h-11 flex-shrink-0 bg-black/20 rounded-md overflow-hidden shadow-lg border border-white/10">
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
