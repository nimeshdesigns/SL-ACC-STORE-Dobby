import React, { useState } from "react";
import { Play, Youtube } from "lucide-react";
import { Tutorial } from "../types";

interface TutorialCardProps {
  tutorial: Tutorial;
  key?: any;
}

export function getYouTubeId(url: string): string {
  if (!url) return "";
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : "";
}

export default function TutorialCard({ tutorial }: TutorialCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const ytId = getYouTubeId(tutorial.youtubeLink);

  return (
    <div className="group bg-zinc-950/40 border border-zinc-900 rounded-2xl overflow-hidden shadow-xl hover:border-amber-500/30 transition-all duration-300 flex flex-col h-full min-h-[300px]" id={`tutorial-card-${tutorial.id}`}>
      {/* Video stage player */}
      <div className="relative aspect-video w-full bg-black/40 overflow-hidden flex-shrink-0">
        {isPlaying && ytId ? (
          <iframe
            src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
            title={tutorial.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="w-full h-full"
          />
        ) : (
          <div 
            onClick={() => setIsPlaying(true)}
            className="w-full h-full relative cursor-pointer group/thumb"
          >
            {/* Thumbnail */}
            {ytId ? (
              <img
                src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                alt={tutorial.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-transform duration-500 group-hover/thumb:scale-[1.03] filter brightness-[0.85] group-hover/thumb:brightness-[0.95]"
                onError={(e) => {
                  e.currentTarget.src = "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop";
                }}
              />
            ) : (
              <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                <Youtube className="w-12 h-12 text-zinc-700" />
              </div>
            )}

            {/* Glowing Red/Orange Play Button */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover/thumb:bg-black/10 transition-colors duration-300">
              <div className="w-16 h-16 rounded-full bg-amber-500 hover:bg-amber-400 text-zinc-950 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.5)] group-hover/thumb:scale-110 transition-transform duration-300">
                <Play className="w-7 h-7 fill-zinc-950 ml-1 shrink-0" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tutorial title */}
      <div className="p-4 flex-grow flex flex-col justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold font-mono tracking-widest text-amber-500 flex items-center gap-1.5 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> FreeFire Premium Guide
          </span>
          <h4 className="font-extrabold uppercase text-xs md:text-sm text-zinc-100 tracking-wide leading-snug group-hover:text-amber-400 transition-colors">
            {tutorial.title}
          </h4>
        </div>
        <p className="text-[10px] text-zinc-500 font-mono mt-3">
          Uploaded: {new Date(tutorial.createdAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
