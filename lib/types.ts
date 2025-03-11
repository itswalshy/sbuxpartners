export interface Partner {
  name: string
  hours: number
}

export interface TipResult {
  name: string
  hours: number
  amount: number
  billBreakdown: string
  bills: {
    twenties: number
    tens: number
    fives: number
    ones: number
  }
}

