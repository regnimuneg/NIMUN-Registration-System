export interface Participant {
  id: string
  name: string
  phoneNumber: string
  position: string
  gender: 'Male' | 'Female'
  qrUrl?: string
  busRoute?: string
  busStop?: string
}

export interface TrackingData {
  dayTracking: {
    sessions: {
      day1: { attended: boolean; lunch?: boolean }
      day2: { attended: boolean; lunch?: boolean }
      day3: { attended: boolean; lunch?: boolean }
      day4: { attended: boolean; lunch?: boolean }
    }
    performanceDay: { attended: boolean; breakfast?: boolean; lunch?: boolean }
    openingCeremony: { attended: boolean; catering?: boolean; bar?: boolean }
    conference: {
      day1: { attended: boolean; breakfast?: boolean; lunch?: boolean }
      day2: { attended: boolean; breakfast?: boolean; lunch?: boolean }
      day3: { attended: boolean; breakfast?: boolean; lunch?: boolean }
    }
  }
  food: {
    breakfast?: boolean
    lunch?: boolean
    dinner?: boolean
    snack1?: boolean
    snack2?: boolean
  }
  games: Array<{
    activity: string
    action: 'join' | 'leave'
    timestamp: string
  }>
  bus: Array<{
    type: 'arriving' | 'departing'
    stop: string
    timestamp: string
  }>
}
