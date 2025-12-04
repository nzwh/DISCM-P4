interface PXInputButton {
  type: "button" | "submit" | "reset"
  disabled: boolean
  idle: string
  loading: string
  icon: React.ReactNode
  onClick?: () => void
}

const XInputButton: React.FC<PXInputButton> = ({ type, disabled, idle, loading, icon, onClick }) => {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="flex flex-row justify-center items-center gap-2 bg-linear-to-b from-slate-800 hover:from-slate-700 to-slate-600 hover:to-slate-500 disabled:opacity-50 px-4 py-2 rounded-full text-white transition-colors cursor-pointer disabled:cursor-not-allowed"
    >
      {icon}
      {disabled ? loading : idle}
    </button>
  )
}

export default XInputButton;