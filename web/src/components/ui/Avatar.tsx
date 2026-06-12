import { useState } from "react";
import { getAvatarUrl } from "@/api/client";

interface AvatarProps {
  name?: string | null;
  avatarUrl?: string | null;
  sizeClass?: string;
}

export function Avatar({ name, avatarUrl, sizeClass = "w-10 h-10" }: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const initials = name
    ? name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  return (
    <div className={`${sizeClass} rounded-none primary-gradient text-white flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden border border-outline-variant/15`}>
      {avatarUrl && !imgError ? (
        <img
          src={getAvatarUrl(avatarUrl)}
          alt={name || "Avatar"}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        initials
      )}
    </div>
  );
}
