import { useEffect } from "react";

interface MenuBarProps {
  show: boolean;
  onClose: () => void;
}

export default function MenuBar({ show, onClose }: MenuBarProps) {
  return (
    <>
      <div
        className="menuBar min-h-screen fixed top-0 left-0 bottom-0 bg-white shadow-lg"
        style={{
          display: show ? "block" : "none",
          animation: show ? "fadeIn 0.3s linear" : "fadeOut 0.3s linear",
          zIndex: 1000,
        }}
      >
        <div
          className="closeSidebar cursor-pointer p-4 right-0 absolute"
          onClick={onClose}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinelinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </div>
        {/* Menu content goes here */}
        <div className="p-8">
          <h2 className="text-xl font-bold">Menu</h2>
        </div>
      </div>
    </>
  );
}
