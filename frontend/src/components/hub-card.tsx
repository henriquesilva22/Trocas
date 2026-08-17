'use client';

import { useDistanceKm } from '@/lib/geo';
import { Hub } from '@/lib/negotiations';

export function HubCard({ hub }: { hub: Hub }) {
  const distance = useDistanceKm({ latitude: hub.latitude, longitude: hub.longitude });

  return (
    <div className="rounded border border-slate-200 p-3">
      <p className="font-medium">📍 {hub.name}</p>
      <p className="text-sm text-slate-600">{hub.address}</p>
      {distance !== null && <p className="text-sm text-slate-500">Distância: {distance.toFixed(1)} km</p>}
      {hub.openingHours && <p className="text-sm text-slate-500">🕐 Hoje: {hub.openingHours}</p>}
    </div>
  );
}
