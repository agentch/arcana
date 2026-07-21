import type {InterpretationView} from "../../domain/interpretation";

export function InterpretationDetails({
  interpretation,
}: {
  interpretation: InterpretationView;
}) {
  return (
    <div className="reading-details-content">
      <div className="reading-section">
        <h3>详细解读</h3>
        <p className="reading-text">{interpretation.overview}</p>
        {interpretation.topicText && (
          <p className="reading-text topic-text">
            {interpretation.topicText}
          </p>
        )}
        <p className="position-context">{interpretation.positionText}</p>
      </div>
      {interpretation.symbols.length > 0 && (
        <div className="reading-section">
          <h3>牌面象征</h3>
          <dl className="symbol-list">
            {interpretation.symbols.map((symbol) => (
              <div key={symbol.name}>
                <dt>{symbol.name}</dt>
                <dd>{symbol.meaning}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      {interpretation.light && interpretation.shadow && (
        <div className="meaning-polarity">
          <div>
            <h3>可以运用</h3>
            <p>{interpretation.light}</p>
          </div>
          <div>
            <h3>需要留意</h3>
            <p>{interpretation.shadow}</p>
          </div>
        </div>
      )}
      <div className="advice">
        <strong>可以尝试：</strong>
        <ul>
          {interpretation.advice.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      {interpretation.reflection && (
        <blockquote className="reflection-question">
          {interpretation.reflection}
        </blockquote>
      )}
    </div>
  );
}
