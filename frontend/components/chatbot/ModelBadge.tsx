import { chatModel } from "@/lib/ai/models";

// Small brand-coloured monogram badge for a chat model.
export function ModelBadge({ slug, size = 22 }: { slug: string; size?: number }) {
  const m = chatModel(slug);
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-[7px] font-black text-white"
      style={{ width: size, height: size, background: m.color, fontSize: size * 0.55, lineHeight: 1 }}
      aria-hidden="true"
    >
      {m.mono}
    </span>
  );
}
