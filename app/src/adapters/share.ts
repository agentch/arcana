import Taro from '@tarojs/taro'

import {
  composeShareText,
  planShareCardSlots,
  type ShareCardContent,
} from '@arcana/tarot-core/domain/share-card'

export type ShareResult =
  | { status: 'shared' }
  | { status: 'copied' }
  | { status: 'cancelled' }
  | { status: 'failed'; reason: string }

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = []
  let current = ''

  for (const character of Array.from(text)) {
    const next = `${current}${character}`
    if (current && context.measureText(next).width > maxWidth) {
      lines.push(current)
      current = character
    } else {
      current = next
    }
  }
  if (current) lines.push(current)
  return lines
}

/** 将共享内容绘制成适合浏览器系统分享的夜间金饰风 PNG。 */
export async function renderShareCardBlob(
  content: ShareCardContent,
): Promise<Blob> {
  if (typeof document === 'undefined') {
    throw new Error('canvas-unavailable')
  }

  const width = 1080
  const height = 1350
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('canvas-unavailable')

  const gradient = context.createLinearGradient(0, 0, 0, height)
  gradient.addColorStop(0, '#17132c')
  gradient.addColorStop(1, '#0b0a18')
  context.fillStyle = gradient
  context.fillRect(0, 0, width, height)

  context.fillStyle = 'rgba(255, 246, 218, 0.35)'
  for (let index = 0; index < 48; index += 1) {
    const x = ((index * 137) % width) + 20
    const y = ((index * 89) % (height - 80)) + 40
    context.beginPath()
    context.arc(x, y, index % 5 === 0 ? 2.2 : 1.2, 0, Math.PI * 2)
    context.fill()
  }

  context.strokeStyle = 'rgba(214, 185, 120, 0.35)'
  context.lineWidth = 2
  context.strokeRect(48, 48, width - 96, height - 96)

  context.fillStyle = '#d6b978'
  context.font = "600 42px Georgia, 'Times New Roman', serif"
  context.fillText(content.brand, 96, 140)

  context.fillStyle = '#f4eedf'
  context.font = "600 64px Georgia, 'Times New Roman', serif"
  const visibleCards = content.cards.slice(0, 10)
  const compactCards = visibleCards.length >= 4
  let cursorY = 230
  for (const line of wrapText(context, content.title, width - 192).slice(
    0,
    compactCards ? 1 : 2,
  )) {
    context.fillText(line, 96, cursorY)
    cursorY += 78
  }

  if (content.question) {
    cursorY += 20
    context.fillStyle = 'rgba(244, 238, 223, 0.72)'
    context.font = "400 34px Georgia, 'Times New Roman', serif"
    for (const line of wrapText(context, content.question, width - 192).slice(
      0,
      compactCards ? 2 : 3,
    )) {
      context.fillText(line, 96, cursorY)
      cursorY += 48
    }
  }

  cursorY += 36
  context.strokeStyle = 'rgba(214, 185, 120, 0.45)'
  context.beginPath()
  context.moveTo(96, cursorY)
  context.lineTo(width - 96, cursorY)
  context.stroke()
  cursorY += 70

  const cardStartY = cursorY
  const slots = planShareCardSlots(visibleCards.length)
  for (const [index, card] of visibleCards.entries()) {
    const slot = slots[index]
    const cardX = 96 + slot.x
    let cardY = cardStartY + slot.y
    context.fillStyle = '#d6b978'
    context.font = compactCards
      ? "500 22px Georgia, 'Times New Roman', serif"
      : "500 28px Georgia, 'Times New Roman', serif"
    context.fillText(card.positionName, cardX, cardY, slot.width)
    cardY += compactCards ? 34 : 46

    context.fillStyle = '#f4eedf'
    context.font = compactCards
      ? "600 32px Georgia, 'Times New Roman', serif"
      : "600 44px Georgia, 'Times New Roman', serif"
    context.fillText(
      `${card.cardName} · ${card.orientationName}`,
      cardX,
      cardY,
      slot.width,
    )
    cardY += compactCards ? 38 : 48

    context.fillStyle = 'rgba(244, 238, 223, 0.62)'
    context.font = compactCards
      ? "400 21px Georgia, 'Times New Roman', serif"
      : "400 28px Georgia, 'Times New Roman', serif"
    context.fillText(card.keywords.join(' · '), cardX, cardY, slot.width)
  }

  cursorY =
    cardStartY +
    slots.reduce((bottom, slot) => Math.max(bottom, slot.y + slot.height), 0)
  if (content.highlight) {
    cursorY += 12
    context.fillStyle = 'rgba(244, 238, 223, 0.88)'
    context.font = "400 32px Georgia, 'Times New Roman', serif"
    for (const line of wrapText(context, content.highlight, width - 192).slice(
      0,
      compactCards ? 2 : 4,
    )) {
      context.fillText(line, 96, cursorY)
      cursorY += 46
    }
  }

  context.fillStyle = 'rgba(214, 185, 120, 0.78)'
  context.font = "400 28px Georgia, 'Times New Roman', serif"
  context.fillText(content.disclaimer, 96, height - 96)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('share-card-encode-failed'))
    }, 'image/png')
  })
}

async function copyShareText(text: string): Promise<boolean> {
  try {
    await Taro.setClipboardData({ data: text })
    return true
  } catch {
    return false
  }
}

/** Web 优先分享图片；小程序由原生分享按钮触发，本方法负责复制降级。 */
export async function shareCard(
  content: ShareCardContent,
): Promise<ShareResult> {
  const text = composeShareText(content)
  if (process.env.TARO_ENV !== 'h5' || typeof navigator === 'undefined') {
    return (await copyShareText(text))
      ? { status: 'copied' }
      : { status: 'failed', reason: 'clipboard-unavailable' }
  }

  try {
    const blob = await renderShareCardBlob(content)
    const file = new File([blob], 'arcana-share.png', { type: 'image/png' })
    const payload: ShareData = {
      title: `${content.brand} · ${content.title}`,
      text,
      files: [file],
    }

    if (navigator.share && navigator.canShare?.(payload)) {
      await navigator.share(payload)
      return { status: 'shared' }
    }
    if (navigator.share) {
      await navigator.share({
        title: `${content.brand} · ${content.title}`,
        text,
      })
      return { status: 'shared' }
    }
  } catch (error) {
    if (
      typeof DOMException !== 'undefined' &&
      error instanceof DOMException &&
      error.name === 'AbortError'
    ) {
      return { status: 'cancelled' }
    }
  }

  return (await copyShareText(text))
    ? { status: 'copied' }
    : { status: 'failed', reason: 'share-unavailable' }
}
