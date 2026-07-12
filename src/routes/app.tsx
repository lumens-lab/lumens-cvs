import { createFileRoute } from "@tanstack/react-router";
import { HazelApp } from "./index";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Lumens App — Pay, budget, chat" },
      { name: "description", content: "Lumens: send money, budget your month and chat with friends." },
    ],
  }),
  component: HazelApp,
});