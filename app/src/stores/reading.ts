import { create } from 'zustand'

type ReadingDraft = {
  questionCategoryId: string | null
  question: string
  spreadId: string
}

type ReadingState = ReadingDraft & {
  updateDraft: (draft: Partial<ReadingDraft>) => void
  reset: () => void
}

const initialState: ReadingDraft = {
  questionCategoryId: null,
  question: '',
  spreadId: 'single',
}

export const useReadingStore = create<ReadingState>((set) => ({
  ...initialState,
  updateDraft: (draft) => set((state) => ({ ...state, ...draft })),
  reset: () => set(initialState),
}))
