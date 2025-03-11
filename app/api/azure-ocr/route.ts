import { NextResponse } from 'next/server'
import { AzureKeyCredential, DocumentAnalysisClient } from "@azure/ai-form-recognizer"

/**
 * Azure Computer Vision OCR endpoint
 * 
 * In a production app, this would call the Azure Computer Vision API
 * You would need to:
 * 1. Set up an Azure account
 * 2. Create a Computer Vision resource
 * 3. Get your API key and endpoint
 * 4. Install the @azure/cognitiveservices-computervision package
 */

// Azure Form Recognizer configuration
const endpoint = process.env.AZURE_FORM_RECOGNIZER_ENDPOINT || "https://sbuxtips.cognitiveservices.azure.com/"
const apiKey = process.env.AZURE_FORM_RECOGNIZER_KEY || ""

export async function POST(request: Request) {
  try {
    const { image, contentType = 'image/jpeg' } = await request.json()
    
    if (!image) {
      return NextResponse.json(
        { error: 'No image data provided' },
        { status: 400 }
      )
    }

    // If API key is not configured, use Tesseract.js as fallback
    if (!apiKey) {
      console.warn('Azure Form Recognizer API key not configured, using fallback OCR')
      
      // For now, return a message about the missing API key
      return NextResponse.json({ 
        text: "Azure OCR is not properly configured. Please add your Azure Form Recognizer API key to the .env.local file or try using Mistral OCR instead." 
      })
    }

    try {
      // Create the client
      const client = new DocumentAnalysisClient(
        endpoint,
        new AzureKeyCredential(apiKey)
      )

      // Convert base64 to buffer
      const imageBuffer = Buffer.from(image, 'base64')

      // Analyze the document
      const poller = await client.beginAnalyzeDocument("prebuilt-document", imageBuffer)
      const result = await poller.pollUntilDone()

      // Extract text from the result
      let extractedText = ""
      
      // Process pages
      if (result.pages) {
        for (const page of result.pages) {
          for (const line of page.lines || []) {
            extractedText += line.content + "\n"
          }
        }
      }
      
      // Process tables if available
      if (result.tables) {
        for (const table of result.tables) {
          extractedText += "\nTable:\n"
          
          // Create a 2D array to hold the table data
          const tableData: string[][] = []
          
          // Initialize the table with empty cells
          for (let i = 0; i < table.rowCount; i++) {
            tableData.push(Array(table.columnCount).fill(""))
          }
          
          // Fill in the cells with content
          for (const cell of table.cells) {
            if (cell.rowIndex !== undefined && cell.columnIndex !== undefined) {
              tableData[cell.rowIndex][cell.columnIndex] = cell.content
            }
          }
          
          // Convert the 2D array to a string representation
          for (const row of tableData) {
            extractedText += row.join("\t") + "\n"
          }
        }
      }

      // Clean up the text
      extractedText = extractedText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n')

      return NextResponse.json({ text: extractedText })
    } catch (azureError) {
      console.error('Azure OCR error:', azureError)
      
      // Return a more user-friendly error message
      return NextResponse.json({ 
        text: "Azure OCR encountered an error. This may be due to an invalid API key or endpoint. Please check your Azure Form Recognizer configuration or try using Mistral OCR instead." 
      })
    }
  } catch (error) {
    console.error('Azure OCR error:', error)
    return NextResponse.json(
      { error: 'Failed to process with Azure OCR: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
} 