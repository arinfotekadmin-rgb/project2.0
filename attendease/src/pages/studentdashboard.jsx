import { useEffect, useState } from "react";
import { useNavigate,Link } from "react-router-dom";
const BACKEND_URL = import.meta.env.VITE_BACKEND;

export default function StudentDashboard() {
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  let user = null;

  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    user = null;
  }

  const studentId = user?.user_id ?? user?.id ?? user?.userId;

  useEffect(() => {
    if (!studentId) {
      setError("Please log in to view your attendance.");
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${BACKEND_URL}/api/student/attendance/${studentId}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Unable to load attendance records.");
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Unable to connect to the backend.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => controller.abort();
  }, [studentId]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  const summary = data?.summary || {};
  const records = data?.records || [];
  const studentName = data?.studentName || user?.name || "Student";

  const stats = [
    {
      title: "Total Sessions",
      value: summary.totalClasses ?? 0,
      icon: "▤",
      color: "border-t-blue-500",
      iconColor: "text-blue-600",
    },
    {
      title: "Classes Attended",
      value: summary.presentDays ?? 0,
      icon: "✓",
      color: "border-t-green-500",
      iconColor: "text-green-600",
    },
    {
      title: "Classes Missed",
      value: summary.absentDays ?? 0,
      icon: "✕",
      color: "border-t-red-500",
      iconColor: "text-red-600",
    },
    {
      title: "Attendance Rate",
      value: `${summary.attendanceRate ?? 0}%`,
      icon: "▥",
      color: "border-t-purple-500",
      iconColor: "text-purple-600",
    },
  ];

  const menuItems = [
  { label: "▦  Dashboard", to: "/student" },
  { label: "✓  Mark Attendance", to: "/student-attendance" },
  { label: "♙  Student Profile Update", to: "/student-profile" },
  { label: "♙  My Profile", to: "/my-profile" },
];

  return (
    <div className="flex min-h-screen w-full bg-[#f1f5f9] font-[Arial,sans-serif] text-[#1e293b]">

      {/* Sidebar */}
      <aside className="flex min-h-screen w-[235px] shrink-0 flex-col bg-[#0f172a] px-[15px] py-[25px] text-white max-md:w-[190px] max-sm:w-full max-sm:min-h-0">

        <div className="px-[10px] pb-[30px] pt-[5px] text-[19px] font-bold">
          🎓 Attend<span className="text-[#60a5fa]">Ease</span>
        </div>

        <div className="px-[10px] py-[10px] text-[11px] tracking-[1px] text-[#94a3b8]">
          MAIN MENU
        </div>

        <nav className="flex flex-col gap-[7px]">
  {menuItems.map((item) => (
    <Link
      key={item.label}
      to={item.to}
      className={`block rounded-[8px] px-3 py-[13px] text-[14px] no-underline transition-colors ${
        item.active
          ? "bg-[#2563eb] text-white"
          : "text-[#cbd5e1] hover:bg-[#2563eb] hover:text-white"
      }`}
    >
      {item.label}
    </Link>
  ))}
</nav>

        <div className="mt-auto pt-6 max-sm:mt-0">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-[8px] bg-[#334155] px-3 py-3 text-sm text-white transition hover:bg-slate-600"
          >
            ↪ Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="min-w-0 flex-1 p-7 max-lg:p-5 max-sm:p-3">

        {/* Header */}
        <header className="mb-[30px] flex items-center justify-between gap-5 max-sm:flex-wrap">
          <div>
            <h1 className="text-[25px] font-bold leading-tight text-[#1e293b]">
              Student Dashboard
            </h1>
            <p className="mt-[7px] text-[13px] text-[#64748b]">
              Welcome back! Here's your attendance overview.
            </p>
          </div>

          <div className="flex max-w-full items-center gap-2 rounded-[10px] bg-[#dbeafe] px-[14px] py-[11px] text-[13px] font-bold text-[#1d4ed8]">
            👤 <span className="break-all">{studentName}</span>
          </div>
        </header>

        {/* Overview */}
        <h2 className="mb-[18px] text-[18px] font-bold text-[#1e293b]">
          Today's Overview
        </h2>

        <section className="mb-[30px] grid grid-cols-4 gap-4 max-xl:grid-cols-2 max-sm:grid-cols-1">
          {stats.map((stat) => (
            <div
              key={stat.title}
              className={`min-h-[155px] min-w-0 rounded-[13px] border border-[#e2e8f0] border-t-4 ${stat.color} bg-white px-[18px] py-[22px] shadow-[0_3px_12px_rgba(15,23,42,0.04)]`}
            >
              <div className={`mb-4 text-[25px] leading-none ${stat.iconColor}`}>
                {stat.icon}
              </div>

              <p className="mb-[10px] text-[13px] text-[#64748b]">
                {stat.title}
              </p>

              <h3 className="text-[28px] font-bold leading-tight text-[#1e293b]">
                {loading ? "—" : stat.value}
              </h3>
            </div>
          ))}
        </section>

        {/* Student Profile */}
        <section
          id="profile"
          className="mb-[30px] rounded-[13px] border border-[#e2e8f0] bg-white p-[22px]"
        >
          <h2 className="mb-3 text-[18px] font-bold text-[#1e293b]">
            My Profile
          </h2>

          <div className="grid grid-cols-2 gap-4 text-[13px] max-sm:grid-cols-1">
            <p>
              <span className="text-[#64748b]">Student Name: </span>
              <strong>{studentName}</strong>
            </p>
            <p>
              <span className="text-[#64748b]">Student ID: </span>
              <strong>{studentId || "Not available"}</strong>
            </p>
          </div>
        </section>

        {/* Attendance Records */}
        <section
          id="attendance"
          className="mb-[25px] rounded-[13px] border border-[#e2e8f0] bg-white p-[22px] max-sm:p-3"
        >
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-[18px] font-bold text-[#1e293b]">
              My Recent Attendance
            </h2>

            <span className="shrink-0 text-[12px] text-[#64748b]">
              {loading ? "Loading..." : `${records.length} records`}
            </span>
          </div>

          {error ? (
            <p className="rounded-lg bg-red-50 p-4 text-[13px] text-red-700">
              {error}
            </p>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[480px] border-collapse text-left">
                <thead>
                  <tr>
                    <th className="bg-[#f8fafc] px-3 py-[14px] text-[12px] font-semibold text-[#64748b]">
                      DATE
                    </th>
                    <th className="bg-[#f8fafc] px-3 py-[14px] text-[12px] font-semibold text-[#64748b]">
                      SUBJECT / SESSION
                    </th>
                    <th className="bg-[#f8fafc] px-3 py-[14px] text-[12px] font-semibold text-[#64748b]">
                      STATUS
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-10 text-center text-[13px] text-[#64748b]">
                        Loading attendance records...
                      </td>
                    </tr>
                  ) : records.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-10 text-center text-[13px] text-[#64748b]">
                        No attendance records to display.
                      </td>
                    </tr>
                  ) : (
                    records.map((record, index) => {
                      const present =
                        record.status?.toLowerCase() === "present";

                      return (
                        <tr key={record.id ?? index}>
                          <td className="border-b border-[#e2e8f0] px-3 py-4 text-[13px]">
                            {record.date
                              ? new Date(
                                  `${String(record.date).slice(0, 10)}T12:00:00`
                                ).toLocaleDateString()
                              : "—"}
                          </td>

                          <td className="border-b border-[#e2e8f0] px-3 py-4 text-[13px]">
                            {record.subject || "General Attendance"}
                          </td>

                          <td className="border-b border-[#e2e8f0] px-3 py-4 text-[13px]">
                            <span
                              className={`inline-block rounded-full px-3 py-1 text-[11px] font-bold ${
                                present
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {record.status || "Unknown"}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Location Information */}
        <section
          id="location"
          className="mb-[25px] rounded-[13px] border border-[#e2e8f0] bg-white p-[22px]"
        >
          <h2 className="mb-2 text-[18px] font-bold text-[#1e293b]">
            📍 Location-Based Attendance
          </h2>
          <p className="text-[13px] leading-6 text-[#64748b]">
            Attendance will be verified against the permitted campus location
            when location verification is connected to the backend.
          </p>
        </section>

        {/* Reminder */}
        <section className="rounded-[9px] bg-[#eff6ff] p-[15px] text-[13px] leading-[1.6] text-[#1e40af]">
          <strong>📌 Student Reminder</strong>
          <p className="mt-1">
            Check your attendance regularly. Your attendance summary and
            history will update when records are available from the backend.
          </p>
        </section>

      </main>
    </div>
  );
}
