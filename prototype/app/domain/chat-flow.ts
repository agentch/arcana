export type ChatPhase =
  | "welcome"
  | "category"
  | "question"
  | "spread"
  | "draw"
  | "result"
  | "complete";

export type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

export type ChatFlowState = {
  phase: ChatPhase;
  messages: ChatMessage[];
};

export type ChatFlowAction =
  | { type: "start" }
  | { type: "select-category"; label: string }
  | { type: "submit-question"; question: string }
  | { type: "select-spread"; label: string }
  | { type: "complete-draw" }
  | { type: "save" }
  | { type: "reset" };

export const initialChatFlowState: ChatFlowState = {
  phase: "welcome",
  messages: [
    {
      id: "message-0",
      role: "assistant",
      text: "欢迎来到 Arcana。带着一个问题而来，让牌面陪你看见此刻的感受与可能。",
    },
  ],
};

function appendMessages(
  state: ChatFlowState,
  phase: ChatPhase,
  messages: Array<Omit<ChatMessage, "id">>,
): ChatFlowState {
  const nextMessages = messages.map((message, index) => ({
    ...message,
    id: `message-${state.messages.length + index}`,
  }));
  return {
    phase,
    messages: [...state.messages, ...nextMessages],
  };
}

export function chatFlowReducer(
  state: ChatFlowState,
  action: ChatFlowAction,
): ChatFlowState {
  switch (action.type) {
    case "start":
      if (state.phase !== "welcome" && state.phase !== "complete") return state;
      return appendMessages(state, "category", [
        { role: "user", text: "开始一次占卜" },
        { role: "assistant", text: "此刻，你最想探索哪个方面？" },
      ]);
    case "select-category":
      if (state.phase !== "category") return state;
      return appendMessages(state, "question", [
        { role: "user", text: action.label },
        {
          role: "assistant",
          text: "选择一个更贴近你的问题，也可以直接写下自己的问题。",
        },
      ]);
    case "submit-question":
      if (state.phase !== "question" || !action.question.trim()) return state;
      return appendMessages(state, "spread", [
        { role: "user", text: action.question.trim() },
        { role: "assistant", text: "选择一种牌阵来展开这个问题。" },
      ]);
    case "select-spread":
      if (state.phase !== "spread") return state;
      return appendMessages(state, "draw", [
        { role: "user", text: `使用${action.label}` },
        {
          role: "assistant",
          text: "左右滑动牌组，凭直觉为每个牌位选择一张牌。",
        },
      ]);
    case "complete-draw":
      if (state.phase !== "draw") return state;
      return appendMessages(state, "result", [
        { role: "assistant", text: "牌阵已经完整展开，下面是这次牌面带来的观察。" },
      ]);
    case "save":
      if (state.phase !== "result") return state;
      return appendMessages(state, "complete", [
        { role: "assistant", text: "这次启示已保存。你可以随时开始新的对话。" },
      ]);
    case "reset":
      return initialChatFlowState;
    default:
      return state;
  }
}
