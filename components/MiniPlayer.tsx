
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAppContext } from "../context/AppContext";
import { 
  Play, Pause, SkipForward, SkipBack, Loader2, ChevronDown, 
  MoreHorizontal, Shuffle, Repeat, Heart, ListMusic, 
  MonitorPlay, Maximize2, Minimize2, Menu, Timer, Disc3, Calendar, Clock, Hash, Globe, Settings2, Check, Share2, Download, Video, X, Server, RefreshCw
} from "lucide-react";

// --- PRO AUTH & CACHE ENGINE ---
const AUTH_STORAGE_KEY = 'spotify_app_auth';
let ongoingAuthPromise: Promise<any> | null = null;

const getCachedAuth = () => {
  if (typeof window === "undefined") return null;
  try {
    const cached = localStorage.getItem(AUTH_STORAGE_KEY);
    if (cached) {
      const authData = JSON.parse(cached);
      if (Date.now() < (authData.accessTokenExpirationTimestampMs - 10000)) return authData;
    }
  } catch (e) {}
  return null;
};

const fetchNewAuthToken = async () => {
  if (ongoingAuthPromise) return ongoingAuthPromise;
  ongoingAuthPromise = (async () => {
    try {
      const response = await fetch('https://serverayush.vercel.app/api/auth');
      const data = await response.json();
      if (typeof window !== "undefined") localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
      return data;
    } catch (error) { return null; } finally { ongoingAuthPromise = null; }
  })();
  return ongoingAuthPromise;
};

const getAuthData = async () => {
  const cachedAuth = getCachedAuth();
  if (cachedAuth) return cachedAuth;
  return await fetchNewAuthToken();
};

// --- ADVANCED HTML ENTITY DECODER ---
const decodeEntities = (text: string) => {
  if (!text) return "";
  let decoded = text;
  try {
    if (typeof window !== "undefined") {
      const txt = document.createElement("textarea");
      txt.innerHTML = text;
      decoded = txt.value;
    }
  } catch (e) {}
  return decoded.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&apos;/g, "'");
};

const getArtistsText = (data: any) => {
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
  if (!img || (Array.isArray(img) && img.length === 0)) return null;
  if (typeof img === "string" && img.trim() !== "") return img.replace("50x50", "500x500").replace("150x150", "500x500").split('?')[0];
  if (Array.isArray(img) && img[0]?.url) return (img[img.length - 1]?.url || img[0]?.url).split('?')[0];
  return null;
};

const getArtistColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 45%, 35%)`;
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
  if (parts.length >= 2) return parseInt(parts[0], 10) * 60 + parseFloat(parts[1]);
  return 0;
};

const RAPID_KEYS =["d1edce158amshec139440d20658ap1f2545jsnbb7da9add82f", "6cf7f03014msh787c51a713c0264p15c20djsna1f9a9f6a378", "13d48f6bb8msh459c11b91bdcc44p110f4ejsn099443894115", "03fc23317fmsh0535ef9ec8c6f5bp1db59bjsn545991df9343", "e54e3fbc4dmshfc16d4417b618fdp1a2fafjsn30c72d8cf3ab"];
const RAPID_API_HOST = "spotify81.p.rapidapi.com";

// --- AK47 SPECIFIC MATCHER ---
const performAK47Matching = (results: any[], targetTrack: string, targetArtist: string): any => {
    if (!results || results.length === 0) return null;
    const clean = (s: string) => decodeEntities(s || "").toLowerCase().replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ").trim();
    const tTitle = clean(targetTrack);
    const tArtist = clean(targetArtist);
    let bestMatch = null; let highestScore = 0;

    results.forEach((track) => {
        if (!track) return;
        const rTitle = clean(track.song_name);
        const rArtists = clean(track.artist);
        let score = 0; let artistMatched = false;

        if (tArtist.length > 0) {
            if (rArtists === tArtist) { score += 100; artistMatched = true; }
            else if (rArtists.includes(tArtist) || tArtist.includes(rArtists)) { score += 80; artistMatched = true; }
            else {
                const tSplit = tArtist.split(" ");
                for (let t of tSplit) { if (t.length > 2 && rArtists.includes(t)) { score += 50; artistMatched = true; break; } }
            }
            if (!artistMatched) score = 0;
        } else score += 50;

        if (score > 0) {
            if (rTitle === tTitle) score += 100;
            else if (rTitle.startsWith(tTitle) || tTitle.startsWith(rTitle)) score += 80;
            else if (rTitle.includes(tTitle) || tTitle.includes(rTitle)) score += 50;
        }
        if (score > highestScore) { highestScore = score; bestMatch = track; }
    });
    if (highestScore > 0) return bestMatch;
    return results[0];
};

const performMatching = (apiData: any, targetTrack: string, targetArtist: string): any => {
  if (!apiData.tracks || apiData.tracks.length === 0) return null;
  const clean = (s: string) => decodeEntities(s || "").toLowerCase().replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ").trim();
  const tTitle = clean(targetTrack); const tArtist = clean(targetArtist);
  let bestMatch: any = null; let highestScore = 0;
  
  apiData.tracks.forEach((item: any) => {
      const track = item.data || item; if (!track) return;
      const rTitle = clean(track.name); const rArtists = (track.artists?.items || track.artists ||[]).map((a: any) => clean(a.profile?.name || a.name));
      let score = 0; let artistMatched = false;
      if (tArtist.length > 0) {
          for (let ra of rArtists) { 
              if (ra === tArtist) { score += 100; artistMatched = true; break; } 
              else if (ra.includes(tArtist) || tArtist.includes(ra)) { score += 80; artistMatched = true; break; } 
          }
          if (!artistMatched) score = 0;
      } else score += 50;
      if (score > 0) { 
          if (rTitle === tTitle) score += 100; 
          else if (rTitle.startsWith(tTitle) || tTitle.startsWith(rTitle)) score += 80; 
          else if (rTitle.includes(tTitle)) score += 50; 
      }
      if (score > highestScore) { highestScore = score; bestMatch = track; }
  });
  if (highestScore > 0) return bestMatch;
  if (apiData.tracks && apiData.tracks.length > 0) return apiData.tracks[0].data || apiData.tracks[0];
  return null;
};

// --- DYNAMIC QUALITY GENERATOR ---
const generateAllQualities = (baseUrls: any[]) => {
  if (!baseUrls || baseUrls.length === 0) return[];
  const sampleUrl = baseUrls[0].url || "";
  const match = sampleUrl.match(/_(\d+)\.(mp4|m4a|mp3|aac)/i);
  if (match) {
    return['12', '48', '96', '160', '320'].map(q => ({
      quality: `${q}kbps`,
      url: sampleUrl.replace(match[0], `_${q}.${match[2]}`),
      label: `${q}kbps`
    }));
  }
  return baseUrls;
};

// --- NATIVE ID3 TAGGER ---
const NativeID3 = {
  tag: function(data: any) {
      const frames =[];
      if(data.title) frames.push(this.txtFrame('TIT2', data.title));
      if(data.artist) frames.push(this.txtFrame('TPE1', data.artist));
      if(data.album) frames.push(this.txtFrame('TALB', data.album));
      if(data.image) frames.push(this.picFrame(data.image));
      let totalSize = 0; frames.forEach(f => totalSize += f.length);
      const header = new Uint8Array(10);
      header.set([0x49, 0x44, 0x33, 0x03, 0x00, 0x00], 0); header.set(this.calcSize(totalSize), 6);
      const final = new Uint8Array(10 + totalSize + data.audio.byteLength);
      final.set(header, 0); let offset = 10;
      frames.forEach(f => { final.set(f, offset); offset += f.length; });
      final.set(new Uint8Array(data.audio), offset);
      return final;
  },
  txtFrame: function(id: string, text: string) {
      const strBytes = this.strToUtf16(text); const size = 1 + strBytes.length;
      const buf = new Uint8Array(10 + size);
      buf.set(this.strToAscii(id), 0); buf.set(this.intToBytes(size), 4);
      buf[10] = 0x01; buf.set(strBytes, 11); return buf;
  },
  picFrame: function(imgBuf: ArrayBuffer) {
      const mime = this.strToAscii("image/jpeg"); const imgData = new Uint8Array(imgBuf);
      const size = 1 + mime.length + 1 + 1 + 1 + imgData.length;
      const buf = new Uint8Array(10 + size);
      buf.set(this.strToAscii('APIC'), 0); buf.set(this.intToBytes(size), 4);
      let p = 10; buf[p++] = 0x00; buf.set(mime, p); p += mime.length;
      buf[p++] = 0x00; buf[p++] = 0x03; buf[p++] = 0x00; buf.set(imgData, p); return buf;
  },
  calcSize: function(n: number) { return[(n>>21)&0x7F, (n>>14)&0x7F, (n>>7)&0x7F, n&0x7F]; },
  intToBytes: function(n: number) { return[(n>>24)&0xFF, (n>>16)&0xFF, (n>>8)&0xFF, n&0xFF]; },
  strToAscii: (s: string) => new Uint8Array([...s].map(c=>c.charCodeAt(0))),
  strToUtf16: (s: string) => {
      const b = new Uint8Array(2 + s.length*2); b[0]=0xFF; b[1]=0xFE;
      for(let i=0; i<s.length; i++){ const c = s.charCodeAt(i); b[2 + i*2] = c & 0xFF; b[3 + i*2] = (c >> 8) & 0xFF; }
      return b;
  }
};

const loadLameJS = () => new Promise((resolve, reject) => {
  if ((window as any).lamejs) return resolve(true);
  const script = document.createElement('script');
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/lamejs/1.2.1/lame.min.js";
  script.onload = () => resolve(true);
  script.onerror = reject;
  document.head.appendChild(script);
});

// --- FLICKER-FREE MEMOIZED MARQUEE ---
const MarqueeText = React.memo(({ text, className = "" }: { text: string, className?: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const checkOverflow = () => { 
      if (containerRef.current && textRef.current) {
        setIsOverflowing(textRef.current.scrollWidth > containerRef.current.clientWidth + 5); 
      }
    };
    checkOverflow();
    const timeouts =[setTimeout(checkOverflow, 100), setTimeout(checkOverflow, 500)];
    window.addEventListener('resize', checkOverflow);
    return () => { timeouts.forEach(clearTimeout); window.removeEventListener('resize', checkOverflow); };
  }, [text]);

  return (
    <div ref={containerRef} className={`overflow-hidden whitespace-nowrap w-full flex items-center ${isOverflowing ? "mask-edges" : ""} ${className}`}>
      <div className={`inline-block whitespace-nowrap ${isOverflowing ? "animate-spotify-marquee" : ""}`} style={{ minWidth: "100%" }}>
        <span ref={textRef} className={`inline-block whitespace-nowrap ${isOverflowing ? "pr-12" : ""}`}>{text}</span>
        {isOverflowing && <span className="inline-block whitespace-nowrap pr-12">{text}</span>}
      </div>
    </div>
  );
});
MarqueeText.displayName = 'MarqueeText';

export default function MiniPlayer() {
  const { 
    currentSong, isPlaying, setIsPlaying, setCurrentSong, 
    queue, upcomingQueue, setUpcomingQueue, historyQueue, setHistoryQueue,
    playContext, likedSongs, toggleLikeSong 
  } = useAppContext();
  
  const[audioUrl, setAudioUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const[progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isExpanded, setIsExpanded] = useState(false);
  const[dominantColor, setDominantColor] = useState("rgb(83, 83, 83)");
  const [isScrolledPastMain, setIsScrolledPastMain] = useState(false);
  const[isUiHidden, setIsUiHidden] = useState(false); 
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState(0); 
  const [showQueue, setShowQueue] = useState(false);
  
  // Touch Gestures State
  const [dragState, setDragState] = useState<{ activeIndex: number | null, startY: number, currentY: number }>({ activeIndex: null, startY: 0, currentY: 0 });
  const[isQueueEditMode, setIsQueueEditMode] = useState(false);
  const [selectedQueueItems, setSelectedQueueItems] = useState<number[]>([]);
  
  const [miniSwipeY, setMiniSwipeY] = useState(0);
  const[queueSwipeY, setQueueSwipeY] = useState(0);
  const[settingsSwipeY, setSettingsSwipeY] = useState(0);

  const [sleepTimer, setSleepTimer] = useState<number | 'end' | null>(null);
  const [timerRemaining, setTimerRemaining] = useState<number | null>(null);
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  
  const currentTrackRef = useRef<any>(null);
  const maxListenRef = useRef<number>(0);
  const lastTimeUpdateRef = useRef<number>(0); 
  const isNavigatingBackRef = useRef(false);
  
  const rapidKeyIdxRef = useRef(0);
  const [spotifyId, setSpotifyId] = useState<string | null>(null);
  const [spotifyUrl, setSpotifyUrl] = useState<string | null>(null);
  const [lyrics, setLyrics] = useState<any[]>([]);
  const [syncType, setSyncType] = useState<string | null>(null);
  const [activeLyricIndex, setActiveLyricIndex] = useState(-1);
  const [isLyricsFullScreen, setIsLyricsFullScreen] = useState(false);
  const [canvasData, setCanvasData] = useState<any>(null);
  const [isCanvasLoaded, setIsCanvasLoaded] = useState(false);
  
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const activeLyricRef = useRef<HTMLParagraphElement>(null);
  const fullLyricsContainerRef = useRef<HTMLDivElement>(null);
  const fullActiveLyricRef = useRef<HTMLParagraphElement>(null);
  const miniActiveLyricRef = useRef<HTMLDivElement>(null);
  
  const canvasVideoRef = useRef<HTMLVideoElement>(null);
  const playNextRef = useRef<() => void>(() => {});
  const playPrevRef = useRef<() => void>(() => {});
  const isVideoModeRef = useRef<boolean>(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const queueContainerRef = useRef<HTMLDivElement>(null);
  const isSeekingRef = useRef(false);
  const [songDetails, setSongDetails] = useState<any>(null);

  const[isVideoMode, setIsVideoMode] = useState(false);
  const [ytVideoId, setYtVideoId] = useState<string | null>(null);
  const prefetchedYtIdRef = useRef<string | null>(null); 
  const iframeInitialTimeRef = useRef<number>(0); 
  const videoStartTimeRef = useRef<number>(0);    
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const videoIframeRef = useRef<HTMLIFrameElement>(null);

  const fetchingRecsRef = useRef(false);
  const [isFetchingRecsUI, setIsFetchingRecsUI] = useState(false);
  const [isSessionRestored, setIsSessionRestored] = useState(false);
  const[showSettingsMenu, setShowSettingsMenu] = useState(false);
  
  const [selectedQuality, setSelectedQuality] = useState("320");
  const [lineFontSize, setLineFontSize] = useState("Medium");
  const[cardFontSize, setCardFontSize] = useState("Medium");
  const [isCanvasEnabled, setIsCanvasEnabled] = useState(true);
  const [isLyricsEnabled, setIsLyricsEnabled] = useState(true);
  const[isWordSyncEnabled, setIsWordSyncEnabled] = useState(true);
  const[isMiniWordSyncEnabled, setIsMiniWordSyncEnabled] = useState(true);
  const restoreTimeRef = useRef<number | null>(null);

  const isCanvasEnabledRef = useRef(true);
  const isLyricsEnabledRef = useRef(true);

  const [dlState, setDlState] = useState<{type: "music" | "video" | null, status: string, options?: any[], progress?: number, packStep?: string, server?: number}>({type: null, status: "idle", progress: 0, server: 1});

  const isSongLiked = likedSongs.some((s: any) => s && s.id === currentSong?.id);
  const handleLikeClick = (e: any) => { e.stopPropagation(); toggleLikeSong(currentSong); };

  const handleShareSong = async () => {
    try {
      let path = currentSong.perma_url || currentSong.url || "";
      if (path && path.includes('jiosaavn.com')) path = new URL(path).pathname;
      const vId = ytVideoId || currentSong.prefetchedYtId || '';
      const sId = spotifyId || currentSong.spotifyId || '';
      const shareUrl = `${window.location.origin}/play${path}?token=${vId}&signature=${sId}`;

      const shareData: any = { title: displayTitle, text: `Listen to ${displayTitle} by ${displayArtists}`, url: shareUrl };
      if (navigator.canShare) {
        try {
          if (displayImage) {
            const response = await fetch(displayImage); const blob = await response.blob();
            const file = new File([blob], 'cover.jpg', { type: blob.type });
            if (navigator.canShare({ files: [file] })) shareData.files = [file];
          }
        } catch (e) {} 
        await navigator.share(shareData);
      } else { await navigator.clipboard.writeText(shareUrl); alert("Link copied to clipboard!"); }
    } catch (e) { console.error("Error sharing:", e); }
    setShowSettingsMenu(false);
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isVideoModeRef.current) {
        setIsVideoMode(false);
        if (audioRef.current) {
           audioRef.current.currentTime = videoStartTimeRef.current; 
           const playPromise = audioRef.current.play();
           if (playPromise !== undefined) playPromise.catch(()=>{});
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  },[]);

  // SLEEP TIMER ENGINE
  useEffect(() => {
    let interval: any;
    if (typeof sleepTimer === 'number' && sleepTimer > 0) {
        setTimerRemaining(sleepTimer * 60);
        interval = setInterval(() => {
            setTimerRemaining(prev => {
                if (prev !== null && prev <= 1) {
                    setIsPlaying(false);
                    setSleepTimer(null);
                    if (audioRef.current) audioRef.current.pause();
                    return null;
                }
                return prev ? prev - 1 : null;
            });
        }, 1000);
    } else {
        setTimerRemaining(null);
    }
    return () => clearInterval(interval);
  }, [sleepTimer]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
       const q = localStorage.getItem('audio_quality'); if (q) setSelectedQuality(q);
       const lf = localStorage.getItem('line_font_size'); if (lf) setLineFontSize(lf);
       const cf = localStorage.getItem('card_font_size'); if (cf) setCardFontSize(cf);
       const c = localStorage.getItem('canvas_enabled'); if (c !== null) { setIsCanvasEnabled(c === 'true'); isCanvasEnabledRef.current = c === 'true'; }
       const l = localStorage.getItem('lyrics_enabled'); if (l !== null) { setIsLyricsEnabled(l === 'true'); isLyricsEnabledRef.current = l === 'true'; }
       const ws = localStorage.getItem('word_sync_enabled'); if (ws !== null) setIsWordSyncEnabled(ws === 'true');
       const mws = localStorage.getItem('mini_word_sync_enabled'); if (mws !== null) setIsMiniWordSyncEnabled(mws === 'true');

       const storedSong = localStorage.getItem('last_session_song');
       if (storedSong && !currentSong && !isSessionRestored) {
          try {
             const parsed = JSON.parse(storedSong);
             const storedQueue = localStorage.getItem('last_session_queue');
             if (storedQueue) setUpcomingQueue(JSON.parse(storedQueue));
             setCurrentSong(parsed); setIsPlaying(false); setIsSessionRestored(true);
             const storedTime = localStorage.getItem('last_session_time');
             if (storedTime) restoreTimeRef.current = parseFloat(storedTime);
          } catch(e) {}
       } else setIsSessionRestored(true);
    }
  },[currentSong, isSessionRestored, setCurrentSong, setUpcomingQueue]);

  useEffect(() => { isCanvasEnabledRef.current = isCanvasEnabled; },[isCanvasEnabled]);
  useEffect(() => { isLyricsEnabledRef.current = isLyricsEnabled; if (!isLyricsEnabled) setIsLyricsFullScreen(false); }, [isLyricsEnabled]);
  useEffect(() => { if (currentSong) localStorage.setItem('last_session_song', JSON.stringify(currentSong)); }, [currentSong]);
  useEffect(() => { if (upcomingQueue && upcomingQueue.length > 0) localStorage.setItem('last_session_queue', JSON.stringify(upcomingQueue)); }, [upcomingQueue]);

  const rawTitle = currentSong ? decodeEntities(currentSong.title || currentSong.name || "Unknown") : "";
  const rawArtists = currentSong ? decodeEntities(getArtistsText(currentSong)) : "";
  const rawImage = currentSong ? getImageUrl(currentSong.image) : "";

  const displayTitle = songDetails?.name ? decodeEntities(songDetails.name) : rawTitle;
  const displayArtists = songDetails ? decodeEntities(getArtistsText(songDetails)) : rawArtists;
  const displayImage = songDetails?.image ? getImageUrl(songDetails.image) : rawImage;
  
  const uniqueArtists = useMemo(() => {
    if (!songDetails?.artists) return[];
    const primaryArr = Array.isArray(songDetails.artists.primary) ? songDetails.artists.primary :[];
    const allArr = Array.isArray(songDetails.artists.all) ? songDetails.artists.all :[];
    const map = new Map();
    primaryArr.forEach((p: any) => { const full = allArr.find((a: any) => a.id === p.id) || p; map.set(p.id, { ...p, ...full, role: (full.role || "Primary Artist").replace(/_/g, ' ') }); });
    allArr.forEach((a: any) => { if (!map.has(a.id)) map.set(a.id, { ...a, role: (a.role || "Artist").replace(/_/g, ' ') }); });
    return Array.from(map.values());
  }, [songDetails]);

  const updateTop30Cache = useCallback((song: any, maxPercent: number) => {
    if (!song) return;
    try {
      let top30 = JSON.parse(localStorage.getItem('top_30_songs') || '[]');
      const existingIdx = top30.findIndex((s: any) => s.id === song.id);
      if (existingIdx !== -1) { if (maxPercent > top30[existingIdx].maxListenPercent) top30[existingIdx].maxListenPercent = maxPercent; } 
      else top30.push({ ...song, maxListenPercent: maxPercent });
      top30.sort((a: any, b: any) => b.maxListenPercent - a.maxListenPercent);
      if (top30.length > 30) top30 = top30.slice(0, 30);
      localStorage.setItem('top_30_songs', JSON.stringify(top30));
    } catch (e) {}
  },[]);

  const prefetchVideoId = async (songTitle: string, songArtists: string) => {
    try {
      const query = `${songTitle} ${songArtists.split(',').slice(0, 2).join(' ')} official music video`;
      const fallbackRes = await fetch(`https://ayushvid.vercel.app/api?q=${encodeURIComponent(query)}`);
      const data = await fallbackRes.json();
      if (data?.top_result?.videoId) { prefetchedYtIdRef.current = data.top_result.videoId; return data.top_result.videoId; }
    } catch (err) {}
    return null;
  };

  const fetchRecs = async (vid: string, forceClear: boolean = false, retries = 5) => {
    if (!vid || fetchingRecsRef.current) return;
    fetchingRecsRef.current = true; setIsFetchingRecsUI(true);
    
    const attemptFetch = async (retriesLeft: number): Promise<any[]> => {
      try {
         const res = await fetch(`https://ayushmind.vercel.app/api/rec?vid=${vid}`);
         if (!res.ok) throw new Error("Rec API Failed");
         return (await res.json()).recommendations ||[];
      } catch (e) {
         if (retriesLeft > 0) { await new Promise(r => setTimeout(r, 2000)); return attemptFetch(retriesLeft - 1); }
         return[];
      }
    };
    
    const recs = await attemptFetch(retries);
    if (recs.length > 0) {
      const formatted = recs.map((r: any) => ({
        id: r["Perma URL"] ? r["Perma URL"].split('/').pop() : Math.random().toString(),
        title: decodeEntities(r.Title), name: decodeEntities(r.Title), artists: decodeEntities(r.Artists), image: r.Banner,
        downloadUrl:[{ url: r.Stream, quality: "320kbps" }], url: r["Perma URL"],
        spotifyUrl: r.Spotify, isRecommendation: true
      }));

      // STRICT FILTERING: Eliminate slow/reverb/lofi AND duplicates
      const filtered = formatted.filter((s: any) => {
         const titleL = s.title.toLowerCase();
         if (titleL.includes('slow') || titleL.includes('reverb') || titleL.includes('lofi') || titleL.includes('lo-fi')) return false;
         return true;
      });

      setUpcomingQueue(prev => {
        const activeSet = forceClear ? new Set([currentSong.id]) : new Set(prev.map((s: any) => s.id));
        if (!forceClear) { existingIds.add(currentSong.id); historyQueue.forEach((h: any) => activeSet.add(h.id)); }
        
        const validNew = filtered.filter((s: any) => {
           if (activeSet.has(s.id)) return false;
           // Also double-check name similarity to prevent "Remix" duplicates
           const isDupName = prev.some((p:any) => p.name.toLowerCase() === s.name.toLowerCase());
           if (isDupName && !forceClear) return false;
           activeSet.add(s.id);
           return true;
        });
        return forceClear ? validNew : [...prev, ...validNew];
      });
    }
    fetchingRecsRef.current = false; setIsFetchingRecsUI(false);
  };

  const handleRebuildQueue = (e: any) => {
      e.stopPropagation();
      setUpcomingQueue([]);
      if (ytVideoId || currentSong?.prefetchedYtId) {
          fetchRecs(ytVideoId || currentSong.prefetchedYtId, true);
      }
  };

  useEffect(() => {
    let recTimer: any;
    if (['Home', 'Search', 'Library', 'External Link', 'Recommendation'].includes(playContext?.type) && upcomingQueue.length <= 3 && !fetchingRecsRef.current) {
      let seedVid = ytVideoId || currentSong?.prefetchedYtId;
      try {
        const top30 = JSON.parse(localStorage.getItem('top_30_songs') || '[]'); let bestPercent = 30; 
        for (const hSong of historyQueue.slice(0, 7)) {
          const tSong = top30.find((t: any) => t.id === hSong.id);
          if (tSong && tSong.maxListenPercent > bestPercent && hSong.prefetchedYtId) { bestPercent = tSong.maxListenPercent; seedVid = hSong.prefetchedYtId; }
        }
      } catch (e) {}
      if (seedVid) recTimer = setTimeout(() => fetchRecs(seedVid as string), 2500);
    }
    return () => { fetchingRecsRef.current = false; clearTimeout(recTimer); };
  }, [upcomingQueue.length, ytVideoId, playContext?.type, historyQueue]);

  // MAIN TRACK CHANGE HOOK
  useEffect(() => {
    if (!currentSong) return;
    let isCurrent = true; let spotifyTimer: any;
    fetchingRecsRef.current = false;
    
    if (currentTrackRef.current && currentTrackRef.current.id !== currentSong.id) {
      updateTop30Cache(currentTrackRef.current, maxListenRef.current);
      if (!isNavigatingBackRef.current) {
          const trackToSave = { ...currentTrackRef.current, prefetchedYtId: ytVideoId || currentTrackRef.current.prefetchedYtId };
          setHistoryQueue(prev => {
            const newHist = [trackToSave, ...prev].filter((v: any, i: number, a: any[]) => a.findIndex((t: any) => t.id === v.id) === i);
            const sliced = newHist.slice(0, 20); localStorage.setItem('recent_songs', JSON.stringify(sliced)); return sliced;
          });
      }
      isNavigatingBackRef.current = false;
    }
    currentTrackRef.current = currentSong; maxListenRef.current = 0;
    
    setYtVideoId(currentSong.ytVideoId || null);
    setSpotifyId(null); setSpotifyUrl(null); setLyrics([]); setSyncType(null); setCanvasData(null);
    setIsCanvasLoaded(false); setActiveLyricIndex(-1); setIsScrolledPastMain(false); setIsUiHidden(false);
    setSongDetails(null); prefetchedYtIdRef.current = currentSong.ytVideoId || null; setIsLyricsFullScreen(false);
    iframeInitialTimeRef.current = 0;

    const instantTitle = decodeEntities(currentSong.title || currentSong.name || "Unknown");
    const instantArtists = decodeEntities(getArtistsText(currentSong));

    if (currentSong.ytVideoId || currentSong.prefetchedYtId) {
      prefetchedYtIdRef.current = currentSong.ytVideoId || currentSong.prefetchedYtId;
      setYtVideoId(prefetchedYtIdRef.current);
    } else {
      setIsVideoLoading(isVideoMode); videoStartTimeRef.current = 0;
      prefetchVideoId(instantTitle, instantArtists).then((vid) => {
         if (!isCurrent) return;
         if (vid) setYtVideoId(vid);
         else if (isVideoMode) { setIsVideoMode(false); audioRef.current?.play().catch(()=>{}); setIsPlaying(true); }
         setIsVideoLoading(false);
      });
    }

    if (!isCanvasEnabledRef.current && !isLyricsEnabledRef.current) return () => { isCurrent = false; };

    const fetchSpotifyMatch = async () => {
      const cacheKey = `spotify_match_${currentSong.id}`;
      const cachedUrl = typeof window !== "undefined" ? localStorage.getItem(cacheKey) : null;
      const cachedId = typeof window !== "undefined" ? localStorage.getItem(cacheKey + '_id') : null;

      if (currentSong.spotifyUrl) {
        const extractedId = currentSong.spotifyUrl.split('/track/')[1]?.split('?')[0];
        if (extractedId) {
          if (!isCurrent) return; setSpotifyId(extractedId); setSpotifyUrl(currentSong.spotifyUrl);
          if (typeof window !== "undefined") { localStorage.setItem(cacheKey, currentSong.spotifyUrl); localStorage.setItem(cacheKey + '_id', extractedId); }
          return;
        }
      }
      if (cachedUrl && cachedId) { if (!isCurrent) return; setSpotifyId(cachedId); setSpotifyUrl(cachedUrl); return; }

      const searchArtist = instantArtists ? instantArtists.split(',').slice(0, 3).join(' ') : "";
      const query = `${instantTitle} ${searchArtist}`.trim();
      let matchData = null;

      try {
         const auth = await getAuthData();
         if (auth && auth.accessToken) {
             const authRes = await fetch(`https://ak47ayush.vercel.app/search?q=${encodeURIComponent(query)}&CID=${auth.clientId}&token=${auth.accessToken}&limit=25&offset=0`);
             if (authRes.ok) {
                 const authJson = await authRes.json();
                 if (authJson.results && Array.isArray(authJson.results) && authJson.results.length > 0) {
                     const match = performAK47Matching(authJson.results, instantTitle, searchArtist);
                     if (match) {
                        const sId = match.spotify_url?.split('/track/')[1]?.split('?')[0];
                        if (sId) {
                            setSpotifyId(sId); setSpotifyUrl(match.spotify_url);
                            if (typeof window !== "undefined") { localStorage.setItem(cacheKey, match.spotify_url); localStorage.setItem(cacheKey + '_id', sId); }
                            return; 
                        }
                     }
                 }
             }
         }
      } catch (e) {}

      const searchUrl = `https://${RAPID_API_HOST}/search?q=${encodeURIComponent(query)}&type=tracks&offset=0&limit=25&numberOfTopResults=5`;
      for (let attempt = 0; attempt < RAPID_KEYS.length; attempt++) {
        try {
          const response = await fetch(searchUrl, { method: 'GET', headers: { 'x-rapidapi-key': RAPID_KEYS[rapidKeyIdxRef.current], 'x-rapidapi-host': RAPID_API_HOST } });
          if (response.ok) { matchData = await response.json(); break; } 
          else if ([429, 401, 403].includes(response.status)) rapidKeyIdxRef.current = (rapidKeyIdxRef.current + 1) % RAPID_KEYS.length;
          else break; 
        } catch (e) { rapidKeyIdxRef.current = (rapidKeyIdxRef.current + 1) % RAPID_KEYS.length; }
      }
      if (!isCurrent) return; 
      if (matchData) {
        const match: any = performMatching(matchData, instantTitle, searchArtist);
        if (match) { 
          const newUrl = `https://open.spotify.com/track/${match.id}`;
          setSpotifyId(match.id); setSpotifyUrl(newUrl); 
          if (typeof window !== "undefined") { localStorage.setItem(cacheKey, newUrl); localStorage.setItem(cacheKey + '_id', match.id); }
        }
      }
    };
    
    spotifyTimer = setTimeout(() => { fetchSpotifyMatch(); }, 1500);
    return () => { isCurrent = false; clearTimeout(spotifyTimer); };
  }, [currentSong]);

  useEffect(() => {
    if (queue && queue.length > 0) {
      if (queue.length === 1 && queue[0].id === currentSong?.id) setUpcomingQueue([]);
      else {
        const idx = queue.findIndex((s: any) => s.id === currentSong?.id);
        if (idx !== -1) setUpcomingQueue(queue.slice(idx + 1));
      }
    }
  }, [queue]); 

  // DYNAMIC AUDIO URL FETCH ENGINE
  useEffect(() => {
    if (!currentSong) return;
    let isCurrent = true;

    const fetchAudioData = async () => {
      setLoading(true);
      if ('mediaSession' in navigator && isPlaying) navigator.mediaSession.playbackState = 'playing';

      if (currentSong.isProFallback && currentSong.ytVideoId) {
         try {
            const vidserRes = await fetch(`https://vidser-ayush.vercel.app/api/vid?id=${currentSong.ytVideoId}`);
            if (vidserRes.ok) {
                const vidserData = await vidserRes.json();
                if (isCurrent && vidserData.Audio && vidserData.Audio.length > 0) {
                    const bestAudio = vidserData.Audio.find((a:any) => a.Quality === "MEDIUM") || vidserData.Audio[0];
                    setAudioUrl(bestAudio.Link); setLoading(false); return;
                }
            }
         } catch (e) {}

         try {
            let cndRes = await fetch(`https://serverayush.vercel.app/api/cnd?id=${currentSong.ytVideoId}&v=2&lis=true`);
            if (!cndRes.ok) cndRes = await fetch(`https://serverayush.vercel.app/api/cnd?id=${currentSong.ytVideoId}&v=1&lis=true`);
            if (cndRes.ok && isCurrent) {
                const cndData = await cndRes.json();
                let resolvedUrl = "";
                const audioArr = cndData.Audio ||[];
                const googleUrl = audioArr.find((a:any) => a.url.includes('googlevideo.com'));
                if (googleUrl) resolvedUrl = googleUrl.url;
                else if (cndData.DefaultAudio && cndData.DefaultAudio.length > 0) resolvedUrl = cndData.DefaultAudio[0].url;
                
                if (resolvedUrl) { 
                   setAudioUrl(resolvedUrl); setLoading(false); 
                   setIsVideoMode(true); setSyncType("UNSYNCED");
                   return; 
                }
            }
         } catch (e) {}
      }

      try {
        const fetchLink = encodeURIComponent(currentSong.url || currentSong.perma_url || "");
        const res = await fetch(`https://ayushm-psi.vercel.app/api/songs?link=${fetchLink}`);
        const json = await res.json();
        if (!isCurrent) return; 

        let urls: any[] = [];
        if (json.data?.[0]?.downloadUrl) {
          urls = generateAllQualities(json.data[0].downloadUrl);
          setSongDetails((prev: any) => prev?.id === json.data[0].id ? prev : json.data[0]); 
        } else if (currentSong.downloadUrl?.length > 0) {
          urls = generateAllQualities(currentSong.downloadUrl);
        }

        if (urls.length > 0) {
          const targetQ = selectedQuality + "kbps";
          const match = urls.find((u: any) => u.quality === targetQ) || urls.find((u: any) => u.quality?.includes(selectedQuality));
          setAudioUrl(match ? match.url : urls[urls.length - 1].url);
        }
      } catch (err) {
        if (isCurrent && currentSong.downloadUrl?.length > 0) {
          const urls = generateAllQualities(currentSong.downloadUrl);
          const match = urls.find((u: any) => u.quality === (selectedQuality + "kbps")) || urls.find((u: any) => u.quality?.includes(selectedQuality));
          setAudioUrl(match ? match.url : urls[urls.length - 1].url);
        }
      }
      if (isCurrent) setLoading(false);
    };
    fetchAudioData();
    return () => { isCurrent = false; };
  }, [currentSong, selectedQuality]);

  useEffect(() => {
    const handleMsg = (e: MessageEvent) => {
      if (e.data?.type === 'YTP_TIME' && isVideoMode) {
        videoStartTimeRef.current = e.data.time; 
        if (!isSeekingRef.current) setCurrentTime(e.data.time);
        if (e.data.duration) {
          if (duration !== e.data.duration) setDuration(e.data.duration);
          if (!isSeekingRef.current) setProgress((e.data.time / e.data.duration) * 100);
        } else if (duration > 0 && !isSeekingRef.current) setProgress((e.data.time / duration) * 100);
      } else if (e.data?.type === 'YTP_STATE') {
        if (e.data.state === 1) { audioRef.current?.pause(); setIsPlaying(true); } 
        else if (e.data.state === 2) { setIsPlaying(false); } 
        else if (e.data.state === 0) { playNextRef.current(); } 
      }
    };
    window.addEventListener('message', handleMsg);
    return () => window.removeEventListener('message', handleMsg);
  }, [isVideoMode, duration, upcomingQueue]);

  const handlePlayPauseToggle = (e?: any) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    const newState = !isPlaying;
    setIsPlaying(newState);
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = newState ? 'playing' : 'paused';
    
    if (isVideoMode && videoIframeRef.current?.contentWindow) {
      videoIframeRef.current.contentWindow.postMessage({ type: newState ? 'MUSIC_PLAY' : 'MUSIC_PAUSE' }, '*');
    } else {
      if (newState) {
        const playPromise = audioRef.current?.play();
        if (playPromise !== undefined) playPromise.catch(()=>{});
      } else audioRef.current?.pause();
    }
  };

  const toggleVideoMode = async (e?: React.MouseEvent) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (isVideoMode) {
      setIsVideoMode(false);
      if (audioRef.current) { 
        const audioDur = audioRef.current.duration || 0; setDuration(audioDur);
        const safeTime = (audioDur > 0 && currentTime > audioDur) ? audioDur - 2 : currentTime;
        audioRef.current.currentTime = safeTime; setCurrentTime(safeTime);
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) playPromise.catch(()=>{});
        setIsPlaying(true);
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing'; 
      }
      return;
    }
    iframeInitialTimeRef.current = Math.floor(currentTime);
    if (prefetchedYtIdRef.current) {
      setYtVideoId(prefetchedYtIdRef.current); setIsVideoMode(true);
      if (audioRef.current) audioRef.current.pause(); setIsPlaying(false); return;
    }
    setIsVideoLoading(true);
    if (audioRef.current) audioRef.current.pause(); setIsPlaying(false);
    const newVid = await prefetchVideoId(displayTitle, displayArtists);
    if (newVid) { setYtVideoId(newVid); setIsVideoMode(true); } 
    else if (audioRef.current) { const p = audioRef.current.play(); if(p!==undefined) p.catch(()=>{}); setIsPlaying(true); }
    setIsVideoLoading(false);
  };

  // CANVAS DEFERRED NETWORK OPTIMIZATION
  useEffect(() => {
    if (!spotifyId || !spotifyUrl) return;
    let isCurrent = true;
    const fetchExtras = async () => {
      try {
        if (isLyricsEnabledRef.current) {
          const lyricsRes = await fetch(`https://lyr-nine.vercel.app/api/lyrics?url=${encodeURIComponent(spotifyUrl)}&format=lrc`);
          if (lyricsRes.ok) {
            const lyricsJson = await lyricsRes.json();
            if (isCurrent && lyricsJson.lines) { 
                setLyrics(lyricsJson.lines.map((l: any) => ({ time: parseTimeTag(l.timeTag), words: decodeEntities(l.words) }))); 
                if(!currentSong?.isProFallback) setSyncType(lyricsJson.syncType);
            }
          }
        }
        // ONLY Fetch canvas if music is actually playing to save heavy network on low end devices
        if (isCanvasEnabledRef.current && isPlaying && !loading) {
          const res = await fetch(`https://ayush-gamma-coral.vercel.app/api/canvas?trackId=${spotifyId}`);
          if (res.ok) { const canvasJson = await res.json(); if (isCurrent && canvasJson?.canvasesList?.length > 0) setCanvasData(canvasJson.canvasesList[0]); }
        }
      } catch (e) {}
    };
    fetchExtras();
    return () => { isCurrent = false; };
  },[spotifyId, spotifyUrl, isPlaying, loading]); // Added isPlaying and loading dependencies

  useEffect(() => {
    if (!displayImage) return;
    const img = new Image(); img.crossOrigin = "Anonymous"; img.src = displayImage;
    img.onload = () => {
      const canvas = document.createElement("canvas"); canvas.width = 50; canvas.height = 50; 
      const ctx = canvas.getContext("2d"); if (!ctx) return;
      ctx.drawImage(img, 0, 0, 50, 50);
      try {
        const data = ctx.getImageData(0, 0, 50, 50).data;
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 16) {
          const brightness = (data[i] + data[i+1] + data[i+2]) / 3;
          if (brightness > 30 && brightness < 210) { r += data[i]; g += data[i+1]; b += data[i+2]; count++; }
        }
        setDominantColor(count > 0 ? `rgb(${Math.floor(r/count)}, ${Math.floor(g/count)}, ${Math.floor(b/count)})` : "rgb(83, 83, 83)");
      } catch (e) { setDominantColor("rgb(30, 30, 30)"); }
    };
  }, [displayImage]);

  useEffect(() => {
    if (audioRef.current && audioUrl) {
      audioRef.current.volume = volume / 100;
      if (isPlaying && !isVideoMode) { const p = audioRef.current.play(); if (p !== undefined) p.catch(() => {}); }
      else if (!isPlaying) audioRef.current.pause();
    }
  },[isPlaying, audioUrl, volume, isVideoMode]);

  useEffect(() => {
    if (canvasVideoRef.current) {
      if (isPlaying && !isScrolledPastMain && isExpanded && !showQueue && !isVideoMode && !isLyricsFullScreen && isCanvasEnabled) {
        const p = canvasVideoRef.current.play(); if (p !== undefined) p.catch(() => {});
      } else canvasVideoRef.current.pause();
    }
  },[isPlaying, isScrolledPastMain, isCanvasLoaded, isExpanded, showQueue, isVideoMode, isLyricsFullScreen, isCanvasEnabled]);

  const playNext = () => {
    if (sleepTimer === 'end') { setIsPlaying(false); setSleepTimer(null); if (audioRef.current) audioRef.current.pause(); return; }

    if (isVideoMode && videoIframeRef.current?.contentWindow) videoIframeRef.current.contentWindow.postMessage({ type: 'MUSIC_HIDE_UI' }, '*');
    
    if (repeatMode === 2 && audioRef.current) { 
      audioRef.current.currentTime = 0; 
      setRepeatMode(0);
      const p = audioRef.current.play(); 
      if (p!==undefined) p.catch(()=>{}); 
      return; 
    }

    if (isShuffle && upcomingQueue.length > 0) {
      const randomIdx = Math.floor(Math.random() * upcomingQueue.length); const nextSong = upcomingQueue[randomIdx];
      setUpcomingQueue(prev => prev.filter((_: any, i: number) => i !== randomIdx));
      setCurrentSong(nextSong); setIsPlaying(true); 
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
      return;
    }
    if (upcomingQueue.length > 0) { 
      const nextSong = upcomingQueue[0]; setUpcomingQueue(prev => prev.slice(1)); setCurrentSong(nextSong); setIsPlaying(true); 
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
    } else if (repeatMode === 1 && queue && queue.length > 0) { 
      setCurrentSong(queue[0]); setIsPlaying(true); 
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
    } 
    else { setIsPlaying(false); setProgress(0); }
  };

  const playPrev = () => {
    if (isVideoMode && videoIframeRef.current?.contentWindow) videoIframeRef.current.contentWindow.postMessage({ type: 'MUSIC_HIDE_UI' }, '*');
    if (audioRef.current && audioRef.current.currentTime > 3) { audioRef.current.currentTime = 0; return; }
    if (historyQueue.length > 0) {
      isNavigatingBackRef.current = true;
      const prevSong = historyQueue[0]; setHistoryQueue(prev => prev.slice(1)); setUpcomingQueue(prev =>[currentSong, ...prev]);
      setCurrentSong(prevSong); setIsPlaying(true);
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
    } else {
      if (!queue || queue.length === 0) return;
      const idx = queue.findIndex((s: any) => s.id === currentSong.id);
      if (idx > 0) { 
          isNavigatingBackRef.current = true;
          setCurrentSong(queue[idx - 1]); setIsPlaying(true); 
          if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
      }
    }
  };

  useEffect(() => { playNextRef.current = playNext; playPrevRef.current = playPrev; isVideoModeRef.current = isVideoMode; },[playNext, playPrev, isVideoMode]);

  const syncPosition = useCallback(() => {
    if ('mediaSession' in navigator && audioRef.current) {
      const d = audioRef.current.duration;
      const c = audioRef.current.currentTime;
      if (d > 0 && c >= 0 && c <= d && !isNaN(d) && !isNaN(c)) {
        try { navigator.mediaSession.setPositionState({ duration: d, playbackRate: audioRef.current.playbackRate || 1, position: c }); } catch(e) {}
      }
    }
  },[]);

  useEffect(() => {
    if ('mediaSession' in navigator && displayTitle) {
       navigator.mediaSession.metadata = new MediaMetadata({
          title: displayTitle, artist: displayArtists, album: playContext?.name || 'App',
          artwork: displayImage ?[{ src: displayImage, sizes: '512x512', type: 'image/jpeg' }] :[]
       });
       navigator.mediaSession.setActionHandler('play', () => {
          setIsPlaying(true); navigator.mediaSession.playbackState = 'playing';
          if (isVideoModeRef.current && videoIframeRef.current?.contentWindow) videoIframeRef.current.contentWindow.postMessage({ type: 'MUSIC_PLAY' }, '*');
          else if (audioRef.current) { const p = audioRef.current.play(); if (p !== undefined) p.catch(()=>{}); }
       });
       navigator.mediaSession.setActionHandler('pause', () => {
          setIsPlaying(false); navigator.mediaSession.playbackState = 'paused';
          if (isVideoModeRef.current && videoIframeRef.current?.contentWindow) videoIframeRef.current.contentWindow.postMessage({ type: 'MUSIC_PAUSE' }, '*');
          else if (audioRef.current) audioRef.current.pause();
       });
       navigator.mediaSession.setActionHandler('previoustrack', () => playPrevRef.current());
       navigator.mediaSession.setActionHandler('nexttrack', () => playNextRef.current());
       navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime !== undefined && audioRef.current) { audioRef.current.currentTime = details.seekTime; setCurrentTime(details.seekTime); syncPosition(); }
       });
    }
  },[displayTitle, displayArtists, displayImage, playContext, currentSong]);

  useEffect(() => { if ('mediaSession' in navigator) { navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'; } }, [isPlaying]);

  const handleTimeUpdate = () => {
    if (audioRef.current && !isVideoMode) {
      const c = audioRef.current.currentTime; const d = audioRef.current.duration;
      
      const now = Date.now();
      if (!isSeekingRef.current && now - lastTimeUpdateRef.current < 250) {
         if (isLyricsEnabled && syncType === "LINE_SYNCED" && lyrics.length > 0) {
            let activeIdx = -1;
            const offsetTime = c + 0.4;
            for (let i = 0; i < lyrics.length; i++) { if (lyrics[i].time <= offsetTime) activeIdx = i; else break; }
            if (activeIdx !== activeLyricIndex) setActiveLyricIndex(activeIdx);
         }
         return; 
      }
      lastTimeUpdateRef.current = now;
      
      setCurrentTime(c); setDuration(d || 0);
      
      if (d > 0 && !isSeekingRef.current) {
        const currentPercent = (c / d) * 100;
        setProgress(currentPercent);
        if (currentPercent > maxListenRef.current) maxListenRef.current = currentPercent;
      }

      if (c > 0 && Math.abs(c - (parseFloat(localStorage.getItem('last_session_time')||'0'))) > 2) localStorage.setItem('last_session_time', c.toString());

      if (isLyricsEnabled && syncType === "LINE_SYNCED" && lyrics.length > 0 && !isSeekingRef.current) {
        let activeIdx = -1;
        const offsetTime = c + 0.4; 
        for (let i = 0; i < lyrics.length; i++) { if (lyrics[i].time <= offsetTime) activeIdx = i; else break; }
        if (activeIdx !== activeLyricIndex) setActiveLyricIndex(activeIdx);
      }
    }
  };

  // ZERO-LAG 60FPS WORD SYNC ENGINE
  const activeWordsCache = useRef<any[]>([]);
  const currentSyncRef = useRef<number>(-1);

  useEffect(() => {
    if (!isWordSyncEnabled || !isLyricsEnabled || isVideoMode || activeLyricIndex < 0 || !lyrics[activeLyricIndex]) return;

    let animationFrameId: number;
    const updateProgress = () => {
        if (audioRef.current) {
            const currentTime = audioRef.current.currentTime + 0.4;
            const currentLineTime = lyrics[activeLyricIndex].time;
            let nextLineTime = lyrics[activeLyricIndex + 1]?.time;
            if (!nextLineTime) nextLineTime = currentLineTime + 4;

            const duration = nextLineTime - currentLineTime;
            const elapsed = currentTime - currentLineTime;
            const rawProgress = duration > 0 ? (elapsed / duration) * 100 : 100;
            const boundedProgress = Math.max(0, Math.min(100, rawProgress));

            // Only rebuild the heavy Node Cache if the line actually changed
            if (currentSyncRef.current !== activeLyricIndex) {
                currentSyncRef.current = activeLyricIndex;
                activeWordsCache.current =[];

                const buildCache = (container: HTMLElement | null, selector: string, isActive: boolean) => {
                    if (!container || !isActive) return;
                    const words = container.querySelectorAll(selector) as NodeListOf<HTMLElement>;
                    if (!words.length) return;
                    let totalChars = 0; words.forEach(w => totalChars += (w.textContent || '').length);
                    if (totalChars === 0) return;
                    let charAccumulator = 0;
                    words.forEach((wordNode) => {
                        const wordLen = (wordNode.textContent || '').length;
                        const startPct = (charAccumulator / totalChars) * 100;
                        const endPct = ((charAccumulator + wordLen) / totalChars) * 100;
                        activeWordsCache.current.push({ node: wordNode, startPct, endPct });
                        charAccumulator += wordLen;
                    });
                };

                buildCache(fullActiveLyricRef.current, '.lyric-word', isWordSyncEnabled);
                buildCache(activeLyricRef.current, '.lyric-word', isWordSyncEnabled);
                buildCache(miniActiveLyricRef.current, '.lyric-word-mini', isMiniWordSyncEnabled);
            }

            // Lightning Fast Render Loop (No DOM Reads)
            activeWordsCache.current.forEach((w) => {
                if (boundedProgress >= w.endPct) {
                    w.node.style.backgroundImage = 'none';
                    w.node.style.webkitBackgroundClip = 'unset';
                    w.node.style.webkitTextFillColor = 'white';
                } else if (boundedProgress <= w.startPct) {
                    w.node.style.backgroundImage = 'none';
                    w.node.style.webkitBackgroundClip = 'unset';
                    w.node.style.webkitTextFillColor = 'rgba(255, 255, 255, 0.3)';
                } else {
                    const localProgress = ((boundedProgress - w.startPct) / (w.endPct - w.startPct)) * 100;
                    const gradient = `linear-gradient(to right, rgba(255,255,255,1) ${Math.max(0, localProgress - 20)}%, rgba(255,255,255,0.7) ${localProgress}%, rgba(255,255,255,0.3) ${Math.min(100, localProgress + 20)}%)`;
                    w.node.style.backgroundImage = gradient;
                    w.node.style.webkitBackgroundClip = 'text';
                    w.node.style.webkitTextFillColor = 'transparent';
                }
            });
        }
        if (isPlaying) animationFrameId = requestAnimationFrame(updateProgress);
    };

    if (isPlaying) animationFrameId = requestAnimationFrame(updateProgress);
    else updateProgress();

    return () => { if (animationFrameId) cancelAnimationFrame(animationFrameId); };
  },[isWordSyncEnabled, isMiniWordSyncEnabled, isLyricsEnabled, isVideoMode, activeLyricIndex, lyrics, isPlaying]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrolled = e.currentTarget.scrollTop > 100;
    if (scrolled !== isScrolledPastMain) setIsScrolledPastMain(scrolled);
  }, [isScrolledPastMain]);

  useEffect(() => {
    if (isSeekingRef.current) return; 
    if (activeLyricRef.current && lyricsContainerRef.current) {
      const container = lyricsContainerRef.current; const element = activeLyricRef.current;
      const scrollPos = element.offsetTop - container.offsetTop - 20; 
      container.scrollTo({ top: scrollPos, behavior: 'smooth' });
    }
    if (fullActiveLyricRef.current && fullLyricsContainerRef.current) {
      const container = fullLyricsContainerRef.current; const element = fullActiveLyricRef.current;
      const scrollPos = element.offsetTop - container.offsetTop - (container.clientHeight / 2) + 60; 
      container.scrollTo({ top: scrollPos, behavior: 'smooth' });
    }
  },[activeLyricIndex, isLyricsFullScreen]);

  const isUnsynced = syncType !== "LINE_SYNCED" || isVideoMode;

  const handleLyricClick = (time: number) => {
    if (isUnsynced) return;
    if (isVideoMode && videoIframeRef.current?.contentWindow) videoIframeRef.current.contentWindow.postMessage({ type: 'MUSIC_SEEK', time: time }, '*');
    else if (audioRef.current && duration > 0) { audioRef.current.currentTime = time; setCurrentTime(time); syncPosition(); }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value); setProgress(val);
    const newTime = (val / 100) * duration; setCurrentTime(newTime);
    if (isLyricsEnabled && !isUnsynced && lyrics.length > 0) {
      let activeIdx = -1;
      const offsetTime = newTime + 0.4; 
      for (let i = 0; i < lyrics.length; i++) { if (lyrics[i].time <= offsetTime) activeIdx = i; else break; }
      if (activeIdx !== activeLyricIndex) setActiveLyricIndex(activeIdx);
    }
  };

  const handleSeekStart = () => { isSeekingRef.current = true; };

  const handleSeekEnd = (e: React.SyntheticEvent<HTMLInputElement>) => {
    isSeekingRef.current = false;
    const val = parseFloat(e.currentTarget.value);
    const newTime = (val / 100) * duration;
    
    if (isVideoMode && videoIframeRef.current?.contentWindow) {
      videoIframeRef.current.contentWindow.postMessage({ type: 'MUSIC_SEEK', time: newTime }, '*');
      videoIframeRef.current.contentWindow.postMessage({ type: 'MUSIC_HIDE_UI' }, '*');
    } else if (audioRef.current && duration > 0) {
      audioRef.current.currentTime = newTime; syncPosition();
      if (isPlaying) { const p = audioRef.current.play(); if (p !== undefined) p.catch(()=>{}); }
    }
  };

  // SPOTIFY FLUID TOUCH DRAG QUEUE ENGINE (WITH AUTO SCROLL)
  const handleDragStart = (e: React.TouchEvent | React.MouseEvent, index: number) => {
    if (isQueueEditMode) return;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    setDragState({ activeIndex: index, startY: clientY, currentY: clientY });
  };

  const handleDragMove = useCallback((e: TouchEvent | MouseEvent) => {
    if (dragState.activeIndex === null) return;
    e.preventDefault(); 
    const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
    setDragState(prev => ({ ...prev, currentY: clientY }));

    if (queueContainerRef.current) {
        const container = queueContainerRef.current;
        const rect = container.getBoundingClientRect();
        if (clientY < rect.top + 80) container.scrollTop -= 15;
        else if (clientY > rect.bottom - 80) container.scrollTop += 15;
    }
  }, [dragState.activeIndex]);

  const handleDragEnd = useCallback(() => {
    if (dragState.activeIndex !== null) {
      const ITEM_HEIGHT = 60;
      const diff = dragState.currentY - dragState.startY;
      const offset = Math.round(diff / ITEM_HEIGHT);
      const newIndex = Math.max(0, Math.min(upcomingQueue.length - 1, dragState.activeIndex + offset));

      if (newIndex !== dragState.activeIndex) {
        setUpcomingQueue(prev => {
           const arr = [...prev];
           const [moved] = arr.splice(dragState.activeIndex!, 1);
           arr.splice(newIndex, 0, moved);
           return arr;
        });
      }
    }
    setDragState({ activeIndex: null, startY: 0, currentY: 0 });
  },[dragState, upcomingQueue.length]);

  useEffect(() => {
    if (dragState.activeIndex !== null) {
       window.addEventListener('touchmove', handleDragMove, { passive: false });
       window.addEventListener('touchend', handleDragEnd);
       window.addEventListener('mousemove', handleDragMove);
       window.addEventListener('mouseup', handleDragEnd);
       return () => {
         window.removeEventListener('touchmove', handleDragMove);
         window.removeEventListener('touchend', handleDragEnd);
         window.removeEventListener('mousemove', handleDragMove);
         window.removeEventListener('mouseup', handleDragEnd);
       };
    }
  },[dragState.activeIndex, handleDragMove, handleDragEnd]);

  // SWIPE GESTURES FOR MENUS AND MINIPLAYER
  const handleMiniTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientY; };
  const handleMiniTouchMove = (e: React.TouchEvent) => { 
      const diff = e.touches[0].clientY - touchStartX.current; 
      if (diff < 0 && !isExpanded) setMiniSwipeY(diff); 
  };
  const handleMiniTouchEnd = () => { 
      if (miniSwipeY < -50 && !isExpanded) setIsExpanded(true); 
      setMiniSwipeY(0); 
  };

  const createSwipeToClose = (setter: any, closer: any) => ({
      onTouchStart: (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientY; },
      onTouchMove: (e: React.TouchEvent) => { const diff = e.touches[0].clientY - touchStartX.current; if (diff > 0) setter(diff); },
      onTouchEnd: () => { setter(prev => { if (prev > 100) closer(false); return 0; }); }
  });

  // --- 20X FASTER NATIVE MP3 PACKER ENGINE (HTML Entities Decoded!) ---
  const executeMp3PackerDownload = async (url: string, quality: string) => {
    setDlState({ type: "music", status: "downloading", progress: 0, packStep: "Fetching Audio..." });
    try {
      await loadLameJS();
      setDlState(prev => ({...prev, packStep: "Downloading Media...", progress: 10}));
      
      const[audioResp, imgResp] = await Promise.all([
          fetch(url), fetch(displayImage || "https://via.placeholder.com/500")
      ]);
      const audioFileBuffer = await audioResp.arrayBuffer();
      const coverBuffer = await imgResp.arrayBuffer();

      setDlState(prev => ({...prev, progress: 30, packStep: "Decoding Audio..."}));
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioCtx.decodeAudioData(audioFileBuffer);

      setDlState(prev => ({...prev, progress: 40, packStep: "Encoding to MP3..."}));
      await new Promise(r => setTimeout(r, 10)); 
      
      const channels = 1; 
      const sampleRate = audioBuffer.sampleRate;
      const kbps = parseInt(quality.replace('kbps','')) || 128;
      const mp3encoder = new (window as any).lamejs.Mp3Encoder(channels, sampleRate, kbps);
      
      let samples = audioBuffer.getChannelData(0); 
      const buffer = new Int16Array(samples.length);
      
      for (let i = 0, len = samples.length; i < len; i++) {
          let s = samples[i]; buffer[i] = s < 0 ? s * 32768 : s * 32767;
      }

      const mp3Data =[];
      const blockSize = 1152 * 500; 
      let lastYield = Date.now();
      
      for (let i = 0; i < buffer.length; i += blockSize) {
          const chunk = buffer.subarray(i, i + blockSize);
          const mp3buf = mp3encoder.encodeBuffer(chunk);
          if (mp3buf.length > 0) mp3Data.push(mp3buf);
          const now = Date.now();
          if (now - lastYield > 250) { 
              const pct = 40 + Math.floor((i / buffer.length) * 50);
              setDlState(prev => ({...prev, progress: pct}));
              await new Promise(r => setTimeout(r, 0)); 
              lastYield = Date.now();
          }
      }
      const endBuf = mp3encoder.flush();
      if (endBuf.length > 0) mp3Data.push(endBuf);

      const mp3Blob = new Blob(mp3Data, { type: 'audio/mp3' });
      setDlState(prev => ({...prev, progress: 95, packStep: "Injecting Metadata..."}));
      const mp3ArrayBuffer = await mp3Blob.arrayBuffer();

      const cleanTitle = decodeEntities(displayTitle);
      const cleanArtist = decodeEntities(displayArtists);
      const cleanAlbum = decodeEntities(songDetails?.album?.name || displayTitle);

      const taggedBuffer = NativeID3.tag({
          audio: mp3ArrayBuffer, image: coverBuffer, title: cleanTitle, artist: cleanArtist, album: cleanAlbum
      });

      setDlState(prev => ({...prev, progress: 100, packStep: "Complete!"}));
      const finalBlob = new Blob([taggedBuffer], { type: 'audio/mp3' });
      const dlUrl = URL.createObjectURL(finalBlob);
      const a = document.createElement('a'); a.href = dlUrl; a.download = `${cleanTitle} - ${cleanArtist}.mp3`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setDlState({ type: null, status: "idle" });

    } catch (e) {
      console.warn("Packer failed, using raw fallback", e);
      const a = document.createElement("a"); a.href = url; a.target = "_blank"; a.download = `${decodeEntities(displayTitle)} - ${decodeEntities(displayArtists)}.m4a`; 
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setDlState({ type: null, status: "idle" });
    }
  };

  const executeBlobDownload = async (url: string, filename: string, isVideoMux: boolean = false) => {
    try {
      setDlState(prev => ({...prev, status: "downloading", progress: 0, packStep: "Downloading..."}));
      const res = await fetch(url);
      const contentLength = res.headers.get('content-length');
      const total = parseInt(contentLength || '0', 10);
      let loaded = 0;
      
      if (!res.body) throw new Error("No body stream");
      const reader = res.body.getReader();
      const chunks =[];
      
      while(true) {
         const {done, value} = await reader.read();
         if (done) break;
         chunks.push(value);
         loaded += value.length;
         if (total) setDlState(prev => ({...prev, progress: Math.round((loaded/total)*100)}));
      }

      if (isVideoMux) {
         setDlState(prev => ({...prev, status: "merging", packStep: "Merging..."}));
         await new Promise(r => setTimeout(r, 2800)); 
      }

      const blob = new Blob(chunks);
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = decodeEntities(filename);
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setDlState({ type: null, status: "idle" });
    } catch (e) {
      const a = document.createElement("a"); a.href = url; a.target = "_blank"; a.download = decodeEntities(filename); 
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setDlState({ type: null, status: "idle" });
    }
  };

  const handleDownloadMusicInit = () => { 
      let opts: any[] =[];
      if (currentSong.downloadUrl && currentSong.downloadUrl.length > 0 && !currentSong.isProFallback) {
          const generatedUrls = generateAllQualities(currentSong.downloadUrl);
          const uniqueMap = new Map();
          generatedUrls.forEach((u: any) => {
              const qStr = String(u.quality || "").toLowerCase().replace("kbps", "").trim();
              const qNum = parseInt(qStr) || 128;
              if (!uniqueMap.has(qNum)) {
                  uniqueMap.set(qNum, { url: u.url, quality: `${qNum}kbps`, label: `${qNum}kbps`, num: qNum });
              }
          });
          opts = Array.from(uniqueMap.values()).sort((a, b) => b.num - a.num);
      }
      setDlState({ type: "music", status: "options", options: opts.length > 0 ? opts : undefined });
      setShowSettingsMenu(false); 
  };
  
  const handleDownloadVideoInit = () => { setDlState({ type: "video", status: "servers" }); setShowSettingsMenu(false); };

  const triggerVideoServer = async (serverNum: number) => {
    setDlState({ type: "video", status: "verifying", server: serverNum });
    setTimeout(async () => {
      setDlState(prev => prev.type === "video" ? { ...prev, status: "connecting" } : prev);
      try {
        const targetVid = ytVideoId || await prefetchVideoId(displayTitle, displayArtists);
        if (!targetVid) throw new Error("Video not found");
        const res = await fetch(`https://serverayush.vercel.app/api/cnd?id=${targetVid}&v=${serverNum}`);
        const data = await res.json();
        
        const mixed = data.VideoWithAudio ||[];
        const formatOptions = mixed.map((v:any) => ({ ...v, label: `${v.quality} Video`, isMuxed: true }));
        setDlState({ type: "video", status: "options", options: formatOptions, server: serverNum });
      } catch (e) {
        alert("Failed to connect to video server. Please try again."); setDlState({ type: null, status: "idle" });
      }
    }, 6000);
  };

  let albumRoute = `/album/${songDetails?.album?.id || ''}`;
  if (songDetails?.album?.url) { const match = songDetails.album.url.match(/\/album\/([^\/]+\/[^\/?]+)/); if (match) albumRoute = `/album/${match[1]}`; }

  const getCardFontSizeClass = (isPast: boolean, isFuture: boolean, isFS: boolean) => {
      const s = cardFontSize;
      if (isFS) {
         if (isPast || isFuture) return s === "Small" ? "text-[22px]" : s === "Large" ? "text-[32px]" : "text-[28px]";
         return s === "Small" ? "text-[30px]" : s === "Large" ? "text-[42px]" : "text-[36px]";
      }
      if (isPast || isFuture) return s === "Small" ? "text-[18px]" : s === "Large" ? "text-[28px]" : "text-[24px]";
      return s === "Small" ? "text-[22px]" : s === "Large" ? "text-[32px]" : "text-[28px]";
  };

  const getLineFontSize = () => {
      const s = lineFontSize;
      return s === "Small" ? "text-[14px]" : s === "Large" ? "text-[20px]" : "text-[16px]";
  };

  const showTinyBanner = ((isCanvasLoaded && isCanvasEnabled && !isVideoMode && !isLyricsFullScreen) || isVideoMode || isLyricsFullScreen);

  // MEMOIZED FLICKER-FREE LYRICS ABOVE TITLE
  const RenderedMiniLyrics = useMemo(() => {
    if (!isLyricsEnabled || isLyricsFullScreen || lyrics.length === 0) return null;
    if (isUnsynced) return <span className="absolute left-0 w-full text-left pr-2 no-select-text font-extrabold drop-shadow-xl text-white/50 text-[14px]">Music Playing</span>;

    return (
       <div className="relative w-full h-full flex justify-start items-center">
         {lyrics.map((line: any, idx: number) => {
            const diff = idx - activeLyricIndex;
            if (Math.abs(diff) > 1) return null;
            let transform = '', op = 0;
            if (diff === 0) { transform = 'translateY(0px) scale(1)'; op = 1; }
            else if (diff > 0) { transform = 'translateY(35px) scale(0.9)'; op = 0; } 
            else { return null; } 
            return (
               <div key={idx} 
                     ref={diff === 0 ? miniActiveLyricRef : null}
                     className={`absolute left-0 w-full text-left pr-2 no-select-text font-extrabold drop-shadow-xl leading-snug transition-all duration-[1500ms] ease-[cubic-bezier(0.25,1,0.5,1)] ${getLineFontSize()}`}
                     style={{ transform, opacity: op, color: 'white', zIndex: diff === 0 ? 10 : 1, transformOrigin: 'left center' }}>
                 {isMiniWordSyncEnabled ? (
                     (line.words || '♪').split(' ').map((word: string, wIdx: number, arr: any[]) => (
                         <span key={wIdx} className="lyric-word-mini inline">{word}{wIdx < arr.length - 1 ? ' ' : ''}</span>
                     ))
                 ) : (
                     line.words || "♪"
                 )}
               </div>
            );
         })}
       </div>
    );
  },[lyrics, activeLyricIndex, isLyricsEnabled, isLyricsFullScreen, isUnsynced, isMiniWordSyncEnabled, lineFontSize]);

  const RenderedLyrics = useMemo(() => {
    if (!isLyricsEnabled) return null;
    return lyrics.map((line: any, idx: number) => {
      const isActive = idx === activeLyricIndex;
      const isPast = idx < activeLyricIndex;
      const isFuture = idx > activeLyricIndex;
      
      const fzClass = getCardFontSizeClass(isPast, isFuture, isLyricsFullScreen);
      const activeClasses = `text-white ${fzClass} font-black drop-shadow-2xl leading-tight opacity-100`;
      const pastClasses = `text-white/50 ${fzClass} font-bold leading-tight opacity-50 -translate-y-2`;
      const futureClasses = `text-black/80 ${fzClass} font-black drop-shadow-md leading-tight opacity-70 translate-y-3`;

      const cleanupStyles = !isActive ? { backgroundImage: 'none', WebkitBackgroundClip: 'unset', WebkitTextFillColor: 'unset', color: '' } : {};

      return (
        <p key={idx} 
           ref={isActive ? (isLyricsFullScreen ? fullActiveLyricRef : activeLyricRef) : null} 
           onClick={() => handleLyricClick(line.time)} 
           className={`transition-all duration-[800ms] ease-out origin-left no-select-text transform ${isActive ? activeClasses : isPast ? pastClasses : futureClasses} ${!isUnsynced ? 'cursor-pointer hover:text-white/80' : ''}`} style={cleanupStyles}>
           {isWordSyncEnabled && !isUnsynced ? (
              (line.words || '♪').split(' ').map((word: string, wIdx: number, arr: any[]) => (
                  <span key={wIdx} className="lyric-word inline">{word}{wIdx < arr.length - 1 ? ' ' : ''}</span>
              ))
           ) : (
              line.words || '♪'
           )}
        </p>
      )
    });
  },[lyrics, activeLyricIndex, isLyricsFullScreen, isLyricsEnabled, cardFontSize, isWordSyncEnabled, isUnsynced]);

  const RenderedArtists = useMemo(() => {
    return uniqueArtists.map((artist: any) => {
      const artistImg = getImageUrl(artist.image); const fallbackColor = getArtistColor(artist.name || "Unknown");
      return (
        <Link key={artist.id} href={`/artist?id=${artist.id}`} onClick={() => setIsExpanded(false)} className="flex flex-col items-center gap-2 flex-shrink-0 w-[84px] group no-select-text">
          <div className="w-[84px] h-[84px] rounded-full overflow-hidden relative flex items-center justify-center shadow-lg border border-white/10 group-hover:scale-105 transition-transform" style={{ backgroundColor: artistImg ? '#282828' : fallbackColor }}>
            {!artistImg ? <span className="text-white font-bold text-3xl no-select-text">{decodeEntities(artist.name).charAt(0).toUpperCase()}</span> : <img draggable={false} src={artistImg} onError={(e) => { e.currentTarget.style.display = 'none'; }} className="w-full h-full object-cover relative z-10 no-select pointer-events-none" alt={artist.name} />}
          </div>
          <div className="flex flex-col items-center w-full px-1 no-select-text">
            <span className="text-white/90 text-[12px] text-center font-bold line-clamp-1 leading-tight drop-shadow-md">{decodeEntities(artist.name)}</span>
            <span className="text-white/50 text-[10px] text-center font-medium line-clamp-1 capitalize mt-[2px]">{artist.role}</span>
          </div>
        </Link>
      )
    });
  }, [uniqueArtists]);

  const RenderedQueue = useMemo(() => {
    return upcomingQueue.map((track: any, index: number) => {
      const isDragging = dragState.activeIndex === index;
      let transform = 'translateZ(0)';
      let zIndex = 1;

      if (isDragging) {
        transform = `translateY(${dragState.currentY - dragState.startY}px) scale(1.02) translateZ(0)`;
        zIndex = 50;
      } else if (dragState.activeIndex !== null) {
        const diff = dragState.currentY - dragState.startY;
        const targetIndex = dragState.activeIndex + Math.round(diff / 60);
        if (dragState.activeIndex < index && targetIndex >= index) transform = `translateY(-60px) translateZ(0)`;
        else if (dragState.activeIndex > index && targetIndex <= index) transform = `translateY(60px) translateZ(0)`;
      }

      const isSelected = selectedQueueItems.includes(index);

      return (
        <div key={track.id + index} 
          className={`flex items-center justify-between w-full group p-2 rounded-lg cursor-pointer relative bg-transparent will-change-transform ${isDragging ? 'shadow-2xl bg-white/10 transition-none' : 'hover:bg-white/5 transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)]'}`}
          style={{ transform, zIndex }}
        >
          {isQueueEditMode && (
            <div className="flex-shrink-0 mr-3 pl-1" onClick={(e) => {
               e.stopPropagation();
               setSelectedQueueItems(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]);
            }}>
               <div className={`w-[22px] h-[22px] rounded-full border-[2px] flex items-center justify-center transition-colors ${isSelected ? 'bg-[#1db954] border-[#1db954]' : 'border-white/40'}`}>
                  {isSelected && <Check size={14} className="text-black stroke-[3px]" />}
               </div>
            </div>
          )}

          <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0" onClick={() => { 
             if(isQueueEditMode) { setSelectedQueueItems(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]); return; }
             setCurrentSong(track); setUpcomingQueue((prev: any) => prev.filter((_: any, i: number) => i !== index)); setIsPlaying(true); 
          }}>
            <div className="w-[44px] h-[44px] flex-shrink-0 rounded-[4px] bg-[#282828] overflow-hidden">
               <img draggable={false} src={getImageUrl(track.image) || "https://via.placeholder.com/150"} alt="cover" className="w-full h-full object-cover no-select pointer-events-none" />
            </div>
            <div className="flex flex-col min-w-0 pr-2 overflow-hidden">
              <span className="text-[15px] font-bold text-white truncate">{decodeEntities(track.title || track.name)}</span>
              <span className="text-[13px] font-medium text-white/60 truncate">{decodeEntities(getArtistsText(track))}</span>
            </div>
          </div>

          {!isQueueEditMode && (
             <div className="flex-shrink-0 px-3 py-2 cursor-grab active:cursor-grabbing text-white/50 touch-none" onPointerDown={(e) => { e.stopPropagation(); handleDragStart(e, index); }}>
                 <Menu size={20} />
             </div>
          )}
        </div>
      );
    });
  },[upcomingQueue, dragState, selectedQueueItems, isQueueEditMode, setCurrentSong, setUpcomingQueue, setIsPlaying]);

  const formatSleepTimerStr = (secs: number) => {
    const m = Math.floor(secs / 60); const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const miniPlayerStyle = useMemo(() => {
    if (miniSwipeY >= 0 || isExpanded) return {};
    const expandProgress = Math.min(Math.abs(miniSwipeY) / window.innerHeight, 1);
    return {
        transform: `translateY(${miniSwipeY}px)`,
        opacity: 1 - expandProgress,
        borderRadius: `${Math.max(6, 24 * expandProgress)}px`,
        transition: 'none'
    };
  }, [miniSwipeY, isExpanded]);

  if (!currentSong) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        * { -webkit-tap-highlight-color: transparent; }
        .player-root, .player-modal { user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; touch-action: pan-y; }
        img, video, canvas { pointer-events: none; -webkit-touch-callout: none; user-select: none; }
        @keyframes spotify-marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-spotify-marquee { animation: spotify-marquee 12s linear infinite; display: inline-block; white-space: nowrap; }
        .mask-edges { mask-image: linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%); -webkit-mask-image: linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%); }
        .mask-edges-vertical { mask-image: linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%); -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%); }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        input[type=range] { -webkit-appearance: none; appearance: none; background: transparent; cursor: pointer; border-radius: 4px; }
        input[type=range]:focus { outline: none; }
        .mobile-slider::-webkit-slider-runnable-track { height: 4px; border-radius: 2px; background: rgba(255,255,255,0.2); }
        .mobile-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; height: 12px; width: 12px; border-radius: 50%; background: #fff; margin-top: -4px; box-shadow: 0 2px 4px rgba(0,0,0,0.4); border: 0; }
        .no-select { user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; pointer-events: none; }
        .no-select-text { user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
      `}} />

      <audio ref={audioRef} src={audioUrl} autoPlay={isPlaying && !isVideoMode} onEnded={playNext} onTimeUpdate={handleTimeUpdate} 
        onLoadedMetadata={() => { 
           const dur = audioRef.current?.duration || 0;
           setDuration(dur); 
           if (restoreTimeRef.current !== null && restoreTimeRef.current > 0) { audioRef.current!.currentTime = restoreTimeRef.current; setCurrentTime(restoreTimeRef.current); restoreTimeRef.current = null; } 
           syncPosition();
        }} 
      />

      {/* EXPANDED PLAYER MAIN */}
      <div className={`player-root fixed inset-0 z-[99999] text-white transition-all duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${isExpanded ? "translate-y-0 opacity-100 overflow-hidden" : "translate-y-full opacity-0 pointer-events-none"}`}>
        
        {isCanvasLoaded && !isScrolledPastMain && !showQueue && !isVideoMode && !isLyricsFullScreen && isCanvasEnabled && (
          <div className="absolute inset-0 z-10 cursor-pointer" onClick={() => setIsUiHidden(!isUiHidden)} />
        )}
        <div className="absolute inset-0 z-0 pointer-events-none transition-all duration-700" style={{ backgroundColor: dominantColor, backgroundImage: isLyricsFullScreen ? 'none' : 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.7) 100%)' }} />
        
        {canvasData?.canvasUrl && !isVideoMode && isCanvasEnabled && (
          <div className={`absolute inset-0 z-0 bg-transparent pointer-events-none transition-opacity duration-700 ${isCanvasLoaded && !isScrolledPastMain && !showQueue && !isLyricsFullScreen ? 'opacity-100' : 'opacity-0'}`}>
            <video ref={canvasVideoRef} src={canvasData.canvasUrl} autoPlay loop muted playsInline onLoadedData={() => setIsCanvasLoaded(true)} className="absolute inset-0 w-full h-full object-cover" />
            <div className={`absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70 transition-opacity duration-500 ${isUiHidden ? 'opacity-0' : 'opacity-100'}`} />
            <div className={`absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30 transition-opacity duration-500 ${isUiHidden ? 'opacity-100' : 'opacity-0'}`} />
          </div>
        )}

        <div className={`absolute inset-0 z-20 overflow-x-hidden scrollbar-hide flex flex-col pointer-events-none ${isLyricsFullScreen ? 'overflow-y-hidden' : 'overflow-y-auto'}`} onScroll={handleScroll}>
          
          <div className="w-full flex flex-col flex-shrink-0 pointer-events-auto transition-all duration-500" style={{ height: isLyricsFullScreen ? '100%' : undefined, minHeight: isLyricsFullScreen ? '100%' : '100dvh' }}>
            
            <div className={`flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-2 flex-shrink-0 w-full mt-4`}>
              <button onClick={() => setIsExpanded(false)} className="p-2 -ml-2 text-white active:opacity-50 drop-shadow-md pointer-events-auto"><ChevronDown size={28} /></button>
              <div className="flex flex-col items-center flex-1 min-w-0 px-2 drop-shadow-md no-select-text">
                <span className="text-[10px] tracking-widest text-white/70 uppercase truncate w-full text-center font-medium">Playing from {playContext?.type || 'App'}</span>
                <span className="text-[13px] font-bold text-white truncate w-full text-center mt-[2px]">{decodeEntities(playContext?.name || 'Music')}</span>
              </div>
              <button onClick={() => setShowSettingsMenu(true)} className="p-2 -mr-2 text-white active:opacity-50 drop-shadow-md pointer-events-auto"><MoreHorizontal size={24} /></button>
            </div>

            <div className={`flex-1 min-h-0 w-full flex items-center justify-center relative z-30 transition-all duration-500 ${isLyricsFullScreen ? 'px-0 py-0 flex-col items-stretch justify-start' : (isVideoMode ? 'px-4 py-2' : 'px-8 py-2')}`}>
              {isLyricsFullScreen && isLyricsEnabled ? (
                <div className="flex-1 w-full h-full flex flex-col relative overflow-hidden pointer-events-auto transition-colors duration-700 bg-transparent">
                  <div className="absolute top-4 right-4 z-[60] bg-black/40 hover:bg-black/60 rounded-full transition-colors cursor-pointer backdrop-blur-md pointer-events-auto"><button onClick={(e) => { e.stopPropagation(); setIsLyricsFullScreen(false); }} className="p-2.5 text-white"><Minimize2 size={22} /></button></div>
                  <div className="flex-1 overflow-y-auto scrollbar-hide px-6 pt-16 pb-[30vh] flex flex-col gap-8 w-full h-full mask-edges-vertical" ref={fullLyricsContainerRef}>{RenderedLyrics}</div>
                </div>
              ) : isVideoMode && ytVideoId ? (
                <div className="w-full aspect-video max-w-[600px] max-h-[50vh] relative bg-black shadow-[0_15px_40px_rgba(0,0,0,0.5)] rounded-[12px] transition-all duration-500 overflow-hidden mx-auto pointer-events-auto" style={{ transform: 'translateZ(0)' }}>
                  <iframe ref={videoIframeRef} src={`https://ayushcom.vercel.app/?vid=${ytVideoId}&t=${iframeInitialTimeRef.current}`} style={{ width: "100%", height: "100%", border: "none", pointerEvents: 'auto', borderRadius: '12px' }} allow="autoplay; fullscreen; picture-in-picture" />
                </div>
              ) : (
                <div className={`relative bg-[#282828] rounded-[8px] shadow-[0_15px_40px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${isCanvasLoaded && isCanvasEnabled ? 'opacity-0 scale-75 pointer-events-none hidden' : 'opacity-100 scale-100 block'}`} style={{ width: '100%', aspectRatio: '1/1', maxWidth: '380px', maxHeight: '50vh' }}>
                  {(loading || isVideoLoading) && <div className="absolute inset-0 z-10 bg-black/50 flex items-center justify-center"><Loader2 size={40} className="animate-spin text-white" /></div>}
                  {displayImage && <img draggable={false} src={displayImage} alt="cover" className="w-full h-full object-cover no-select pointer-events-none" />}
                </div>
              )}
            </div>

            <div className={`w-full px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] mb-2 pt-2 flex flex-col justify-end flex-shrink-0 transition-opacity duration-500 pointer-events-auto`}>
              
              <div className={`transition-all duration-500 w-full relative overflow-hidden flex items-center justify-start mask-edges-vertical ${isUiHidden && !isVideoMode ? 'max-h-0 opacity-0 mb-0' : 'mb-3 opacity-100 min-h-[75px]'}`}>
                {RenderedMiniLyrics}
              </div>

              <div className="flex items-center justify-between mb-5 drop-shadow-md w-full no-select-text">
                <div className="flex items-center gap-3 overflow-hidden pr-4 flex-1 min-w-0 w-full max-w-full">
                  {showTinyBanner && displayImage && (<img draggable={false} src={displayImage} className="w-[48px] h-[48px] rounded-md shadow-md flex-shrink-0 no-select pointer-events-none" alt="tiny cover" />)}
                  <div className="flex flex-col flex-1 min-w-0 w-full overflow-hidden">
                    <MarqueeText text={displayTitle} className="text-[22px] font-bold text-white tracking-tight drop-shadow-md w-full" />
                    <MarqueeText text={displayArtists} className="text-[15px] font-medium text-[#b3b3b3] mt-1 drop-shadow-md w-full" />
                  </div>
                </div>
                <button onClick={handleLikeClick} className="flex-shrink-0 ml-2 active:scale-75 transition-transform pointer-events-auto"><Heart size={26} fill={isSongLiked ? "#1db954" : "none"} color={isSongLiked ? "#1db954" : "white"} /></button>
              </div>

              <div className="w-full flex flex-col gap-1 mb-5 relative drop-shadow-md">
                <input type="range" min="0" max="100" value={duration > 0 ? progress : 0} onChange={handleSeekChange} onPointerDown={handleSeekStart} onPointerUp={handleSeekEnd} onTouchStart={handleSeekStart} onTouchEnd={handleSeekEnd} className="w-full mobile-slider relative z-10 pointer-events-auto" style={{ background: `linear-gradient(to right, #fff ${progress}%, rgba(255,255,255,0.2) ${progress}%)` }} />
                <div className="flex items-center justify-between text-[11px] font-medium text-[#a7a7a7] mt-1 w-full pointer-events-none no-select-text"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div>
              </div>

              <div className={`flex flex-col w-full transition-all duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] overflow-hidden ${isUiHidden && !isVideoMode ? 'max-h-0 opacity-0 translate-y-6 pointer-events-none' : 'max-h-[140px] opacity-100 translate-y-0 pointer-events-auto'}`}>
                <div className="flex items-center justify-between w-full mb-5 px-1 drop-shadow-md no-select-text">
                  <button onClick={() => { setIsShuffle(!isShuffle); if(isVideoMode && videoIframeRef.current?.contentWindow) videoIframeRef.current.contentWindow.postMessage({ type: 'MUSIC_HIDE_UI' }, '*'); }} className={`active:opacity-50 pointer-events-auto ${isShuffle ? 'text-[#1db954]' : 'text-white'}`}><Shuffle size={24} /></button>
                  <button onClick={playPrev} className="text-white active:opacity-50 pointer-events-auto"><SkipBack size={36} fill="white" stroke="white" /></button>
                  <button onClick={handlePlayPauseToggle} className="w-[64px] h-[64px] rounded-full bg-white flex items-center justify-center text-black active:scale-95 transition-transform shadow-lg pointer-events-auto">
                     {(loading || isVideoLoading) ? <Loader2 size={26} className="animate-spin text-black" /> : (isPlaying ? <Pause fill="black" stroke="black" size={26} /> : <Play fill="black" stroke="black" size={28} className="translate-x-[2px]" />)}
                  </button>
                  <button onClick={playNext} className="text-white active:opacity-50 pointer-events-auto"><SkipForward size={36} fill="white" stroke="white" /></button>
                  <button onClick={() => { setRepeatMode((prev) => (prev + 1) % 3); if(isVideoMode && videoIframeRef.current?.contentWindow) videoIframeRef.current.contentWindow.postMessage({ type: 'MUSIC_HIDE_UI' }, '*'); }} className={`active:opacity-50 relative pointer-events-auto ${repeatMode > 0 ? 'text-[#1db954]' : 'text-white/70'}`}><Repeat size={24} />{repeatMode === 2 && <span className="absolute -top-1 -right-1 bg-[#1db954] text-black text-[9px] font-bold rounded-full w-3 h-3 flex items-center justify-center">1</span>}</button>
                </div>
                <div className="flex items-center justify-between text-[#b3b3b3] w-full px-1 drop-shadow-md pointer-events-auto">
                  <button onClick={toggleVideoMode} className={`active:opacity-50 transition-colors ${isVideoMode ? 'text-[#1db954]' : 'text-[#b3b3b3]'}`}>{isVideoLoading ? <Loader2 size={20} className="animate-spin" /> : <MonitorPlay size={20} />}</button>
                  <div className="flex items-center gap-6"><button onClick={() => setShowQueue(true)} className="active:opacity-50 text-white"><ListMusic size={20} /></button></div>
                </div>
              </div>

            </div>
          </div>

          <div className={`w-full px-5 pb-24 flex flex-col gap-6 pointer-events-auto transition-opacity duration-500 ${isUiHidden && !isVideoMode ? 'opacity-0 pointer-events-none' : 'opacity-100'} ${isLyricsFullScreen ? 'hidden' : 'block'}`}>
            {isLyricsEnabled && lyrics.length > 0 && !isLyricsFullScreen && (
              <div className="rounded-2xl p-6 w-full mx-auto shadow-2xl relative overflow-hidden transition-colors duration-500 border border-white/10" style={{ backgroundColor: dominantColor }}>
                <div className="absolute inset-0 bg-black/5 z-0 pointer-events-none" />
                <div className="relative z-10 flex items-center justify-between mb-6 sticky top-0 bg-transparent no-select-text">
                  <div className="flex items-center gap-2"><h3 className="text-white font-bold text-[18px]">Lyrics</h3>{isUnsynced && <span className="bg-white/10 px-2 py-0.5 rounded-full text-[10px] font-bold text-white/70 uppercase tracking-widest border border-white/5">Unsynced</span>}</div>
                  <button onClick={() => setIsLyricsFullScreen(true)} className="p-2 text-white/80 hover:text-white rounded-full bg-black/30 pointer-events-auto"><Maximize2 size={16} /></button>
                </div>
                <div className="relative z-10 flex flex-col gap-5 max-h-[300px] overflow-y-auto scrollbar-hide pb-10" ref={lyricsContainerRef}>{RenderedLyrics}</div>
              </div>
            )}

            {!currentSong.isProFallback && uniqueArtists.length > 0 && (
              <div className="w-full mt-2"><h3 className="text-white font-bold text-[18px] mb-4 drop-shadow-md no-select-text">Artists</h3><div className="flex overflow-x-auto gap-4 scrollbar-hide pb-2 pointer-events-auto">{RenderedArtists}</div></div>
            )}

            {!currentSong.isProFallback && songDetails?.album && (
              <Link href={albumRoute} onClick={() => setIsExpanded(false)} className="w-full mb-6 bg-[#1e1e1e]/60 backdrop-blur-md rounded-2xl p-4 flex items-center gap-4 hover:bg-[#2a2a2a]/80 transition-colors border border-white/10 shadow-xl relative overflow-hidden group no-select-text pointer-events-auto">
                <div className="absolute inset-0 z-0 pointer-events-none opacity-30" style={{ backgroundColor: dominantColor }} />
                {displayImage && <img draggable={false} src={displayImage} className="w-[64px] h-[64px] rounded-md object-cover relative z-10 shadow-md border border-white/5 group-hover:scale-105 transition-transform no-select pointer-events-none" alt="Album Cover" />}
                <div className="flex flex-col relative z-10 flex-1 pr-2"><span className="text-white/60 text-[11px] uppercase tracking-widest font-bold mb-1 drop-shadow-sm">Album</span><span className="text-white font-bold text-[16px] line-clamp-1 drop-shadow-md">{decodeEntities(songDetails.album.name)}</span></div><div className="relative z-10 text-white/50 group-hover:text-white transition-colors pl-2"><ChevronDown size={20} className="-rotate-90" /></div>
              </Link>
            )}

            {!currentSong.isProFallback && songDetails && (
              <div className="w-full mb-10 rounded-2xl p-5 flex flex-col gap-4 border border-white/10 shadow-2xl relative overflow-hidden no-select-text">
                {displayImage && <div className="absolute inset-0 z-0 bg-cover bg-center opacity-30 blur-lg scale-110" style={{ backgroundImage: `url(${displayImage})` }} />}<div className="absolute inset-0 z-0 bg-gradient-to-t from-black/90 via-black/60 to-black/30 pointer-events-none" />
                <h3 className="text-white font-bold text-[18px] drop-shadow-md relative z-10 mb-2">About Song</h3>
                <div className="relative z-10 grid grid-cols-2 gap-y-5 gap-x-4">
                  {songDetails.playCount && (<div className="flex flex-col gap-1"><div className="flex items-center gap-1.5 text-white/50"><Hash size={12} /><span className="font-semibold text-[10px] uppercase tracking-wider">Play Count</span></div><span className="text-white font-bold text-[15px]">{Number(songDetails.playCount).toLocaleString('en-US')}</span></div>)}
                  {songDetails.duration && (<div className="flex flex-col gap-1"><div className="flex items-center gap-1.5 text-white/50"><Clock size={12} /><span className="font-semibold text-[10px] uppercase tracking-wider">Duration</span></div><span className="text-white font-bold text-[15px]">{formatTime(Number(songDetails.duration))}</span></div>)}
                  {(songDetails.releaseDate || songDetails.year) && (<div className="flex flex-col gap-1"><div className="flex items-center gap-1.5 text-white/50"><Calendar size={12} /><span className="font-semibold text-[10px] uppercase tracking-wider">Released</span></div><span className="text-white font-bold text-[15px]">{songDetails.releaseDate || songDetails.year}</span></div>)}
                  {songDetails.language && (<div className="flex flex-col gap-1"><div className="flex items-center gap-1.5 text-white/50"><Globe size={12} /><span className="font-semibold text-[10px] uppercase tracking-wider">Language</span></div><span className="text-white font-bold text-[15px] capitalize">{songDetails.language}</span></div>)}
                  {songDetails.label && (<div className="flex flex-col gap-1 col-span-2"><div className="flex items-center gap-1.5 text-white/50"><Disc3 size={12} /><span className="font-semibold text-[10px] uppercase tracking-wider">Label</span></div><span className="text-white font-bold text-[15px] line-clamp-1">{decodeEntities(songDetails.label)}</span></div>)}
                </div>
                {songDetails.copyright && (<div className="relative z-10 mt-3 pt-4 border-t border-white/10"><p className="text-white/40 text-[10px] font-medium leading-relaxed">{decodeEntities(songDetails.copyright)}</p></div>)}
              </div>
            )}
          </div>
        </div>

        {/* --- SETTINGS MENU --- */}
        <div className={`player-modal absolute inset-0 z-[100000] bg-black/60 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto flex flex-col justify-end ${showSettingsMenu ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setShowSettingsMenu(false)}>
          <div {...createSwipeToClose(setSettingsSwipeY, setShowSettingsMenu)} className={`w-full bg-[#121212] rounded-t-[28px] transition-transform duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] shadow-2xl border-t border-white/10 flex flex-col max-h-[85vh] ${showSettingsMenu ? 'translate-y-0' : 'translate-y-full'}`} style={{ transform: showSettingsMenu ? `translateY(${settingsSwipeY > 0 ? settingsSwipeY : 0}px)` : 'translateY(100%)', transition: settingsSwipeY > 0 ? 'none' : undefined }} onClick={e => e.stopPropagation()}>
             <div className="flex flex-col items-center pt-3 pb-1 cursor-grab active:cursor-grabbing"><div className="w-10 h-1.5 bg-white/20 rounded-full" /></div>
             <div className="flex items-center justify-between px-6 pb-4 flex-shrink-0">
                 <h3 className="text-white font-extrabold text-[22px] flex items-center gap-2"><Settings2 size={24}/> Settings</h3>
                 <button onClick={() => setShowSettingsMenu(false)} className="text-white/60 p-2 hover:text-white bg-white/5 rounded-full"><ChevronDown size={20} /></button>
             </div>

             <div className="px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] flex flex-col gap-6 overflow-y-auto scrollbar-hide flex-1">
                <div className="flex flex-col gap-3">
                   <span className="text-white/60 text-[11px] font-bold uppercase tracking-wider pl-1">Actions</span>
                   <div className="flex flex-col bg-[#1e1e1e] rounded-[16px] overflow-hidden">
                      <button onClick={handleShareSong} className="w-full flex items-center justify-between px-5 py-4 transition-colors active:bg-white/10 border-b border-white/5">
                        <div className="flex flex-col items-start text-left"><span className="text-white font-bold text-[15px]">Share Song</span><span className="text-white/50 text-[12px] font-medium mt-0.5">Share exact audio, video, & Spotify links</span></div><Share2 size={22} className="text-white/80" />
                      </button>
                      <div className="flex w-full divide-x divide-white/5">
                        <button onClick={handleDownloadMusicInit} className="flex-1 flex flex-col items-center justify-center py-4 transition-colors active:bg-white/10 hover:bg-white/5 group"><Download size={22} className="text-white/80 mb-1 group-hover:text-[#1db954] transition-colors" /><span className="text-white font-bold text-[14px]">Music</span></button>
                        <button onClick={handleDownloadVideoInit} className="flex-1 flex flex-col items-center justify-center py-4 transition-colors active:bg-white/10 hover:bg-white/5 group"><Video size={22} className="text-white/80 mb-1 group-hover:text-[#1db954] transition-colors" /><span className="text-white font-bold text-[14px]">Video</span></button>
                      </div>
                   </div>
                </div>

                <div className="flex flex-col gap-3">
                   <span className="text-white/60 text-[11px] font-bold uppercase tracking-wider pl-1">Audio Quality</span>
                   <div className="flex bg-[#1e1e1e] rounded-[16px] overflow-x-auto hide-scrollbar p-2 gap-2">
                      {['12', '48', '96', '160', '320'].map((q) => (
                         <button key={q} onClick={() => { setSelectedQuality(q); localStorage.setItem('audio_quality', q); setShowSettingsMenu(false); restoreTimeRef.current = audioRef.current?.currentTime || 0; }} className={`flex-shrink-0 px-4 py-2 rounded-xl text-[14px] font-bold transition-all ${selectedQuality === q ? 'bg-[#1db954] text-black shadow-md' : 'bg-white/5 text-white hover:bg-white/10'}`}>
                            {q} kbps
                         </button>
                      ))}
                   </div>
                </div>

                <div className="flex flex-col gap-3">
                   <span className="text-white/60 text-[11px] font-bold uppercase tracking-wider pl-1">Lyrics & Visuals</span>
                   <div className="flex flex-col bg-[#1e1e1e] rounded-[16px] overflow-hidden">
                      
                      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                        <span className="text-white font-bold text-[15px]">Show Lyrics</span>
                        <button onClick={() => { setIsLyricsEnabled(!isLyricsEnabled); localStorage.setItem('lyrics_enabled', (!isLyricsEnabled).toString()); }} className={`w-11 h-[26px] rounded-full relative transition-colors duration-300 flex items-center ${isLyricsEnabled ? 'bg-[#1db954]' : 'bg-[#535353]'}`}><div className={`w-[22px] h-[22px] bg-white rounded-full absolute shadow-md transition-transform duration-300 ${isLyricsEnabled ? 'translate-x-[20px]' : 'translate-x-[2px]'}`} /></button>
                      </div>
                      
                      {isLyricsEnabled && (
                        <div className="flex flex-col gap-4 px-5 py-4 border-b border-white/5 bg-black/10">
                          <span className="text-white/70 font-bold text-[13px] tracking-wide uppercase">Font Sizes</span>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-white/50 text-[13px] font-medium">Above Title (Mini)</span>
                            <div className="flex bg-white/5 rounded-lg p-1">
                              {['Small', 'Medium', 'Large'].map(sz => (
                                <button key={`line-${sz}`} onClick={() => { setLineFontSize(sz); localStorage.setItem('line_font_size', sz); }} className={`px-3 py-1 rounded-md text-[12px] font-bold transition-all ${lineFontSize === sz ? 'bg-white/20 text-white shadow-sm' : 'text-white/50 hover:text-white'}`}>{sz}</button>
                              ))}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-white/50 text-[13px] font-medium">Card / Fullscreen</span>
                            <div className="flex bg-white/5 rounded-lg p-1">
                              {['Small', 'Medium', 'Large'].map(sz => (
                                <button key={`card-${sz}`} onClick={() => { setCardFontSize(sz); localStorage.setItem('card_font_size', sz); }} className={`px-3 py-1 rounded-md text-[12px] font-bold transition-all ${cardFontSize === sz ? 'bg-white/20 text-white shadow-sm' : 'text-white/50 hover:text-white'}`}>{sz}</button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                        <div className="flex flex-col">
                           <span className="text-white font-bold text-[15px]">Word Sync (Card)</span>
                           <span className="text-white/50 text-[11px]">Syncs full screen & card lyrics</span>
                        </div>
                        <button onClick={() => { setIsWordSyncEnabled(!isWordSyncEnabled); localStorage.setItem('word_sync_enabled', (!isWordSyncEnabled).toString()); }} className={`w-11 h-[26px] rounded-full relative transition-colors duration-300 flex items-center ${isWordSyncEnabled ? 'bg-[#1db954]' : 'bg-[#535353]'}`}><div className={`w-[22px] h-[22px] bg-white rounded-full absolute shadow-md transition-transform duration-300 ${isWordSyncEnabled ? 'translate-x-[20px]' : 'translate-x-[2px]'}`} /></button>
                      </div>
                      
                      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                        <div className="flex flex-col">
                           <span className="text-white font-bold text-[15px]">Word Sync (Mini)</span>
                           <span className="text-white/50 text-[11px]">Syncs the lyrics above title</span>
                        </div>
                        <button onClick={() => { setIsMiniWordSyncEnabled(!isMiniWordSyncEnabled); localStorage.setItem('mini_word_sync_enabled', (!isMiniWordSyncEnabled).toString()); }} className={`w-11 h-[26px] rounded-full relative transition-colors duration-300 flex items-center ${isMiniWordSyncEnabled ? 'bg-[#1db954]' : 'bg-[#535353]'}`}><div className={`w-[22px] h-[22px] bg-white rounded-full absolute shadow-md transition-transform duration-300 ${isMiniWordSyncEnabled ? 'translate-x-[20px]' : 'translate-x-[2px]'}`} /></button>
                      </div>

                      <div className="flex items-center justify-between px-5 py-4">
                        <span className="text-white font-bold text-[15px]">Show Canvas</span>
                        <button onClick={() => { setIsCanvasEnabled(!isCanvasEnabled); localStorage.setItem('canvas_enabled', (!isCanvasEnabled).toString()); }} className={`w-11 h-[26px] rounded-full relative transition-colors duration-300 flex items-center ${isCanvasEnabled ? 'bg-[#1db954]' : 'bg-[#535353]'}`}><div className={`w-[22px] h-[22px] bg-white rounded-full absolute shadow-md transition-transform duration-300 ${isCanvasEnabled ? 'translate-x-[20px]' : 'translate-x-[2px]'}`} /></button>
                      </div>
                   </div>
                </div>

             </div>
          </div>
        </div>

        {/* --- ADVANCED DOWNLOAD MANAGER MODAL --- */}
        <div className={`player-modal absolute inset-0 z-[100005] bg-black/80 backdrop-blur-md transition-opacity duration-300 flex items-center justify-center p-6 ${dlState.type !== null ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setDlState({ type: null, status: "idle" })}>
           <div className={`w-full max-w-sm bg-[#181818] rounded-2xl shadow-2xl border border-white/10 p-6 flex flex-col gap-4 transform transition-transform duration-500 ${dlState.type !== null ? 'scale-100 translate-y-0' : 'scale-95 translate-y-8'}`} onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-white flex items-center justify-between">
                {dlState.type === "video" ? "Download Video" : "Download Music"}
                <button onClick={() => setDlState({ type: null, status: "idle" })} className="p-1 rounded-full bg-white/10 hover:bg-white/20"><X size={18} /></button>
              </h3>
              
              <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/5">
                <img src={displayImage} className="w-12 h-12 rounded-md object-cover" />
                <div className="flex flex-col flex-1 overflow-hidden"><span className="text-white font-bold text-sm truncate">{displayTitle}</span><span className="text-white/60 font-medium text-xs truncate">{displayArtists}</span></div>
              </div>

              {dlState.status === "servers" && (
                <div className="flex flex-col gap-3 py-2">
                  <p className="text-white/70 text-sm mb-1 text-center font-medium">Select Download Server</p>
                  <button onClick={() => triggerVideoServer(1)} className="w-full flex items-center justify-between py-3 px-4 rounded-lg bg-[#282828] hover:bg-[#333] transition-colors border border-white/5 active:scale-95 text-white">
                     <div className="flex items-center gap-2"><Server size={18} className="text-[#1db954]"/> <span className="font-bold">Server 1</span></div><span className="text-xs text-white/50">Standard</span>
                  </button>
                  <button onClick={() => triggerVideoServer(2)} className="w-full flex items-center justify-between py-3 px-4 rounded-lg bg-[#282828] hover:bg-[#333] transition-colors border border-white/5 active:scale-95 text-white">
                     <div className="flex items-center gap-2"><Server size={18} className="text-[#1db954]"/> <span className="font-bold">Server 2</span></div><span className="text-xs text-white/50">Fast</span>
                  </button>
                </div>
              )}

              {dlState.status === "verifying" && (<div className="py-6 flex flex-col items-center gap-3"><Loader2 className="animate-spin text-[#1db954]" size={32} /><p className="text-white/70 font-medium text-sm animate-pulse">Verifying You...</p></div>)}
              {dlState.status === "connecting" && (<div className="py-6 flex flex-col items-center gap-3"><Loader2 className="animate-spin text-[#1db954]" size={32} /><p className="text-white/70 font-medium text-sm animate-pulse">Connecting to Server {dlState.server}...</p></div>)}
              
              {dlState.status === "downloading" && (
                <div className="py-6 flex flex-col items-center gap-4">
                  <div className="w-full bg-[#333] rounded-full h-2 overflow-hidden"><div className="bg-[#1db954] h-2 transition-all duration-300" style={{width: `${dlState.progress}%`}}></div></div>
                  <p className="text-white font-bold">{dlState.progress}%</p>
                  <p className="text-white/50 text-xs">{dlState.packStep || "Downloading Data..."}</p>
                </div>
              )}

              {dlState.status === "merging" && (<div className="py-6 flex flex-col items-center gap-3"><Loader2 className="animate-spin text-[#1db954]" size={32} /><p className="text-white/70 font-medium text-sm animate-pulse">Merging Video & Audio...</p></div>)}

              {dlState.status === "options" && dlState.type === "video" && (
                <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto scrollbar-hide">
                  <p className="text-xs text-white/50 mb-2 text-center">Available perfect formats with complete audio merged.</p>
                  {dlState.options?.map((opt:any, i:number) => (
                    <button key={i} onClick={() => executeBlobDownload(opt.url, `${displayTitle} - ${displayArtists}_${opt.quality}.mp4`, true)} className="w-full flex items-center justify-between p-3 rounded-lg bg-[#282828] hover:bg-[#333] transition-colors border border-white/5 active:scale-95 text-left">
                      <div className="flex flex-col"><span className="text-white font-bold text-sm">{opt.label}</span><span className="text-white/50 text-xs">{opt.size}</span></div><Download size={18} className="text-[#1db954]" />
                    </button>
                  ))}
                </div>
              )}

              {dlState.status === "options" && dlState.type === "music" && (
                <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto scrollbar-hide">
                  <p className="text-xs text-white/50 mb-2 text-center">Download true MP3 with injected Cover Art & Metadata.</p>
                  {dlState.options?.map((opt:any, i:number) => (
                    <button key={i} onClick={() => executeMp3PackerDownload(opt.url, opt.quality)} className="w-full flex items-center justify-between p-3 rounded-lg bg-[#282828] hover:bg-[#333] transition-colors border border-white/5 active:scale-95 text-left">
                        <div className="flex flex-col"><span className="text-white font-bold text-sm">Download {opt.label}</span></div><Download size={18} className="text-[#1db954]" />
                    </button>
                  ))}
                  {(!dlState.options || dlState.options.length === 0) && (
                    <button onClick={() => executeMp3PackerDownload(audioUrl, "320")} className="w-full flex items-center justify-between p-3 rounded-lg bg-[#282828] hover:bg-[#333] transition-colors border border-white/5 active:scale-95 text-left">
                        <div className="flex flex-col"><span className="text-white font-bold text-sm">Download Premium MP3</span></div><Download size={18} className="text-[#1db954]" />
                    </button>
                  )}
                </div>
              )}
           </div>
        </div>

        {/* TIMER MENU OVERLAY */}
        {showTimerMenu && (
          <div className="player-modal absolute inset-0 z-[100010] bg-black/60 flex items-center justify-center p-6 backdrop-blur-sm pointer-events-auto" onClick={() => setShowTimerMenu(false)}>
             <div className="w-full max-w-sm bg-[#282828] rounded-2xl p-6 shadow-2xl flex flex-col gap-2 animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                <h4 className="text-white font-bold text-lg mb-2 flex justify-between items-center">Sleep Timer <button onClick={() => setShowTimerMenu(false)} className="text-white/50 hover:text-white"><X size={20}/></button></h4>
                {[5, 15, 30, 45, 60].map(mins => (
                   <button key={mins} onClick={() => { setSleepTimer(mins); setShowTimerMenu(false); }} className={`py-3 px-4 rounded-lg flex justify-between items-center transition-colors ${sleepTimer === mins ? 'bg-[#1db954]/20 text-[#1db954]' : 'bg-white/5 text-white hover:bg-white/10'}`}>
                      <span className="font-medium">{mins} minutes</span>{sleepTimer === mins && <Check size={18} />}
                   </button>
                ))}
                <button onClick={() => { setSleepTimer('end'); setShowTimerMenu(false); }} className={`py-3 px-4 rounded-lg flex justify-between items-center transition-colors ${sleepTimer === 'end' ? 'bg-[#1db954]/20 text-[#1db954]' : 'bg-white/5 text-white hover:bg-white/10'}`}>
                   <span className="font-medium">End of track</span>{sleepTimer === 'end' && <Check size={18} />}
                </button>
                <button onClick={() => { setSleepTimer(null); setShowTimerMenu(false); }} className="py-3 px-4 rounded-lg text-white/50 hover:bg-white/5 text-left mt-2 border border-white/10 transition-colors">
                   Turn off timer
                </button>
             </div>
          </div>
        )}

        {/* QUEUE OVERLAY */}
        <div className={`player-modal absolute inset-0 z-[60] bg-[#121212] transition-transform duration-300 flex flex-col pointer-events-auto ${showQueue ? 'translate-y-0' : 'translate-y-full'}`} style={{ transform: showQueue ? `translateY(${queueSwipeY > 0 ? queueSwipeY : 0}px)` : 'translateY(100%)', transition: queueSwipeY > 0 ? 'none' : undefined }}>
          <div {...createSwipeToClose(setQueueSwipeY, setShowQueue)} className="w-full bg-[#121212] flex flex-col items-center pt-3 pb-1 cursor-grab active:cursor-grabbing"><div className="w-10 h-1.5 bg-white/20 rounded-full" /></div>
          <div className="flex items-center justify-between px-5 pb-4 sticky top-0 bg-[#121212] z-20 shadow-md no-select-text">
            <button onClick={() => { setShowQueue(false); setIsQueueEditMode(false); }} className="p-2 -ml-2 text-white/80 active:opacity-50"><ChevronDown size={28} /></button>
            <span className="text-[15px] font-bold text-white">Queue</span>
            <div className="flex items-center gap-3">
               <button onClick={handleRebuildQueue} className="text-white/80 active:opacity-50"><RefreshCw size={18} /></button>
               {isQueueEditMode ? (
                  <button onClick={() => { setIsQueueEditMode(false); setSelectedQueueItems([]); }} className="text-[14px] font-bold text-[#1db954] active:opacity-50">Done</button>
               ) : (
                  <button onClick={() => setIsQueueEditMode(true)} className="text-[14px] font-medium text-white/80 active:opacity-50">Edit</button>
               )}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto px-5 pb-32 no-select-text relative scrollbar-hide" ref={queueContainerRef}>
            <span className="text-[14px] font-medium text-white/60 block mb-6 uppercase tracking-wider">Playing from {playContext?.type || 'App'}</span>
            <div className="flex items-center justify-between w-full mb-8">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-12 h-12 flex-shrink-0 rounded-[4px] bg-[#282828] overflow-hidden">{displayImage && <img draggable={false} src={displayImage} alt="cover" className="w-full h-full object-cover no-select pointer-events-none" />}</div>
                <div className="flex flex-col min-w-0 pr-2 overflow-hidden"><span className="text-[16px] font-bold text-[#1db954] truncate">{displayTitle}</span><span className="text-[14px] font-medium text-white/60 truncate">{displayArtists}</span></div>
              </div>
              <div className="flex flex-col gap-[3px] items-center justify-center w-5 h-5 opacity-80"><div className="w-1 h-3 bg-[#1db954] rounded-full animate-pulse" /><div className="w-1 h-2 bg-[#1db954] rounded-full animate-pulse delay-75" /><div className="w-1 h-4 bg-[#1db954] rounded-full animate-pulse delay-150" /></div>
            </div>
            
            <span className="text-[16px] font-bold text-white block mb-4">Next in queue</span>
            <div className="flex flex-col relative">{RenderedQueue}</div>
            
            {isFetchingRecsUI && (
              <div className="flex flex-col gap-3 mt-4">
                {[1, 2, 3, 4, 5].map(i => (<div key={i} className="flex items-center gap-3 w-full animate-pulse px-1"><div className="w-12 h-12 bg-white/10 rounded-[4px]" /><div className="flex flex-col gap-2 flex-1"><div className="w-1/2 h-3 bg-white/10 rounded-md" /><div className="w-1/3 h-2 bg-white/10 rounded-md" /></div></div>))}
              </div>
            )}
          </div>
          
          <div className="absolute bottom-0 left-0 w-full bg-[#181818] border-t border-[#282828] pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 px-6 flex justify-between items-center z-20 no-select-text shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
            {isQueueEditMode ? (
                <div className="flex items-center justify-between w-full">
                    <button onClick={() => {
                        if (selectedQueueItems.length === 0) return;
                        setUpcomingQueue(prev => {
                            const arr = [...prev]; 
                            const toMove = selectedQueueItems.map(idx => prev[idx]);
                            const remaining = arr.filter((_, i) => !selectedQueueItems.includes(i));
                            return[...toMove, ...remaining];
                        });
                        setSelectedQueueItems([]); setIsQueueEditMode(false);
                    }} className="text-white font-bold text-[13px] bg-white/10 px-4 py-2 rounded-full active:bg-white/20 transition-colors">Move to Top</button>
                    <span className="text-white/50 text-[12px] font-bold">{selectedQueueItems.length} Selected</span>
                    <button onClick={() => {
                        if (selectedQueueItems.length === 0) return;
                        setUpcomingQueue(prev => prev.filter((_, i) => !selectedQueueItems.includes(i)));
                        setSelectedQueueItems([]); setIsQueueEditMode(false);
                    }} className="text-[#ff4444] font-bold text-[13px] bg-[#ff4444]/10 px-4 py-2 rounded-full active:bg-[#ff4444]/20 transition-colors">Remove</button>
                </div>
            ) : (
                <>
                    <div className="flex flex-col items-center gap-1 active:opacity-50 cursor-pointer" onClick={() => setIsShuffle(!isShuffle)}><Shuffle size={24} className={isShuffle ? 'text-[#1db954]' : 'text-white/70'} /><span className={`text-[11px] font-medium ${isShuffle ? 'text-[#1db954]' : 'text-white/70'}`}>Shuffle</span></div>
                    <div className="flex flex-col items-center gap-1 active:opacity-50 cursor-pointer" onClick={() => setRepeatMode((prev) => (prev + 1) % 3)}><div className="relative"><Repeat size={24} className={repeatMode > 0 ? 'text-[#1db954]' : 'text-white/70'} />{repeatMode === 2 && <span className="absolute -top-1 -right-1 bg-[#1db954] text-black text-[9px] font-bold rounded-full w-3 h-3 flex items-center justify-center">1</span>}</div><span className={`text-[11px] font-medium ${repeatMode > 0 ? 'text-[#1db954]' : 'text-white/70'}`}>Repeat</span></div>
                    <div className="flex flex-col items-center gap-1 active:opacity-50 cursor-pointer text-white/70" onClick={() => setShowTimerMenu(true)}><div className={`relative ${sleepTimer ? 'text-[#1db954]' : 'text-white/70'}`}><Timer size={24} /></div><span className={`text-[11px] font-medium ${sleepTimer ? 'text-[#1db954]' : 'text-white/70'}`}>{timerRemaining ? formatSleepTimerStr(timerRemaining) : sleepTimer === 'end' ? 'Track End' : 'Timer'}</span></div>
                </>
            )}
          </div>
        </div>
      </div>

      <div onTouchStart={handleMiniTouchStart} onTouchMove={handleMiniTouchMove} onTouchEnd={handleMiniTouchEnd} onClick={() => setIsExpanded(true)} className={`player-root fixed bottom-[65px] left-[8px] right-[8px] h-[56px] rounded-[6px] z-[99990] cursor-pointer overflow-hidden transition-all duration-[400ms] shadow-md no-select-text ${isExpanded ? 'opacity-0 pointer-events-none translate-y-6 scale-[0.98]' : 'opacity-100 scale-100'}`} style={{ backgroundColor: dominantColor, ...miniPlayerStyle }}>
        <div className="absolute inset-0 bg-black/25 z-0 pointer-events-none" />
        <div className="relative z-10 w-full h-full flex items-center px-2">
          <div className="w-[40px] h-[40px] flex-shrink-0 rounded-[4px] shadow-sm overflow-hidden bg-[#282828] relative mr-3">
            {(loading || isVideoLoading) && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Loader2 size={16} className="animate-spin text-white" /></div>}
            {displayImage && <img draggable={false} src={displayImage} alt="cover" className="w-full h-full object-cover no-select pointer-events-none" />}
          </div>
          <div className="flex flex-col flex-1 min-w-0 pr-3 justify-center"><MarqueeText text={displayTitle} className="text-[13px] font-bold text-white leading-tight mb-[2px] w-full" /><MarqueeText text={displayArtists} className="text-[12px] font-medium text-white/70 leading-tight w-full" /></div>
          <div className="flex items-center gap-4 flex-shrink-0 pr-2 text-white">
            <button className="active:scale-75 transition-transform flex items-center justify-center w-[20px] h-[20px]" onClick={toggleVideoMode}><MonitorPlay size={20} className={isVideoMode ? "text-[#1db954]" : ""} /></button>
            <button className="active:scale-75 transition-transform flex items-center justify-center w-[24px] h-[24px]" onClick={handlePlayPauseToggle}>
               {(loading || isVideoLoading) ? <Loader2 size={24} className="animate-spin text-white" /> : (isPlaying ? <Pause fill="white" stroke="white" size={24} /> : <Play fill="white" stroke="white" size={24} className="translate-x-[1px]" />)}
            </button>
          </div>
        </div>
        <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-white/20 rounded-full z-20 pointer-events-none overflow-hidden"><div className="h-full bg-white rounded-full transition-all duration-300 ease-linear" style={{ width: `${progress}%` }} /></div>
      </div>
    </>
  );
}
