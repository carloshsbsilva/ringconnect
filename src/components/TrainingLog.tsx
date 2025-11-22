import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Dumbbell } from "lucide-react";
import GymSelectorTraining from "@/components/GymSelectorTraining";

const TrainingLog = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [trainingDate, setTrainingDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [formData, setFormData] = useState({
    duration_hours: 0,
    did_sparring: false,
    did_sparring_light: false,
    notes: "",
    gym_id: null as string | null,
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      setUserId(session.user.id);
    } catch (error) {
      console.error("Error checking auth:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Validar que a data não é futura
      const selectedDate = new Date(trainingDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate > today) {
        toast({
          title: "Data inválida",
          description: "Não é possível registrar treinos futuros",
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      const logData = {
        user_id: session.user.id,
        date: trainingDate,
        training_date: trainingDate,
        duration_hours: formData.duration_hours,
        did_sparring: formData.did_sparring,
        did_sparring_light: formData.did_sparring_light,
        notes: formData.notes,
        gym_id: formData.gym_id,
      };

      // Sempre criar um novo registro de treino
      const { error } = await supabase
        .from("training_logs")
        .insert(logData);

      if (error) throw error;

      // Criar postagem no feed
      let content = `Treinou por ${formData.duration_hours}h`;
      if (formData.did_sparring) content += " e fez sparring";
      if (formData.notes) content += `\n\n${formData.notes}`;

      await supabase.from("feed_posts").insert({
        user_id: session.user.id,
        post_type: "training",
        content,
        training_duration: formData.duration_hours,
        did_sparring: formData.did_sparring,
        gym_id: formData.gym_id,
      });

      toast({
        title: "Sucesso",
        description: "Treino postado com sucesso!",
      });

      // Limpar o formulário
      setFormData({
        duration_hours: 0,
        did_sparring: false,
        did_sparring_light: false,
        notes: "",
        gym_id: null,
      });
      setTrainingDate(new Date().toISOString().split('T')[0]);
    } catch (error) {
      console.error("Error saving training log:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o treino.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Dumbbell className="h-5 w-5" />
          Registrar Treino
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {userId && (
          <GymSelectorTraining
            userId={userId}
            selectedGymId={formData.gym_id}
            onSelectGym={(gymId, gymName) => {
              setFormData({ ...formData, gym_id: gymId });
            }}
          />
        )}

        <div className="space-y-2">
          <Label htmlFor="training-date">Data do treino</Label>
          <Input
            id="training-date"
            type="date"
            value={trainingDate}
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => setTrainingDate(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Apenas datas passadas são permitidas
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="duration">Horas de Treino</Label>
          <Input
            id="duration"
            type="number"
            step="0.5"
            min="0"
            max="24"
            value={formData.duration_hours || ""}
            onChange={(e) =>
              setFormData({ ...formData, duration_hours: parseFloat(e.target.value) || 0 })
            }
            placeholder="Ex: 2.5"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="sparring"
            checked={formData.did_sparring}
            onCheckedChange={(checked) =>
              setFormData({ 
                ...formData, 
                did_sparring: checked as boolean
              })
            }
          />
          <Label htmlFor="sparring" className="cursor-pointer">
            Fiz sparring hoje
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="sparring-light"
            checked={formData.did_sparring_light}
            onCheckedChange={(checked) =>
              setFormData({ 
                ...formData, 
                did_sparring_light: checked as boolean
              })
            }
          />
          <Label htmlFor="sparring-light" className="cursor-pointer">
            Fiz sparring light (toquinho)
          </Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Observações (opcional)</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
            placeholder="Como foi o treino? O que você trabalhou?"
            rows={3}
          />
        </div>

        <Button 
          onClick={handleSave} 
          disabled={saving || formData.duration_hours === 0}
          className="w-full"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Postando...
            </>
          ) : (
            "Postar Treino"
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default TrainingLog;
