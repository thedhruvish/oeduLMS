// Dynamic aesthetic thumb classes based on course ID or title hash
export const getThumbClass = (id: string) => {
  const hash = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const classes = [
    "from-zinc-700 via-zinc-600 to-zinc-500",
    "from-zinc-800 via-zinc-700 to-zinc-600",
    "from-zinc-900 via-zinc-800 to-zinc-700",
  ];
  return classes[hash % classes.length];
};
