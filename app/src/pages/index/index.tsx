import { Button, Image, Text, Textarea, View } from '@tarojs/components'
import { useEffect, useMemo, useState } from 'react'

import { triggerHaptic } from '@/adapters/haptics'
import { getAssetPlatform, resolveCardAssets } from '@/adapters/card-assets'
import {
  readDailyCardRecord,
  writeDailyCardRecord,
} from '@/features/daily/daily-card-record'
import {
  prependReading,
  readReadingHistory,
  removeReading,
  type SavedReading,
  writeReadingHistory,
} from '@/features/history/reading-history'
import {
  activeDeck,
  catalogVersions,
  getCards,
  getActiveCardBack,
  getLayeredMeaning,
  getMeaningTopic,
  getQuestionCategories,
  getSpread,
} from '@arcana/tarot-core/domain/catalog'
import {
  DAILY_CATEGORY_ID,
  DAILY_QUESTION,
  getLocalDateKey,
  pickDailyCard,
} from '@arcana/tarot-core/domain/daily-card'
import {
  drawForSpread,
  type DrawnRenderableCard,
} from '@arcana/tarot-core/domain/draw'
import {
  composeInterpretation,
  composeSpreadSummary,
  type InterpretationView,
  type SpreadSummaryView,
} from '@arcana/tarot-core/domain/interpretation'
import { useReadingStore } from '@/stores/reading'

import './index.scss'

type ReadingPhase =
  'question' | 'shuffle' | 'choose' | 'reveal' | 'result' | 'history'

const CARD_CHOICES = Array.from({ length: 7 }, (_, index) => index)

