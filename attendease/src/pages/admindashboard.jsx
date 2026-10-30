import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
const BACKEND_URL = import.meta.env.VITE_BACKEND;

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalStudents: "—",
    presentToday: "—",
    absentToday: "—",
    attendanceRate: "—",
  });

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [employees, setEmployees] = useState([]);
  const [employeeLoading, setEmployeeLoading] = useState(true);
  const [employeeError, setEmployeeError] = useState("");
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [employeeMessage, setEmployeeMessage] = useState("");

  const [employeeForm, setEmployeeForm] = useState({
    first_name: "",
    last_name: "",
    contact: "",
    designation: "",
    date_of_join: "",
  });

  useEffect(() => {
    const controller = new AbortController();

    async function fetchDashboard() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${BACKEND_URL}/api/admin/dashboard`,
          { signal: controller.signal }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.message || "Unable to load dashboard data."
          );
        }

        setStats({
          totalStudents: result.stats?.totalStudents ?? 0,
          presentToday: result.stats?.presentToday ?? 0,
          absentToday: result.stats?.absentToday ?? 0,
          attendanceRate: `${result.stats?.attendanceRate ?? 0}%`,
        });

        setRecords(
          Array.isArray(result.records) ? result.records : []
        );
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(
            err.message || "Cannot connect to the backend."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchDashboard();

    return () => controller.abort();
  }, []);

  async function fetchEmployees() {
    try {
      setEmployeeLoading(true);
      setEmployeeError("");

      const response = await fetch(
        `${BACKEND_URL}/api/admin/employees`
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Unable to load employees."
        );
      }

      setEmployees(
        Array.isArray(result.employees) ? result.employees : []
      );
    } catch (err) {
      setEmployeeError(
        err.message || "Unable to connect to the backend."
      );
    } finally {
      setEmployeeLoading(false);
    }
  }

  useEffect(() => {
    fetchEmployees();
  }, []);

  function handleEmployeeChange(e) {
    const { name, value } = e.target;

    setEmployeeForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleAddEmployee(e) {
    e.preventDefault();

    try {
      setSavingEmployee(true);
      setEmployeeMessage("");
      setEmployeeError("");

      const response = await fetch(
        `${BACKEND_URL}/api/admin/employees`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...employeeForm,
            date_of_join: employeeForm.date_of_join || null,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Unable to add employee."
        );
      }

      setEmployees((previous) => [
        result.employee,
        ...previous,
      ]);

      setEmployeeForm({
        first_name: "",
        last_name: "",
        contact: "",
        designation: "",
        date_of_join: "",
      });

      setShowEmployeeForm(false);
      setEmployeeMessage("Employee added successfully!");
    } catch (err) {
      setEmployeeMessage(
        err.message || "Unable to save employee details."
      );
    } finally {
      setSavingEmployee(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("user");
    navigate("/");
  }

  const statCards = [
    {
      title: "Total Students",
      value: stats.totalStudents,
      icon: "👨‍🎓",
      color: "border-t-[#60a5fa]",
      iconColor: "text-[#2563eb]",
    },
    {
      title: "Present Today",
      value: stats.presentToday,
      icon: "✓",
      color: "border-t-[#65ad7d]",
      iconColor: "text-[#65ad7d]",
    },
    {
      title: "Absent Today",
      value: stats.absentToday,
      icon: "✕",
      color: "border-t-[#bd4c53]",
      iconColor: "text-[#bd4c53]",
    },
    {
      title: "Attendance Rate",
      value: stats.attendanceRate,
      icon: "▤",
      color: "border-t-[#6478c5]",
      iconColor: "text-[#4169a8]",
    },
  ];

  const menuItems = [
  { label: "▦  Dashboard", to: "/admin", active: true },
  { label: "✓  Mark Attendance", to: "/attendance" },

  { label: "♙  Student Profile Update", to: "/student-profile" },
  { label: "▤  Student Details", to: "/student-details" },

  { label: "♙  Employee Profile Update", to: "/employees" },
  { label: "▤  Employee Details", to: "/employee-details" },

  { label: "▤  Reports", to: "/reports" },
];

  function formatDate(date) {
    if (!date) return "—";

    const dateText = String(date).slice(0, 10);
    const parsed = new Date(`${dateText}T12:00:00`);

    return Number.isNaN(parsed.getTime())
      ? dateText
      : parsed.toLocaleDateString();
  }

  function statusStyle(status) {
    switch (String(status || "").toLowerCase()) {
      case "present":
        return "bg-green-100 text-green-700";
      case "absent":
        return "bg-red-100 text-red-700";
      case "late":
        return "bg-amber-100 text-amber-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  }

  return (
    <div className="flex min-h-screen w-full bg-[#f8fafc] font-[Arial,sans-serif] text-[#111827]">
      {/* Sidebar */}
      <aside className="flex min-h-screen w-[265px] shrink-0 flex-col bg-[#17243a] px-[16px] py-[26px] text-white max-md:w-[210px] max-sm:w-full max-sm:min-h-0">
        <div className="px-[12px] pb-[29px] pt-[3px] text-[20px] font-bold">
          🎓 Attend<span className="text-[#60a5fa]">Ease</span>
        </div>

        <div className="px-[10px] py-[10px] text-[12px] tracking-wide text-[#94a3b8]">
          MAIN MENU
        </div>

        <nav className="flex flex-col gap-[7px]">
          {menuItems.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className={`block rounded-[8px] px-[12px] py-[13px] text-[14px] leading-[1.4] no-underline transition-colors ${
                item.active
                  ? "bg-[#3278d4] text-white"
                  : "text-[#d1d9e6] hover:bg-[#293b56] hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto pt-6">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-[8px] bg-[#30445f] px-3 py-[13px] text-sm text-white transition hover:bg-[#405674]"
          >
            ↪ Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="min-w-0 flex-1 p-[30px] max-lg:p-5 max-sm:p-3">
        {/* Header */}
        <header className="mb-[30px] flex items-center justify-between gap-4 max-sm:flex-wrap">
          <div>
            <h1 className="text-[26px] font-bold leading-tight text-[#111827] max-sm:text-[21px]">
              Admin Dashboard
            </h1>
            <p className="mt-[7px] text-[14px] text-[#374151]">
              Welcome back! Here's your attendance overview.
            </p>
          </div>

          <div className="shrink-0 rounded-[12px] bg-[#dbeafe] px-[16px] py-[12px] text-[14px] text-[#315b86]">
            👤 Administrator
          </div>
        </header>

        {/* Statistics */}
        <h2 className="mb-[18px] text-[19px] font-bold text-[#111827]">
          Today's Overview
        </h2>

        <section className="mb-[32px] grid grid-cols-4 gap-[18px] max-xl:grid-cols-2 max-sm:grid-cols-1">
          {statCards.map((stat) => (
            <div
              key={stat.title}
              className={`min-h-[165px] min-w-0 rounded-[14px] border border-[#e2e8f0] border-t-[5px] ${stat.color} bg-white px-[20px] py-[25px] shadow-[0_3px_12px_rgba(15,23,42,0.06)]`}
            >
              <div className={`mb-[17px] text-[28px] leading-none ${stat.iconColor}`}>
                {stat.icon}
              </div>
              <p className="mb-[10px] text-[14px] text-[#1f2937]">
                {stat.title}
              </p>
              <h3 className="text-[30px] font-bold leading-tight text-[#111827]">
                {loading ? "…" : stat.value}
              </h3>
            </div>
          ))}
        </section>

        {/* Recent Attendance */}
        <section className="mb-[30px] rounded-[14px] border border-[#e2e8f0] bg-white p-[24px] shadow-sm max-sm:p-3">
          <div className="mb-[23px] flex flex-wrap items-center justify-between gap-3">
  <h2 className="text-[19px] font-bold text-[#111827]">
    Recent Attendance
  </h2>

  <div className="flex flex-wrap gap-3">
    <Link
      to="/student-profile"
      className="inline-block rounded-[8px] bg-[#16a34a] px-[16px] py-[12px] text-[13px] text-white no-underline transition hover:bg-[#15803d]"
    >
      + Add New Student
    </Link>

    <Link
      to="/attendance"
      className="inline-block rounded-[8px] bg-[#2875c7] px-[16px] py-[12px] text-[13px] text-white no-underline transition hover:bg-[#1d5fa8]"
    >
      + Mark Attendance
    </Link>
  </div>
</div>
          {error && (
            <p className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[540px] border-collapse text-left">
              <thead>
                <tr>
                  <th className="bg-[#f8fafc] px-[13px] py-[15px] text-[12px] font-semibold text-[#374151]">
                    STUDENT ID
                  </th>
                  <th className="bg-[#f8fafc] px-[13px] py-[15px] text-[12px] font-semibold text-[#374151]">
                    STUDENT NAME
                  </th>
                  <th className="bg-[#f8fafc] px-[13px] py-[15px] text-[12px] font-semibold text-[#374151]">
                    DATE
                  </th>
                  <th className="bg-[#f8fafc] px-[13px] py-[15px] text-[12px] font-semibold text-[#374151]">
                    STATUS
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-sm text-slate-500">
                      Loading attendance records...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-sm text-slate-500">
                      Attendance could not be loaded.
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-[22px] text-center text-[14px] text-[#6b7280]">
                      No attendance records to display.
                    </td>
                  </tr>
                ) : (
                  records.map((record, index) => (
                    <tr key={`${record.student_id}-${record.date}-${index}`}>
                      <td className="border-b border-[#e2e8f0] px-[13px] py-4 text-[13px]">
                        {record.student_id ?? "—"}
                      </td>
                      <td className="border-b border-[#e2e8f0] px-[13px] py-4 text-[13px]">
                        {record.student_name || "—"}
                      </td>
                      <td className="border-b border-[#e2e8f0] px-[13px] py-4 text-[13px]">
                        {formatDate(record.date)}
                      </td>
                      <td className="border-b border-[#e2e8f0] px-[13px] py-4 text-[13px]">
                        <span className={`inline-block rounded-full px-3 py-1 text-[11px] font-bold capitalize ${statusStyle(record.status)}`}>
                          {record.status || "Unknown"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Employee Details */}
        <section className="mb-[30px] rounded-[14px] border border-[#e2e8f0] bg-white p-[24px] shadow-sm max-sm:p-3">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[19px] font-bold text-[#111827]">
                Employee Details
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Manage employee records without login accounts.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setEmployeeMessage("");
                setShowEmployeeForm((previous) => !previous);
              }}
              className="rounded-[8px] bg-[#2875c7] px-4 py-3 text-[13px] text-white transition hover:bg-[#1d5fa8]"
            >
              {showEmployeeForm ? "Cancel" : "+ Add New Employee"}
            </button>
          </div>

          {employeeMessage && (
            <p className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
              {employeeMessage}
            </p>
          )}

          {showEmployeeForm && (
            <form
              onSubmit={handleAddEmployee}
              className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <h3 className="mb-4 font-semibold text-slate-800">
                Add Employee
              </h3>

              <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
                <input
                  name="first_name"
                  value={employeeForm.first_name}
                  onChange={handleEmployeeChange}
                  placeholder="First name *"
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm outline-none focus:border-blue-500"
                />

                <input
                  name="last_name"
                  value={employeeForm.last_name}
                  onChange={handleEmployeeChange}
                  placeholder="Last name"
                  className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm outline-none focus:border-blue-500"
                />

                <input
                  name="contact"
                  value={employeeForm.contact}
                  onChange={handleEmployeeChange}
                  placeholder="Contact number"
                  maxLength={15}
                  className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm outline-none focus:border-blue-500"
                />

                <input
                  name="designation"
                  value={employeeForm.designation}
                  onChange={handleEmployeeChange}
                  placeholder="Designation *"
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm outline-none focus:border-blue-500"
                />

                <div>
                  <label className="mb-1 block text-xs text-slate-600">
                    Date of joining
                  </label>
                  <input
                    type="date"
                    name="date_of_join"
                    value={employeeForm.date_of_join}
                    onChange={handleEmployeeChange}
                    className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingEmployee}
                className="mt-4 rounded-lg bg-green-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingEmployee ? "Saving..." : "Save Employee"}
              </button>
            </form>
          )}

          {employeeError && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {employeeError}
              <button
                type="button"
                onClick={fetchEmployees}
                className="ml-3 font-semibold underline"
              >
                Retry
              </button>
            </div>
          )}

          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-left">
              <thead>
                <tr>
                  {[
                    "EMPLOYEE ID",
                    "EMPLOYEE NAME",
                    "CONTACT",
                    "DESIGNATION",
                    "DATE OF JOINING",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="bg-[#f8fafc] px-3 py-4 text-[11px] font-semibold text-[#374151]"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {employeeLoading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-8 text-center text-sm text-slate-500"
                    >
                      Loading employee details...
                    </td>
                  </tr>
                ) : employeeError ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-8 text-center text-sm text-slate-500"
                    >
                      Employee details could not be loaded.
                    </td>
                  </tr>
                ) : employees.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-8 text-center text-sm text-slate-500"
                    >
                      No employee records found.
                    </td>
                  </tr>
                ) : (
                  employees.map((employee) => (
                    <tr key={employee.admin_id}>
                      <td className="border-b border-slate-200 px-3 py-4 text-sm">
                        {employee.admin_id}
                      </td>

                      <td className="border-b border-slate-200 px-3 py-4 text-sm font-medium">
                        {[employee.first_name, employee.last_name]
                          .filter(Boolean)
                          .join(" ")}
                      </td>

                      <td className="border-b border-slate-200 px-3 py-4 text-sm">
                        {employee.contact || "—"}
                      </td>

                      <td className="border-b border-slate-200 px-3 py-4 text-sm">
                        {employee.designation}
                      </td>

                      <td className="border-b border-slate-200 px-3 py-4 text-sm">
                        {formatDate(employee.date_of_join)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Reminder */}
        <section className="rounded-[9px] bg-[#eff6ff] px-[15px] py-[15px] text-[14px] leading-[1.6] text-[#1e40af]">
          <strong>📌 Admin Reminder</strong>
          <p className="mt-[2px]">
            Please mark attendance for the current date and save the records.
            Students can view their attendance but cannot mark it themselves.
          </p>
        </section>
      </main>
    </div>
  );
}
