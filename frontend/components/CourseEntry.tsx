import FormatName from "@/lib/functions/FormatName";
import { Album, Armchair, Calendar, User } from "lucide-react";

interface PCourseEntry {
  enrolling: string | null;
  course: any;
  handleEnroll: (sectionId: string) => Promise<void>;
}

const XCourseEntry: React.FC<PCourseEntry> = ({ enrolling, course, handleEnroll }) => {
  return (
    <section key={course.id} className="flex flex-col gap-4 bg-gray-100 hover:bg-gray-200 p-6 border-2 border-gray-50 rounded-lg">
      <div className="flex flex-row justify-between items-center gap-2">
        <h3 className="flex flex-row items-center gap-2 font-medium text-xl">
          <Album size={18} strokeWidth={2.5} />
          {course.name}
        </h3>
        <h3 className="ml-auto font-bold text-sm">
          {course.code}
        </h3>
        <p className="font-bold text-blue-600 text-sm">
          {course.section_name}
        </p>
      </div>

      <p className="text-gray-500 text-lg leading-5">
        {course.description}
      </p>

      <div className="flex flex-row items-center gap-6 w-full font-medium text-gray-500 text-md">
        <div className="flex flex-row items-center gap-1">
          <User size={14} strokeWidth={3}/>
          <p>Prof. {FormatName(course.faculty?.full_name, 'faculty')}</p>
        </div>
        <div className="flex flex-row items-center gap-1">
          <Calendar size={14} strokeWidth={3}/>
          <p>{course.semester}, {course.year}</p>
        </div>
        <div className="flex flex-row items-center gap-1 mr-auto">
          <Armchair size={14} strokeWidth={3}/>
          <p>{course.max_students} Seats</p>
        </div>
        <button
          type="button"
          onClick={() => handleEnroll(course.section_id || course.id)}
          disabled={enrolling === course.id}
          className="flex flex-row justify-center items-center gap-2 disabled:opacity-50 px-3 py-0.5 border-2 border-slate-800 hover:border-slate-400 rounded-full text-slate-800 hover:text-slate-400 text-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          {enrolling === course.id ? 'Enrolling...' : 'Enroll'}
        </button>
      </div>

    </section>
  )
}

export default XCourseEntry;