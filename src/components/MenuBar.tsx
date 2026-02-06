import { MenuBarItem } from "./Menu/MenuBarItem";

export function MenuBar() {
  return (
    <>
      <div className="fixed top-0 left-0 bottom-0 menuBar bg-white w-20 shadow-lg rounded-4xl z-1000">
        <MenuBarItem />
      </div>
    </>
  );
}
