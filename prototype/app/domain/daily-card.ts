import type {DailyCardRecord} from "../../../packages/tarot-core/src/domain/daily-card.ts";
import {DAILY_STORAGE_KEY} from "../../../packages/tarot-core/src/domain/daily-card.ts";
import {readLocalJson, writeLocalJson} from "../platform/storage.ts";

// 今日一牌的确定性抽取规则由共享包提供，持久化仍走原型平台适配层。
export * from "../../../packages/tarot-core/src/domain/daily-card.ts";

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
