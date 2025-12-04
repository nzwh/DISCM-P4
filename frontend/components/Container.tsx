interface PContainer {
  width?: string
  height?: string
  children: React.ReactNode
}

const XContainer: React.FC<PContainer> = ({ children, width, height }) => {
  return (
    <section id="container" 
      className="flex flex-col justify-between gap-6 bg-white px-6 py-6 border-2 border-gray-200 rounded-xl overflow-scroll"
      style={{ width, height }}>
        {children}
    </section>
  );
}

export default XContainer;