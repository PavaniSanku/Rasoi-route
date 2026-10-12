import { useState } from "react";
import fallbackImage from "../assets/indian-food-fallback.jpg";

export function FoodImage({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false);
  return <img src={failed ? fallbackImage : src} alt={`${name}, freshly prepared`} loading="lazy" decoding="async" width={900} height={600} onError={() => setFailed(true)} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />;
}