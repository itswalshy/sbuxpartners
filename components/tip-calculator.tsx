"use client"

import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import FileUploader from "@/components/file-uploader"
import ManualEntryForm from "@/components/manual-entry-form"
import TipResults from "@/components/tip-results"
import { processOcrData, calculateTips, calculateBillDenominations } from "@/lib/tip-calculations"
import type { Partner, TipResult } from "@/lib/types"

export default function TipCalculator() {
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)
  const [partners, setPartners] = useState<Partner[]>([])
  const [totalTips, setTotalTips] = useState<number>(0)
  const [results, setResults] = useState<TipResult[]>([])
  const [activeTab, setActiveTab] = useState("upload")

  const handleFileProcessed = async (extractedText: string) => {
    setIsProcessing(true)
    try {
      // Process the OCR data to extract partner information
      const { partners: extractedPartners, totalTips: extractedTotalTips } = processOcrData(extractedText)

      if (extractedPartners.length === 0) {
        toast({
          title: "Extraction Issue",
          description:
            "No partner data could be extracted. Please check the extracted text and try manual entry if needed.",
          variant: "destructive",
        })
        throw new Error("No partner data could be extracted from the file")
      }

      setPartners(extractedPartners)
      setTotalTips(extractedTotalTips)
      setActiveTab("review")

      toast({
        title: "Data Extracted Successfully",
        description: `Found ${extractedPartners.length} partners with a total of $${extractedTotalTips.toFixed(2)} in tips.`,
      })

      // Log the extracted data for debugging
      console.log("Extracted partners:", extractedPartners)
      console.log("Extracted total tips:", extractedTotalTips)
    } catch (error) {
      toast({
        title: "Error Processing File",
        description:
          error instanceof Error ? error.message : "Failed to process the file. Please try manual entry instead.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleManualEntry = (manualPartners: Partner[], manualTotalTips: number) => {
    setPartners(manualPartners)
    setTotalTips(manualTotalTips)
    setActiveTab("review")
  }

  const calculateResults = () => {
    setIsProcessing(true)
    try {
      // Calculate tips for each partner
      const tipAmounts = calculateTips(partners, totalTips)

      // Calculate bill denominations for each partner
      const tipResults = calculateBillDenominations(tipAmounts)

      setResults(tipResults)
      setActiveTab("results")
    } catch (error) {
      toast({
        title: "Calculation Error",
        description: error instanceof Error ? error.message : "An error occurred during calculation.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const resetCalculator = () => {
    setPartners([])
    setTotalTips(0)
    setResults([])
    setActiveTab("upload")
  }

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle>Weekly Tip Calculator</CardTitle>
        <CardDescription>
          Upload a tip report or manually enter partner hours to calculate tip distributions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="review" disabled={partners.length === 0}>
              Review
            </TabsTrigger>
            <TabsTrigger value="results" disabled={results.length === 0}>
              Results
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4 py-4">
            <div className="grid grid-cols-1 gap-6">
              <div>
                <Tabs defaultValue="file">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="file">Upload File</TabsTrigger>
                    <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                  </TabsList>

                  <TabsContent value="file" className="py-4">
                    <FileUploader onFileProcessed={handleFileProcessed} isProcessing={isProcessing} />
                  </TabsContent>

                  <TabsContent value="manual" className="py-4">
                    <ManualEntryForm onSubmit={handleManualEntry} />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="review" className="space-y-4 py-4">
            <div className="mb-4">
              <Label htmlFor="totalTips">Total Tips ($)</Label>
              <Input
                id="totalTips"
                type="number"
                step="0.01"
                value={totalTips}
                onChange={(e) => setTotalTips(Number.parseFloat(e.target.value) || 0)}
                className="mt-1"
              />
            </div>

            <div className="border rounded-md p-4">
              <h3 className="font-medium mb-2">Partner Hours</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {partners.map((partner, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={partner.name}
                      onChange={(e) => {
                        const newPartners = [...partners]
                        newPartners[index].name = e.target.value
                        setPartners(newPartners)
                      }}
                      className="flex-1"
                      placeholder="Partner Name"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      value={partner.hours}
                      onChange={(e) => {
                        const newPartners = [...partners]
                        newPartners[index].hours = Number.parseFloat(e.target.value) || 0
                        setPartners(newPartners)
                      }}
                      className="w-24"
                      placeholder="Hours"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-4 flex justify-between">
                <Button variant="outline" onClick={() => setPartners([...partners, { name: "", hours: 0 }])}>
                  Add Partner
                </Button>
                <div className="text-sm text-gray-500">
                  Total Hours: {partners.reduce((sum, p) => sum + p.hours, 0).toFixed(2)}
                </div>
              </div>
            </div>

            <Button
              onClick={calculateResults}
              disabled={isProcessing || partners.length === 0 || totalTips <= 0}
              className="w-full mt-4"
            >
              {isProcessing ? "Calculating..." : "Calculate Tips"}
            </Button>
          </TabsContent>

          <TabsContent value="results" className="py-4">
            <TipResults results={results} totalTips={totalTips} />
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={resetCalculator}>
          Start Over
        </Button>
        {results.length > 0 && <Button onClick={() => window.print()}>Print Results</Button>}
      </CardFooter>
    </Card>
  )
}

