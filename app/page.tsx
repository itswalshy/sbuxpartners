import { Suspense } from "react"
import TipCalculator from "@/components/tip-calculator"
import { Toaster } from "@/components/ui/toaster"

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-green-700 flex items-center justify-center">
              <span className="text-white text-2xl font-bold">SB</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-green-800">Barista Tip Calculator</h1>
          <p className="text-gray-600 mt-2">
            Upload tip reports, calculate distributions, and generate bill breakdowns
          </p>
        </header>

        <Suspense fallback={<div className="text-center py-10">Loading...</div>}>
          <TipCalculator />
        </Suspense>
      </div>
      <Toaster />
    </main>
  )
}

