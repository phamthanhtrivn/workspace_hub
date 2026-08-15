"use client";

import { useCallback } from "react";

interface UseTextFormattingProps {
  message: string;
  setMessage: React.Dispatch<React.SetStateAction<string>>;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export type FormattingType =
  | "bold"
  | "italic"
  | "strikethrough"
  | "heading"
  | "link"
  | "code"
  | "quote"
  | "bullet"
  | "number";

export function useTextFormatting({
  message,
  setMessage,
  textareaRef,
}: UseTextFormattingProps) {
  const applyFormatting = useCallback(
    (formatType: FormattingType) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = message;
      const selectedText = text.substring(start, end);

      // 1. Line-level formatting (heading, quote, bullet, number)
      if (
        formatType === "heading" ||
        formatType === "quote" ||
        formatType === "bullet" ||
        formatType === "number"
      ) {
        const beforeText = text.substring(0, start);
        const lineStart = beforeText.lastIndexOf("\n") + 1;
        const afterText = text.substring(end);
        const nextNewline = afterText.indexOf("\n");
        const lineEnd = nextNewline === -1 ? text.length : end + nextNewline;
        const currentLine = text.substring(lineStart, lineEnd);

        const headingRegex = /^#{1,6}\s+/;
        const quoteRegex = /^>\s+/;
        const bulletRegex = /^[\-\*]\s+/;
        const numberRegex = /^\d+\.\s+/;

        let cleanLine = currentLine;
        let existingFormat: "heading" | "quote" | "bullet" | "number" | null = null;
        let originalPrefixLength = 0;

        const hMatch = currentLine.match(headingRegex);
        const qMatch = currentLine.match(quoteRegex);
        const bMatch = currentLine.match(bulletRegex);
        const nMatch = currentLine.match(numberRegex);

        if (hMatch) {
          existingFormat = "heading";
          cleanLine = currentLine.replace(headingRegex, "");
          originalPrefixLength = hMatch[0].length;
        } else if (qMatch) {
          existingFormat = "quote";
          cleanLine = currentLine.replace(quoteRegex, "");
          originalPrefixLength = qMatch[0].length;
        } else if (bMatch) {
          existingFormat = "bullet";
          cleanLine = currentLine.replace(bulletRegex, "");
          originalPrefixLength = bMatch[0].length;
        } else if (nMatch) {
          existingFormat = "number";
          cleanLine = currentLine.replace(numberRegex, "");
          originalPrefixLength = nMatch[0].length;
        }

        let newLine = "";
        let newPrefixLength = 0;

        if (existingFormat === formatType) {
          newLine = cleanLine;
          newPrefixLength = 0;
        } else {
          switch (formatType) {
            case "heading":
              newLine = "## " + cleanLine;
              newPrefixLength = 3;
              break;
            case "quote":
              newLine = "> " + cleanLine;
              newPrefixLength = 2;
              break;
            case "bullet":
              newLine = "- " + cleanLine;
              newPrefixLength = 2;
              break;
            case "number":
              newLine = "1. " + cleanLine;
              newPrefixLength = 3;
              break;
          }
        }

        const newMessage =
          text.substring(0, lineStart) + newLine + text.substring(lineEnd);
        setMessage(newMessage);

        setTimeout(() => {
          textarea.focus();
          const delta = newPrefixLength - originalPrefixLength;
          const newCursorPos = Math.max(lineStart, start + delta);
          textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);

        return;
      }

      // 2. Inline/Block formatting (bold, italic, strikethrough, link, code)
      let replacement = "";
      let selectionStartOffset = 0;
      let selectionEndOffset = 0;
      const shouldSelectTextRange = false;

      if (selectedText) {
        switch (formatType) {
          case "bold":
            replacement = `**${selectedText}**`;
            selectionStartOffset = replacement.length;
            selectionEndOffset = replacement.length;
            break;
          case "italic":
            replacement = `*${selectedText}*`;
            selectionStartOffset = replacement.length;
            selectionEndOffset = replacement.length;
            break;
          case "strikethrough":
            replacement = `~~${selectedText}~~`;
            selectionStartOffset = replacement.length;
            selectionEndOffset = replacement.length;
            break;
          case "link":
            replacement = `[${selectedText}]()`;
            selectionStartOffset = selectedText.length + 3; // Position inside ()
            selectionEndOffset = selectionStartOffset;
            break;
          case "code":
            if (selectedText.includes("\n")) {
              replacement = `\`\`\`\n${selectedText}\n\`\`\``;
            } else {
              replacement = `\`${selectedText}\``;
            }
            selectionStartOffset = replacement.length;
            selectionEndOffset = replacement.length;
            break;
        }
      } else {
        switch (formatType) {
          case "bold":
            replacement = "****";
            selectionStartOffset = 2;
            selectionEndOffset = 2;
            break;
          case "italic":
            replacement = "**";
            selectionStartOffset = 1;
            selectionEndOffset = 1;
            break;
          case "strikethrough":
            replacement = "~~~~";
            selectionStartOffset = 2;
            selectionEndOffset = 2;
            break;
          case "link":
            replacement = "[]()";
            selectionStartOffset = 1; // inside []
            selectionEndOffset = 1;
            break;
          case "code":
            const beforeText = text.substring(0, start);
            const lineStart = beforeText.lastIndexOf("\n") + 1;
            const afterText = text.substring(end);
            const nextNewline = afterText.indexOf("\n");
            const lineEnd =
              nextNewline === -1 ? text.length : end + nextNewline;
            const currentLine = text.substring(lineStart, lineEnd);

            if (currentLine.trim() === "") {
              replacement = "```\n\n```";
              selectionStartOffset = 4; // empty line inside ```
              selectionEndOffset = 4;
            } else {
              replacement = "``";
              selectionStartOffset = 1; // inside ``
              selectionEndOffset = 1;
            }
            break;
        }
      }

      const newMessage =
        text.substring(0, start) + replacement + text.substring(end);
      setMessage(newMessage);

      setTimeout(() => {
        textarea.focus();
        if (shouldSelectTextRange) {
          textarea.setSelectionRange(
            start + selectionStartOffset,
            start + selectionEndOffset,
          );
        } else {
          textarea.setSelectionRange(
            start + selectionStartOffset,
            start + selectionStartOffset,
          );
        }
      }, 0);
    },
    [message, setMessage, textareaRef],
  );

  const handleListKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>): boolean => {
      if (e.key === "Enter" && e.shiftKey) {
        const textarea = textareaRef.current;
        if (textarea) {
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const text = message;

          const beforeText = text.substring(0, start);
          const lineStart = beforeText.lastIndexOf("\n") + 1;
          const afterText = text.substring(end);
          const nextNewline = afterText.indexOf("\n");
          const lineEnd =
            nextNewline === -1 ? text.length : end + nextNewline;
          const currentLine = text.substring(lineStart, lineEnd);

          const bulletMatch = currentLine.match(/^([\-\*])\s*(.*)$/);
          const numberMatch = currentLine.match(/^(\d+)\.\s*(.*)$/);

          if (bulletMatch) {
            e.preventDefault();
            const bulletSymbol = bulletMatch[1];
            const bulletText = bulletMatch[2];

            if (bulletText.trim() === "") {
              // Toggle list off
              const newMessage =
                text.substring(0, lineStart) + text.substring(lineEnd);
              setMessage(newMessage);
              setTimeout(() => {
                textarea.setSelectionRange(lineStart, lineStart);
              }, 0);
            } else {
              // Continue list
              const insertText = `\n${bulletSymbol} `;
              const newMessage =
                text.substring(0, start) + insertText + text.substring(end);
              setMessage(newMessage);
              setTimeout(() => {
                const newPos = start + insertText.length;
                textarea.setSelectionRange(newPos, newPos);
              }, 0);
            }
            return true;
          }

          if (numberMatch) {
            e.preventDefault();
            const currentNum = parseInt(numberMatch[1], 10);
            const numberText = numberMatch[2];

            if (numberText.trim() === "") {
              // Toggle list off
              const newMessage =
                text.substring(0, lineStart) + text.substring(lineEnd);
              setMessage(newMessage);
              setTimeout(() => {
                textarea.setSelectionRange(lineStart, lineStart);
              }, 0);
            } else {
              // Continue list with next number
              const insertText = `\n${currentNum + 1}. `;
              const newMessage =
                text.substring(0, start) + insertText + text.substring(end);
              setMessage(newMessage);
              setTimeout(() => {
                const newPos = start + insertText.length;
                textarea.setSelectionRange(newPos, newPos);
              }, 0);
            }
            return true;
          }
        }
      }
      return false;
    },
    [message, setMessage, textareaRef],
  );

  return {
    applyFormatting,
    handleListKeyDown,
  };
}
