interface MenuBarItemProps {
  label: string;
  value: string | number | null;
  icon: string;
}

export default function MenuBarItem({ label, value, icon }: MenuBarItemProps) {
  return (
    <li className="building_list--item">
      <i className={`${icon} menuBar-icon`}></i>
      <label htmlFor="" className="menuBar_item-label">
        {label}:
      </label>
      <p className="menuBar_item-content">{value}</p>
    </li>
  );
}
