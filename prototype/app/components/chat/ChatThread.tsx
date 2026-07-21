"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { ChatMessage } from "../../domain/chat-flow";

export function ChatThread({
  messages,
  activeKey,
  children,
}: {
  messages: ChatMessage[];
  activeKey: string;
  children: ReactNode;
}) {
  const latestMessage = useRef<HTMLDivElement | null>(null);
  const activeStep = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    latestMessage.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages.length]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      activeStep.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [activeKey]);

  return (
    <div className="chat-thread" role="log" aria-live="polite">
      <div className="chat-intro">
        <p className="eyebrow">A quiet space for reflection</p>
        <h1 className="chat-title">在牌面中，看见此刻的自己</h1>
      </div>
      {messages.map((message, index) => (
        <div
          className={`message-row ${message.role}`}
          key={message.id}
          ref={index === messages.length - 1 ? latestMessage : undefined}
        >
          <div className="message-avatar" aria-hidden="true">
            {message.role === "assistant" ? "☾" : "你"}
          </div>
          <div className="message-bubble">{message.text}</div>
        </div>
      ))}
      <div className="chat-active-step" ref={activeStep}>
        {children}
      </div>
      <p className="chat-disclaimer">仅供娱乐与自我探索，不替代专业建议</p>
    </div>
  );
}

export function AssistantCard({ children }: { children: ReactNode }) {
  return (
    <div className="message-row assistant interactive">
      <div className="message-avatar" aria-hidden="true">
        ☾
      </div>
      <div className="message-card">{children}</div>
    </div>
  );
}
