// app/trainers/page.tsx
import { Suspense } from 'react';
import TrainersPageClient from './TrainersPageClient';

export default function Page() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Cargando entrenadores...</div>}>
      <TrainersPageClient />
    </Suspense>
  );
}
