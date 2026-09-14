export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="display text-3xl">{title}</h1>
        {description ? (
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
