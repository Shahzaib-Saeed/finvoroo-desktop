export function EmptyPanelPlaceholder({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center">
      {Icon ? <Icon className="size-5 text-slate-300" strokeWidth={1.5} /> : null}
      <p className="mt-2 text-xs font-medium text-slate-500">{title}</p>
      {description ? <p className="mt-0.5 max-w-[16rem] text-[11px] leading-relaxed text-slate-400">{description}</p> : null}
    </div>
  );
}
