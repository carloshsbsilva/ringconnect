import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Plus, Clock, DollarSign } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Session {
  id: string;
  coach_id: string;
  title: string;
  description: string;
  price: number;
  duration_minutes: number;
  session_type: string;
  is_active: boolean;
  profiles?: {
    full_name: string;
    avatar_url: string;
  };
}

const Mentorship = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [userType, setUserType] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    duration_minutes: "",
    session_type: "video_analysis",
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("user_id", session.user.id)
        .single();

      if (profile) {
        setUserType(profile.user_type);
      }

      await loadSessions();
    } catch (error) {
      console.error("Error checking auth:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async () => {
    try {
      const { data, error } = await supabase
        .from("mentorship_sessions")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch coach profiles separately
      const coachIds = [...new Set(data?.map(s => s.coach_id) || [])];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", coachIds);

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
      
      const sessionsWithProfiles = data?.map(session => ({
        ...session,
        profiles: profilesMap.get(session.coach_id) || { full_name: "Treinador", avatar_url: "" }
      })) || [];

      setSessions(sessionsWithProfiles);
    } catch (error) {
      console.error("Error loading sessions:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as sessões.",
        variant: "destructive",
      });
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from("mentorship_sessions")
        .insert({
          coach_id: session.user.id,
          title: formData.title,
          description: formData.description,
          price: parseFloat(formData.price),
          duration_minutes: parseInt(formData.duration_minutes),
          session_type: formData.session_type,
          is_active: true,
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Sessão criada com sucesso!",
      });

      setFormData({
        title: "",
        description: "",
        price: "",
        duration_minutes: "",
        session_type: "video_analysis",
      });
      setOpen(false);
      await loadSessions();
    } catch (error) {
      console.error("Error creating session:", error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a sessão.",
        variant: "destructive",
      });
    }
  };

  const handleBookSession = async (sessionId: string, coachId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from("bookings")
        .insert({
          session_id: sessionId,
          athlete_id: session.user.id,
          coach_id: coachId,
          status: "pending",
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Solicitação de mentoria enviada! O treinador entrará em contato.",
      });
    } catch (error) {
      console.error("Error booking session:", error);
      toast({
        title: "Erro",
        description: "Não foi possível solicitar a mentoria.",
        variant: "destructive",
      });
    }
  };

  const getSessionTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      video_analysis: "Análise de Vídeo",
      training_plan: "Plano de Treino",
      technique_coaching: "Técnica de Boxe",
      strategy_consultation: "Consultoria Estratégica",
    };
    return types[type] || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Dashboard
          </Button>

          {userType === "coach" && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Sessão
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Nova Sessão de Mentoria</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateSession} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Título</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      placeholder="Ex: Análise Técnica Avançada"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="session_type">Tipo de Sessão</Label>
                    <select
                      id="session_type"
                      value={formData.session_type}
                      onChange={(e) =>
                        setFormData({ ...formData, session_type: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-input bg-background rounded-md"
                    >
                      <option value="video_analysis">Análise de Vídeo</option>
                      <option value="training_plan">Plano de Treino</option>
                      <option value="technique_coaching">Técnica de Boxe</option>
                      <option value="strategy_consultation">Consultoria Estratégica</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price">Preço (R$)</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.price}
                        onChange={(e) =>
                          setFormData({ ...formData, price: e.target.value })
                        }
                        placeholder="150.00"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="duration">Duração (min)</Label>
                      <Input
                        id="duration"
                        type="number"
                        min="15"
                        step="15"
                        value={formData.duration_minutes}
                        onChange={(e) =>
                          setFormData({ ...formData, duration_minutes: e.target.value })
                        }
                        placeholder="60"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="Descreva o que está incluído nesta sessão..."
                      rows={4}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Criar Sessão
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Mentoria e Sessões</h1>
          <p className="text-muted-foreground">
            Encontre treinadores especializados e agende sessões personalizadas
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((session) => (
            <Card key={session.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3 mb-3">
                  <Avatar>
                    <AvatarImage src={session.profiles?.avatar_url || undefined} />
                    <AvatarFallback>{session.profiles?.full_name?.[0] || "C"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{session.profiles?.full_name}</p>
                    <Badge variant="secondary">{getSessionTypeLabel(session.session_type)}</Badge>
                  </div>
                </div>
                <CardTitle>{session.title}</CardTitle>
                <CardDescription>{session.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{session.duration_minutes} minutos</span>
                  </div>
                  <div className="flex items-center gap-2 font-bold text-primary">
                    <DollarSign className="h-4 w-4" />
                    <span>R$ {session.price.toFixed(2)}</span>
                  </div>
                </div>
                {userType === "athlete" && (
                  <Button
                    className="w-full"
                    onClick={() => handleBookSession(session.id, session.coach_id)}
                  >
                    Contratar Sessão
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {sessions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              {userType === "coach"
                ? "Você ainda não criou nenhuma sessão. Comece criando sua primeira!"
                : "Nenhuma sessão disponível no momento."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Mentorship;
