'use client'

import { Bus, Info } from 'lucide-react'
import { BusRoute, getAllBusRoutes, getBusRouteById } from '@/lib/busRoutes'

interface BusRouteInfoProps {
  routeId?: string
  stop?: string
  className?: string
}

export default function BusRouteInfo({ routeId, stop, className = '' }: BusRouteInfoProps) {
  if (!routeId) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <div className="flex items-center text-yellow-800">
          <Bus className="w-5 h-5 mr-2" />
          No bus transportation assigned
        </div>
      </div>
    )
  }

  const route = getBusRouteById(routeId)
  if (!route) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <div className="flex items-center text-red-800">
          <Bus className="w-5 h-5 mr-2" />
          Invalid bus route: {routeId}
        </div>
      </div>
    )
  }

  return (
    <div className={`${className}`}>
      <div className="flex items-center space-x-2 text-sm">
        <span className="text-blue-600 font-medium">🚌 {route.name}</span>
        <span className="text-gray-500">({route.startTime})</span>
      </div>
      {stop && (
        <div className="text-xs text-gray-600 mt-1">
          📍 {stop}
        </div>
      )}
    </div>
  )
}

export function BusRouteSummary() {
  const routes = getAllBusRoutes()

  return (
    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
      <h3 className="font-medium text-blue-900 mb-3">🚌 Available Bus Routes</h3>
      <div className="space-y-3">
        {routes.map((route) => (
          <div key={route.id} className="bg-white rounded p-3 border border-blue-100">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium text-blue-800">{route.name}</h4>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                {route.startTime}
              </span>
            </div>
            <div className="text-xs text-gray-600">
              <strong>Stops:</strong> {route.stops.join(' • ')}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 text-xs text-blue-700">
        💡 Participants can be assigned to specific routes during registration or CSV import
      </div>
    </div>
  )
} 