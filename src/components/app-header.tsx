
import Image from 'next/image';
import AislePilotLogo from '@/assets/logo.png';

export function AppHeader() {
  return (
    <header className="py-6 px-4 md:px-6">
      <div className="container mx-auto flex items-center justify-center gap-3">
        {/* ShoppingBasket icon removed */}
        <Image
          src={AislePilotLogo}
          alt="AislePilot Logo"
          width={180}
          height={45}
          priority
        />
      </div>
    </header>
  );
}
