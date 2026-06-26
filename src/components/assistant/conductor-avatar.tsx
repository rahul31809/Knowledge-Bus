"use client";

import { useState } from "react";
import { useRive } from "@rive-app/react-canvas";
import { MessageCircleIcon } from "lucide-react";

// Looks for /public/conductor.riv. If it's missing (not added yet) or fails
// to load, falls back to a plain icon instead of showing a blank canvas.
export function ConductorAvatar({ className = "size-6" }: { className?: string }) {
  const [failed, setFailed] = useState(false);

  const { RiveComponent } = useRive({
    src: "/conductor.riv",
    autoplay: true,
    onLoadError: () => setFailed(true),
  });

  if (failed) {
    return <MessageCircleIcon className={className} />;
  }

  return (
    <div className={`${className} overflow-hidden`}>
      <RiveComponent style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
