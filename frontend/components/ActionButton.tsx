interface PActionButton {
  style?: string;
  title?: string;
  icon: React.ReactNode;
  onClick: () => void;
}

const XActionButton: React.FC<PActionButton> = ({ style, title, icon, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={
        "flex flex-row items-center gap-1 px-2 py-1 rounded-full text-sm transition-colors cursor-pointer " + 
        (style ? style : "border-2 border-red-400 text-red-400 hover:border-red-300 hover:text-red-300")
      }>
      {icon} {title}
    </button>
  )
}

export default XActionButton;