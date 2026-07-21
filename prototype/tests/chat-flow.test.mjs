import assert from "node:assert/strict";
import test from "node:test";
import {
  chatFlowReducer,
  initialChatFlowState,
} from "../app/domain/chat-flow.ts";

test("advances through the guided conversation in order", () => {
  let state = chatFlowReducer(initialChatFlowState, {type: "start"});
  assert.equal(state.phase, "category");

  state = chatFlowReducer(state, {
    type: "select-category",
    label: "感情",
  });
  assert.equal(state.phase, "question");

  state = chatFlowReducer(state, {
    type: "submit-question",
    question: "这段关系现在最需要我看见什么？",
  });
  assert.equal(state.phase, "spread");

  state = chatFlowReducer(state, {
    type: "select-spread",
    label: "时间流",
  });
  assert.equal(state.phase, "draw");

  state = chatFlowReducer(state, {type: "complete-draw"});
  assert.equal(state.phase, "result");

  state = chatFlowReducer(state, {type: "save"});
  assert.equal(state.phase, "complete");
  assert.deepEqual(
    state.messages.filter((message) => message.role === "user").map(
      (message) => message.text,
    ),
    [
      "开始一次占卜",
      "感情",
      "这段关系现在最需要我看见什么？",
      "使用时间流",
    ],
  );
});

test("ignores actions that are invalid for the current phase", () => {
  const invalidQuestion = chatFlowReducer(initialChatFlowState, {
    type: "submit-question",
    question: "不应被接受",
  });
  assert.equal(invalidQuestion, initialChatFlowState);

  const categoryState = chatFlowReducer(initialChatFlowState, {type: "start"});
  const blankQuestion = chatFlowReducer(categoryState, {
    type: "submit-question",
    question: "   ",
  });
  assert.equal(blankQuestion, categoryState);
});

test("reset returns to a clean welcome conversation", () => {
  const started = chatFlowReducer(initialChatFlowState, {type: "start"});
  const reset = chatFlowReducer(started, {type: "reset"});

  assert.deepEqual(reset, initialChatFlowState);
});

test("start-daily enters the draw phase directly", () => {
  const state = chatFlowReducer(initialChatFlowState, {type: "start-daily"});
  assert.equal(state.phase, "draw");
  assert.equal(state.messages.at(-2)?.text, "今日一牌");
});

test("reveal-daily returns to an existing daily result", () => {
  const state = chatFlowReducer(initialChatFlowState, {type: "reveal-daily"});
  assert.equal(state.phase, "result");
  assert.equal(state.messages.at(-2)?.text, "今日一牌");
});
