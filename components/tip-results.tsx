"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { TipResult } from "@/lib/types"
import { Download, Printer } from "lucide-react"

interface TipResultsProps {
  results: TipResult[]
  totalTips: number
}

export default function TipResults({ results, totalTips }: TipResultsProps) {
  const [view, setView] = useState<"table" | "cards">("table")

  const totalHours = results.reduce((sum, result) => sum + result.hours, 0)
  const totalDistributed = results.reduce((sum, result) => sum + result.amount, 0)

  const exportToCsv = () => {
    const headers = ["Partner Name", "Hours", "Tip Amount", "Bill Breakdown"]
    const rows = results.map((result) => [
      result.name,
      result.hours.toString(),
      `$${result.amount}`,
      result.billBreakdown,
    ])

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `tip_distribution_${new Date().toISOString().split("T")[0]}.csv`)
    link.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Tip Distribution Results</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setView(view === "table" ? "cards" : "table")}>
            {view === "table" ? "Card View" : "Table View"}
          </Button>
          <Button variant="outline" size="sm" onClick={exportToCsv}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">Total Tips</div>
            <div className="text-2xl font-bold">${totalTips.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">Distributed</div>
            <div className="text-2xl font-bold">${totalDistributed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">Total Hours</div>
            <div className="text-2xl font-bold">{totalHours.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">Partners</div>
            <div className="text-2xl font-bold">{results.length}</div>
          </CardContent>
        </Card>
      </div>

      {view === "table" ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partner</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead className="text-right">Tip Amount</TableHead>
                <TableHead>Bill Breakdown</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{result.name}</TableCell>
                  <TableCell className="text-right">{result.hours.toFixed(2)}</TableCell>
                  <TableCell className="text-right">${result.amount}</TableCell>
                  <TableCell>{result.billBreakdown}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {results.map((result, index) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{result.name}</h4>
                    <p className="text-sm text-gray-500">{result.hours.toFixed(2)} hours</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold">${result.amount}</div>
                    <div className="text-sm text-gray-500">{result.billBreakdown}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="text-sm text-gray-500 italic">
        <p>
          Note: Tips are rounded down to the nearest dollar and distributed as fairly as possible using available bill
          denominations.
        </p>
      </div>
    </div>
  )
}

