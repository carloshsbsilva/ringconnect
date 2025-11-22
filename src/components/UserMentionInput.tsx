import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Profile {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

interface UserMentionInputProps {
  value: string;
  onChange: (value: string, mentionedUserIds: string[]) => void;
  placeholder?: string;
  className?: string;
}

export const UserMentionInput = ({ 
  value, 
  onChange, 
  placeholder = "Escreva um comentário...",
  className = ""
}: UserMentionInputProps) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Profile[]>([]);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionedUsers, setMentionedUsers] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const searchUsers = async () => {
      if (!mentionQuery) {
        setSuggestions([]);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .ilike("full_name", `%${mentionQuery}%`)
        .limit(5);

      if (!error && data) {
        setSuggestions(data);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [mentionQuery]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = text.slice(0, cursorPosition);
    const lastAtSymbol = textBeforeCursor.lastIndexOf("@");

    if (lastAtSymbol !== -1) {
      const query = textBeforeCursor.slice(lastAtSymbol + 1);
      if (!query.includes(" ")) {
        setMentionQuery(query);
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }

    onChange(text, mentionedUsers);
  };

  const insertMention = (profile: Profile) => {
    const cursorPosition = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = value.slice(0, cursorPosition);
    const lastAtSymbol = textBeforeCursor.lastIndexOf("@");
    const textAfterCursor = value.slice(cursorPosition);
    
    const newText = 
      value.slice(0, lastAtSymbol) + 
      `@${profile.full_name} ` + 
      textAfterCursor;

    const newMentionedUsers = [...mentionedUsers, profile.user_id];
    setMentionedUsers(newMentionedUsers);
    onChange(newText, newMentionedUsers);
    setShowSuggestions(false);
    setMentionQuery("");
    
    // Focus back on textarea
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleTextChange}
        placeholder={placeholder}
        className={`${className} resize-none`}
        rows={3}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute bottom-full mb-1 w-full bg-background border rounded-md shadow-lg max-h-[200px] overflow-y-auto z-50">
          {suggestions.map((profile) => (
            <button
              key={profile.user_id}
              onClick={() => insertMention(profile)}
              className="w-full p-2 hover:bg-accent flex items-center gap-2 text-left"
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback>{profile.full_name?.[0]}</AvatarFallback>
              </Avatar>
              <span className="text-sm">{profile.full_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
