'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, Loader2 } from 'lucide-react';

// Fix Leaflet marker icon issue in Next.js/React
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface MapPickerProps {
  position: [number, number];
  setPosition: (pos: [number, number]) => void;
  onSetLocation?: () => void;
}

function LocationMarker({
  position,
  setPosition,
  onMapReady,
}: {
  position: [number, number];
  setPosition: (pos: [number, number]) => void;
  onMapReady: (map: L.Map) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (map) {
      onMapReady(map);
    }
  }, [map, onMapReady]);

  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return position === null ? null : (
    <Marker
      position={position}
      draggable={true}
      eventHandlers={{
        dragend(e) {
          const marker = e.target;
          const pos = marker.getLatLng();
          setPosition([pos.lat, pos.lng]);
        },
      }}
    />
  );
}

export default function MapPicker({ position, setPosition, onSetLocation }: MapPickerProps) {
  const [mounted, setMounted] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isLocationSet, setIsLocationSet] = useState(false);
  const [map, setMap] = useState<L.Map | null>(null);
  const mapRef = useRef<L.Map>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleMapReady = useCallback((mapInstance: L.Map) => {
    setMap(mapInstance);
  }, []);

  const handleLocateMe = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const newCoords: [number, number] = [latitude, longitude];
        setPosition(newCoords);
        if (onSetLocation) {
          onSetLocation();
        }
        const activeMap = map || mapRef.current;
        if (activeMap) {
          activeMap.flyTo(newCoords, 16, { animate: true, duration: 1.5 });
        }
        setIsLocating(false);
      },
      (error) => {
        console.error("Error fetching location", error);
        alert("Unable to fetch your location. Please check your browser permissions.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSetLocation = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPosition(position);
    if (onSetLocation) {
      onSetLocation();
    }
    setIsLocationSet(true);
  };

  useEffect(() => {
    if (isLocationSet) {
      const timer = setTimeout(() => {
        setIsLocationSet(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isLocationSet]);

  if (!mounted) {
    return (
      <div style={{ height: '280px', background: '#e0e0e0', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading Map...
      </div>
    );
  }

  return (
    <div className="relative w-full h-[280px]">
      <MapContainer
        center={position}
        zoom={13}
        style={{ height: '100%', width: '100%', borderRadius: '12px', zIndex: 0 }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker position={position} setPosition={setPosition} onMapReady={handleMapReady} />
      </MapContainer>

      {/* Set this location overlay button */}
      <button
        type="button"
        onClick={handleSetLocation}
        className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 z-[1000] ${
          isLocationSet ? 'bg-emerald-700' : 'bg-gray-900'
        } text-white px-5 py-2 rounded-full text-sm font-semibold shadow-lg hover:bg-gray-800 transition-colors whitespace-nowrap`}
      >
        {isLocationSet ? 'Location Set ✓' : 'Set this location'}
      </button>

      {/* Geolocation small button */}
      <button
        type="button"
        onClick={handleLocateMe}
        disabled={isLocating}
        className="absolute bottom-4 right-4 z-[1000] bg-white text-blue-600 p-3 rounded-full shadow-lg border border-gray-200 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
        aria-label="Locate Me"
      >
        {isLocating ? <Loader2 size={20} className="animate-spin" /> : <Crosshair size={20} />}
      </button>
    </div>
  );
}
