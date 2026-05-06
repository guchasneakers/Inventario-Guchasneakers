import Image from "next/image";

export default function GuchaLogo() {
  return (
    <div className="flex justify-center pt-4 pb-2 md:pt-8 md:pb-4">
      <Image
        src="/logo.png"
        alt="Gucha Sneakers"
        width={280}
        height={280}
        priority
        className="w-32 md:w-56 h-auto drop-shadow-[0_0_24px_rgba(204,34,34,0.35)]"
      />
    </div>
  );
}
