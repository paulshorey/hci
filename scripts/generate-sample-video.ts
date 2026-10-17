import { chromium } from '@playwright/test'
import { writeFile } from 'node:fs/promises'

const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  // tsx preserves function names using this helper inside serialized browser callbacks.
  await page.evaluate('globalThis.__name = fn => fn')
  const bytes = await page.evaluate(async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 640
    canvas.height = 360
    const context = canvas.getContext('2d')!
    const chunks: BlobPart[] = []
    const recorder = new MediaRecorder(canvas.captureStream(12), {
      mimeType: 'video/webm;codecs=vp8',
      videoBitsPerSecond: 180000,
    })
    recorder.ondataavailable = (event) => chunks.push(event.data)
    const stopped = new Promise<number[]>((resolve) => {
      recorder.onstop = async () =>
        resolve(Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer())))
    })
    recorder.start()
    const start = performance.now()
    await new Promise<void>((resolve) => {
      function draw() {
        const elapsed = performance.now() - start
        const focus = Math.min(3, Math.floor(elapsed / 650))
        context.fillStyle = '#e3eade'
        context.fillRect(0, 0, 640, 360)
        context.fillStyle = '#263d32'
        context.font = '24px Georgia'
        context.fillText('A visible path through the interface.', 45, 65)
        context.font = '11px Arial'
        context.fillText('ILLUSTRATIVE SAMPLE ANIMATION', 45, 92)
        for (let index = 0; index < 4; index++) {
          const x = 60 + index * 140
          context.fillStyle = '#346d5d'
          context.fillRect(x, 155, 100, 68)
          if (index === focus) {
            context.strokeStyle = '#bd7e47'
            context.lineWidth = 4
            context.strokeRect(x - 7, 148, 114, 82)
          }
          context.fillStyle = 'white'
          context.font = '22px Arial'
          context.fillText(String(index + 1), x + 43, 198)
        }
        if (elapsed < 2700) requestAnimationFrame(draw)
        else resolve()
      }
      draw()
    })
    recorder.stop()
    return stopped
  })
  await writeFile('samples/focus-demo.webm', Buffer.from(bytes))
  console.log('Generated samples/focus-demo.webm')
} finally {
  await browser.close()
}
