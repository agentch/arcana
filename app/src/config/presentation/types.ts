export type PlatformPresentation = {
  brand: string
  eyebrow: string
  shareDefaultTitle: string
  shareDisclaimer: string
  pageTitles: {
    history: string
    shuffle: string
    choose: string
    reveal: string
    dailyResult: string
    question: string
  }
  pageSummaries: {
    history: string
    question: string
    result: string
    ritual: string
  }
  dailyDescription: string
  modeDivider: string
  categoryLabel: string
  questionLabel: string
  questionPlaceholder: string
  spreadLabel: string
  startAction: string
  historyLabel: string
  shuffleHint: string
  drawProgressLabel: string
  dailyDrawHint: string
  saveAction: string
  savedStatus: string
  savedConfirmation: string
  historyEmpty: string
  openHistoryStatus: string
  restartAction: string
  footerDisclaimer: string
  resultTitle(spreadName: string): string
}
