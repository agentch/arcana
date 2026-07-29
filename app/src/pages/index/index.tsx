import { Button, Image, Text, Textarea, View } from '@tarojs/components'
import type {
  BaseEventOrig,
  ITouchEvent,
} from '@tarojs/components/types/common'
import Taro from '@tarojs/taro'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'

import { triggerHaptic } from '@/adapters/haptics'
import { getAssetPlatform, resolveCardAssets } from '@/adapters/card-assets'
import { resolveBundledCardBack } from '@/adapters/card-back-assets'
import { resolveCloudFileUrl, warmCloudFileUrls } from '@/adapters/cloudbase'
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
  clampDeckRotation,
  getDeckWheelCardLayouts,
  getDrawAnimationGeometry,
  getFocusedDeckCardPresentation,
  getFocusedDeckIndex,
  rotationFromDrag,
  type DrawAnimationGeometry,
  type DrawAnimationRect,
} from '@/features/draw/deck-wheel'
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
  drawPreparedCardAt,
  prepareDeckForSelection,
  type DrawnRenderableCard,
  type PreparedDeckCard,
} from '@arcana/tarot-core/domain/draw'
import type { RenderableCard } from '@arcana/tarot-core/domain/tarot'
import {
  composeInterpretation,
  composeSpreadSummary,
  type InterpretationView,
  type SpreadSummaryView,
} from '@arcana/tarot-core/domain/interpretation'
import './index.scss'

type ReadingPhase =
  'question' | 'shuffle' | 'choose' | 'reveal' | 'result' | 'history'

const DEFAULT_DRAW_ANIMATION_GEOMETRY: DrawAnimationGeometry = {
  sourceX: 0,
  sourceY: 220,
  sourceScale: 0.58,
  sourceRotation: 0,
  targetX: 0,
  targetY: -180,
  targetScale: 0.54,
}

function measureDrawAnimation(
  sourceSelector: string,
  targetSelector: string,
  sourceRotation: number,
): Promise<DrawAnimationGeometry> {
  return new Promise((resolve) => {
    const { windowWidth, windowHeight } = Taro.getWindowInfo()
    const query = Taro.createSelectorQuery()
    query.select(sourceSelector).boundingClientRect()
    query.select(targetSelector).boundingClientRect()
    query.exec((results) => {
      const source = results[0] as DrawAnimationRect | undefined
      const target = results[1] as DrawAnimationRect | undefined
      if (!source || !target) {
        resolve(DEFAULT_DRAW_ANIMATION_GEOMETRY)
        return
      }
      resolve(
        getDrawAnimationGeometry(
          source,
          target,
          { width: windowWidth, height: windowHeight },
          sourceRotation,
        ),
      )
    })
  })
}

