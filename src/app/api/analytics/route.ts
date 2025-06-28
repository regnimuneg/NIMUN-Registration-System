import { NextResponse } from 'next/server'
import { getAllParticipants, getParticipantTrackingData } from '@/lib/googleSheets'
import { getAllBusRoutes } from '@/lib/busRoutes'

export async function GET() {
  try {
    // Get all participants
    const participants = await getAllParticipants()
    
    // Initialize analytics data structure
    const analytics = {
      overview: {
        totalParticipants: participants.length,
        maleCount: participants.filter(p => p.gender === 'Male').length,
        femaleCount: participants.filter(p => p.gender === 'Female').length,
        withBusRoute: participants.filter(p => p.busRoute).length,
        withoutBusRoute: participants.filter(p => !p.busRoute).length
      },
      attendance: {
        sessions: {
          day1: { attended: 0, total: participants.length },
          day2: { attended: 0, total: participants.length },
          day3: { attended: 0, total: participants.length },
          day4: { attended: 0, total: participants.length }
        },
        performanceDay: { attended: 0, total: participants.length },
        openingCeremony: { attended: 0, total: participants.length },
        conference: {
          day1: { attended: 0, total: participants.length },
          day2: { attended: 0, total: participants.length },
          day3: { attended: 0, total: participants.length }
        }
      },
      food: {
        sessions: {
          day1: { lunch: 0 },
          day2: { lunch: 0 },
          day3: { lunch: 0 },
          day4: { lunch: 0 }
        },
        performanceDay: { breakfast: 0, lunch: 0 },
        openingCeremony: { catering: 0 },
        conference: {
          day1: { breakfast: 0, lunch: 0 },
          day2: { breakfast: 0, lunch: 0 },
          day3: { breakfast: 0, lunch: 0 }
        },
        totalMeals: 0
      },
      games: {
        totalActivities: 0,
        uniqueParticipants: new Set(),
        activitiesByType: {} as Record<string, number>,
        popularGames: [] as Array<{ name: string; participants: number }>
      },
      bus: {
        totalTrips: 0,
        byRoute: {} as Record<string, { arriving: number; departing: number }>,
        byStop: {} as Record<string, number>,
        participants: new Set()
      },
      positions: {} as Record<string, number>,
      busRoutes: {} as Record<string, number>
    }

    // Count positions and bus routes
    participants.forEach(p => {
      analytics.positions[p.position] = (analytics.positions[p.position] || 0) + 1
      if (p.busRoute) {
        analytics.busRoutes[p.busRoute] = (analytics.busRoutes[p.busRoute] || 0) + 1
      }
    })

    // Process tracking data for a sample of participants to avoid timeout
    // In production, this should be cached or processed in background
    const sampleSize = Math.min(50, participants.length)
    const sampleParticipants = participants.slice(0, sampleSize)

    const trackingPromises = sampleParticipants.map(async (participant) => {
      try {
        const tracking = await getParticipantTrackingData(participant.id)
        
        // Process attendance data
        if (tracking.dayTracking) {
          Object.keys(tracking.dayTracking.sessions).forEach(day => {
            const dayData = tracking.dayTracking.sessions[day as keyof typeof tracking.dayTracking.sessions]
            if (dayData?.attended) {
              analytics.attendance.sessions[day as keyof typeof analytics.attendance.sessions].attended++
            }
            if (dayData?.lunch) {
              analytics.food.sessions[day as keyof typeof analytics.food.sessions].lunch++
              analytics.food.totalMeals++
            }
          })

          if (tracking.dayTracking.performanceDay?.attended) {
            analytics.attendance.performanceDay.attended++
          }
          if (tracking.dayTracking.performanceDay?.breakfast) {
            analytics.food.performanceDay.breakfast++
            analytics.food.totalMeals++
          }
          if (tracking.dayTracking.performanceDay?.lunch) {
            analytics.food.performanceDay.lunch++
            analytics.food.totalMeals++
          }

          if (tracking.dayTracking.openingCeremony?.attended) {
            analytics.attendance.openingCeremony.attended++
          }
          if (tracking.dayTracking.openingCeremony?.catering) {
            analytics.food.openingCeremony.catering++
            analytics.food.totalMeals++
          }

          Object.keys(tracking.dayTracking.conference).forEach(day => {
            const dayData = tracking.dayTracking.conference[day as keyof typeof tracking.dayTracking.conference]
            if (dayData?.attended) {
              analytics.attendance.conference[day as keyof typeof analytics.attendance.conference].attended++
            }
            if (dayData?.breakfast) {
              analytics.food.conference[day as keyof typeof analytics.food.conference].breakfast++
              analytics.food.totalMeals++
            }
            if (dayData?.lunch) {
              analytics.food.conference[day as keyof typeof analytics.food.conference].lunch++
              analytics.food.totalMeals++
            }
          })
        }

        // Process games data
        if (tracking.games && tracking.games.length > 0) {
          analytics.games.totalActivities += tracking.games.length
          analytics.games.uniqueParticipants.add(participant.id)
          
          tracking.games.forEach((game: any) => {
            if (game.action === 'join') {
              analytics.games.activitiesByType[game.activity] = (analytics.games.activitiesByType[game.activity] || 0) + 1
            }
          })
        }

        // Process bus data
        if (tracking.bus && tracking.bus.length > 0) {
          analytics.bus.totalTrips += tracking.bus.length
          analytics.bus.participants.add(participant.id)
          
          tracking.bus.forEach((busActivity: any) => {
            const route = participant.busRoute || 'unknown'
            if (!analytics.bus.byRoute[route]) {
              analytics.bus.byRoute[route] = { arriving: 0, departing: 0 }
            }
            
            if (busActivity.type === 'arriving') {
              analytics.bus.byRoute[route].arriving++
            } else {
              analytics.bus.byRoute[route].departing++
            }
            
            analytics.bus.byStop[busActivity.stop] = (analytics.bus.byStop[busActivity.stop] || 0) + 1
          })
        }

      } catch (error) {
        console.warn(`Error processing tracking data for participant ${participant.id}:`, error)
      }
    })

    await Promise.all(trackingPromises)

    // Convert sets to counts
    analytics.games.uniqueParticipants = analytics.games.uniqueParticipants.size as any
    analytics.bus.participants = analytics.bus.participants.size as any

    // Create popular games list
    analytics.games.popularGames = Object.entries(analytics.games.activitiesByType)
      .map(([name, count]) => ({ name, participants: count }))
      .sort((a, b) => b.participants - a.participants)
      .slice(0, 10)

    // Add bus route information
    const busRoutes = getAllBusRoutes()
    const busRouteInfo = busRoutes.map(route => ({
      id: route.id,
      name: route.name,
      participantCount: analytics.busRoutes[route.id] || 0,
      stops: route.stops.length
    }))

    return NextResponse.json({
      ...analytics,
      busRouteInfo,
      sampleSize,
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error generating analytics:', error)
    return NextResponse.json(
      { error: 'Failed to generate analytics data' },
      { status: 500 }
    )
  }
} 