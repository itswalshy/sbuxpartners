"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Upload, FileText, Image, Loader2, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createWorker } from "tesseract.js"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { PSM } from 'tesseract.js'

interface FileUploaderProps {
  onFileProcessed: (extractedText: string) => void
  isProcessing: boolean
}

export default function FileUploader({ onFileProcessed, isProcessing }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [processingStatus, setProcessingStatus] = useState<string>("")
  const [ocrProgress, setOcrProgress] = useState<number>(0)
  const [extractedText, setExtractedText] = useState<string>("")
  const [showDebug, setShowDebug] = useState(false)
  const [ocrMethod, setOcrMethod] = useState<"tesseract" | "ocrspace" | "mistral" | "ocrmypdf">("ocrspace")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = async (file: File) => {
    const validTypes = ["image/jpeg", "image/png", "application/pdf"]

    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a JPG, PNG, or PDF file.",
        variant: "destructive",
      })
      return
    }

    setFile(file)
    setProcessingStatus("Starting processing...")
    setOcrProgress(0)
    setExtractedText("")

    try {
      let text = ""

      if (file.type === "application/pdf") {
        setProcessingStatus("Processing PDF...")
        if (ocrMethod === "ocrspace") {
          text = await processWithOCRSpace(file)
        } else if (ocrMethod === "mistral") {
          text = await processPdfWithMistralOCR(file)
        } else if (ocrMethod === "ocrmypdf") {
          text = await processWithOCRmyPDF(file)
        } else {
          text = await processPdfWithOCR(file)
        }
      } else if (file.type.startsWith("image/")) {
        const methodName = 
          ocrMethod === "ocrspace" ? "OCR.space" : 
          ocrMethod === "mistral" ? "Mistral OCR" : 
          ocrMethod === "ocrmypdf" ? "OCRmyPDF" : 
          "Tesseract"
        setProcessingStatus(`Processing image with ${methodName}...`)
        
        if (ocrMethod === "ocrspace") {
          text = await processWithOCRSpace(file)
        } else if (ocrMethod === "mistral") {
          text = await processWithMistralOCR(file)
        } else if (ocrMethod === "ocrmypdf") {
          text = await processWithOCRmyPDF(file)
        } else {
          text = await processImageWithOCR(file)
        }
      }

      setExtractedText(text)

      if (text.trim().length > 10) {
        onFileProcessed(text)
        setProcessingStatus("Processing complete!")
      } else {
        throw new Error("Could not extract sufficient text from the file")
      }
    } catch (error) {
      console.error("Processing error:", error)
      toast({
        title: "Processing Failed",
        description: "Failed to extract text from the file. Please try again or use a clearer image.",
        variant: "destructive",
      })
      setProcessingStatus("Processing failed")
    }
  }

  const processWithOCRSpace = async (file: File): Promise<string> => {
    try {
      setProcessingStatus("Preparing image for OCR.space...")
      setOcrProgress(20)

      // Convert file to base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
            const base64 = reader.result.split(',')[1]
            resolve(base64)
          } else {
            reject(new Error("Failed to convert file to base64"))
          }
        }
        reader.onerror = error => reject(error)
      })

      setProcessingStatus("Sending to OCR.space...")
      setOcrProgress(40)

      // Call our OCR.space API endpoint
      const response = await fetch('/api/ocrspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image: base64Data,
          contentType: file.type 
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to process with OCR.space')
      }

      setOcrProgress(80)
      const data = await response.json()
      
      setOcrProgress(100)
      return data.text
    } catch (error) {
      console.error("OCR.space error:", error)
      throw new Error("Failed to process with OCR.space")
    }
  }

  const processWithMistralOCR = async (file: File): Promise<string> => {
    try {
      setProcessingStatus("Preparing image for Mistral OCR...")
      setOcrProgress(20)

      // Convert file to base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
            const base64 = reader.result.split(',')[1]
            resolve(base64)
          } else {
            reject(new Error("Failed to convert file to base64"))
          }
        }
        reader.onerror = error => reject(error)
      })

      setProcessingStatus("Sending to Mistral OCR...")
      setOcrProgress(40)

      // Call our Mistral OCR API endpoint
      const response = await fetch('/api/mistral-ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Data })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to process with Mistral OCR')
      }

      setOcrProgress(80)
      const data = await response.json()
      
      setOcrProgress(100)
      return data.text
    } catch (error) {
      console.error("Mistral OCR error:", error)
      throw new Error("Failed to process with Mistral OCR")
    }
  }

  const processPdfWithMistralOCR = async (pdfFile: File): Promise<string> => {
    try {
      setProcessingStatus("Preparing PDF for Mistral OCR...")
      setOcrProgress(20)

      // Convert PDF to base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(pdfFile)
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            // Remove the data URL prefix
            const base64 = reader.result.split(',')[1]
            resolve(base64)
          } else {
            reject(new Error("Failed to convert PDF to base64"))
          }
        }
        reader.onerror = error => reject(error)
      })

      setProcessingStatus("Sending PDF to Mistral OCR...")
      setOcrProgress(40)

      // Call our Mistral OCR API endpoint with PDF
      const response = await fetch('/api/mistral-ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image: base64Data,
          contentType: 'application/pdf'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to process PDF with Mistral OCR')
      }

      setOcrProgress(80)
      const data = await response.json()
      
      setOcrProgress(100)
      return data.text
    } catch (error) {
      console.error("PDF processing error:", error)
      throw new Error("Failed to process PDF with Mistral OCR")
    }
  }

  const processPdfWithOCR = async (pdfFile: File): Promise<string> => {
    try {
      setProcessingStatus("Converting PDF to image for OCR...")
      setOcrProgress(20)

      // For browser-based PDF processing with Tesseract, we need to convert PDF to images
      // This is a simplified version - in a real app, you would use a PDF.js or similar
      
      // For now, we'll just inform the user that PDF processing with Tesseract is limited
      toast({
        title: "PDF Processing Limited",
        description: "Tesseract.js has limited PDF support. For better results with PDFs, use OCR.space or Mistral OCR.",
        variant: "default",
      })
      
      setOcrProgress(50)
      
      // Simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 1500))
      
      // Return a placeholder message
      return "PDF processing with Tesseract.js is limited. Please try OCR.space or Mistral OCR for PDFs."
    } catch (error) {
      console.error("PDF processing error:", error)
      throw new Error("Failed to process PDF with Tesseract")
    }
  }

  const processImageWithOCR = async (imageFile: File): Promise<string> => {
    try {
      setProcessingStatus("Loading OCR engine...")

      // Create a worker
      const worker = await createWorker()

      // Initialize the worker
      await worker.load()
      setProcessingStatus("Loading language data...")
      setOcrProgress(20)

      await worker.loadLanguage("eng")
      setProcessingStatus("Initializing OCR...")
      setOcrProgress(40)

      await worker.initialize("eng")
      setProcessingStatus("Setting up parameters...")
      setOcrProgress(60)

      // Set parameters to improve recognition of tabular data
      await worker.setParameters({
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.$:,- ",
        preserve_interword_spaces: "1",
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
        tessedit_ocr_engine_mode: 3,
        textord_tabfind_find_tables: 1,
        textord_min_linesize: 2.5,
        classify_bln_numeric_mode: 1,
      })

      // Convert file to image URL
      const imageUrl = URL.createObjectURL(imageFile)

      // Pre-process image settings
      await worker.setParameters({
        image_default_resolution: 300,
        textord_heavy_nr: 1,
        edges_max_children_per_outline: 40,
      })

      // Recognize text
      setProcessingStatus("Recognizing text...")
      setOcrProgress(80)

      const { data } = await worker.recognize(imageUrl)
      setOcrProgress(100)

      // Clean up
      URL.revokeObjectURL(imageUrl)
      await worker.terminate()

      // Post-process the text to improve structure recognition
      const processedText = data.text
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0)
        .join('\n')

      console.log("Extracted image text:", processedText)
      return processedText
    } catch (error) {
      console.error("OCR error:", error)
      throw new Error("Failed to extract text from image")
    }
  }

  const processWithOCRmyPDF = async (file: File): Promise<string> => {
    try {
      setProcessingStatus("Preparing file for OCRmyPDF...")
      setOcrProgress(20)

      // Convert file to base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
            const base64 = reader.result.split(',')[1]
            resolve(base64)
          } else {
            reject(new Error("Failed to convert file to base64"))
          }
        }
        reader.onerror = error => reject(error)
      })

      setProcessingStatus("Sending to OCRmyPDF...")
      setOcrProgress(40)

      // Call our OCRmyPDF API endpoint
      const response = await fetch('/api/ocrmypdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image: base64Data,
          contentType: file.type 
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to process with OCRmyPDF')
      }

      setOcrProgress(80)
      const data = await response.json()
      
      setOcrProgress(100)
      return data.text
    } catch (error) {
      console.error("OCRmyPDF error:", error)
      throw new Error("Failed to process with OCRmyPDF")
    }
  }

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h3 className="text-sm font-medium mb-2">OCR Method</h3>
        <RadioGroup 
          value={ocrMethod} 
          onValueChange={(value: "tesseract" | "ocrspace" | "mistral" | "ocrmypdf") => setOcrMethod(value)}
          className="flex flex-wrap gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="ocrspace" id="ocrspace" />
            <Label htmlFor="ocrspace">OCR.space (Recommended)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="mistral" id="mistral" />
            <Label htmlFor="mistral">Mistral OCR</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="ocrmypdf" id="ocrmypdf" />
            <Label htmlFor="ocrmypdf">OCRmyPDF</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="tesseract" id="tesseract" />
            <Label htmlFor="tesseract">Tesseract.js (Fallback)</Label>
          </div>
        </RadioGroup>
      </div>

      <Card
        className={`border-2 border-dashed p-8 text-center ${
          isDragging ? "border-green-500 bg-green-50" : "border-gray-300"
        } transition-colors duration-200 cursor-pointer`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInput}
          className="hidden"
          accept=".jpg,.jpeg,.png,.pdf"
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="rounded-full bg-green-100 p-3">
            <Upload className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="font-medium">{file ? file.name : "Drag & drop or click to upload"}</p>
            <p className="text-sm text-gray-500 mt-1">Supports JPG, PNG, and PDF files</p>
          </div>
        </div>
      </Card>

      {file && (
        <div className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
          <div className="flex items-center space-x-3">
            {file.type.includes("image") ? (
              <Image className="h-5 w-5 text-gray-500" />
            ) : (
              <FileText className="h-5 w-5 text-gray-500" />
            )}
            <span className="text-sm truncate max-w-[200px]">{file.name}</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFile(null)
              setProcessingStatus("")
              setOcrProgress(0)
              setExtractedText("")
            }}
            disabled={isProcessing}
          >
            Remove
          </Button>
        </div>
      )}

      {processingStatus && (
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            {processingStatus.includes("failed") ? (
              <AlertCircle className="h-4 w-4 text-red-500" />
            ) : (
              <Loader2 className="h-4 w-4 animate-spin text-green-600" />
            )}
            <span className="text-sm text-gray-600">{processingStatus}</span>
          </div>
          {ocrProgress > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${ocrProgress}%` }}></div>
            </div>
          )}
        </div>
      )}

      {extractedText && (
        <div className="mt-2">
          <Button variant="outline" size="sm" onClick={() => setShowDebug(!showDebug)} className="mb-2">
            {showDebug ? "Hide" : "Show"} Extracted Text
          </Button>

          {showDebug && (
            <div className="p-3 bg-gray-50 border rounded-md">
              <pre className="text-xs overflow-auto max-h-40 whitespace-pre-wrap">{extractedText}</pre>
            </div>
          )}
        </div>
      )}

      <Alert className="bg-amber-50 border-amber-200">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800">OCR Information</AlertTitle>
        <AlertDescription className="text-amber-700">
          {ocrMethod === "ocrspace" ? (
            "OCR.space provides high-accuracy text extraction with excellent table recognition and support for multiple languages."
          ) : ocrMethod === "mistral" ? (
            "Mistral OCR provides state-of-the-art accuracy for document processing, including tables and structured data."
          ) : ocrMethod === "ocrmypdf" ? (
            "OCRmyPDF is optimized for PDF documents and provides high-quality text layer addition to scanned PDFs."
          ) : (
            "Tesseract.js runs in the browser but may have limited accuracy. For better results, try OCR.space or Mistral OCR."
          )}
        </AlertDescription>
      </Alert>
    </div>
  )
}

