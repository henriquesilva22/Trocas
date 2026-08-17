'use client';

import { useEffect, useState } from 'react';

interface Coords {
  latitude: number;
  longitude: number;
}

function haversineKm(a: Coords, b: Coords): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Distância até um ponto via geolocalização do browser. Null se indisponível/negada. */
export function useDistanceKm(target: Coords | null): number | null {
  const [distance, setDistance] = useState<number | null>(null);

  useEffect(() => {
    if (!target || typeof navigator === 'undefined' || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDistance(
          haversineKm(
            { latitude: position.coords.latitude, longitude: position.coords.longitude },
            target,
          ),
        );
      },
      () => setDistance(null),
      { timeout: 5000 },
    );
  }, [target?.latitude, target?.longitude]);

  return distance;
}
