import type { Partner, TipResult } from "./types"

/**
 * Process OCR extracted text to get partner information and total tips
 */
export function processOcrData(text: string): { partners: Partner[]; totalTips: number } {
  console.log("Processing OCR data:", text)
  const partners: Partner[] = []
  let totalTips = 0

  // Clean up the text - remove extra spaces, normalize line breaks
  const cleanText = text.replace(/\s+/g, " ").trim()

  // Split into lines, being careful about different line break formats
  const lines = cleanText
    .split(/[\n\r]+/)
    .map((line) => line.trim())
    .filter(Boolean)
  console.log("Parsed lines:", lines)

  // Try to find the total tips amount using various patterns
  const tipPatterns = [
    /total\s+tips:?\s*\$?\s*(\d+[.,]?\d*)/i,
    /tips:?\s*\$?\s*(\d+[.,]?\d*)/i,
    /total:?\s*\$?\s*(\d+[.,]?\d*)/i,
    /\$\s*(\d+[.,]?\d*)/,
  ]

  for (const line of lines) {
    for (const pattern of tipPatterns) {
      const match = line.match(pattern)
      if (match) {
        const potentialTips = Number.parseFloat(match[1].replace(",", "."))
        // Only use this if it seems like a reasonable tip amount (> $20)
        if (potentialTips > 20) {
          totalTips = potentialTips
          console.log("Found total tips:", totalTips, "in line:", line)
          break
        }
      }
    }
    if (totalTips > 0) break
  }

  // Look for partner data using various patterns
  // First, try to identify a table structure
  let partnerSection = false
  let nameIndex = -1
  let hoursIndex = -1

  // Try to find the header row that contains "name" and "hours"
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase()

    if ((line.includes("partner") || line.includes("name")) && (line.includes("hour") || line.includes("time"))) {
      partnerSection = true

      // Try to determine column positions
      const parts = line.split(/\s+/)
      for (let j = 0; j < parts.length; j++) {
        if (parts[j].includes("partner") || parts[j].includes("name")) {
          nameIndex = j
        }
        if (parts[j].includes("hour") || parts[j].includes("time")) {
          hoursIndex = j
        }
      }

      console.log("Found header row at line", i, "name index:", nameIndex, "hours index:", hoursIndex)
      break
    }
  }

  // If we found a header row, process the following lines as data
  if (partnerSection && nameIndex >= 0 && hoursIndex >= 0) {
    console.log("Processing structured data with columns")

    // Process lines after the header
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase()

      // Skip if this is the header line or contains header-like words
      if (
        line.includes("partner") ||
        line.includes("name") ||
        line.includes("hour") ||
        line.includes("total") ||
        line.includes("report") ||
        line.includes("distribution")
      ) {
        continue
      }

      // Split the line into parts
      const parts = line.split(/\s+/)

      // Check if this line has enough parts and contains a number
      if (parts.length > Math.max(nameIndex, hoursIndex) && parts.some((part) => /\d+([.,]\d+)?/.test(part))) {
        // Extract name - might span multiple columns
        let name = ""
        if (hoursIndex > nameIndex) {
          // Name is before hours
          name = parts.slice(nameIndex, hoursIndex).join(" ")
        } else {
          // Hours is before name
          name = parts.slice(nameIndex).join(" ")
        }

        // Find the first number in the line that could be hours
        let hours = 0
        for (const part of parts) {
          const match = part.match(/(\d+([.,]\d+)?)/)
          if (match) {
            hours = Number.parseFloat(match[1].replace(",", "."))
            if (hours > 0 && hours < 100) {
              // Reasonable hour range
              break
            }
          }
        }

        if (name && hours > 0) {
          // Clean up the name
          name = name.replace(/[^a-z\s]/gi, "").trim()
          if (name.length > 1) {
            partners.push({ name, hours })
            console.log("Found partner:", name, "with hours:", hours)
          }
        }
      }
    }
  }

  // If structured approach failed, try a more aggressive pattern matching
  if (partners.length === 0) {
    console.log("Structured approach failed, trying pattern matching")

    // Look for patterns like "Name 12.5" or "Name: 12.5"
    const nameHourPattern = /([a-z\s]+)[:\s]+(\d+([.,]\d+)?)/i

    for (const line of lines) {
      const match = line.match(nameHourPattern)
      if (match) {
        const name = match[1].trim()
        const hours = Number.parseFloat(match[2].replace(",", "."))

        if (name && hours > 0 && hours < 100) {
          // Reasonable hour range
          partners.push({ name, hours })
          console.log("Found partner with pattern matching:", name, "with hours:", hours)
        }
      }
    }

    // If still no partners, try an even more aggressive approach
    if (partners.length === 0) {
      console.log("Pattern matching failed, trying word-number pairs")

      // Look for any word followed by a number
      for (const line of lines) {
        const words = line.split(/\s+/)

        for (let i = 0; i < words.length - 1; i++) {
          const potentialName = words[i]
          const potentialHours = words[i + 1]

          // Check if this looks like a name (starts with letter) and hours (is a number)
          if (/^[a-z]/i.test(potentialName) && /^\d+([.,]\d+)?$/.test(potentialHours)) {
            const name = potentialName
            const hours = Number.parseFloat(potentialHours.replace(",", "."))

            if (name.length > 1 && hours > 0 && hours < 100) {
              partners.push({ name, hours })
              console.log("Found partner with word-number pair:", name, "with hours:", hours)
            }
          }
        }
      }
    }
  }

  // If we still couldn't find a total tips amount, make an educated guess
  if (totalTips === 0 && partners.length > 0) {
    // Assume average of $5-10 per hour as a fallback
    const totalHours = partners.reduce((sum, p) => sum + p.hours, 0)
    totalTips = Math.round(totalHours * 7.5) // $7.50 per hour average
    console.log("Estimated total tips based on hours:", totalTips)
  }

  return { partners, totalTips }
}

