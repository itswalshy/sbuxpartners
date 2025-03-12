import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';

const execPromise = promisify(exec);

// Function to save base64 image to a temporary file
async function saveBase64ToFile(base64Data: string, contentType: string): Promise<string> {
  const tempDir = os.tmpdir();
  const extension = contentType.includes('pdf') ? 'pdf' : 'jpg';
  const filePath = path.join(tempDir, `ocr-input-${Date.now()}.${extension}`);
  
  // Remove data URL prefix if present
  const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '');
  
  // Write the file
  await fs.promises.writeFile(filePath, Buffer.from(base64Image, 'base64'));
  return filePath;
}

export async function POST(request: Request) {
  try {
    const { image, contentType = 'image/jpeg' } = await request.json();
    
    if (!image) {
      return NextResponse.json(
        { error: 'No image data provided' },
        { status: 400 }
      );
    }

    // Save the image to a temporary file
    const inputFilePath = await saveBase64ToFile(image, contentType);
    const outputFilePath = inputFilePath.replace(/\.\w+$/, '-ocr.pdf');

    try {
      // Execute OCRmyPDF command
      // Note: This requires OCRmyPDF to be installed on the server
      await execPromise(`ocrmypdf --force-ocr ${inputFilePath} ${outputFilePath}`);
      
      // Extract text from the OCR'd PDF using pdftotext (part of poppler-utils)
      const textOutputPath = outputFilePath.replace(/\.pdf$/, '.txt');
      await execPromise(`pdftotext ${outputFilePath} ${textOutputPath}`);
      
      // Read the extracted text
      const extractedText = await fs.promises.readFile(textOutputPath, 'utf8');
      
      // Clean up temporary files
      await Promise.all([
        fs.promises.unlink(inputFilePath),
        fs.promises.unlink(outputFilePath),
        fs.promises.unlink(textOutputPath)
      ]);
      
      return NextResponse.json({ text: extractedText });
    } catch (execError: any) {
      console.error('OCRmyPDF execution error:', execError);
      
      // Clean up the input file if it exists
      if (fs.existsSync(inputFilePath)) {
        await fs.promises.unlink(inputFilePath);
      }
      
      return NextResponse.json(
        { error: `OCRmyPDF execution failed: ${execError.message || String(execError)}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('OCRmyPDF error:', error);
    return NextResponse.json(
      { error: 'Failed to process with OCRmyPDF: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
} 