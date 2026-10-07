import { useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';

interface ImgWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
  fallbackText?: string;
}

export function ImgWithFallback({
  src,
  alt,
  className = '',
  fallbackText,
}: ImgWithFallbackProps) {
  const [error, setError] = useState(false);

  if (error || !src) {
    return (
      <div
        className={`bg-stone-100 flex flex-col items-center justify-center text-stone-500 overflow-hidden ${className}`}
      >
        <UtensilsCrossed className="w-5 h-5 opacity-40 mb-1" />
        <span className="text-[11px] font-medium text-stone-600 line-clamp-1 px-1 text-center">
          {fallbackText || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setError(true)}
      className={className}
    />
  );
}
