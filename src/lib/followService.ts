// src/lib/followService.ts
import { supabase } from "@/integrations/supabase/client";

// Truque: ignorar tipos do Supabase só neste arquivo
const supabaseAny = supabase as any;

export async function getIsFollowing(targetUserId: string) {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    return { isFollowing: false };
  }

  const { data, error } = await supabaseAny
    .from("user_follows")
    .select("id")
    .eq("follower_user_id", session.user.id)
    .eq("followed_user_id", targetUserId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error("Erro ao buscar follow:", error);
  }

  return { isFollowing: !!data };
}

export async function follow(targetUserId: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) throw new Error("Usuário não autenticado");

  // 1) Cria o follow (vale pra qualquer tipo de usuário)
  const { error } = await supabaseAny
    .from("user_follows")
    .insert({
      follower_user_id: session.user.id,
      followed_user_id: targetUserId,
    });

  if (error) {
    console.error("Erro ao seguir:", error);
    throw error;
  }

  // 2) Cria notificação para o dono do perfil
  if (session.user.id !== targetUserId) {
    const { error: notifError } = await supabaseAny
      .from("notifications")
      .insert({
        user_id: targetUserId,        // quem RECEBE
        actor_id: session.user.id,    // quem entrou pra torcida
        type: "user_follow",          // já está permitido no valid_type
        content: "entrou para sua torcida!",
        related_user_id: session.user.id,
        read: false,
      });

    if (notifError) {
      console.error("Erro ao criar notificação de follow:", notifError);
      // não dou throw pra não quebrar o botão se só a notificação falhar
    }
  }
}

export async function unfollow(targetUserId: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) throw new Error("Usuário não autenticado");

  const { error } = await supabaseAny
    .from("user_follows")
    .delete()
    .eq("follower_user_id", session.user.id)
    .eq("followed_user_id", targetUserId);

  if (error) throw error;
}

// 🔢 Estatísticas de torcida: quantos torcem por esse usuário e por quem ele torce
export async function getFollowStats(userId: string) {
  // quantos torcem POR ele
  const { count: followersCount, error: followersError } = await supabaseAny
    .from("user_follows")
    .select("id", { count: "exact", head: true })
    .eq("followed_user_id", userId);

  if (followersError) {
    console.error("Erro ao contar followers:", followersError);
  }

  // por quem ele torce
  const { count: followingCount, error: followingError } = await supabaseAny
    .from("user_follows")
    .select("id", { count: "exact", head: true })
    .eq("follower_user_id", userId);

  if (followingError) {
    console.error("Erro ao contar following:", followingError);
  }

  return {
    followers: followersCount ?? 0,
    following: followingCount ?? 0,
  };
}
