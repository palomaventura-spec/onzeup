"use client";

import { useState } from "react";

export default function SafeConvocationImage({
  src,
  alt,
  fallback,
  className,
}: {
  src: string | null;
  alt: string;
  fallback: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <span className={className}>{fallback}</span>;
  }

  return (
    <img
      className={className}
      src={src}
      alt={alt}
      crossOrigin="anonymous"
      referrerPolicy="no-referrer"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
