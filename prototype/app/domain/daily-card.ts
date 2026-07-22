import type {Orientation, RenderableCard} from "./tarot";
import {readLocalJson, writeLocalJson} from "../platform/storage.ts";

export const DAILY_QUESTION = "今天，我最需要看见什么？";
export const DAILY_STORAGE_KEY = "arcana-daily-card";
export const DAILY_CATEGORY_ID = "mood";
export const DAILY_OPTION_ID = "daily";

export type DailyCardRecord = {
  dateKey: string;
  cardId: string;
  orientation: Orientation;
  revealedAt: string;
};

/** 本地日历日键，保证同一自然日结果稳定。 */
export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** 由字符串种子生成可复现的伪随机序列。 */
export function createSeededRandom(seed: string): () => number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  let state = hash >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let next = Math.imul(state ^ (state >>> 15), 1 | state);
    next ^= next + Math.imul(next ^ (next >>> 7), 61 | next);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

/** 按日期从牌组中固定抽取一张牌及其正逆位。 */
export function pickDailyCard(
  deck: readonly RenderableCard[],
  dateKey: string = getLocalDateKey(),
): {card: RenderableCard; orientation: Orientation} {
  if (deck.length === 0) {
    throw new Error("Daily card requires a non-empty deck");
  }

  const random = createSeededRandom(`arcana-daily:${dateKey}`);
  const card = deck[Math.floor(random() * deck.length)];
  const orientation: Orientation = random() >= 0.5 ? "upright" : "reversed";
  return {card, orientation};
}

export function readDailyCardRecord(): DailyCardRecord | null {
  const record = readLocalJson<DailyCardRecord>(DAILY_STORAGE_KEY);
  if (
    !record?.dateKey ||
    !record.cardId ||
    (record.orientation !== "upright" && record.orientation !== "reversed")
  ) {
    return null;
  }
  return record;
}

export function writeDailyCardRecord(record: DailyCardRecord): boolean {
  return writeLocalJson(DAILY_STORAGE_KEY, record);
}
