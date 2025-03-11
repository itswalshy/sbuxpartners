import { NextResponse } from 'next/server'

// Mistral OCR API configuration
const MISTRAL_API_KEY = "0MU1D27KwHggOhBSnBKLewlLhxEjeeOq"
const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions"

export async function POST(request: Request) {
  try {
    const { image, contentType = 'image/jpeg' } = await request.json()
    
    if (!image) {
      return NextResponse.json(
        { error: 'No image data provided' },
        { status: 400 }
      )
    }

    // Prepare the request to Mistral API
    const response = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: "mistral-large-latest",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract all text from this image, preserving the structure and layout as much as possible. If there are tables, format them properly. Focus on accurate text extraction."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${contentType};base64,${image}`
                }
              }
            ]
          }
        ],
        max_tokens: 4000
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Mistral API error:', errorData)
      return NextResponse.json(
        { error: `Mistral API error: ${errorData.error?.message || JSON.stringify(errorData)}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    // Extract the text from the Mistral response
    const extractedText = data.choices[0]?.message?.content || ""

    return NextResponse.json({ text: extractedText })
  } catch (error) {
    console.error('Mistral OCR error:', error)
    return NextResponse.json(
      { error: 'Failed to process with Mistral OCR: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
} 