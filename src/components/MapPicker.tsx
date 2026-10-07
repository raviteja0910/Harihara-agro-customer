'use client';

import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
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
}

function LocationMarker({ position, setPosition }: MapPickerProps) {
  const map = useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

export default function MapPicker({ position, setPosition }: MapPickerProps) {
  const [mounted, setMounted] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const mapRef = useRef<L.Map>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLocateMe = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setPosition([latitude, longitude]);
        if (mapRef.current) {
          mapRef.current.flyTo([latitude, longitude], 15);
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

  if (!mounted) return <div style={{ height: '250px', background: '#e0e0e0', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Map...</div>;

  return (
    <div className="relative w-full h-[250px]">
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
        <LocationMarker position={position} setPosition={setPosition} />
      </MapContainer>
      
      {/* Geolocation small button */}
      <button 
        type="button"
        onClick={handleLocateMe}
        disabled={isLocating}
        className="absolute bottom-4 right-4 z-[1000] bg-white text-blue-600 p-3 rounded-full shadow-lg border border-gray-200 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
        aria-label="Locate Me"
      >
        {isLocating ? <Loader2 size={20} className="animate-spin" /> : <Crosshair size={20} />}
      </button>
    </div>
  );
}
