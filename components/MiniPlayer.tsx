/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useAppContext } from "../context/AppContext";
import { 
  Play, Pause, SkipForward, SkipBack, Loader2, ChevronDown, 
  MoreHorizontal, Shuffle, Repeat, Heart, ListMusic, 
  MonitorPlay, Maximize2, Menu, Timer, Disc3, Calendar, Clock, Hash, Globe
} from "lucide-react";

// --- UTILITIES ---
const decodeEntities = (text: string) => {
  if (!text) return "";
  return text.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&apos;/g, "'");
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
  if (parts.length >= 2) { return parseInt(parts[0], 10) * 60 + parseFloat(parts[1]); }
  return 0;
};

// --- RAPID API EXACT MATCHER LOGIC ---
const RAPID_KEYS =[
  "d1edce158amshec139440d20658ap1f2545jsnbb7da9add82f",
  "6cf7f03014msh787c51a713c0264p15c20djsna1f9a9f6a378",
  "13d48f6bb8msh459c11b91bdcc44p110f4ejsn099443894115",
  "03fc23317fmsh0535ef9ec8c6f5bp1db59bjsn545991df9343",
  "e54e3fbc4dmshfc16d4417b618fdp1a2fafjsn30c72d8cf3ab"
];
const RAPID_API_HOST = "spotify81.p.rapidapi.com";

const performMatching = (apiData: any, targetTrack: string, targetArtist: string): any => {
  if (!apiData.tracks || apiData.tracks.length === 0) return null;
  const clean = (s: string) => (s || "").toLowerCase().replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ").trim();
  const tTitle = clean(targetTrack); const tArtist = clean(targetArtist);
  let bestMatch: any = null; let highestScore = 0;
  
  apiData.tracks.forEach((item: any) => {
      const track = item.data; if (!track) return;
      const rTitle = clean(track.name); const rArtists = track.artists.items.map((a: any) => clean(a.profile.name));
      let score = 0; let artistMatched = false;
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
      if (score > highestScore) { highestScore = score; bestMatch = track; }
  });
  if (highestScore > 0) return bestMatch;
  if (apiData.tracks && apiData.tracks.length > 0) return apiData.tracks[0].data;
  return null;
};

