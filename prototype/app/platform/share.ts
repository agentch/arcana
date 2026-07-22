import type {ShareCardContent} from "../domain/share-card";
import {composeShareText, planShareCardSlots} from "../domain/share-card";

export type ShareResult =
  | {status: "shared"}
  | {status: "copied"}
  | {status: "cancelled"}
  | {status: "failed"; reason: string};

type ShareAdapter = {
  shareCard: (content: ShareCardContent) => Promise<ShareResult>;
};

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const characters = Array.from(text);
  const lines: string[] = [];
  let current = "";

  for (const character of characters) {
    const next = `${current}${character}`;
    if (context.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = character;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** 将分享内容绘制为夜间金饰风格的图片卡片。 */
export async function renderShareCardBlob(
  content: ShareCardContent,
): Promise<Blob> {
  const width = 1080;
  const height = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas unavailable");
  }

  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#17132c");
  gradient.addColorStop(1, "#0b0a18");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  // 星点氛围
  context.fillStyle = "rgba(255, 246, 218, 0.35)";
  for (let index = 0; index < 48; index += 1) {
    const x = ((index * 137) % width) + 20;
    const y = ((index * 89) % (height - 80)) + 40;
    const radius = index % 5 === 0 ? 2.2 : 1.2;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  context.strokeStyle = "rgba(214, 185, 120, 0.35)";
  context.lineWidth = 2;
  context.strokeRect(48, 48, width - 96, height - 96);

  context.fillStyle = "#d6b978";
  context.font = "600 42px Georgia, 'Times New Roman', serif";
  context.fillText(content.brand, 96, 140);

  context.fillStyle = "#f4eedf";
  context.font = "600 64px Georgia, 'Times New Roman', serif";
  const titleLines = wrapText(context, content.title, width - 192);
  const visibleCards = content.cards.slice(0, 5);
  const compactCards = visibleCards.length >= 4;
  let cursorY = 230;
  for (const line of titleLines.slice(0, compactCards ? 1 : 2)) {
    context.fillText(line, 96, cursorY);
    cursorY += 78;
  }

  if (content.question) {
    cursorY += 20;
    context.fillStyle = "rgba(244, 238, 223, 0.72)";
    context.font = "400 34px Georgia, 'Times New Roman', serif";
    for (const line of wrapText(
      context,
      content.question,
      width - 192,
    ).slice(0, compactCards ? 2 : 3)) {
      context.fillText(line, 96, cursorY);
      cursorY += 48;
    }
  }

  cursorY += 36;
  context.strokeStyle = "rgba(214, 185, 120, 0.45)";
  context.beginPath();
  context.moveTo(96, cursorY);
  context.lineTo(width - 96, cursorY);
  context.stroke();
  cursorY += 70;

  const cardStartY = cursorY;
  const slots = planShareCardSlots(visibleCards.length);
  for (const [index, card] of visibleCards.entries()) {
    const slot = slots[index];
    const cardX = 96 + slot.x;
    let cardY = cardStartY + slot.y;
    context.fillStyle = "#d6b978";
    context.font = compactCards
      ? "500 22px Georgia, 'Times New Roman', serif"
      : "500 28px Georgia, 'Times New Roman', serif";
    context.fillText(card.positionName, cardX, cardY, slot.width);
    cardY += compactCards ? 34 : 46;

    context.fillStyle = "#f4eedf";
    context.font = compactCards
      ? "600 32px Georgia, 'Times New Roman', serif"
      : "600 44px Georgia, 'Times New Roman', serif";
    context.fillText(
      `${card.cardName} · ${card.orientationName}`,
      cardX,
      cardY,
      slot.width,
    );
    cardY += compactCards ? 38 : 48;

    if (card.keywords.length > 0) {
      context.fillStyle = "rgba(244, 238, 223, 0.62)";
      context.font = compactCards
        ? "400 21px Georgia, 'Times New Roman', serif"
        : "400 28px Georgia, 'Times New Roman', serif";
      context.fillText(
        card.keywords.join(" · "),
        cardX,
        cardY,
        slot.width,
      );
    }
  }
  cursorY =
    cardStartY +
    slots.reduce((bottom, slot) => Math.max(bottom, slot.y + slot.height), 0);

  if (content.highlight) {
    cursorY += 12;
    context.fillStyle = "rgba(244, 238, 223, 0.88)";
    context.font = "400 32px Georgia, 'Times New Roman', serif";
    for (const line of wrapText(
      context,
      content.highlight,
      width - 192,
    ).slice(0, compactCards ? 2 : 4)) {
      context.fillText(line, 96, cursorY);
      cursorY += 46;
    }
  }

  context.fillStyle = "rgba(214, 185, 120, 0.78)";
  context.font = "400 28px Georgia, 'Times New Roman', serif";
  context.fillText(content.disclaimer, 96, height - 96);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => {
      if (value) resolve(value);
      else reject(new Error("Failed to encode share card"));
    }, "image/png");
  });
  return blob;
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // 继续尝试 execCommand 降级
  }

  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

const browserShare: ShareAdapter = {
  async shareCard(content) {
    const text = composeShareText(content);

    try {
      const blob = await renderShareCardBlob(content);
      const file = new File([blob], "arcana-share.png", {type: "image/png"});
      const payload: ShareData = {
        title: `${content.brand} · ${content.title}`,
        text,
        files: [file],
      };

      if (navigator.share && navigator.canShare?.(payload)) {
        await navigator.share(payload);
        return {status: "shared"};
      }

      if (navigator.share) {
        await navigator.share({
          title: `${content.brand} · ${content.title}`,
          text,
        });
        return {status: "shared"};
      }

      const copied = await copyText(text);
      return copied
        ? {status: "copied"}
        : {status: "failed", reason: "clipboard-unavailable"};
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return {status: "cancelled"};
      }

      try {
        const copied = await copyText(text);
        if (copied) return {status: "copied"};
      } catch {
        // 分享失败不得阻断主流程
      }

      return {
        status: "failed",
        reason: error instanceof Error ? error.message : "share-failed",
      };
    }
  },
};

let activeAdapter = browserShare;

export function setShareAdapter(adapter: ShareAdapter) {
  activeAdapter = adapter;
}

export function shareCard(content: ShareCardContent): Promise<ShareResult> {
  return activeAdapter.shareCard(content);
}
