import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trophy, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Championship {
  id: string;
  championship_name: string;
  year: number;
  is_champion: boolean;
  position: number | null;
  opponent_name: string | null;
  notes: string | null;
}

const ChampionshipsManager = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [championships, setChampionships] = useState<Championship[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    championship_name: "",
    year: new Date().getFullYear(),
    is_champion: false,
    position: "",
    opponent_name: "",
    notes: "",
  });

  useEffect(() => {
    loadChampionships();
  }, []);

  const loadChampionships = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("championships")
        .select("*")
        .eq("user_id", session.user.id)
        .order("year", { ascending: false });

      if (error) throw error;
      setChampionships(data || []);
    } catch (error) {
      console.error("Error loading championships:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os campeonatos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase.from("championships").insert({
        user_id: session.user.id,
        championship_name: formData.championship_name,
        year: formData.year,
        is_champion: formData.is_champion,
        position: formData.position ? parseInt(formData.position) : null,
        opponent_name: formData.opponent_name || null,
        notes: formData.notes || null,
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Campeonato adicionado com sucesso!",
      });

      setFormData({
        championship_name: "",
        year: new Date().getFullYear(),
        is_champion: false,
        position: "",
        opponent_name: "",
        notes: "",
      });
      setShowForm(false);
      loadChampionships();
    } catch (error) {
      console.error("Error saving championship:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o campeonato.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("championships")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Campeonato removido com sucesso!",
      });

      loadChampionships();
    } catch (error) {
      console.error("Error deleting championship:", error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o campeonato.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!showForm && (
        <Button onClick={() => setShowForm(true)} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Campeonato
        </Button>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Novo Campeonato</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="championship_name">Nome do Campeonato *</Label>
                <Input
                  id="championship_name"
                  value={formData.championship_name}
                  onChange={(e) =>
                    setFormData({ ...formData, championship_name: e.target.value })
                  }
                  placeholder="Ex: Campeonato Brasileiro de Boxe"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="year">Ano *</Label>
                  <Input
                    id="year"
                    type="number"
                    min="1900"
                    max={new Date().getFullYear()}
                    value={formData.year}
                    onChange={(e) =>
                      setFormData({ ...formData, year: parseInt(e.target.value) })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="is_champion">Foi Campeão?</Label>
                  <select
                    id="is_champion"
                    value={formData.is_champion ? "true" : "false"}
                    onChange={(e) =>
                      setFormData({ ...formData, is_champion: e.target.value === "true" })
                    }
                    className="w-full px-3 py-2 border border-input bg-background rounded-md"
                  >
                    <option value="false">Não</option>
                    <option value="true">Sim</option>
                  </select>
                </div>
              </div>

              {!formData.is_champion && (
                <div className="space-y-2">
                  <Label htmlFor="position">Posição</Label>
                  <Input
                    id="position"
                    type="number"
                    min="1"
                    value={formData.position}
                    onChange={(e) =>
                      setFormData({ ...formData, position: e.target.value })
                    }
                    placeholder="Ex: 2 (para segundo lugar)"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="opponent_name">Adversário na Final</Label>
                <Input
                  id="opponent_name"
                  value={formData.opponent_name}
                  onChange={(e) =>
                    setFormData({ ...formData, opponent_name: e.target.value })
                  }
                  placeholder="Nome do adversário"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Detalhes adicionais sobre o campeonato..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {championships.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum campeonato adicionado ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {championships.map((championship) => (
            <Card key={championship.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-lg">
                        {championship.championship_name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{championship.year}</Badge>
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
                        <strong>Adversário:</strong> {championship.opponent_name}
                      </p>
                    )}
                    {championship.notes && (
                      <p className="text-sm text-muted-foreground">
                        {championship.notes}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(championship.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChampionshipsManager;
