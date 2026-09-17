"use client";

import { useEffect, useMemo, useState } from "react";
import type { ImgHTMLAttributes } from "react";

type SafeAvatarProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src?: string | null;
  name: string;
};

function avatarInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "AT";
}

function normaliseUrl(value?: string | null) {
  const url = value?.trim();
  if (!url) return null;

  // Files created only in local development (/uploads/...) do not exist after
  // deployment. They fall back to initials instead of showing a broken image.
  if (url.startsWith("/uploads/")) return null;

  return url;
}

/**
 * Shared athlete/staff image with a reliable fallback.
 * A bad, removed or private URL never leaves a broken-image icon in the UI.
 */
export default function SafeAvatar({
  src,
  name,
  alt,
  className,
  onError,
  ...imageProps
}: SafeAvatarProps) {
  const usableUrl = useMemo(() => normaliseUrl(src), [src]);
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [usableUrl]);

  if (!usableUrl || failed) {
    return (
      <span
        className={className}
        aria-label={alt || name}
        role="img"
      >
        {avatarInitials(name)}
      </span>
    );
  }

  return (
    <img
      {...imageProps}
      className={className}
      src={usableUrl}
      alt={alt || name}
      onError={(event) => {
        setFailed(true);
        onError?.(event);
      }}
    />
  );
}
