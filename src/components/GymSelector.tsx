import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, Building2, UserPlus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Gym {
  id: string;
  name: string;
  address: string | null;
}

interface GymSelectorProps {
  userId: string;
  onGymSelect?: (gymId: string, gymName: string) => void;
}

const GymSelector = ({ userId, onGymSelect }: GymSelectorProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [selectedGym, setSelectedGym] = useState<Gym | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    loadGyms();
  }, []);

  useEffect(() => {
    if (selectedGym) {
      checkMembership();
    }
  }, [selectedGym]);

  const loadGyms = async () => {
    try {
      const { data, error } = await supabase
        .from("gyms")
        .select("id, name, address")
        .order("name");

      if (error) throw error;
      setGyms(data || []);
    } catch (error) {
      console.error("Error loading gyms:", error);
    }
  };

  const checkMembership = async () => {
    if (!selectedGym) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("gym_members")
        .select("id")
        .eq("gym_id", selectedGym.id)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      setIsMember(!!data);
    } catch (error) {
      console.error("Error checking membership:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGym = async () => {
    if (!selectedGym) return;

    setJoining(true);
    try {
      const { error } = await supabase
        .from("gym_members")
        .insert({
          gym_id: selectedGym.id,
          user_id: userId,
        });

      if (error) throw error;

      setIsMember(true);
      toast({
        title: "Sucesso!",
        description: `Você agora é membro da ${selectedGym.name}`,
      });

      if (onGymSelect) {
        onGymSelect(selectedGym.id, selectedGym.name);
      }
    } catch (error: any) {
      console.error("Error joining gym:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível entrar na academia.",
        variant: "destructive",
      });
    } finally {
      setJoining(false);
    }
  };

  const handleSelectGym = (gym: Gym) => {
    setSelectedGym(gym);
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Academia</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
            >
              {selectedGym ? (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {selectedGym.name}
                </div>
              ) : (
                "Selecione uma academia..."
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0">
            <Command>
              <CommandInput placeholder="Buscar academia..." />
              <CommandList>
                <CommandEmpty>Nenhuma academia encontrada.</CommandEmpty>
                <CommandGroup>
                  {gyms.map((gym) => (
                    <CommandItem
                      key={gym.id}
                      value={gym.name}
                      onSelect={() => handleSelectGym(gym)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedGym?.id === gym.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">{gym.name}</span>
                        {gym.address && (
                          <span className="text-xs text-muted-foreground">
                            {gym.address}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {selectedGym && (
        <div className="flex items-center gap-2">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verificando...
            </div>
          ) : isMember ? (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <Check className="h-4 w-4" />
              Você já é membro desta academia
            </div>
          ) : (
            <Button
              onClick={handleJoinGym}
              disabled={joining}
              className="w-full"
            >
              {joining ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Solicitar ser Membro
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default GymSelector;
