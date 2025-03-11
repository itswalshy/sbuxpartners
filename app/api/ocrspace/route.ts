import { NextResponse } from 'next/server'

const OCR_SPACE_API_KEY = "K86171231888957"
const OCR_SPACE_API_URL = "https://api.ocr.space/parse/image"

export async function POST(request: Request) {
  try {
    const { image, contentType = 'image/jpeg' } = await request.json()
    
    if (!image) {
      return NextResponse.json(
        { error: 'No image data provided' },
        { status: 400 }
      )
    }

    // Prepare form data for OCR.space API
    const formData = new FormData()
    formData.append('apikey', OCR_SPACE_API_KEY)
    formData.append('base64Image', `data:${contentType};base64,${image}`)
    formData.append('language', 'eng')
    formData.append('isTable', 'true')
    formData.append('OCREngine', '2') // More accurate OCR engine

    const response = await fetch(OCR_SPACE_API_URL, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('OCR.space API error:', errorData)
      return NextResponse.json(
        { error: `OCR.space API error: ${JSON.stringify(errorData)}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    if (data.ErrorMessage || data.ErrorDetails) {
      console.error('OCR.space processing error:', data)
      return NextResponse.json(
        { error: data.ErrorMessage || data.ErrorDetails },
        { status: 400 }
      )
    }

    // Extract text from the OCR.space response
    let extractedText = ""
    if (data.ParsedResults && data.ParsedResults.length > 0) {
      extractedText = data.ParsedResults[0].ParsedText
    }

    return NextResponse.json({ text: extractedText })
  } catch (error) {
    console.error('OCR.space error:', error)
    return NextResponse.json(
      { error: 'Failed to process with OCR.space: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
} 