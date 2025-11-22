import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Swords, Loader2 } from "lucide-react";

interface SparringRequestButtonProps {
  targetUserId: string;
  targetUserName: string;
}

export const SparringRequestButton = ({ targetUserId, targetUserName }: SparringRequestButtonProps) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleRequest = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const { error } = await supabase.from("sparring_requests").insert({
        requester_id: session.user.id,
        requested_id: targetUserId,
        message: message.trim() || null,
        status: "pending"
      });

      if (error) throw error;

      toast({
        title: "Solicitação enviada!",
        description: `${targetUserName} receberá sua solicitação de sparring`
      });

      setMessage("");
      setOpen(false);
    } catch (error) {
      console.error("Error requesting sparring:", error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a solicitação",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Swords className="h-4 w-4" />
          Solicitar Sparring
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solicitar Sparring com {targetUserName}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="message">Mensagem (opcional)</Label>
            <Textarea
              id="message"
              placeholder="Diga algo sobre quando e onde você gostaria de treinar..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          <Button onClick={handleRequest} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Swords className="mr-2 h-4 w-4" />
                Enviar Solicitação
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
