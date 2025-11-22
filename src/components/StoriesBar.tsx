import { Plus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface StoriesBarProps {
  currentUserId: string | null;
}

export const StoriesBar: React.FC<StoriesBarProps> = ({ currentUserId }) => {
  // por enquanto, só placeholders de bastidores
  const mockStories = [
    { id: "1", name: "Treino de hoje", thumb: "/placeholder/treino.jpg" },
    { id: "2", name: "Pesagem", thumb: "/placeholder/pesagem.jpg" },
    { id: "3", name: "Bastidores do evento", thumb: "/placeholder/evento.jpg" },
  ];

  return (
    <div className="space-y-1 w-full">
      {/* Título + descrição */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-800">
            Bastidores
          </h2>
          {/* Texto longo só em telas >= sm */}
          <span className="hidden sm:inline text-[11px] text-slate-500">
            Clipes rápidos de treino, bastidores e dia a dia no ringue
          </span>
        </div>

        {/* Versão curta só no mobile */}
        <span className="sm:hidden text-[10px] text-slate-500">
          Treinos e bastidores do ringue
        </span>
      </div>

      <ScrollArea className="-mx-2 px-2 w-full">
        <div className="flex items-center gap-3 pb-2">
          {/* Primeiro: criar bastidor */}
          <button
            className="flex flex-col items-center gap-1"
            onClick={() => console.log("Criar bastidor")}
          >
            <div className="h-14 w-14 rounded-full border-2 border-dashed border-primary/60 flex items-center justify-center bg-white">
              <Plus className="h-5 w-5 text-primary" />
            </div>
            <span className="text-[11px] text-slate-600">
              {currentUserId ? "Seu bastidor" : "Entrar"}
            </span>
          </button>

          {/* Stories de outros */}
          {mockStories.map((story) => (
            <button
              key={story.id}
              className="flex flex-col items-center gap-1"
              onClick={() => console.log("Abrir bastidor", story.id)}
            >
              <div className="p-[2px] rounded-full bg-gradient-to-tr from-blue-500 to-red-500">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={story.thumb} />
                  <AvatarFallback>
                    {story.name[0] || "B"}
                  </AvatarFallback>
                </Avatar>
              </div>
              <span className="text-[11px] max-w-[70px] text-center text-slate-600 truncate">
                {story.name}
              </span>
            </button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};
