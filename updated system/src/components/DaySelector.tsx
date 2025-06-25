'use client'

import { useState } from 'react'
import { Utensils, Bus } from 'lucide-react'
import { EventDay } from '@/lib/eventDays'

export interface EventDay {
  id: string
  date: string
  name: string
  type: 'sessions' | 'performance' | 'off' | 'opening' | 'conference'
  hasFood: boolean
  hasBus: boolean | 'to-only'
  foodTypes: string[]
}

const eventDays: EventDay[] = [
  // Sessions: June 28 - July 1
  { id: 'sessions-day1', date: '28/6', name: 'Sessions Day 1', type: 'sessions', hasFood: true, hasBus: true, foodTypes: ['lunch'] },
  { id: 'sessions-day2', date: '29/6', name: 'Sessions Day 2', type: 'sessions', hasFood: true, hasBus: true, foodTypes: ['lunch'] },
  { id: 'sessions-day3', date: '30/6', name: 'Sessions Day 3', type: 'sessions', hasFood: true, hasBus: true, foodTypes: ['lunch'] },
  { id: 'sessions-day4', date: '1/7', name: 'Sessions Day 4', type: 'sessions', hasFood: true, hasBus: true, foodTypes: ['lunch'] },
  
  // Performance Day: July 2
  { id: 'performance-day', date: '2/7', name: 'Performance Day', type: 'performance', hasFood: true, hasBus: true, foodTypes: ['breakfast', 'lunch'] },
  
  // Off Day: July 3
  { id: 'off-day', date: '3/7', name: 'Off Day', type: 'off', hasFood: false, hasBus: false, foodTypes: [] },
  
  // Opening Ceremony: July 4
  { id: 'opening-ceremony', date: '4/7', name: 'Opening Ceremony', type: 'opening', hasFood: true, hasBus: true, foodTypes: ['catering'] },
  
  // Conference Days: July 5-7
  { id: 'conference-day1', date: '5/7', name: 'Conference Day 1', type: 'conference', hasFood: true, hasBus: true, foodTypes: ['breakfast', 'lunch'] },
  { id: 'conference-day2', date: '6/7', name: 'Conference Day 2', type: 'conference', hasFood: true, hasBus: true, foodTypes: ['breakfast', 'lunch'] },
  { id: 'conference-day3', date: '7/7', name: 'Conference Day 3 (Closing)', type: 'conference', hasFood: true, hasBus: 'to-only', foodTypes: ['breakfast', 'lunch'] }, // Buses TO university only, no return
]

interface DaySelectorProps {
  selectedDay: string
  onDayChange: (day: EventDay) => void
}

export default function DaySelector({ selectedDay, onDayChange }: DaySelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  const currentDay = eventDays.find(day => day.id === selectedDay) || eventDays[0]
  
  const getDayColor = (type: EventDay['type']) => {
    switch (type) {
      case 'sessions': return 'bg-blue-500'
      case 'performance': return 'bg-purple-500'
      case 'off': return 'bg-gray-400'
      case 'opening': return 'bg-green-500'
      case 'conference': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }
  
  const getDayIcon = (type: EventDay['type']) => {
    switch (type) {
      case 'sessions': return '📚'
      case 'performance': return '🎭'
      case 'off': return '😴'
      case 'opening': return '🎉'
      case 'conference': return '🏛️'
      default: return '📅'
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full p-4 rounded-lg text-white font-medium flex items-center justify-between ${getDayColor(currentDay.type)} hover:opacity-90 transition-opacity`}
      >
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{getDayIcon(currentDay.type)}</span>
          <div className="text-left">
            <div className="font-bold">{currentDay.name}</div>
            <div className="text-sm opacity-90">{currentDay.date}</div>
          </div>
        </div>
        <svg className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
          {eventDays.map((day) => (
            <button
              key={day.id}
              onClick={() => {
                onDayChange(day)
                setIsOpen(false)
              }}
              className={`w-full p-3 text-left hover:bg-gray-50 transition-colors flex items-center space-x-3 ${
                day.id === selectedDay ? 'bg-blue-50 border-l-4 border-blue-500' : ''
              } ${day.type === 'off' ? 'opacity-50' : ''}`}
              disabled={day.type === 'off'}
            >
              <span className="text-xl">{getDayIcon(day.type)}</span>
              <div className="flex-1">
                <div className="font-medium text-gray-900">{day.name}</div>
                <div className="text-sm text-gray-600">{day.date}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {day.hasFood && day.foodTypes.length > 0 && (
                    <span className="mr-3 flex items-center">
                      <Utensils className="w-4 h-4 mr-1" />
                      {day.foodTypes.join(', ')}
                    </span>
                  )}
                  {day.hasBus === true && (
                    <span className="flex items-center">
                      <Bus className="w-4 h-4 mr-1" />
                      Bus Available
                    </span>
                  )}
                  {day.hasBus === 'to-only' && (
                    <span className="flex items-center">
                      <Bus className="w-4 h-4 mr-1" />
                      Bus to University Only
                    </span>
                  )}
                  {day.type === 'off' && <span>No Activities</span>}
                </div>
              </div>
              {day.id === selectedDay && (
                <span className="text-blue-500">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export { eventDays } 