
import { useState } from "react";
import { Link } from "react-router-dom";

const BACKEND_URL = import.meta.env.VITE_BACKEND;

const API = `${BACKEND_URL}/api`;

function formatDate(value) {
  if (!value) return "-";
  return String(value).slice(0, 10);
}

function formatTime(value) {
  if (!value) return "-";

  const text = String(value);
  return text.length >= 8 ? text.slice(0, 8) : text;
}

function escapeCSV(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export default function Reports() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reportType, setReportType] = useState("attendance");

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState(false);

  const presentCount = records.filter(
    (record) => String(record.status).toLowerCase() === "present"
  ).length;

  const absentCount = records.filter(
    (record) => String(record.status).toLowerCase() === "absent"
  ).length;

  const otherCount = records.length - presentCount - absentCount;

  async function generateReport() {
    if (!startDate || !endDate) {
      setError("Please select both the From Date and To Date.");
      return;
    }

    if (startDate > endDate) {
      setError("The From Date cannot be later than the To Date.");
      return;
    }

    setLoading(true);
    setError("");
    setGenerated(false);
    setRecords([]);

    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
      });

     const response = await fetch(
  `${API}/reports/student-attendance?${params.toString()}`
);

const text = await response.text();

console.log("Response status:", response.status);
console.log("Response content type:", response.headers.get("content-type"));
console.log("Response body:", text);

if (!response.ok) {
  throw new Error(`Server returned HTTP ${response.status}. Check the backend route.`);
}

let data;

try {
  data = JSON.parse(text);
} catch {
  throw new Error(
    "The report API returned HTML instead of JSON. Check the backend route and URL."
  );
}

      if (!response.ok) {
        throw new Error(data.message || "Unable to generate the report.");
      }

      const reportRecords = Array.isArray(data)
        ? data
        : data.records;

      if (!Array.isArray(reportRecords)) {
        throw new Error("The server returned an unexpected report format.");
      }

      setRecords(reportRecords);
      setGenerated(true);
    } catch (err) {
      setError(
        err.message ||
          "Could not connect to the backend. Check that your server is running."
      );
    } finally {
      setLoading(false);
    }
  }

  function downloadCSV() {
    if (!records.length) return;

    const headers = [
      "Student ID",
      "Student Name",
      "Email",
      "Attendance Date",
      "Check-in Time",
      "Status",
    ];

    const rows = records.map((record) => [
      record.user_id ?? record.student_id ?? "",
      record.name ?? "",
      record.email ?? "",
      formatDate(record.attendance_date),
      formatTime(record.check_in_time),
      record.status ?? "",
    ]);

    const csvContent = [
      headers.map(escapeCSV).join(","),
      ...rows.map((row) => row.map(escapeCSV).join(",")),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `student-attendance-${startDate}-to-${endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  const displayedRecords =
    reportType === "student"
      ? [...records].sort((a, b) =>
          String(a.name ?? "").localeCompare(String(b.name ?? ""))
        )
      : records;

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <Link
          to="/admin"
          className="mb-6 inline-block text-blue-600 hover:underline"
        >
          ← Back to Admin Dashboard
        </Link>

        <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold text-slate-800">
            Student Attendance Reports
          </h1>

          <p className="mt-2 text-slate-500">
            Generate and download student attendance records for a selected
            date range.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label
                htmlFor="reportType"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Report Type
              </label>

              <select
                id="reportType"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
              >
                <option value="attendance">Attendance Summary</option>
                <option value="student">Student-wise Report</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="startDate"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                From Date
              </label>

              <input
                id="startDate"
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="endDate"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                To Date
              </label>

              <input
                id="endDate"
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={generateReport}
              disabled={loading}
              className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Generating..." : "Generate Report"}
            </button>

            <button
              type="button"
              onClick={downloadCSV}
              disabled={!generated || records.length === 0}
              className="rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ↓ Download CSV
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {generated && (
            <>
              <div className="mt-8">
                <h2 className="text-lg font-semibold text-slate-800">
                  Report Results
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Period: {startDate} to {endDate}
                </p>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm text-slate-500">Total Records</p>
                  <p className="mt-2 text-3xl font-bold text-slate-800">
                    {records.length}
                  </p>
                </div>

                <div className="rounded-xl border border-green-200 bg-green-50 p-5">
                  <p className="text-sm text-green-700">Present</p>
                  <p className="mt-2 text-3xl font-bold text-green-800">
                    {presentCount}
                  </p>
                </div>

                <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                  <p className="text-sm text-red-700">Absent</p>
                  <p className="mt-2 text-3xl font-bold text-red-800">
                    {absentCount}
                  </p>
                </div>

                <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
                  <p className="text-sm text-blue-700">Other Statuses</p>
                  <p className="mt-2 text-3xl font-bold text-blue-800">
                    {otherCount}
                  </p>
                </div>
              </div>

              <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Student</th>
                      <th className="px-4 py-3 font-semibold">Email</th>
                      <th className="px-4 py-3 font-semibold">Date</th>
                      <th className="px-4 py-3 font-semibold">Check-in</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {displayedRecords.map((record, index) => (
                      <tr
                        key={`${record.attendance_id ?? record.user_id ?? record.student_id ?? "record"}-${record.attendance_date}-${index}`}
                        className="hover:bg-slate-50"
                      >
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-800">
                          {record.name || "Unknown student"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {record.email || "-"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                          {formatDate(record.attendance_date)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                          {formatTime(record.check_in_time)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                              String(record.status).toLowerCase() === "present"
                                ? "bg-green-100 text-green-700"
                                : String(record.status).toLowerCase() === "absent"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {record.status || "Unknown"}
                          </span>
                        </td>
                      </tr>
                    ))}

                    {records.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-10 text-center text-slate-500"
                        >
                          No attendance records were found for this date range.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {!generated && !loading && !error && (
            <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <div className="text-4xl">📊</div>
              <h2 className="mt-3 text-lg font-semibold text-slate-800">
                Your report will appear here
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Select a date range and click Generate Report to view your
                database records.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
