import { use } from "react";

export default function ClassifyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <div className="p-6 max-w-2xl mx-auto pt-16">
      <h1 className="text-xl font-semibold text-foreground mb-1">
        Classifying intent
      </h1>
      <p className="text-sm text-muted-foreground">
        Project {id} — Classification engine coming next.
      </p>
    </div>
  );
}
