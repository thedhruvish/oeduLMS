interface SafeHtmlRendererProps {
  html: string;
}

export function SafeHtmlRenderer({ html }: SafeHtmlRendererProps) {
  return (
    <div
      className="prose dark:prose-invert max-w-none text-muted-foreground text-sm leading-relaxed space-y-4"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
