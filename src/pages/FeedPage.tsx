import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FeedPost } from "@/components/FeedPost";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  MessageCircle,
  Users,
  Trophy,
  Settings,
} from "lucide-react";

interface Profile {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  location?: string | null;
  experience_level?: string | null;
  category?: string | null;
  user_type?: string | null;
  gym_name?: string | null;
  amateur_fights?: number | null;
  professional_fights?: number | null;
  ring_name?: string | null; // ⬅ apelido / nickname
}

interface FeedPostRow {
  id: string;
  user_id: string;
  content: string;
  caption?: string | null;
  media_url?: string | null;
  media_type?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  link_url?: string | null;
  link_preview?: any;
  created_at: string;
  shared_from_post_id?: string | null;
  post_type?: string | null;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface SuggestedUser {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  location?: string | null;
  category?: string | null;
}

export const FeedPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<FeedPostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggested, setSuggested] = useState<SuggestedUser[]>([]);

  // 1) checa sessão
  useEffect(() => {
    const loadSessionAndData = async () => {
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();

      const session = sessionData?.session;
      if (!session) {
        // se não estiver logado, manda pra landing / login
        navigate("/");
        return;
      }

      setCurrentUserId(session.user.id);

      await Promise.all([
        fetchProfile(session.user.id),
        fetchPosts(),
        fetchSuggestions(session.user.id),
      ]);

      setLoading(false);
    };

    loadSessionAndData();
  }, []);

  // 2) perfil do usuário (coluna da esquerda)
  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        `
        user_id,
        full_name,
        avatar_url,
        location,
        experience_level,
        category,
        user_type,
        gym_name,
        amateur_fights,
        professional_fights
      `
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Erro ao carregar perfil:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar seu perfil.",
        variant: "destructive",
      });
      return;
    }

    if (data) {
      setProfile(data as Profile);
    }
  };

  // 3) posts do feed (coluna central)
  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from("feed_posts")
      .select(
        `
        id,
        user_id,
        content,
        caption,
        media_url,
        media_type,
        image_url,
        video_url,
        link_url,
        link_preview,
        created_at,
        shared_from_post_id,
        post_type,
        profiles:profiles (
          full_name,
          avatar_url
        )
      `
      )
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      console.error("Erro ao carregar feed:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o feed.",
        variant: "destructive",
      });
      return;
    }

    setPosts((data || []) as FeedPostRow[]);
  };

  // 4) sugestões (coluna da direita)
  const fetchSuggestions = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        `
        user_id,
        full_name,
        avatar_url,
        location,
        category
      `
      )
      .neq("user_id", userId)
      .limit(6);

    if (error) {
      console.error("Erro ao carregar sugestões:", error);
      return;
    }

    setSuggested((data || []) as SuggestedUser[]);
  };

  if (loading || !currentUserId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Carregando seu corner...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40">
      {/* TOP BAR SIMPLES */}

      {/* LAYOUT 3 COLUNAS */}
      <main className="max-w-6xl mx-auto px-4 py-6 flex gap-6">
        {/* COLUNA ESQUERDA – MINI DASHBOARD */}
        <aside className="hidden lg:block w-[260px] space-y-4">
          <Card>
           <CardHeader className="flex flex-col items-center text-center pb-2">

  <Avatar
    className="h-20 w-20 mb-2 cursor-pointer"
    onClick={() => navigate(`/profile/${currentUserId}`)}
  >
    <AvatarImage src={profile?.avatar_url || ""} />
    <AvatarFallback>
      {profile?.full_name?.[0] || "R"}
    </AvatarFallback>
  </Avatar>

  <button
    className="font-semibold text-lg hover:underline cursor-pointer"
    onClick={() => navigate(`/profile/${currentUserId}`)}
  >
    {profile?.full_name || "Atleta"}
  </button>

  <p className="text-xs text-muted-foreground mt-1">
    {profile?.user_type || "Atleta"}{" "}
    {profile?.category ? <>• {profile.category}</> : null}
  </p>

  {profile?.location && (
    <p className="text-xs text-muted-foreground">
      {profile.location}
    </p>
  )}
</CardHeader>

            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <p className="font-semibold">
                    {profile?.amateur_fights ?? 0}
                  </p>
                  <p className="text-muted-foreground">Amadoras</p>
                </div>
                <div>
                  <p className="font-semibold">
                    {profile?.professional_fights ?? 0}
                  </p>
                  <p className="text-muted-foreground">Profissionais</p>
                </div>
                <div>
                  <p className="font-semibold">0</p>
                  <p className="text-muted-foreground">Sparrings</p>
                </div>
              </div>

              <Button
                className="w-full mt-1"
                onClick={() => navigate("/training-today")}
              >
                Registrar treino de hoje
              </Button>

              <div className="space-y-1 text-sm">
                <button
                  className="w-full flex items-center gap-2 text-left text-muted-foreground hover:text-foreground"
                  onClick={() => navigate(`/profile/${currentUserId}`)}
                >
                  <Trophy className="h-4 w-4" />
                  Histórico de lutas
                </button>
                <button
                  className="w-full flex items-center gap-2 text-left text-muted-foreground hover:text-foreground"
                  onClick={() => navigate("/meus-posts")}
                >
                  <MessageCircle className="h-4 w-4" />
                  Meus rounds
                </button>
                <button
                  className="w-full flex items-center gap-2 text-left text-muted-foreground hover:text-foreground"
                  onClick={() => navigate("/configuracoes")}
                >
                  <Settings className="h-4 w-4" />
                  Configurações
                </button>
              </div>
            </CardContent>
          </Card>
        </aside>

        {/* COLUNA CENTRAL – FEED */}
        <section className="flex-1 max-w-[640px] mx-auto space-y-4">
          {/* Caixinha de “publicar” futura – placeholder */}
          <Card className="border-dashed border-2 border-primary/20 bg-white">
            <CardContent className="py-3 flex items-center gap-3">
              <Avatar
                className="h-9 w-9 cursor-pointer"
                onClick={() => navigate(`/profile/${currentUserId}`)}
              >
                <AvatarImage src={profile?.avatar_url || ""} />
                <AvatarFallback>
                  {profile?.full_name?.[0] || "R"}
                </AvatarFallback>
              </Avatar>
              <button
                className="flex-1 text-left text-sm text-muted-foreground border rounded-full px-4 py-2 hover:bg-muted/60"
                onClick={() => navigate("/criar-post")}
              >
                Hora de soltar mais um round?
              </button>
            </CardContent>
          </Card>

          {posts.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                Ainda não há rounds no seu feed. <br />
                Comece publicando algo ou seguindo outros atletas.
              </CardContent>
            </Card>
          )}

          {posts.map((post) => (
            <FeedPost
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              onPostDeleted={fetchPosts}
            />
          ))}
        </section>

        {/* COLUNA DIREITA – SUGESTÕES / EVENTOS */}
        <aside className="hidden xl:block w-[260px] space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Sugestões de corner</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {suggested.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Assim que outros atletas entrarem, vamos sugerir novos corners
                  pra você.
                </p>
              )}

              {suggested.map((user) => (
                <div
                  key={user.user_id}
                  className="flex items-center justify-between gap-2"
                >
                  <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => navigate(`/profile/${user.user_id}`)}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url || ""} />
                      <AvatarFallback>
                        {user.full_name?.[0] || "A"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium leading-tight">
                        {user.full_name}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {user.category || "Boxeador"}
                        {user.location ? ` • ${user.location}` : ""}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    onClick={() => navigate(`/profile/${user.user_id}`)}
                  >
                    <Users className="h-3 w-3 mr-1" />
                    Ver
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <h3 className="font-semibold text-sm">Próximos eventos</h3>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <p>Em breve você verá aqui torneios, festivais e cards locais.</p>
            </CardContent>
          </Card>
        </aside>
      </main>
    </div>
  );
};

export default FeedPage;