export default function Index() {
  const questionCategoryId = useReadingStore(
    (state) => state.questionCategoryId,
  )
  const question = useReadingStore((state) => state.question)
  const spreadId = useReadingStore((state) => state.spreadId)
  const updateDraft = useReadingStore((state) => state.updateDraft)
  const resetDraft = useReadingStore((state) => state.reset)
  const [phase, setPhase] = useState<ReadingPhase>('question')
  const [dailyMode, setDailyMode] = useState(false)
  const [preparedDraws, setPreparedDraws] = useState<DrawnRenderableCard[]>([])
  const [drawnCards, setDrawnCards] = useState<DrawnRenderableCard[]>([])
  const [interpretations, setInterpretations] = useState<InterpretationView[]>(
    [],
  )
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [history, setHistory] = useState<SavedReading[]>(readReadingHistory)
  const [savedReadingId, setSavedReadingId] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState('')

  const categories = useMemo(() => getQuestionCategories(), [])
  const cards = useMemo(
    () => resolveCardAssets(getCards(), getAssetPlatform()),
    [],
  )
  const cardBack = useMemo(() => getActiveCardBack(), [])
  const activeSpread = getSpread(dailyMode ? 'single-card' : spreadId)
  const currentDrawnCard = drawnCards[drawnCards.length - 1] ?? null
  const spreadSummary: SpreadSummaryView | null =
    interpretations.length > 1
      ? composeSpreadSummary({
          spreadId: activeSpread.id,
          spreadName: activeSpread.name,
          spreadDescription: activeSpread.description,
          interpretations,
        })
      : null
  const activeCategory = categories.find(
    (category) => category.id === questionCategoryId,
  )

  useEffect(() => {
    if (phase !== 'shuffle') return undefined
    const timer = setTimeout(() => {
      setPhase('choose')
      void triggerHaptic()
    }, 1100)
    return () => clearTimeout(timer)
  }, [phase])

  useEffect(() => {
    if (phase !== 'reveal') return undefined
    const timer = setTimeout(() => {
      setPhase(
        drawnCards.length < activeSpread.positions.length ? 'choose' : 'result',
      )
    }, 900)
    return () => clearTimeout(timer)
  }, [activeSpread.positions.length, drawnCards.length, phase])

  const selectCategory = async (categoryId: string) => {
    await triggerHaptic()
    updateDraft({ questionCategoryId: categoryId, question: '' })
    setPreparedDraws([])
    setDrawnCards([])
    setInterpretations([])
    setDetailsOpen(false)
    setSavedReadingId(null)
    setSaveStatus('')
  }

  const selectQuestion = async (prompt: string) => {
    await triggerHaptic()
    updateDraft({ question: prompt })
  }

  const selectSpread = async (nextSpreadId: 'single-card' | 'timeline') => {
    await triggerHaptic()
    updateDraft({ spreadId: nextSpreadId })
    setPreparedDraws([])
    setDrawnCards([])
    setInterpretations([])
    setDetailsOpen(false)
    setSavedReadingId(null)
    setSaveStatus('')
  }

  const startDailyReading = async () => {
    const dateKey = getLocalDateKey()
    const existing = readDailyCardRecord()
    const spread = getSpread('single-card')
    const position = spread.positions[0]

    setDailyMode(true)
    setDetailsOpen(false)
    setSavedReadingId(null)
    setSaveStatus('')
    updateDraft({
      question: DAILY_QUESTION,
      questionCategoryId: DAILY_CATEGORY_ID,
      spreadId: 'single-card',
    })

    if (existing?.dateKey === dateKey) {
      const card = cards.find((item) => item.id === existing.cardId)
      if (card) {
        const nextDrawn: DrawnRenderableCard = {
          card,
          orientation: existing.orientation,
          position,
        }
        setPreparedDraws([nextDrawn])
        setDrawnCards([nextDrawn])
        setInterpretations([
          composeInterpretation({
            card,
            layeredMeaning: getLayeredMeaning(card.id),
            orientation: existing.orientation,
            topicId: getMeaningTopic(DAILY_CATEGORY_ID),
            position,
          }),
        ])
        setPhase('result')
        await triggerHaptic()
        return
      }
    }

    const picked = pickDailyCard(cards, dateKey)
    setPreparedDraws([{ ...picked, position }])
    setDrawnCards([])
    setInterpretations([])
    setPhase('shuffle')
    await triggerHaptic()
  }

  const beginRitual = async () => {
    if (!question.trim() || !questionCategoryId) return

    await triggerHaptic()
    setDailyMode(false)
    const spread = getSpread(spreadId)
    setPreparedDraws(drawForSpread(cards, spread))
    setDrawnCards([])
    setInterpretations([])
    setDetailsOpen(false)
    setSavedReadingId(null)
    setSaveStatus('')
    setPhase('shuffle')
  }

  const revealNextCard = async () => {
    if (!question.trim() || !questionCategoryId || phase !== 'choose') return

    await triggerHaptic()
    const drawn = preparedDraws[drawnCards.length]
    if (!drawn) return
    const nextInterpretation = composeInterpretation({
      card: drawn.card,
      layeredMeaning: getLayeredMeaning(drawn.card.id),
      orientation: drawn.orientation,
      topicId: getMeaningTopic(questionCategoryId),
      position: drawn.position,
    })
    setDrawnCards((current) => [...current, drawn])
    setInterpretations((current) => [...current, nextInterpretation])
    if (dailyMode) {
      writeDailyCardRecord({
        dateKey: getLocalDateKey(),
        cardId: drawn.card.id,
        orientation: drawn.orientation,
        revealedAt: new Date().toISOString(),
      })
    }
    setPhase('reveal')
    await triggerHaptic()
  }

  const startAgain = () => {
    resetDraft()
    setDailyMode(false)
    setPreparedDraws([])
    setDrawnCards([])
    setInterpretations([])
    setDetailsOpen(false)
    setSavedReadingId(null)
    setSaveStatus('')
    setPhase('question')
  }

  const saveReading = () => {
    if (
      drawnCards.length === 0 ||
      interpretations.length !== drawnCards.length ||
      !questionCategoryId ||
      savedReadingId
    ) {
      return
    }

    const createdAt = new Date().toISOString()
    const reading: SavedReading = {
      id: `${Date.now()}-${activeSpread.id}`,
      question: question.trim(),
      questionCategoryId,
      cards: drawnCards.map((drawn, index) => ({
        cardId: drawn.card.id,
        cardName: interpretations[index].cardName,
        orientation: drawn.orientation,
        positionId: drawn.position.id,
      })),
      createdAt,
      contentVersion: catalogVersions.content,
      deckId: activeDeck.id,
      deckVersion: activeDeck.version,
      spreadId: activeSpread.id,
      spreadVersion: catalogVersions.spreads,
    }
    const nextHistory = prependReading(history, reading)
    if (!writeReadingHistory(nextHistory)) {
      setSaveStatus('保存失败，请检查设备存储权限')
      return
    }

    setHistory(nextHistory)
    setSavedReadingId(reading.id)
    setSaveStatus('已保存到占卜记录')
    void triggerHaptic()
  }

  const openSavedReading = (reading: SavedReading) => {
    const spread = getSpread(reading.spreadId)
    const nextDrawnCards: DrawnRenderableCard[] = []
    const nextInterpretations: InterpretationView[] = []
    for (const savedCard of reading.cards) {
      const card = cards.find((item) => item.id === savedCard.cardId)
      const position = spread.positions.find(
        (item) => item.id === savedCard.positionId,
      )
      if (!card || !position) return
      nextDrawnCards.push({
        card,
        orientation: savedCard.orientation,
        position,
      })
      nextInterpretations.push(
        composeInterpretation({
          card,
          layeredMeaning: getLayeredMeaning(card.id),
          orientation: savedCard.orientation,
          topicId: getMeaningTopic(reading.questionCategoryId),
          position,
        }),
      )
    }

    setDailyMode(false)
    updateDraft({
      question: reading.question,
      questionCategoryId: reading.questionCategoryId,
      spreadId: reading.spreadId,
    })
    setPreparedDraws(nextDrawnCards)
    setDrawnCards(nextDrawnCards)
    setInterpretations(nextInterpretations)
    setDetailsOpen(false)
    setSavedReadingId(reading.id)
    setSaveStatus('正在查看已保存的占卜')
    setPhase('result')
  }

  const deleteSavedReading = (readingId: string) => {
    const nextHistory = removeReading(history, readingId)
    if (!writeReadingHistory(nextHistory)) return
    setHistory(nextHistory)
    if (savedReadingId === readingId) setSavedReadingId(null)
    void triggerHaptic()
  }

  const pageTitle =
    phase === 'history'
      ? '占卜记录'
      : phase === 'shuffle'
        ? '让牌序慢慢沉静'
        : phase === 'choose'
          ? `选择第 ${drawnCards.length + 1} 张牌`
          : phase === 'reveal'
            ? '牌面正在显现'
            : phase === 'result'
              ? dailyMode
                ? '今日的牌已经回应'
                : `${activeSpread.name}已经回应`
              : '带一个问题来到牌前'

  const pageSummary =
    phase === 'history'
      ? '回看曾经保存的问题，也可以删除不再需要的记录。'
      : phase === 'question'
        ? '先选择问题方向，再进入洗牌与选牌。'
        : phase === 'result'
          ? '这是一种观察当下的角度，而不是写定的预言。'
          : '放慢一点，不必寻找唯一正确的牌。'

  return (
    <View className='reading-page'>
      <View className='reading-page__glow' />
      <Text className='reading-page__eyebrow'>
        ARCANA · {dailyMode ? '今日一牌' : activeSpread.name}
      </Text>
      <Text className='reading-page__title'>{pageTitle}</Text>
      <Text className='reading-page__summary'>{pageSummary}</Text>

      {phase === 'question' ? (
        <>
          <Button className='daily-entry' onClick={startDailyReading}>
            <Text className='daily-entry__symbol'>☼</Text>
            <View className='daily-entry__content'>
              <Text className='daily-entry__title'>今日一牌</Text>
              <Text className='daily-entry__description'>
                同一天保持同一张牌，随时回来查看
              </Text>
            </View>
          </Button>
          <Text className='mode-divider'>或者，带着一个问题开始</Text>
          <View className='reading-section'>
            <Text className='reading-section__label'>问题方向</Text>
            <View className='choice-grid'>
              {categories.map((category) => (
                <Button
                  className={`choice-button ${
                    category.id === questionCategoryId
                      ? 'choice-button--active'
                      : ''
                  }`}
                  key={category.id}
                  onClick={() => selectCategory(category.id)}
                >
                  <Text className='choice-button__title'>{category.name}</Text>
                  <Text className='choice-button__description'>
                    {category.description}
                  </Text>
                </Button>
              ))}
            </View>
          </View>

          {activeCategory ? (
            <View className='reading-section'>
              <Text className='reading-section__label'>选择或修改问题</Text>
              <View className='prompt-list'>
                {activeCategory.options.map((option) => (
                  <Button
                    className='prompt-button'
                    key={option.id}
                    onClick={() => selectQuestion(option.prompt)}
                  >
                    {option.name}
                  </Button>
                ))}
              </View>
              <Textarea
                className='question-input'
                maxlength={120}
                placeholder='写下你想问的问题…'
                value={question}
                onInput={(event) =>
                  updateDraft({ question: event.detail.value })
                }
              />
            </View>
          ) : null}

          {activeCategory ? (
            <View className='reading-section'>
              <Text className='reading-section__label'>选择牌阵</Text>
              <View className='spread-choice-grid'>
                {(['single-card', 'timeline'] as const).map(
                  (availableSpreadId) => {
                    const spread = getSpread(availableSpreadId)
                    return (
                      <Button
                        className={`spread-choice ${
                          spreadId === spread.id ? 'spread-choice--active' : ''
                        }`}
                        key={spread.id}
                        onClick={() => selectSpread(availableSpreadId)}
                      >
                        <Text className='spread-choice__title'>
                          {spread.name}
                        </Text>
                        <Text className='spread-choice__description'>
                          {spread.description}
                        </Text>
                      </Button>
                    )
                  },
                )}
              </View>
            </View>
          ) : null}

          <Button
            className='primary-action'
            disabled={!question.trim() || !questionCategoryId}
            onClick={beginRitual}
          >
            进入洗牌
          </Button>
          <Button
            className='history-link'
            disabled={history.length === 0}
            onClick={() => setPhase('history')}
          >
            占卜记录（{history.length}）
          </Button>
        </>
      ) : null}

      {phase === 'shuffle' ? (
        <View className='ritual-stage'>
          <View className='shuffle-stack'>
            {[0, 1, 2].map((index) => (
              <View
                className={`shuffle-card shuffle-card--${index + 1}`}
                key={index}
              >
                {cardBack ? (
                  <Image
                    className='card-back-image'
                    mode='scaleToFill'
                    src={cardBack.image}
                  />
                ) : (
                  <Text className='card-back-symbol'>✦</Text>
                )}
              </View>
            ))}
          </View>
          <Text className='ritual-stage__hint'>正在洗牌…</Text>
        </View>
      ) : null}

      {phase === 'choose' ? (
        <View className='ritual-stage'>
          <View className='card-choice-row'>
            {CARD_CHOICES.map((choice) => (
              <Button
                aria-label={`选择第 ${choice + 1} 张牌`}
                className={`ritual-choice ritual-choice--${choice + 1}`}
                key={choice}
                onClick={revealNextCard}
              >
                {cardBack ? (
                  <Image
                    className='card-back-image'
                    mode='scaleToFill'
                    src={cardBack.image}
                  />
                ) : (
                  <Text className='card-back-symbol'>✦</Text>
                )}
              </Button>
            ))}
          </View>
          <Text className='ritual-stage__hint'>
            触碰最吸引你的牌 · {drawnCards.length + 1} /{' '}
            {activeSpread.positions.length}
          </Text>
        </View>
      ) : null}

      {phase === 'reveal' && currentDrawnCard ? (
        <View className='ritual-stage'>
          <View className='reveal-card'>
            <Image
              className={`result-card__image ${
                currentDrawnCard.orientation === 'reversed'
                  ? 'result-card__image--reversed'
                  : ''
              }`}
              mode='scaleToFill'
              src={currentDrawnCard.card.asset.image ?? ''}
              style={{ width: '100%', height: '100%' }}
            />
          </View>
        </View>
      ) : null}

      {phase === 'result' && drawnCards.length > 0 ? (
        <View className='result-card'>
          {spreadSummary ? (
            <View className='spread-summary'>
              {[spreadSummary.illumination, spreadSummary.guidance].map(
                (section) => (
                  <View className='spread-summary__section' key={section.title}>
                    <Text className='reading-section__label'>
                      {section.title}
                    </Text>
                    {section.lines.map((line) => (
                      <Text
                        className='spread-summary__line'
                        key={`${line.label}-${line.text}`}
                      >
                        <Text className='spread-summary__label'>
                          {line.label}
                        </Text>
                        {line.text}
                      </Text>
                    ))}
                  </View>
                ),
              )}
              <Text className='spread-summary__closing'>
                {spreadSummary.closing}
              </Text>
            </View>
          ) : null}

          <View
            className={
              drawnCards.length > 1
                ? detailsOpen
                  ? 'multi-card-details'
                  : 'multi-card-grid'
                : 'single-card-result'
            }
          >
            {drawnCards.map((drawn, index) => {
              const interpretation = interpretations[index]
              return (
                <View className='reading-result-item' key={drawn.position.id}>
                  {drawn.card.asset.image ? (
                    <View
                      className={
                        drawnCards.length > 1
                          ? 'result-card__image-frame result-card__image-frame--compact'
                          : 'result-card__image-frame'
                      }
                    >
                      <Image
                        className={`result-card__image ${
                          drawn.orientation === 'reversed'
                            ? 'result-card__image--reversed'
                            : ''
                        }`}
                        mode='scaleToFill'
                        src={drawn.card.asset.image}
                        style={{ width: '100%', height: '100%' }}
                      />
                    </View>
                  ) : null}
                  <Text className='result-card__position'>
                    {interpretation.positionName}
                  </Text>
                  <Text className='result-card__name'>
                    {interpretation.cardName} · {interpretation.orientationName}
                  </Text>
                  <Text className='result-card__keywords'>
                    {interpretation.keywords.join(' · ')}
                  </Text>
                  {drawnCards.length === 1 || detailsOpen ? (
                    <>
                      <Text className='result-card__overview'>
                        {interpretation.overview}
                      </Text>
                      {interpretation.topicText ? (
                        <Text className='result-card__topic'>
                          {interpretation.topicText}
                        </Text>
                      ) : null}
                      <View className='result-card__advice'>
                        <Text className='reading-section__label'>可以尝试</Text>
                        {interpretation.advice.map((advice) => (
                          <Text
                            className='result-card__advice-line'
                            key={advice}
                          >
                            · {advice}
                          </Text>
                        ))}
                      </View>
                      {interpretation.reflection ? (
                        <Text className='result-card__reflection'>
                          留给你的问题：{interpretation.reflection}
                        </Text>
                      ) : null}
                    </>
                  ) : null}
                </View>
              )
            })}
          </View>

          {drawnCards.length > 1 ? (
            <Button
              className='secondary-action'
              onClick={() => setDetailsOpen((open) => !open)}
            >
              {detailsOpen ? '收起逐张解读' : '查看逐张解读'}
            </Button>
          ) : null}
          <Button
            className='primary-action'
            disabled={Boolean(savedReadingId)}
            onClick={saveReading}
          >
            {savedReadingId ? '已保存' : '保存这次启示'}
          </Button>
          {saveStatus ? (
            <Text className='save-status'>{saveStatus}</Text>
          ) : null}
          <Button className='secondary-action' onClick={startAgain}>
            开始新的占卜
          </Button>
        </View>
      ) : null}

      {phase === 'history' ? (
        <View className='history-panel'>
          {history.length === 0 ? (
            <Text className='history-empty'>还没有保存过占卜记录</Text>
          ) : (
            history.map((reading) => (
              <View className='history-item' key={reading.id}>
                <Button
                  className='history-item__content'
                  onClick={() => openSavedReading(reading)}
                >
                  <View className='history-item__meta'>
                    <Text>{getSpread(reading.spreadId).name}</Text>
                    <Text>
                      {new Date(reading.createdAt).toLocaleDateString('zh-CN')}
                    </Text>
                  </View>
                  <Text className='history-item__cards'>
                    {reading.cards.map((card) => card.cardName).join(' · ')}
                  </Text>
                  <Text className='history-item__question'>
                    {reading.question}
                  </Text>
                </Button>
                <Button
                  aria-label={`删除${getSpread(reading.spreadId).name}占卜记录`}
                  className='history-item__delete'
                  onClick={() => deleteSavedReading(reading.id)}
                >
                  删除
                </Button>
              </View>
            ))
          )}
          <Button
            className='secondary-action'
            onClick={() =>
              setPhase(interpretations.length > 0 ? 'result' : 'question')
            }
          >
            返回
          </Button>
        </View>
      ) : null}

      <Text className='reading-page__disclaimer'>
        牌语仅供娱乐与自我探索，不替代专业建议
      </Text>
    </View>
  )
}
