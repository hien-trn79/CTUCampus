interface SearchProps {
  name: string;
  onClose: () => void;
}

export default function Seacrh({ name, onClose }: SearchProps) {
  return (
    <div className="search custom_search">
      <input type="text" className="search--input" placeholder={name} />
      <div
        className="closeSidebar cursor-pointer  right-0 absolute"
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
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </div>
    </div>
  );
}
