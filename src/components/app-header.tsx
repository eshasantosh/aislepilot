import { ShoppingBasket } from 'lucide-react';

export function AppHeader() {
  return (
    <header className="py-6 px-4 md:px-6">
      <div className="container mx-auto flex items-center gap-2">
        <ShoppingBasket className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold font-headline text-primary">
          AisleAssist
        </h1>
      </div>
    </header>
  );
}
