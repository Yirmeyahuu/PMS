import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2 } from 'lucide-react';

// Fix default Leaflet marker icons broken by Vite bundling
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:       markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl:     markerShadow,
});

/** Philippines bounding box */
const PH_BOUNDS = L.latLngBounds(
  L.latLng(4.5,  116.0),
  L.latLng(21.5, 127.0),
);
const PH_CENTER: [number, number] = [12.8797, 121.774];

export interface ReverseGeocodeResult {
  address:  string;
  city:     string;
  province: string;
}

interface Props {
  latitude:          number | null;
  longitude:         number | null;
  onChange:          (lat: number, lng: number) => void;
  onReverseGeocode?: (result: ReverseGeocodeResult) => void;
  flyTarget?:        [number, number] | null;
}

// ── Pan map when flyTarget changes (no animation to avoid DOM errors) ─────────
function MapFlyController({ target }: { target: [number, number] | null | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.setView(target, 13, { animate: false });
  }, [target, map]);
  return null;
}

// ── Drop a pin on click ───────────────────────────────────────────────────────
function ClickHandler({ onPin }: { onPin: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPin(
        parseFloat(e.latlng.lat.toFixed(6)),
        parseFloat(e.latlng.lng.toFixed(6)),
      );
    },
  });
  return null;
}

// ── Nominatim reverse geocode ─────────────────────────────────────────────────
async function fetchReverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
    { headers: { 'User-Agent': 'PMS-ClinicApp/1.0', 'Accept-Language': 'en' } },
  );
  if (!res.ok) throw new Error('Reverse geocode failed');
  const data = await res.json() as { address?: Record<string, string> };
  const a = data.address ?? {};
  return {
    address:  [a['house_number'], a['road'], a['suburb'], a['neighbourhood'], a['village']]
                .filter(Boolean).join(', '),
    city:     a['city'] || a['town'] || a['municipality'] || a['county'] || '',
    province: a['state'] || a['state_district'] || '',
  };
}

// ── Main component ────────────────────────────────────────────────────────────
export const ClinicLocationPicker: React.FC<Props> = ({
  latitude, longitude, onChange, onReverseGeocode, flyTarget,
}) => {
  const hasPin = latitude != null && longitude != null;
  const [isGeocoding, setIsGeocoding] = useState(false);

  const handlePin = (lat: number, lng: number) => {
    onChange(lat, lng);
    if (onReverseGeocode) {
      setIsGeocoding(true);
      fetchReverseGeocode(lat, lng)
        .then(onReverseGeocode)
        .catch(() => { /* silent fail */ })
        .finally(() => setIsGeocoding(false));
    }
  };

  return (
    <div>
      {/* Map */}
      <div
        className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm relative"
        style={{ height: 400 }}
      >
        <MapContainer
          center={hasPin ? [latitude!, longitude!] : PH_CENTER}
          zoom={6}
          minZoom={5}
          maxBounds={PH_BOUNDS}
          maxBoundsViscosity={1.0}
          zoomAnimation={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapFlyController target={flyTarget} />
          <ClickHandler onPin={handlePin} />
          {hasPin && (
            <Marker
              position={[latitude!, longitude!]}
              draggable
              eventHandlers={{
                dragend(e) {
                  const pos = (e.target as L.Marker).getLatLng();
                  handlePin(
                    parseFloat(pos.lat.toFixed(6)),
                    parseFloat(pos.lng.toFixed(6)),
                  );
                },
              }}
            />
          )}
        </MapContainer>

        {/* Reverse-geocoding overlay */}
        {isGeocoding && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-[1000] rounded-2xl pointer-events-none">
            <div className="flex items-center gap-2 bg-white rounded-xl shadow-md px-4 py-2 text-sm text-sky-700 font-medium">
              <Loader2 className="w-4 h-4 animate-spin" />
              Detecting location…
            </div>
          </div>
        )}
      </div>

      {/* Coordinates display */}
      {hasPin ? (
        <div className="mt-3 rounded-xl bg-sky-50 border border-sky-100 px-4 py-3 text-sm text-sky-800">
          <p className="font-semibold mb-1">Pinned Coordinates</p>
          <p>Latitude: <span className="font-mono">{latitude!.toFixed(6)}</span></p>
          <p>Longitude: <span className="font-mono">{longitude!.toFixed(6)}</span></p>
        </div>
      ) : (
        <p className="mt-2 text-xs text-gray-400 text-center">
          Click anywhere on the map to drop a pin — drag to adjust.
        </p>
      )}
    </div>
  );
};
