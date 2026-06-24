import { useEffect } from 'react';

// Este hook não é mais necessário com o store simplificado
// que usa localStorage persistido automaticamente via zustand persist
export function useCartSync() {
  // No-op - mantido para compatibilidade
  useEffect(() => {}, []);
}
