export function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
      <div className="sm:flex-[0_0_40%]">
        <h1 className="text-3xl font-bold tracking-normal text-ink sm:text-4xl">{title}</h1>
      </div>
      {subtitle && (
        <div className="sm:flex-[0_0_60%]">
          <p className="text-sm leading-6 text-ink/65">{subtitle}</p>
        </div>
      )}
    </header>
  );
}
