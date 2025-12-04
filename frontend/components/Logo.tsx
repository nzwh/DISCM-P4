import { Radius } from "lucide-react";

const XLogo: React.FC = () => {
  return (
    <div className="flex flex-row justify-end items-center gap-2">
      <Radius size={12} strokeWidth={3} />
      <h6 className="font-bold text-xs uppercase">
        Project04
      </h6>
    </div>
  )
}

export default XLogo;