/**
 * Calculate tip amounts for each partner based on hours worked
 */
export function calculateTips(partners: Partner[], totalTips: number): TipResult[] {
  // Calculate total hours
  const totalHours = partners.reduce((sum, partner) => sum + partner.hours, 0)

  if (totalHours === 0) {
    throw new Error("Total hours cannot be zero")
  }

  // Floor the total tips to whole dollars
  const flooredTotalTips = Math.floor(totalTips)

  // Calculate each partner's share and round down to nearest dollar
  const results: TipResult[] = partners.map((partner) => {
    const exactAmount = (partner.hours / totalHours) * flooredTotalTips
    const flooredAmount = Math.floor(exactAmount)

    return {
      name: partner.name,
      hours: partner.hours,
      amount: flooredAmount,
      billBreakdown: "",
      bills: { twenties: 0, tens: 0, fives: 0, ones: 0 },
    }
  })

  // Calculate the sum of all floored amounts
  const distributedAmount = results.reduce((sum, result) => sum + result.amount, 0)

  // If there's a difference due to rounding, add the remaining dollars to partners
  // starting with those who lost the most in the rounding
  if (distributedAmount < flooredTotalTips) {
    const remaining = flooredTotalTips - distributedAmount

    // Calculate the fractional part that was lost for each partner
    const fractionalLosses = results.map((result, index) => {
      const exactAmount = (partners[index].hours / totalHours) * flooredTotalTips
      return {
        index,
        loss: exactAmount - result.amount,
      }
    })

    // Sort by loss in descending order
    fractionalLosses.sort((a, b) => b.loss - a.loss)

    // Distribute the remaining dollars
    for (let i = 0; i < remaining; i++) {
      const partnerIndex = fractionalLosses[i % fractionalLosses.length].index
      results[partnerIndex].amount += 1
    }
  }

  return results
}

/**
 * Calculate bill denominations for each partner's tip amount
 */
