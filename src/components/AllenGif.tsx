// Decorative gif of Alan from The Hangover doing math.
// File lives at public/allen.gif.
export default function AllenGif() {
  return (
    <div className="hidden sm:block shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/allen.gif"
        alt="Doing math like Alan from The Hangover"
        width={140}
        height={110}
        className="rounded-lg border border-border shadow-sm"
        style={{ objectFit: "cover", height: 110, width: 140 }}
      />
    </div>
  );
}
