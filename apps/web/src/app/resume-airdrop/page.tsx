import Link from "next/link";

export default function ResumeAirdrop() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <h1 className="text-4xl font-bold mb-8">Resume Existing Airdrop</h1>
        {/* Add components for resuming an existing airdrop here */}
        <Link href="/" className="btn btn-secondary mt-4">
          Back to Home
        </Link>
      </div>
    </main>
  );
}