export function calculateBillDenominations(tipResults: TipResult[]): TipResult[] {
  // Define available bill denominations
  const denominations = [20, 10, 5, 1]

  // Create a copy of the results to work with
  const results = [...tipResults]

  // First pass: Calculate the optimal bill breakdown for each partner
  results.forEach((result) => {
    let remaining = result.amount
    const bills = { twenties: 0, tens: 0, fives: 0, ones: 0 }

    // Greedy algorithm for bill distribution
    if (remaining >= 20) {
      bills.twenties = Math.floor(remaining / 20)
      remaining %= 20
    }

    if (remaining >= 10) {
      bills.tens = Math.floor(remaining / 10)
      remaining %= 10
    }

    if (remaining >= 5) {
      bills.fives = Math.floor(remaining / 5)
      remaining %= 5
    }

    bills.ones = remaining

    result.bills = bills
  })

  // Second pass: Balance the distribution of small bills
  // This ensures partners with similar amounts get similar bill distributions
  balanceBillDistribution(results)

  // Generate the bill breakdown strings
  results.forEach((result) => {
    const { twenties, tens, fives, ones } = result.bills
    const parts = []

    if (twenties > 0) parts.push(`${twenties}x$20`)
    if (tens > 0) parts.push(`${tens}x$10`)
    if (fives > 0) parts.push(`${fives}x$5`)
    if (ones > 0) parts.push(`${ones}x$1`)

    result.billBreakdown = parts.join(", ")
  })

  return results
}

/**
 * Balance the distribution of bills to ensure fairness
 */
function balanceBillDistribution(results: TipResult[]): void {
  // Sort results by amount
  results.sort((a, b) => a.amount - b.amount)

  // Group partners by tip amount
  const groups: Record<number, TipResult[]> = {}
  results.forEach((result) => {
    if (!groups[result.amount]) {
      groups[result.amount] = []
    }
    groups[result.amount].push(result)
  })

  // For each group, balance the bill distribution
  Object.values(groups).forEach((group) => {
    if (group.length <= 1) return

    // Calculate the total bills of each denomination in this group
    const totalBills = {
      twenties: group.reduce((sum, r) => sum + r.bills.twenties, 0),
      tens: group.reduce((sum, r) => sum + r.bills.tens, 0),
      fives: group.reduce((sum, r) => sum + r.bills.fives, 0),
      ones: group.reduce((sum, r) => sum + r.bills.ones, 0),
    }

    // Calculate the average number of each bill denomination
    const avgTwenties = Math.floor(totalBills.twenties / group.length)
    const avgTens = Math.floor(totalBills.tens / group.length)
    const avgFives = Math.floor(totalBills.fives / group.length)

    // Redistribute bills to be as even as possible
    group.forEach((result) => {
      // Reset the bill counts
      const amount = result.amount
      result.bills = { twenties: 0, tens: 0, fives: 0, ones: 0 }

      // Assign the average number of each bill
      result.bills.twenties = avgTwenties
      let remaining = amount - avgTwenties * 20

      result.bills.tens = Math.min(avgTens, Math.floor(remaining / 10))
      remaining -= result.bills.tens * 10

      result.bills.fives = Math.min(avgFives, Math.floor(remaining / 5))
      remaining -= result.bills.fives * 5

      result.bills.ones = remaining
    })

    // Distribute any remaining bills due to rounding
    const remainingTwenties = totalBills.twenties - avgTwenties * group.length
    const remainingTens = totalBills.tens - avgTens * group.length
    const remainingFives = totalBills.fives - avgFives * group.length

    for (let i = 0; i < remainingTwenties; i++) {
      const partner = group[i % group.length]
      partner.bills.twenties += 1
      partner.bills.ones -= 20
    }

    for (let i = 0; i < remainingTens; i++) {
      const partner = group[i % group.length]
      partner.bills.tens += 1
      partner.bills.ones -= 10
    }

    for (let i = 0; i < remainingFives; i++) {
      const partner = group[i % group.length]
      partner.bills.fives += 1
      partner.bills.ones -= 5
    }
  })
}

