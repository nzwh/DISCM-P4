interface PXInputButton {
  type: "button" | "submit" | "reset"
  disabled: boolean
  idle: string
  loading: string
  icon: React.ReactNode
}

const XInputButton: React.FC<PXInputButton> = ({ type, disabled, idle, loading, icon }) => {
  return (
    <button
      type={type}
      disabled={disabled}
      className="flex flex-row justify-center items-center gap-2 bg-linear-to-b from-slate-800 hover:from-slate-700 to-slate-600 hover:to-slate-500 disabled:opacity-50 shadow-lg py-3 rounded-full text-white transition-colors cursor-pointer disabled:cursor-not-allowed"
    >
      {icon}
      {disabled ? loading : idle}
    </button>
  )
}

export default XInputButton;