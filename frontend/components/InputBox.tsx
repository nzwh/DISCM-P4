interface PInputBox {
  label: string
  type: string
  value: string
  placeholder?: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

const XInputBox: React.FC<PInputBox> = ({ label, type, value, placeholder, onChange }) => {
  return (
    <aside className="flex flex-col gap-2">
      <label htmlFor={type}
        className="font-medium">
        {label}
      </label>
      <input
        className="px-4 py-2 border-2 border-gray-300 focus:border-gray-500 rounded-lg focus:outline-none focus:ring-0 w-full placeholder:text-gray-400 text-lg"
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required
      />
    </aside>
  )
}

export default XInputBox;