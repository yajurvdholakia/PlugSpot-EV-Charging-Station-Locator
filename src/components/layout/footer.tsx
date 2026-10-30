"use client";

import { Zap, MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-background">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" fill="white" />
              </div>
              <span className="font-bold">VoltRoute</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Find EV charging stations across Gandhinagar, Ahmedabad &amp; nearby
              areas in seconds.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">Coverage</p>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-primary" /> Gandhinagar
              </li>
              <li className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-primary" /> Ahmedabad
              </li>
              <li className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-primary" /> Adalaj, Kalol, Kadi,
                Dehgam
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">Network Partners</p>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li>Tata Power</li>
              <li>ChargeZone</li>
              <li>Ather Grid</li>
              <li>Statiq &amp; Magenta</li>
            </ul>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">Project Info</p>
            <p className="text-sm text-muted-foreground">
              College project demonstrating a full-stack EV charging station
              finder with admin panel, auth &amp; maps.
            </p>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} VoltRoute. Built for academic purposes.</p>
          <p>Gandhinagar, Gujarat</p>
        </div>
      </div>
    </footer>
  );
}
