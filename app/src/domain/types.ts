export type Orientation = 'upright' | 'reversed'

export interface CardReference {
  id: string
}

export interface SpreadPosition {
  id: string
  name: string
  order: number
}

export interface SpreadDefinition {
  id: string
  positions: SpreadPosition[]
}

export interface DrawnCard<TCard extends CardReference = CardReference> {
  card: TCard
  orientation: Orientation
  position: SpreadPosition
}
