export type BotDecision = "ANSWER" | "HANDOFF" | "SILENT";

/** Persisted counters are reserved under a conversation row lock. */
export function decideBotReply(options: {
  enabled: boolean;
  paused: boolean;
  handedOff: boolean;
  replyCount: number;
  asksForHuman: boolean;
  messageType: string;
}): BotDecision {
  if (!options.enabled || options.paused || options.handedOff || options.messageType === "reaction") {
    return "SILENT";
  }
  const isText = ["text", "button", "interactive"].includes(options.messageType);
  if (!isText || options.asksForHuman || options.replyCount >= 2) return "HANDOFF";
  return "ANSWER";
}
