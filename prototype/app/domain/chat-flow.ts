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
      text: "夜色沉静，星轨微响。欢迎来到 Arcana——把你的问题交给沉默的牌面，听命运轻轻应一声。",
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
        {
          role: "assistant",
          text: "先告诉我——此刻搅动你心潮的，是哪一道命运的波纹？",
        },
      ]);
    case "start-daily":
      if (state.phase !== "welcome" && state.phase !== "complete") return state;
      return appendMessages(state, "draw", [
        { role: "user", text: "今日一牌" },
        {
          role: "assistant",
          text: "今日之轮已为你停驻。洗牌之后，让今天的使者自行现身。",
        },
      ]);
    case "reveal-daily":
      if (state.phase !== "welcome" && state.phase !== "complete") return state;
      return appendMessages(state, "result", [
        { role: "user", text: "今日一牌" },
        {
          role: "assistant",
          text: "今日的使者已在等候。且看它为你留下的那一页。",
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
          text: "牌圈已在你指尖苏醒。凭直觉拨动命运之轮，为每一个位置召来它的使者。",
        },
      ]);
    case "complete-draw":
      if (state.phase !== "draw") return state;
      return appendMessages(state, "result", [
        {
          role: "assistant",
          text: "阵已合拢，回响初成。且看牌面为你揭开的那一页。",
        },
      ]);
    case "save":
      if (state.phase !== "result") return state;
      return appendMessages(state, "complete", [
        {
          role: "assistant",
          text: "这段启示已铭刻于你的记录之中。星轨未熄，你随时可以再次启程。",
        },
      ]);
    case "reset":
      return initialChatFlowState;
    default:
      return state;
  }
}
