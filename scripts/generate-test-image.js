const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

async function generateTestImage() {
  try {
    const svgPath = path.join(process.cwd(), 'public', 'test-images', 'tip-report.svg')
    const pngPath = path.join(process.cwd(), 'public', 'test-images', 'tip-report.png')
    
    // Create test-images directory if it doesn't exist
    const testImagesDir = path.join(process.cwd(), 'public', 'test-images')
    if (!fs.existsSync(testImagesDir)) {
      fs.mkdirSync(testImagesDir, { recursive: true })
    }

    // Read SVG file
    const svgBuffer = fs.readFileSync(svgPath)

    // Convert SVG to PNG using sharp
    await sharp(svgBuffer)
      .resize(800, 600)
      .png()
      .toFile(pngPath)

    console.log('Test image generated successfully!')
  } catch (error) {
    console.error('Error generating test image:', error)
    process.exit(1)
  }
}

generateTestImage() 