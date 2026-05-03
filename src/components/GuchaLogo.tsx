import Image from "next/image";

export default function GuchaLogo() {
  return (
    <div className="flex justify-center pt-8 pb-4">
      <Image
        src="/logo.png"
        alt="Gucha Sneakers"
        width={280}
        height={280}
        priority
        className="w-56 h-auto drop-shadow-[0_0_24px_rgba(204,34,34,0.35)]"
      />
    </div>
  );
}
