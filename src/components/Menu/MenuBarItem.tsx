export function MenuBarItem() {
  return (
    <div className="menuBar-item p-3 text-center mt-2">
      <div className="listIcon h-15 w-15 cursor-pointer flex items-center flex-col space justify-between">
        <div className="listIcon_item">
          <i className="fa-solid fa-bars scale-120"></i>
          <p className="listIcon_item--name">Menu</p>
        </div>

        <div className="listIcon_item">
          <i className="fa-regular fa-bookmark scale-120"></i>
          <p className="listIcon_item--name">Đã lưu</p>
        </div>

        <div className="listIcon_item">
          <i className="fa-solid fa-clock-rotate-left scale-120"></i>
          <div className="listIcon_item--name">Gần đây</div>
        </div>
      </div>
    </div>
  );
}
