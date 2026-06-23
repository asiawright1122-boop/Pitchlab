"use client";

import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, Film, RotateCcw } from "lucide-react";

export default function HighlightPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(12.5); // 默认时长
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [hasError, setHasError] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Mixkit 免费的足球精彩短片 URL
  const videoSrc = "https://assets.mixkit.co/videos/preview/mixkit-soccer-ball-in-the-grass-in-front-of-a-goal-4856-large.mp4";

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setProgress((video.currentTime / (video.duration || 1)) * 100);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration || 12.5);
    };

    const handleError = () => {
      // 视频加载失败时开启 Canvas/CSS 帧降级
      setHasError(true);
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("error", handleError);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("error", handleError);
    };
  }, []);

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play().then(() => {
        setIsPlaying(true);
        setHasError(false);
      }).catch(() => {
        // 如果浏览器拦截自动播放或源损坏
        setHasError(true);
        setIsPlaying(true);
      });
    }
  };

  const handleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekValue = parseFloat(e.target.value);
    const video = videoRef.current;
    if (video && !hasError) {
      video.currentTime = (seekValue / 100) * duration;
    }
    setProgress(seekValue);
    setCurrentTime((seekValue / 100) * duration);
  };

  const handleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    const container = containerRef.current;
    if (!container) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen().catch((err) => {
        console.error("Fullscreen request failed:", err);
      });
    }
  };

  // 鼠标移动时展示控制栏，静止时隐藏
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 2500);
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // 模拟精彩进球的 Canvas 降级动效
  useEffect(() => {
    if (!hasError || !isPlaying) return;
    let animFrame: number;
    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        const next = prev + 0.1;
        if (next >= duration) {
          setProgress(0);
          return 0;
        }
        setProgress((next / duration) * 100);
        return next;
      });
    }, 100);

    return () => {
      clearInterval(interval);
      cancelAnimationFrame(animFrame);
    };
  }, [hasError, isPlaying, duration]);

  return (
    <div className="bg-white border border-gray-200/80 rounded-3xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.03)] transition-all select-none">
      <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
        <Film size={14} className="text-[#34c759]" />
        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Match Highlights</h3>
      </div>

      <div 
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isPlaying && setShowControls(false)}
        onClick={handlePlayPause}
        className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-gray-200/50 shadow-inner group cursor-pointer"
      >
        {/* HTML5 Video Source */}
        {!hasError ? (
          <video
            ref={videoRef}
            src={videoSrc}
            playsInline
            muted={isMuted}
            loop
            className="w-full h-full object-cover"
          />
        ) : (
          /* CSS / Canvas 降级动画效果（模拟足球越过门线/射门） */
          <div className="absolute inset-0 bg-gradient-to-tr from-[#1b4332] via-[#2d6a4f] to-[#52b788] flex flex-col items-center justify-center relative overflow-hidden">
            {/* 网线背景 */}
            <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(255,255,255,.3)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.3)_1px,transparent_1px)] bg-[size:16px_16px]"></div>
            
            {/* 仿真门柱 */}
            <div className="absolute top-[20%] w-[80%] h-[60%] border-t-4 border-x-4 border-white/60 rounded-t-lg z-0"></div>
            
            {/* 仿真足球 */}
            <div 
              style={{
                transform: isPlaying 
                  ? `translate(${(progress % 33) * 6 - 80}px, ${-Math.sin((progress % 33) * 0.1) * 60 + 20}px) rotate(${progress * 20}deg)` 
                  : "translate(-80px, 20px)"
              }}
              className="absolute w-10 h-10 bg-white rounded-full border border-gray-300 shadow-md flex items-center justify-center font-extrabold text-[9px] text-gray-800 transition-all z-10"
            >
              ⚽
            </div>
            
            {isPlaying && progress % 33 > 25 && (
              <div className="absolute top-[35%] bg-yellow-400/90 text-slate-900 border border-yellow-300 px-4 py-1.5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-lg animate-bounce z-20">
                GOAL!!!
              </div>
            )}
            
            <div className="absolute bottom-16 text-center z-10 bg-black/35 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10">
              <span className="text-[9px] text-white/80 font-black uppercase tracking-widest">
                {isPlaying ? "Simulating Stream..." : "Stream Offline - Play Simulation"}
              </span>
            </div>
          </div>
        )}

        {/* Video Overlay Poster (毛玻璃首帧封面) */}
        {!isPlaying && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/25 flex flex-col justify-between p-4 z-20 transition-all duration-500">
            {/* Header info */}
            <div className="flex justify-between items-start w-full">
              <span className="bg-[#34c759] text-white text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-sm">
                Live Highlight
              </span>
              <span className="text-[9px] text-white/70 font-black bg-white/10 backdrop-blur-sm border border-white/10 px-2.5 py-0.5 rounded-full">
                HD 1080P
              </span>
            </div>

            {/* Play Button Icon */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-2xl transition-transform duration-300 hover:scale-110">
              <Play size={26} className="text-white fill-white ml-1" />
            </div>

            {/* Bottom info */}
            <div className="flex flex-col gap-1">
              <span className="text-white font-black text-sm uppercase tracking-wide">
                Key Match Highlights & Goals
              </span>
              <span className="text-xs text-white/60 font-bold">
                Relive the most exciting moments of the fixture
              </span>
            </div>
          </div>
        )}

        {/* Custom Controller Overlay */}
        {isPlaying && (
          <div 
            onClick={(e) => e.stopPropagation()}
            className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 flex flex-col gap-3 z-30 transition-opacity duration-300 ${
              showControls ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            {/* ProgressBar */}
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={handleSeek}
                className="w-full h-1 bg-white/30 rounded-full appearance-none cursor-pointer accent-[#34c759] hover:h-1.5 transition-all outline-none"
              />
            </div>

            {/* Controls panel */}
            <div className="flex justify-between items-center text-white">
              <div className="flex items-center gap-4">
                <button 
                  onClick={handlePlayPause} 
                  className="hover:text-[#34c759] transition-colors p-1"
                >
                  {isPlaying ? <Pause size={16} fill="white" /> : <Play size={16} fill="white" />}
                </button>

                <button 
                  onClick={handleMute} 
                  className="hover:text-[#34c759] transition-colors p-1"
                >
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>

                <span className="text-[10px] font-black tracking-wider text-white/80">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {hasError && (
                  <span className="text-[8px] bg-red-500/80 border border-red-400 text-white font-black px-1.5 py-0.5 rounded">
                    SIMULATION MODE
                  </span>
                )}
                <button 
                  onClick={handleFullscreen} 
                  className="hover:text-[#34c759] transition-colors p-1"
                >
                  <Maximize size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
