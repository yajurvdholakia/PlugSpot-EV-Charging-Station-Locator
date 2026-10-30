"use client";
import { useEffect, useRef } from "react";

/**
 * Loads vanilla JS files via fetch + Function() (not <script> tags).
 *
 * Why not <script> tags: Next.js HMR can re-run useEffect, and dynamically
 * inserted <script> tags with the same src are skipped by the browser (not
 * re-executed). Using fetch + new Function() guarantees the code runs every
 * time, which is critical because the VR.views.* registrations must happen
 * before VR.init() is called.
 */

async function loadAndExec(src: string): Promise<void> {
  const res = await fetch(src);
  if (!res.ok) throw new Error(`Failed to fetch ${src}: ${res.status}`);
  const text = await res.text();
  // Execute in global scope so `window.VR = window.VR || {}` works correctly
  new Function(text)();
}

export default function Home() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const scripts = [
      "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
      // app.js MUST load first — it initializes VR, VR.views, VR.state, etc.
      // The view scripts (stations, calculator, tools, admin) assign to
      // VR.views.* which must already exist.
      "/js/app.js",
      "/js/stations.js",
      "/js/calculator.js",
      "/js/tools.js",
      "/js/admin.js",
    ];

    // Load scripts sequentially. app.js must load first because it
    // initializes VR.views = {}. The view scripts assign to VR.views.*
    // which must already exist to avoid "Cannot set properties of undefined".
    scripts
      .reduce(
        (prev, src) => prev.then(() => loadAndExec(src)),
        Promise.resolve() as Promise<void>
      )
      .then(() => {
        if (window.VR && typeof window.VR.init === "function") {
          window.VR.init();
        }
      })
      .catch((err) => {
        console.error("[VoltRoute] Failed to load scripts:", err);
      });
  }, []);

  return <div id="app" />;
}
