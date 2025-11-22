import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Building2, 
  MapPin, 
  Users, 
  Heart,
  Loader2,
  MessageCircle,
  DollarSign
} from "lucide-react";

interface Gym {
  id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  address: string | null;
  owner_id: string;
  created_at: string;
  monthly_fee: number | null;
  private_class_fee: number | null;
}

interface GymStats {
  members: number;
  followers: number;
}

const GymProfile = () => {
  const { gymId } = useParams<{ gymId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [gym, setGym] = useState<Gym | null>(null);
  const [stats, setStats] = useState<GymStats>({ members: 0, followers: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadGymProfile();
  }, [gymId]);

  const loadGymProfile = async () => {
    try {
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUserId(session.user.id);
      }

      // Load gym data
      const { data: gymData, error: gymError } = await supabase
        .from("gyms")
        .select("*")
        .eq("id", gymId)
        .single();

      if (gymError) throw gymError;
      setGym(gymData);

      // Load stats
      const { count: membersCount } = await supabase
        .from("gym_members")
        .select("*", { count: "exact", head: true })
        .eq("gym_id", gymId);

      const { count: followersCount } = await supabase
        .from("gym_followers")
        .select("*", { count: "exact", head: true })
        .eq("gym_id", gymId);

      setStats({
        members: membersCount || 0,
        followers: followersCount || 0,
      });

      // Check if current user is following
      if (session) {
        const { data: followData } = await supabase
          .from("gym_followers")
          .select("id")
          .eq("gym_id", gymId)
          .eq("user_id", session.user.id)
          .maybeSingle();

        setIsFollowing(!!followData);
      }
    } catch (error) {
      console.error("Error loading gym profile:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o perfil da academia.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!currentUserId) {
      toast({
        title: "Autenticação necessária",
        description: "Faça login para seguir esta academia.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from("gym_followers")
          .delete()
          .eq("gym_id", gymId)
          .eq("user_id", currentUserId);

        if (error) throw error;

        setIsFollowing(false);
        setStats(prev => ({ ...prev, followers: prev.followers - 1 }));
        toast({
          title: "Sucesso",
          description: "Você deixou de seguir esta academia.",
        });
      } else {
        // Follow
        const { error } = await supabase
          .from("gym_followers")
          .insert({
            gym_id: gymId,
            user_id: currentUserId,
          });

        if (error) throw error;

        setIsFollowing(true);
        setStats(prev => ({ ...prev, followers: prev.followers + 1 }));
        toast({
          title: "Sucesso",
          description: "Você agora está seguindo esta academia!",
        });
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status de seguidor.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!gym) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Academia não encontrada</h1>
        <p className="text-muted-foreground mb-6">
          Esta academia não existe ou foi removida.
        </p>
        <Button onClick={() => navigate("/browse")}>
          Voltar para Busca
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto p-4 md:p-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <Card>
          <CardContent className="pt-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row gap-6 mb-6">
              <Avatar className="h-32 w-32 mx-auto md:mx-0">
                <AvatarImage src={gym.logo_url || ""} />
                <AvatarFallback>
                  <Building2 className="h-16 w-16" />
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl font-bold mb-2">{gym.name}</h1>
                
                {gym.address && (
                  <div className="flex items-center justify-center md:justify-start gap-2 text-muted-foreground mb-4">
                    <MapPin className="h-4 w-4" />
                    <span>{gym.address}</span>
                  </div>
                )}

                {/* Stats */}
                <div className="flex gap-4 justify-center md:justify-start mb-4">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {stats.members} membros
                  </Badge>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Heart className="h-3 w-3" />
                    {stats.followers} seguidores
                  </Badge>
                </div>

                {/* Follow Button */}
                {currentUserId && currentUserId !== gym.owner_id && (
                  <div className="flex gap-2">
                    <Button
                      onClick={handleFollow}
                      variant={isFollowing ? "outline" : "default"}
                      className="flex-1"
                    >
                      {isFollowing ? (
                        <>
                          <Heart className="mr-2 h-4 w-4 fill-current" />
                          Seguindo
                        </>
                      ) : (
                        <>
                          <Heart className="mr-2 h-4 w-4" />
                          Seguir
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/chat/${gym.owner_id}?gym=${gymId}`)}
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Conversar
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <Separator className="my-6" />

            {/* Pricing Section */}
            {(gym.monthly_fee || gym.private_class_fee) && (
              <>
                <div>
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Valores
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {gym.monthly_fee && (
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-sm text-muted-foreground mb-1">Mensalidade</p>
                          <p className="text-2xl font-bold">
                            R$ {gym.monthly_fee.toFixed(2).replace('.', ',')}
                          </p>
                        </CardContent>
                      </Card>
                    )}
                    {gym.private_class_fee && (
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-sm text-muted-foreground mb-1">Aula Particular</p>
                          <p className="text-2xl font-bold">
                            R$ {gym.private_class_fee.toFixed(2).replace('.', ',')}
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Para mais informações sobre valores e planos, entre em contato com a academia.
                  </p>
                </div>
                <Separator className="my-6" />
              </>
            )}

            {/* Description Section */}
            {gym.description && (
              <div>
                <h2 className="text-xl font-semibold mb-3">Sobre a Academia</h2>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {gym.description}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GymProfile;
