// src/components/PostReactions.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Flame } from "lucide-react";

const REACTIONS = [
  {
    key: "gowild",
    label: "Go Wild",
    emoji: "🔥",
    message: "🔥 A galera foi à loucura com seu round!",
  },
  {
    key: "cleanhit",
    label: "Clean Hit",
    emoji: "🥊",
    message: "🥊 Golpe limpo — técnica impecável!",
  },
  {
    key: "championmove",
    label: "Champion’s Move",
    emoji: "🏆",
    message: "🏆 Movimento de campeão!",
  },
  {
    key: "ontarget",
    label: "On Target",
    emoji: "🎯",
    message: "🎯 Acertou em cheio!",
  },
  {
    key: "tooheavy",
    label: "Too Heavy",
    emoji: "😤",
    message: "😤 Pegou pesado nesse round.",
  },
];

const PRIMARY_REACTION_KEY = REACTIONS[0].key; // "gowild"

interface PostReactionsProps {
  postId: string;
  currentReaction?: string | null;
  onReact?: (reactionKey: string | null) => void;
}

export const PostReactions = ({
  currentReaction,
  onReact,
}: PostReactionsProps) => {
  const [openBar, setOpenBar] = useState(false);

  const selected = REACTIONS.find((r) => r.key === currentReaction) || null;

  const handleReaction = (reactionKey: string) => {
    onReact?.(reactionKey);
    setOpenBar(false);
  };

  const isTouchDevice =
    typeof window !== "undefined" && "ontouchstart" in window;

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => !isTouchDevice && setOpenBar(true)}
      onMouseLeave={() => !isTouchDevice && setOpenBar(false)}
    >
      {/* BARRA DE REAÇÕES (estilo Facebook) */}
      {openBar && (
        <div
          className="
            absolute -top-12 left-1/2 -translate-x-1/2
            flex items-center gap-1
            rounded-full border bg-white shadow-lg
            px-2 py-1 z-20
          "
        >
          {REACTIONS.map((reaction) => (
            <Tooltip key={reaction.key}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleReaction(reaction.key)}
                  className="
                    h-7 w-7 flex items-center justify-center
                    text-lg leading-none
                    transition-transform hover:scale-110
                  "
                >
                  {reaction.emoji}
                </button>
              </TooltipTrigger>

              <TooltipContent side="top">
                <p className="text-xs">{reaction.message}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      )}

      {/* BOTÃO PRINCIPAL */}
      <Button
        variant="ghost"
        className={`
          flex items-center gap-2 px-3 py-2 text-sm
          ${
            selected
              ? "font-semibold text-primary"
              : "text-slate-800 hover:text-slate-900"
          }
        `}
        onClick={() => {
          if (isTouchDevice) {
            setOpenBar((prev) => !prev);
            return;
          }

          // desktop: alterna entre sem reação e "gowild"
          const next =
            currentReaction === PRIMARY_REACTION_KEY
              ? null
              : PRIMARY_REACTION_KEY;

          onReact?.(next);
        }}
      >
        <span className="text-xl flex items-center">
          {selected ? (
            selected.emoji
          ) : (
            <Flame className="h-4 w-4 text-slate-800" />
          )}
        </span>
        <span>{selected ? selected.label : "Reagir"}</span>
      </Button>
    </div>
  );
};

export default PostReactions;
