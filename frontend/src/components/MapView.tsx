import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default marker icon issue in bundlers
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

export interface MapMarker {
  id: string
  lat: number
  lng: number
  label?: string
  color?: string
  popup?: string
}

export interface MapPath {
  id: string
  points: [number, number][]
  color?: string
  weight?: number
  dashed?: boolean
}

interface MapViewProps {
  center?: [number, number]
  zoom?: number
  markers?: MapMarker[]
  paths?: MapPath[]
  className?: string
  onClick?: (lat: number, lng: number) => void
}

const UAV_ICON = L.divIcon({
  html: `<div style="
    width:32px;height:32px;
    background:#3b82f6;
    border:3px solid #fff;
    border-radius:50%;
    box-shadow:0 2px 8px rgba(0,0,0,0.3);
    display:flex;align-items:center;justify-content:center;
  ">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5">
      <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.4-.1.9.3 1.1l5.7 3.2-3.3 3.3-2.1-.8c-.4-.2-.8-.1-1.1.2l-.2.3c-.2.3-.1.7.1 1l2.8 2.8c.3.2.7.3 1 .1l.3-.2c.3-.3.4-.7.2-1.1l-.8-2.1 3.3-3.3 3.2 5.7c.2.4.7.5 1.1.3l.5-.3c.4-.2.6-.6.5-1.1z"/>
    </svg>
  </div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
})

function createColoredIcon(color: string) {
  return L.divIcon({
    html: `<div style="
      width:24px;height:24px;
      background:${color};
      border:2px solid #fff;
      border-radius:50%;
      box-shadow:0 2px 6px rgba(0,0,0,0.3);
    "></div>`,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

export default function MapView({
  center = [30.5728, 104.0668],
  zoom = 14,
  markers = [],
  paths = [],
  className = 'h-96',
  onClick,
}: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const markersLayerRef = useRef<L.LayerGroup | null>(null)
  const pathsLayerRef = useRef<L.LayerGroup | null>(null)

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current).setView(center, zoom)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    markersLayerRef.current = L.layerGroup().addTo(map)
    pathsLayerRef.current = L.layerGroup().addTo(map)

    if (onClick) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        onClick(e.latlng.lat, e.latlng.lng)
      })
    }

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Update markers
  useEffect(() => {
    if (!markersLayerRef.current) return
    markersLayerRef.current.clearLayers()

    markers.forEach((m) => {
      const icon = m.color === 'uav' ? UAV_ICON : m.color ? createColoredIcon(m.color) : new L.Icon.Default()
      const marker = L.marker([m.lat, m.lng], { icon }).addTo(markersLayerRef.current!)

      if (m.popup) {
        marker.bindPopup(m.popup)
      }
      if (m.label) {
        marker.bindTooltip(m.label, { permanent: false, direction: 'top', offset: [0, -16] })
      }
    })
  }, [markers])

  // Update paths
  useEffect(() => {
    if (!pathsLayerRef.current) return
    pathsLayerRef.current.clearLayers()

    paths.forEach((p) => {
      L.polyline(p.points, {
        color: p.color || '#3b82f6',
        weight: p.weight || 3,
        dashArray: p.dashed ? '10, 6' : undefined,
      }).addTo(pathsLayerRef.current!)
    })
  }, [paths])

  return (
    <div ref={containerRef} className={`rounded-lg ${className}`} />
  )
}
