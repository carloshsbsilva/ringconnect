import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type ReactionRow = {
  user_id: string;
  reaction_type: string;
  created_at: string;
  full_name: string | null;
  avatar_url: string | null;
};

// MESMOS KEYS DA COLUNA reaction_type
const REACTION_EMOJI: Record<string, string> = {
  gowild: "🔥",
  cleanhit: "🥊",
  championmove: "🏆",
  ontarget: "🎯",
  tooheavy: "😤",
};

const REACTION_LABEL: Record<string, string> = {
  gowild: "Go Wild",
  cleanhit: "Clean Hit",
  championmove: "Champion’s Move",
  ontarget: "On Target",
  tooheavy: "Too Heavy",
};

interface PostReactionsListProps {
  postId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PostReactionsList({
  postId,
  open,
  onOpenChange,
}: PostReactionsListProps) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ReactionRow[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;

    const load = async () => {
      setLoading(true);

      // usamos `as any` porque a view não está nas types geradas
      const { data, error } = await (supabase as any)
        .from("post_reactions_with_profiles")
        .select("user_id, reaction_type, created_at, full_name, avatar_url")
        .eq("post_id", postId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao carregar reações:", error);
        setRows([]);
        setLoading(false);
        return;
      }

      setRows(((data ?? []) as unknown) as ReactionRow[]);
      setLoading(false);
    };

    load();
  }, [open, postId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] rounded-2xl">
        <DialogHeader>
          <DialogTitle>Reações ao round</DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ainda não há reações neste round.
          </p>
        ) : (
          <div className="space-y-3 max-h-[320px] overflow-y-auto">
            {rows.map((r) => (
              <button
                key={`${r.user_id}-${r.reaction_type}-${r.created_at}`}
                className="w-full flex items-center gap-3 text-left px-2 py-1.5 rounded-lg hover:bg-slate-50"
                onClick={() => navigate(`/profile/${r.user_id}`)}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={r.avatar_url || ""} />
                  <AvatarFallback>{r.full_name?.[0] || "U"}</AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <p className="text-sm font-medium leading-tight">
                    {r.full_name || "Usuário"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {REACTION_LABEL[r.reaction_type] || "Reação"}
                  </p>
                </div>

                <span className="text-xl">
                  {REACTION_EMOJI[r.reaction_type] || "🔥"}
                </span>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
