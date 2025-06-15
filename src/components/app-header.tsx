
import { ShoppingBasket } from 'lucide-react';
import Image from 'next/image';
import AisleAssistLogo from '@/assets/logo.png';

export function AppHeader() {
  return (
    <header className="py-6 px-4 md:px-6">
      <div className="container mx-auto flex items-center justify-center gap-3">
        <ShoppingBasket className="h-8 w-8 text-primary" />
        <Image
          src={AisleAssistLogo}
          alt="AisleAssist Logo"
          width={180}
          height={45}
          priority
        />
      </div>
    </header>
  );
}
