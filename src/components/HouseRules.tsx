import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Plus, Pencil, Check } from "lucide-react";

interface HouseRulesProps {
  rules: string[];
  onRulesChange: (rules: string[]) => void;
}

interface InternalRule {
  id: string;
  text: string;
}

export function HouseRules({ rules, onRulesChange }: HouseRulesProps) {
  const [newRule, setNewRule] = useState("");
  const [internal, setInternal] = useState<InternalRule[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  // Track the text of rules we just emitted upward, so we can detect external (parent) changes.
  const lastEmitted = useRef<string[] | null>(null);

  const defaultRules = [
    "All items should be returned in original condition.",
    "Normal wear and tear acceptable. Please notify owner of any damage or issues.",
    "All items should be returned per owner's instruction.",
  ];

  // Sync internal stable-id list with parent `rules` prop, but only when it
  // actually changes from outside (e.g. AI loads new rules). Avoid wiping IDs
  // whenever we ourselves emitted the change.
  useEffect(() => {
    const lastEm = lastEmitted.current;
    const sameAsLastEmit =
      lastEm && lastEm.length === rules.length && lastEm.every((r, i) => r === rules[i]);
    if (sameAsLastEmit) return;

    // Dedupe incoming rules (preserve first occurrence order)
    const seen = new Set<string>();
    const deduped: string[] = [];
    for (const r of rules) {
      const key = r.trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      deduped.push(r);
    }

    setInternal(deduped.map((text) => ({ id: crypto.randomUUID(), text })));
    lastEmitted.current = deduped;
  }, [rules]);

  const emit = (next: InternalRule[]) => {
    const texts = next.map((r) => r.text);
    lastEmitted.current = texts;
    setInternal(next);
    onRulesChange(texts);
  };

  const handleAddRule = () => {
    const trimmed = newRule.trim();
    if (!trimmed) return;
    if (internal.some((r) => r.text === trimmed)) {
      setNewRule("");
      return;
    }
    emit([...internal, { id: crypto.randomUUID(), text: trimmed }]);
    setNewRule("");
  };

  const handleRemoveRule = (id: string) => {
    emit(internal.filter((r) => r.id !== id));
  };

  const handleStartEdit = (rule: InternalRule) => {
    setEditingId(rule.id);
    setEditingText(rule.text);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    const trimmed = editingText.trim();
    if (!trimmed) {
      // Treat empty edit as a delete
      emit(internal.filter((r) => r.id !== editingId));
    } else {
      emit(internal.map((r) => (r.id === editingId ? { ...r, text: trimmed } : r)));
    }
    setEditingId(null);
    setEditingText("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingText("");
  };

  const handleLoadDefaults = () => {
    emit(defaultRules.map((text) => ({ id: crypto.randomUUID(), text })));
  };

  return (
    <div className="space-y-4">
      {internal.length === 0 && (
        <div className="text-center py-6">
          <p className="text-muted-foreground mb-4">No rules added yet.</p>
          <Button onClick={handleLoadDefaults} variant="outline" size="sm">
            Load Default Rules
          </Button>
        </div>
      )}

      {internal.map((rule) => (
        <div
          key={rule.id}
          className="flex items-start gap-2 p-3 bg-sand/20 rounded-sm border border-sand"
        >
          {editingId === rule.id ? (
            <>
              <Input
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSaveEdit();
                  } else if (e.key === "Escape") {
                    handleCancelEdit();
                  }
                }}
                autoFocus
                className="flex-1 border-border"
              />
              <Button
                onClick={handleSaveEdit}
                variant="ghost"
                size="sm"
                className="h-auto p-1"
                aria-label="Save rule"
              >
                <Check className="h-4 w-4 text-deep-brown" />
              </Button>
              <Button
                onClick={handleCancelEdit}
                variant="ghost"
                size="sm"
                className="h-auto p-1"
                aria-label="Cancel edit"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </Button>
            </>
          ) : (
            <>
              <div className="flex-1 text-sm text-foreground">{rule.text}</div>
              <Button
                onClick={() => handleStartEdit(rule)}
                variant="ghost"
                size="sm"
                className="h-auto p-1 hover:bg-accent/10"
                aria-label="Edit rule"
              >
                <Pencil className="h-4 w-4 text-deep-brown" />
              </Button>
              <Button
                onClick={() => handleRemoveRule(rule.id)}
                variant="ghost"
                size="sm"
                className="h-auto p-1 hover:bg-terracotta/10"
                aria-label="Remove rule"
              >
                <X className="h-4 w-4 text-terracotta" />
              </Button>
            </>
          )}
        </div>
      ))}

      <div className="space-y-2">
        <Label htmlFor="newRule" className="text-deep-brown font-medium">
          Add a custom rule
        </Label>
        <div className="flex gap-2">
          <Input
            id="newRule"
            placeholder="Enter a new rule..."
            value={newRule}
            onChange={(e) => setNewRule(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddRule();
              }
            }}
            className="flex-1 border-border"
          />
          <Button onClick={handleAddRule} disabled={!newRule.trim()} variant="outline">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
