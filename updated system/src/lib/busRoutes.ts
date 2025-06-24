export interface BusRoute {
  id: string
  name: string
  startTime: string // How early before event day
  stops: string[]
}

export const BUS_ROUTES: BusRoute[] = [
  {
    id: 'route-1',
    name: '6th of October',
    startTime: '1 Hour Before',
    stops: [
      'Engineers Syndicate Club',
      '26th of July Corridor', 
      'Al-Hosary Mosque، الجيزه الحصري ميدان',
      'Cityscape Mall',
      'Nefertari International School',
      'Gamal Abd El-Nasir'
    ]
  },
  {
    id: 'route-2', 
    name: '5th Settlement',
    startTime: '2 Hours Before',
    stops: [
      'Triumph Luxury Hotel، Katameya Heights Road Cairo',
      'Waterway Mall',
      'Police Officers Club -الشرطة نادي'
    ]
  },
  {
    id: 'route-3',
    name: 'Sheikh Zayed',
    startTime: '1 Hour Before', 
    stops: [
      'Zayed 6',
      'Beverly Hills School Gate',
      'Hadayek Elmohandseen (seoudi)',
      'Hyper 1',
      'الحي الثالث الشيخ زايد - 3rd District'
    ]
  },
  {
    id: 'route-4',
    name: 'Feisal',
    startTime: '1 Hour Before',
    stops: [
      'Giza Metro - مترو الجيزة',
      'كشري العريس، ٩٨ شارع الملك فيصل، ناصيه، المريوطيه',
      'خوفو )االولي البوابه)',
      'Kafr Nassar',
      'Khafraa Gate',
      'Al Haram, Giza Governorate',
      'Dream Land, El Wahat Rd'
    ]
  },
  {
    id: 'route-5',
    name: 'Maadi',
    startTime: '2 Hours Before',
    stops: [
      'Nahda Square - النهضة ميدان',
      'Grand Mall Square',
      'Bavaria Square', 
      'Maadi City Center'
    ]
  }
]

export function getBusRouteById(id: string): BusRoute | undefined {
  return BUS_ROUTES.find(route => route.id === id)
}

export function getBusRouteByName(name: string): BusRoute | undefined {
  return BUS_ROUTES.find(route => route.name.toLowerCase() === name.toLowerCase())
}

export function getAllBusRoutes(): BusRoute[] {
  return BUS_ROUTES
}

export function getStopsForRoute(routeId: string): string[] {
  const route = getBusRouteById(routeId)
  return route ? route.stops : []
}

// Helper function to normalize route names during import
export function mapRouteNameToId(routeName: string): string | null {
  const normalizedName = routeName.toLowerCase().trim()
  
  const routeMappings: Record<string, string> = {
    '6th of october': 'route-1',
    '6th october': 'route-1',
    'october': 'route-1',
    'route 1': 'route-1',
    'route1': 'route-1',
    
    '5th settlement': 'route-2',
    'fifth settlement': 'route-2',
    'settlement': 'route-2',
    'route 2': 'route-2',
    'route2': 'route-2',
    
    'sheikh zayed': 'route-3',
    'zayed': 'route-3',
    'route 3': 'route-3',
    'route3': 'route-3',
    
    'feisal': 'route-4',
    'faysal': 'route-4',
    'route 4': 'route-4',
    'route4': 'route-4',
    
    'maadi': 'route-5',
    'route 5': 'route-5',
    'route5': 'route-5'
  }
  
  return routeMappings[normalizedName] || null
} 