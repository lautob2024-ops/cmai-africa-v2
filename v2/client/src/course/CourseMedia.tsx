import React, { useState } from 'react';
import { Play, Maximize2, X, Image as ImageIcon } from 'lucide-react';

// --- Composant Vidéo ---
interface VideoPlayerProps {
  src: string;
  title?: string;
  caption?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, title, caption }) => {
  // Détection basique pour embed YouTube / Vimeo
  const isYouTube = src.includes('youtube.com') || src.includes('youtu.be');
  const isVimeo = src.includes('vimeo.com');

  const getEmbedUrl = (url: string) => {
    if (url.includes('youtube.com/watch?v=')) {
      return url.replace('watch?v=', 'embed/');
    }
    if (url.includes('youtu.be/')) {
      const id = url.split('youtu.be/')[1];
      return `https://www.youtube.com/embed/${id}`;
    }
    return url;
  };

  return (
    <div className="my-6 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-xl">
      {title && (
        <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900/90 px-4 py-2.5 text-xs font-semibold text-slate-200">
          <Play className="h-4 w-4 text-emerald-400 fill-emerald-400" />
          <span>{title}</span>
        </div>
      )}
      
      <div className="relative aspect-video w-full bg-black">
        {isYouTube || isVimeo ? (
          <iframe
            src={getEmbedUrl(src)}
            title={title || 'Vidéo de cours'}
            className="h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video
            src={src}
            controls
            className="h-full w-full object-contain"
            preload="metadata"
          >
            Votre navigateur ne supporte pas la lecture de vidéos.
          </video>
        )}
      </div>

      {caption && (
        <div className="bg-slate-900/60 px-4 py-2 text-center text-xs text-slate-400 italic">
          {caption}
        </div>
      )}
    </div>
  );
};

// --- Composant Image Interactive (Zoom) ---
interface CourseImageProps {
  src: string;
  alt: string;
  caption?: string;
}

export const CourseImage: React.FC<CourseImageProps> = ({ src, alt, caption }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <figure className="my-6">
        <div 
          onClick={() => setIsOpen(true)}
          className="group relative cursor-pointer overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 shadow-md transition-all hover:border-emerald-500/50"
        >
          <img
            src={src}
            alt={alt}
            className="w-full object-cover transition-transform duration-300 group-hover:scale-[1.01]"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="flex items-center gap-1.5 rounded-lg bg-slate-900/90 px-3 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur">
              <Maximize2 className="h-3.5 w-3.5 text-emerald-400" />
              Agrandir l'image
            </span>
          </div>
        </div>

        {caption && (
          <figcaption className="mt-2 flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
            <ImageIcon className="h-3.5 w-3.5 text-slate-500" />
            <span>{caption}</span>
          </figcaption>
        )}
      </figure>

      {/* Lightbox / Modal d'agrandissement */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm transition-all"
        >
          <div className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-2xl bg-slate-900 p-2 shadow-2xl">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 z-10 rounded-full bg-slate-800/80 p-2 text-slate-300 transition-all hover:bg-slate-700 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={src}
              alt={alt}
              className="max-h-[85vh] w-auto max-w-full rounded-xl object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
};