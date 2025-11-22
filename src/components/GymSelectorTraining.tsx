import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
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
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Gym {
  id: string;
  name: string;
  address: string | null;
}

interface GymSelectorTrainingProps {
  userId: string;
  selectedGymId: string | null;
  onSelectGym: (gymId: string | null, gymName: string) => void;
}

const GymSelectorTraining = ({ userId, selectedGymId, onSelectGym }: GymSelectorTrainingProps) => {
  const [open, setOpen] = useState(false);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [userGym, setUserGym] = useState<Gym | null>(null);
  const [selectedGym, setSelectedGym] = useState<Gym | null>(null);

  useEffect(() => {
    loadData();
  }, [userId]);

  useEffect(() => {
    if (selectedGymId && gyms.length > 0) {
      const gym = gyms.find(g => g.id === selectedGymId);
      if (gym) setSelectedGym(gym);
    }
  }, [selectedGymId, gyms]);

  const loadData = async () => {
    try {
      // Carregar academia do usuário
      const { data: memberData } = await supabase
        .from("gym_members")
        .select("gym_id, gyms(id, name, address)")
        .eq("user_id", userId)
        .single();

      if (memberData?.gyms) {
        const gymData = memberData.gyms as unknown as Gym;
        setUserGym(gymData);
        // Auto-seleciona a academia do usuário
        setSelectedGym(gymData);
        onSelectGym(gymData.id, gymData.name);
      }

      // Carregar todas as academias
      const { data: allGyms, error } = await supabase
        .from("gyms")
        .select("id, name, address")
        .order("name");

      if (error) throw error;
      setGyms(allGyms || []);
    } catch (error) {
      console.error("Error loading gyms:", error);
    }
  };

  const handleSelectGym = (gym: Gym | null) => {
    setSelectedGym(gym);
    setOpen(false);
    onSelectGym(gym?.id || null, gym?.name || "");
  };

  return (
    <div className="space-y-2">
      <Label>Onde você treinou?</Label>
      {userGym && (
        <p className="text-sm text-muted-foreground">
          Treino realizado na <span className="font-semibold">{userGym.name}</span>
        </p>
      )}
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
                {userGym && selectedGym.id !== userGym.id && " (outra academia)"}
              </div>
            ) : (
              "Selecione onde treinou..."
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
                      <span className="font-medium">
                        {gym.name}
                        {userGym && gym.id === userGym.id && " (sua academia)"}
                      </span>
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
  );
};

export default GymSelectorTraining;
