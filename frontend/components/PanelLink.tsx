import Link from 'next/link'
import { ChevronRight } from "lucide-react";

interface PPanelLink {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}

const XPanelLink: React.FC<PPanelLink> = ({ href, icon, title, description }) => {
  return (
    <Link
      href={href}
      className="flex flex-col gap-2 bg-gray-100 hover:bg-gray-200 p-4 border-2 border-gray-50 rounded-lg transition-colors">
      
      <div className="flex flex-row items-center gap-2">
        {icon}
        <h3 className="font-semibold text-lg">
          {title}
        </h3>
        <ChevronRight size={16} strokeWidth={3} className="ml-auto text-gray-400"/> 
      </div>

      <p className="text-gray-500 text-sm leading-4.5 tracking-tight">
        {description}
      </p>

    </Link>
  )
}

export default XPanelLink;