import React, { useEffect, useState } from "react";

interface TypewriterProps {
  text: string;
  delay?: number;
}

export function Typewriter({ text, delay = 50 }: TypewriterProps) {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    let index = 0;
    setDisplayedText("");
    
    // Clear and build the string step-by-step
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.substring(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
      }
    }, delay);

    return () => clearInterval(interval);
  }, [text, delay]);

  return (
    <span className="relative">
      {displayedText}
      <span className="inline-block w-[3px] h-8 md:h-12 bg-amber-500 ml-1.5 animate-pulse duration-700 align-middle" />
    </span>
  );
}
