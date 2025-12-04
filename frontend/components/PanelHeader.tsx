import { LibraryBig } from "lucide-react";

interface PPanelHeader {
  title: string;
  icon?: React.ReactNode
  children?: React.ReactNode;
}

const XPanelHeader: React.FC<PPanelHeader> = ({ title, icon, children }) => {
  return (
    <aside className="flex flex-row justify-between items-center gap-2 w-full">
      <div className="flex flex-row items-center gap-2">
        {icon ? icon : <LibraryBig size={24} />}
        <h2 className="font-bold text-xl">
          {title}
        </h2>
      </div>
      {children}
    </aside>
  )
}

export default XPanelHeader;