export interface FixedOffering {
  id: string;
  path: string;
  displayName: string;
  description: string;
  model: string;
  priceUsd: string;
  priceUsdc: string;
  tier: string;
}

export const GOAL_BASED_TASK: FixedOffering = {
  id: "goal-based-task",
  path: "/v1/goal-based-task",
  displayName: "Goal Based Task",
  description: "Hire an AI agent to work through a difficult goal and return a completed answer.",
  model: env.OPENROUTER_GOAL_MODEL,
  priceUsd: "$3.00",
  priceUsdc: "3.00",
  tier: "goal-based-task",
};

export const FREE_TIER: FixedOffering = {
  id: "free-tier",
  path: "/v1/free-tier",
  displayName: "Basic Tasks",
  description: "AI assistance for very basic tasks such as short answers and simple writing.",
  model: env.OPENROUTER_BASIC_MODEL,
  priceUsd: "$0.10",
  priceUsdc: "0.10",
  tier: "free-tier",
};

export const MINOR_CODING_TASK: FixedOffering = {
  id: "minor-coding-task",
  path: "/v1/minor-coding-task",
  displayName: "Minor Coding Task",
  description: "AI assistance for small coding tasks and HTML or CSS snippets.",
  model: env.OPENROUTER_GOAL_MODEL,
  priceUsd: "$1.00",
  priceUsdc: "1.00",
  tier: "minor-coding-task",
};

export const FIXED_OFFERINGS = [GOAL_BASED_TASK, FREE_TIER, MINOR_CODING_TASK] as const;
import { env } from "./env.js";
