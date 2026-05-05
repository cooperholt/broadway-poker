import CalculatorClient from "./CalculatorClient";

export const dynamic = "force-static";

export default function CalculatorPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Chip Calculator
        </h1>
        <p className="text-sm text-muted mt-1 max-w-md">
          Optimize your home-game chip distribution. Save sets you like as
          presets to reuse for future games.
        </p>
      </header>
      <CalculatorClient />
    </div>
  );
}
