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
  | { type: "start-daily" }
  | { type: "reveal-daily" }
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
      text: "夜色沉静，星光微亮。欢迎来到 Arcana——把问题写进星光，让牌面回应此刻的召唤。",
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
        { role: "user", text: "开启塔罗占卜" },
        {
          role: "assistant",
          text: "先选择一个领域，看看命运将从哪一扇门回应你。",
        },
      ]);
    case "start-daily":
      if (state.phase !== "welcome" && state.phase !== "complete") return state;
      return appendMessages(state, "draw", [
        { role: "user", text: "今日一牌" },
        {
          role: "assistant",
          text: "今日的命运之牌已经苏醒。洗牌之后，选择那张正在呼唤你的牌。",
        },
      ]);
    case "reveal-daily":
      if (state.phase !== "welcome" && state.phase !== "complete") return state;
      return appendMessages(state, "result", [
        { role: "user", text: "今日一牌" },
        {
          role: "assistant",
          text: "今日启示已经显现，凝视牌面，聆听它留下的低语。",
        },
      ]);
    case "select-category":
      if (state.phase !== "category") return state;
      return appendMessages(state, "question", [
        { role: "user", text: action.label },
        {
          role: "assistant",
          text: "把问题写进光里。可以选择更贴近你的问法，也可以亲自低语一句属于你的句子。",
        },
      ]);
    case "submit-question":
      if (state.phase !== "question" || !action.question.trim()) return state;
      return appendMessages(state, "spread", [
        { role: "user", text: action.question.trim() },
        {
          role: "assistant",
          text: "选定阵形，如同在星图上落下一枚坐标。让这个问题有自己的展开方式。",
        },
      ]);
    case "select-spread":
      if (state.phase !== "spread") return state;
      return appendMessages(state, "draw", [
        { role: "user", text: `使用${action.label}` },
        {
          role: "assistant",
          text: "牌圈已经展开。轻轻拨动牌组，为每一个位置选择一张牌。",
        },
      ]);
    case "complete-draw":
      if (state.phase !== "draw") return state;
      return appendMessages(state, "result", [
        {
          role: "assistant",
          text: "牌阵已经完整，启示正在星光中显现。",
        },
      ]);
    case "save":
      if (state.phase !== "result") return state;
      return appendMessages(state, "complete", [
        {
          role: "assistant",
          text: "本次启示已经封存，你可以随时回来重访它的回声。",
        },
      ]);
    case "reset":
      return initialChatFlowState;
    default:
      return state;
  }
}
