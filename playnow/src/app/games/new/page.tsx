import { Suspense } from "react";
import NewGameClient from "./NewGameClient";

export default function NewGamePage() {
  return (
    <Suspense fallback={<div className="max-w-xl mx-auto px-4 py-6">Loading...</div>}>
      <NewGameClient />
    </Suspense>
  );
}
