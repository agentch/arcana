import type {DrawnRenderableCard} from "../../domain/draw";
import {
  composeInterpretation,
  type InterpretationView,
} from "../../domain/interpretation";
import type {MeaningTopicId} from "../../domain/tarot";
import {getLayeredMeaning} from "../../domain/catalog";
import {CardVisual} from "./ReadingVisuals";
import {InterpretationDetails} from "./InterpretationDetails";

export function ReadingDetailPage({
  spreadName,
  drawnCards,
  topicId,
  onBack,
}: {
  spreadName: string;
  drawnCards: DrawnRenderableCard[];
  topicId?: MeaningTopicId;
  onBack: () => void;
}) {
  const interpretations: InterpretationView[] = drawnCards.map((drawn) =>
    composeInterpretation({
      card: drawn.card,
      layeredMeaning: getLayeredMeaning(drawn.card.id),
      orientation: drawn.orientation,
      topicId,
      position: drawn.position,
    }),
  );

  return (
    <section className="reading-detail-page" aria-label={`${spreadName}详细解读`}>
      <button className="text-button reading-detail-back" onClick={onBack}>
        ← 返回消息流
      </button>
      <p className="message-card-label">牌语详解 · {spreadName}</p>
      <h2 className="message-card-title">逐张聆听阵中回响</h2>
      <div className="reading-list reading-detail-list">
        {drawnCards.map((drawn, index) => {
          const interpretation = interpretations[index];
          return (
            <article className="reading-panel" key={drawn.position.id}>
              <p className="reading-position">{interpretation.positionName}</p>
              <h2>
                {interpretation.cardName} · {interpretation.orientationName}
              </h2>
              <div className="reading-detail-card">
                <CardVisual drawn={drawn} compact />
              </div>
              <div className="keywords">
                {interpretation.keywords.map((keyword) => (
                  <span className="keyword" key={keyword}>
                    {keyword}
                  </span>
                ))}
              </div>
              <p className="reading-summary">{interpretation.summary}</p>
              <InterpretationDetails interpretation={interpretation} />
            </article>
          );
        })}
      </div>
      <button className="secondary-button reading-detail-back-bottom" onClick={onBack}>
        返回消息流
      </button>
    </section>
  );
}