export default function Index() {
  const [readingDraft, setReadingDraft] = useState<{
    questionCategoryId: string | null
    question: string
    spreadId: string
  }>({ questionCategoryId: null, question: '', spreadId: 'single-card' })
  const { questionCategoryId, question, spreadId } = readingDraft
  const updateDraft = (draft: Partial<typeof readingDraft>) =>
    setReadingDraft((current) => ({ ...current, ...draft }))
  const resetDraft = () =>
    setReadingDraft({
      questionCategoryId: null,
      question: '',
      spreadId: 'single-card',
    })
  const [phase, setPhase] = useState<ReadingPhase>('question')
  const [dailyMode, setDailyMode] = useState(false)
  const [preparedDraws, setPreparedDraws] = useState<DrawnRenderableCard[]>([])
  const [preparedDeck, setPreparedDeck] = useState<
    PreparedDeckCard<RenderableCard>[]
  >([])
  const [selectedDeckIndexes, setSelectedDeckIndexes] = useState<number[]>([])
  const [drawnCards, setDrawnCards] = useState<DrawnRenderableCard[]>([])
  const [interpretations, setInterpretations] = useState<InterpretationView[]>(
    [],
  )
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [history, setHistory] = useState<SavedReading[]>(readReadingHistory)
  const [savedReadingId, setSavedReadingId] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState('')
  const [ritualError, setRitualError] = useState('')
  const [cardBackLoadFailed, setCardBackLoadFailed] = useState(false)
  const [deckRotation, setDeckRotation] = useState(0)
  const [deckDragging, setDeckDragging] = useState(false)
  const [drawAnimationGeometry, setDrawAnimationGeometry] =
    useState<DrawAnimationGeometry>(DEFAULT_DRAW_ANIMATION_GEOMETRY)
  const revealInFlight = useRef(false)
  const deckDrag = useRef<{
    startX: number
    startRotation: number
    moved: boolean
  } | null>(null)
  const suppressDeckClick = useRef(false)
  const lastWheelHapticIndex = useRef(0)
  const pendingDeckRotation = useRef<number | null>(null)
  const deckRotationTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const deckRotationValue = useRef(0)
  const selectDeckCardRef = useRef<
    (deckIndex: number, sourceRotation: number) => void
  >(() => undefined)
  const handleCardBackError = useCallback(
    (event: {
      detail?: {
        errMsg?: string
      }
    }) => {
      setCardBackLoadFailed(true)
      setRitualError(
        event.detail?.errMsg
          ? `牌背加载失败：${event.detail.errMsg}`
          : '牌背加载失败，请重新编译后再试',
      )
    },
    [],
  )

  const categories = useMemo(() => getQuestionCategories(), [])
  const cards = useMemo(
    () => resolveCardAssets(getCards(), getAssetPlatform()),
    [],
  )
  const cardBack = useMemo(
    () => resolveBundledCardBack(activeDeck.id, getActiveCardBack()),
    [],
  )
  const visibleCardBack = cardBackLoadFailed ? null : cardBack
  const activeSpread = getSpread(dailyMode ? 'single-card' : spreadId)
  const orderedActivePositions = [...activeSpread.positions].sort(
    (left, right) => left.order - right.order,
  )
  const displayedDrawnCards =
    phase === 'reveal' ? drawnCards.slice(0, -1) : drawnCards
  const activeDrawPosition =
    orderedActivePositions[displayedDrawnCards.length] ?? null
  const deckWheelCards = useMemo(
    () =>
      getDeckWheelCardLayouts(preparedDeck.length).map((layout) => ({
        ...preparedDeck[layout.itemIndex],
        deckIndex: layout.itemIndex,
        extracted: selectedDeckIndexes.includes(layout.itemIndex),
        layout,
      })),
    [preparedDeck, selectedDeckIndexes],
  )
  const focusedDeckIndex = getFocusedDeckIndex(
    preparedDeck.length,
    deckRotation,
  )
  const focusedDeckOrdinal =
    preparedDeck.length === 0 ? 0 : focusedDeckIndex + 1
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
    }, 1800)
    return () => clearTimeout(timer)
  }, [phase])

  useEffect(() => {
    if (phase !== 'shuffle') return
    const preparedCards = dailyMode ? preparedDraws : preparedDeck
    void warmCloudFileUrls(
      preparedCards.flatMap(({ card }) =>
        card.asset.image ? [card.asset.image] : [],
      ),
    )
  }, [dailyMode, phase, preparedDeck, preparedDraws])

  useEffect(
    () => () => {
      if (deckRotationTimer.current) {
        clearTimeout(deckRotationTimer.current)
      }
    },
    [],
  )

  useEffect(() => {
    deckRotationValue.current = deckRotation
  }, [deckRotation])

  useEffect(() => {
    if (phase !== 'reveal') return undefined
    const timer = setTimeout(() => {
      setPhase(
        drawnCards.length < activeSpread.positions.length ? 'choose' : 'result',
      )
    }, 3300)
    return () => clearTimeout(timer)
  }, [activeSpread.positions.length, drawnCards.length, phase])

  const selectCategory = async (categoryId: string) => {
    await triggerHaptic()
    updateDraft({ questionCategoryId: categoryId, question: '' })
    setPreparedDraws([])
    setPreparedDeck([])
    setSelectedDeckIndexes([])
    setDrawnCards([])
    setInterpretations([])
    setDetailsOpen(false)
    setSavedReadingId(null)
    setSaveStatus('')
    setRitualError('')
    setDeckRotation(0)
  }

  const selectQuestion = async (prompt: string) => {
    await triggerHaptic()
    updateDraft({ question: prompt })
  }

  const selectSpread = async (nextSpreadId: 'single-card' | 'timeline') => {
    await triggerHaptic()
    updateDraft({ spreadId: nextSpreadId })
    setPreparedDraws([])
    setPreparedDeck([])
    setSelectedDeckIndexes([])
    setDrawnCards([])
    setInterpretations([])
    setDetailsOpen(false)
    setSavedReadingId(null)
    setSaveStatus('')
    setRitualError('')
    setDeckRotation(0)
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
    setRitualError('')
    setDeckRotation(0)
    updateDraft({
      question: DAILY_QUESTION,
      questionCategoryId: DAILY_CATEGORY_ID,
      spreadId: 'single-card',
    })

    if (existing?.dateKey === dateKey) {
      const card = cards.find((item) => item.id === existing.cardId)
      if (card) {
        const resolvedCard = {
          ...card,
          asset: {
            ...card.asset,
            image: card.asset.image
              ? await resolveCloudFileUrl(card.asset.image)
              : null,
          },
        }
        const nextDrawn: DrawnRenderableCard = {
          card: resolvedCard,
          orientation: existing.orientation,
          position,
        }
        setPreparedDraws([nextDrawn])
        setPreparedDeck([])
        setSelectedDeckIndexes([])
        setDrawnCards([nextDrawn])
        setInterpretations([
          composeInterpretation({
            card: resolvedCard,
            layeredMeaning: getLayeredMeaning(resolvedCard.id),
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
    setPreparedDeck([])
    setSelectedDeckIndexes([])
    setDrawnCards([])
    setInterpretations([])
    setPhase('shuffle')
    await triggerHaptic()
  }

  const beginRitual = async () => {
    if (!question.trim() || !questionCategoryId) return

    await triggerHaptic()
    setDailyMode(false)
    setPreparedDraws([])
    setPreparedDeck(prepareDeckForSelection(cards))
    setSelectedDeckIndexes([])
    setDrawnCards([])
    setInterpretations([])
    setDetailsOpen(false)
    setSavedReadingId(null)
    setSaveStatus('')
    setRitualError('')
    setDeckRotation(0)
    setPhase('shuffle')
  }

  const revealNextCard = async (
    deckIndex: number,
    sourceSelector?: string,
    sourceRotation = 0,
  ) => {
    const interpretationCategoryId = dailyMode
      ? DAILY_CATEGORY_ID
      : questionCategoryId
    if (
      (!dailyMode && (!question.trim() || !questionCategoryId)) ||
      !interpretationCategoryId ||
      phase !== 'choose' ||
      revealInFlight.current
    ) {
      return
    }

    revealInFlight.current = true
    setRitualError('')
    try {
      void triggerHaptic('medium')
      const position = [...activeSpread.positions].sort(
        (left, right) => left.order - right.order,
      )[drawnCards.length]
      const drawn = dailyMode
        ? preparedDraws[drawnCards.length]
        : position
          ? drawPreparedCardAt(
              preparedDeck,
              deckIndex,
              position,
              selectedDeckIndexes,
            )
          : null
      if (!drawn) return
      if (!dailyMode) {
        setSelectedDeckIndexes((current) => [...current, deckIndex])
      }
      const sourceImage = drawn.card.asset.image
      const resolvedImageTask = sourceImage
        ? resolveCloudFileUrl(sourceImage).then(
            (image) => ({ image, failed: false }),
            () => ({ image: null, failed: true }),
          )
        : Promise.resolve({ image: null, failed: false })
      const nextAnimationGeometry = sourceSelector
        ? await measureDrawAnimation(
            sourceSelector,
            `#draw-position-${drawn.position.id}`,
            sourceRotation,
          )
        : DEFAULT_DRAW_ANIMATION_GEOMETRY
      const animatingDraw: DrawnRenderableCard = {
        ...drawn,
        card: {
          ...drawn.card,
          asset: {
            ...drawn.card.asset,
            image: null,
          },
        },
      }
      const nextInterpretation = composeInterpretation({
        card: drawn.card,
        layeredMeaning: getLayeredMeaning(drawn.card.id),
        orientation: drawn.orientation,
        topicId: getMeaningTopic(interpretationCategoryId),
        position: drawn.position,
      })
      setDrawAnimationGeometry(nextAnimationGeometry)
      setDrawnCards((current) => [...current, animatingDraw])
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
      void resolvedImageTask.then(({ image, failed }) => {
        if (failed || !image) {
          if (failed) setRitualError('牌面图片加载失败，请检查网络后重试')
          return
        }
        setDrawnCards((current) =>
          current.map((item) =>
            item.card.id === drawn.card.id &&
            item.position.id === drawn.position.id
              ? {
                  ...item,
                  card: {
                    ...item.card,
                    asset: { ...item.card.asset, image },
                  },
                }
              : item,
          ),
        )
      })
    } catch {
      if (!dailyMode) {
        setSelectedDeckIndexes((current) =>
          current.filter((index) => index !== deckIndex),
        )
      }
      setRitualError('牌面加载失败，请重新翻开')
    } finally {
      revealInFlight.current = false
    }
  }

  const startAgain = () => {
    resetDraft()
    setDailyMode(false)
    setPreparedDraws([])
    setPreparedDeck([])
    setSelectedDeckIndexes([])
    setDrawnCards([])
    setInterpretations([])
    setDetailsOpen(false)
    setSavedReadingId(null)
    setSaveStatus('')
    setRitualError('')
    setDeckRotation(0)
    setPhase('question')
  }

  const startDeckDrag = (event: BaseEventOrig) => {
    const touch = (event as ITouchEvent).touches[0]
    if (!touch) return
    deckDrag.current = {
      startX: touch.clientX,
      startRotation: deckRotation,
      moved: false,
    }
  }

  const moveDeckDrag = (event: BaseEventOrig) => {
    const drag = deckDrag.current
    const touch = (event as ITouchEvent).touches[0]
    if (!drag || !touch) return
    const distance = touch.clientX - drag.startX
    if (Math.abs(distance) > 5 && !drag.moved) {
      drag.moved = true
      setDeckDragging(true)
    }
    if (!drag.moved) return

    event.preventDefault()
    const nextRotation = clampDeckRotation(
      rotationFromDrag(drag.startRotation, drag.startX, touch.clientX),
    )
    pendingDeckRotation.current = nextRotation
    if (!deckRotationTimer.current) {
      deckRotationTimer.current = setTimeout(() => {
        const pending = pendingDeckRotation.current
        pendingDeckRotation.current = null
        deckRotationTimer.current = null
        if (pending === null) return
        deckRotationValue.current = pending
        setDeckRotation((current) =>
          Math.abs(pending - current) < 0.45 ? current : pending,
        )
      }, 24)
    }
    const hapticIndex = Math.round(nextRotation / 8)
    if (hapticIndex !== lastWheelHapticIndex.current) {
      lastWheelHapticIndex.current = hapticIndex
      void triggerHaptic('light')
    }
  }

  const finishDeckDrag = () => {
    if (deckRotationTimer.current) {
      clearTimeout(deckRotationTimer.current)
      deckRotationTimer.current = null
    }
    if (pendingDeckRotation.current !== null) {
      deckRotationValue.current = pendingDeckRotation.current
      setDeckRotation(pendingDeckRotation.current)
      pendingDeckRotation.current = null
    }
    if (deckDrag.current?.moved) {
      suppressDeckClick.current = true
      setTimeout(() => {
        suppressDeckClick.current = false
      }, 240)
    }
    deckDrag.current = null
    setDeckDragging(false)
  }

  const selectDeckCard = (deckIndex: number, sourceRotation: number) => {
    if (suppressDeckClick.current) {
      suppressDeckClick.current = false
      return
    }
    void revealNextCard(deckIndex, `#deck-card-${deckIndex}`, sourceRotation)
  }
  selectDeckCardRef.current = selectDeckCard

  const deckCardButtons = useMemo(
    () =>
      deckWheelCards.map(({ card, deckIndex, extracted, layout }) => {
        const focused = !extracted && layout.itemIndex === focusedDeckIndex
        const presentation = getFocusedDeckCardPresentation(
          layout.itemIndex,
          focusedDeckIndex,
          layout.angle,
        )
        return (
          <Button
            aria-label={
              extracted
                ? `洗牌后的第 ${deckIndex + 1} 个位置已抽出`
                : `选择洗牌后的第 ${deckIndex + 1} 个位置`
            }
            className={`draw-deck-card ${
              focused ? 'draw-deck-card--focused' : ''
            } ${extracted ? 'draw-deck-card--extracted' : ''}`}
            disabled={extracted}
            id={`deck-card-${deckIndex}`}
            key={card.id}
            onClick={
              extracted
                ? undefined
                : () =>
                    selectDeckCardRef.current(
                      deckIndex,
                      presentation.angle + deckRotationValue.current,
                    )
            }
            style={{
              transform: `translate(-50%, -50%) rotate(${presentation.angle}deg) translateY(-${presentation.radius}rpx) scale(${presentation.scale})`,
              zIndex: focused ? 300 : extracted ? 240 : 100,
            }}
          >
            {extracted ? null : visibleCardBack ? (
              <Image
                className='draw-deck-card__image'
                mode='aspectFill'
                onError={handleCardBackError}
                src={visibleCardBack.image}
              />
            ) : (
              <Text className='draw-deck-card__symbol'>✦</Text>
            )}
          </Button>
        )
      }),
    [deckWheelCards, focusedDeckIndex, handleCardBackError, visibleCardBack],
  )

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
    setSaveStatus('已保存到卡牌记录')
    void triggerHaptic()
  }

  const openSavedReading = async (reading: SavedReading) => {
    const spread = getSpread(reading.spreadId)
    const nextDrawnCards: DrawnRenderableCard[] = []
    const nextInterpretations: InterpretationView[] = []
    for (const savedCard of reading.cards) {
      const card = cards.find((item) => item.id === savedCard.cardId)
      const position = spread.positions.find(
        (item) => item.id === savedCard.positionId,
      )
      if (!card || !position) return
      const resolvedCard = {
        ...card,
        asset: {
          ...card.asset,
          image: card.asset.image
            ? await resolveCloudFileUrl(card.asset.image)
            : null,
        },
      }
      nextDrawnCards.push({
        card: resolvedCard,
        orientation: savedCard.orientation,
        position,
      })
      nextInterpretations.push(
        composeInterpretation({
          card: resolvedCard,
          layeredMeaning: getLayeredMeaning(resolvedCard.id),
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
    setPreparedDeck([])
    setSelectedDeckIndexes([])
    setDrawnCards(nextDrawnCards)
    setInterpretations(nextInterpretations)
    setDetailsOpen(false)
    setSavedReadingId(reading.id)
    setSaveStatus('正在查看已保存的卡牌解读')
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
      ? '卡牌记录'
      : phase === 'shuffle'
        ? '让牌序慢慢沉静'
        : phase === 'choose'
          ? '倾听直觉，召出你的牌'
          : phase === 'reveal'
            ? '牌面正在显现'
            : phase === 'result'
              ? dailyMode
                ? '今日卡牌已生成'
                : `${activeSpread.name}解读已生成`
              : '带一个问题来到牌前'

  const pageSummary =
    phase === 'history'
      ? '回看曾经保存的问题，也可以删除不再需要的记录。'
      : phase === 'question'
        ? '先选择问题方向，再进入洗牌与选牌。'
        : phase === 'result'
          ? '牌面仅提供观察角度，不代表事实结论或未来结果。'
          : '放慢一点，不必寻找唯一正确的牌。'

  return (
    <View className={`reading-page reading-page--${phase}`}>
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
            卡牌记录（{history.length}）
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
                {visibleCardBack ? (
                  <Image
                    className='card-back-image'
                    mode='aspectFill'
                    onError={handleCardBackError}
                    src={visibleCardBack.image}
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

      {phase === 'choose' || phase === 'reveal' ? (
        <View
          className={`ritual-stage draw-stage ${
            phase === 'reveal' ? 'draw-stage--paused' : ''
          }`}
        >
          <Text className='draw-progress'>
            已选卡牌 {displayedDrawnCards.length} /{' '}
            {orderedActivePositions.length}
          </Text>
          <View
            className={`draw-position-slots draw-position-slots--${orderedActivePositions.length}`}
          >
            {orderedActivePositions.map((position) => {
              const drawn = displayedDrawnCards.find(
                (item) => item.position.id === position.id,
              )
              const active = activeDrawPosition?.id === position.id
              return (
                <View
                  className={`draw-position-slot ${
                    active ? 'draw-position-slot--active' : ''
                  } ${drawn ? 'draw-position-slot--filled' : ''}`}
                  key={position.id}
                >
                  <Text className='draw-position-slot__name'>
                    {position.name}
                  </Text>
                  <View
                    className='draw-position-slot__frame'
                    id={`draw-position-${position.id}`}
                  >
                    {drawn?.card.asset.image ? (
                      <Image
                        className={`draw-position-slot__image ${
                          drawn.orientation === 'reversed'
                            ? 'draw-position-slot__image--reversed'
                            : ''
                        }`}
                        mode='scaleToFill'
                        src={drawn.card.asset.image}
                        webp
                      />
                    ) : (
                      <Text className='draw-position-slot__symbol'>✦</Text>
                    )}
                  </View>
                </View>
              )
            })}
          </View>
          <Text className='ritual-stage__hint draw-stage__hint'>
            {dailyMode
              ? '翻开今天的卡牌'
              : `转动牌组，为“${activeDrawPosition?.name ?? ''}”选择一张牌 · ${focusedDeckOrdinal}/${preparedDeck.length}`}
          </Text>
          {dailyMode ? (
            <View className='daily-card-choice'>
              <Button
                aria-label='翻开今日卡牌'
                className='ritual-choice'
                id='daily-card-choice'
                onClick={() => revealNextCard(0, '#daily-card-choice')}
              >
                {visibleCardBack ? (
                  <Image
                    className='card-back-image'
                    mode='aspectFill'
                    onError={handleCardBackError}
                    src={visibleCardBack.image}
                  />
                ) : (
                  <Text className='card-back-symbol'>✦</Text>
                )}
              </Button>
            </View>
          ) : (
            <View
              className={`draw-deck-wheel ${
                deckDragging ? 'draw-deck-wheel--dragging' : ''
              }`}
              onTouchCancel={finishDeckDrag}
              onTouchEnd={finishDeckDrag}
              onTouchMove={moveDeckDrag}
              onTouchStart={startDeckDrag}
            >
              <View
                className='draw-deck-wheel__rotor'
                style={{
                  transform: `rotate(${deckRotation}deg)`,
                }}
              >
                {deckCardButtons}
              </View>
            </View>
          )}
          {ritualError ? (
            <Text className='ritual-stage__error'>{ritualError}</Text>
          ) : null}
        </View>
      ) : null}

      {phase === 'reveal' && currentDrawnCard ? (
        <View className='draw-card-animation'>
          <View
            className={`draw-card-flip ${
              currentDrawnCard.orientation === 'reversed'
                ? 'draw-card-flip--reversed'
                : ''
            }`}
            style={
              {
                '--draw-source-x': `${drawAnimationGeometry.sourceX}px`,
                '--draw-source-y': `${drawAnimationGeometry.sourceY}px`,
                '--draw-source-scale': drawAnimationGeometry.sourceScale,
                '--draw-source-rotation': `${drawAnimationGeometry.sourceRotation}deg`,
                '--draw-target-x': `${drawAnimationGeometry.targetX}px`,
                '--draw-target-y': `${drawAnimationGeometry.targetY}px`,
                '--draw-target-scale': drawAnimationGeometry.targetScale,
              } as CSSProperties
            }
          >
            <View className='draw-card-flip__inner'>
              <View className='draw-card-flip__face draw-card-flip__back'>
                {visibleCardBack ? (
                  <Image
                    className='card-back-image'
                    mode='aspectFill'
                    src={visibleCardBack.image}
                  />
                ) : (
                  <Text className='card-back-symbol'>✦</Text>
                )}
              </View>
              <View className='draw-card-flip__face draw-card-flip__front'>
                {currentDrawnCard.card.asset.image ? (
                  <Image
                    className='draw-card-flip__image'
                    mode='scaleToFill'
                    onError={() =>
                      setRitualError('牌面图片加载失败，请重新尝试')
                    }
                    src={currentDrawnCard.card.asset.image}
                    webp
                  />
                ) : (
                  <View className='draw-card-flip__loading'>
                    <Text>✦</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
          {ritualError ? (
            <Text className='ritual-stage__error'>{ritualError}</Text>
          ) : null}
        </View>
      ) : null}

      {phase === 'result' && drawnCards.length > 0 ? (
        <View className='result-card'>
          {ritualError ? (
            <Text className='ritual-stage__error'>{ritualError}</Text>
          ) : null}
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
                        onError={() =>
                          setRitualError('牌面图片加载失败，请重新尝试')
                        }
                        src={drawn.card.asset.image}
                        style={{ width: '100%', height: '100%' }}
                        webp
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
            {savedReadingId ? '已保存' : '保存本次记录'}
          </Button>
          {saveStatus ? (
            <Text className='save-status'>{saveStatus}</Text>
          ) : null}
          <Button className='secondary-action' onClick={startAgain}>
            开始新的卡牌解读
          </Button>
        </View>
      ) : null}

      {phase === 'history' ? (
        <View className='history-panel'>
          {history.length === 0 ? (
            <Text className='history-empty'>还没有保存过卡牌记录</Text>
          ) : (
            history.map((reading) => (
              <View className='history-item' key={reading.id}>
                <Button
                  className='history-item__content'
                  onClick={() => void openSavedReading(reading)}
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
                  aria-label={`删除${getSpread(reading.spreadId).name}卡牌记录`}
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
        仅供娱乐与自我反思；牌面不代表事实结论或未来结果，也不替代医疗、心理、法律或财务等专业建议
      </Text>
    </View>
  )
}
