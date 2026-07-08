import * as React from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getRoot,
  $getSelection,
  $createParagraphNode,
  FORMAT_TEXT_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
  TextFormatType,
  ElementFormatType,
  EditorState,
  LexicalEditor,
  $isRangeSelection,
} from "lexical";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import { HeadingNode, $createHeadingNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo,
  Redo,
  Heading1,
  Heading2,
  List,
} from "lucide-react";
import { cn } from "@oedulms/ui/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
class LexicalErrorBoundary extends React.Component<any, any> {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error) {
    console.error("Lexical editor crashed:", error);
  }
  render() {
    if (this.state.hasError && this.state.error) {
      return this.props.fallback(this.state.error);
    }
    return this.props.children;
  }
}

// Editor configuration theme
const theme = {
  paragraph: "mb-2 text-sm text-foreground leading-relaxed",
  text: {
    bold: "font-bold",
    italic: "italic",
    underline: "underline",
    strikethrough: "line-through",
  },
  heading: {
    h1: "text-2xl font-bold mb-4 mt-6 text-foreground",
    h2: "text-xl font-bold mb-3 mt-5 text-foreground",
  },
  list: {
    ul: "list-disc pl-5 mb-2",
    ol: "list-decimal pl-5 mb-2",
  },
};

function Toolbar() {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = React.useState(false);
  const [isItalic, setIsItalic] = React.useState(false);
  const [isUnderline, setIsUnderline] = React.useState(false);
  const [isStrikethrough, setIsStrikethrough] = React.useState(false);

  React.useEffect(() => {
    return editor.registerUpdateListener(({ editorState }: { editorState: EditorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          setIsBold(selection.hasFormat("bold"));
          setIsItalic(selection.hasFormat("italic"));
          setIsUnderline(selection.hasFormat("underline"));
          setIsStrikethrough(selection.hasFormat("strikethrough"));
        }
      });
    });
  }, [editor]);

  const handleFormat = (type: TextFormatType) => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, type);
  };

  const handleAlign = (type: ElementFormatType) => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, type);
  };

  const handleHeading = (tag: "h1" | "h2" | "p") => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        if (tag === "h1" || tag === "h2") {
          $setBlocksType(selection, () => $createHeadingNode(tag));
        } else {
          $setBlocksType(selection, () => $createParagraphNode());
        }
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/20">
      {/* Undo/Redo */}
      <button
        type="button"
        onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
        className="p-1.5 rounded hover:bg-muted text-muted-foreground transition"
        title="Undo"
      >
        <Undo className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
        className="p-1.5 rounded hover:bg-muted text-muted-foreground transition"
        title="Redo"
      >
        <Redo className="size-4" />
      </button>

      <div className="w-[1px] h-4 bg-border mx-1" />

      {/* Headings */}
      <button
        type="button"
        onClick={() => handleHeading("h1")}
        className="p-1.5 rounded hover:bg-muted text-muted-foreground transition"
        title="Heading 1"
      >
        <Heading1 className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => handleHeading("h2")}
        className="p-1.5 rounded hover:bg-muted text-muted-foreground transition"
        title="Heading 2"
      >
        <Heading2 className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => handleHeading("p")}
        className="p-1.5 rounded hover:bg-muted text-muted-foreground transition"
        title="Paragraph"
      >
        <List className="size-4" />
      </button>

      <div className="w-[1px] h-4 bg-border mx-1" />

      {/* Inline Text Formats */}
      <button
        type="button"
        onClick={() => handleFormat("bold")}
        className={cn(
          "p-1.5 rounded hover:bg-muted text-muted-foreground transition",
          isBold && "bg-muted text-primary"
        )}
        title="Bold"
      >
        <Bold className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => handleFormat("italic")}
        className={cn(
          "p-1.5 rounded hover:bg-muted text-muted-foreground transition",
          isItalic && "bg-muted text-primary"
        )}
        title="Italic"
      >
        <Italic className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => handleFormat("underline")}
        className={cn(
          "p-1.5 rounded hover:bg-muted text-muted-foreground transition",
          isUnderline && "bg-muted text-primary"
        )}
        title="Underline"
      >
        <Underline className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => handleFormat("strikethrough")}
        className={cn(
          "p-1.5 rounded hover:bg-muted text-muted-foreground transition",
          isStrikethrough && "bg-muted text-primary"
        )}
        title="Strikethrough"
      >
        <Strikethrough className="size-4" />
      </button>

      <div className="w-[1px] h-4 bg-border mx-1" />

      {/* Alignments */}
      <button
        type="button"
        onClick={() => handleAlign("left")}
        className="p-1.5 rounded hover:bg-muted text-muted-foreground transition"
        title="Align Left"
      >
        <AlignLeft className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => handleAlign("center")}
        className="p-1.5 rounded hover:bg-muted text-muted-foreground transition"
        title="Align Center"
      >
        <AlignCenter className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => handleAlign("right")}
        className="p-1.5 rounded hover:bg-muted text-muted-foreground transition"
        title="Align Right"
      >
        <AlignRight className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => handleAlign("justify")}
        className="p-1.5 rounded hover:bg-muted text-muted-foreground transition"
        title="Align Justify"
      >
        <AlignJustify className="size-4" />
      </button>
    </div>
  );
}

// Initial HTML Loader Plugin
function InitialContentPlugin({ value }: { value: string }) {
  const [editor] = useLexicalComposerContext();
  const hasInitialized = React.useRef(false);

  React.useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    editor.update(() => {
      const parser = new DOMParser();
      const dom = parser.parseFromString(value || "<p></p>", "text/html");
      const nodes = $generateNodesFromDOM(editor, dom);
      
      const root = $getRoot();
      root.clear();
      root.append(...nodes);
    });
  }, [editor, value]);

  return null;
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function RichTextEditor({ value, onChange, disabled }: RichTextEditorProps) {
  const initialConfig = {
    namespace: "CourseDescriptionEditor",
    theme,
    nodes: [HeadingNode],
    onError: (error: Error) => {
      console.error("Lexical Editor Error:", error);
    },
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="border rounded-md overflow-hidden bg-card focus-within:ring-1 focus-within:ring-ring focus-within:border-ring">
        {!disabled && <Toolbar />}
        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className={cn(
                  "min-h-[200px] max-h-[400px] overflow-y-auto p-4 outline-none text-sm text-foreground",
                  disabled && "opacity-60 cursor-not-allowed"
                )}
              />
            }
            placeholder={
              <div className="absolute top-4 left-4 text-muted-foreground text-sm pointer-events-none select-none">
                Write detailed description here...
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <InitialContentPlugin value={value} />
          <OnChangePlugin
            onChange={(editorState: EditorState, editor: LexicalEditor) => {
              editorState.read(() => {
                const html = $generateHtmlFromNodes(editor, null);
                onChange(html);
              });
            }}
          />
        </div>
      </div>
    </LexicalComposer>
  );
}
