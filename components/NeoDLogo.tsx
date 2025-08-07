import React from "react";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
}

const sizeMap = {
  sm: "w-6 h-6",
  md: "w-8 h-8",
  lg: "w-10 h-10",
  xl: "w-12 h-12",
};

const textSizeMap = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
  xl: "text-3xl",
};

export const NeoDLogo: React.FC<LogoProps> = ({
  size = "md",
  showText = true,
  className = "",
}) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img alt="NeoD Logo" className={sizeMap[size]} src="/favicon.png" />
      {showText && (
        <span className={`font-bold text-inherit ${textSizeMap[size]}`}>
          NeoD
        </span>
      )}
    </div>
  );
};

export default NeoDLogo;