// --- PERFECT MARQUEE COMPONENT ---
const MarqueeText = ({ text, className = "" }: { text: string, className?: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const checkOverflow = () => { if (containerRef.current && textRef.current) setIsOverflowing(textRef.current.scrollWidth > containerRef.current.clientWidth + 2); };
    checkOverflow();
    const timeouts =[setTimeout(checkOverflow, 100), setTimeout(checkOverflow, 500)];
    if (!containerRef.current) return;
    const observer = new ResizeObserver(checkOverflow); observer.observe(containerRef.current);
    return () => { timeouts.forEach(clearTimeout); observer.disconnect(); };
  },[text]);

  return (
    <div ref={containerRef} className={`overflow-hidden whitespace-nowrap w-full ${isOverflowing ? "mask-edges" : ""} ${className}`}>
      <div className={`inline-block ${isOverflowing ? "animate-spotify-marquee" : ""}`}>
        <span ref={textRef} className={isOverflowing ? "pr-12" : ""}>{text}</span>
        {isOverflowing && <span className="pr-12">{text}</span>}
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
export default function MiniPlayer() {
  const { currentSong, isPlaying, setIsPlaying, setCurrentSong, queue } = useAppContext();
  
  const[audioUrl, setAudioUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const[progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const[duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isExpanded, setIsExpanded] = useState(false);
  const[dominantColor, setDominantColor] = useState("rgb(83, 83, 83)");
  const[isScrolledPastMain, setIsScrolledPastMain] = useState(false);
  const[isUiHidden, setIsUiHidden] = useState(false); 

  const[isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState(0); 

  const[showQueue, setShowQueue] = useState(false);
  const[upcomingQueue, setUpcomingQueue] = useState<any[]>([]);
  
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const[dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const rapidKeyIdxRef = useRef(0);
  const [spotifyId, setSpotifyId] = useState<string | null>(null);
  const[spotifyUrl, setSpotifyUrl] = useState<string | null>(null);
  const [lyrics, setLyrics] = useState<any[]>([]);
  const[syncType, setSyncType] = useState<string | null>(null);
  const [activeLyricIndex, setActiveLyricIndex] = useState(-1);
  const[canvasData, setCanvasData] = useState<any>(null);
  const[isCanvasLoaded, setIsCanvasLoaded] = useState(false);
  
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const activeLyricRef = useRef<HTMLParagraphElement>(null);
  const canvasVideoRef = useRef<HTMLVideoElement>(null);

  // Queue Buffering
  const fetchedRecsFor = useRef<string | null>(null);
  const fetchingRecsRef = useRef(false);
  const[isFetchingRecsUI, setIsFetchingRecsUI] = useState(false);
  
  const [swipeX, setSwipeX] = useState(0);
  const touchStartX = useRef(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [songDetails, setSongDetails] = useState<any>(null);

  // VIDEO PLAYER STATES & REFS
  const[isVideoMode, setIsVideoMode] = useState(false);
  const [ytVideoId, setYtVideoId] = useState<string | null>(null);
  const[prefetchedYtId, setPrefetchedYtId] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const videoIframeRef = useRef<HTMLIFrameElement>(null);

  const rawTitle = currentSong ? decodeEntities(currentSong.title || currentSong.name || "Unknown") : "";
  const rawArtists = currentSong ? decodeEntities(getArtistsText(currentSong)) : "";
  const rawImage = currentSong ? getImageUrl(currentSong.image) : "";

  const displayTitle = songDetails?.name ? decodeEntities(songDetails.name) : rawTitle;
  const displayArtists = songDetails ? decodeEntities(getArtistsText(songDetails)) : rawArtists;
  const displayImage = songDetails?.image ? getImageUrl(songDetails.image) : rawImage;
  
  let contextType = "TRACK"; let contextName = "Single Track";
  const rawPlaylistName = currentSong?.playlistName || currentSong?.playlist?.name || currentSong?.playlist?.title;

  if (upcomingQueue.length > 0 && upcomingQueue[0]?.isRecommendation) { contextType = "RADIO"; contextName = "Similar Tracks"; } 
  else if (rawPlaylistName) { contextType = "PLAYLIST"; contextName = rawPlaylistName; } 
  else if (queue && queue.length > 1 && currentSong?.album?.name) { contextType = "ALBUM"; contextName = currentSong.album.name; } 
  else if (songDetails?.album?.name) { contextType = "ALBUM"; contextName = songDetails.album.name; }

  const allArtists = songDetails?.artists?.all ||[];
  const uniqueArtistsMap = new Map();
  allArtists.forEach((artist: any) => {
    if (uniqueArtistsMap.has(artist.id)) {
      const existing = uniqueArtistsMap.get(artist.id);
      const newRole = (artist.role || "Artist").replace(/_/g, ' ');
      if (!existing.role.toLowerCase().includes(newRole.toLowerCase())) existing.role = `${existing.role}, ${newRole}`;
    } else { uniqueArtistsMap.set(artist.id, { ...artist, role: (artist.role || "Artist").replace(/_/g, ' ') }); }
  });
  const uniqueArtists = Array.from(uniqueArtistsMap.values());

  // --- BACKGROUND PRE-FETCH YT VIDEO ID (Zero Latency Fix) ---
  useEffect(() => {
    if (!displayTitle || !displayArtists) return;
    let isMounted = true;
    setPrefetchedYtId(null); 

    const prefetchYT = async () => {
      try {
        const query = `${displayTitle} ${displayArtists.split(',').slice(0, 2).join(' ')} official music video`;
        const targetUrl = `https://ayushvid.vercel.app/api?q=${encodeURIComponent(query)}`;
        let data = null;
        try {
          const jinaRes = await fetch(`https://r.jina.ai/${targetUrl}`, { headers: { Accept: "application/json" }});
          const jinaText = await jinaRes.text();
          try { data = JSON.parse(jinaText); } 
          catch(e) { const match = jinaText.match(/\{[\s\S]*\}/); if(match) data = JSON.parse(match[0]); }
        } catch (err) {}

        if (!data?.top_result?.videoId) {
          const fallbackRes = await fetch(targetUrl);
          data = await fallbackRes.json();
        }

        if (isMounted && data?.top_result?.videoId) {
          setPrefetchedYtId(data.top_result.videoId);
        }
      } catch (err) {
        console.error("Background YT prefetch failed or delayed.");
      }
    };
    prefetchYT();
    return () => { isMounted = false; };
  }, [displayTitle, displayArtists]);

  // --- TWO-WAY SYNC BRIDGE: Receive updates from Iframe ---
  useEffect(() => {
    const handleMsg = (e: MessageEvent) => {
      if (e.data?.type === 'YTP_TIME') {
        if (isVideoMode) {
          setCurrentTime(e.data.time);
          if (duration > 0) setProgress((e.data.time / duration) * 100);
        }
      } else if (e.data?.type === 'YTP_STATE') {
        if (e.data.state === 1) { audioRef.current?.pause(); setIsPlaying(true); } // Playing
        else if (e.data.state === 2) { setIsPlaying(false); } // Paused
      }
    };
    window.addEventListener('message', handleMsg);
    return () => window.removeEventListener('message', handleMsg);
  }, [isVideoMode, duration]);

  // Handle Play/Pause Clicks (Sends to both Audio and Video Iframe) - FIXED TYPE DEFINITION
  const handlePlayPauseToggle = (e?: any) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    const newState = !isPlaying;
    setIsPlaying(newState);
    
    if (isVideoMode && videoIframeRef.current?.contentWindow) {
      videoIframeRef.current.contentWindow.postMessage({ type: newState ? 'MUSIC_PLAY' : 'MUSIC_PAUSE' }, '*');
    } else {
      if (newState) audioRef.current?.play().catch(()=>{});
      else audioRef.current?.pause();
    }
  };

  // Video Toggle Action (Uses Prefetched ID for Instant Load)
  const toggleVideoMode = async (e?: React.MouseEvent) => {
    if (e && e.stopPropagation) e.stopPropagation();
    
    // Switch to Audio
    if (isVideoMode) {
      setIsVideoMode(false);
      if (audioRef.current) { audioRef.current.play(); setIsPlaying(true); }
      return;
    }

    // Switch to Video (Instant if pre-fetched)
    if (prefetchedYtId) {
      setYtVideoId(prefetchedYtId);
      setIsVideoMode(true);
      if (audioRef.current) audioRef.current.pause();
      setIsPlaying(false); // UI state toggles via iframe messages
      return;
    }

    // Fallback if user taps before prefetch finishes
    setIsVideoLoading(true);
    if (audioRef.current) audioRef.current.pause();
    setIsPlaying(false);

    try {
      const query = `${displayTitle} ${displayArtists.split(',').slice(0, 2).join(' ')} official music video`;
      const targetUrl = `https://ayushvid.vercel.app/api?q=${encodeURIComponent(query)}`;
      
      let data = null;
      try {
        const jinaRes = await fetch(`https://r.jina.ai/${targetUrl}`, { headers: { Accept: "application/json" }});
        const jinaText = await jinaRes.text();
        try { data = JSON.parse(jinaText); } catch (e) { const match = jinaText.match(/\{[\s\S]*\}/); if (match) data = JSON.parse(match[0]); }
      } catch (err) {}

      if (!data?.top_result?.videoId) {
        const fallbackRes = await fetch(targetUrl);
        data = await fallbackRes.json();
      }

      if (data?.top_result?.videoId) {
        setYtVideoId(data.top_result.videoId);
        setPrefetchedYtId(data.top_result.videoId); 
        setIsVideoMode(true);
      } else {
        if (audioRef.current) { audioRef.current.play(); setIsPlaying(true); }
      }
    } catch (err) {
      if (audioRef.current) { audioRef.current.play(); setIsPlaying(true); }
    } finally {
      setIsVideoLoading(false);
    }
  };

  // Ghost Queue Cleanup
  useEffect(() => {
    if (queue && currentSong) {
      const idx = queue.findIndex((s: any) => s.id === currentSong.id);
      if (idx !== -1) { setUpcomingQueue(queue.slice(idx + 1)); } 
      else { setUpcomingQueue(prev => { if (prev.length > 0 && prev[0].id === currentSong.id) return prev.slice(1); return[]; }); }
    }
  }, [queue, currentSong]);

  // Auto Build 25 Song Recommendations Engine
  useEffect(() => {
    let isSubscribed = true;
    const fetchRecommendations = async () => {
      if (upcomingQueue.length < 25 && !fetchingRecsRef.current && currentSong) {
        const baseSong = upcomingQueue.length > 0 ? upcomingQueue[upcomingQueue.length - 1] : currentSong;
        const targetSpotifyUrl = baseSong?.spotifyUrl || (baseSong.id === currentSong.id ? spotifyUrl : null);

        if (!targetSpotifyUrl || fetchedRecsFor.current === targetSpotifyUrl) return;

        fetchingRecsRef.current = true; setIsFetchingRecsUI(true);
        fetchedRecsFor.current = targetSpotifyUrl;
        
        let parsedData = null;
        const targetUrl = `https://ayushdetaser.vercel.app/api?link=${encodeURIComponent(targetSpotifyUrl)}`;

        try {
          const jinaRes = await fetch(`https://r.jina.ai/${targetUrl}`, { headers: { Accept: "application/json" } });
          const jinaText = await jinaRes.text();
          try { parsedData = JSON.parse(jinaText); } 
          catch(e) { const jsonMatch = jinaText.match(/\{[\s\S]*\}/); if (jsonMatch) parsedData = JSON.parse(jsonMatch[0]); }
        } catch (error) {}

        if (!parsedData || !parsedData.recommendations) {
          try { const res = await fetch(targetUrl); parsedData = await res.json(); } catch (error) {}
        }

        if (isSubscribed && parsedData && parsedData.status === 'success' && parsedData.recommendations?.length > 0) {
          const mapped = parsedData.recommendations.map((rec: any) => {
            const saavnIdMatch = rec?.jiosaavn_link?.match(/\/([^\/]+)$/);
            const saavnId = saavnIdMatch ? saavnIdMatch[1] : Math.random().toString();
            return {
              id: saavnId, title: rec.title, name: rec.title, artists: rec.artist,
              image: rec.banner_link, url: rec.jiosaavn_link, downloadUrl:[{ url: rec.stream_url }],
              isRecommendation: true, spotifyUrl: rec.spotify_link
            };
          });
          
          setUpcomingQueue((prev: any[]) => {
            const existingIds = new Set(prev.map(s => s.id));
            existingIds.add(currentSong.id);
            if (queue) queue.forEach((s: any) => existingIds.add(s.id)); 
            const newSongs = mapped.filter((m: any) => !existingIds.has(m.id));
            return[...prev, ...newSongs];
          });
        }
        
        fetchingRecsRef.current = false;
        if (isSubscribed) setIsFetchingRecsUI(false);
      }
    };
    fetchRecommendations();
    return () => { isSubscribed = false; };
  },[upcomingQueue.length, spotifyUrl, currentSong]);

  // Full Metadata Override & Fast Load
  useEffect(() => {
    if (!currentSong) return;
    setSpotifyId(null); setSpotifyUrl(null); setLyrics([]); setSyncType(null); setCanvasData(null);
    setIsCanvasLoaded(false); setActiveLyricIndex(-1); setIsScrolledPastMain(false); setIsUiHidden(false);
    setSongDetails(null); setIsVideoMode(false); setYtVideoId(null);

    const fetchUrl = async () => {
      setLoading(true);
      try {
        const fetchLink = encodeURIComponent(currentSong.url || currentSong.perma_url || "");
        const res = await fetch(`https://ayushm-psi.vercel.app/api/songs?link=${fetchLink}`);
        const json = await res.json();
        
        if (json.data?.[0]) {
          if (currentSong.isRecommendation && currentSong.downloadUrl?.length > 0) {
            setAudioUrl(currentSong.downloadUrl[currentSong.downloadUrl.length - 1].url);
          } else if (json.data[0].downloadUrl) {
            setAudioUrl(json.data[0].downloadUrl[json.data[0].downloadUrl.length - 1].url);
          }
          setSongDetails(json.data[0]); 
        } else if (currentSong.downloadUrl?.length > 0) {
          setAudioUrl(currentSong.downloadUrl[currentSong.downloadUrl.length - 1].url);
        }
      } catch (err) {
        if (currentSong.downloadUrl?.length > 0) setAudioUrl(currentSong.downloadUrl[currentSong.downloadUrl.length - 1].url);
      }
      setLoading(false);
    };

    const fetchSpotifyMatch = async () => {
      const cacheKey = `spotify_match_${currentSong.id}`;
      const cachedUrl = typeof window !== "undefined" ? localStorage.getItem(cacheKey) : null;
      const cachedId = typeof window !== "undefined" ? localStorage.getItem(cacheKey + '_id') : null;

      if (currentSong.spotifyUrl) {
        const extractedId = currentSong.spotifyUrl.split('/track/')[1]?.split('?')[0];
        if (extractedId) {
          setSpotifyId(extractedId); setSpotifyUrl(currentSong.spotifyUrl);
          if (typeof window !== "undefined") { localStorage.setItem(cacheKey, currentSong.spotifyUrl); localStorage.setItem(cacheKey + '_id', extractedId); }
          return;
        }
      }
      
      if (cachedUrl && cachedId) { setSpotifyId(cachedId); setSpotifyUrl(cachedUrl); return; }

      const searchArtist = displayArtists ? displayArtists.split(',').slice(0, 3).join(' ') : "";
      const query = `${displayTitle} ${searchArtist}`.trim();
      const searchUrl = `https://${RAPID_API_HOST}/search?q=${encodeURIComponent(query)}&type=tracks&offset=0&limit=25&numberOfTopResults=5`;

      let matchData = null;
      for (let attempt = 0; attempt < RAPID_KEYS.length; attempt++) {
        try {
          const response = await fetch(searchUrl, { method: 'GET', headers: { 'x-rapidapi-key': RAPID_KEYS[rapidKeyIdxRef.current], 'x-rapidapi-host': RAPID_API_HOST } });
          if (response.ok) { matchData = await response.json(); break; } 
          else if ([429, 401, 403].includes(response.status)) rapidKeyIdxRef.current = (rapidKeyIdxRef.current + 1) % RAPID_KEYS.length;
          else break; 
        } catch (e) { rapidKeyIdxRef.current = (rapidKeyIdxRef.current + 1) % RAPID_KEYS.length; }
      }

      if (matchData) {
        const match: any = performMatching(matchData, displayTitle, searchArtist);
        if (match) { 
          const newUrl = `https://open.spotify.com/track/${match.id}`;
          setSpotifyId(match.id); setSpotifyUrl(newUrl); 
          if (typeof window !== "undefined") { localStorage.setItem(cacheKey, newUrl); localStorage.setItem(cacheKey + '_id', match.id); }
        }
      }
    };
    fetchUrl(); fetchSpotifyMatch();
  }, [currentSong]);

  useEffect(() => {
    if (!spotifyId || !spotifyUrl) return;
    const fetchExtras = async () => {
      try {
        const lyricsRes = await fetch(`https://lyr-nine.vercel.app/api/lyrics?url=${encodeURIComponent(spotifyUrl)}&format=lrc`);
        if (lyricsRes.ok) {
          const lyricsJson = await lyricsRes.json();
          if (lyricsJson.lines) { setLyrics(lyricsJson.lines.map((l: any) => ({ time: parseTimeTag(l.timeTag), words: l.words }))); setSyncType(lyricsJson.syncType); }
        }
        let canvasJson = null;
        const targetCanvasUrl = `https://ayush-gamma-coral.vercel.app/api/canvas?trackId=${spotifyId}`;
        try {
          const res = await fetch(targetCanvasUrl);
          if (!res.ok) throw new Error("CORS Error");
          canvasJson = await res.json();
        } catch (e) {
          try {
            const jinaRes = await fetch(`https://r.jina.ai/${targetCanvasUrl}`, { headers: { Accept: "application/json" } });
            const jinaData = await jinaRes.json();
            if (jinaData && jinaData.canvasesList) canvasJson = jinaData;
            else {
              const proxyContent = typeof jinaData === 'string' ? jinaData : (jinaData?.data?.content || jinaData?.content || jinaData?.text || "");
              const jsonStrMatch = proxyContent.match(/\{[\s\S]*\}/);
              if (jsonStrMatch) canvasJson = JSON.parse(jsonStrMatch[0]);
            }
          } catch (fallbackError) {}
        }
        if (canvasJson && canvasJson.canvasesList && canvasJson.canvasesList.length > 0) setCanvasData(canvasJson.canvasesList[0]);
      } catch (e) {}
    };
    fetchExtras();
  }, [spotifyId, spotifyUrl]);

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
      audioRef.current.loop = repeatMode === 2;
      if (isPlaying && !isVideoMode) { const playPromise = audioRef.current.play(); if (playPromise !== undefined) playPromise.catch(() => {}); }
      else audioRef.current.pause();
    }
  },[isPlaying, audioUrl, volume, repeatMode, isVideoMode]);

  useEffect(() => {
    if (canvasVideoRef.current) {
      if (isPlaying && !isScrolledPastMain && isExpanded && !showQueue && !isVideoMode) {
        const playPromise = canvasVideoRef.current.play();
        if (playPromise !== undefined) playPromise.catch(() => {});
      } else { canvasVideoRef.current.pause(); }
    }
  },[isPlaying, isScrolledPastMain, isCanvasLoaded, isExpanded, showQueue, isVideoMode]);

  const syncPosition = useCallback(() => {
    if ('mediaSession' in navigator && audioRef.current && duration > 0) {
      try { navigator.mediaSession.setPositionState({ duration, playbackRate: 1, position: audioRef.current.currentTime }); } catch(e) {}
    }
  },[duration]);

  // Lockscreen Media Controls Hook (FIXED EVENT BINDING ERROR)
  useEffect(() => {
    if ('mediaSession' in navigator && currentSong) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: displayTitle || 'Unknown Track',
        artist: displayArtists || 'Unknown Artist',
        album: decodeEntities(contextName),
        artwork:[
          { src: displayImage, sizes: '96x96', type: 'image/jpeg' },
          { src: displayImage, sizes: '256x256', type: 'image/jpeg' },
          { src: displayImage, sizes: '512x512', type: 'image/jpeg' }
        ]
      });
      navigator.mediaSession.setActionHandler('play', () => handlePlayPauseToggle());
      navigator.mediaSession.setActionHandler('pause', () => handlePlayPauseToggle());
      navigator.mediaSession.setActionHandler('previoustrack', () => playPrev());
      navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
    }
  },[currentSong, displayTitle, displayArtists, displayImage, contextName, isVideoMode, isPlaying]);

  const handleTimeUpdate = () => {
    if (audioRef.current && !isVideoMode) {
      const c = audioRef.current.currentTime; const d = audioRef.current.duration;
      setCurrentTime(c); setDuration(d || 0);
      if (d > 0) setProgress((c / d) * 100);
      if (d > 0 && duration === 0) syncPosition();

      if (syncType === "LINE_SYNCED" && lyrics.length > 0) {
        let activeIdx = -1;
        for (let i = 0; i < lyrics.length; i++) { if (lyrics[i].time <= c) activeIdx = i; else break; }
        if (activeIdx !== activeLyricIndex) setActiveLyricIndex(activeIdx);
      }
    }
  };

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrolled = e.currentTarget.scrollTop > 100;
    if (scrolled !== isScrolledPastMain) setIsScrolledPastMain(scrolled);
  },[isScrolledPastMain]);

  useEffect(() => {
    if (activeLyricRef.current && lyricsContainerRef.current) {
      const container = lyricsContainerRef.current; const element = activeLyricRef.current;
      const scrollPos = element.offsetTop - container.offsetTop - (container.clientHeight / 2) + (element.clientHeight / 2);
      container.scrollTo({ top: scrollPos, behavior: 'smooth' });
    }
  },[activeLyricIndex]);

  const handleLyricClick = (time: number) => {
    if (isVideoMode && videoIframeRef.current?.contentWindow) {
      videoIframeRef.current.contentWindow.postMessage({ type: 'MUSIC_SEEK', time: time }, '*');
    } else if (audioRef.current && duration > 0) {
      audioRef.current.currentTime = time; setCurrentTime(time); syncPosition();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value); setProgress(val);
    const newTime = (val / 100) * duration;
    
    if (isVideoMode && videoIframeRef.current?.contentWindow) {
      videoIframeRef.current.contentWindow.postMessage({ type: 'MUSIC_SEEK', time: newTime }, '*');
      setCurrentTime(newTime);
    } else if (audioRef.current && duration > 0) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime); syncPosition();
    }
  };

  const handleSort = () => {
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      const _upcomingQueue = [...upcomingQueue];
      const draggedItemContent = _upcomingQueue.splice(dragItem.current, 1)[0];
      _upcomingQueue.splice(dragOverItem.current, 0, draggedItemContent);
      setUpcomingQueue(_upcomingQueue);
    }
    dragItem.current = null; dragOverItem.current = null;
    setDraggedIndex(null); setDropTargetIndex(null);
  };

  const playNext = () => {
    if (repeatMode === 2 && audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play(); return; }
    if (isShuffle && queue && queue.length > 0) {
      const randomIdx = Math.floor(Math.random() * queue.length);
      setCurrentSong(queue[randomIdx]); setIsPlaying(true); return;
    }
    if (upcomingQueue.length > 0) { setCurrentSong(upcomingQueue[0]); setIsPlaying(true); } 
    else if (repeatMode === 1 && queue && queue.length > 0) { setCurrentSong(queue[0]); setIsPlaying(true); } 
    else { setIsPlaying(false); setProgress(0); }
  };

  const playPrev = () => {
    if (audioRef.current && audioRef.current.currentTime > 3) { audioRef.current.currentTime = 0; return; }
    if (!queue || queue.length === 0) return;
    const idx = queue.findIndex((s: any) => s.id === currentSong.id);
    if (idx > 0) { setCurrentSong(queue[idx - 1]); setIsPlaying(true); }
  };

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchMove = (e: React.TouchEvent) => {
    const diff = e.touches[0].clientX - touchStartX.current;
    if (diff > 0 && !showQueue) setSwipeX(diff);
  };
  const handleTouchEnd = () => {
    if (swipeX > window.innerWidth * 0.45 && !showQueue) { setCurrentSong(null); setIsPlaying(false); setIsExpanded(false); }
    setSwipeX(0); 
  };

  if (!currentSong) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spotify-marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes slide-up-lyric { 0% { transform: translateY(12px) scale(0.98); opacity: 0; filter: blur(3px); } 100% { transform: translateY(0) scale(1); opacity: 1; filter: blur(0); } }
        .animate-spotify-marquee { animation: spotify-marquee 12s linear infinite; display: inline-block; }
        .animate-lyric-change { animation: slide-up-lyric 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .mask-edges { mask-image: linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%); -webkit-mask-image: linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%); }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        input[type=range] { -webkit-appearance: none; appearance: none; background: transparent; cursor: pointer; border-radius: 4px; }
        input[type=range]:focus { outline: none; }
        .mobile-slider::-webkit-slider-runnable-track { height: 4px; border-radius: 2px; background: rgba(255,255,255,0.2); }
        .mobile-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; height: 12px; width: 12px; border-radius: 50%; background: #fff; margin-top: -4px; box-shadow: 0 2px 4px rgba(0,0,0,0.4); border: 0; }
      `}} />

      <audio ref={audioRef} src={audioUrl} autoPlay={isPlaying && !isVideoMode} onEnded={playNext} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} />

      {/* MOBILE FULL SCREEN OVERLAY */}
      <div className={`md:hidden fixed inset-0 z-[99999] text-white transition-transform duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${isExpanded ? "translate-y-0" : "translate-y-full"}`}>
        
        {isCanvasLoaded && !isScrolledPastMain && !showQueue && !isVideoMode && (
          <div className="absolute inset-0 z-10 cursor-pointer" onClick={() => setIsUiHidden(!isUiHidden)} />
        )}

        {/* BACKGROUNDS */}
        <div className="absolute inset-0 z-0 pointer-events-none" style={{ backgroundColor: dominantColor, backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.85) 100%)' }} />
        {canvasData?.canvasUrl && !isVideoMode && (
          <div className={`absolute inset-0 z-0 bg-transparent pointer-events-none transition-opacity duration-700 ${isCanvasLoaded && !isScrolledPastMain && !showQueue ? 'opacity-100' : 'opacity-0'}`}>
            <video ref={canvasVideoRef} src={canvasData.canvasUrl} autoPlay loop muted playsInline onLoadedData={() => setIsCanvasLoaded(true)} className="absolute inset-0 w-full h-full object-cover scale-105" />
            <div className={`absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/90 transition-opacity duration-500 ${isUiHidden ? 'opacity-0' : 'opacity-100'}`} />
          </div>
        )}

        {/* SCROLLABLE MAIN CONTENT */}
        <div className="absolute inset-0 z-20 overflow-y-auto overflow-x-hidden scrollbar-hide flex flex-col pointer-events-none" onScroll={handleScroll}>
          
          <div className="w-full flex flex-col flex-shrink-0 pointer-events-auto" style={{ minHeight: 'calc(100dvh - 90px)' }}>
            
            {/* Header */}
            <div className={`flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-2 flex-shrink-0 w-full mt-4 transition-opacity duration-500 ${isUiHidden && !isVideoMode ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
              <button onClick={() => setIsExpanded(false)} className="p-2 -ml-2 text-white active:opacity-50 drop-shadow-md"><ChevronDown size={28} /></button>
              <div className="flex flex-col items-center flex-1 min-w-0 px-2 drop-shadow-md">
                <span className="text-[10px] tracking-widest text-white/70 uppercase truncate w-full text-center font-medium">Playing from {contextType}</span>
                <span className="text-[13px] font-bold text-white truncate w-full text-center mt-[2px]">{decodeEntities(contextName)}</span>
              </div>
              <button className="p-2 -mr-2 text-white active:opacity-50 drop-shadow-md"><MoreHorizontal size={24} /></button>
            </div>

            {/* Artwork / Video Wrapper */}
            <div className="flex-1 w-full min-h-0 flex items-center justify-center py-2 px-8">
              {isVideoMode && ytVideoId ? (
                <div className="w-full relative shadow-[0_15px_40px_rgba(0,0,0,0.5)] bg-black rounded-[8px] overflow-hidden" style={{ aspectRatio: '16/9', maxWidth: '100%' }}>
                  {/* TWO WAY SYNC IFRAME */}
                  <iframe ref={videoIframeRef} src={`https://ayushcom.vercel.app/?vid=${ytVideoId}&t=${Math.floor(currentTime)}`} style={{ width: "100%", height: "100%", border: "none" }} allow="autoplay; fullscreen" />
                  <button onClick={toggleVideoMode} className="absolute top-2 right-2 bg-black/60 text-white p-2 rounded-full z-50">
                     <ChevronDown size={18} />
                  </button>
                </div>
              ) : (
                <div className={`relative bg-[#282828] rounded-[8px] shadow-[0_15px_40px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${isCanvasLoaded ? 'opacity-0 scale-75 pointer-events-none' : 'opacity-100 scale-100'}`} style={{ width: '100%', aspectRatio: '1 / 1', maxWidth: '340px', maxHeight: '340px' }}>
                  {(loading || isVideoLoading) && <div className="absolute inset-0 z-10 bg-black/50 flex items-center justify-center"><Loader2 size={40} className="animate-spin text-white" /></div>}
                  <img src={displayImage} alt="cover" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            {/* Bottom Controls */}
            <div className={`w-full px-6 pb-[max(1rem,env(safe-area-inset-bottom))] mb-2 pt-2 flex flex-col justify-end flex-shrink-0 transition-opacity duration-500 ${isUiHidden && !isVideoMode ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
              
              {/* Active Lyric Line */}
              {syncType === "LINE_SYNCED" && lyrics[activeLyricIndex] && !isVideoMode && (
                <div key={activeLyricIndex} className="text-white/95 text-[15px] font-bold text-left mb-2 min-h-[22px] animate-lyric-change drop-shadow-lg pr-4 line-clamp-2">
                  {lyrics[activeLyricIndex].words || "♪"}
                </div>
              )}

              {/* Title Banner */}
              <div className="flex items-center justify-between mb-5 drop-shadow-md w-full">
                <div className="flex items-center gap-3 overflow-hidden pr-4 flex-1 min-w-0 w-full">
                  {isCanvasLoaded && !isVideoMode && (
                    <img src={displayImage} className="w-[48px] h-[48px] rounded-md shadow-md flex-shrink-0" alt="tiny cover" />
                  )}
                  <div className="flex flex-col flex-1 min-w-0 w-full overflow-hidden">
                    <MarqueeText text={displayTitle} className="text-[22px] font-bold text-white tracking-tight leading-tight drop-shadow-md" />
                    <MarqueeText text={displayArtists} className="text-[15px] font-medium text-[#b3b3b3] mt-1 drop-shadow-md" />
                  </div>
                </div>
                <button className="text-white flex-shrink-0 ml-2 active:scale-75 transition-transform"><Heart size={26} /></button>
              </div>

              {/* Slider */}
              <div className="w-full flex flex-col gap-1 mb-5 relative drop-shadow-md">
                <input type="range" min="0" max="100" value={duration > 0 ? progress : 0} onChange={handleSeek} className="w-full mobile-slider relative z-10" style={{ background: `linear-gradient(to right, #fff ${progress}%, rgba(255,255,255,0.2) ${progress}%)` }} />
                <div className="flex items-center justify-between text-[11px] font-medium text-[#a7a7a7] mt-1 w-full pointer-events-none">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Main Buttons */}
              <div className="flex items-center justify-between w-full mb-5 px-1 drop-shadow-md">
                <button onClick={() => setIsShuffle(!isShuffle)} className={`active:opacity-50 ${isShuffle ? 'text-[#1db954]' : 'text-white'}`}><Shuffle size={24} /></button>
                <button onClick={playPrev} className="text-white active:opacity-50"><SkipBack size={36} fill="white" stroke="white" /></button>
                
                <button onClick={handlePlayPauseToggle} className="w-[64px] h-[64px] rounded-full bg-white flex items-center justify-center text-black active:scale-95 transition-transform shadow-lg">
                  {isPlaying ? <Pause fill="black" stroke="black" size={26} /> : <Play fill="black" stroke="black" size={28} className="translate-x-[2px]" />}
                </button>
                
                <button onClick={playNext} className="text-white active:opacity-50"><SkipForward size={36} fill="white" stroke="white" /></button>
                <button onClick={() => setRepeatMode((prev) => (prev + 1) % 3)} className={`active:opacity-50 relative ${repeatMode > 0 ? 'text-[#1db954]' : 'text-white/70'}`}>
                  <Repeat size={24} />
                  {repeatMode === 2 && <span className="absolute -top-1 -right-1 bg-[#1db954] text-black text-[9px] font-bold rounded-full w-3 h-3 flex items-center justify-center">1</span>}
                </button>
              </div>

              {/* Device Buttons */}
              <div className="flex items-center justify-between text-[#b3b3b3] w-full px-1 drop-shadow-md">
                <button onClick={toggleVideoMode} className={`active:opacity-50 transition-colors ${isVideoMode ? 'text-[#1db954]' : 'text-[#b3b3b3]'}`}>
                  {isVideoLoading ? <Loader2 size={20} className="animate-spin" /> : <MonitorPlay size={20} />}
                </button>
                <div className="flex items-center gap-6">
                  <button onClick={() => setShowQueue(true)} className="active:opacity-50 text-white"><ListMusic size={20} /></button>
                </div>
              </div>
            </div>
          </div>

          <div className={`w-full px-5 pb-24 flex flex-col gap-6 pointer-events-auto transition-opacity duration-500 ${isUiHidden && !isVideoMode ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            
            {/* Lyrics Card */}
            {lyrics.length > 0 && (
              <div className="rounded-2xl p-6 w-full mx-auto shadow-2xl relative overflow-hidden transition-colors duration-500 border border-white/10" style={{ backgroundColor: dominantColor }}>
                <div className="absolute inset-0 bg-black/5 z-0 pointer-events-none" />
                <div className="relative z-10 flex items-center justify-between mb-6 sticky top-0 bg-transparent">
                  <h3 className="text-white font-bold text-[18px]">Lyrics</h3>
                  <button className="p-2 text-white/80 hover:text-white rounded-full bg-black/30"><Maximize2 size={16} /></button>
                </div>
                <div className="relative z-10 flex flex-col gap-5 max-h-[300px] overflow-y-auto scrollbar-hide pb-10" ref={lyricsContainerRef}>
                  {lyrics.map((line, idx) => {
                    const isActive = idx === activeLyricIndex;
                    const isPast = idx < activeLyricIndex;
                    return (
                      <p key={idx} ref={isActive ? activeLyricRef : null} onClick={() => handleLyricClick(line.time)} 
                        className={`cursor-pointer transition-all duration-300 ${isActive ? 'text-white text-[28px] font-extrabold drop-shadow-lg leading-tight' : isPast ? 'text-white/60 text-[24px] font-bold hover:text-white/80 leading-tight' : 'text-black/40 text-[24px] font-bold hover:text-white/60 leading-tight'}`}>
                        {line.words || '♪'}
                      </p>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ARTISTS CIRCULAR LIST */}
            {uniqueArtists.length > 0 && (
              <div className="w-full mt-2">
                <h3 className="text-white font-bold text-[18px] mb-4 drop-shadow-md">Artists</h3>
                <div className="flex overflow-x-auto gap-4 scrollbar-hide pb-2">
                  {uniqueArtists.map((artist: any) => (
                    <Link key={artist.id} href={`/artist/${artist.id}`} className="flex flex-col items-center gap-2 flex-shrink-0 w-[84px] group">
                      <img src={getImageUrl(artist.image)} className="w-[84px] h-[84px] rounded-full object-cover shadow-lg border border-white/10 group-hover:scale-105 transition-transform bg-[#282828]" alt={artist.name} />
                      <div className="flex flex-col items-center w-full px-1">
                        <span className="text-white/90 text-[12px] text-center font-bold line-clamp-1 leading-tight drop-shadow-md">{decodeEntities(artist.name)}</span>
                        <span className="text-white/50 text-[10px] text-center font-medium line-clamp-1 capitalize mt-[2px]">{artist.role}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* ALBUM COMPONENT */}
            {songDetails?.album && (
              <Link href={`/album/${songDetails.album.id}`} className="w-full mb-6 bg-[#1e1e1e]/60 backdrop-blur-md rounded-2xl p-4 flex items-center gap-4 hover:bg-[#2a2a2a]/80 transition-colors border border-white/10 shadow-xl relative overflow-hidden group">
                <div className="absolute inset-0 z-0 pointer-events-none opacity-30" style={{ backgroundColor: dominantColor }} />
                <img src={displayImage} className="w-[64px] h-[64px] rounded-md object-cover relative z-10 shadow-md border border-white/5 group-hover:scale-105 transition-transform" alt="Album Cover" />
                <div className="flex flex-col relative z-10 flex-1 pr-2">
                  <span className="text-white/60 text-[11px] uppercase tracking-widest font-bold mb-1 drop-shadow-sm">Album</span>
                  <span className="text-white font-bold text-[16px] line-clamp-1 drop-shadow-md">{decodeEntities(songDetails.album.name)}</span>
                </div>
                <div className="relative z-10 text-white/50 group-hover:text-white transition-colors pl-2">
                  <ChevronDown size={20} className="-rotate-90" />
                </div>
              </Link>
            )}

            {/* DETAILS CARD */}
            {songDetails && (
              <div className="w-full mb-10 rounded-2xl p-5 flex flex-col gap-4 border border-white/10 shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 z-0 bg-cover bg-center opacity-30 blur-lg scale-110" style={{ backgroundImage: `url(${displayImage})` }} />
                <div className="absolute inset-0 z-0 bg-gradient-to-t from-black/90 via-black/60 to-black/30 pointer-events-none" />

                <h3 className="text-white font-bold text-[18px] drop-shadow-md relative z-10 mb-2">About Song</h3>
                
                <div className="relative z-10 grid grid-cols-2 gap-y-5 gap-x-4">
                  {songDetails.playCount && (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-white/50">
                        <Hash size={12} />
                        <span className="font-semibold text-[10px] uppercase tracking-wider">Play Count</span>
                      </div>
                      <span className="text-white font-bold text-[15px]">{Number(songDetails.playCount).toLocaleString('en-US')}</span>
                    </div>
                  )}
                  {songDetails.duration && (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-white/50">
                        <Clock size={12} />
                        <span className="font-semibold text-[10px] uppercase tracking-wider">Duration</span>
                      </div>
                      <span className="text-white font-bold text-[15px]">{formatTime(Number(songDetails.duration))}</span>
                    </div>
                  )}
                  {(songDetails.releaseDate || songDetails.year) && (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-white/50">
                        <Calendar size={12} />
                        <span className="font-semibold text-[10px] uppercase tracking-wider">Released</span>
                      </div>
                      <span className="text-white font-bold text-[15px]">{songDetails.releaseDate || songDetails.year}</span>
                    </div>
                  )}
                  {songDetails.language && (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-white/50">
                        <Globe size={12} />
                        <span className="font-semibold text-[10px] uppercase tracking-wider">Language</span>
                      </div>
                      <span className="text-white font-bold text-[15px] capitalize">{songDetails.language}</span>
                    </div>
                  )}
                  {songDetails.label && (
                    <div className="flex flex-col gap-1 col-span-2">
                      <div className="flex items-center gap-1.5 text-white/50">
                        <Disc3 size={12} />
                        <span className="font-semibold text-[10px] uppercase tracking-wider">Label</span>
                      </div>
                      <span className="text-white font-bold text-[15px] line-clamp-1">{decodeEntities(songDetails.label)}</span>
                    </div>
                  )}
                </div>

                {songDetails.copyright && (
                  <div className="relative z-10 mt-3 pt-4 border-t border-white/10">
                    <p className="text-white/40 text-[10px] font-medium leading-relaxed">{decodeEntities(songDetails.copyright)}</p>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* =========================================
            QUEUE OVERLAY SHEET 
        ========================================= */}
        <div className={`absolute inset-0 z-[60] bg-[#121212] transition-transform duration-300 flex flex-col pointer-events-auto ${showQueue ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="flex items-center justify-between px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-4 sticky top-0 bg-[#121212] z-20 shadow-md">
            <button onClick={() => setShowQueue(false)} className="p-2 -ml-2 text-white/80 active:opacity-50"><ChevronDown size={28} /></button>
            <span className="text-[15px] font-bold text-white">Queue</span>
            <button className="text-[14px] font-medium text-white/80 active:opacity-50">Edit</button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-32">
            <span className="text-[14px] font-medium text-white/60 block mb-6 uppercase tracking-wider">Playing {contextName}</span>
            
            <div className="flex items-center justify-between w-full mb-8">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-12 h-12 flex-shrink-0 rounded-[4px] bg-[#282828] overflow-hidden">
                  <img src={displayImage} alt="cover" className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col min-w-0 pr-2 overflow-hidden">
                  <span className="text-[16px] font-bold text-[#1db954] truncate">{displayTitle}</span>
                  <span className="text-[14px] font-medium text-white/60 truncate">{displayArtists}</span>
                </div>
              </div>
              <div className="flex flex-col gap-[3px] items-center justify-center w-5 h-5 opacity-80">
                <div className="w-1 h-3 bg-[#1db954] rounded-full animate-pulse" />
                <div className="w-1 h-2 bg-[#1db954] rounded-full animate-pulse delay-75" />
                <div className="w-1 h-4 bg-[#1db954] rounded-full animate-pulse delay-150" />
              </div>
            </div>

            <span className="text-[16px] font-bold text-white block mb-4">Next in queue</span>
            
            <div className="flex flex-col gap-1">
              {upcomingQueue.map((track, index) => (
                <div 
                  key={index} 
                  draggable
                  onDragStart={(e) => { dragItem.current = index; setDraggedIndex(index); }}
                  onDragEnter={(e) => { e.preventDefault(); dragOverItem.current = index; setDropTargetIndex(index); }}
                  onDragOver={(e) => e.preventDefault()}
                  onDragEnd={handleSort}
                  className={`flex items-center justify-between w-full group p-1 rounded-md transition-all duration-200 
                    ${draggedIndex === index ? 'opacity-30 scale-95 bg-white/10' : ''} 
                    ${dropTargetIndex === index && draggedIndex !== index ? 'mt-[3.5rem] border-t-2 border-[#1db954] rounded-t-none' : ''}`}
                >
                  <div className="flex items-center gap-3 overflow-hidden pointer-events-none">
                    <div className="w-12 h-12 flex-shrink-0 rounded-[4px] bg-[#282828] overflow-hidden">
                      <img src={getImageUrl(track.image)} alt="cover" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col min-w-0 pr-2 overflow-hidden">
                      <span className="text-[16px] font-bold text-white truncate">{decodeEntities(track.title || track.name)}</span>
                      <span className="text-[14px] font-medium text-white/60 truncate">{decodeEntities(getArtistsText(track))}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 px-2 cursor-grab active:cursor-grabbing text-white/50 hover:text-white transition-colors">
                    <Menu size={20} />
                  </div>
                </div>
              ))}
            </div>

            {isFetchingRecsUI && (
              <div className="flex flex-col gap-3 mt-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex items-center gap-3 w-full animate-pulse px-1">
                    <div className="w-12 h-12 bg-white/10 rounded-[4px]" />
                    <div className="flex flex-col gap-2 flex-1">
                      <div className="w-1/2 h-3 bg-white/10 rounded-md" />
                      <div className="w-1/3 h-2 bg-white/10 rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            
          </div>

          <div className="absolute bottom-0 left-0 w-full bg-[#181818] border-t border-[#282828] pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 px-6 flex justify-between items-center z-20">
            <div className="flex flex-col items-center gap-1 active:opacity-50 cursor-pointer" onClick={() => setIsShuffle(!isShuffle)}>
              <Shuffle size={24} className={isShuffle ? 'text-[#1db954]' : 'text-white/70'} />
              <span className={`text-[11px] font-medium ${isShuffle ? 'text-[#1db954]' : 'text-white/70'}`}>Shuffle</span>
            </div>
            <div className="flex flex-col items-center gap-1 active:opacity-50 cursor-pointer" onClick={() => setRepeatMode((prev) => (prev + 1) % 3)}>
              <div className="relative">
                <Repeat size={24} className={repeatMode > 0 ? 'text-[#1db954]' : 'text-white/70'} />
                {repeatMode === 2 && <span className="absolute -top-1 -right-1 bg-[#1db954] text-black text-[9px] font-bold rounded-full w-3 h-3 flex items-center justify-center">1</span>}
              </div>
              <span className={`text-[11px] font-medium ${repeatMode > 0 ? 'text-[#1db954]' : 'text-white/70'}`}>Repeat</span>
            </div>
            <div className="flex flex-col items-center gap-1 active:opacity-50 cursor-pointer text-white/70">
              <Timer size={24} />
              <span className="text-[11px] font-medium">Timer</span>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE MINI PLAYER */}
      <div 
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onClick={() => setIsExpanded(true)}
        className={`md:hidden fixed bottom-[65px] left-[8px] right-[8px] h-[56px] rounded-[6px] z-[99990] cursor-pointer overflow-hidden transition-all duration-[400ms] shadow-md ${isExpanded ? 'opacity-0 pointer-events-none translate-y-6 scale-[0.98]' : 'opacity-100 translate-y-0 scale-100'}`}
        style={{ backgroundColor: dominantColor, transform: swipeX > 0 ? `translateX(${swipeX}px)` : undefined, transition: swipeX === 0 && !isExpanded ? 'transform 0.4s ease-out, opacity 0.4s' : 'none' }}
      >
        <div className="absolute inset-0 bg-black/25 z-0 pointer-events-none" />
        <div className="relative z-10 w-full h-full flex items-center px-2">
          <div className="w-[40px] h-[40px] flex-shrink-0 rounded-[4px] shadow-sm overflow-hidden bg-[#282828] relative mr-3">
            {(loading || isVideoLoading) && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Loader2 size={16} className="animate-spin text-white" /></div>}
            <img src={displayImage} alt="cover" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col flex-1 min-w-0 pr-3 justify-center">
            <MarqueeText text={displayTitle} className="text-[13px] font-bold text-white leading-tight mb-[2px]" />
            <MarqueeText text={displayArtists} className="text-[12px] font-medium text-white/70 leading-tight" />
          </div>
          <div className="flex items-center gap-4 flex-shrink-0 pr-2 text-white">
            <button className="active:scale-75 transition-transform" onClick={toggleVideoMode}><MonitorPlay size={20} className={isVideoMode ? "text-[#1db954]" : ""} /></button>
            <button className="active:scale-75 transition-transform" onClick={handlePlayPauseToggle}>
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
