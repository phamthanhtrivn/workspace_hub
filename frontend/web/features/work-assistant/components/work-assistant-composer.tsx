import { ArrowUp, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  question: string;
  onQuestionChange: (question: string) => void;
  onSend: (question: string) => void;
  onStop: () => void;
  busy: boolean;
  disabled: boolean;
  error: string;
  canRetry: boolean;
  retrying: boolean;
  onRetry: () => void;
};

export default function WorkAssistantComposer({
  question,
  onQuestionChange,
  onSend,
  onStop,
  busy,
  disabled,
  error,
  canRetry,
  retrying,
  onRetry,
}: Props) {
  return (
    <form
      className="shrink-0 space-y-2 border-t bg-background p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      onSubmit={(event) => {
        event.preventDefault();
        onSend(question);
      }}
    >
      {error && (
        <div className="space-y-2">
          <p role="alert" className="text-xs text-destructive">{error}</p>
          {canRetry && (
            <Button type="button" variant="outline" size="sm"
              loading={retrying}
              onClick={onRetry}>
              Retry loading conversation
            </Button>
          )}
        </div>
      )}
      <label className="sr-only" htmlFor="work-question">
        Question for AI Assistant
      </label>
      <div className="flex items-end gap-2">
        <Textarea
          id="work-question"
          rows={2}
          maxLength={4000}
          value={question}
          disabled={busy || disabled}
          onChange={(event) => onQuestionChange(event.target.value)}
          placeholder="Ask about your work..."
          className="max-h-32 min-h-16 flex-1 resize-y rounded-lg border bg-background p-2 text-sm"
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              if (!busy && !disabled && question.trim()) onSend(question);
            }
          }}
        />
        {busy ? (
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Stop response"
            onClick={() => onStop()}
          >
            <Square />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon"
            aria-label="Send question"
            disabled={!question.trim() || disabled}
          >
            <ArrowUp />
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        AI can make mistakes. Check tasks and deadlines.
      </p>
    </form>
  );
}
