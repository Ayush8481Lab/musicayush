/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState, useRef } from "react";
import { useAppContext } from "../context/AppContext";
import { Play, Pause, SkipForward, SkipBack, Loader2 } from "lucide-react";

// Robust HTML Entity Decoder (Fixes &quot; and &amp; issues)
const decodeEntities = (text: string) => {
  if (!text) return "";
  let decoded = text.replace(/&amp;/g, "&"); // Decode amp first
  return decoded
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&apos;/g, "'");
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
  const[overflowWidth, setOverflowWidth] = useState(0);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        const cWidth = containerRef.current.offsetWidth;
        const tWidth = textRef.current.scrollWidth;
        if (tWidth > cWidth) {
          setOverflowWidth(tWidth - cWidth + 10);
        } else {
          setOverflowWidth(0);
        }
      }
    };
    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [text]);

  return (
    <div ref={containerRef} className="relative overflow-hidden whitespace-nowrap w-full mask-linear-fade-mini">
      <div 
        ref={textRef}
        className={`inline-block ${overflowWidth > 0 ? "animate-ping-pong-mini" : ""} ${isSub ? "text-xs text-white/60 font-medium" : "text-sm font-bold text-white"} transition-colors`}
        style={{ '--overflow-dist': `-${overflowWidth}px` } as React.CSSProperties}
      >
        {decodeEntities(text)}
      </div>
    </div>
  );
};

export default function MiniPlayer() {
  const { currentSong, isPlaying, setIsPlaying, setCurrentSong, queue } = useAppContext();
  
  const [audioUrl, setAudioUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

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
  }, [currentSong, setIsPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying && audioUrl) {
        audioRef.current.play().catch((e) => {
          console.warn("Autoplay prevented:", e);
          setIsPlaying(false);
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, audioUrl, setIsPlaying]);

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
  const subtitle = currentSong.subtitle || currentSong.primaryArtists || "Music@8481";

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

      {/* CHANGED: Solid background bg-[#1a1a1a] so it's not transparent */}
      <div className="fixed bottom-[75px] left-2 right-2 md:left-1/2 md:-translate-x-1/2 md:w-[500px] h-[64px] rounded-xl overflow-hidden shadow-2xl border border-white/10 z-[99] bg-[#1a1a1a] group cursor-pointer active:scale-[0.98] transition-transform">
        
        {/* Darkened Cover Blur - Made opacity-30 and bg-black/80 so it's heavily opaque */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <img src={coverImage} className="w-full h-full object-cover blur-[20px] opacity-30 scale-125" alt="bg" />
          <div className="absolute inset-0 bg-black/80" />
        </div>

        <audio 
          ref={audioRef} 
          src={audioUrl} 
          autoPlay={isPlaying} 
          onEnded={playNext}
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        {/* CHANGED: absolute bottom-0 to move green line to bottom */}
        <div className="absolute bottom-0 left-0 w-full h-[3px] bg-white/5 z-20">
          <div className="h-full bg-[#1ed760] transition-all duration-300 ease-linear rounded-r-full shadow-[0_0_8px_#1ed760]" style={{ width: `${progress}%` }} />
        </div>

        <div className="relative z-10 flex items-center justify-between h-full px-3 w-full">
          <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0 pr-2">
            <div className="relative w-11 h-11 flex-shrink-0 bg-white/10 rounded-md overflow-hidden shadow-lg border border-white/5">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                  <Loader2 className="animate-spin text-[#1ed760]" size={20} />
                </div>
              ) : null}
              <img src={coverImage} alt="cover" className="w-full h-full object-cover" />
            </div>

            <div className="flex flex-col overflow-hidden w-full gap-0.5 justify-center">
              <MiniPingPongMarquee text={title} />
              <MiniPingPongMarquee text={subtitle} isSub={true} />
            </div>
          </div>

          <div className="flex items-center gap-4 flex-shrink-0 pl-2">
            <button onClick={(e) => { e.stopPropagation(); playPrev(); }} className="text-white/70 hover:text-white active:scale-90 transition-all hidden sm:block">
              <SkipBack size={22} fill="currentColor" />
            </button>

            <button disabled={loading} onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }} className={`w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-90 ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10'}`}>
              {isPlaying ? <Pause fill="white" size={24} /> : <Play fill="white" size={24} className="ml-1" />}
            </button>

            <button onClick={(e) => { e.stopPropagation(); playNext(); }} className="text-white/70 hover:text-white active:scale-90 transition-all">
              <SkipForward size={22} fill="currentColor" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
