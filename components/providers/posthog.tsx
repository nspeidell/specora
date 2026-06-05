"use client";

import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";

function PostHogIdentify() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded || !user) return;
    posthog.identify(user.id, {
      email: user.emailAddresses[0]?.emailAddress,
      name: user.fullName,
    });
  }, [user, isLoaded]);

  return null;
}

export function PHProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com";
    if (!key) return; // Skip in dev if key not set

    posthog.init(key, {
      api_host: host,
      capture_pageview: true,
      capture_pageleave: true,
      persistence: "localStorage",
    });
  }, []);

  return (
    <PostHogProvider client={posthog}>
      <PostHogIdentify />
      {children}
    </PostHogProvider>
  );
}
