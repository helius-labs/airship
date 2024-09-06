import { useQuery } from "@tanstack/react-query";

const calculationsWorker = new ComlinkWorker<
  typeof import("./calculations.ts")
>(new URL("./calculations.js", import.meta.url), {
  name: "calculationsComlink",
  type: "module",
});

export function WorkerDemo({ a, b }: { a: number; b: number }) {
  const expensiveCalculationResult = useQuery({
    queryKey: ["expensiveCalculation", a, b],
    queryFn: () => calculationsWorker.test(),
  });

  return (
    <div>
      <h1>Web Workers, Comlink and Tanstack Query in action!</h1>

      {expensiveCalculationResult.data ? (
        <p>Calculation result: {expensiveCalculationResult.data}</p>
      ) : expensiveCalculationResult.isPending ? (
        <p>Calculating...</p>
      ) : expensiveCalculationResult.error ? (
        <p>Error: {expensiveCalculationResult.error.message}</p>
      ) : (
        <p>...</p>
      )}
    </div>
  );
}
