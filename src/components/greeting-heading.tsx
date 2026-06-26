"use client";

import { useEffect, useState } from "react";

// Computed client-side so it reflects the visitor's local time, not the
// server's — a server-computed greeting would be wrong on every deploy
// region that isn't IST.
export function GreetingHeading({ name }: { name: string }) {
  const [greeting, setGreeting] = useState("Welcome back");

  useEffect(() => {
    const hour = new Date().getHours();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- time-of-day greeting can only be known client-side
    setGreeting(hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening");
  }, []);

  return (
    <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
      {greeting}, {name}
    </h1>
  );
}
