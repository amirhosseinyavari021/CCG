import { useState } from "react";

export default function Tooltip({ children, text, position = "top" }) {
  const [visible, setVisible] = useState(false);
  
  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
}

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && text && (
        <div
          className={`absolute z-50 px-3 py-2 text-sm bg-gray-900 text-white rounded-lg whitespace-nowrap ${positionClasses[position]}`}
        >
          {text}
          <div className={`absolute w-2 h-2 bg-gray-900 transform rotate-45 ${
            position === "top" ? "top-full -translate-x-1/2 left-1/2 -mt-1" :
            position === "bottom" ? "bottom-full -translate-x-1/2 left-1/2 -mb-1" :
            position === "left" ? "left-full -translate-y-1/2 top-1/2 -ml-1" :
            "right-full -translate-y-1/2 top-1/2 -mr-1"
          }`} />
        </div>
      )}
    </div>
  );
}
