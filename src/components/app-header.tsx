
import Image from 'next/image';
import AislePilotLogo from '@/assets/logo.png';

export function AppHeader() {
  return (
    <header className="py-6 px-4 md:px-6">
      <div className="container mx-auto flex items-center justify-center gap-3">
        <Image
          src={AislePilotLogo}
          alt="AislePilot Logo"
          width={135}
          height={34}
          priority
        />
      </div>
    </header>
  );
}
