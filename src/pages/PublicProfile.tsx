import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Trophy,
  Video,
  MessageCircle,
} from "lucide-react";

import { SparringRequestButton } from "@/components/SparringRequestButton";
import { TorcidaButton } from "@/components/TorcidaButton";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  user_type: string | null;
  bio: string | null;
  avatar_url: string | null;
  location: string | null;
  category: string | null;
  experience_level: string | null;
  athlete_status: string | null;
  amateur_fights: number;
  professional_fights: number;
  weight: number | null;
  gym_name: string | null;
  gym_address: string | null;
  gender: string | null;
}

interface VideoData {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  created_at: string;
}

interface Championship {
  id: string;
  championship_name: string;
  year: number;
  is_champion: boolean;
  position: number | null;
  opponent_name: string | null;
  notes: string | null;
}

interface SimpleUser {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  user_type: string | null;
}

const PublicProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [championships, setChampionships] = useState<Championship[]>([]);
  const [weightCategory, setWeightCategory] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Torcida
  const [followersCount, setFollowersCount] = useState(0); // quantos torcem por ESTE perfil
  const [followingCount, setFollowingCount] = useState(0); // por quantos ESTE perfil torce

  // Modal de lista da torcida
  const [supportersModalOpen, setSupportersModalOpen] = useState(false);
  const [supportersModalMode, setSupportersModalMode] = useState<
    "followers" | "following"
  >("followers");
  const [supportersLoading, setSupportersLoading] = useState(false);
  const [supportersList, setSupportersList] = useState<SimpleUser[]>([]);

  useEffect(() => {
    checkCurrentUser();
  }, []);

  useEffect(() => {
    if (userId) {
      loadProfile();
    }
  }, [userId]);

  const checkCurrentUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    setCurrentUserId(session?.user?.id || null);
  };

  const loadProfile = async () => {
    if (!userId) return;
    const supabaseAny = supabase as any;

    try {
      setLoading(true);

      // Perfil
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Categoria de peso (se aplicável)
      if (profileData.weight && profileData.gender) {
        const { data: categoryData } = await supabase.rpc("get_weight_category", {
          weight_kg: profileData.weight,
          gender: profileData.gender,
        });
        setWeightCategory(categoryData);
      }

      // Vídeos aprovados
      const { data: videosData } = await supabase
        .from("videos")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(6);
      setVideos(videosData || []);

      // Campeonatos
      const { data: championshipsData } = await supabase
        .from("championships")
        .select("*")
        .eq("user_id", userId)
        .order("year", { ascending: false });
      setChampionships(championshipsData || []);

      // Contadores de torcida
      const { data: followersData } = await supabaseAny
        .from("user_follows")
        .select("id")
        .eq("followed_user_id", userId);
      setFollowersCount(followersData?.length || 0);

      const { data: followingData } = await supabaseAny
        .from("user_follows")
        .select("id")
        .eq("follower_user_id", userId);
      setFollowingCount(followingData?.length || 0);
    } catch (error) {
      console.error("Error loading profile:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o perfil.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getExperienceLevelLabel = (level: string) => {
    const labels: Record<string, string> = {
      beginner: "Iniciante",
      intermediate: "Intermediário",
      advanced: "Avançado",
      professional: "Profissional",
    };
    return labels[level] || level;
  };

  const isAthlete = profile?.user_type === "athlete";
  const isOwnProfile = currentUserId === userId;
  const canInteract = currentUserId && !isOwnProfile && isAthlete;

  // Atualiza contador quando clica em "Torcer / Deixar de torcer"
  const handleTorcidaChange = (isNowFollowing: boolean) => {
    setFollowersCount((prev) => Math.max(0, prev + (isNowFollowing ? 1 : -1)));
  };

  // Abre modal de torcida / torcendo
  const openSupportersModal = async (mode: "followers" | "following") => {
    if (!userId) return;

    const supabaseAny = supabase as any;
    setSupportersModalMode(mode);
    setSupportersModalOpen(true);
    setSupportersLoading(true);

    try {
      const isFollowers = mode === "followers";

      // 1) pega ids na tabela user_follows
      const { data: followRows, error: followsError } = await supabaseAny
        .from("user_follows")
        .select(isFollowers ? "follower_user_id" : "followed_user_id")
        .eq(isFollowers ? "followed_user_id" : "follower_user_id", userId);

      if (followsError) throw followsError;

      const ids =
        followRows?.map((row: any) =>
          isFollowers ? row.follower_user_id : row.followed_user_id,
        ) || [];

      if (!ids.length) {
        setSupportersList([]);
        return;
      }

      // 2) busca perfis desses ids
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, user_type")
        .in("user_id", ids);

      if (profilesError) throw profilesError;

      setSupportersList((profilesData || []) as SimpleUser[]);
    } catch (error) {
      console.error("Erro ao carregar torcida:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a lista de torcida.",
        variant: "destructive",
      });
    } finally {
      setSupportersLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Perfil não encontrado</h2>
          <Button onClick={() => navigate("/browse")}>Voltar para Busca</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
     
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* CARD DA ESQUERDA – Perfil */}
          <Card className="md:col-span-1">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-32 w-32 mb-4">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl">
                    {profile.full_name?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>

                <h1 className="text-2xl font-bold mb-2">
                  {profile.full_name}
                </h1>

                <Badge
                  variant={isAthlete ? "default" : "secondary"}
                  className="mb-2"
                >
                  {isAthlete ? "Atleta" : "Treinador"}
                </Badge>

                {/* CONTADORES DE TORCIDA DEBAIXO DO NOME */}
                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                  <button
                    type="button"
                    className="hover:underline"
                    onClick={() => openSupportersModal("followers")}
                  >
                    <span className="font-medium">{followersCount}</span> na
                    torcida
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    className="hover:underline"
                    onClick={() => openSupportersModal("following")}
                  >
                    <span className="font-medium">{followingCount}</span>{" "}
                    torcendo
                  </button>
                </div>

                {profile.location && (
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <MapPin className="h-4 w-4" />
                    {profile.location}
                  </div>
                )}

                {profile.category && (
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Trophy className="h-4 w-4" />
                    {profile.category}
                  </div>
                )}

                {/* Botões de interação */}
                {canInteract && (
                  <div className="flex flex-col gap-2 mt-4 w-full">
                    <TorcidaButton
                      targetUserId={profile.user_id}
                      onChange={handleTorcidaChange}
                    />

                    <SparringRequestButton
                      targetUserId={profile.user_id}
                      targetUserName={profile.full_name || "Este usuário"}
                    />

                    <Button variant="outline" className="gap-2" asChild>
                      <Link to={`/chat/${profile.user_id}`}>
                        <MessageCircle className="h-4 w-4" />
                        Conversar
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* CARD DA DIREITA – Sobre / info */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Sobre</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* BIO */}
              {profile.bio ? (
                <p className="text-muted-foreground">{profile.bio}</p>
              ) : (
                <p className="text-muted-foreground italic">
                  Este usuário ainda não adicionou uma biografia.
                </p>
              )}

              {/* Info específica para atleta */}
              {isAthlete && (
                <>
                  {profile.athlete_status && (
                    <div>
                      <h3 className="font-semibold mb-2">Status</h3>
                      <Badge variant="outline">
                        {profile.athlete_status === "amateur"
                          ? "Amador"
                          : "Profissional"}
                      </Badge>
                    </div>
                  )}

                  <div>
                    <h3 className="font-semibold mb-2">Histórico de Lutas</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardContent className="pt-4">
                          <p className="text-3xl font-bold text-primary">
                            {profile.amateur_fights}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Lutas Amadoras
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <p className="text-3xl font-bold text-primary">
                            {profile.professional_fights}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Lutas Profissionais
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </>
              )}

              {profile.experience_level && (
                <div>
                  <h3 className="font-semibold mb-2">Nível de Experiência</h3>
                  <Badge variant="secondary">
                    {getExperienceLevelLabel(profile.experience_level)}
                  </Badge>
                </div>
              )}

              {isAthlete && profile.weight && (
                <div>
                  <h3 className="font-semibold mb-2">Peso e Categoria</h3>
                  <p className="text-muted-foreground">
                    {profile.weight} kg
                    {weightCategory && (
                      <span className="ml-2 font-medium text-primary">
                        • {weightCategory}
                      </span>
                    )}
                  </p>
                </div>
              )}

              {isAthlete && (profile.gym_name || profile.gym_address) && (
                <div>
                  <h3 className="font-semibold mb-2">Local de Treino</h3>
                  {profile.gym_name && (
                    <p className="font-medium">{profile.gym_name}</p>
                  )}
                  {profile.gym_address && (
                    <p className="text-sm text-muted-foreground">
                      {profile.gym_address}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* CAMPEONATOS */}
        {isAthlete && championships.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Campeonatos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {championships.map((championship) => (
                  <Card key={championship.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <Trophy className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2">
                            {championship.championship_name}
                          </h3>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">
                              {championship.year}
                            </Badge>
                            {championship.is_champion ? (
                              <Badge className="bg-yellow-500 hover:bg-yellow-600">
                                🏆 Campeão
                              </Badge>
                            ) : championship.position ? (
                              <Badge variant="secondary">
                                {championship.position}º Lugar
                              </Badge>
                            ) : null}
                          </div>
                          {championship.opponent_name && (
                            <p className="text-sm text-muted-foreground mb-1">
                              <strong>Adversário:</strong>{" "}
                              {championship.opponent_name}
                            </p>
                          )}
                          {championship.notes && (
                            <p className="text-sm text-muted-foreground">
                              {championship.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* VÍDEOS */}
        {videos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Vídeos Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {videos.map((video) => (
                  <Card key={video.id} className="overflow-hidden">
                    <CardHeader className="p-0">
                      <div className="aspect-video bg-muted flex items-center justify-center">
                        <Video className="h-12 w-12 text-muted-foreground" />
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-1">{video.title}</h3>
                      {video.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {video.description}
                        </p>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-3"
                        onClick={() => window.open(video.video_url, "_blank")}
                      >
                        Assistir
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* MODAL – lista de torcida / torcendo */}
        <Dialog open={supportersModalOpen} onOpenChange={setSupportersModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {supportersModalMode === "followers"
                  ? "Torcida"
                  : "Torcendo por"}
              </DialogTitle>
              <DialogDescription>
                Clique em um usuário para ir ao perfil.
              </DialogDescription>
            </DialogHeader>

            {supportersLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : supportersList.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                Nenhum usuário encontrado.
              </p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {supportersList.map((user) => (
                  <button
                    key={user.user_id}
                    type="button"
                    className="w-full flex items-center gap-3 text-left hover:bg-accent rounded-md px-2 py-2"
                    onClick={() => {
                      setSupportersModalOpen(false);
                      navigate(`/profile/${user.user_id}`);
                    }}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback>
                        {user.full_name?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{user.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.user_type === "athlete"
                          ? "Atleta"
                          : user.user_type === "coach"
                          ? "Treinador"
                          : user.user_type === "referee"
                          ? "Árbitro"
                          : "Usuário"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default PublicProfile;