const https = require('https')
const fs = require('fs')
const path = require('path')

const MODELS_DIR = path.join(process.cwd(), 'public', 'models')

// Create models directory if it doesn't exist
if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true })
}

const MODELS = {
  'ch_PP-OCRv3_det_infer': 'https://paddlejs.bj.bcebos.com/models/ch_PP-OCRv3_det_infer.onnx',
  'ch_PP-OCRv3_rec_infer': 'https://paddlejs.bj.bcebos.com/models/ch_PP-OCRv3_rec_infer.onnx'
}

async function downloadFile(url, filename) {
  const filepath = path.join(MODELS_DIR, filename + '.onnx')
  
  if (fs.existsSync(filepath)) {
    console.log(`${filename} already exists, skipping...`)
    return
  }

  console.log(`Downloading ${filename}...`)
  
  return new Promise((resolve, reject) => {
    https.get(url, response => {
      const fileStream = fs.createWriteStream(filepath)
      response.pipe(fileStream)
      
      fileStream.on('finish', () => {
        fileStream.close()
        console.log(`Downloaded ${filename}`)
        resolve()
      })
      
      fileStream.on('error', err => {
        fs.unlink(filepath)
        reject(err)
      })
    }).on('error', err => {
      fs.unlink(filepath)
      reject(err)
    })
  })
}

async function downloadModels() {
  try {
    for (const [name, url] of Object.entries(MODELS)) {
      await downloadFile(url, name)
    }
    console.log('All models downloaded successfully!')
  } catch (error) {
    console.error('Error downloading models:', error)
    process.exit(1)
  }
}

downloadModels() 