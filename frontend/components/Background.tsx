interface PBackground {
  children: React.ReactNode
}

const XBackground: React.FC<PBackground> = ({ children }) => {
  return (
    <section id="main"
      className="flex justify-center items-center bg-radial from-[#ffffff] to-[#b4b6c1] w-full min-h-screen text-slate-800 tracking-tighter">
        {children}
    </section>
  );
}

export default XBackground;